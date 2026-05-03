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

---

## [10.0.4] Landing page minima

**Date**: 2026-05-01

**Done**:

- Sostituito `src/app/page.tsx` da scaffold Next default a Vifaras placeholder (-2.6 KB nel response payload, 13.2 → 10.6 KB)
- Rimossi tutti gli asset Vercel/Next CTAs, icons, link esterni — niente immagini, niente SVG inline
- Componenti puri Tailwind 3 base, container `max-w-3xl mx-auto px-6 py-24`
- Tipografia Geist (locale, già setup in [10.0.3])

**Struttura pagina**:

1. **Hero** centrato: `<h1>Vifaras</h1>` (text-5xl font-bold), tagline principale + sub-tagline (slate-600/500)
2. **2 CTA buttons** affiancati: `<Link href="/signup">` (slate-900 pieno) + `<Link href="/login">` (border outline). Next-Link, no full-page reload
3. **Sezione "How it works"** (`mt-32`): 3 step numerati (01/02/03 in slate-400 light) + titolo + descrizione 1 riga ciascuno
4. **Footer minimale**: border-top, `Built in Italy · Private beta launching Spring 2026`

**Verifiche**:

- `npm run lint` ✓ (apostrofo non escapato `agent's` OK — `react/no-unescaped-entities` disabilitato in [10.0.2] config)
- `npx tsc --noEmit` ✓
- `npm run format:check` ✓
- `curl GET /` → HTTP 200, body include tutti i marker (Vifaras, taglines, 3 step, footer, hrefs `/signup`+`/login`)
- `curl GET /signup` → HTTP 404 ✓ (atteso, route in [10.0.5])
- `curl GET /login` → HTTP 404 ✓ (atteso, route in [10.0.6])
- Banner verde [10.0.3] continua a renderizzare in alto (root layout invariato) — visual confirmato

**Decisioni**:

- Niente sezioni FAQ/security/pricing — placeholder dev, marketing-grade differito a landing pubblica futura
- Niente animations on scroll, niente dark mode toggle — V0.5+
- Apostrofo letterale `agent's` invece di `&apos;` — più leggibile, ESLint config già permissivo per italiano + apostrofi
- `<Link>` di Next invece di `<a>` — client-side nav quando le route esisteranno

**Next**: [10.0.5] signup WebAuthn flow — primo flusso auth real, `@simplewebauthn/browser` integration. Stimato 3-5 ore (sub-task più complesso di FASE 10.0).

---

## [10.0.5] signup webauthn flow

**Date**: 2026-05-01

**Done**:

### Auth store (`src/lib/auth-store.ts`)

- Zustand con `persist` middleware (localStorage key `vifaras-auth`)
- `User` interface: `id` da `TokenResponse.user_id` + `email` da form (preservato — backend non ritorna email, no `/api/users/me`)
- Methods: `setAuth`, `logout`

### API client extension (`src/lib/api-client.ts`)

- Bearer token injection automatico via `useAuthStore.getState()` dentro `request()` (snapshot pattern, no caching)
- Auth methods typed: `signupBegin`, `signupComplete`, `loginBegin`, `loginComplete`, `refresh`
- Type helper `JsonRequest<P, M>` simmetrico a `JsonResponse<P, M>` — risparmia 5 catene `paths[X]['post']['requestBody']['content']['application/json']`
- Plain object pattern per merging headers (coerente col codice esistente, no Headers API switch)

### WebAuthn helper (`src/lib/webauthn.ts`)

- `registerNewPasskey(email)` + `loginWithPasskey(email)` (anticipato per [10.0.6] — pattern speculare, 90% codice condiviso)
- Type cast confinato `as unknown as XYZ` come ponte tra opaque API types (`Record<string, unknown>`) e tipi `@simplewebauthn`
- **Calibrazione vs brief**: import types da `@simplewebauthn/types` (NOT `/browser` come da brief originale) — package consolidation v11; `/browser` esporta solo funzioni
- `'use client'` directive come marker protettivo contro import accidentale da server component

### SignupForm (`src/components/auth/signup-form.tsx`)

- `FormState` discriminated union (`idle` / `loading` / `error`) — narrowing automatico, niente combo invalide tipo `isLoading=true && error!=null`
- `getErrorMessage()` inline (estrazione condivisa rinviata a [10.0.6] post-LoginForm — YAGNI: 401/404 sono login-only, 409 è signup-only, mismatch sub-cases)
- Error mapping: `ApiError` (409, 422, 429, 5xx) + WebAuthn (`NotAllowedError`, `InvalidStateError`, `NotSupportedError`) + network (`Failed to fetch`)

