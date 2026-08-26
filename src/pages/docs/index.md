---
layout: ../../layouts/DocsLayout.astro
title: Overview
description: What the Agent Hooks Protocol is, the problem it solves, and the smallest conforming path through v0.1.
---

The Agent Hooks Protocol (AHP) defines a vendor-neutral interface through which an agent
harness can ask an external backend to inspect and control an impending runtime operation.
AHP v0.1 focuses on one portable control point: intercepting a tool call before execution
and returning either no effect or a denial.

> AHP is a Working Draft (`0.1.0-draft.1`). It is not a final standard and must not be
> treated as a stable compatibility commitment. The
> [canonical specification](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/spec/working-draft.md)
> is the normative source for every requirement summarized on this site.

## The problem

Current agent harnesses expose incompatible hook systems. They differ in event names,
payload shapes, tool identities, process lifecycles, output codecs, timeouts, ordering,
permission decisions, and failure behavior. Some use exit codes, some parse structured
stdout, some invoke long-lived plugins, and some expose only fire-and-forget events.

As a result, an external policy backend cannot reliably answer a simple question — such as
whether a tool call should execute — without provider-specific logic. A timeout may continue
execution in one harness and stop it in another. An apparent "allow" response may mean
different things in different harnesses, or nothing at all.

AHP standardizes the boundary between a harness and a control backend:

```text
Existing harness ─▶ compatibility adapter ─▶ AHP backend
Conforming harness ─────────────────────────▶ AHP backend
```

## What AHP standardizes

- **A shared event model.** A canonical envelope and lifecycle events with stable event,
  session, and tool-call identity.
- **A decision protocol.** JSON-RPC methods for synchronous interception
  (`hooks/intercept`) and optional one-way observation (`hooks/observe`).
- **Explicit effects and capabilities.** A bounded response from the backend and an
  explicit list of effects the harness can enforce.
- **Predictable composition and failure behavior.** Deterministic backend ordering,
  deadlines, response validation, and fail-open or fail-closed behavior.
- **Portable bindings and registration.** stdio and HTTP transport rules plus a common way
  to configure backends and subscriptions.
- **Compatibility and conformance tooling.** Adapters for existing hook dialects and
  executable tests that verify equivalent behavior.

## The minimum v0.1 path

A harness is about to execute a tool call and emits `tool.before` through
`hooks/intercept`. The request says that `deny` is available. Each matching backend returns
either no effect or one `deny` effect.

- **No effect** means that backend has no objection. It does not bypass the harness's own
  permission checks.
- **A denial** stops the tool call.
- **A timeout, crash, or invalid response** is an operational failure, and the harness
  applies that backend's configured failure policy rather than treating the failure as a
  decision.

The harness remains the execution and security boundary. It owns the tool call, decides
which capabilities to offer, enforces deadlines and failure policy, validates responses,
and applies any effect.

## What v0.1 deliberately leaves out

AHP v0.1 does not replace OpenTelemetry, MCP, ACP, or A2A. It does not standardize prompts,
model requests, universal tool-input schemas, tool-input mutation, output replacement,
context injection, or user approval prompts — and it defines no effect that bypasses host
permissions. Later profiles can add effects such as requesting approval or replacing tool
input, but only when a harness can advertise and enforce those semantics consistently.

## Where to go next

- [Architecture](/docs/architecture/) — roles, the JSON-RPC model, and versioning.
- [Events](/docs/events/) — the canonical envelope and event lifecycle.
- [Capabilities and effects](/docs/effects/) — the `deny` effect and why there is no `allow`.
- [Specification](/docs/specification/) — the canonical Working Draft and its supporting artifacts.
