# Vifaras Frontend — Progress Log

Cronologia delle task FASE 10 (frontend track), una entry per commit.

---

## [10.0.1] next.js scaffold + deps install

**Date**: 2026-04-30

**Done**:
- `npx create-next-app@14 .` con flag: `--typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-npm`
- Stack confermato: Next 14.2.35, React 18, TypeScript 5, Tailwind 3.4.1
- `git branch -m master main`
- Dev server validation: `npm run dev` → :3000 → 200 con landing default
- `.claude/` aggiunto a `.gitignore` (Claude Code preferenze locali)

**npm audit decisions**:
- 5 CVE Next + 1 CVE postcss identificate
- Categorizzazione completa: vedi `IDEAS_BACKLOG.md` → "Pre-V1 launch security review"
- Per V0 dev locale: rischio pratico zero, no fix applicato
- Pre-launch: blocker, da risolvere via upgrade Next major o Vercel-managed deploy

**Stack lock conferma**:
- Next 14 (NON 15/16)
- React 18 (NON 19)
- Lock motivato da: ecosystem stability, ridurre variabili in fase auth/WebAuthn implementation
- Upgrade major rinviato a V0.5+ come task dedicata (vedi `IDEAS_BACKLOG.md`)

**Next**: [10.0.2] dependencies install (TanStack Query, Zustand, SimpleWebAuthn, Zod) + ESLint/Prettier + shadcn init.
