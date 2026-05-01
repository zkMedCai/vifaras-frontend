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

---

## [10.0.3] API client + health banner

**Date**: 2026-05-01

**Done**:

### Sub-task 1 — verify HealthResponse type shape

- Esplorato `src/lib/api-types.ts` (auto-gen da OpenAPI):
  - `paths["/api/health"]["get"]` → `operations["api_health_api_health_get"]` → `responses[200].content["application/json"]` = `components["schemas"]["HealthResponse"]`
  - `HealthResponse` shape: `status, service, version, env, timestamp, checks` (tutti required)
  - `HealthChecks` shape: `database, agent_scheduler` (string), `last_successful_tick?: string|null`, `today_cost_usd, daily_cap_remaining_usd` (number)
- 3 status canonici documentati nel backend: `healthy` / `degraded` / `unhealthy`
- Live curl confermato match

### Sub-task 2 — `src/lib/api-client.ts`

- `request<T>(path, options)` low-level fetch wrapper con error → `ApiError(statusCode, body)` typed exception
- `JsonResponse<P, M>` helper conditional-infer per estrarre il response body type da `paths` (OpenAPI-generated). Riusabile per future endpoints.
- `api.health()` typed method che ritorna `Promise<HealthResponse>`
- `credentials: 'include'` default globale (signup/login future-ready, CORS `allow_credentials=true` in [7.0])
- `.catch(() => null)` defensive su `response.text()` fallback per evitare error masking

### Sub-task 3 — `src/app/providers.tsx`

- Client component (`'use client'`) con `QueryClientProvider`
- `useState(() => new QueryClient(...))` lazy init — fresh instance per render lifecycle (no SSR data leak cross-request)
- 3 default options: `staleTime: 30_000`, `refetchOnWindowFocus: false`, `retry: 1`
- Niente extra (no devtools, no mutations defaults, no global select)

### Sub-task 4 — `src/app/layout.tsx` update

- Metadata: `Vifaras` + `A marketplace where AI agents negotiate for humans`
- Wrap children con `<Providers>`, `<HealthBanner />` mounted sopra `{children}`
- Geist font local mantenuto (già scaricato, peso zero, decisione typography deferita a [10.0.4])
- Signature semplificata da `Readonly<{children}>` a `{children}` (verbose-no-op)
- Pattern Opzione A: import `HealthBanner` commentato in sub-task 4, sbloccato in sub-task 5 — type-check verde a ogni stop intermedio

### Sub-task 5 — `src/components/shared/health-banner.tsx`

- Loading state: `Connecting to backend...` (slate-100)
- Error state: `⚠ Backend offline` o `⚠ Backend error (NNN)` se `ApiError` (red-50)
- Success state: extracted `<HealthBannerSuccess>` sub-component, riceve `HealthResponse` non-nullable (cleaner typing, easier extend)
- `statusStyles` map (`healthy`/`degraded`/`unhealthy` → green/amber/red) + `isKnownStatus` type guard con fallback a `unhealthy` per status string sconosciuti
- Detail line: `(DB: <value> · scheduler: <value>)` — agent_scheduler signal utile per debugging in dev
- Polling: `refetchInterval: 30_000`, `retry: false`
- Dev server smoke test: HTTP 200, banner SSR loading state visibile in HTML, CORS preflight verde, hot reload funzionante

### Sub-task 6 — final checks

- `npm run lint` ✓
- `npx tsc --noEmit` ✓ (promosso a check standard d'ora in poi, salvato come feedback memory cross-session)
- `npm run format:check` ✓

**Calibrazioni vs brief originale**:

- **Status mapping a 3 livelli** invece di 2 colori (verde/amber). Riusa il vocabolario canonico del backend (`healthy`/`degraded`/`unhealthy`) — più informativo, più estendibile.
- **`data.checks` guard rimosso** — required nello schema, guard "just in case" maschera future breaking change. Pattern: fidati dei tipi generati.
- **Detail line include `agent_scheduler`** — segnale utile in dev quando passerà da `disabled` a `running` post-[10.0.5+]. `today_cost_usd` e `daily_cap_remaining_usd` omessi (noise per V0).
- **`HealthBannerSuccess` extracted** — non nel brief. Tipizzazione cleaner (`HealthResponse` non-nullable), separazione fetch-state/render-logic, easier extend (es. warning quando cost > 80% cap).
- **`isKnownStatus` type guard** invece di cast forzato — fallback grazioso a `unhealthy` se backend aggiungerà `maintenance` future.

**Stack additions**:

- `@tanstack/react-query` ora effettivamente in uso (era installato ma non wired)
- `cn` helper di `src/lib/utils.ts` ora in uso (prima dormiva)
- Path 4 hand-roll funziona pulito su componente real-world primo sample

**Verifiche end-to-end**:

- Backend `/api/health` risponde 200 con `{"status":"healthy","checks":{"database":"healthy","agent_scheduler":"disabled",...}}`
- CORS preflight: `OPTIONS /api/health` con `Origin: http://localhost:3000` → 200 + `access-control-allow-origin` + `allow-credentials: true`
- Next dev server: `Ready in 2.1s`, no compilation errors
- `curl http://localhost:3000` HTTP 200, body include banner SSR loading state e meta `<title>Vifaras</title>`

**Decisioni post-[10.0.3]**:

- Banner sempre visibile (non conditional render quando verde) — più segnale durante dev
- Polling 30s (non 10s né 60s) — bilancio tra reattività e traffic
- Backend offline scenario non testato automaticamente in [10.0.3]; verrà esercitato manualmente quando serve

**Next**: [10.0.4] landing minima — `src/app/page.tsx` da default Next a Vifaras placeholder. Hero + tagline + 3 step "How it works" + CTA `/signup`+`/login` (404 expected fino a [10.0.5/6]). Stimato 1-2 ore.
