import { TierGuard } from '@/components/auth/TierGuard'

export default function IntentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <TierGuard requiredTier={2} fallbackPath="/dashboard">
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white px-6 py-4">
          <p className="text-sm text-gray-500">Intent (placeholder S1)</p>
        </div>
        <main>{children}</main>
      </div>
    </TierGuard>
  )
}
