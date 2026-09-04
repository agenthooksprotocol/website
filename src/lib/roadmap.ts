import { SITE_ORIGIN } from '../config/site';

const APP_ID = '4741940';
const ORGANIZATION = 'agenthooksprotocol';
const PROJECT_NODE_ID = 'PVT_kwDOEyIPXM4Bie2a';
export const ROADMAP_SOURCE_URL = 'https://github.com/orgs/agenthooksprotocol/projects/1';

const GITHUB_API_VERSION = '2022-11-28';
const FRESH_TTL_SECONDS = 5 * 60;
const STALE_TTL_SECONDS = 7 * 24 * 60 * 60;
const CACHE_ORIGIN = `${SITE_ORIGIN}/.roadmap-cache`;

export type RoadmapWorkstream = 'Protocol' | 'Transport' | 'Security' | 'SDK' | 'Conformance';

export interface RoadmapItem {
  id: string;
  title: string;
  url: string;
  kind: 'issue' | 'draft';
  workstream?: RoadmapWorkstream;
  status?: string;
  milestone?: string;
  labels: string[];
  repository?: string;
  number?: number;
}

export interface RoadmapData {
  projectTitle: string;
  projectUrl: string;
  refreshedAt: string;
  stale: boolean;
  items: RoadmapItem[];
}

interface GitHubFieldValue {
  name?: string;
  text?: string;
  field?: { name?: string };
}

interface GitHubProjectItem {
  id: string;
  isArchived?: boolean;
  content?: {
    __typename?: string;
    title?: string;
    url?: string;
    number?: number;
    repository?: { nameWithOwner?: string };
    milestone?: { title?: string };
    labels?: { nodes?: Array<{ name?: string }> };
  };
  fieldValues?: { nodes?: GitHubFieldValue[] };
}

interface GitHubProjectResponse {
  data?: {
    node?: {
      title?: string;
      url?: string;
      items?: {
        nodes?: GitHubProjectItem[];
        pageInfo?: { hasNextPage?: boolean; endCursor?: string };
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

function base64Url(input: string | ArrayBuffer) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function derLength(length: number) {
  if (length < 128) return new Uint8Array([length]);
  const bytes: number[] = [];
  for (let value = length; value > 0; value >>= 8) bytes.unshift(value & 0xff);
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function der(tag: number, value: Uint8Array) {
  const length = derLength(value.length);
  const result = new Uint8Array(1 + length.length + value.length);
  result[0] = tag;
  result.set(length, 1);
  result.set(value, 1 + length.length);
  return result;
}

function concat(...values: Uint8Array[]) {
  const result = new Uint8Array(values.reduce((total, value) => total + value.length, 0));
  let offset = 0;
  for (const value of values) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}

function privateKeyDer(pemValue: string) {
  const pem = pemValue.replaceAll('\\n', '\n').trim();
  const isPkcs1 = pem.includes('BEGIN RSA PRIVATE KEY');
  const encoded = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/gu, '');
  if (encoded === '') throw new Error('The GitHub App private key is not configured.');
  const binary = atob(encoded);
  const key = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (!isPkcs1) return key;

  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const rsaAlgorithm = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  ]);
  return der(0x30, concat(version, rsaAlgorithm, der(0x04, key)));
}

async function createAppJwt(privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: APP_ID }));
  const unsignedToken = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyDer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  );
  return `${unsignedToken}.${base64Url(signature)}`;
}

function githubHeaders(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'agent-hooks-protocol-website',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };
}

async function installationToken(privateKey: string) {
  const jwt = await createAppJwt(privateKey);
  const installationResponse = await fetch(
    `https://api.github.com/orgs/${ORGANIZATION}/installation`,
    { headers: githubHeaders(jwt) },
  );
  if (!installationResponse.ok) {
    throw new Error(`GitHub installation lookup failed (${installationResponse.status}).`);
  }
  const installation = await installationResponse.json<{ id?: number }>();
  if (installation.id === undefined) throw new Error('The GitHub App is not installed for the organization.');

  const tokenResponse = await fetch(
    `https://api.github.com/app/installations/${installation.id}/access_tokens`,
    { method: 'POST', headers: githubHeaders(jwt) },
  );
  if (!tokenResponse.ok) {
    throw new Error(`GitHub installation token creation failed (${tokenResponse.status}).`);
  }
  const token = await tokenResponse.json<{ token?: string }>();
  if (token.token === undefined) throw new Error('GitHub returned an empty installation token.');
  return token.token;
}

