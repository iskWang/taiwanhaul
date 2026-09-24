// Vendor-neutral tracking helper. UI code calls track(); vendors (GA, a Grafana
// collector, …) plug in later via addAnalyticsSink() without touching the UI.
//
// Privacy: callers pass coarse properties (lengths, counts, codes), never raw
// search text or contact-form content.

const sinks = new Set();

/** Register a sink: (event) => void. Returns an unsubscribe function. */
export function addAnalyticsSink(sink) {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

/** @param {string} name  snake_case event name, e.g. "search_submitted" */
export function track(name, props = {}) {
  const event = { name, props, ts: Date.now() };
  for (const sink of sinks) {
    try {
      sink(event);
    } catch {
      // A broken sink must never break the page.
    }
  }
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('taiwanhaul:track', { detail: event }));
  }
}