### Routes

- `src/app/(auth)/signup/page.tsx` — server component wrapper, hero + form + link a `/login`
- `src/app/(app)/dashboard/page.tsx` — client component con auth guard via `useEffect` + `router.push('/login')` se `!accessToken`
- Selector pattern Zustand consistente (`useAuthStore((s) => s.field)`) — sub solo a slice, non full state

### Cross-repo bug fix (backend)

Durante e2e test emerso: backend `WEBAUTHN_EXPECTED_ORIGIN` puntava a `http://localhost:8000` (self-reference) invece di `http://localhost:3000` (frontend). Browser invia correttamente `clientDataJSON.origin = http://localhost:3000` per spec WebAuthn (anti-phishing, non falsificabile dal client) — backend rigettava ogni `register/complete` con 401 `invalid_credential: "Unexpected client data origin"`.

Backend fix: 1 linea config `expected_origin`, 5 min. Restart uvicorn → e2e verde subito dopo.

Pattern catturato: setup split-deploy (backend `:8000` ↔ frontend `:3000`) richiede `expected_origin` puntato al **frontend** URL, non al backend stesso. Per prod sarà env var con dominio frontend pubblico.

### IDEAS_BACKLOG additions

- **Backend `/api/users/me` endpoint (V0.5+)** — trigger quando frontend avrà bisogno di tier/mandate state oltre email + id. Per V0 dashboard placeholder, email da form basta.

**End-to-end test (verificato dal founder in browser)**:

1. `/signup` form renderizza ✓
2. POST `/api/auth/register/begin` → 200 con `{options, challenge_token}` ✓
3. Windows Hello dialog → autenticazione utente ✓
4. POST `/api/auth/register/complete` → 200 con `TokenResponse` (post backend fix) ✓
5. Redirect `/dashboard`, `Hello {email}` displayed ✓
6. Refresh page → auth persiste (Zustand localStorage) ✓
7. Logout → state cleared, redirect `/` ✓

**Decisioni minor documentate**:

- Zustand selector pattern (`useAuthStore((s) => s.field)`) come convenzione per tutti i consumer
- Email da form preservata in store, non viene da backend `TokenResponse`
- `loginWithPasskey` aggiunto in [10.0.5.3] (anticipa [10.0.6])
- `getErrorMessage()` inline, refactor in `auth-errors.ts` differito a [10.0.6] quando esisterà secondo use site

**Calibrazioni aggiuntive vs brief**:

- `JsonRequest<P, M>` helper (non solo `JsonResponse`) — DRY su 5 type extractions
- `disabled:opacity-50` anche su `<input>` oltre che `<button>` — visual feedback loading-locked
- Selector pattern Zustand su dashboard invece di destructure pieno — coerenza con signup-form, idiomatic

**Next**: [10.0.6] login WebAuthn flow — riusa `loginWithPasskey` helper già in place, estrai `auth-errors.ts` shared con sub-cases per-flow. Stimato 2-3 ore (più semplice di [10.0.5] grazie a pattern consolidati).

---

## [10.0.6] login webauthn flow

**Date**: 2026-05-01

**Done**:

### Discovery preliminare

Probe `POST /api/auth/login/begin` con email non registrata → **404** code `user_not_found`. Email malformata → **422** Pydantic validation. Brief già calibrato correttamente, niente correzioni a `getLoginApiErrorMessage`.

### `auth-errors.ts` shared (composer pattern)

- **`getWebAuthnErrorMessage(err)`** shared: `NotAllowedError`, `NotSupportedError`, network (`Failed to fetch`). Ritorna `string | null` (null = "non riconosciuto, prova altro path")
- **`getSignupApiErrorMessage(err)`** flow-specific: 409 (duplicate), 422 (format), 429 (rate limit), 5xx (backend down)
- **`getLoginApiErrorMessage(err)`** flow-specific: 401 (auth failed), 404 (user not found), 422 (format), 429, 5xx
- **Composer `getSignupErrorMessage`**: prova WebAuthn shared → ApiError signup → `InvalidStateError` (signup-only: passkey già su questo authenticator) → fallback
- **Composer `getLoginErrorMessage`**: prova WebAuthn shared → ApiError login → fallback

### SignupForm refactor

- Sostituito inline `getErrorMessage()` (35 righe) con `getSignupErrorMessage` import (1 riga)
- Rimosso import `ApiError` (era usato solo dentro la funzione inline)
- File `signup-form.tsx`: 107 → 72 righe. Semantica preservata 1:1 (stesse 9 case di prima)

### LoginForm component (`src/components/auth/login-form.tsx`)

