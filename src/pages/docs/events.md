---
layout: ../../layouts/DocsLayout.astro
title: Events
description: The canonical event envelope, session and tool identity, and the v0.1 event lifecycle.
---

Every AHP message carries a canonical event. The envelope gives external middleware stable
identity — event, session, and tool call — without exposing provider-specific quirks.

## Common event fields

| Field | Type | Requirement | Semantics |
| --- | --- | --- | --- |
| `id` | string | Required | Globally unique event identifier. Stable across retries. |
| `source` | string | Required | Stable, non-secret URI identifying the harness installation or runtime instance. |
| `type` | string | Required | Event type defined by the specification. |
| `time` | RFC 3339 string | Required | Time at which the harness created the event. |
| `session` | object | Required | Session identity and optional execution context. |
| `tool` | object | Tool events only | Tool-call identity and event-specific data. |
| `native` | object | Optional | Provider-specific fidelity payload. Disabled by default. |
| `extensions` | object | Optional | Namespaced extension data. |

UUIDv4, UUIDv7, and suitably generated ULIDs are acceptable event IDs; the protocol does
not require a specific algorithm. The `source` value must not contain access tokens, user
secrets, raw prompts, or other sensitive data.

## Session object

| Field | Type | Requirement | Semantics |
| --- | --- | --- | --- |
| `id` | string | Required | Stable session identifier. |
| `cwd` | string | Optional | Current working directory at event creation. |
| `workspaceRoots` | string array | Optional | Workspace roots visible to the harness. |
| `model` | string | Optional | Harness-reported model identifier. |
| `agent` | object | Optional | Current subagent identity, if applicable. |

Paths and model identifiers may be sensitive; a harness must permit implementations or
administrators to omit optional session fields.

## Tool object

| Field | Type | Requirement | Semantics |
| --- | --- | --- | --- |
| `callId` | string | Required | Stable identifier for this invocation within the session. |
| `name` | string | Required | Tool name as exposed by the harness, preserved verbatim. |
| `kind` | string | Required | Coarse portable classification. |
| `input` | object | `tool.before`, `tool.after`, `tool.error` | Parsed tool input. Always a JSON object. |
| `output` | any JSON value | `tool.after` only | Successful tool output, subject to redaction and size limits. |
| `error` | object | `tool.error` only | Tool failure information. |
| `mcp` | object | Optional | MCP server and tool identity when known. |

`callId` stays identical across the `tool.before`, `tool.after`, and `tool.error` events of
one invocation. Adapters synthesize a stable ID when the native harness does not supply one.

The v0.1 `kind` values are: `shell`, `file_read`, `file_write`, `file_edit`, `search`,
`fetch`, `task`, `mcp`, and `other`. The taxonomy is deliberately coarse — it supports
portable broad policy, such as denying all shell execution, without claiming that arbitrary
tool-input schemas are portable.

## Event lifecycle

### `tool.before`

The only interceptable event in v0.1. The harness creates it after the tool name and input
are finalized but before the tool causes any external side effect, and preferably before
the harness displays its own permission prompt. A no-effect result continues the normal
authorization flow; a denial stops the tool call.

### `tool.after`

An optional observation event emitted after successful tool completion, reusing the
`callId` from `tool.before`. Output may be large or sensitive; harnesses should support
truncation, redaction, or omission, signaled through a namespaced extension.

### `tool.error`

An optional observation event emitted when an attempted tool execution fails. It is not
emitted merely because an AHP interceptor denied the call. The `error` object contains a
`message` and may contain `code` and `category`.

### `session.start` and `session.end`

Optional observation events for session boundaries. `session.end` delivery is best effort —
a crash may prevent it — and may carry an `outcome` of `completed`, `cancelled`, `error`,
or `unknown`.

## Native payloads and extensions

The optional `native` object carries a provider-specific payload for fidelity and
diagnostics:

```json
{
  "provider": "claude-code",
  "eventName": "PreToolUse",
  "payload": {}
}
```

Native payload delivery defaults to disabled, a portable backend must function without it,
and native fields never change the semantics of a core effect.

Extension keys use reverse-DNS namespacing, such as `com.example.policy` or
`org.w3c.trace_context`. Implementations preserve unknown extensions when proxying an
event but do not interpret them. A W3C Trace Context extension, for example, provides
correlation only — it does not make OpenTelemetry part of AHP conformance:

```json
{
  "extensions": {
    "org.w3c.trace_context": {
      "traceparent": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
    }
  }
}
```
