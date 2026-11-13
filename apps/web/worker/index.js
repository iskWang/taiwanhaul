// Worker entry point. wrangler.json scopes `assets.run_worker_first` to `/api/*`,
// so this only ever runs for API requests — every other path is served straight
// from static assets and never touches this file.
import { EmailMessage } from 'cloudflare:email';
import searchWorker from '../../search-api/build/worker.mjs'; // Go/WASM Search API, built by `bun run build`
import { route } from './router.js';

export default {
  async fetch(request, env, ctx) {
    // The Search API only gets the D1 binding, not the contact secrets or SEND_EMAIL.
    const search = (req) => searchWorker.fetch(req, { DB: env.DB }, ctx);
    const response = await route(request, env, { fetchImpl: fetch, EmailMessageCtor: EmailMessage, search });
    if (response) return response;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
