# SAMS — Assignment 3: Use-Case Scenarios

## UC-002 — Fill and Submit Application

**Primary actor:** Applicant  
**Supporting system:** Student Admission Management System (SAMS)  
**Goal:** Complete and submit an admission application.

### Preconditions
- The applicant can access SAMS.
- The applicant has the information and required documents needed to complete the application.

### Main success scenario
1. The applicant fills in the application details.
2. The applicant uploads the required documents.
3. SAMS checks the mandatory details.
4. If the mandatory details are complete, the applicant proceeds to pay the application fee.
5. SAMS processes the payment.
6. SAMS generates a receipt.
7. The applicant reviews the application.
8. The applicant confirms that the application is ready to submit.
9. SAMS submits and locks the application.
10. SAMS confirms the submission.

### Alternative and exception flows
- **Missing mandatory information:** SAMS displays the missing information. The applicant completes the missing details, and SAMS checks the mandatory details again.
- **Payment unsuccessful:** SAMS informs the applicant. The applicant may retry payment; if payment succeeds, SAMS processes it and generates a receipt.
- **Application not ready:** The applicant continues editing instead of submitting. The flow ends without a confirmed submission.

### Postconditions
- **Success:** The application is submitted and locked, and a submission confirmation is shown.
- **Not submitted:** The applicant can continue editing the application.

---

## UC-008 — Scan QR and Verify Documents

**Primary actor:** Faculty / Verifier  
**Supporting actor:** Applicant  
**Goal:** Validate an applicant's QR gate pass and verify original documents against the applicant checklist.

### Preconditions
- The applicant has a QR gate pass to present.
- A faculty member or verifier is available to scan the pass and inspect documents.

### Main success scenario
1. The applicant reports to the verification counter.
2. The applicant presents the QR gate pass.
3. The faculty member / verifier scans the QR code.
4. SAMS validates the QR code and gate pass.
5. SAMS displays the applicant checklist.
6. The verifier checks the original documents.
7. The verifier marks the verification items.
8. SAMS automatically updates the checklist.
9. If all items are verified, SAMS marks final verification complete and notifies the applicant.

### Alternative and exception flows
- **Invalid QR or gate pass:** SAMS rejects the QR scan and informs the verifier. The flow ends without document verification.
- **Pending checklist items:** SAMS keeps the checklist incomplete and informs the applicant about pending items.

### Postconditions
- **Complete:** The checklist is updated, final verification is marked complete, and the applicant is notified.
- **Incomplete:** The checklist remains incomplete and the applicant is informed of pending items.

---

## UC-012 — Manage Admission Rounds and Seat Allotment

**Primary actor:** Admission Administrator  
**Supporting actor:** Applicant  
**Goal:** Manage admission decisions and seat allotments across admission rounds and communicate updates to applicants.

### Preconditions
- The administrator can access the decision module.
- Applications are available for eligibility review.

### Main success scenario
1. The administrator opens the decision module.
2. The administrator reviews eligible applications.
3. The administrator updates seat allotment.
4. SAMS updates the admission decision.
5. SAMS notifies affected applicants.
6. The applicant views the allotment status.
7. The applicant responds to the allotment, such as accepting / proceeding.
8. SAMS records acceptance.
9. SAMS generates the digital checklist and QR gate pass.

### Alternative and exception flows
- **Allotment revised:** The administrator revises the allotment. SAMS updates it and re-notifies the applicant; the applicant views the revised status.
- **No applicant response:** SAMS waits for the next round and maintains the applicant status.
- **Round closure:** SAMS applies the round-closure rule when appropriate.

### Postconditions
- The admission decision and allotment status are updated.
- Applicants are notified of relevant decisions or revisions.
- Depending on the outcome, acceptance is recorded, the applicant status is maintained for the next round, or the round-closure rule is applied.
- For the acceptance path shown in the diagram, SAMS generates a digital checklist and QR gate pass.
