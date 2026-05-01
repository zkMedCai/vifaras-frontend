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
