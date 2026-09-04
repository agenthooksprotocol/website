import { handle } from '@astrojs/cloudflare/handler';
import { SITE_ORIGIN } from './config/site';

const socialCardOrigin = `${SITE_ORIGIN}/social-cards/`;
const roadmapCacheControl = 'public, max-age=0, s-maxage=300, stale-if-error=86400';

function responseWithHeaders(response: Response, headers: Headers) {
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function rewriteSocialCardOrigin(request: Request, response: Response) {
  const requestOrigin = new URL(request.url).origin;
  if (requestOrigin === SITE_ORIGIN || !response.headers.get('Content-Type')?.startsWith('text/html')) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  return new Response(
    (await response.text()).replaceAll(socialCardOrigin, `${requestOrigin}/social-cards/`),
    { headers, status: response.status, statusText: response.statusText },
  );
}

function roadmapCacheKey(request: Request, kind: 'fresh' | 'stale') {
  const url = new URL('/roadmap/', request.url);
  url.searchParams.set('__roadmap_cache', kind);
  return new Request(url);
}

function cachedRoadmapResponse(response: Response, stale = false) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', roadmapCacheControl);
  headers.set('X-Roadmap-Cache', stale ? 'stale' : 'hit');
  return responseWithHeaders(response, headers);
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    const url = new URL(request.url);
    const isRoadmap = request.method === 'GET' && (url.pathname === '/roadmap' || url.pathname === '/roadmap/');
    const cache = (caches as CacheStorage & { readonly default: Cache }).default;

    if (isRoadmap) {
      const cached = await cache.match(roadmapCacheKey(request, 'fresh'));
      if (cached !== undefined) return cachedRoadmapResponse(cached);
    }

    const response = await rewriteSocialCardOrigin(request, await handle(request, env, context));
    if (!isRoadmap) return response;

    if (!response.ok) {
      const stale = await cache.match(roadmapCacheKey(request, 'stale'));
      return stale === undefined ? response : cachedRoadmapResponse(stale, true);
    }

    const freshHeaders = new Headers(response.headers);
    freshHeaders.set('Cache-Control', 'public, max-age=300');
    const staleHeaders = new Headers(response.headers);
    staleHeaders.set('Cache-Control', 'public, max-age=604800');
    context.waitUntil(Promise.all([
      cache.put(roadmapCacheKey(request, 'fresh'), responseWithHeaders(response.clone(), freshHeaders)),
      cache.put(roadmapCacheKey(request, 'stale'), responseWithHeaders(response.clone(), staleHeaders)),
    ]));
    return response;
  },
} satisfies ExportedHandler<Env>;
