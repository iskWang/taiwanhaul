import type { StateBlockProps } from './type'

export function StateBlock({ icon, title, body, action }: StateBlockProps) {
  return <div className="rounded-2xl border border-dashed border-brand-line bg-white/60 px-6 py-8 text-center">
    <p className="m-0 text-3xl" aria-hidden="true">{icon}</p>
    <p className="m-0 mt-2 font-semibold">{title}</p>
    {body && <p className="m-0 mt-1 text-sm text-brand-muted">{body}</p>}
    {action && <button type="button" onClick={action.onClick} className="mt-4 rounded-full border border-brand-teal px-4 py-2 text-sm font-semibold text-brand-teal hover:bg-brand-teal hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal">{action.label}</button>}
  </div>
}

export function SkeletonCards({ count, className = 'h-40' }: { count: number; className?: string }) {
  return <>{Array.from({ length: count }, (_, index) => <div key={index} className={`${className} animate-pulse rounded-2xl border border-brand-line bg-white/70`} aria-hidden="true" />)}</>
}
