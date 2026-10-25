# System-assisted allotment

Deterministic seat allotment used by the admission-round service. Implementation lives on the server; types and result enums live in `@sams/shared`.

## Inputs (per round)

- Eligible applicants:
  - `Application.status === Eligible`
  - not already holding a confirmed seat
  - `admissionStage` is not `Withdrawn`
  - new to allotment **or** last published response is `OptedNextRound`
- Merit rank on the application (lower is better; seeded or entered by admin)
- Ranked programme/branch preferences
- Seat matrix on the round: programme → capacity for this round, after deducting seats **already confirmed** in earlier rounds
- Optional category is stored on the application; **quota enforcement is a stretch goal** and is not applied in the default algorithm

## Sort order

1. Merit rank ascending
2. Earlier application submission time
3. `applicationId` (string compare)

## Assignment

For each applicant in that order:

1. Walk preferences from first to last.
2. Allot the first programme whose remaining capacity is > 0.
3. Decrement remaining capacity by 1 using a transaction or an atomic conditional update (`remaining >= 1`).
4. If no preference has capacity: `Waitlisted` if the cycle’s waitlist policy applies, otherwise `NotAllotted`.

Results are created with `publication = Proposed` and `response = Pending` (for allotted seats). A round allocation run is identified by `allocationRunId` and is guarded by a round lock. Admin may re-run only before publish; the calculation, proposed records, and seat-matrix counters commit in one MongoDB transaction.

Publication records immutable metadata (`publishedAt`, `publishedBy`, `allocationRunId`, and `revision`). A published record is never rewritten. `active` identifies the single current allotment for an application; historical published records are retained but marked inactive when a later round becomes current. Applicant responses target the allotment ID and are accepted only when it belongs to the latest published round and is still pending.

Seat-matrix counters have one meaning: `capacity` is configured seats, `offered` is active published allotted seats, `accepted` is accepted offers, `confirmed` is accepted seats confirmed for admission, and `available` is `capacity - offered`. Counters are reconciled from allotment records; response handling never blindly decrements them.

## After publish

- **Accept** — confirmed seat; capacity remains consumed.
- **OptNextRound** / **Decline** / **Expired** — seat returns to the matrix for the **next** round. The current API exposes Accept and Decline; Decline is an explicit permanent withdrawal and sets `Withdrawn`. Applicants who should continue must use the future-round `OptNextRound` response when that action is enabled.

Allotment may be **Revised** only by an administrator before the response window closes; applicants are re-notified.

## Invariants

- Never allot more seats than configured capacity (single source of truth: the seat matrix).
- Preference order and rank order are respected.
- Concurrent allotment runs must not overflow capacity.

## Tests (Phase 3)

- Capacity never exceeded (including concurrent runs)
- Preference order respected
- Rank order respected
- Tie-breaking (submission time, then applicationId)
- Released seats reused in the next round
