# Validation

## Completed

- Server TypeScript check passed.
- Expo mobile TypeScript check passed.
- Shared TypeScript check passed.
- Backend Jest suite passed: 37 tests across 5 suites.
- Shared Jest suite passed: 6 tests across 2 suites.
- New regression coverage includes cascading Float upgrades, retaining backups without an upgrade, carrying successful payment across rounds, concurrent/idempotent payment, withdrawal of an upgraded seat, withdrawal deadline rejection, QR resolution to the current branch, revoked-pass rejection, unpaid-offer expiry, final-round locking and stale-preview rejection.
- Existing fee fixtures were corrected to include the mandatory document records already required by submission validation.
- A clean npm lockfile was generated from the workspace manifests to eliminate conflicting leftover Zod versions.

## Environment and remaining verification

The source was staged into separate verification directories because the desktop sandbox blocked parts of npm workspace installation and Windows long paths interrupted dependency extraction. Backend integration tests used a real single-node MongoDB 8.2.6 replica set. Tests were run with the project's experimental VM modules flag.

Physical-phone camera permission/scanning and a complete manual device walkthrough remain to be verified. No APK/IPA or hosted deployment is included. Payments and email/SMS delivery remain simulated. The shared receipt/confirmation is text, not a signed institutional document.

Legacy models still emit duplicate-index warnings and some dependencies emit deprecation warnings during tests. These did not prevent the 43 tests from passing.

## Agreed scope and remaining policy assumptions

Spot rounds are excluded. The existing INR 1,000 application fee is retained. The seat deposit is simulated at INR 160,000 and follows the applicant through upgrades. There is a single merit pool per programme, with no overbooking. Equal merit ranks use submission time then record ID. Decline and missed acceptance/payment deadlines exit counselling. Withdrawals retain payment history without automatically issuing refunds. Deadlines and the final-round flag are set by the administrator.