const PROJECT_QUERY = `
  query Roadmap($project: ID!, $cursor: String) {
    node(id: $project) {
      ... on ProjectV2 {
        title
        url
        items(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isArchived
            content {
              __typename
              ... on Issue {
                title
                url
                number
                repository { nameWithOwner }
                milestone { title }
                labels(first: 30) { nodes { name } }
              }
              ... on DraftIssue { title }
            }
            fieldValues(first: 30) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field { ... on ProjectV2Field { name } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

function projectField(item: GitHubProjectItem, fieldName: string) {
  const value = item.fieldValues?.nodes?.find(
    (field) => field.field?.name?.toLowerCase() === fieldName.toLowerCase(),
  );
  return value?.name ?? value?.text;
}

function normalizeWorkstream(value?: string): RoadmapWorkstream | undefined {
  if (value === 'Protocol' || value === 'Transport' || value === 'Security' || value === 'SDK' || value === 'Conformance') {
    return value;
  }
  return undefined;
}

async function fetchRoadmap(privateKey: string): Promise<RoadmapData> {
  const token = await installationToken(privateKey);
  const projectItems: GitHubProjectItem[] = [];
  let cursor: string | null = null;
  let projectTitle = 'Agent Hooks Protocol roadmap';
  let projectUrl = ROADMAP_SOURCE_URL;

  do {
    const response: Response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PROJECT_QUERY, variables: { project: PROJECT_NODE_ID, cursor } }),
    });
    if (!response.ok) throw new Error(`GitHub project query failed (${response.status}).`);
    const result = (await response.json()) as GitHubProjectResponse;
    if (result.errors?.length) throw new Error(result.errors[0]?.message ?? 'GitHub project query failed.');
    const project = result.data?.node;
    if (project === undefined || project === null) throw new Error('GitHub project was not found.');
    projectTitle = project.title ?? projectTitle;
    projectUrl = project.url ?? projectUrl;
    projectItems.push(...(project.items?.nodes ?? []));
    cursor = project.items?.pageInfo?.hasNextPage ? project.items.pageInfo.endCursor ?? null : null;
  } while (cursor !== null);

  const items = projectItems.flatMap<RoadmapItem>((item) => {
    if (item.isArchived || item.content?.title === undefined) return [];
    const kind = item.content.__typename === 'Issue' ? 'issue' : item.content.__typename === 'DraftIssue' ? 'draft' : null;
    if (kind === null) return [];
    return [{
      id: item.id,
      title: item.content.title,
      url: item.content.url ?? projectUrl,
      kind,
      workstream: normalizeWorkstream(projectField(item, 'Workstream')),
      status: projectField(item, 'Status'),
      milestone: item.content.milestone?.title,
      labels: item.content.labels?.nodes?.flatMap((label) => label.name ? [label.name] : []) ?? [],
      repository: item.content.repository?.nameWithOwner,
      number: item.content.number,
    }];
  });

  return { projectTitle, projectUrl, refreshedAt: new Date().toISOString(), stale: false, items };
}

function cacheRequest(kind: 'fresh' | 'stale') {
  return new Request(`${CACHE_ORIGIN}/${kind}`);
}

async function readCache(cache: Cache, kind: 'fresh' | 'stale') {
  try {
    const response = await cache.match(cacheRequest(kind));
    return response?.ok ? await response.json<RoadmapData>() : undefined;
  } catch {
    return undefined;
  }
}

async function writeCache(cache: Cache, kind: 'fresh' | 'stale', data: RoadmapData) {
  const ttl = kind === 'fresh' ? FRESH_TTL_SECONDS : STALE_TTL_SECONDS;
  try {
    await cache.put(cacheRequest(kind), new Response(JSON.stringify(data), {
      headers: { 'Cache-Control': `public, max-age=${ttl}`, 'Content-Type': 'application/json' },
    }));
  } catch {
    // Caching is an optimization; a successful GitHub response can still be rendered.
  }
}

export async function getRoadmap(
  privateKey: string,
  cache: Cache = (caches as CacheStorage & { readonly default: Cache }).default,
) {
  const cached = await readCache(cache, 'fresh');
  if (cached !== undefined) return { ...cached, stale: false };

  try {
    const data = await fetchRoadmap(privateKey);
    await Promise.all([writeCache(cache, 'fresh', data), writeCache(cache, 'stale', data)]);
    return data;
  } catch (error) {
    const stale = await readCache(cache, 'stale');
    if (stale !== undefined) return { ...stale, stale: true };
    throw error;
  }
}
