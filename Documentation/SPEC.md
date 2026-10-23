# SAMS Product Specification

Student Admission Management System for LNM Institute of Information Technology, Jaipur.

This document is the source of truth for workflow, status vocabulary, and business rules. Older assignment documents are superseded where they conflict (see `docs/REQUIREMENT_CHANGES.md`).

## 1. Product summary

One **mobile-only** app (no web dashboard) with four server-assigned roles. After login the client navigates by the **JWT/user role from the server**; the client role is never trusted for authorization.

| Role (User.role) | User-facing name | Home areas |
| --- | --- | --- |
| `Applicant` | Applicant | Home · Application · Admission · Checklist · Profile |
| `AdministratorUser` | Administrator | Overview · Applicants · Rounds · Allotment · Reports |
| `FacultyVerifier` | Faculty | Home · Scan QR · Checklist · History |
| `Management` | Institute Management (read-only) | Overview · Seat Statistics · Verification Progress |

Administrator tables and reports are mobile-friendly: cards, searchable lists, filters, compact summaries, pagination.

Visual language: white/light-neutral surfaces, navy-blue primary, restrained orange accent, consistent icons, loading/empty/error states, accessible labels, readable text sizes.

## 2. Architecture

```
Mobile (Expo) → HTTPS JSON /api/v1 → Express + MongoDB
                 StorageService (local disk default | optional Cloudinary)
                 NotificationService (in-app MongoDB + simulated email/SMS console log)
                 PaymentService (simulated gateway; clearly labelled SIMULATED)
```

The app must run with **no external credentials**. Email/SMS and payment providers are pluggable interfaces; default adapters log to the server console.

## 3. Final admission workflow

### 3.1 Application (no application fee)

1. Register.
2. Verify account (simulated OTP printed to the **server console**).
3. Fill form: personal, address, qualifying exam/education, ranked branch preferences.
4. Upload documents.
5. Review and submit. Submission **locks** the application.
6. No payment is required to submit. There is no separate application fee in this version.

Account must be verified before an application can be started.

Submit only when all mandatory sections and documents are complete. After submission, only an authorized administrator override (audited) may unlock/edit.

### 3.2 Admission rounds

Administrator:

1. Creates a round and sets programme seat capacities (seat matrix).
2. Views eligible applicants.
3. Runs **system-assisted allotment** (deterministic; see `docs/ALLOTMENT.md`).
4. Reviews proposed results.
5. Publishes them (starts the applicant response window).
6. May **revise** allotment only before the response window closes; revised results re-notify applicants.

### 3.3 Seat response (per round)

Applicant chooses one of:

- **Accept** — becomes the applicant's final confirmed seat.
- **OptNextRound** — releases the seat; stays in the pool for the next round.
- **Decline** — releases the seat and exits admission (`admissionStage` → `Withdrawn`).
- **No response by deadline** — `Expired`, treated as Decline (round-closure rule).

Round history is always retained.

### 3.4 Seat confirmation

An accepted seat becomes the applicant's final confirmed seat (`SeatConfirmed`).

### 3.5 Admission payment (after seat confirmation)

Simulated gateway: success or failure; retry on failure; receipt and payment history. Idempotent on repeated callbacks/duplicate requests (`idempotencyKey`). Payment is possible **only** for an applicant whose seat is confirmed. Payment success does **not** imply verification.

### 3.6 Campus visit

After payment success, the system generates (once, idempotent):

- Personalized digital checklist
- QR gate pass (purpose, date, time slot, validity)

Show visit instructions on the applicant app.

### 3.7 Document verification

Faculty assigned to the applicant's counter/lecture hall scans the QR (or enters the code manually). The backend validates the pass and returns the checklist.

**Scanning does not verify anything.** Faculty must verify original documents item by item (`Verified` / `NotVerified`).

QR payload is an **opaque random token** (at least 128 bits). The server maps `token → pass → applicant`. Never put applicant data in the QR.

Only a faculty member assigned to the relevant counter may scan and verify that applicant.

### 3.8 Final admission

When **all mandatory** checklist items are `Verified`, final verification completes and admission is `AdmissionConfirmed`.

Never confirm admission before **seat confirmation + payment success + full mandatory verification**.

## 4. Status vocabulary

All status strings live **only** in `/shared`. Server services enforce transitions; invalid transitions return **409**.

### Application.status

`Draft` → `Submitted` → `UnderReview` → `Eligible` | `Rejected`

### Application.admissionStage (process tracker)

Progression (non-terminal):

`Registered` → `ApplicationInProgress` → `Submitted` → `UnderReview` → `Eligible` → `InRound` → `Waitlisted` (optional) → `SeatConfirmed` → `PaymentPending` → `PaymentCompleted` → `VerificationPending` → `AdmissionConfirmed`

