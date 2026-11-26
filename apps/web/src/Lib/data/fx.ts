// Daily exchange rates from /api/fx. On failure Local Estimates are hidden, never guessed.
export type Fx = { date: string; twdPerUnit: Record<string, number> }

let pending: Promise<Fx | null> | undefined
// ponytail: one fetch per page load, a failure sticks until reload; add retry if FX outages show up.
export function loadFx(): Promise<Fx | null> {
  pending ??= fetch('/api/fx').then((r) => (r.ok ? (r.json() as Promise<Fx>) : null)).catch(() => null)
  return pending
}
