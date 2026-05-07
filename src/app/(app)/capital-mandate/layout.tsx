import { AppSectionShell } from '@/components/shared/app-section-shell'

export default function CapitalMandateLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSectionShell active="capitalMandate" label="Mandato budget 30 giorni" requiredTier={2}>
      {children}
    </AppSectionShell>
  )
}
