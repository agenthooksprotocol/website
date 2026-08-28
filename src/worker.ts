import { SITE_ORIGIN } from './config/site';

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const socialCardOrigin = `${SITE_ORIGIN}/social-cards/`;

export default {
  async fetch(request: Request, env: Env) {
    const response = await env.ASSETS.fetch(request);
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
  },
};
