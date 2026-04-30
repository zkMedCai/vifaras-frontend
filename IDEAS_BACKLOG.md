# Vifaras Frontend — Ideas & Backlog

Parking lot di scope creep, decisioni rinviate, e blocker schedulati.

---

## Blockers (must resolve before specific milestone)

### Pre-V1 launch security review

**Trigger**: blocker per primo deploy pubblico.

**Background**: 5 CVE su `next@14.2.35`, 1 CVE su `postcss<8.5.10`. Categorizzazione completa in `PROGRESS.md` entry [10.0.1]:

- 4/5 Next CVE in codepath non usati (image optimizer, rewrites): non rilevanti se manteniamo no `next/image` + no rewrites
- 1/5 Next CVE (RSC DoS) attivo a runtime: rilevante in prod, irrilevante in dev locale single-user
- 1 postcss CVE dev-tooling-only: non rilevante in nessun deploy

**Decision tree pre-launch**:
1. Major upgrade Next 14 → 15/16 con migration plan dedicato (vedi entry "Next major upgrade")
2. Deploy via Vercel-managed (alcuni advisory dicono "self-hosted only" — verificare quali)
3. Backport patch noi stessi se Vercel non rilascia 14.2.36 (improbabile, Next team ha chiuso linea 14)

**Action quando si arriverà al deploy**: rivedere advisory list, scegliere opzione 1/2/3, eseguire prima di esporre pubblicamente.

---

## V0.5+ Enhancements

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

**Effort**: 2-3 giorni dedicati, NON smuggle dentro altre task.
