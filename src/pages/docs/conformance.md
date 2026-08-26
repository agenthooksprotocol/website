---
layout: ../../layouts/DocsLayout.astro
title: Conformance
description: The Base Protocol and capability profiles, what a conformance claim contains, and the executable draft artifacts.
---

AHP v0.1 separates base protocol conformance from event-specific capability profiles. A
conformance claim identifies:

- the implementation role: `harness`, `backend`, or both;
- the implemented transport bindings: `stdio`, `http`, or both;
- the implemented capability profiles.

An implementation cannot claim AHP v0.1 conformance from the Base Protocol profile alone —
it must also implement at least one capability profile.

## Base Protocol profile

Every conforming implementation correctly encodes and decodes UTF-8 JSON-RPC 2.0, applies
the version and unknown-field rules, and implements at least one transport binding.

A conforming **harness** additionally validates registration before use, rejects invalid or
ambiguous interceptor configuration, generates stable event identifiers preserved across
retries, and validates backend responses before applying effects.

A conforming **backend** additionally ignores unknown object fields in otherwise valid
messages, returns the defined JSON-RPC error for requests it cannot process (notifications
never receive error responses), and functions without optional native or extension data
unless it explicitly declares a non-portable extension dependency.

## Tool Interception profile

The minimum control capability in v0.1: `tool.before` interception with the `deny` effect.

A claiming harness, given an intercept subscription whose `events` array contains
`tool.before`:

- sends one `hooks/intercept` request after tool name and input are final and before tool
  side effects, advertising `deny` in `capabilities.effects` to declare that it accepts and
  enforces a valid denial;
- keeps the JSON-RPC request ID equal to the event ID and preserves identity across retries;
- executes matching interceptors serially in deterministic registration order under their
  configured deadlines;
- stops tool execution after an explicit denial or fail-closed operational failure; and
- continues its own permissions, sandboxing, and approval flow when the chain completes
  without denial.

The harness sends an event to a backend only when that backend's registration contains a
subscription whose `events` array includes the exact event name and whose `mode` matches the
delivery method. If no intercept subscription matches `tool.before`, AHP adds no decision
step and the harness continues its normal authorization flow.

A claiming backend, given a syntactically valid `hooks/intercept` request for protocol
`0.1` and `tool.before`, returns exactly one successful response containing either
`effects: []` or one advertised `deny` effect with a non-empty reason.

## Lifecycle Observation profile

Optional. A claiming implementation supports `hooks/observe` and one or more lifecycle
events, and identifies each event type it emits or accepts. Observation is non-blocking and
best effort — intended for control-adjacent audit, compatibility, and correlation, not as a
replacement for OpenTelemetry or a durable event pipeline.

## Compatibility adapters

An adapter translating a native hook system into AHP hides provider-specific exit codes and
response shapes, preserves the native tool name, parses tool input into a JSON object,
synthesizes stable call IDs when the provider omits them, advertises only effects the
native event can enforce, and translates `deny` into the provider's actual blocking
mechanism. An adapter never claims fail-closed enforcement for an event the provider cannot
block, and never silently discards an unsupported effect.

## Draft artifacts

The specification repository publishes executable artifacts for revision `0.1.0-draft.1`:

- [Versioned JSON Schemas](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/schemas)
  for the envelope, `tool.before`, effects, responses, and registration. Published schemas
  are immutable and resolve offline.
- [Golden fixtures](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/fixtures)
  for stdio framing, HTTP bodies, and registration, with a hash manifest.
- [Conformance profiles](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/conformance)
  mapping language-neutral descriptions to stable requirement IDs.
- [Dependency-free tooling](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/tools):

```sh
python3 tools/check_conformance.py
```

The checker validates schemas, fixture framing and hashes, requirement IDs, and manifest
drift using only the Python standard library.
