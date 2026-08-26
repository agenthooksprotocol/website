---
layout: ../../layouts/DocsLayout.astro
title: Transports
description: The stdio and HTTP bindings — framing, process lifecycles, TLS, and bearer authentication.
---

AHP v0.1 defines two transport bindings. A conforming implementation supports at least one
and identifies it in its conformance claim.

## stdio binding

Each message is one complete JSON-RPC object encoded as UTF-8 and terminated by a single
newline; a message never contains a literal unescaped newline inside the JSON text. The
backend reads protocol messages from `stdin` and writes protocol messages to `stdout`. It
may write UTF-8 diagnostics to `stderr`, but banners, logs, and progress indicators never
appear on `stdout`.

### Persistent lifecycle

A persistent backend stays alive for multiple messages. The harness correlates responses by
JSON-RPC ID and may keep only one outstanding v0.1 intercept request per persistent backend,
because interceptor evaluation is serial. A backend that repeatedly emits malformed
protocol output should be terminated.

### Process-per-event lifecycle

A process-per-event backend receives exactly one JSON-RPC message on `stdin`, followed by
EOF. It writes at most one response and exits. Exit status `0` indicates the process
completed its protocol exchange — the response body, not the exit code, determines the
semantic effect. Any nonzero exit, missing response, or malformed response is an
operational failure.

### Process security

The harness invokes the configured command and argument array directly, without implicit
shell interpolation. It should provide the smallest practical environment and never place
bearer tokens or unrelated credentials in event payloads.

## HTTP binding

The harness sends each JSON-RPC message as the body of a new HTTP `POST` request:

- Request and response bodies use `Content-Type: application/json`.
- The body contains one JSON-RPC object, never a batch.
- A successful intercept response uses HTTP status `200` and contains the JSON-RPC response.
- A successfully accepted observe notification should use `202 Accepted` or
  `204 No Content` with no JSON-RPC response.
- Any other HTTP status is an operational failure.
- Redirects are not followed unless explicitly enabled for the configured endpoint.

AHP v0.1 does not use SSE, streaming responses, or a corresponding HTTP `GET` endpoint.

### TLS

Remote endpoints use `https`. Plain `http` is acceptable only for loopback addresses or
explicitly controlled local development environments. Implementations validate server
certificates using platform trust policy unless a deployment explicitly configures a
narrower trust root; disabling certificate validation is not recommended.

### Authentication

v0.1 defines one portable HTTP authentication profile: static bearer authentication through
a credential reference. The registration document names an environment variable or
implementation-defined secret reference; the harness resolves it at runtime and sends:

```text
Authorization: Bearer <token>
```

The literal token never appears in the portable registration document, event payload, logs,
denial reason, or JSON-RPC error data. OAuth 2.1, mTLS, workload identity, signed requests,
and service discovery are out of scope for the portable v0.1 binding.
