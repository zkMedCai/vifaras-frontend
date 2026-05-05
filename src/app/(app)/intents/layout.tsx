import { AppSectionShell } from '@/components/shared/app-section-shell'

export default function IntentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSectionShell active="intents" label="Intent" requiredTier={2}>
      {children}
    </AppSectionShell>
  )
}
