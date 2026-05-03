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

---

### Backend categories localized labels endpoint (V0.5+ pre-launch i18n preparation)

**Trigger**: V0.5+ pre-launch quando arriva traduzione multilingua oltre italiano (Spagnolo per espansione Wallapop secondo business plan).

**Background**: V0 frontend hardcoda IT labels in `src/lib/intent-categories.ts` (22 labels + 6 GROUPS). Backend espone solo slug enum (`electronics_audio`, `sport_bicycles`, ecc.). Pattern niente scala se aggiungi paesi: serve fork frontend per ogni lingua.

**Action V0.5+**:

- Backend endpoint `GET /api/categories?lang=it` ritorna `[{slug, label, group_slug, group_label}, ...]` localized
- Frontend caches via TanStack Query, invalidates on lang change
- Rimozione hardcoded labels in `intent-categories.ts`, sostituiti da query
- Locale switching prep V0.5+ (footer language picker)

**Effort**: 3-4h (backend endpoint + frontend refactor + cache strategy).

---

### UX warning intent price > mandate cap (V0.5+ cross-tier guidance)

**Trigger**: V0.5+ pre-launch UX polish quando user feedback rivela confusione tra `mandate.max_per_deal_eur` cap e `intent.ideal_price_eur`.

**Background**: V0 niente warning frontend se user crea intent con `ideal_price_eur > mandate.max_per_deal_eur`. Risultato: agent niente potrà mai chiudere deal a quel prezzo (mandate verifier rifiuta), user confuso.

**Action V0.5+**:

- Frontend create form: dopo input prezzi, fetch `mandate.max_per_deal_eur`
- Se `ideal > cap`: warning yellow inline "Il tuo mandate consente max €{cap}/deal. L'agente potrà chiudere solo sotto questa soglia"
- CTA secondario "Aumenta cap mandate" → step-up flow per modificare mandate
- Edit form analogo

**Effort**: 4-6h (UX design + frontend integration + mandate query).

---

### Backend `hard_constraints` schema typed model (V0.5+ pre-launch)

**Trigger**: V0.5+ pre-launch quando aggiungi nuovi `hard_constraints` field oltre `location` (es. `condition`, `min_year`, `category_subtype`).

**Background**: V0 `hard_constraints` è `dict[str, Any]` Pydantic raw. Validazione solo regex su `location` field. Schema niente esposto in OpenAPI types, niente strict validation server-side.

**Action V0.5+**:

- Backend Pydantic typed model `HardConstraints`: `location: str | None`, `condition: Literal[...] | None`, eventuali altri
- Validazione strict: regex location, enum condition, etc.
- OpenAPI types auto-generate frontend type-safe
- Migration backward-compatible (existing intents con dict generico restano valid via Union type)

**Effort**: 4-6h (schema design + migration + tests).

---

### Backend `soft_preferences` UX design pattern (V0.5+ pre-launch)

**Trigger**: V0.5+ pre-launch quando aggiungi UX `soft_preferences` editing al form (V0 SKIP per scope discipline).

**Background**: V0 `soft_preferences` accetta dict generico backend, frontend SKIP completamente (niente field UI). Memoria S1 [10.1.2.2.0] decision H. Backend embedding niente usa `soft_preferences` per matching, è pure pass-through display.

**Action V0.5+**:

- UX design: chips multi-select? Free text tags? Slider weights?
- Backend schema typed model `SoftPreferences` (parallelo a hard_constraints)
- Frontend create/edit forms add field
- Match service eventualmente weights soft preferences in similarity score (FASE 10.1.3+)

**Effort**: 6-10h (UX design + schema + frontend + match integration).

---

### Toast component shared cross-flow (V0.5+ UX polish)

**Trigger**: V0.5+ pre-launch UX polish per success/error notifications consistent.

**Background**: V0 frontend niente ha toast/snackbar component. UX feedback fatto via inline error messages in form OR redirect post-action. Pattern niente uniforme cross-pages.

