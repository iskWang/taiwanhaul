import type { ReactNode } from 'react'

// privacy.html and terms.html are static and repeat these classes on <main>; tests/layout.test.ts keeps them in sync.
export const PAGE_CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6'

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${PAGE_CONTAINER} ${className}`}>{children}</div>
}