- Mirror image di SignupForm post-refactor — 90% identico
- 3 differenze flow-specific: `loginWithPasskey` (vs register), `getLoginErrorMessage` (vs signup), button label "Sign in with passkey" + loading "Authenticating..."
- Stesso `FormState` discriminated union, stesso layout/styling

### Route `src/app/(auth)/login/page.tsx`

- Server component wrapper, mirror della signup page
- CTA inversa: "Don't have an account? Sign up" → `/signup`
- `Don&apos;t` (escaped) per defensive parsing — funzionalmente identico

### End-to-end test (verificato dal founder in browser)

- Login con email già registrata → success → redirect `/dashboard` ✓
- Login con email non registrata → "No account found for this email. Try signing up." (404 mapping) ✓
- Cancel Windows Hello dialog → "Passkey was canceled or timed out." (NotAllowedError shared) ✓
- Refresh post-login persiste auth (Zustand localStorage) ✓
- Cycle completo signup → logout → login → dashboard funzionante ✓

**Decisioni**:

- Composer naming: `get{Signup,Login}ErrorMessage` come default — naming consistente, parallelo a `get{Signup,Login}ApiErrorMessage`
- `InvalidStateError` mantenuto signup-specific dentro composer — semantica diversa tra signup (failure: passkey già esiste) e login (potenziale success path implicito)
- Estrazione fatta DOPO esistenza secondo use site (LoginForm) — YAGNI rispettato, design API condiviso basato su 2 callers reali, non 1 hypothetical

**Next**: [10.0.7] dashboard polish + auth guard hardening — placeholder già 80% in place da [10.0.5.6]. Decisione open: rimane minimal (Hello + email + logout) o aggiungere skeleton sezioni (intent list, mandate status placeholder, ecc.) anticipando [10.1+]. Stimato 1-2 ore se minimal, 2-3 ore se skeleton esteso.

---

## [10.0.7] dashboard polish + auth guard hardening (minimal close)

**Date**: 2026-05-01

**Done**:

- **Hydration mismatch protection** in `src/app/(app)/dashboard/page.tsx` via combo `useAuthStore.persist.hasHydrated()` + `useAuthStore.persist.onFinishHydration()`
- Pattern: `useState(false)` iniziale → `useEffect` post-mount setta a `true` se già hydrated, altrimenti subscribe a `onFinishHydration` callback. Funziona sia con localStorage (sync) che con future IndexedDB (async)
- Render guard `!hydrated || !accessToken || !user` previene flash di `null`/`undefined` durante rehydrate
- Auth guard redirect `useEffect` aspetta `hydrated` prima di firing `router.push('/login')` — niente redirect prematuro durante boot

**Calibrazione vs brief**:

Founder proponeva 2 alternative:

- (A) `useState + useEffect` simple
- (B) `hasHydrated()` direct call in render

Implementata terza via: combo (A) scaffolding + (B) Zustand official API. Motivo: chiamata diretta `hasHydrated()` in render è SSR-unsafe (server ritorna false, client ritorna true → React hydration mismatch warning). useState scaffolding garantisce render consistente SSR/CSR. Inside useEffect uso `hasHydrated()` + `onFinishHydration()` per semantica accurate con qualsiasi storage backend.

7 righe vs 3 righe versione minimal — defensive ma corretto.

**Skipped (deferred to V0.5+)**:

- Skeleton loading states (no design direction yet — quando arriverà brand identity, framework loading + skeleton coordinati)
- Placeholder sezioni intent/mandate/deals (premature — design vincolato a shape API che arriverà in [10.1+] FASE intent flow)

**Verifiche**:

- `npm run lint` ✓
- `npx tsc --noEmit` ✓
- `npm run format:check` ✓
- `curl GET /dashboard` → HTTP 200 (server-rendered come null per unauth, idratato dopo redirect a /login se no token)

---

## FASE 10.0 — CHIUSA ✅

**7 sub-task chiuse** (2026-04-30 → 2026-05-01). Frontend foundation funzionalmente completa per V0 alpha.

### Capabilities consolidate

- **Stack lock**: Next 14.2.35 + React 18 + TypeScript 5 + Tailwind 3.4.1 + Node 20 LTS + Zustand 4.5.7 + TanStack Query 5 + SimpleWebAuthn 11
- **Pipeline OpenAPI → TypeScript types** end-to-end (`npm run api:types` → `src/lib/api-types.ts`, 41 paths typed)
- **Health banner real-time** backend connectivity con polling 30s, 3 stati (healthy/degraded/unhealthy)
- **Landing page placeholder** Vifaras (Hero + How it works + footer)
- **Signup WebAuthn flow** end-to-end: form → challenge → Windows Hello → JWT → redirect dashboard
- **Login WebAuthn flow** speculare: form → challenge → Windows Hello con credenziali esistenti → JWT → redirect
- **Auth state persistito** via Zustand localStorage (`vifaras-auth` key)
- **Auth guard** con hydration mismatch protection (no flash, no race condition redirect)
- **Error mapping centralizzato** in `auth-errors.ts` composer pattern (shared WebAuthn + flow-specific API errors)

