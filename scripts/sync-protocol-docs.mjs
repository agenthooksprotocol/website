import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repositoryUrl = 'https://github.com/agenthooksprotocol/agent-hooks-protocol';
const sourceDirectory = path.resolve(process.argv[2] ?? '../agent-hooks-protocol');
const websiteDirectory = fileURLToPath(new URL('..', import.meta.url));
const pagesDirectory = path.join(websiteDirectory, 'src/pages/docs');
const generatedDirectory = path.join(websiteDirectory, 'src/generated');
const publicDirectory = path.join(websiteDirectory, 'public/protocol');
const layoutPath = path.join(websiteDirectory, 'src/layouts/DocsLayout.astro');
function slugSegment(segment) {
  return segment.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
}

function routeForSource(source) {
  const parsed = path.posix.parse(source);
  const directoryParts = parsed.dir === '' ? [] : parsed.dir.split('/');
  if (directoryParts[0] === 'docs') directoryParts.shift();

  const routeParts = directoryParts.map(slugSegment);
  const basename = parsed.name.toLowerCase();
  if (basename !== 'readme' && basename !== 'index') routeParts.push(slugSegment(parsed.name));
  return routeParts.length === 0 ? '/docs/' : `/docs/${routeParts.join('/')}/`;
}

function destinationForRoute(route) {
  const routePath = route.slice('/docs/'.length, -1);
  return routePath === ''
    ? path.join(pagesDirectory, 'index.md')
    : path.join(pagesDirectory, routePath, 'index.md');
}

function publicAssetUrl(source) {
  return `/protocol/${source.split('/').map(encodeURIComponent).join('/')}`;
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;');
}

function wrapText(value, maxLength) {
  return value.split(/\s+/).reduce((lines, word) => {
    const current = lines.at(-1);
    if (current === undefined || `${current} ${word}`.length > maxLength) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
    return lines;
  }, []);
}

async function renderSocialCard(metadata) {
  const firstSentence = metadata.projectDescription.match(/^.*?[.!?](?:\s|$)/)?.[0].trim()
    ?? metadata.projectDescription;
  const descriptionLines = wrapText(firstSentence, 64).slice(0, 2);
  const description = descriptionLines
    .map((line, index) =>
      `<text x="104" y="${354 + index * 42}" fill="#59645f" font-family="Arial, sans-serif" font-size="30">${escapeXml(line)}</text>`,
    )
    .join('\n  ');
  const badge = `${metadata.protocolVersion} · ${metadata.status}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <path d="M0 1h1200M0 629h1200" stroke="#d8dedb"/>
  <g transform="translate(104 104) scale(1.45)" fill="none" stroke="#1f2328" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 -6.5L0 -19.5A6 6 0 0 1 12 -19.5L12 -13"/>
    <path d="M0 -6.5L0 -19.5A6 6 0 0 1 12 -19.5L12 -13" transform="rotate(120)"/>
    <path d="M0 -6.5L0 -19.5A6 6 0 0 1 12 -19.5L12 -13" transform="rotate(240)"/>
  </g>
  <text x="168" y="115" fill="#1f2328" font-family="Arial, sans-serif" font-size="29" font-weight="700">${escapeXml(metadata.projectName)}</text>
  <rect x="826" y="76" width="270" height="48" rx="24" fill="#f2f5f3" stroke="#d8dedb"/>
  <text x="961" y="106" fill="#48534e" font-family="Arial, sans-serif" font-size="16" font-weight="700" text-anchor="middle">${escapeXml(badge)}</text>
  <text x="104" y="288" fill="#1f2328" font-family="Arial, sans-serif" font-size="68" font-weight="700" letter-spacing="-2">Protocol documentation</text>
  ${description}
  <line x1="104" y1="462" x2="1096" y2="462" stroke="#d8dedb"/>
  <text x="104" y="528" fill="#59645f" font-family="monospace" font-size="21">agenthooksprotocol.com</text>
</svg>
`;

  await writeFile(path.join(websiteDirectory, 'public/social-card.svg'), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(websiteDirectory, 'public/social-card.png'));
}

