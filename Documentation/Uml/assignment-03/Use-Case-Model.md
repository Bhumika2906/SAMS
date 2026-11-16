# SAMS — Assignment 3: Use-Case Model

## 1. System
**Student Admission Management System (SAMS)**

This model records the actors and use cases shown in the supplied Assignment 3 use-case diagram. The activity diagrams supplied with it describe UC-002, UC-008, and UC-012.

## 2. Actors

| Actor | Responsibilities shown in the diagram |
|---|---|
| Applicant / Student | Register and log in; fill and submit an application; view the process tracker; view admission round / seat allotment; receive application, status, checklist, and gate-pass information. |
| Faculty / Verifier | Scan QR and verify documents; provide verification input. |
| Admission Administrator | Manage admission setup; manage admission rounds and seat allotment; generate reports; monitor applications. |
| Institute Management | Stakeholder shown in the use-case diagram. A specific use-case association is not clearly drawn in the supplied image. |
| Payment Gateway | External service involved in the application-fee payment interaction. |
| Notification Service (Email/SMS) | External service used to send notifications. |

## 3. Use Cases

| ID / Name | Brief description |
|---|---|
| UC-001 — Register and Login | Allows an applicant to register and access SAMS. |
| UC-002 — Fill and Submit Application | Allows an applicant to enter application details, upload documents, pay the application fee, review, and submit the application. |
| UC-003 — View Process Tracker | Allows an applicant to view process status. |
| UC-004 — View Admission Round / Seat Allotment | Allows an applicant to view admission-round and allotment information. |
| UC-005 — Manage Admission Setup | Allows the admission administrator to configure admission setup. |
| UC-006 — Manage Admission Rounds and Seat Allotment | Allows the administrator to manage rounds and update allotment decisions. Detailed activity flow is documented as UC-012 in the supplied activity diagram. |
| UC-007 — Generate Reports | Allows the admission administrator to generate reports. |
| UC-008 — Scan QR and Verify Documents | Allows a faculty member / verifier to scan the applicant QR pass, view the checklist, and verify original documents. |
| UC-009 — Upload Documents | Included in the application-submission flow in the use-case diagram. |
| UC-010 — Pay Application Fee | Included in the application-submission flow and interacts with the Payment Gateway. |
| UC-011 — Generate Digital Checklist and QR Gate Pass | Generates checklist and gate-pass details for the applicant. |
| UC-012 — Send Notifications | Sends status updates, alerts, and deadline notifications through the Notification Service. |
| UC-013 — Monitor Applications | Allows application monitoring. |

*Note:* The use-case diagram image does not show explicit numeric IDs for every oval. The UC-001–UC-013 identifiers above are a documentation index; the three activity diagrams retain their displayed identifiers UC-002, UC-008, and UC-012.

## 4. Relationships

- **Fill and Submit Application** includes **Upload Documents**.
- **Fill and Submit Application** includes **Pay Application Fee**.
- **Scan QR and Verify Documents** includes **Auto-Update Checklist**.
- **Manage Admission Rounds and Seat Allotment** includes **Generate Digital Checklist and QR Gate Pass**.
- **Manage Admission Rounds and Seat Allotment** includes **Send Notifications**.
- The Payment Gateway participates in the application-fee request and payment-confirmation / receipt exchange.
- The Notification Service supports alerts, status updates, and deadlines.

## 5. Activity Diagrams

The supplied diagram files are stored without image edits in `diagrams/`:

1. `Activity-Diagram-UC01.png` — source image title: **UC-002 — Fill and Submit Application**
2. `Activity-Diagram-UC02.png` — source image title: **UC-008 — Scan QR and Verify Documents**
3. `Activity-Diagram-UC03.png` — source image title: **UC-012 — Manage Admission Rounds and Seat Allotment**

The filenames follow the requested naming sequence. The titles printed inside the images have not been altered.
