'use client'

import { useEffect } from 'react'
import { useMandateStore } from '@/lib/mandate-store'

export default function MandateWelcomePage() {
  const reset = useMandateStore((s) => s.reset)

  useEffect(() => {
    reset()
  }, [reset])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome (placeholder S1)</h1>
      <p className="mt-2 text-gray-600">Implementazione UI in Session 2</p>
    </div>
  )
}
