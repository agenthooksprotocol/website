# Agent Hooks Protocol website

The public website for [Agent Hooks Protocol](https://agenthooksprotocol.com), built with [Astro](https://astro.build) for Cloudflare Workers. All routes are prerendered except the on-demand `/roadmap/` page.

## Development

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

The build output is written to `dist/client/` (prerendered assets) and `dist/server/` (the Worker bundle). The Cloudflare adapter prerenders the static routes and emits the server manifest used by the custom Worker for `/roadmap/`.

## Cloudflare deployment

The checked-in `wrangler.jsonc` runs the Astro build, uploads the prerendered assets in `dist/client/`, and uses `src/worker.ts` as a custom Worker entrypoint. The Worker delegates to Astro's supported Cloudflare handler and retains the social-card origin rewrite used by preview deployments. Run `npm run build` before `npx wrangler deploy`; the adapter writes Wrangler's generated deployment target during the build.

The `/roadmap/` route reads the public organization project through the existing `agent-hooks-protocol-bot` GitHub App. Production requires the encrypted Worker secret `AHP_BOT_PRIVATE_KEY`; do not add the private key to Wrangler configuration or source control. For local development only, place it in an ignored `.dev.vars` file:

```ini
AHP_BOT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

The route discovers the app's organization installation, mints a short-lived installation token, and queries GitHub GraphQL. Roadmap data is cached for five minutes in the Cloudflare Cache API, with a longer-lived cached copy used if GitHub is temporarily unavailable. The HTML response also advertises a five-minute shared-cache lifetime.

## Protocol sources

The front page is maintained in this repository. All pages under `/docs` are generated from public Markdown in the [`agent-hooks-protocol`](https://github.com/agenthooksprotocol/agent-hooks-protocol) repository. This includes the complete specification tree, conformance profiles, governance and project policies, artifact guides, and tooling documentation. Do not edit generated documentation in this repository. Update the protocol repository and regenerate locally with `npm run sync:protocol-docs`.

The Astro build prerenders a dedicated social card for every page at a content-addressed URL. Social-card images are build outputs and must not be added to `public`.

Every push to `agent-hooks-protocol/main` dispatches this repository's `sync-protocol-docs.yml` workflow. Configure the `agent-hooks-protocol` Actions variable `WEBSITE_SYNC_APP_ID` and secret `WEBSITE_SYNC_APP_PRIVATE_KEY` for a GitHub App installed on `website` with **Contents: read and write** permission. The dispatcher mints a short-lived installation token and sends a `repository_dispatch` event; the website workflow then regenerates all mirrors, validates the Astro build, and commits changes with its own `GITHUB_TOKEN`.
