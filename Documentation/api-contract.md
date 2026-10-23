# SAMS authentication API contract

Base URL: `http://localhost:4000/api`

This contract intentionally covers only FR-001 through FR-005. Authentication responses contain a safe user projection; password hashes are never returned. Protected requests use `Authorization: Bearer <token>`.

## `POST /auth/register` — FR-001, FR-002

Request:

```json
{"name":"A Student","email":"student@example.com","mobile":"+919876543210","password":"Password123!","passwordConfirmation":"Password123!"}
```

Email or mobile is required. The server validates uniqueness, assigns `applicant`, creates the application row, and generates a unique `SAMS-YYYY-######` application ID. Public role input is ignored.

`201`: `{ "applicationId": "...", "user": User, "token": "..." }`

`400` validation error; `409` duplicate account.

## `POST /auth/login` — FR-003

Request: `{ "identifier": "student@example.com", "password": "Password123!" }`

`200`: `{ "user": User, "token": "..." }`; `400` invalid request; `401` generic invalid credentials.

## `POST /auth/reset-password` — FR-004

Request: `{ "identifier": "student@example.com", "newPassword": "NewPassword123!" }`

This classroom prototype performs the update directly. A production version must add a time-limited, provider-delivered reset token. The same `200` response is returned whether the account exists, avoiding account enumeration.

## `GET /auth/me` — FR-003, FR-005

Requires a valid bearer token. `200` returns `User`; `401` is returned for absent, invalid, or expired tokens.

## Role-protected foundation endpoints — FR-005

`GET /admin/overview` requires `admin`; `GET /verifier/overview` requires `verifier`. Missing authentication returns `401`, and a valid user with another role returns `403`. Applicant registration can never assign either privileged role.

## User shape

```json
{"id":"uuid","applicationId":"SAMS-2026-123456","name":"A Student","email":"student@example.com","role":"applicant","accountStatus":"active","verificationStatus":"demo_verified"}
```

## Database entities

The initializer in `server/src/shared/database/db.ts` creates User, Application, Document, Payment, AdmissionRound, SeatAllotment, DigitalChecklist, ChecklistItem, QRGatePass, and Notification. Foreign keys connect the application-owned entities to Application, and verification/checklist entities retain their actor references. Document, payment, admission, allotment, checklist, gate-pass, and notification rows are schema foundations only and have no FR-006+ business endpoints yet.
