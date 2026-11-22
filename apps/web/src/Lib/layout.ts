export const isHome = (pathname: string) => pathname === '/'

// On home, an in-page anchor keeps the query string; elsewhere go to the home page's section.
export const sectionHref = (pathname: string, id: string) => (isHome(pathname) ? `#${id}` : `/#${id}`)

let scrolled = false

// Client-rendered page: the browser's own hash scroll finds nothing, so scroll once after first render.
// Runs once per page load (StrictMode double effects) and ignores empty, unknown or malformed hashes.
export function scrollToHashOnce(hash: string, doc: Pick<Document, 'getElementById'> = document) {
  if (scrolled) return
  scrolled = true
  let id: string
  try { id = decodeURIComponent(hash.slice(1)) } catch { return }
  if (id) doc.getElementById(id)?.scrollIntoView()
}

export const resetScrollOnceForTest = () => { scrolled = false }