function rewriteMarkdown(markdown, source, routes, assets, linkedSources) {
  let fence = null;

  function rewriteDestination(destination) {
    const wrapped = destination.startsWith('<') && destination.endsWith('>');
    const value = wrapped ? destination.slice(1, -1) : destination;
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(value)) return destination;

    const match = value.match(/^([^?#]*)(.*)$/);
    const targetPath = match[1];
    const suffix = match[2];
    const resolved = path.posix.normalize(
      targetPath.startsWith('/')
        ? targetPath.slice(1)
        : path.posix.join(path.posix.dirname(source), targetPath),
    );
    if (resolved === '..' || resolved.startsWith('../')) {
      throw new Error(`${source} links outside the protocol repository: ${value}`);
    }

    let linkedSource = routes.has(resolved) ? resolved : null;
    let rewritten = routes.get(resolved);
    const absoluteTarget = path.join(sourceDirectory, resolved);
    if (rewritten === undefined && existsSync(absoluteTarget)) {
      const target = statSync(absoluteTarget);
      if (target.isDirectory()) {
        linkedSource = [
          path.posix.join(resolved, 'README.md'),
          path.posix.join(resolved, 'index.md'),
        ].find((candidate) => routes.has(candidate)) ?? null;
        rewritten = linkedSource === null ? undefined : routes.get(linkedSource);
      } else {
        assets.add(resolved);
        rewritten = publicAssetUrl(resolved);
      }
    }
    if (rewritten === undefined) throw new Error(`${source} has an unresolved local link: ${value}`);
    if (linkedSource !== null && !linkedSources.includes(linkedSource)) linkedSources.push(linkedSource);

    const result = `${rewritten}${suffix}`;
    return wrapped ? `<${result}>` : result;
  }

  return markdown
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1];
        if (fence === null) fence = marker;
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        return line;
      }
      if (fence !== null) return line;

      let rewritten = line.replace(
        /(!?\[[^\]]*\]\()(<[^>]+>|[^\s)]+)([^)]*\))/g,
        (_, prefix, destination, suffix) => `${prefix}${rewriteDestination(destination)}${suffix}`,
      );
      rewritten = rewritten.replace(
        /^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/,
        (_, prefix, destination, suffix) => `${prefix}${rewriteDestination(destination)}${suffix}`,
      );
      return rewritten.replace(
        /\b(href|src)=(["'])([^"']+)\2/g,
        (_, attribute, quote, destination) =>
          `${attribute}=${quote}${rewriteDestination(destination)}${quote}`,
      );
    })
    .join('\n');
}

