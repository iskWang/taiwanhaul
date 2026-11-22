declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string);
  }
}

declare module '*.mjs' {
  const worker: { fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> };
  export default worker;
}
