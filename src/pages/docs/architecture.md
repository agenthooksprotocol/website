---
layout: ../../layouts/DocsLayout.astro
title: Architecture
description: The roles, JSON-RPC protocol model, versioning rules, and message envelope that every AHP implementation shares.
---

AHP is a small control-plane protocol that sits in an agent harness's runtime path. The
harness is the **AHP client**; the external policy, security, approval, or middleware
component is the **AHP server**, called a backend.

## Roles and terminology

| Term | Definition |
| --- | --- |
| **Harness** | The agent runtime that is about to perform an operation. The AHP client. |
| **Backend** | The external policy, security, approval, or middleware component receiving AHP messages. The AHP server. |
| **Interceptor** | A backend subscription using `intercept` mode. The harness waits for its response. |
| **Observer** | A backend subscription using `observe` mode. The harness does not wait for a decision. |
| **Operation** | The harness action represented by an event, such as a tool call. |
| **Effect** | A semantic instruction returned by an interceptor, such as `deny`. |
| **Operational failure** | A timeout, transport error, process failure, JSON-RPC error, malformed message, or invalid effect. |
| **Explicit denial** | A valid `deny` effect returned by a backend. Not an operational failure. |

## JSON-RPC model

AHP uses UTF-8 encoded [JSON-RPC 2.0](https://www.jsonrpc.org/specification) and defines
two methods in v0.1:

| Method | JSON-RPC type | Profile | Purpose |
| --- | --- | --- | --- |
| `hooks/intercept` | Request | Tool Interception | Ask a backend for effects before continuing an operation. |
| `hooks/observe` | Notification | Lifecycle Observation | Deliver a one-way lifecycle event. |

Batch JSON-RPC messages are not used in v0.1. A notification has no JSON-RPC `id` and
never receives a response.

## The intercept exchange

A `hooks/intercept` request carries the protocol version, the event, and the capabilities
the harness can enforce for this event. The JSON-RPC request `id` equals the event `id`,
and a retry of the same event reuses both.

```json
{
  "jsonrpc": "2.0",
  "id": "evt_01JQ8Z2Y6YR0H8N7Q2M3X4V5W6",
  "method": "hooks/intercept",
  "params": {
    "protocolVersion": "0.1",
    "event": {
      "id": "evt_01JQ8Z2Y6YR0H8N7Q2M3X4V5W6",
      "source": "urn:uuid:5b7de29e-a9e0-41a8-bf26-d94b05f0656d",
      "type": "tool.before",
      "time": "2026-08-24T08:51:14Z",
      "session": { "id": "sess_123", "cwd": "/repo" },
      "tool": {
        "callId": "call_456",
        "name": "Bash",
        "kind": "shell",
        "input": { "command": "git push --force" }
      }
    },
    "capabilities": { "effects": ["deny"] }
  }
}
```

A successful result contains `protocolVersion` and an `effects` array — either empty (this
interceptor requests no change) or containing exactly one valid `deny` effect:

```json
{
  "jsonrpc": "2.0",
  "id": "evt_01JQ8Z2Y6YR0H8N7Q2M3X4V5W6",
  "result": {
    "protocolVersion": "0.1",
    "effects": [
      {
        "type": "deny",
        "reason": "Force pushes are prohibited by organization policy.",
        "code": "com.example.policy.force_push"
      }
    ]
  }
}
```

## Versioning

Every AHP params object carries `protocolVersion` with the exact value `0.1`. A backend
that does not support the supplied version returns the JSON-RPC error
`unsupported_protocol_version`. Because process-per-event backends cannot rely on a prior
handshake, version and capabilities travel on each intercept request.

## Unknown fields

Receivers ignore unknown fields in otherwise valid objects, and senders must not use
unknown fields to alter core semantics. Unknown event types, effect types, and enum values
are different: they are unsupported protocol semantics, not ordinary unknown fields.

Fields described as JSON objects contain objects, not encoded JSON strings.

## Design lineage

The Working Draft adopts principles from adjacent systems: Kubernetes admission webhooks
(distinguish rejection from webhook failure; explicit failure behavior), CloudEvents
(stable event identity and typed events), OpenFeature hooks (normative hook order and
timing), MCP transports (newline-delimited JSON-RPC over stdio with clean stdout), and ACP
(requests for decisions, notifications for one-way events).