function groupForSource(source) {
  if (source === 'GOVERNANCE.md' || source.startsWith('governance/')) return 'Governance';
  if (source.startsWith('spec/')) return 'Specification';
  if (source.startsWith('conformance/')) return 'Conformance';
  if (/^(?:fixtures|schema|tools)\//.test(source)) return 'Artifacts and tooling';
  return 'Project';
}

function orderDocuments(documents, sectionTitle, preferredSources = []) {
  const bySource = new Map(documents.map((document) => [document.source, document]));
  const ordered = [];
  const visited = new Set();
  let discoveredRoots = documents
    .filter((document) => {
      if (sectionTitle === 'Project') return document.source === 'README.md';
      if (sectionTitle === 'Governance') return document.source === 'GOVERNANCE.md';
      if (sectionTitle === 'Conformance') return document.source.endsWith('/README.md');
      if (sectionTitle === 'Specification') return document.source.endsWith('/index.md');
      return document.source.endsWith('/README.md');
    })
    .sort((left, right) => {
      const depth = left.source.split('/').length - right.source.split('/').length;
      return depth === 0 ? left.href.localeCompare(right.href) : depth;
    });
  if (sectionTitle === 'Specification') discoveredRoots = discoveredRoots.slice(0, 1);
  const preferredRoots = preferredSources.map((source) => bySource.get(source)).filter(Boolean);
  const rootCandidates = sectionTitle === 'Project' || sectionTitle === 'Governance'
    ? [...discoveredRoots, ...preferredRoots]
    : [...preferredRoots, ...discoveredRoots];
  const roots = rootCandidates.filter(
    (document, index) => rootCandidates.findIndex((candidate) => candidate.source === document.source) === index,
  );
  const rootSources = new Set(roots.map((document) => document.source));

  function visit(source) {
    if (visited.has(source) || !bySource.has(source)) return;
    visited.add(source);
    const document = bySource.get(source);
    ordered.push(document);

    const basename = path.posix.basename(source).toLowerCase();
    if (basename === 'index.md' || basename === 'readme.md' || source === 'GOVERNANCE.md') {
      for (const linkedSource of document.linkedSources) {
        if (!visited.has(linkedSource) && rootSources.has(linkedSource)) continue;
        visit(linkedSource);
      }
    }
  }

  for (const root of roots) visit(root.source);
  for (const document of [...documents].sort((left, right) => left.href.localeCompare(right.href))) {
    visit(document.source);
  }
  return ordered;
}

const markdownFiles = execFileSync('git', ['-C', sourceDirectory, 'ls-files', '*.md'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .sort();
const routes = new Map();
for (const source of markdownFiles) {
  const route = routeForSource(source);
  const collision = [...routes.entries()].find(([, existingRoute]) => existingRoute === route);
  if (collision !== undefined) {
    throw new Error(`Route collision: ${collision[0]} and ${source} both map to ${route}`);
  }
  routes.set(source, route);
}

await rm(pagesDirectory, { recursive: true, force: true });
await rm(publicDirectory, { recursive: true, force: true });
await mkdir(pagesDirectory, { recursive: true });
await mkdir(publicDirectory, { recursive: true });
await mkdir(generatedDirectory, { recursive: true });

const assets = new Set();
const documents = [];
for (const sourcePath of markdownFiles) {
  const source = (await readFile(path.join(sourceDirectory, sourcePath), 'utf8')).replaceAll('\r\n', '\n');
  const [heading, ...bodyLines] = source.split('\n');
  const headingMatch = heading.match(/^#\s+(.+)$/);
  if (headingMatch === null) throw new Error(`${sourcePath} must start with a level-one heading`);

  const route = routes.get(sourcePath);
  const destination = destinationForRoute(route);
  const relativeLayout = path.relative(path.dirname(destination), layoutPath).split(path.sep).join('/');
  const linkedSources = [];
  const sourceBody = bodyLines.join('\n').replace(/^\n+/, '');
  const body = rewriteMarkdown(sourceBody, sourcePath, routes, assets, linkedSources);
  const output = [
    '---',
    `layout: ${relativeLayout}`,
    `title: ${JSON.stringify(headingMatch[1])}`,
    `sourceUrl: ${repositoryUrl}/blob/main/${sourcePath}`,
    '---',
    '',
    '<!-- Generated by scripts/sync-protocol-docs.mjs. Do not edit directly. -->',
    '',
    body,
  ].join('\n');

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, output);
  documents.push({
    source: sourcePath,
    title: headingMatch[1],
    href: route,
    linkedSources,
    summary: sourcePath === 'README.md' ? sourceBody.split(/\n\s*\n/, 1)[0] : undefined,
  });
}

for (const asset of [...assets].sort()) {
  const destination = path.join(publicDirectory, asset);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(sourceDirectory, asset), destination);
}

const requirements = JSON.parse(
  await readFile(path.join(sourceDirectory, 'spec/draft/requirements.json'), 'utf8'),
);
const sectionOrder = ['Project', 'Specification', 'Conformance', 'Governance', 'Artifacts and tooling'];
const projectDocument = documents.find((document) => document.source === 'README.md');
if (projectDocument === undefined) throw new Error('The protocol repository must contain README.md');
const generatedDocsNav = sectionOrder
  .map((title) => {
    const sectionDocuments = documents.filter((document) => groupForSource(document.source) === title);
    return {
      title,
      items: orderDocuments(sectionDocuments, title, projectDocument.linkedSources)
        .map(({ title: itemTitle, href }) => ({ title: itemTitle, href })),
    };
  })
  .filter((section) => section.items.length > 0);
const metadata = {
  projectName: projectDocument.title,
  projectDescription: projectDocument.summary,
  status: requirements.status,
  protocolVersion: requirements.protocolVersion,
  snapshotVersion: requirements.snapshotVersion,
};
const routeDocuments = {
  documentation: projectDocument,
  specification: orderDocuments(
    documents.filter((document) => groupForSource(document.source) === 'Specification'),
    'Specification',
    projectDocument.linkedSources,
  )[0],
  contributing: documents.find((document) => document.title === 'Contributing'),
  governance: documents.find((document) => document.title === 'Governance'),
  security: documents.find((document) => document.title === 'Security Policy'),
};
const protocolRoutes = Object.fromEntries(
  Object.entries(routeDocuments).map(([name, document]) => {
    if (document === undefined) throw new Error(`Required protocol document is missing: ${name}`);
    return [name, document.href];
  }),
);
await renderSocialCard(metadata);

const generatedModule = [
  '// Generated by scripts/sync-protocol-docs.mjs. Do not edit directly.',
  `export const protocolMetadata = ${JSON.stringify(metadata, null, 2)} as const;`,
  '',
  `export const protocolRoutes = ${JSON.stringify(protocolRoutes, null, 2)} as const;`,
  '',
  `export const generatedDocsNav = ${JSON.stringify(generatedDocsNav, null, 2)} as const;`,
  '',
].join('\n');
await writeFile(path.join(generatedDirectory, 'protocol-docs.ts'), generatedModule);

console.log(`Synchronized ${documents.length} documents and ${assets.size} linked assets.`);
