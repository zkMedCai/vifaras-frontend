import { AppSectionShell } from '@/components/shared/app-section-shell'

export default function NegotiationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSectionShell active="negotiations" label="Negoziati" requiredTier={1}>
      {children}
    </AppSectionShell>
  )
}
