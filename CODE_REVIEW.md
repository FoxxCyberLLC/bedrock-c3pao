# Bedrock C3PAO — Security & Readiness Code Review

**Date:** 2026-06-09
**Reviewer:** Claude Code (security review, read-only — no code modified)
**Target:** `bedrock-c3pao` — the CMMC L2 assessor portal that runs as a standalone Docker container inside a government-approved VDI. Handles CMMC assessment data (assessor notes, readiness evidence, determinations) that is CUI-adjacent.
**Excluded:** `node_modules`, `.next`, generated/coverage. The Go API (`bedrock-cmmc-api`) is referenced where the C3PAO depends on its authorization, but its internals were reviewed separately.

**Method:** Mapped the app (dual auth, three data stores, API routes, server actions, container/start-up), read the core security files first-hand, then ran six parallel deep-dive reviews — dual auth & instance activation; SQL injection & local-data IDOR; API route handlers (proxy SSRF/IDOR); secrets/crypto/TLS/container; frontend & server-action authorization; and export/file-parsing integrity. Every Critical/High was confirmed against cited code.

---

## Executive summary

**The application-layer security is strong.** SQL injection is clean across the entire local data layer (all parameterized), all ~190 server actions enforce authentication with consistent lead-assessor / author-only gating, the eMASS deliverable is protected against spreadsheet formula injection (and regression-tested), the evidence proxy is SSRF- and XSS-safe, AUTH_SECRET is fail-closed and per-instance, and there is no XSS, open-redirect, or client-side secret exposure. This codebase is in notably better shape at the app layer than a typical first-pass review.

**The real gaps are in secrets-at-rest, transport security, and operational hardening** — plus a significant **documentation/reality drift**: the project documents an AES-256-GCM encryption layer (`lib/crypto.ts`, encrypted SQLite, a key at `data/.encryption-key`) that **does not exist**. In reality, `AUTH_SECRET` and the instance API key are stored as **plaintext** in the bundled Postgres. For a CUI-handling, ATO-bound product, asserting a control you don't implement is itself a compliance liability.

**Verdict:** the assessor workflow itself is well-built and safe to operate; **fix the two HIGH items (plaintext secrets + DB-TLS verification) and reconcile the docs before this container holds real assessment CUI.** None require redesign. Full assessment at the end.

Counts: **2 High · 6 Medium · 8 Low/Info.**

> Note on a design premise that shapes several severities: this is a **single-C3PAO-per-container** app. Every assessor on the instance is vetted staff of the same C3PAO, and the intended model is "any authenticated assessor may read any engagement's local data; lead-assessor/admin for sensitive writes; author-only for note edits." So intra-instance cross-engagement *reads* are largely by design, not vulnerabilities — which is why several IDOR-shaped items below are Low rather than High.

---

## HIGH

### H1 — Secrets stored in plaintext at rest; the documented encryption layer does not exist
**Location:** `lib/config.ts:17-24` (`setConfig`), `app/actions/setup.ts:104-115`, schema `lib/db.ts:46-50` (`app_config.value TEXT`); read back into `process.env` at `start.js:165-168` and `instrumentation.ts:13-18`. `lib/crypto.ts` is **absent**; no `createCipheriv`/`aes-256-gcm`/`.encryption-key` exists anywhere.
**What's wrong:** `AUTH_SECRET`, `INSTANCE_API_KEY` (the `bri-` instance credential), and `BEDROCK_API_URL` are persisted as cleartext `TEXT` rows in the bundled Postgres `app_config` table (whose data lives in the `c3pao_pgdata` Docker volume). `CLAUDE.md`, `.gitignore`, and `deploy/.env.example` all describe an AES-256-GCM scheme with a key at `data/.encryption-key` — none of which is implemented.
**Why it matters:** On a CUI-adjacent VDI, the realistic threats are a stolen/backed-up/snapshotted volume or another process with filesystem access. Anyone who reads `c3pao_pgdata` gets (1) `AUTH_SECRET` → forge `bedrock_c3pao_session` JWTs and impersonate any assessor *or the local admin*; and (2) `INSTANCE_API_KEY` → authenticate to the Go API as this C3PAO instance. There is no key separation or envelope encryption. The documentation actively misrepresents this as encrypted, which would mislead an assessment/ATO reviewer.
**Suggested fix:** Either (a) actually implement the documented `lib/crypto.ts` AES-256-GCM wrapper and encrypt sensitive `app_config` values — but derive the key from an operator-supplied passphrase or a container-injected secret **not stored in the same volume** (a key beside the ciphertext adds little against volume theft); or (b) drop the false claim and document the real posture honestly, relying on VDI full-disk encryption. Either way, correct `CLAUDE.md` / `.gitignore` / `deploy/.env.example` so they don't assert encryption that isn't present.

