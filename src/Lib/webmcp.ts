// WebMCP: expose the page's capabilities as tools to in-browser AI agents via
// navigator.modelContext (W3C Web Machine Learning CG draft, experimental).
// Progressive enhancement only: without the API this module does nothing.
// All spec-specific calls live in this file so spec changes stay contained.

type WebMcpApi = {
  locales: string[]
  markets: string[]
  topics: string[]
  search(query: string, options: { market?: string }): Promise<object>
  listFeatured(): Promise<object[]>
  setPreferences(preferences: { locale?: string; market?: string }): object
  getPreferences(): object
  openContactForm(prefill: { topic?: string; message?: string }): void
}
type ToolArgs = Record<string, unknown>
type WebMcpTool = { name: string; execute(args?: unknown): Promise<unknown> }
type ModelContext = {
  provideContext?: (context: { tools: WebMcpTool[] }) => void
  registerTool?: (tool: WebMcpTool) => void
  unregisterTool?: (name: string) => void
}
type NavigatorWithModelContext = { modelContext?: ModelContext }
function textResult(data: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
function errorResult(message: string) {
  return { content: [{ type: 'text', text: message }], isError: true }
}

function errorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const detail = error as { code?: unknown; message?: unknown }
    if (detail.code != null) return String(detail.code)
    if (detail.message != null) return String(detail.message)
  }
  return error == null ? 'unknown error' : String(error)
}
function argsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

/**
 * Build tool definitions over the app API. Tools reuse exactly the functions
 * the UI uses; they never bypass validation or submit forms on the visitor's behalf.
 *
 * @param {Object} api
 * @param {(query: string, opts: { market?: string }) => Promise<object>} api.search
 * @param {(section: string, opts: { market?: string }) => Promise<object[]>} api.listFeatured
 * @param {(prefs: { locale?: string, market?: string }) => object} api.setPreferences
 * @param {() => object} api.getPreferences
 * @param {(prefill: { topic?: string, message?: string }) => void} api.openContactForm
 * @param {string[]} api.locales
 * @param {string[]} api.markets
 * @param {string[]} api.topics
 */
export function buildTools(api: WebMcpApi) {
  return [
    {
      name: 'search_taiwan_products',
      description:
        'Search products sold in Taiwan. Accepts queries in any language (e.g. English, Thai, Vietnamese, Chinese); ' +
        'the site maps them to Chinese shopping terms. Results show on the page and are returned with TWD prices ' +
        'and an approximate price in the visitor market currency. Currently backed by sample data.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What the visitor is looking for.', maxLength: 200 },
          market: { type: 'string', enum: api.markets, description: 'Visitor home market for price conversion.' },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      async execute(args: unknown = {}) {
        const { query, market } = argsRecord(args)
        try {
          return textResult(await api.search(String(query ?? ''), { market: typeof market === 'string' ? market : undefined }))
        } catch (err) {
          return errorResult(`Search failed: ${errorText(err)}`)
        }
      },
    },
    {
      name: 'list_featured_products',
      description: 'List curated homepage products for reference. Prices are not included.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        try {
          return textResult(await api.listFeatured())
        } catch (err) {
          return errorResult(String(err instanceof Error ? err.message : err))
        }
      },
    },
    {
      name: 'set_preferences',
      description: 'Change the page language and/or the visitor market used for price comparisons. Returns the active preferences.',
      inputSchema: {
        type: 'object',
        properties: {
          locale: { type: 'string', enum: api.locales },
          market: { type: 'string', enum: api.markets },
        },
      },
      async execute(prefs: { locale?: string; market?: string } = {}) {
        return textResult(api.setPreferences(prefs))
      },
    },
    {
      name: 'open_contact_form',
      description:
        'Open the contact form for the visitor, optionally pre-filled. The visitor reviews and submits it themselves; ' +
        'this tool never sends a message.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', enum: api.topics },
          message: { type: 'string', maxLength: 2000 },
        },
      },
      async execute(prefill: { topic?: string; message?: string } = {}) {
        api.openContactForm(prefill)
        return textResult({ opened: true, preferences: api.getPreferences() })
      },
    },
  ];
}

/** Register tools if the browser supports WebMCP. Returns true when registered. */
export function registerWebMcp(api: WebMcpApi, nav: NavigatorWithModelContext | undefined = globalThis.navigator as Navigator & NavigatorWithModelContext): boolean {
  const modelContext = nav?.modelContext
  if (!modelContext) return false
  const tools = buildTools(api)
  try {
    if (typeof modelContext.provideContext === 'function') {
      modelContext.provideContext({ tools })
      return true
    }
    if (typeof modelContext.registerTool === 'function') {
      for (const tool of tools) modelContext.registerTool(tool)
      return true
    }
    return false
  } catch (err) {
    console.warn('[TaiwanHaul] WebMCP registration failed', err)
    return false
  }
}

export function unregisterWebMcp(nav: NavigatorWithModelContext | undefined = globalThis.navigator as Navigator & NavigatorWithModelContext): void {
  const modelContext = nav?.modelContext
  if (typeof modelContext?.provideContext === 'function') modelContext.provideContext({ tools: [] })
  else if (typeof modelContext?.unregisterTool === 'function') {
    for (const name of ['search_taiwan_products', 'list_featured_products', 'set_preferences', 'open_contact_form']) modelContext.unregisterTool(name)
  }
}
