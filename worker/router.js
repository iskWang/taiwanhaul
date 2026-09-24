// Pure request router for /api/*. Everything else is not this Worker's concern:
// wrangler.json scopes run_worker_first to /api/*, so other paths never reach it.
import { handleContact } from './handle-contact.js';

function json(status, body, extraHeaders) {
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
export async function route(request, env, deps) {
  const url = new URL(request.url);

  if (url.pathname === '/api/contact') {
    if (request.method !== 'POST') {
      return json(405, { ok: false, error: 'server' }, { Allow: 'POST' });
    }
    return handleContact(request, env, deps);
  }

  if (url.pathname.startsWith('/api/')) {
    return json(404, { ok: false, error: 'server' });
  }

  return null;
}
