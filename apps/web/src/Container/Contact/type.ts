export type ContactContextValue = {
  isOpen: boolean
  /** Open the dialog; `topic` / `message` optionally prefill the form (WebMCP). */
  open: (topic?: string, message?: string) => void
  close: () => void
  /** Internal, for ContactPresentation: bumps on every open() so the form resets each time. */
  openCount: number
  prefill: { topic?: string; message?: string }
}
