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

The canonical specification, schemas, fixtures, and conformance tooling live in the [`agent-hooks-protocol`](https://github.com/agenthooksprotocol/agent-hooks-protocol) repository. Do not copy normative protocol content into this repository without a plan to keep it synchronized.
