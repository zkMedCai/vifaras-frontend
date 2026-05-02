'use client'

import { ReactNode } from 'react'

interface MandateSliderProps {
  label: string
  description: ReactNode
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  unit: string
}

export function MandateSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: MandateSliderProps) {
  const formatValue = (n: number): string => (unit === '€' ? `€${n}` : String(n))

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-lg font-semibold">{label}</span>
      </label>

      <div className="text-sm text-gray-600">{description}</div>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
          aria-label={label}
        />
        <div className="min-w-[100px] text-right text-2xl font-bold">{formatValue(value)}</div>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  )
}
