export const MANDATE_STEPS = [
  'welcome',
  'per-deal',
  'budget',
  'deals-per-day',
  'categories',
  'summary',
  'sign',
  'success',
] as const

export type MandateStep = (typeof MANDATE_STEPS)[number]

export function getNextStep(current: MandateStep): MandateStep | null {
  const idx = MANDATE_STEPS.indexOf(current)
  if (idx === -1 || idx === MANDATE_STEPS.length - 1) return null
  return MANDATE_STEPS[idx + 1]
}

export function getPrevStep(current: MandateStep): MandateStep | null {
  const idx = MANDATE_STEPS.indexOf(current)
  if (idx <= 0) return null
  return MANDATE_STEPS[idx - 1]
}

export function getStepNumber(step: MandateStep): number {
  return MANDATE_STEPS.indexOf(step) + 1
}

export function getTotalSteps(): number {
  return MANDATE_STEPS.length
}
