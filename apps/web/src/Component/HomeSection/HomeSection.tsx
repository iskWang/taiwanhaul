import type { ReactNode } from 'react'
import { PageContainer } from '@/Component/PageContainer'

type Props = { id: string; title: string; subtitle?: ReactNode; children: ReactNode; className?: string; disclaimer?: ReactNode }

export function HomeSection({ id, title, subtitle, children, className = '', disclaimer }: Props) {
  return <section id={id} className={`py-14 ${className}`} aria-labelledby={`${id}-title`}><PageContainer>
    <h2 id={`${id}-title`} className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
    {subtitle && <p className="m-0 mt-2 text-brand-muted">{subtitle}</p>}
    {children}
    {disclaimer && <p className="m-0 mt-6 text-xs text-brand-muted">{disclaimer}</p>}
  </PageContainer></section>
}
