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