**Action V0.5+**:

- Implement toast component shared (es. `src/components/ui/toast.tsx`)
- Hook `useToast()` con queue + auto-dismiss + variant (success/error/info)
- Replace inline error displays nei form con toast invocations
- Use cases: intent created (success), mandate revoked (info), deal cancelled (info), errors generic

**Effort**: 4-6h (component design + hook + integration cross-pages).

---

### Backend `duration_days` field expose (V0.5+ pre-launch — avoid client recompute drift)

**Trigger**: V0.5+ pre-launch quando refactor edit form per consistency.

**Background**: V0 backend ritorna solo `expires_at` + `created_at` su `IntentResponse`. Frontend recompute `durationDays = (expires_at - created_at) / 86_400_000 ms` (memoria S2 [10.1.2.2.0] discovery calibration #3). Floating-point arithmetic potential drift edge cases (es. intent created during DST transition).

**Action V0.5+**:

- Backend `IntentResponse` add field `duration_days: int` derived server-side
- Frontend rimozione recompute, lettura diretta da response
- Backward-compatible: frontend type-safe, niente breaking change

**Effort**: 1-2h (backend schema update + frontend simplify + tests).

---

### Public deals feed: trust signal + marketing surface (V0.5+ post-launch)

**Trigger**: V0.5+ post-launch quando hai liquidità reale (100+ deal storici).

**Background**: V0 architettura backend ha deal storici in DB (FASE 5+ negotiation closure). Frontend FASE 10.1.x track focus su user-private flow (own intents, own matches, own deals). Niente surface pubblica deal completati platform-wide.

Discusso architetturalmente in design originale Vifaras (29 aprile 2026) come "Live feed del mercato" component frontend. Non implementato in V0 — incompatibile con priority "end-to-end product demo" + contesto "niente liquidità reale pre-launch".

**Compatibility checks**:

- ✅ Compatibile con Opzione X privacy (deal completati = fact storici, prezzi finali post-negotiation, niente intent attivi)
- ✅ Compatibile con GDPR (display "Roma → Milano" geo, niente nomi user)
- ✅ Compatibile con backend FASE 7 schema (deal table queryable, soft anonymization via location regex)
- ✅ Niente conflict con principle 2 "agenti niente browse" (questo è UMANO che vede storia, non agente AI in negoziazione)

**Action V0.5+ post-launch**:

- Backend endpoint `GET /api/deals/public-feed` paginated, anonymized
- Display fields: category, side (buy/sell), final_price_eur, geo (city → city), negotiation_rounds, time_ago
- Hide fields: user_id, agent_id, intent description, message content
- Frontend route `/explore` o `/feed` (loggati o pubblico, decisione UX V0.5+)
- Aggregate stats top: "Oggi: N deal · €X movimentati"
- Filter optional: category, geo

**Effort**: 6-10 ore (backend endpoint + anonymization layer + frontend page + UX polish).

**Cross-references**: design discussion 2026-04-29 (Frontend Next.js architecture). Privacy locked decision: Opzione X (transcript 2026-04-30). Trust signal pattern: Stripe homepage live counter, Booking.com social proof, Hyperliquid leaderboard.

---

### `AuthBootstrap` selective refresh-on-mount (V0.5+ session economy)

**Trigger**: V0.5+ session economy refinement quando V0 alpha rivela costi refresh-token churn elevati.

**Background**: V0 `AuthBootstrap` providers.tsx ([10.1.1.7.2] hotfix) consume refresh-on-mount IF refreshToken presente, indipendentemente da access_token validity. Pattern spreca refresh tokens utili: refresh consume vecchio refresh + emit nuovo, anche quando access ancora valido per 14 minuti.

Costo backend: rotation table write + new JWT signing per ogni mount root provider (= ogni page reload).

**Action V0.5+**:

- Decode access_token JWT exp claim al mount
- Refresh ONLY if `now > exp - buffer` (es. 60s buffer pre-expiry)
- Niente refresh se access valido
- Pattern adottato in maturità: Auth0, Clerk, Supabase Auth all selective refresh

**Effort**: 1-2h (jwt-decode helper + AuthBootstrap conditional logic + tests).

**Cross-references**: hotfix [10.1.1.7.2] AuthBootstrap 401-soft path. Hotfix [10.1.2.2.4.1] 401-retry interceptor api-client.ts (separate layer, complementary).

---

### Backend FastAPI middleware order: CORS bypass on 5xx exception (V0.5+ pre-launch)

**Trigger**: V0.5+ pre-launch hardening quando user-facing error UX matters.

**Background**: V0 [10.1.2.2.4.2] smoke verify ha rivelato classico FastAPI bug: 500 exception bypass CORS middleware → response niente carry `Access-Control-Allow-Origin` header → browser block fetch with `net::ERR_FAILED`. User vede generic "Failed to fetch" niente backend error message.

ExceptionMiddleware runs OUTSIDE CORSMiddleware in default FastAPI middleware stack.

**Action V0.5+**:

- Custom exception handler che ensures CORS headers on errors
- Pattern: `@app.exception_handler(Exception)` → response include CORS headers manually
- Verify across: 500 (server error), 503 (service unavailable), 422 (validation), 401 (auth)
- E2E test: mock backend exception, frontend sees JSON body con error code

**Effort**: 2-3h (custom handler + middleware order verify + E2E tests).

**Cross-reference**: hotfix [10.1.2.2.4.2] EMBEDDING_BACKEND=fake (manifested 500 → CORS bypass).

---

### Backend immutable fields strict vs PATCH partial-update tolerant (V0.5+ design choice)

**Trigger**: V0.5+ design choice review quando frontend complexity da client-side omit cresce.

**Background**: V0 [10.1.2.2.4.3] catch: backend `update_intent` rejecta `category` e `side` come IMMUTABLE post-create anche se valori invariati (raise CategoryNotModifiable / SideNotModifiable, http_status=422). Frontend hotfix: client-side omit immutable fields da PATCH body.

Pattern niente Pydantic-friendly (PATCH dovrebbe essere partial-update tolerant a unchanged fields). Server-side enforcement è strictly correct ma fa carico a client.

**Action V0.5+ refactor opzionale**:

- **Option A**: backend tolerant — detect `input.category != current.category` → reject; else accept (idempotent semantics, ignore unchanged values)
- **Option B**: backend OpenAPI `readOnly` marker su immutable fields → frontend type generation auto-omit
- **Option C**: keep current strict + frontend continues client-side omit (current hotfix sufficient V0)

**Effort**: 2-4h backend per option A/B. Option C zero-effort.

**Decisione**: design-time architectural call. Effort A/B vale solo se altri PATCH endpoint hanno simile pattern (cancel_mandate? update_user_settings? V0.5+).

**Cross-reference**: hotfix [10.1.2.2.4.3] edit form omit immutable. Discovery [10.1.2.2.0] niente verified update_intent field-level gating.

---

### Backend `cancel_intent` `CancelIntentResponse` counters niente verified empirically (V0.5+ UX)

**Trigger**: V0.5+ UX polish quando toast component shared introdotto (entry separata).

**Background**: V0 [10.1.2.2.4] smoke verify Step 13: DELETE /api/intents/{id} 200 OK confermato MA response body shape `{negotiations_cancelled, matches_expired}` counters niente verificati empiricamente (smoke verify procedette su GET response body). Backend `cancel_intent` working end-to-end (status='cancelled' + closed_at populated verified via subsequent GET), ma counters payload niente esercitato dal frontend.

V0 frontend cancelIntent niente displaya counters all'utente (decisione S2 [10.1.2.2.0] toast SKIP V0).

**Action V0.5+**:

- Verify CancelIntentResponse shape via OpenAPI types check + manual smoke
- Frontend toast: post-cancel show "Intent annullato. {negotiations_cancelled} negoziazioni in corso annullate, {matches_expired} match terminati."
- Edge case: counters = 0 → toast generic "Intent annullato"
- Catch: counters niente null edge cases

**Effort**: 2-3h (verify shape + toast integration + tests).

**Cross-reference**: hotfix N/A (counters separate feature). Toast component entry V0.5+ prerequisite.

---

### PROJECT_BRIEF v1.3 → v2.0 update post-F10.2 platform-managed AI decision (CRITICAL pre-launch)

**Trigger**: prima di launch alpha o di nuova implementazione onboarding/monetization.

**Background**: Discovery 2026-05-03 (FASE 10.2) ha invalidato il piano "utente collega subscription consumer AI". V0 resta platform-managed AI: Vifaras usa account API propri Anthropic/OpenAI, con cap/costi controllati. PROJECT_BRIEF v1.3 multiple sections need refresh.

Decisioni LOCKED in `marketplace/SPEC_V0.md`:
- §2.5 Onboarding flow (signup → identity → mandate → Tier 2; niente AI link V0)
- §2.8 Provider linking (consumer OAuth rimosso; BYOK/connector solo V0.5+/V1+ compliant)
- §3.1 USP ("crea il tuo agente di compravendita in 2 minuti")
- §4.3 Audience (consumer marketplace IT; power users future segment)
- §6.4 Monetization (seller fee + AI credits/subscription guardrails)

**Action V0.5+ pre-launch**:

- Riscrivere PROJECT_BRIEF sezioni 2.5, 2.8, 3.1, 4.3, 6.4
- Update §4.1 TAM/SAM/SOM (consumer marketplace, non BYOK-only)
- Update §8 GTM (consumer trust + privacy + agent convenience)
- Update §11 Financial projections (include LLM variable cost, caps, credits)
- Bump version v1.3 → v2.0
- Update CHANGELOG

**Effort**: 4-8h scrittura + 2h review.

**Cross-reference**: `marketplace/SPEC_V0.md` (source of truth post-pivot decisions).

---

### Connector app per AI locale (V0.5+ post-launch traction-driven)

**Trigger**: V0.5+ post-launch se feedback PMF rivela demand power user "voglio Ollama/LM Studio" o se costi LLM platform richiedono BYOK/local offload.

**Background**: V0 platform-managed AI usa account API Vifaras. Connector locale per Ollama/LM Studio/LocalAI è SKIP V0 per scope discipline. Audience power user esclusa dal critical path alpha.

Pattern: utente installa app desktop standalone (Tauri o Electron o Python CLI) che bridge Vifaras backend ↔ Ollama/LM Studio endpoint locale. Marketplace manda compito al connector, connector usa AI dell'utente, ritorna risposta.

**Vantaggio**: opzione BYOK/local compliant, Vifaras può ridurre costi LLM, supporto AI locali (privacy++ + cost++).
**Svantaggio**: PC user spento → agente in pausa (a meno cloud direct linked).

**Action V0.5+**:

- Decidere stack: Tauri (Rust+WebView) vs Electron (Node) vs Python CLI tool
- Distribution: GitHub releases? auto-update? signed binaries cross-OS?
- OS support V0.5+: Linux + macOS + Windows priority
- Connector lifetime: always-on daemon vs on-demand WebSocket
- Protocol Vifaras backend ↔ connector: HTTPS polling vs WebSocket vs SSE
- Local AI endpoint discovery: Ollama default :11434, LM Studio default :1234, LocalAI configurable
- Authentication connector ↔ Vifaras: API token? mTLS? signed JWT?

**Effort**: 3-6 weeks dedicated dev (significant standalone codebase).

**Cross-reference**: `marketplace/SPEC_V0.md` §6.3.
