// WebMCP: expose the page's capabilities as tools to in-browser AI agents via
// navigator.modelContext (W3C Web Machine Learning CG draft, experimental).
// Progressive enhancement only: without the API this module does nothing.
// All spec-specific calls live in this file so spec changes stay contained.

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
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
export function buildTools(api) {
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
      async execute({ query, market } = {}) {
        try {
          return textResult(await api.search(query, { market }));
        } catch (err) {
          return errorResult(`Search failed: ${err?.code ?? err?.message ?? 'unknown error'}`);
        }
      },
    },
    {
      name: 'list_featured_products',
      description:
        'List curated homepage content. "cheaper" = items typically cheaper in Taiwan than in the visitor market ' +
        '(with price comparison); "must_buy" = classic Taiwan souvenirs; "recommended" = picks with tips from Taiwanese locals.',
      inputSchema: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: ['cheaper', 'must_buy', 'recommended'] },
          market: { type: 'string', enum: api.markets, description: 'Only affects the "cheaper" comparison.' },
        },
        required: ['section'],
      },
      annotations: { readOnlyHint: true },
      async execute({ section, market } = {}) {
        try {
          return textResult(await api.listFeatured(section, { market }));
        } catch (err) {
          return errorResult(String(err?.message ?? err));
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
      async execute(prefs = {}) {
        return textResult(api.setPreferences(prefs));
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
      async execute(prefill = {}) {
        api.openContactForm(prefill);
        return textResult({ opened: true, preferences: api.getPreferences() });
      },
    },
  ];
}

/** Register tools if the browser supports WebMCP. Returns true when registered. */
export function registerWebMcp(api, nav = globalThis.navigator) {
  const modelContext = nav?.modelContext;
  if (!modelContext) return false;
  const tools = buildTools(api);
  try {
    if (typeof modelContext.provideContext === 'function') {
      modelContext.provideContext({ tools });
    } else if (typeof modelContext.registerTool === 'function') {
      for (const tool of tools) modelContext.registerTool(tool);
    } else {
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[TaiwanHaul] WebMCP registration failed', err);
    return false;
  }
}