### Architettura file finale

```
src/
├── app/
│   ├── (app)/dashboard/page.tsx       # protected, auth-guarded
│   ├── (auth)/login/page.tsx          # public route
│   ├── (auth)/signup/page.tsx         # public route
│   ├── layout.tsx                     # root + Providers + HealthBanner
│   ├── page.tsx                       # landing
│   └── providers.tsx                  # QueryClient
├── components/
│   ├── auth/login-form.tsx
│   ├── auth/signup-form.tsx
│   └── shared/health-banner.tsx
└── lib/
    ├── api-client.ts                  # fetch wrapper + Bearer auto + auth methods
    ├── api-types.ts                   # auto-gen, gitignored
    ├── auth-errors.ts                 # composer pattern
    ├── auth-store.ts                  # Zustand persist
    ├── utils.ts                       # cn helper
    └── webauthn.ts                    # registerNewPasskey + loginWithPasskey
```

### Cross-repo coordinations risolte

- **[7.0.1] WebAuthn origin fix backend** (`localhost:8000` → `localhost:3000`) — bug discovery durante e2e signup test, pattern split-deploy `expected_origin = frontend_url` documentato
- **OpenAPI live come fonte di verità** — Discovery [10.0.5.0] disambiguato 4 deviazioni vs brief mnemonico

### IDEAS_BACKLOG additions

- Pre-V1 launch security review (7 CVE catalogued)
- Next major upgrade 14 → 15/16 (V0.5+ trigger condizionale)
- Design system selection (V0.5+ post brand direction)
- `@simplewebauthn/types` deprecation (V0.5+ verifica `/browser@12` consolidation)
- Backend `/api/users/me` endpoint (V0.5+ trigger fetch user state oltre email + id)

### Next options

- **FASE 10.1+** intent flow, mandate config, deal signing — completare experience consumer V0
- **FASE 7.1-7.4 backend**: rate limiting deep, observability, cost monitoring, pre-launch checklist
- **Landing pubblica + dominio**: deploy Vercel + DNS + waitlist alpha

---

## ✅ FASE 10.1.1 — Tier 2 mandate creation flow (2026-05-02)

**Status**: Mandate creation flow end-to-end funzionante. User Tier 1 può configurare mandate, firmare biometrica, upgrade Tier 2.

### Sessions shipped

| Session | Commit                                     | Highlight                                                                        |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| S1      | `abefe86` (frontend) + `e6fa923` (backend) | Foundations: tier guard + routing + store + GET /api/agents/mine                 |
| S2      | `47c6381`                                  | UI screens 1-6 + POST /draft integration + AuthBootstrap 401-soft fix            |
| S3      | (this entry)                               | WebAuthn step-up + POST /submit + token swap + success + error mapping + closure |

### Capabilities shipped

**Authentication & state**:

- `jwt-decode` + tier propagation cross-stack
- `useAuthHydrated()` shared hook (extracted from inline dashboard logic)
- `TierGuard` component (hydration-safe + tier check + redirect)
- `AuthBootstrap` refresh-on-mount con 401-soft handling (refresh invalidato ≠ logout — preserva session su backend restart / token consumed)
- Token swap atomic post-mandate-submit (tier 1 → tier 2): `setAccessToken(new_access_token)` decoda JWT + estrae tier + merge `user.tier` insieme

**Mandate flow UI**:

- 8 routes `/onboarding/mandate/[step]` dynamic: welcome / per-deal / budget / deals-per-day / categories / summary / sign / success
- `mandateStore` Zustand transient (no persist) con defaults backend-aligned (€100/€500/3, `['*']` categories, `['IT']` geo)
- `MandateSlider` shared component (native range, accessible via `aria-label`, € prefix conditional)
- Welcome con agent fetch + reset on mount + CTA "Inizia"
- 3 sliders (per-deal, budget, deals-per-day) con range/step backend-aligned
- Categories read-only V0 con narrative italiana (forbidden umbrella alcol/armi/sostanze)
- Summary con client-side reconstruction + POST `/draft` + unwrap `payload_summary.human_readable`
- Sign con WebAuthn step-up biometric + POST `/submit` + token swap + 8 error codes mapped
- Success celebration UX (green checkmark + "Mandato attivo") + reset store

