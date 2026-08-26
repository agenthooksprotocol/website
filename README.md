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

## Cloudflare Pages

Connect this repository to Cloudflare Pages with these settings:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

No Cloudflare adapter is needed because the site is fully static.

## Protocol sources

The canonical specification, schemas, fixtures, and conformance tooling live in the [`agent-hooks-protocol`](https://github.com/agenthooksprotocol/agent-hooks-protocol) repository. Do not copy normative protocol content into this repository without a plan to keep it synchronized.
