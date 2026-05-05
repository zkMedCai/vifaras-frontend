import { AppSectionShell } from '@/components/shared/app-section-shell'

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSectionShell active="matches" label="Match" requiredTier={2}>
      {children}
    </AppSectionShell>
  )
}