### H2 — Postgres TLS certificate verification disabled (`rejectUnauthorized: false`)
**Location:** `lib/db.ts:12-21`; bootstrap loader `start.js:136-144`.
**What's wrong:** When `DATABASE_URL` contains `sslmode=`, both the app pool and the loader strip `sslmode` and set `ssl: { rejectUnauthorized: false }` — TLS is negotiated but **any certificate is accepted** (no CA validation, no hostname check). The in-code justification ("Aurora traffic is already encrypted within the VPC") does not hold for the shipped model: this product bundles a **local Postgres** in `docker-compose.yml`.
**Why it matters:** A MITM on the database path can present any certificate and read/modify the connection — which carries the plaintext secrets from H1 plus all local assessment data (readiness artifacts and `outside_evidence` are bytea blobs in this DB). Worse, the control is a footgun: in the default compose the DB link has no `sslmode` (so traffic is unencrypted on the internal network), and an operator who hardens it by adding `sslmode=require` silently gets verification-disabled TLS and a false sense of security.
**Suggested fix:** When SSL is requested, verify it — ship/point at the proper CA bundle and use `ssl: { ca, rejectUnauthorized: true }` with hostname validation. If the bundled local DB is intended to be plaintext on the container-internal network, document that explicitly instead of half-enabling TLS.

---

## MEDIUM

### M1 — Local admin can read/write local assessment data via direct server-action invocation (separation-of-duties gap)
**Location:** `middleware.ts:83-85` (page-route fence) vs. the `app/actions/c3pao-*.ts` actions (e.g. `c3pao-readiness.ts:65-121`, `c3pao-notes.ts:66-117`), which gate on `requireAuth()` only.
**What's wrong:** The local admin is provisioned for instance *configuration* and is fenced out of assessment *pages* by middleware. But Server Actions are independently POST-invocable and only check **authentication**, not **tier** — a valid `isLocalAdmin` session passes `requireAuth()`, and the local-Postgres-backed actions need no API token, so an admin can call e.g. `getReadinessChecklist`/`listNotes` directly and read/write local assessment data for any engagement. (Go-API-backed actions still fail for the admin because their token is empty and the Go API rejects it.)
**Why it's Medium, not High:** The local admin is already the highest-privileged local operator — they hold the instance config, DB password, and volume — so this is a separation-of-duties / least-privilege gap (and a defense-in-depth weakness, since authorization rides on middleware page redirects), not a breach by an external or lower-privileged actor. It still matters for CMMC role hygiene.
**Suggested fix:** Move the tier decision into the action layer: add a `requireAssessor()` helper (mirror of the existing `requireAdmin()`) that rejects `session.isLocalAdmin`, and call it from the assessment actions. Never rely on middleware page redirects to authorize mutating actions.

### M2 — No rate limiting or account lockout on local-admin or assessor login (brute force on the VDI)
**Location:** `app/actions/auth.ts:8-56`, `lib/local-auth.ts:167-187`. No rate-limit/lockout code exists anywhere.
**What's wrong:** `login()` tries local scrypt auth then Go-API auth with no attempt counter, lockout, or backoff.
**Why it matters:** Anyone with browser access to the container can brute-force the local admin password (and assessor credentials) unthrottled. scrypt N=65536 adds per-attempt cost (some natural throttling), but a weak admin password is still reachable; compromising the local admin yields config access plus (via M1) local assessment data. NIST 800-171 AC.L2-3.1.8 expects limited unsuccessful logon attempts.
**Suggested fix:** Add per-identity + per-IP attempt counting with lockout/backoff, persisted in local Postgres, on both the local and Go-API branches.

