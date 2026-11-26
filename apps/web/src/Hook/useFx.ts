import { useEffect, useState } from 'react'
import { loadFx, type Fx } from '@/Lib/data/fx'

export function useFx(): Fx | null {
  const [fx, setFx] = useState<Fx | null>(null)
  useEffect(() => { void loadFx().then(setFx) }, [])
  return fx
}
