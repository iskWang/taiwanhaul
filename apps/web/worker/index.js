// Worker entry point. wrangler.json scopes `assets.run_worker_first` to `/api/*`,
// so this only ever runs for API requests — every other path is served straight
// from static assets and never touches this file.
import { EmailMessage } from 'cloudflare:email';
import { route } from './router.js';

export default {
  async fetch(request, env) {
    const response = await route(request, env, { fetchImpl: fetch, EmailMessageCtor: EmailMessage });
    if (response) return response;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
