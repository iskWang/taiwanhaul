// Pure request router for /api/*. Everything else is not this Worker's concern:
// wrangler.json scopes run_worker_first to /api/*, so other paths never reach it.
import type { Dependencies, Env } from './handle-contact.ts';
import { handleContact } from './handle-contact.ts';
import { handleFx } from './fx.ts';

function json(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

/**
 * @param {Request} request
 * @param {Object} env
 * @param {Object} [deps] forwarded to handleContact (fetchImpl, EmailMessageCtor)
 * @returns {Promise<Response>}
 */
export async function route(request: Request, env: Env, deps?: Dependencies & { search?: (request: Request) => Promise<Response> }): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/api/contact') {
    if (request.method !== 'POST') {
      return json(405, { ok: false, error: 'server' }, { Allow: 'POST' });
    }
    return handleContact(request, env, deps);
  }

  if (url.pathname === '/api/fx') {
    if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' }, { Allow: 'GET' });
    return handleFx(deps?.fetchImpl);
  }

  if (url.pathname === '/api/search') {
    if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' }, { Allow: 'GET' });
    try {
      if (!deps?.search) throw new Error('search unavailable');
      return await deps.search(request);
    } catch {
      return json(500, { error: 'search_unavailable' });
    }
  }

  if (url.pathname.startsWith('/api/')) {
    return json(404, { ok: false, error: 'server' });
  }

  return null;
}
