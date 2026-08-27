# Agent Hooks Protocol website

The public website for [Agent Hooks Protocol](https://agenthooksprotocol.com), built as a static [Astro](https://astro.build) site.

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

The static output is written to `dist/`.

## Cloudflare deployment

The site can be deployed through Cloudflare Workers Builds as a static-assets-only Worker. The checked-in `wrangler.jsonc` runs the Astro build and uploads `dist/`; no Cloudflare Astro adapter or server-side Worker code is needed.

For a Cloudflare Pages project, use these equivalent settings:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

## Protocol sources

The front page is maintained in this repository. All pages under `/docs` are generated from public Markdown in the [`agent-hooks-protocol`](https://github.com/agenthooksprotocol/agent-hooks-protocol) repository. This includes the complete specification tree, conformance profiles, governance and project policies, artifact guides, and tooling documentation. The same generator builds the social card from canonical project metadata. Do not edit generated documentation or social-card assets in this repository. Update the protocol repository and regenerate locally with `npm run sync:protocol-docs`.

Every push to `agent-hooks-protocol/main` dispatches this repository's `sync-protocol-docs.yml` workflow. Configure the `agent-hooks-protocol` Actions variable `WEBSITE_SYNC_APP_ID` and secret `WEBSITE_SYNC_APP_PRIVATE_KEY` for a GitHub App installed on `website` with **Contents: read and write** permission. The dispatcher mints a short-lived installation token and sends a `repository_dispatch` event; the website workflow then regenerates all mirrors, validates the Astro build, and commits changes with its own `GITHUB_TOKEN`.
