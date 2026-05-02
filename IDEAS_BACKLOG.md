# Vifaras Frontend — Ideas & Backlog

Parking lot di scope creep, decisioni rinviate, e blocker schedulati.

---

## Blockers (must resolve before specific milestone)

### Pre-V1 launch security review

**Trigger**: blocker per primo deploy pubblico.

**Background**: 5 CVE su `next@14.2.35`, 1 CVE su `postcss<8.5.10`, 1 CVE su `glob` via `@next/eslint-plugin-next` transitive. Categorizzazione completa in `PROGRESS.md` entry [10.0.1] e [10.0.2]:

- 4/5 Next CVE in codepath non usati (image optimizer, rewrites): non rilevanti se manteniamo no `next/image` + no rewrites
- 1/5 Next CVE (RSC DoS) attivo a runtime: rilevante in prod, irrilevante in dev locale single-user
- 1 postcss CVE dev-tooling-only: non rilevante in nessun deploy
- 1 glob CLI command injection (GHSA-5j98-mcp5-4vw2): dev-tooling only, no exposure (`glob` usato come library da `@next/eslint-plugin-next`, non come CLI con `-c`)

**Decision tree pre-launch**:

1. Major upgrade Next 14 → 15/16 con migration plan dedicato (vedi entry "Next major upgrade")
2. Deploy via Vercel-managed (alcuni advisory dicono "self-hosted only" — verificare quali)
3. Backport patch noi stessi se Vercel non rilascia 14.2.36 (improbabile, Next team ha chiuso linea 14)

**Action quando si arriverà al deploy**: rivedere advisory list, scegliere opzione 1/2/3, eseguire prima di esporre pubblicamente.

### `@simplewebauthn/types` deprecazione (verifica V0.5+)

**Trigger**: pre-V1 launch o quando emerge bug correlato.

**Background**: `@simplewebauthn/browser@11` tira `@simplewebauthn/types@11` come transitive dep. Il pacchetto `/types` è marcato deprecato dall'autore (npm WARN al install time). `/browser@11` continua a funzionare normalmente.

**Cause possibili**:

1. `/browser@12` esiste e ha consolidato i types internamente → valutare bump major
2. Maintainer lascerà v11 deprecato senza fix → conviviamo
3. Patch v11.x futura rimuoverà transitive → aggiornamento minor risolve

**Action quando si arriverà**:

- Verificare release notes `@simplewebauthn/browser@12`
- Test bump in branch dedicato + regression test su signup/login/mandate signing/step-up
- NON bumpare durante implementation di nuovi flow auth — cambiare versione major mid-feature è source di bug subtli

**Decision trigger**: pre-launch alpha o quando emerge bug WebAuthn riconducibile a v11.

---

## V0.5+ Enhancements

### Backend `/api/users/me` endpoint

**Trigger**: quando il frontend avrà bisogno di fetch user state oltre email + id (es. tier corrente, mandate status, daily caps remaining).

**Background**: V0 dashboard mostra "Hello {email}" usando email salvata da form signup/login. `TokenResponse` backend ritorna solo `user_id`, nessun endpoint per fetch profile. Verificato in [10.0.5.0] discovery — la lista path OpenAPI non include `/api/users/me` né analoghi.

**Effort backend**: ~30 min, endpoint protected che ritorna `User` object (id, email, tier, ecc.).

**Effort frontend**:

- Aggiungi `api.getMe()` method in `src/lib/api-client.ts`
- Use in `dashboard/page.tsx` mount → refresh user state al login
- Eventualmente espandi `User` interface in `src/lib/auth-store.ts` con campi nuovi (tier, ecc.)

**NB**: nel frattempo V0 funziona perché email è già known dal form input. Quando arriverà necessità di mostrare tier corrente o daily caps, scatta il trigger.

### Next major upgrade (14 → 15 o 16)

**Trigger condizionale**:

- Libreria essenziale richiede React 19, oppure
- Patch sicurezza disponibile solo su Next 15+, oppure
- Pre-launch security review (vedi blocker sopra)

**Migration scope**:

