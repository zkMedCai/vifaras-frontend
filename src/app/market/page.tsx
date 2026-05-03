'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CATEGORIES, getCategoryLabel } from '@/lib/intent-categories'
import { useMarketList } from '@/lib/market-queries'
import {
  formatDateTime,
  formatEuro,
  formatSide,
  formatStatus,
  statusBadgeClass,
} from '@/lib/marketplace-format'
import type { MarketListResponse } from '@/lib/api-client'

type MarketItem = MarketListResponse['items'][number]

const SIDE_OPTIONS = [
  { label: 'Tutto', value: '' },
  { label: 'Compro', value: 'buy' },
  { label: 'Vendo', value: 'sell' },
] as const

function MarketCard({ item }: { item: MarketItem }) {
  const priceLabel = item.side === 'buy' ? 'Budget massimo' : 'Prezzo pubblico'

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                item.status,
              )}`}
            >
              {formatStatus(item.status)}
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              {formatSide(item.side)}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-gray-950">{item.title}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {getCategoryLabel(item.category)}
            {item.location ? ` · ${item.location}` : ''}
          </p>
          {item.description && (
            <p className="mt-3 line-clamp-2 text-sm text-gray-700">{item.description}</p>
          )}
        </div>

        <div className="text-sm sm:min-w-40 sm:text-right">
          <p className="text-xs text-gray-500">{priceLabel}</p>
          <p className="mt-1 text-lg font-semibold text-gray-950">
            {formatEuro(item.public_price_eur)}
          </p>
          <p className="mt-2 text-xs text-gray-500">Scade {formatDateTime(item.expires_at)}</p>
        </div>
      </div>
    </article>
  )
}

export default function MarketPage() {
  const [side, setSide] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [submittedLocation, setSubmittedLocation] = useState('')

  const params = useMemo(
    () => ({
      side: side || undefined,
      category: category || undefined,
      location: submittedLocation.trim() || undefined,
      limit: 30,
    }),
    [category, side, submittedLocation],
  )
  const { data, isLoading, error } = useMarketList(params)
  const items = data?.items ?? []

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-gray-950">
            Vifaras
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/market" className="font-medium text-blue-700">
              Market
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-blue-700">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-800"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">Market board</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Intent pubblici attivi. Le negoziazioni e i prezzi ideali restano privati.
            </p>
          </div>
          <Link
            href="/intents/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Crea intent
          </Link>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <form
            className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              setSubmittedLocation(location)
            }}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Lato</span>
              <select
                value={side}
                onChange={(event) => setSide(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {SIDE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Categoria</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Tutte</option>
                {CATEGORIES.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.labelIt}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700">Città</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Roma, IT"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>

            <button
              type="submit"
              className="self-end rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Filtra
            </button>
          </form>
        </section>

        {isLoading && <p className="text-sm text-gray-600">Caricamento market...</p>}

        {error && (
          <p className="text-sm text-red-600">Errore caricamento market. Ricarica la pagina.</p>
        )}

        {!isLoading && !error && items.length === 0 && (
          <section className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold">Nessun intent pubblico trovato</h2>
            <p className="mt-2 text-sm text-gray-600">
              Cambia filtri o crea il primo intent per popolare la bacheca.
            </p>
          </section>
        )}

        {items.length > 0 && (
          <section className="space-y-3">
            <div className="text-sm text-gray-600">
              {data?.total ?? items.length} intent pubblici
            </div>
            {items.map((item) => (
              <MarketCard key={item.intent_id} item={item} />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