### M3 — Readiness-artifact download route (and local read actions) not scoped by engagement
**Location:** `app/api/c3pao/readiness/artifact/[id]/route.ts:17-41` → `lib/db-readiness.ts:346-362` (`getArtifactContent`, `WHERE id = $1` only); same shape for local read actions `c3pao-readiness.ts` / `c3pao-notes.ts` / `c3pao-schedule.ts`.
**What's wrong:** The route returns a readiness-artifact bytea blob (pre-assessment CUI evidence) on `requireAuth()` alone, keyed on the artifact UUID with no engagement/lead check — even though the **export-bundle route gates the same blobs** behind `requireLeadAssessor`. The local read actions similarly return any engagement's notes/audit/schedule by ID.
**Why it's Medium (not High):** Consistent with the single-tenant "any assessor reads any engagement" design model and UUIDs are unguessable — so this is an intra-org confidentiality/consistency gap, not a cross-C3PAO leak. It's elevated above the other read actions because (a) it returns raw CUI file content, and (b) it's inconsistent with the lead-gating applied to the same data elsewhere, *and* it's reachable by the local admin per M1.
**Suggested fix:** Resolve the artifact's owning engagement (join `readiness_artifacts.item_id → readiness_checklist_items.engagement_id`) and gate with `requireLeadAssessor` / a team-membership check, mirroring the outside-evidence proxy. Decide and document whether per-engagement compartmentalization is required for the read actions; if so, add a `requireEngagementMember` helper.

### M4 — Bundled Postgres ships with a weak default password
**Location:** `docker-compose.yml:6,28`; `deploy/docker-compose.yml:6,36`; `deploy/.env.example:14`.
**What's wrong:** `POSTGRES_PASSWORD` and the app's `DATABASE_URL` both default to the literal `c3pao` via `${C3PAO_DB_PASSWORD:-c3pao}`. The compose comments make it look like no env file is needed, so an operator can easily run `docker compose up` with the database — which holds all secrets and CUI-adjacent data — protected by the password `c3pao`.
**Why it's Medium:** The DB port isn't published to the host, so exploitation needs container/network access — but it's a guessable credential guarding the crown jewels, and the `:-c3pao` fallback undermines the `change-me` placeholder in the example file.
**Suggested fix:** Remove the working default — make `C3PAO_DB_PASSWORD` required (fail fast if unset) or generate a random password at first init and persist it out-of-band.

### M5 — Self-signed TLS private-key directory created world-readable; key mode enforced only on generation
**Location:** `start.js:37,48`; `Dockerfile:53`.
**What's wrong:** `ensureCerts()` creates `CERT_DIR` with the default mode (~0755) and `chmod 0600`s the key file **only on the generation path** — pre-existing or operator-mounted keys aren't re-restricted, and the containing `data/` dir is `chown`'d but not mode-restricted. (Key *generation* is good: ECDSA P-384 via OpenSSL CSPRNG, proper SAN, 825-day validity.)
**Why it's Medium:** The private key lives in the shared `c3pao_data` volume; mode 0600 on the happy path is correct but not guaranteed for mounted keys, and the 0755 directory is loose for a key store. Impact is bounded (self-signed cert for an internal VDI service, container runs as a single non-root user).
**Suggested fix:** `mkdirSync(CERT_DIR, { recursive: true, mode: 0o700 })` and chmod the key to 0600 **unconditionally**; optionally validate perms on mounted certs at startup.

### M6 — Certificate API route does not call `requireAuth()` directly (auth via transitive action + string-match)
**Location:** `app/api/c3pao/engagements/[id]/certificate/route.ts:23-39` → `app/actions/c3pao-certificate.ts:22-25`.
**What's wrong:** Unlike every other route, this handler delegates auth entirely to the action it calls and maps a `result.error === 'Unauthorized'` string back to 401. It is **not** unauthenticated today (middleware + the action's `requireAuth` both gate it), but auth correctness depends on an exact error-string match in another file — a refactor of that string would silently downgrade an auth failure to a data-returning path.
**Suggested fix:** Add an explicit `const session = await requireAuth(); if (!session) return 401` at the top of the handler (matching all sibling routes); keep the action check as the second layer. Prefer a typed result discriminator over string-matching `'Unauthorized'`.

---

## LOW / INFO