- React 19 codemod (useActionState, forwardRef deprecato, ecc.)
- Server Actions migration review
- Cache primitives review
- Regression test su tutto auth flow + WebAuthn + intent flow
- ESLint 9 migration (flat config breaking): `eslint-config-next@15+` supporta ESLint 9 nativo
- Tooling refresh: rimozione deprecation chain (`@humanwhocodes/*` → `@eslint/*`, `inflight`, `rimraf`, `glob` legacy) — risolto automaticamente con ESLint 9
- Node 20+ requirement diventa hard (alcune deps lo richiedono già — Node 20 LTS già adottato in [10.0.2] via nvm)

**Effort**: 2-3 giorni dedicati, NON smuggle dentro altre task.

### Design system selection (V0.5+ enhancement)

**Status**: V0 hand-rolls componenti UI minimali (Button, Input, Label, Card, Alert) con Tailwind 3 + clsx + tailwind-merge. Niente shadcn/Radix/Base UI integrati.

**Razionale per hand-roll in V0**:

- 5 componenti V0 sono basici, hand-roll = 30 min totali
- shadcn ecosystem in transizione 2025-2026: v0.9 deprecato, v0.9.5 neutered (stub redirect-only), v4 incompatibile con TW3 fresh init
- Evitato accumulo major bump (TW3→4, React 18→19, ESLint 8→9, Next 14→15) durante phase auth-critical
- Quattro correzioni di strategia shadcn in 24 ore in [10.0.2] → segnale che ecosystem non è stabile per V0 pinning

**Trigger per design system selection**:

1. Design direction decisa (post-FASE 7 backend, pre-launch alpha)
2. Necessità di componenti complessi (combobox, multi-select, date picker, ecc.) emerge in FASE 10.x successive
3. Pre-launch alpha quando UI polish diventa priority

**Decisioni da prendere quando arriverà**:

- shadcn v4 + Tailwind 4 + React 19 (richiede major upgrade di tutto stack — coordinato con Next major upgrade)
- shadcn v4 + Tailwind 4 (no React 19 se non necessario per altre librerie)
- Design system custom da scratch (se brand richiede aesthetic molto specifico non coperto da preset shadcn)
- Alternative emergenti (Park UI, Tremor, ecc.)

**Migration scope quando arriverà**:

- Re-init con preset/base scelti
- Sostituzione componenti hand-rolled (Button, Input, Label, Card, Alert) con shadcn equivalent
- Eventuale refactor di styling se hand-roll era stato fatto con classi diverse da shadcn convention

**Razionale per hand-roll preservato post-migration**: i componenti hand-rolled sono pochi e semplici. Sostituirli con shadcn è 1-2 ore di lavoro. Niente lock-in tecnico.

### Frontend test infrastructure setup (V0.5+ pre-launch CRITICAL)

**Trigger**: pre-launch alpha esterno o scope feature crescente.

**Background**: V0 frontend FASE 10.0 + 10.1.x è "smoke verify only" — niente vitest/jest, niente React Testing Library, niente `__tests__/` directory. Acceptance gate corrente: `npm run lint && npx tsc --noEmit && npm run format:check` + manual smoke verify.

V0 acceptable per founder-solo dev velocity. Pre-launch alpha esterno richiede automated regression coverage.

**Action V0.5+**:

- Install `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event`
- Configure `vitest.config.ts` con jsdom environment
- Setup `__tests__/` directory + test groups: jwt-decode helpers, store actions (auth + mandate), component rendering (TierGuard, MandateSlider), mutation flow integration (useCreateDraft, useSubmitMandate)
- npm script `test` + `test:watch`
- CI integration (GitHub Actions equivalent)

**Test-deferred files accumulati FASE 10.1.x**: `jwt-decode-helper.ts`, `auth-store.ts` (atomic setAccessToken), `use-auth-hydrated.ts`, `mandate-store.ts`, `mandate-steps.ts`, `MandateSlider.tsx`, all 8 `/onboarding/mandate/*` routes, `mandate-queries.ts` (useCreateDraft + useSubmitMandate), `agent-queries.ts` (useAgentsMine + useFirstPendingMandateAgent), `webauthn.ts` (signMandateWithPasskey), `TierGuard.tsx`, sign screen error mapping (8 paths).

**Effort**: 4-6 ore (setup infra + 10-15 test foundational + CI wire).

### Backend status field Literal narrowing (V0.5+ refinement)

**Trigger**: V0.5+ pre-launch type safety pass.