**Backend wire**:

- Nuovo endpoint `GET /api/agents/mine` (tier-1 gate, 4 test, 502 verdi)
- TanStack Query hooks: `useAgentsMine`, `useFirstPendingMandateAgent`, `useCreateDraft`, `useSubmitMandate`
- WebAuthn step-up via `@simplewebauthn/browser` con minimal optionsJSON (challenge + userVerification 'required' + timeout 60s)

**Error mapping consistency** (sign screen `mapBackendError`):

| Backend code                                       | UX italiano                                                |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `draft_expired`                                    | Sessione scaduta. Ricomincia la configurazione.            |
| `draft_not_found`                                  | Sessione persa. Ricomincia la configurazione.              |
| `draft_already_consumed`                           | Mandato già firmato. Vai alla home.                        |
| `webauthn_verification_failed`                     | Firma non riuscita. Riprova.                               |
| `limits_exceed_platform_cap`                       | Configurazione non permessa. Riprova con valori inferiori. |
| `agent_in_wrong_state` / `invalid_tier_transition` | Mandato già configurato. Vai alla home.                    |
| `NotAllowedError` (browser)                        | Firma annullata. Riprova quando sei pronto.                |
| Generic `Error`                                    | Errore tecnico. Riprova più tardi.                         |

### Backend bridge changes

- New endpoint `GET /api/agents/mine` (commit backend `e6fa923`)
- Test count backend: 498 → 502 (+4: ordering, empty, user isolation, tier-0 → 402 guard)

### Smoke verify end-to-end

User Tier 1 (SQL stub) → welcome → 5 step config → summary → POST `/draft` 200 → sign → biometric Windows Hello → POST `/submit` 200 → tier 2 swap → success → dashboard.

Verified manually on Linux WSL2 + Chrome + Windows Hello biometric:

- DB: User `ada311be-...` tier=2, Mandate `12810cca-...` status=active, Agent `a00093f1-...` status=active (era pending_mandate)
- Frontend store: `user.tier: 2` propagated correctly
- Audit log strutturato `audit.mandate_signed` persisted

### Discovery findings catturati durante FASE 10.1.1

Pattern preservato come standard: discovery batte assumption silente. Mismatch catched cross-session:

- **S1**: `CurrentUser` dataclass shape (vs `User` ORM); `Agent.status` enum 4 valori (vs doc comment 3); `agents.py` non esisteva; frontend store path `src/lib/auth-store.ts` (vs brief `src/stores/auth.ts`); test infra frontend non installata
- **S2**: `payload_summary` nested object con `human_readable` + `key_fields` (vs flat string assumption); `max_total_volume_eur_per_mandate` field name precise (vs shorthand); `categories_allowed` non in `DraftConstraintsInput` (server-resolved); api-client esistente esporta `api` object con metodi specific (vs generic `.get/.post`); flat `*-queries.ts` location (vs `lib/queries/` subdir); type aliases via `JsonResponse`/`JsonRequest` helper (vs `components['schemas']`)
- **S2 smoke verify catch**: `AuthBootstrap` 401 → logout aggressivo bug, calibrato a silent-skip + `console.warn` (refresh-on-mount è "best effort", niente kick-out durante dev workflow)
- **S3**: `@simplewebauthn/browser` `startAuthentication({optionsJSON: ...})` wrapper signature (vs flat options); backend `/draft` ritorna challenge string only, frontend constructs `PublicKeyCredentialRequestOptionsJSON` minimal; `WebAuthnAssertionPayload.rawId` camelCase preserved cross-stack; rpId omesso (browser default localhost match backend dev config); `payload_summary` cast a `{human_readable: string}` per accesso narrow

Pattern: smoke verify reale cattura bug latenti che lint+tsc+code review non vedono.

### IDEAS_BACKLOG additions (6 V0.5+ entries)

- Frontend test infrastructure setup (CRITICAL pre-launch)
- Backend status field `Literal[...]` narrowing
- Backend Pydantic `PayloadSummary` typed model
- `mandate-store` `categoriesAllowed` cleanup
- `AuthBootstrap` UX feedback su refresh 401
- WebAuthn `rpId` env var configuration cross-deploy

### Status check post-FASE 10.1.1

- ✅ Backend FASE 7 (production-grade per V0 alpha)
- ✅ Frontend FASE 10.0 (auth)
- ✅ Frontend FASE 10.1.1 (mandate creation)
- 🔲 Frontend FASE 10.1.2 (intent CRUD UI)
- 🔲 Frontend FASE 10.1.3 (match view + negotiation read-only)
- 🔲 Frontend FASE 10.1.4 (deal pending signature step-up)
- 🔲 FASE 8 V0.5+ (Self real integration deferred — SQL stub workflow per dev)

