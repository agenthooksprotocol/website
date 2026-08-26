---
layout: ../../layouts/DocsLayout.astro
title: Capabilities and effects
description: How a harness advertises what it can enforce, the shape of the deny effect, and why v0.1 defines no allow effect.
---

AHP responses are bounded by explicit capabilities. A harness advertises only the effects
it can enforce for the current interception, and a backend returns only advertised effects.

## Capabilities

Every `hooks/intercept` request includes a capabilities object:

```json
{
  "capabilities": {
    "effects": ["deny"]
  }
}
```

A harness claiming the v0.1 Tool Interception profile advertises `deny` for `tool.before`.
Returning an unadvertised effect is an operational protocol failure, not an implicit no-op —
the harness applies the interceptor's configured failure policy.

Capabilities describe the current event and runtime, not the harness product. A backend
must not infer capabilities from provider name, provider version, transport, or native
payload. Future experimental effects use reverse-DNS names and must be advertised exactly
before a backend may return them.

## The effect list

A successful intercept result contains an `effects` array with either:

- no effects, or
- exactly one `deny` effect.

Multiple `deny` effects from one backend are invalid. Effect ordering and combinations are
reserved for a later version.

## The `deny` effect

| Field | Type | Requirement | Semantics |
| --- | --- | --- | --- |
| `type` | string | Required | Exact value `deny`. |
| `reason` | string | Required | Non-empty human-readable explanation. |
| `code` | string | Optional | Stable machine-readable reverse-DNS identifier. |
| `extensions` | object | Optional | Namespaced backend metadata. |

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

A harness that accepts a valid `deny` effect does not execute the represented operation. A
valid denial is an explicit policy result — it denies regardless of whether the interceptor
is configured `fail-open` or `fail-closed`. Backends should keep secrets, stack traces, and
sensitive policy internals out of `reason`, because the harness may show it to a user or
model.

## No `allow` effect

AHP v0.1 has no `allow` effect. An empty effect list means only that the current backend
has no objection:

```json
{
  "jsonrpc": "2.0",
  "id": "evt_01JQ8Z2Y6YR0H8N7Q2M3X4V5W6",
  "result": {
    "protocolVersion": "0.1",
    "effects": []
  }
}
```

An empty result cannot skip remaining interceptors, override a denial, bypass a host
permission prompt, disable sandboxing, or grant a tool capability. Existing hook systems
use "allow" for incompatible concepts; keeping it out of v0.1 avoids importing those
ambiguities. Cross-harness research showed denial is the smallest broadly meaningful
control capability — starting with one effect keeps conformance meaningful.

## The authorization boundary

AHP is an additional restriction point, not an authority-escalation mechanism. No AHP
response can grant a capability that the harness, user, sandbox, or operating system has
not granted. The host validates and applies effects, and backends are treated as untrusted
input even when authenticated.
