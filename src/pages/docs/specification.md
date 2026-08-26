---
layout: ../../layouts/DocsLayout.astro
title: Specification
description: Where the canonical Working Draft lives, what is normative, and how the protocol evolves.
---

The canonical, language-neutral AHP specification is the
[v0.1 Working Draft](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/spec/working-draft.md)
in the `agent-hooks-protocol` repository. This website is an informative companion: if
anything here conflicts with the canonical draft, the draft wins.

> **Status: Working Draft (`0.1.0-draft.1`).** The draft is not a final standard and must
> not be represented as stable. Material on the repository's default branch is unreleased
> unless a released document explicitly says otherwise.

## What is normative

Only repository material that an AHP release explicitly identifies as normative defines the
protocol. Sections 5 through 22 of the Working Draft are normative where they use BCP 14
key words; the abstract, rationale, open questions, implementation plan, and references are
informative. JSON Schemas constrain representable JSON shape; the prose defines protocol
semantics.

All implementations, SDKs, bindings, examples, adapters, and generated artifacts are
non-normative — including every TypeScript SDK. If an SDK or example conflicts with the
normative protocol, the normative protocol takes precedence.

## Draft artifacts

| Artifact | Location |
| --- | --- |
| Canonical v0.1 Working Draft | [`spec/working-draft.md`](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/spec/working-draft.md) |
| Stable requirement manifest | [`spec/requirements.json`](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/spec/requirements.json) |
| AHP-0001 source proposal | [`proposals/AHP-0001.md`](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/proposals/AHP-0001.md) |
| Versioned JSON Schemas | [`schemas/`](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/schemas) |
| Golden fixtures | [`fixtures/`](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/fixtures) |
| Conformance profiles | [`conformance/`](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/conformance) |
| Validation tooling | [`tools/`](https://github.com/agenthooksprotocol/agent-hooks-protocol/tree/main/tools) |

## Versioning and releases

Protocol releases use Semantic Versioning 2.0.0. Before `1.0.0` the protocol is in initial
development, and a `0.MINOR.0` release can contain incompatible changes, called out
prominently. Each release identifies the exact repository revision and the documents that
form its normative release set. See the
[release and versioning policy](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/docs/RELEASES.md).

## How the protocol evolves

Material protocol or governance changes require an accepted proposal under the public
[AHP proposal process](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/governance/AHP-PROCESS.md).
The Working Draft deliberately keeps its open questions — including the next candidate
effects (`ask`, `replace_tool_input`, `add_context`), event-ID uniqueness, and timeout
bounds — unresolved until implementation evidence exists.

## Participate

- Read the [contributing guide](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/CONTRIBUTING.md)
  before opening a contribution.
- Follow the [code of conduct](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/CODE_OF_CONDUCT.md)
  and the [governance rules](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/GOVERNANCE.md).
- Report vulnerabilities privately according to
  [SECURITY.md](https://github.com/agenthooksprotocol/agent-hooks-protocol/blob/main/SECURITY.md),
  not in a public issue.

The project is licensed under Apache-2.0.