### Tag

`v0-frontend-mandate-creation`

### Next

[10.1.2] Intent CRUD UI — primo flow Tier 2 user-facing (create/list/edit/delete intent + agent inizia matching). Stima 8-12h.

---

### Follow-up [post-S3 closure 2026-05-02 → 2026-05-03 late-night]

**Backend test count investigation post-smoke-verify**

Smoke verify [10.1.1.7.6] cleanup ha rivelato 2 pre-existing test infra bugs distinti.

**Bug 1: Settings cache + dev DB pollution** (RESOLVED via cleanup)

- `pydantic-settings` cache configurazione module-import time
- testcontainers fixture env override `POSTGRES_HOST` IGNORATO post-import
- Tutti backend test hittano dev DB, NON testcontainer
- Smoke verify residue su dev DB → `test_submit_with_invalid_signature_fails` global query failure (no `user_id` filter)
- V0 mitigation: SQL cleanup dev DB residue (DELETE smoke verify mandate, agent → pending_mandate, user → tier=1) → test passes restored

**Bug 2: Timezone boundary in `test_mandate_verifier`** (TRANSIENT, V0.5+ documented)

- 4 test fail solo durante CET/CEST UTC offset window (local midnight → UTC midnight gap)
- Mixing `datetime.utcnow()` (verifier service) vs `date.today()` (test assertion)
- Tests interessati: `test_daily_volume_cap_exceeded_raises`, `test_deals_count_cap_per_day_exceeded`, `test_counters_reset_on_new_day`, `test_counters_not_reset_same_day`
- Transient: passano durante daytime quando UTC date == local date
- Già coperto da pre-existing entry "TZ-naive datetime audit (V0.5+ pre-launch)" da FASE 7.4 IDEAS_BACKLOG (backend repo); manifestazione concreta documentata qui

V0.5+ pre-launch action plans documented in IDEAS_BACKLOG (frontend repo):

- Backend test infra Settings cache vs .env override
- Backend test_mandate_verifier timezone boundary bugs

**Pattern preservato**: niente regression S3, smoke verify successful end-to-end, history granular audit-friendly. Tag `v0-frontend-mandate-creation` semanticamente corretto e immutable. Backend test count `502` confermato outside timezone boundary window (Bug 2 transient non blocking, surfaces solo late-night CEST).

**FASE 10.1.1 + follow-up audit chiuso definitive.**

---

## FASE 10.1.2 — Intent CRUD UI

Discovery-first end-to-end con 3 sub-fasi: foundations + UI screens + smoke verify (con 3 hotfix runtime calibrazioni emerse durante smoke).

### Discovery [10.1.2.0]

Backend reality discovery completed pre-implementation:

- 5 endpoints: POST /api/intents, GET /api/intents (paginated), GET /api/intents/{intent_id}, PATCH /api/intents/{intent_id}, DELETE /api/intents/{intent_id}
- Tutti tier=0 endpoint MA UX V0 target tier=2 (post-mandate)
- Caps: T0=5 active, T1=10 active, T2 reads from `mandate.max_active_intents`
- Tier=2 required SOLO per price update
- MAX_TITLE_LEN=200, MAX_DESCRIPTION_LEN=2000, MAX_DURATION_DAYS=30 (def 14), MAX_PRICE_PER_INTENT_EUR=10000
- 22 categories closed vocabulary
- Side enum: `buy`/`sell`, `trade` rejected V0
- `hard_constraints` location regex `^[^,]+,\s*[A-Z]{2}$` only validated, `soft_preferences` pure pass-through
- Status enum: `active | matched | closed | expired | cancelled`
- Embedding sync inline, 503 retry pattern
- Soft cancel cascade (negotiations cancelled + matches expired + audit log)
- 13 error codes taxonomy

Decisions S1 locked: A multi-page CRUD, B cards layout, C empty state custom + 3 esempi, D edit shows editable + read-only `hard_constraints` + warning restrictions, E delete cascade impact dialog, F two prices separated explicit (italian labels: "Prezzo target ideale" + "Prezzo min/max accettabile"), G `hard_constraints` location only V0, H `soft_preferences` SKIP V0, TierGuard requiredTier=2.

### S1 — Foundations [10.1.2.1] (commit 1b5c164)

