// Worker entry point. wrangler.json scopes `assets.run_worker_first` to `/api/*`,
// so this only ever runs for API requests — every other path is served straight
// from static assets and never touches this file.
import { EmailMessage } from 'cloudflare:email';
import searchWorker from '../../search-api/build/worker.mjs'; // Go/WASM Search API, built by `bun run build`
import { route } from './router.js';

export default {
  async fetch(request, env, ctx) {
    // The router calls env.SEARCH.fetch; serve it in-process instead of via a service binding.
    const search = { fetch: (req) => searchWorker.fetch(req, env, ctx) };
    const response = await route(request, { ...env, SEARCH: search }, { fetchImpl: fetch, EmailMessageCtor: EmailMessage });
    if (response) return response;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