**Background**: V0 backend schema declared `status: str` con doc comment. OpenAPI schema dichiara generic `string`, frontend riceve `string` invece di union narrow. Lost type safety cross-stack. Esempio concreto: `agent.status` enum reale è `pending_mandate | active | paused | revoked` ma frontend la legge come generic string (vedi `agent-queries.useFirstPendingMandateAgent` filter via string literal comparison senza exhaustive switch protection).

**Action V0.5+**:

- Pydantic schema: `agents.status`, `mandates.status`, `deals.status`, ecc. annotare con `Literal[...]`
- Re-generate `api-types.ts`
- Frontend rivede exhaustive switch coverage dove rilevante

**Effort**: 2-3 ore (audit fields + refactor + test backend).

### Backend Pydantic PayloadSummary typed model (V0.5+ refinement)

**Trigger**: V0.5+ pre-launch type safety pass.

**Background**: V0 backend `payload_summary` campo è `dict[str, Any]` generic. OpenAPI auto-gen → frontend `{[key: string]: unknown}`. Frontend type cast esplicit per accesso narrow (vedi `summary/page.tsx` unwrap `human_readable` field). Stesso pattern per `next_step` field in `SubmitResponse`.

**Action V0.5+**:

- Pydantic schema: `class PayloadSummary(BaseModel)` con fields `human_readable: str`, `key_fields: list[KeyField]`. Stesso approccio per `next_step` se utilizzato frontend.
- Refactor `_build_payload_summary` per ritornare typed model
- Re-generate `api-types.ts`
- Frontend rimuove type cast → narrow type cross-stack

**Effort**: 1-2 ore (schema refactor + test + frontend cleanup).

### mandate-store categoriesAllowed cleanup (V0.5+ refinement)

**Trigger**: V0.5+ se categories rimangono server-resolved.

**Background**: [10.1.1.5.7] discovery rivelato che `DraftConstraintsInput` non ha `categories_allowed` field — server-side resolved via `V0_DEFAULT_CATEGORIES_ALLOWED = ("*",)` in `platform_limits.py`. Frontend `mandate-store.ts` ha `categoriesAllowed: ['*']` field cosmetico (niente lo legge per API request — vedi `summary/page.tsx` handleConfirm body construction).

**Action V0.5+**:

- Decisione: categories user-selectable (UI) vs server-resolved permanente
- Se UI: aggiungi field a `DraftConstraintsInput` backend + UI checkbox in categories screen + store field becomes used
- Se server-resolved permanente: rimuovi field da store + simplify categories screen narrative

**Effort**: dipende da path (5 min cleanup vs 4-6h UI implementation).

### AuthBootstrap UX feedback su refresh 401 (V0.5+ refinement)

**Trigger**: V0.5+ pre-launch UX polish.

**Background**: V0 [10.1.1 S2 calibrazione] `AuthBootstrap` su refresh 401 fa silent skip + `console.warn`. User continua session con access_token corrente fino a expiry naturale. Niente UX feedback di "refresh fallito". Pattern healthy V0 (niente kick-out aggressivo durante backend restart o JWT secret rotation), ma utente non sa che la sessione è vicino expiry.

**Action V0.5+**:

- Toast non-blocking "Sessione di lunga durata scaduta, accesso continuo fino a expiry"
- Optional: trigger logout proactively quando access_token expire detected via JWT `exp` claim
- Optional: retry refresh flow at intervals (exponential backoff)
- Optional: distinguish session-genuinely-invalid (logout) vs transient-401 (skip)

**Effort**: 1-2 ore (toast component se non esiste + AuthBootstrap conditional + access_token expiry check).

### WebAuthn rpId env var configuration cross-deploy (V0.5+ pre-launch)

**Trigger**: pre-launch deploy non-localhost.

**Background**: V0 [10.1.1.7.1] `signMandateWithPasskey` usa browser default `rpId` (current hostname). Funziona localhost dev. Prod deploy richiede:

- Backend `webauthn_rp_id` env var = production domain (e.g., `vifaras.com`)
- Frontend opzionale `rpId` esplicit nel `optionsJSON` (preferred per consistency)
- Mismatch backend rpId vs frontend → WebAuthn verification fail silenzioso

**Action V0.5+**:

