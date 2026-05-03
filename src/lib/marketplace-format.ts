export function formatEuro(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatEuroCents(value: number) {
  return formatEuro(value / 100)
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatScore(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatSide(side: string) {
  if (side === 'buy') return 'Compro'
  if (side === 'sell') return 'Vendo'
  if (side === 'trade') return 'Scambio'
  return side
}

export function formatStatus(status: string) {
  const labels: Record<string, string> = {
    active: 'Attiva',
    agreed: 'Accettata',
    cancelled: 'Annullata',
    closed: 'Chiusa',
    discovered: 'Trovata',
    expired: 'Scaduta',
    matched: 'Match trovato',
    negotiating: 'In negoziazione',
    rejected: 'Rifiutata',
  }
  return labels[status] ?? status
}

export function statusBadgeClass(status: string) {
  if (status === 'active' || status === 'negotiating') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }
  if (status === 'agreed' || status === 'matched') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'rejected' || status === 'cancelled' || status === 'expired') {
    return 'border-gray-200 bg-gray-100 text-gray-700'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

export function formatTurnType(type: string) {
  const labels: Record<string, string> = {
    accept: 'Accettazione',
    counter_offer: 'Controofferta',
    offer: 'Offerta',
    reject: 'Rifiuto',
  }
  return labels[type] ?? type
}
