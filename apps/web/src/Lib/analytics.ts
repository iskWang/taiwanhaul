// Vendor-neutral tracking helper. UI code calls track(); vendors (GA, a Grafana
// collector, …) plug in later via addAnalyticsSink() without touching the UI.
//
// Privacy: callers pass coarse properties (lengths, counts, codes), never raw
// search text or contact-form content.

type AnalyticsEvent = { name: string; props: Record<string, string | number | boolean | null>; ts: number }
type AnalyticsSink = (event: AnalyticsEvent) => void
const sinks = new Set<AnalyticsSink>();

/** Register a sink: (event) => void. Returns an unsubscribe function. */
export function addAnalyticsSink(sink: AnalyticsSink): () => boolean {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

/** @param {string} name  snake_case event name, e.g. "search_submitted" */
export function track(name: string, props: AnalyticsEvent['props'] = {}): void {
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