- Frontend `signMandateWithPasskey` legge rpId da `NEXT_PUBLIC_WEBAUTHN_RP_ID` env var
- Documenta deploy checklist match backend `WEBAUTHN_RP_ID` ↔ frontend `NEXT_PUBLIC_WEBAUTHN_RP_ID`
- Sub-task del deploy preparation (Vercel / Fly.io / equivalent)

**Effort**: 30 min (env var read + optionsJSON pass + documentation).

### Backend test infra Settings cache vs .env override (V0.5+ pre-launch CI)

**Trigger**: V0.5+ pre-launch CI setup OR scope feature crescente con DB-mutating tests.

**Background**: V0 [10.1.1.7.6 smoke verify follow-up] discovery rivelato che `pydantic-settings` cache configurazione al module-import time. Backend `testcontainers` fixture imposta `os.environ["POSTGRES_HOST"]` post-container-start, ma `Settings` cache non si rigenera. Tutti backend test hittano dev DB (`POSTGRES_HOST=localhost` da `.env`), non il testcontainer.

Verification: con override `POSTGRES_HOST=nonexistent POSTGRES_PORT=99999` esplicito al pytest invocation, errore `invalid port number: 99999` confermando che fixture env override viene IGNORATO.

V0 acceptable workaround:

- Per-test transaction rollback funziona normalmente (qualunque connection)
- Most test query con `user_id` filter (niente global pollution detection)
- Founder-solo dev, niente CI parallel, dev DB normalmente clean

V0 risk noto:

- Smoke verify residue su dev DB → test con query globali (no `user_id` filter) failures
- Sample: `test_submit_with_invalid_signature_fails` ha `select(Mandate)` global, polluted da smoke verify [10.1.1.7.6]
- Mitigazione manuale: cleanup dev DB post-smoke-verify

**Action V0.5+ pre-launch CI**:

- `pytest-env` package per env override pre-import (vs post-import via fixture)
- O alternative: `Settings` cache invalidation pattern via dependency_override pre-test
- O alternative: separate `.env.test` con `POSTGRES_HOST=test-container` e auto-loading via `pytest-dotenv`
- Test audit: convert all global queries (no `user_id` filter) a user-scoped per niente pollution risk
- CI integration con Postgres testcontainer + env vars correctly propagated

**Effort**: 2-3 ore (env override fix + test audit global queries + CI wire).

### Backend test_mandate_verifier timezone boundary bugs (V0.5+ pre-launch)

**Trigger**: V0.5+ pre-launch CI o quando bug surfaces frequently.

**Background**: V0 [10.1.1.7.8 follow-up smoke verify] discovery rivelato 4 test in `test_mandate_verifier.py` che falliscono solo durante timezone boundary window (local time post-midnight ma UTC ancora previous day):

- `test_daily_volume_cap_exceeded_raises`
- `test_deals_count_cap_per_day_exceeded`
- `test_counters_reset_on_new_day`
- `test_counters_not_reset_same_day`

Root cause:

- Verifier service scrive `last_reset_date` via `datetime.utcnow()` (UTC date)
- Test asserts `mandate.last_reset_date.date() == date.today()` (local date)
- Mismatch durante CET/CEST offset window (local midnight → UTC midnight = 1-2h gap)

V0 acceptable workaround:

- Bug transient, surfaces solo late-night session (CEST: ~00:00-02:00 local)
- Tests passano durante daytime (UTC date == local date)
- Founder-solo dev, niente CI parallel, niente blocking
- Già coperto da pre-existing IDEAS_BACKLOG entry "TZ-naive datetime audit V0.5+" (FASE 7.4 catalogata)

**Action V0.5+ pre-launch**:

- Refactor verifier `last_reset_date` per usare un helper `utc_today()` consistentemente
- O alternative: refactor test assertions a usare `datetime.utcnow().date()` invece di `date.today()`
- Audit known callsites: `mandate_verifier.py` (counter reset logic), `agent_scheduler._today_utc`
- Test deterministic via `freezegun` o time mocking

**Effort**: 2-3 ore (audit + fix + test deterministic).

**Cross-reference**: questa entry è specifica manifestation del bug catalogato in pre-existing entry "TZ-naive datetime audit (V0.5+ pre-launch)" da FASE 7.4 IDEAS_BACKLOG (backend repo).
