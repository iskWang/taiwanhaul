// Only /api/* requests and the daily FX cron run here; other paths are static assets.
import { EmailMessage } from 'cloudflare:email';
import searchWorker from '../../search-api/build/worker.mjs'; // Go/WASM Search API, built by `bun run build`
import { route } from './router.ts';
import { scheduled, type BackgroundContext, type FxEnv } from './fx.ts';
import type { Env as ContactEnv } from './handle-contact.ts';

type Env = ContactEnv & FxEnv & { ASSETS?: { fetch(request: Request): Promise<Response> } };
export default {
  scheduled,
  async fetch(request: Request, env: Env, ctx: BackgroundContext): Promise<Response> {
    // The Search API only gets the D1 binding, not the contact secrets or SEND_EMAIL.
    const search = (req: Request): Promise<Response> => searchWorker.fetch(req, { DB: env.DB }, ctx);
    const response = await route(request, env, { fetchImpl: fetch, EmailMessageCtor: EmailMessage, search, ctx });
    if (response) return response;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
