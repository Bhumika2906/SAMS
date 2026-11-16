# SAMS test plan

## Automated coverage

`npm test` runs `server/tests/auth.test.ts` with an in-memory SQLite database. The suite covers:

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| T-001 | Register two applicants | Both succeed and receive different application IDs |
| T-002 | Duplicate registration | `409` with a safe duplicate-account error |
| T-003 | Public role assignment | Supplied admin role cannot change the applicant role |
| T-004 | Valid login | `200` and signed token |
| T-005 | Invalid login | Generic `401` |
| T-006 | Password reset | Password is hashed and new password can log in |
| T-007 | Authenticated profile | `GET /auth/me` returns safe user profile |
| T-008 | Unauthenticated profile | `401` |
| T-009 | Role authorization | Applicant cannot access administrator endpoint |
| T-010 | Schema initialization | Test setup creates the relational SQLite schema |

Frontend validation is exercised manually through the registration, login, reset, loading, success, error, and responsive dashboard states. Run `npm run build` and `npm run lint` for the type/build checks.

## Execution result

Executed on 2026-10-21 after installing Node.js 20.20.2 per-user:

- `npm test`: **PASS** — 1 test file, 4 tests passed.
- `npm run lint`: **PASS** — server and client TypeScript checks passed.
- `npm run build`: **PASS** — server compilation and Vite production build passed.

`npm install` reported six dependency audit advisories (3 moderate, 1 high, 2 critical). They are recorded as dependency-maintenance follow-up and did not prevent the tests or build from passing.

## Known limitations

Verification is simulated, password reset is a local prototype operation rather than an email-token flow, and workflows after FR-005 are intentionally not tested because they are not implemented.
