# Requirement changes vs Assignments 1–5

This version of SAMS differs from earlier LNMIIT lab assignments as follows:

| Topic | Earlier assignments | This product |
| --- | --- | --- |
| Application fee | Payment could be required to complete/submit the application | **No application fee.** Submit is free once the form and mandatory documents are complete. |
| Admission fee timing | Payment could appear earlier in the funnel | **Payment is only after seat confirmation** (Accept in a published round). |
| Seat response | Single allotment or implicit accept | **Per-round** Accept / OptNextRound / Decline; missed deadline = Expired (treated as Decline). |
| Allotment | Manual or unspecified | **System-assisted, deterministic** allotment with Proposed → Published → optional Revised. |
| QR / checklist | Timing not tied to payment | Generated **only after payment success**, once (idempotent). |
| Final admission | Could be implied by seat or payment | Requires **seat confirmed + payment success + all mandatory checklist items Verified**. |
| Client | Mixed web/mobile possible in diagrams | **Mobile-only** (Expo). No web dashboard. |
| Roles | Applicant / FacultyVerifier / AdministratorUser as classes | Same domain names as **roles on one User collection**. Management is a fourth, read-only role. |