- **L1 — Upstream error text forwarded to the browser.** `lib/api-client.ts:82,91`; `app/api/.../export`, `evidence/.../proxy`, `certificate` routes return raw `ApiError.message` / upstream status (and embed the internal `endpoint` path). No stack traces, but it leaks internal API error text in a CUI context. Fix: return generic client messages, log detail server-side.
- **L2 — Cross-engagement evidence link/unlink not engagement-scoped.** `app/actions/c3pao-outside-engagement.ts:329-367` → `lib/db-outside-assessments.ts:541-564`: lead-gated on `engagementId`, but `linkEvidenceToObjective`/`unlink` key on `evidence_id`/`objective_id` only, so a lead of engagement A could mutate engagement B's links by supplying B's IDs. Intra-org integrity nuisance (unguessable UUIDs, lead-only). Fix: add `engagement_id = $N` to the predicates.
- **L3 — `listOutsideObjectivesForEvidenceAction` ignores its `engagementId` argument** (`c3pao-outside-engagement.ts:369-382` → `db-outside-assessments.ts:566-574`): returns objective-id links for any evidence id under `requireAuth` only. Returns id strings, not content. Fix: scope by engagement or drop the unused param + document.
- **L4 — Forging `bedrock_instance_configured` on an un-provisioned instance is a setup-time DoS.** `middleware.ts:42-49`. The comment's core claim holds (forging it cannot bypass real auth — verified), but on first run it can redirect `/setup`→`/login` while login can't yet succeed, locking setup until the cookie is cleared. Self-inflicted, per-browser, easily cleared. Fix: base "configured" on server state only.
- **L5 — `editUser` last-admin demotion guard only checks self** (`app/actions/admin.ts:107-114`): narrower than the intent, but the "≥1 admin" invariant still holds via available paths (`removeUser` has a correct guard). Fix: make the guard target-agnostic.
- **L6 — Cold-start config-load race** (`instrumentation.ts:1-28`): a request before config loads fails closed (throws "AUTH_SECRET required", no default) rather than serving forged sessions — transient startup error, not a bypass. The shipped `start.js` path already serializes load-before-listen.
- **L7 — `isSafeRedirectUrl` is dead code** (`lib/safe-redirect.ts:5`): exported but never imported; login uses hardcoded redirect targets, so there's no open-redirect surface today. Fix: wire it in if a `returnTo` param is ever added, or remove (YAGNI).
- **L8 — Upload trusts client-supplied MIME** (`app/actions/c3pao-readiness-artifacts.ts:77-79`): allowlist checks `file.type`, not content sniffing — a crafted client could mislabel a file. Bounded: the evidence proxy re-derives Content-Type and forces `nosniff`/`attachment` for non-displayable types, so it cannot achieve stored XSS. Fix: magic-byte sniffing on upload (follow-up).

