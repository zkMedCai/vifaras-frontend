import { AppSectionShell } from '@/components/shared/app-section-shell'

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSectionShell active="deals" label="Deal" requiredTier={2}>
      {children}
    </AppSectionShell>
  )
}