Terminal outcomes (separate):

- `Rejected` — ineligible
- `NotAllotted` — unsuccessful
- `Withdrawn` — declined or expired response

### SeatAllotment.publication

`Proposed` | `Published` | `Revised`

### SeatAllotment.result

`Allotted` | `Waitlisted` | `NotAllotted`

### SeatAllotment.response

`Pending` | `Accepted` | `OptedNextRound` | `Declined` | `Expired`

### AdmissionRound.status

`Draft` | `Open` | `AllotmentRun` | `Published` | `Closed`

### Document.status

`Uploaded` | `UnderVerification` | `Rejected`

### Payment.status

`Pending` | `Success` | `Failed`

### DigitalChecklist.status

`NotGenerated` → `Pending` → `PartiallyVerified` → `FullyVerified`

### ChecklistItem.status

`Pending` | `Verified` | `NotVerified`

### QRGatePass.validity

`Valid` | `Used` | `Expired` | `Revoked`

## 5. Business rules (server-enforced)

1. **Never trust the client role.** Authorization uses the authenticated user from the JWT.
2. Account must be verified before an application can be started.
3. Submit only when mandatory sections and documents are complete; then lock. Admin override is audited.
4. **No capacity overflow.** The allocation service must never allot more seats than the seat matrix capacity. Use transactions when available; otherwise atomic conditional updates. Concurrent runs must be tested.
5. Only administrators configure rounds, run allotment, publish, and revise results.
6. Payment only for confirmed seats. Payment success ≠ verification.
7. Checklist and QR pass generated only after payment success, and only once (idempotent).
8. QR token is opaque (≥128 bits of randomness); hashed at rest.
9. Only faculty assigned to the relevant counter may scan/verify. Invalid, expired, revoked, or wrongly assigned passes are rejected with clear messages.
10. A checklist item becomes `Verified` only through the faculty verification endpoint (verifier + timestamp recorded).
11. Final admission requires seat confirmed + payment success + all mandatory items Verified.
12. Important actions are written to `AuditLog` (actor, action, entity, timestamp, summary): publish results, revise allotment, verify item, override edits, payment outcome.
13. Applicants can only read/write their own data. Every endpoint checks authentication and role. **Management is strictly read-only.**
14. Auth routes are rate-limited. Uploads restricted to PDF/JPG/PNG and a size cap.

## 6. System-assisted allotment

Deterministic algorithm; full write-up in `docs/ALLOTMENT.md`.

**Inputs (per round):** eligible applicants (`Application.status = Eligible`, not already holding a confirmed seat, not `Withdrawn`, and either new to allotment or `OptedNextRound`), merit rank (lower is better), ranked branch preferences, seat matrix (programme → capacity minus seats already confirmed in earlier rounds). Optional category is stored; quota enforcement is a stretch goal.

**Algorithm:** sort by rank ascending, then earlier submission time, then `applicationId`. For each applicant, walk preferences in order and allot the first programme with remaining capacity. Else `Waitlisted` if waitlist policy applies, else `NotAllotted`. Results start as `Proposed`. Publishing sets `Published`, notifies applicants, starts the response window. Seats released by Decline / OptNextRound / Expired return to the matrix for the next round.

**Tests required:** capacity never exceeded; preference order; rank order; tie-breaking; released seats reused next round.

## 7. Data models

Single schema per collection (camelCase). Domain terms from Lab Assignment 4; `Applicant`, `FacultyVerifier`, and `AdministratorUser` are **roles** on one `User` collection.

`User`, `Application`, `Document`, `AdmissionCycle`, `Programme`, `AdmissionRound` (seat matrix), `SeatAllotment`, `Payment`, `DigitalChecklist`, `ChecklistItem`, `QRGatePass`, `VerificationCounter`, `Notification`, `AuditLog`.

## 8. API conventions

- Base path: `/api/v1`
- Envelope: `{ "success": boolean, "data": ..., "error": { "code": string, "message": string, "details"?: any } }`
- Status: 200/201 success, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 invalid transition/conflict, 429 rate limited
- Central error handler; Zod middleware on every route; role guard middleware
- Modules: Authentication & RBAC; Application & Document Management; Process Tracking; Admission Round & Seat Allotment; Payment; Digital Checklist & QR Gate Pass; Faculty Verification; Notification; Reporting & Analytics

## 9. Phases

| Phase | Scope |
| --- | --- |
| 0 | Planning, rules, monorepo scaffold (this phase) |
| 1 | Shared package, models, auth/RBAC, Expo shells |
| 2 | Application, documents, submit/lock, tracker, applicant screens |
| 3 | Rounds, allotment, responses, admin/management screens |
| 4 | Payment, checklist, QR, faculty verification, final admission |
| 5 | Manual test pass, edge cases, polish, final docs |
