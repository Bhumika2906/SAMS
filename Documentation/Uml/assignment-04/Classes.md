# SAMS — Assignment 4: Classes

## 1. Overview

This document describes the classes shown in the supplied Student Admission Management System (SAMS) UML class diagram. Class names, attributes, and operations below follow the diagram.

## 2. Classes

### User
**Attributes**
- `userId`
- `name`
- `email`
- `role`
- `accountStatus`

**Operations**
- `login()`
- `logout()`

### Applicant
**Attributes**
- `applicationId`

**Operations**
- `fillApplication()`
- `submitApplication()`
- `viewStatus()`

### Verifier
**Operations**
- `assignedLectureHall`
- `scanGatePass()`
- `verifyDocument()`

### Administrator
**Operations**
- `manageRound()`
- `updateAllotment()`
- `generateReport()`

### Application
**Attributes**
- `applicationId`
- `personalInfo`
- `address`
- `educationDetails`
- `branchPreferences`
- `applicationStatus`

**Operations**
- `validate()`
- `submit()`
- `lockApplication()`

### Document
**Attributes**
- `documentId`
- `documentType`
- `uploadDate`
- `verificationStatus`

**Operations**
- `upload()`
- `updateStatus()`

### Payment
**Attributes**
- `paymentId`
- `amount`
- `paymentDate`
- `paymentStatus`
- `receiptNumber`

**Operations**
- `processPayment()`
- `generateReceipt()`

### AdmissionRound
**Attributes**
- `roundId`
- `roundNumber`
- `programme`
- `status`
- `startDate`
- `endDate`

**Operations**
- `createRound()`
- `closeRound()`

### SeatAllotment
**Attributes**
- `allotmentId`
- `allotmentStatus`
- `allottedProgramme`

**Operations**
- `allocateSeat()`
- `updateStatus()`

### DigitalChecklist
**Attributes**
- `checklistId`
- `overallStatus`

**Operations**
- `createChecklist()`
- `updateStatus()`

### ChecklistItem
**Attributes**
- `itemId`
- `documentStep`
- `verificationStatus`
- `verifiedBy`
- `verificationDateTime`

**Operations**
- `markVerified()`

### QRGatePass
**Attributes**
- `gatePassId`
- `qrCodeValue`
- `purpose`
- `date`
- `timeSlot`
- `validityStatus`

**Operations**
- `generateQR()`
- `validate()`

### Notification
**Attributes**
- `notificationId`
- `recipient`
- `type`
- `message`
- `timestamp`
- `status`

**Operations**
- `send()`
- `markRead()`

### Report
**Attributes**
- `reportId`
- `reportType`
- `generatedDate`

**Operations**
- `generate()`
- `export()`

### AdmissionDecision
**Attributes**
- `decisionId`
- `decisionStatus`
- `decisionDate`

**Operations**
- `recordDecision()`

## 3. Inheritance shown in the diagram

- `Applicant` is shown as a specialization of `User`.
- `Verifier` is shown as a specialization of `User`.
- `Administrator` is shown as a specialization of `User`.

Refer to `diagrams/Class-Diagram.png` for the original visual representation.
