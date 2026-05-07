import Link from 'next/link'
import { TierGuard } from '@/components/auth/TierGuard'
import type { Tier } from '@/lib/auth-store'

const NAV_ITEMS = [
  { href: '/intents', label: 'Intent', key: 'intents' },
  { href: '/matches', label: 'Match', key: 'matches' },
  { href: '/negotiations', label: 'Negoziati', key: 'negotiations' },
  { href: '/deals', label: 'Deal', key: 'deals' },
  { href: '/capital-mandate', label: 'Mandato budget', key: 'capitalMandate' },
] as const

type NavKey = (typeof NAV_ITEMS)[number]['key']

interface AppSectionShellProps {
  active: NavKey
  children: React.ReactNode
  label: string
  requiredTier: Tier
}

export function AppSectionShell({ active, children, label, requiredTier }: AppSectionShellProps) {
  return (
    <TierGuard requiredTier={requiredTier} fallbackPath="/dashboard">
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <nav className="flex flex-wrap justify-end gap-4 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  className={
                    item.key === active
                      ? 'font-medium text-blue-700'
                      : 'text-gray-600 hover:text-blue-700'
                  }
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <main>{children}</main>
      </div>
    </TierGuard>
  )
}
