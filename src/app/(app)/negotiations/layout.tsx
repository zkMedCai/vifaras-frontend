import { TierGuard } from '@/components/auth/TierGuard'
import Link from 'next/link'

export default function NegotiationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <TierGuard requiredTier={1} fallbackPath="/dashboard">
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Negoziati</p>
            <nav className="flex gap-4 text-sm">
              <Link className="text-gray-600 hover:text-blue-700" href="/intents">
                Intent
              </Link>
              <Link className="text-gray-600 hover:text-blue-700" href="/matches">
                Match
              </Link>
              <Link className="font-medium text-blue-700" href="/negotiations">
                Negoziati
              </Link>
            </nav>
          </div>
        </div>
        <main>{children}</main>
      </div>
    </TierGuard>
  )
}