**Files written**:
- `src/app/(app)/intents/{layout.tsx, page.tsx, new/page.tsx, [id]/edit/page.tsx}` (4 routes scaffolded)
- `src/lib/intent-store.ts` (Zustand transient, 9 fields, defaults backend-aligned)
- `src/lib/intent-categories.ts` (22 IT labels + 6 GROUPS + helpers)
- `src/lib/intent-status.ts` (5 IntentStatus + STATUS_DISPLAY tailwind + getStatusDisplay)
- `src/lib/intent-queries.ts` (5 hooks with cache invalidation)
- `src/lib/api-client.ts` extended (5 methods + 7 type aliases)

**Critical S1 catch**: backend uses `/api/intents/{intent_id}` NOT `{id}` for `JsonResponse`/`JsonRequest` type helpers. Without calibration → never type aliases.

### S2 — UI screens implementation [10.1.2.2]

#### Discovery [10.1.2.2.0] — 4 mismatch CALIBRATED

| Brief code | Calibrato realtà |
|-----------|-----------------|
| `intent.id` | `intent.intent_id` |
| `data?.items ?? []` | `data?.intents ?? []` |
| `durationDays: 30` (placeholder) | recompute `(expires_at - created_at) / 86_400_000 ms` |
| `intent.hard_constraints?.location?.split(...)` | `(intent.hard_constraints as Record<string, unknown>)?.location` cast |

#### [10.1.2.2.1] List view

`IntentCard` inline + `EmptyState` inline + 3 esempi placeholder + status badge color-coded + italian labels (Compro/Vendo) + 2 prezzi visualizzati (€{ideal} (min €{reservation})) + locale `'it-IT'` date.

#### [10.1.2.2.2] Create form

9 fields + `validateClient` module-local + `mapBackendError` (8 codes) + native HTML form + Side custom 2-button + Category select grouped + Duration range slider + dynamic reservation price label by side + reset on mount via selector pattern `useIntentStore((s) => s.reset)`.

Calibrazione: `description: string | null` (NOT `undefined`) per backend type.

#### [10.1.2.2.3] Edit form

Pre-populate via `loadFromIntent` + `useIntent(id)` + recompute `durationDays` + `hard_constraints` location read-only + conditional disabled (status !== 'active') + tier 2 guard prices + danger zone "Annulla intent" + custom modal confirmation backdrop + cascade impact warning + `cancelIntent` mutation. Mapping 11 backend errors italian.

#### [10.1.2.2.4] Smoke verify end-to-end + 3 hotfix runtime calibrazioni

**Setup pre-condizioni**:
- Re-login fresh + mandate flow reale completed (tier 1 → 2) — niente regression FASE 10.1.1
- Stop-gate intermediate verde

**Hotfix [10.1.2.2.4.1] — 401-retry interceptor** (`api-client.ts` + `auth-store.ts`)

Backend access_token TTL=15min. Frontend `request<T>()` helper niente faceva auto-refresh on 401. Mid-session token expiry → POST /api/intents 401 propagated to user → "errore tecnico riprova" UX broken.

Hotfix: `refreshAccessToken()` helper + single-flight pattern + 401-retry block in `request<T>()` (skip retry on `/api/auth/refresh` itself + `_retry` flag prevent infinite loop). Auth-store extended with `setRefreshToken` action per atomic rotation persist (backend rotation: each refresh consumes old refresh + emits new pair).

Pattern parallelo a [10.1.1.7.2] AuthBootstrap 401-soft hotfix: same problem space (refresh-token state staleness), different layer (active-request retry vs mount-time refresh).

**Hotfix [10.1.2.2.4.2] — `EMBEDDING_BACKEND=fake`** (backend `.env`)

Smoke verify revealed `OPENAI_API_KEY is empty` exception in backend embedding service (FASE 4.2 inline embedding generation in `create_intent`) → 500 Internal Server Error during POST /api/intents. CORS bypass classic FastAPI middleware order issue (500 niente carry CORS headers, browser block fetch with `net::ERR_FAILED`).

Hotfix dev workflow: `EMBEDDING_BACKEND=fake` env var (PROJECT_BRIEF 4.2 documented testing path: hash-based fake embedding deterministic). FASE 10.1.3 prerequisite: setup `OPENAI_API_KEY` platform-managed reale per match service cosine similarity test (vedi IDEAS_BACKLOG entry).

**Hotfix [10.1.2.2.4.3] — edit form omit immutable fields** (`edit/page.tsx` `handleSubmit`)

Backend `update_intent` rejecta categoricamente `category` e `side` come IMMUTABLE post-create (raise `CategoryNotModifiable` / `SideNotModifiable`, http_status=422). Frontend impl S2 [10.1.2.2.3] inviava body completo from store → 422.

