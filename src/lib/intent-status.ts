// Mapping backend Intent.status → UX visual representation.
// Source: backend Intent.status enum (5 values: active|matched|closed|expired|cancelled).
// Backend declares as String(20); IDEAS_BACKLOG entry "Backend status field
// Literal narrowing" tracks V0.5+ propagation to narrow union type cross-stack.

export type IntentStatus = 'active' | 'matched' | 'closed' | 'expired' | 'cancelled'

export interface StatusDisplay {
  labelIt: string
  badgeColorClass: string
}

const STATUS_DISPLAY: Record<IntentStatus, StatusDisplay> = {
  active: {
    labelIt: 'Attivo',
    badgeColorClass: 'bg-green-100 text-green-800',
  },
  matched: {
    labelIt: 'Match trovato',
    badgeColorClass: 'bg-yellow-100 text-yellow-800',
  },
  closed: {
    labelIt: 'Completato',
    badgeColorClass: 'bg-blue-100 text-blue-800',
  },
  expired: {
    labelIt: 'Scaduto',
    badgeColorClass: 'bg-gray-100 text-gray-700',
  },
  cancelled: {
    labelIt: 'Annullato',
    badgeColorClass: 'bg-red-100 text-red-800',
  },
}

export function getStatusDisplay(status: string): StatusDisplay {
  return (
    STATUS_DISPLAY[status as IntentStatus] ?? {
      labelIt: status,
      badgeColorClass: 'bg-gray-100 text-gray-700',
    }
  )
}
