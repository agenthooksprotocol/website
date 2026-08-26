---
layout: ../../layouts/DocsLayout.astro
title: Registration
description: The portable JSON document that configures backends, subscriptions, timeouts, and failure policy.
---

A portable registration document tells a harness which backends to consult, in what order,
over which transport, and with what timeout and failure policy. A harness validates
registration before using it for agent operations and rejects invalid or ambiguous
configuration rather than silently skipping it.

## Document shape

The document declares protocol version `0.1` and an ordered, non-empty `hooks` array:

```json
{
  "protocolVersion": "0.1",
  "hooks": [
    {
      "id": "com.example.policy",
      "transport": {
        "type": "http",
        "url": "https://policy.example.com/agent-hooks"
      },
      "authentication": {
        "type": "bearer",
        "tokenEnv": "AHP_POLICY_TOKEN"
      },
      "subscriptions": [
        {
          "events": ["tool.before"],
          "mode": "intercept",
          "timeoutMs": 750,
          "failurePolicy": "fail-closed"
        }
      ]
    },
    {
      "id": "com.example.local-review",
      "transport": {
        "type": "stdio",
        "command": "/usr/local/bin/local-review",
        "args": ["serve"],
        "lifecycle": "persistent"
      },
      "subscriptions": [
        {
          "events": ["tool.before"],
          "mode": "intercept",
          "timeoutMs": 500,
          "failurePolicy": "fail-open"
        }
      ]
    }
  ]
}
```

Array order is the interceptor evaluation order — see
[Composition and failure](/docs/composition/).

## Backend fields

| Field | Requirement | Semantics |
| --- | --- | --- |
| `id` | Required | Unique reverse-DNS backend identifier within the document. |
| `transport` | Required | Exactly one supported transport configuration. |
| `authentication` | HTTP bearer only | Credential reference; never a literal credential. |
| `subscriptions` | Required | Non-empty array of event subscriptions. |

## Subscription fields

| Field | Requirement | Semantics |
| --- | --- | --- |
| `events` | Required | Non-empty array of exact event names. No matcher language in v0.1. |
| `mode` | Required | `intercept` or `observe`. |
| `timeoutMs` | Intercept only | Required positive integer deadline. |
| `failurePolicy` | Intercept only | Required `fail-open` or `fail-closed`. |
| `includeNative` | Optional | Boolean; defaults to `false`. |

An `intercept` subscription may contain only `tool.before` in v0.1. An `observe`
subscription must not include `timeoutMs` or `failurePolicy`.

## Transport fields

A stdio transport contains `type: "stdio"`, a `command`, optional `args`, a `lifecycle` of
`persistent` or `per_event`, and an optional `cwd`.

An HTTP transport contains `type: "http"` and an absolute `url`. A bearer authentication
object contains `type: "bearer"` and `tokenEnv`, the environment variable holding the
token. Implementations may support additional local secret-reference forms, but portable
documents cannot assume them.

## Native harness configuration

A harness may translate this registration model into its native configuration format and
still claim protocol conformance, provided the resulting order, subscriptions, timeout,
failure, transport, and credential semantics are equivalent.