**Cross-cutting (compliance):** **Documentation/reality drift.** `CLAUDE.md`, `.gitignore`, and `deploy/.env.example` describe an AES-256-GCM-encrypted **SQLite** config store with a key at `data/.encryption-key`, an `xlsx` Excel library, and `lib/crypto.ts` / `lib/stig/parser.ts` — none of which match reality (config is plaintext **Postgres**; the Excel lib is `exceljs`; those files don't exist; the C3PAO does not parse STIG/CKLB at all). For a CMMC/CUI product, reconcile the docs with the implementation (fold into H1).

---

## Verified GOOD (reviewed and sound — for confidence)

- **SQL injection: clean** across the entire local data layer (`lib/db.ts` + all `lib/db-*.ts`, `lib/config.ts`). Every query parameterized; the four dynamic builders (saved-views JSONB, schedule, outside-engagement patch, readiness seed) use hardcoded column allowlists; JSONB filters bound as `$N::jsonb`. No dynamic ORDER BY/column from request, no string-joined `IN (...)`.
- **eMASS deliverable is safe from spreadsheet formula injection.** `sanitizeForExcel` (`lib/emass-workbook.ts:31-36`) prepends `'` to any value starting with `= + - @ \t \r` (OWASP trigger set) and is applied to **every** assessor/OSC-sourced free-text cell — regression-tested (`__tests__/lib/emass-workbook.test.ts`). The federal reviewer who opens the workbook is protected.
- **No untrusted-file parser to attack:** the C3PAO never imports/parses STIG/CKLB (read-only Go API passthrough) — no XXE/zip-bomb/prototype-pollution surface here.
- **Auth/authz hygiene is consistently good:** all ~190 server actions enforce `requireAuth()` (or stricter); admin user-management requires `requireAdmin` (local-admin tier); privileged assessment mutations require lead-assessor; note/review edits are author-only. Setup re-entry is guarded by `isAppConfigured()` (no instance hijack), and the setup URL is SSRF-filtered (blocks loopback / 169.254 / RFC-1918).
- **Sessions/secrets core:** `AUTH_SECRET` is required (fail-closed, **no default fallback**), generated per-instance via `crypto.randomBytes(32)`, HS256 pinned; `isLocalAdmin` is server-set only and tamper-proof (signed JWT). Cookies are `httpOnly` + `sameSite:lax` + `secure` (FORCE_HTTPS/production). Local passwords use scrypt N=65536 + `timingSafeEqual` with transparent cost-upgrade.
- **Evidence handling:** the evidence proxy is SSRF-safe (upstream URL comes from the trusted Go API, not the client), XSS-safe (`nosniff`, inline-render allowlist excluding HTML/SVG, `?hint` allowlist), with a true streamed 25MB cap; the outside-evidence proxy is the model (lead-gated + engagement-match).
- **Container/build:** no secrets baked into the image, multi-stage build runs as non-root (uid 1001) and strips the npm CLI, `.dockerignore` excludes `.env`/`data`, no secret logging, the instance key is only ever sent as `X-Instance-Key` to the configured API, Next.js binds `127.0.0.1:3000` (only the HTTPS proxy on `:3001` is exposed), self-signed cert is ECDSA P-384, and HTTP security headers (CSP/X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy) are set.
- **Frontend:** the single inner-HTML sink (`components/ui/chart.tsx`) injects developer-defined CSS variables, not tenant data — not exploitable; no secrets in `localStorage` (UI state only); no `NEXT_PUBLIC_` secret exposure; no open-redirect surface; CSRF posture sound (POST-only Server Actions, no state-changing GET).

---

## Readiness assessment

**The assessor application itself is well-built and safe to operate — the security investment shows.** The properties that are hardest to get right and most damaging to get wrong are right here: no SQL injection, no XSS, consistent authentication and lead/author authorization on every action, a federal deliverable that's hardened against formula injection, an SSRF-safe evidence proxy, and a fail-closed, per-instance session secret. The single-tenant "any assessor reads any engagement" model is a deliberate design choice, so most IDOR-shaped findings are intra-org and Low.

**What should be fixed before this container holds real assessment CUI** is concentrated in two HIGH items and the documentation: secrets (`AUTH_SECRET`, the instance key) sit in **plaintext** in the bundled Postgres while the docs claim AES-256-GCM that doesn't exist (H1), and the Postgres connection can be configured into **verification-disabled TLS** (H2) — both matter precisely because a VDI container's realistic threats are stolen/backed-up volumes and a hostile network path. Close those two, reconcile the docs to reality, then address the operational Mediums (login lockout, the default DB password, the admin/assessor action-layer tier check, and the readiness-artifact scoping) on a normal hardening cadence. None require architectural change; this is days of focused work, after which the container is in good shape for conducting and delivering CMMC assessments from inside the VDI.

---

# Part 2 — Code Quality & Functional Bugs

> The security review above (Part 1) was vulnerability-scoped. This part is a dedicated **code-quality and functional-bug** pass (domain-logic correctness, data integrity/concurrency, maintainability). It found real correctness defects the test suite misses — concentrated in the **outside-engagement** path and **startup**.

## Objective signal (strong)
- **TypeScript:** `tsc --noEmit` — **0 errors**.
- **Tests:** **886 passing across 100 files** — unusually thorough coverage.
- **ESLint:** fails (92 errors / 87 warnings) — but **~half come from the `.worktrees/` copy being linted** (config gap), plus the `start.js` CommonJS bootstrap (`no-require-imports`, legitimate) and the `prisma-types.ts` stub. **Lint is not a CI gate** (`.github/workflows/docker-publish.yml` runs `tsc` + `test` + `npm audit` + CodeQL, no `npm run lint`).
- Near-zero TODO/FIXME debt (1 marker). Server-action layer funnels through `requireAuth()` + a uniform result envelope; DB access cleanly split into focused `lib/db-*.ts` modules.

## Functional bugs

### B-CRITICAL — PS/PE control families are swapped for outside engagements → corrupts the eMASS deliverable
**Location:** `lib/db-outside-assessments.ts:42-52` (`familyCodeFromNistId`, the `ORDER` array — and its comment).
**What's wrong (verified):** `ORDER` is `...'MP', 'PE', 'PS', 'RA'...`, so NIST family `09`→`PE` and `10`→`PS`. The authoritative source is the opposite: `lib/cmmc/requirement-values.ts:230-231` and the SPRS table (`:146-159`) define **03.09 = PS (Personnel Security)** and **03.10 = PE (Physical Protection)**. The array and its inline comment are inverted at positions 9-10.
**Why it matters:** For **outside** engagements (c3pao-local engagements not backed by the Go API), the synthesized control catalog emits `PE.L2-3.9.x` (should be `PS`) and `PS.L2-3.10.x` (should be `PE`). These malformed IDs aren't in `cmmcToNistMap`, so `getRequirementValue` falls through to the default `{value:1, poamAllowed:true}`. Result in the signed eMASS workbook: `PS.L2-3.9.1` scored **1 pt** (should be 3) and `PS.L2-3.9.2`/`PE.L2-3.10.1`/`PE.L2-3.10.2` scored **1 pt** (should be 5), all with **POA&M=Allowed** (should be **No**) — the "Points to Subtract" column **understates the SPRS deduction and overstates the score**, and the flipped POA&M-eligibility can wrongly permit Conditional Level 2. All 886 tests pass against this because the catalog tests only assert `AC.L2-3.1.1` + a generic regex. (Regular OSC engagements are unaffected — their IDs come from the Go API.)
**Fix:** Set `ORDER = ['AC','AT','AU','CM','IA','IR','MA','MP','PS','PE','RA','CA','SC','SI']` (PS before PE) and correct the comment; better, derive from `nistFamilyToCmmc` in `requirement-values.ts` rather than a third hand-maintained list. Add a regression test asserting the synthesized catalog contains `PS.L2-3.9.1` and `PE.L2-3.10.1` (and not their swaps).

### B-HIGH-1 — `IN_POAM` status silently demoted to `NOT_ASSESSED` in the auto-determination
**Location:** `components/c3pao/engagement-detail.tsx:223-230` (`mapRequirementStatus`) → `determineCMMCStatus`; root cause `lib/cmmc/status-determination.ts:20` (`ObjectiveStatus` enum has no `IN_POAM`).
**What's wrong:** `mapRequirementStatus` sends anything that isn't `COMPLIANT/NON_COMPLIANT/NOT_APPLICABLE` (including `IN_POAM`) to `default → 'NOT_ASSESSED'`. A NOT_MET-but-POA&M'd requirement — the exact case that should drive **CONDITIONAL_LEVEL_2** — is fed to the determination as un-assessed, producing a wrong auto-suggested CMMC outcome.
**Fix:** Map `IN_POAM → NOT_MET` (with the POA&M list driving the Conditional path) and add `IN_POAM` to the `ObjectiveStatus` enum.

### B-HIGH-2 — `IN_POAM` is half-implemented; `recomputeControlStatus` silently clobbers it
**Location:** `lib/db.ts:234` (control CHECK allows `IN_POAM`) vs `:250` (objective CHECK doesn't); `lib/db-outside-assessments.ts:366-403` (`recomputeControlStatus` can only output `MET/NOT_MET/NOT_ASSESSED/NA`).
**What's wrong:** A manually-set `IN_POAM` control status is overwritten to `NOT_MET` on the next objective edit (recompute never produces `IN_POAM`), so whether the eMASS export shows `IN_POAM` vs `NOT_MET` is non-deterministic and the POA&M counts become unreliable. The three enum definitions (control CHECK, objective CHECK, TS type) disagree.
**Fix:** Make `IN_POAM` authoritative in one place (derive from POA&M membership, or preserve a manual override across recompute) and align the three enum definitions.

### B-HIGH-3 — Objective write + control recompute are not transactional (determination integrity)
**Location:** `app/actions/c3pao-outside-engagement.ts:235-246` → `lib/db-outside-assessments.ts:277-403`.
**What's wrong:** The optimistic-locked objective UPDATE and the parent-control `recomputeControlStatus` are two separate `query()` calls with no enclosing transaction. If the recompute fails (or the process dies between them), the objective is persisted as NOT_MET while the parent control still reads MET — and because the objective `version` already advanced, the assessor's retry hits a conflict and is blocked until reload.
**Fix:** Wrap both writes in one `getClient()` transaction with `SELECT … FOR UPDATE` on the control row (mirror the existing `editNote`/`addArtifact` pattern). Resolves B-HIGH-3 and the concurrency stale-read (below) together.

### B-HIGH-4 — `ensureSchema()` caches a rejected promise forever; most query paths never await it
**Location:** `lib/db.ts:40-44`; only `lib/internal-reviews.ts` awaits it; `instrumentation.ts:24-26` swallows boot-time failure.
**What's wrong:** `_schemaPromise` memoizes the init promise — if it rejects (DB unreachable at boot, plausible in a disconnected VDI), every later call re-returns the cached rejection with no retry until process restart. Since other modules query directly and rely on boot ordering (which swallows failure), a boot-time DB hiccup leaves the app running but querying non-existent tables with no self-heal.
**Fix:** On failure, reset `_schemaPromise = null` so the next call retries; have the data layer (or a shared `query` wrapper) await `ensureSchema()`.

### B-HIGH-5 — `start.js bootstrap()` is an un-`.catch`'d async; startup schema race
**Location:** `start.js:182-200`.
**What's wrong:** `bootstrap()` is invoked with no `await`/`.catch`, so a throw from `ensureCerts()` (`execSync('openssl …')`) or `loadConfig` becomes an unhandled rejection that can kill the process before the HTTPS proxy binds. Separately, `loadConfig` creates only `app_config`+`local_users`; the full schema is created later/asynchronously by `instrumentation.register()`, so a request in the startup window hits "relation does not exist."
**Fix:** `bootstrap().catch(err => { console.error(err); process.exit(1) })`; gate request handling until Next.js + schema are ready.

### B-MEDIUM
- **eMASS dates off by one day in US timezones.** `lib/emass-workbook.ts:38-45` (`fmtDate`): `new Date('2026-06-09')` parses as UTC midnight, `date-fns format()` renders local → `08-Jun-2026` in any negative-offset TZ. Affects Assessment Start/End, SSP Date, Hash Date (Postgres `DATE` columns) in the deliverable. Fix: use `parseISO` (already imported elsewhere) or a UTC format.
- **`recomputeControlStatus` last-writer-wins under concurrency** (`db-outside-assessments.ts:366-403`): reads objective statuses then upserts the control with no optimistic lock; concurrent edits can persist a stale derived status. Fix: fold into B-HIGH-3's transaction with `FOR UPDATE`.
- **`export-bundle` OOM + torn zip** (`app/api/c3pao/engagements/[id]/export-bundle/route.ts:89-100`): reads every artifact bytea whole into a Buffer in a loop with no aggregate cap; `void archive.finalize()` is unawaited (a later blob-read rejection tears the zip after the response stream is built). Fix: stream/cap blobs; await/handle `finalize()`.
- **Proxy/preview upstream `fetch()` has no timeout** (`evidence/.../proxy/route.ts:32`, `preview/route.ts:50`): a hung upstream holds the request open and, under the `max:3` pool, contributes to starvation. Fix: `signal: AbortSignal.timeout(...)`.

### B-LOW
- `getCmmcDisplayId` derives the CMMC number from the NIST family ordinal (`requirement-values.ts:265`) — currently correct only because they coincide; fragile if a non-positional family is added.
- All-`NOT_APPLICABLE` engagement auto-suggests `NO_CMMC_STATUS` via a vacuous `[].every()` (`status-determination.ts:113-124`) — confirm intended.
- `outside-evidence` proxy checks size after fully reading the blob (`proxy/route.ts:44-52`) — bounded by the 25MB upload cap.

## Code quality / maintainability

- **MEDIUM — Lint pipeline is untrustworthy.** (1) `eslint.config.mjs` doesn't ignore `.worktrees/**` or `coverage/**`, so a full second copy of the tree is linted (and a generated Istanbul file throws a parse error) — this ~doubles the reported count. (2) Lint is **not a CI gate**, which is why ~90 real messages accumulated. Fix: add the ignores, then add `npm run lint` to CI (gate on `error` severity to start).
- **MEDIUM — `any` seam on the Go-API → action → component data path.** `app/actions/engagements.ts:64,67,272-273` and `c3pao-team-assignment.ts:23` return `any`/`Record<string,any>`, and components re-launder via `as any` (`engagement-detail.tsx:476,1249`, `stig-viewer.tsx:45`). These bypass the **already-existing** `api-client.ts` view types (`ControlView`, `EngagementSummary`, …). A renamed/missing Go-API field surfaces as a runtime `undefined` in the UI/PDF, not a compile error. Fix: thread the existing view types through and drop the casts — the highest-value type cleanup.
- **MEDIUM — `lib/prisma-types.ts` stubs use `[key: string]: any`** (and `POAMGetPayload<T=any> = any`), so the typed fields on `Requirement`/`Asset`/`SSP`/`STIGRule` are unenforced and Go-API drift is invisible. Fix: enumerate fields (or use `unknown` for the index value) so consumers must narrow.
- **LOW —** duplicated `getClient()`/BEGIN/COMMIT/ROLLBACK/release boilerplate in 3 `db-*.ts` modules (add a `withTransaction()` helper to `lib/db.ts`); inconsistent `ActionResult<T>` vs inline `{success,error}` across 33 action files (export one shared type); a redundant `vi.mock('pg')` inside `beforeEach` in `__tests__/lib/db.test.ts:22-29` (will become a hard error on a future vitest — delete it); oversized files over the workspace 500-line limit (`lib/api-client.ts` 1908, `components/c3pao/engagement-detail.tsx` 1416, `report/page.tsx` 1015, …).
- **INFO —** `better-sqlite3` is not even a dependency (the config layer is `pg`/Postgres) — CLAUDE.md's references to it, to `lib/crypto.ts`, to `lib/stig/parser.ts`/`cci-to-cmmc.ts`, and to `@ts-nocheck` on `pdf-generator.ts` are all stale/fictional (fold into Part 1's H1 doc-reconciliation). Two `react-hooks/exhaustive-deps` warnings (`engagement-detail.tsx:487`, `team-assignment-dialog.tsx:83`) are worth eyeballing for stale-closure bugs.

## Verified correct (for confidence)
- **SPRS scoring table** (`requirement-values.ts`): 110 requirements (51×1 + 14×3 + 44×5 + 1 N/A), weight sum 313 → floor `110 − 313 = −203`, matching the DoD Assessment Methodology. `cmmcToNistMap` complete and consistent.
- **Determination logic** (`status-determination.ts`): the priority chain (zero-assessed guard → all-MET → POA&M-ineligible short-circuit → 180-day window → fallback) matches CAP v2.0; `recomputeControlStatus` precedence (NOT_MET before NOT_ASSESSED) is correct. eMASS status strings and the `pointsToSubtract` formula are correct (the only corruption is B-CRITICAL's upstream ID lookup).
- **Reliability:** all 4 `getClient()` sites release on every path; the objective optimistic lock surfaces conflicts to the user (no silent overwrite); heartbeat and audit writes are safely isolated fire-and-forget; `api-client` uses AbortController correctly; `parseInt` always has a radix.

---

# Overall verdict (security + quality + bugs)

This is a **well-engineered, thoroughly-tested codebase** — clean typecheck, 886 passing tests, robust connection/transaction discipline, a correct SPRS table and determination chain, no SQL injection or XSS, consistent server-action authorization, and an eMASS exporter hardened against formula injection. The security posture at the application layer is genuinely strong.

But it is **not yet ready to produce signed assessments for outside engagements**, because of one **critical functional bug** the tests miss: the **PS/PE family swap (B-CRITICAL)** silently corrupts SPRS scoring, family IDs, and POA&M eligibility in the federal eMASS deliverable. That must be fixed (with a regression test) before any outside-engagement assessment is exported. Close behind are the `IN_POAM` determination bugs (B-HIGH-1/2) — also wrong-outcome defects — and the startup/transaction reliability issues (B-HIGH-3/4/5).

On the **security** side, before this container holds real assessment CUI: fix the **plaintext secrets at rest** (H1) and the **disabled Postgres-TLS verification** (H2), and reconcile the documentation, which currently asserts an encryption layer that doesn't exist.

None of this requires architectural change. Fix the one critical correctness bug and the two security HIGHs, address the IN_POAM and startup reliability HIGHs, then work the Mediums (login lockout, default DB password, tier check, type-safety seam, lint gate) on a normal cadence — and this is a solid, trustworthy assessor platform.
