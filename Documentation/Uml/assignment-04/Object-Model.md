# SAMS — Assignment 4: Object Model

## 1. Overview

The supplied object diagram illustrates an example set of SAMS object instances and links. The instance values below are transcribed from the image.

## 2. Object instances

### `applicant1 : Applicant`
- `userID = "24DCS101"`
- `name = "Rohan Mehta"`
- `role = "Applicant"`
- `applicationID = "APP2201"`

### `verifier1 : FacultyVerifier`
- `userID = "FAC010"`
- `name = "Dr. Neha Sharma"`
- `assignedLectureHall = "LH-3"`

### `app2201 : Application`
- `applicationID = "APP2201"`
- `applicationStatus = "Seat Allotted"`
- `submissionDate = "18-08-2026"`

### `allot01 : SeatAllotment`
- `allotmentID = "ALT001"`
- `allotmentStatus = "Allotted"`
- `allottedProgramme = "B.Tech CSE"`

### `checklist01 : DigitalChecklist`
- `checklistID = "CHK001"`
- `overallStatus = "Partially Verified"`

### `gatepass01 : QRGatePass`
- `gatePassID = "GP001"`
- `qrCodeValue = "QR-24DCS101-ALT001"`
- `validityStatus = "Valid"`

### `item1 : ChecklistItem`
- `itemID = "ITM01"`
- `documentStepName = "10th Marksheet"`
- `verificationStatus = "Verified"`
- `verifiedBy = "FAC010"`

### `item2 : ChecklistItem`
- `itemID = "ITM02"`
- `documentStepName = "12th Marksheet"`
- `verificationStatus = "Pending"`
- `verifiedBy = "_"`

## 3. Links shown

- `applicant1` submits `app2201`.
- `app2201` results in `allot01`.
- `allot01` generates `checklist01`.
- `allot01` generates `gatepass01`.
- `verifier1` scans `gatepass01`.
- `verifier1` verifies the gate-pass / document-verification flow shown in the diagram.
- `checklist01` is composed of `item1` and `item2`.

## 4. Interpretation of the example

The example represents an applicant whose application status is **Seat Allotted** for **B.Tech CSE**. The digital checklist is **Partially Verified**: the 10th marksheet is verified, while the 12th marksheet remains pending. The QR gate pass is marked **Valid**.

See `diagrams/Object-Diagram.png` for the unchanged original object diagram.
