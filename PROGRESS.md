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

---

## [10.0.2] dependencies + linting + utilities

**Date**: 2026-04-30 / 2026-05-01

**Done**:

### Sub-task 1 — runtime dependencies

- `@tanstack/react-query@^5.100.6`
- `zustand@^4.5.7` (lock 4.x, NOT 5.x)
- `@simplewebauthn/browser@^11.0.0`
- `zod@^3.25.76`

### Sub-task 2 — Node 20 upgrade

- `nvm@0.40.1` installato user-level
- Node 18.19.1 → 20.20.2 (LTS)
- `.nvmrc` creato (`20`)
- `package.json` pre/post rebuild: identical (zero major shift)
- Trigger: `openapi-typescript@7` richiede Node 20+

### Sub-task 2 — dev dependencies

- `openapi-typescript@^7.13.0`
- `eslint@^8.57.1` (NOT 9, peer dep di `eslint-config-next@14`)
- `eslint-config-next@^14.2.35` (matcha Next major)
- `prettier@^3.8.3`
- `eslint-config-prettier@^9.1.2`
- `prettier-plugin-tailwindcss@^0.6.14`

### Sub-task 3 — ESLint config

- `.eslintrc.json`: extends `next/core-web-vitals` + `prettier`
- 2 rules disabled: `react/no-unescaped-entities` (italiano + apostrofi), `@next/next/no-html-link-for-pages` (legacy Pages Router)

### Sub-task 4 — Prettier config

- `.prettierrc.json`: `semi:false`, `singleQuote`, `trailingComma:all`, `printWidth:100`, `tabWidth:2`
- `.prettierignore`: `node_modules`, `.next`, `public`, `package-lock`, `src/lib/api-types.ts`
- Initial format pass su scaffold (`page.tsx`, `layout.tsx`, `tailwind.config.ts`, `.eslintrc`, `IDEAS_BACKLOG`, `PROGRESS`) — solo formatting, zero modifica strutturale

### Sub-task 5 — design system: Path 4 (hand-rolled, no shadcn)

Storia delle 4 ricalibrazioni che hanno portato a Path 4:

1. **Brief originale** assumeva `shadcn-ui v0.9` con base color "Slate". Obsoleto.
2. **Tentativo 1**: `npx shadcn@latest init` (v4). Rivelato: `shadcn-ui` rebrandato a `shadcn` dicembre 2025, v4 ha CLI completamente nuova (preset system: nova/vega/maia/lyra/mira/luma/sera).
3. **Tentativo 2**: shadcn v4 con `--defaults` ha funzionato, MA `npm run dev` → HTTP 500 con errore "border-border class does not exist". Root cause: shadcn v4 fresh init assume Tailwind v4, mentre noi siamo su TW3.
4. **Tentativo 3**: rollback a `npx shadcn-ui@latest init` (v0.9.x frozen). Rivelato: v0.9.5 è neutered stub che redirige a shadcn v4 senza eseguire init.
5. **Decisione strategica (Path 4)**: drop shadcn da V0. Hand-roll componenti minimali on-demand quando arriveranno schermate vere.

Final state Sub-task 5:

- Installato: `clsx@^2.1.1`, `tailwind-merge@^3.5.0` (le primitive per `cn` helper)
- Creato: `src/lib/utils.ts` con `cn` helper (5 righe)
- Niente componenti UI ancora — verranno on-demand in [10.0.4]+
- HTTP 200 ✓ smoke test verde

### Sub-task 6 — env files

- `.env.local.example` con `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
- `.env.local` (gitignored) con stesso contenuto
- Next env loader test: variable letta correttamente

### Sub-task 7 — npm scripts + api:types pipeline

- Script aggiunti: `format`, `format:check`, `api:types`
- `npm run api:types` → 41 paths typed, 3436 lines, 102 KB → `src/lib/api-types.ts`
- Pipeline backend OpenAPI → frontend TypeScript funzionante end-to-end
- `src/lib/api-types.ts` aggiunto a `.gitignore` (auto-generated, regenerato on-demand) e già in `.prettierignore`

**Major decisions documented in `IDEAS_BACKLOG.md`**:

- Pre-V1 launch security review (7 CVE catalogued)
- Next major upgrade 14 → 15/16 (V0.5+ trigger condizionale, scope esteso con ESLint 9 + Node 20+ + tooling refresh)
- Design system selection (V0.5+ trigger su design direction, hand-roll approach in V0)
- `@simplewebauthn/types` deprecation (V0.5+ verifica)

**Stack lock confermato**:

- Next 14.2.35 + React 18 + Tailwind 3.4.1 + Node 20 LTS + ESLint 8 + shadcn=NONE
- Lock motivato da: ecosystem stability per fase auth-critical, evitare accumulo simultaneo di major bump

**Next**: [10.0.3] API client + health banner — primo codice applicativo che chiama backend.