Hotfix: client-side omit `category` + `side` da PATCH body. Send `reservation_price_eur` + `ideal_price_eur` SOLO if changed (avoid unnecessary tier-2 price gate triggering). PATCH partial-update semantics correct.

Pattern preserved: discovery-first niente verified backend `update_intent` field-level gating in [10.1.2.2.0]. Reviewer-pattern catch: ALWAYS verify PATCH endpoint immutability semantics field-by-field.

**Smoke verify summary** [10.1.2.2.4]:

| Step | Result |
|------|--------|
| 1 list empty state custom + 3 esempi | ✅ |
| 2-3 nav new + form fill | ✅ |
| 4 POST /api/intents | ✅ 201 (post hotfix .2) |
| 5-7 list 1 card + nav edit + pre-populate | ✅ |
| 8-9 modify title + PATCH | ✅ 200 (post hotfix .3) |
| 10-11 list update + nav edit | ✅ |
| 12-13 modal cancel + DELETE | ✅ 200 (status='cancelled' + closed_at popolato verified via GET) |
| 14-15 list cancelled + edit disabled | ✅ (warning yellow + all fields disabled + buttons disabled) |

End-to-end CRUD verified.

### IDEAS_BACKLOG additions FASE 10.1.2 (13 V0.5+ entries)

Discovery batch (8):

1. Backend categories localized labels endpoint (i18n preparation)
2. UX warning intent price > mandate cap (cross-tier guidance)
3. Backend `hard_constraints` schema typed model
4. Backend `soft_preferences` UX design pattern
5. Toast component shared cross-flow (V0.5+ UX polish)
6. Backend `duration_days` field expose (avoid client recompute drift)
7. Public deals feed: trust signal + marketing surface (V0.5+ post-launch, design originale 2026-04-29)
8. AI gateway / compliant BYOK provider pattern (V0.5+/V1+ API key or connector only; no consumer OAuth)

Hotfix-specific batch (5):

9. AuthBootstrap selective refresh-on-mount (only when access expired, V0.5+ session economy)
10. Backend FastAPI middleware order: CORS bypass on 5xx exception (custom exception handler V0.5+)
11. Backend immutable fields strict vs PATCH partial-update tolerant (V0.5+ design choice)
12. Setup `OPENAI_API_KEY` platform-managed (prerequisite FASE 10.1.3)
13. Backend `cancel_intent` `CancelIntentResponse` counters niente verified empirically (V0.5+ toast UX)

### FASE 10.1.2.5 promemoria — Conversational intake layer

USP-aligned bypass form strutturato. Memoria PROJECT_BRIEF 3.1 onboarding pattern (textarea libera "voglio vendere..." → Claude API parsing → review structured fields → submit). Effort 6-10h. Decisione Path B questa session: implementation post FASE 10.1.2 S3 closure, prima di FASE 10.1.3.

Cattura completa in IDEAS_BACKLOG separate entry.

### Status check post-FASE 10.1.2

- ✅ Backend FASE 7 (production-grade per V0 alpha)
- ✅ Frontend FASE 10.0 (auth)
- ✅ Frontend FASE 10.1.1 (mandate creation)
- ✅ Frontend FASE 10.1.2 (intent CRUD UI + 3 hotfix smoke verify)
- 🔲 Frontend FASE 10.1.2.5 (conversational intake layer — USP alignment, prossima decision-point)
- 🔲 Frontend FASE 10.1.3 (match view + negotiation read-only — prerequisite OPENAI_API_KEY platform setup)
- 🔲 Frontend FASE 10.1.4 (deal pending signature step-up)
- 🔲 FASE 8 V0.5+ (Self real integration deferred)

### Tag

`v0-frontend-intent-crud` (post bundle commit S2)

### Post-10.2 architecture correction

Discovery FASE 10.2 (2026-05-03) ha confermato Path A: V0 platform-managed AI. Vifaras usa account API propri Anthropic/OpenAI; niente Claude Pro/Max OAuth, niente ChatGPT Plus/Pro come motore marketplace. BYOK API key, connector locale e MCP pubblico sono V0.5+/V1+ solo se compliant.

Impatto frontend: non costruire Settings "Connetti Claude/OpenAI" per V0. Il copy deve dire AI inclusa con fair-use/cap, non "porta il tuo motore AI".

### Next

[10.1.2.5] Conversational intake — textarea libera + Claude API parsing. Prerequisite Anthropic API key platform-managed V0.

OR

[10.1.3] Match view + negotiation read-only — prerequisite `OPENAI_API_KEY` setup (V0 platform-managed).

Decisione founder post-tag.
