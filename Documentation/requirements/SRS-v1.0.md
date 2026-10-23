# Software Requirements Specification (SRS)

## Student Admission Management System (SAMS)

**Document ID:** SAMS-SRS-v1.0\
**Version:** 1.0\
**Project Team:** T001\
**Institution:** The LNM Institute of Information Technology, Jaipur\
**Status:** Initial requirements baseline\
**Prepared by:** SAMS Team T001

------------------------------------------------------------------------

## Document Purpose

This document defines the requirements baseline for the Student
Admission Management System (SAMS). It describes the system context,
user classes, initial functional requirements, business rules, quality
requirements, data requirements, use-case summaries, acceptance
criteria, prioritization, and traceability.

The data model covers all ten entities identified for SAMS. The current
prototype implementation milestone is limited to the shared data
foundation and functional requirements FR-001 through FR-005. Later
admission workflows are part of the intended system direction but are
not considered implemented in this milestone.

## 1. Introduction

### 1.1 Purpose

SAMS is intended to support and organize the student admission process
through a common system for applicants, faculty/verifiers, and
administrators. This SRS provides a shared reference for design,
development, testing, documentation, and academic evaluation.

### 1.2 Scope

The intended SAMS system provides a foundation for managing applicant
accounts and application identifiers, authentication, role-based access,
application information, documents, payments, admission rounds, seat
allotments, checklists, QR gate passes, and notifications.

For the current prototype milestone, the implementation scope is: -
Registration and account verification behaviour. - Unique application ID
generation. - Login. - Password setup/reset. - Role-based access control
for applicants, verifiers, and administrators. - The complete ten-entity
data foundation. - Initial module shells and project documentation.

Application submission, document verification, payment processing,
admission decisions, seat allotment, QR scanning, and notification
delivery are future workflows and must not be represented as completed
functionality in the current prototype.

### 1.3 Intended Audience

This document is intended for: - Project team members responsible for
architecture, development, testing, and documentation. - The course
instructor and evaluators. - Developers implementing the system. -
Testers verifying requirements. - Reviewers checking consistency between
requirements, models, code, and tests.

### 1.4 Definitions and Abbreviations

  -----------------------------------------------------------------------
  Term                                Meaning
  ----------------------------------- -----------------------------------
  SAMS                                Student Admission Management System

  SRS                                 Software Requirements Specification

  FR                                  Functional Requirement

  NFR                                 Non-Functional Requirement

  Applicant                           A person creating an account to
                                      participate in the admission
                                      process

  Verifier                            An authorized faculty/staff user
                                      who will verify admission-related
                                      information in a later workflow

  Administrator                       An authorized user responsible for
                                      system-level admission
                                      administration

  Application ID                      A unique identifier associated with
                                      an applicant account/application

  RBAC                                Role-Based Access Control

  Prototype                           An academic demonstration build
                                      that may simulate external services
                                      and does not claim production
                                      readiness
  -----------------------------------------------------------------------

### 1.5 References

-   SAMS Team Role & Workflow Charter,
    `SAMS_Team_Role_Workflow_Charter_FINAL.pdf`.
-   Lab Assignment 1: Project Identification and Initial Project
    Definition.
-   Lab Assignment 2: Requirements Specification / SRS.
-   Lab Assignment 3: Scenario, Use-Case, and Activity Modelling.
-   Lab Assignment 4: Class, Object, and Relationship Modelling.
-   Lab Assignment 5: Collaboration, State, and Component Modelling.

The assignment documents and team charter are the project references.
Any requirement not explicitly confirmed in those materials should be
reviewed by the team before being treated as approved.

## 2. Overall Description

### 2.1 Product Perspective

SAMS is a role-based application with a client interface, server-side
application logic, shared authentication and authorization services, and
a relational data store. The intended system is organized into the
following modules: - `applicant` - `admin-verifier` - `reports-payment`

Shared components provide common UI elements, API communication,
authentication, database access, middleware, and notification-service
interfaces.

For the current prototype, the functional focus is account registration
and authentication. Other modules may be represented by clearly labelled
planned-feature screens, but their business workflows are outside the
current implementation boundary.

### 2.2 User Classes and Characteristics

#### Applicant

-   Creates an account.
-   Completes the registration and verification flow.
-   Receives a unique application ID.
-   Logs in and accesses applicant-specific screens.
-   Must not access verifier-only or administrator-only functionality.

#### Faculty / Verifier

-   Uses an assigned verifier account.
-   Can authenticate and access the verifier dashboard shell.
-   Future responsibilities include checking documents, checklists, and
    QR gate passes; those workflows are not part of the current
    implementation milestone.

#### Administrator

-   Uses an authorized administrator account.
-   Can authenticate and access the administrator dashboard shell.
-   Future responsibilities include admission configuration, rounds,
    decisions, allotment, and reporting; those workflows are not part of
    the current implementation milestone.

#### Project Maintainers

-   Develop and maintain the codebase, schema, API contract, tests, and
    documentation.
-   Development-only seed accounts may be used for classroom
    demonstration and must not be treated as production credentials.

### 2.3 Operating Environment

The prototype is intended to run as a responsive web application on
modern desktop and mobile browsers. The implementation may use a
JavaScript-based frontend, a Node.js/Express backend, and a local
relational database for demonstration. Exact deployment infrastructure
is not specified by this SRS.

### 2.4 Constraints

-   Access must be enforced by the server, not only by hiding frontend
    controls.
-   Public registration must not permit a user to assign themselves the
    administrator role.
-   Passwords must not be stored in plaintext.
-   External email/SMS verification may be simulated for classroom
    demonstration when no provider is configured; the interface must
    label this clearly as demo verification.
-   Future workflows must not be presented as functional until
    implemented and tested.
-   Existing assignment documents and their required repository paths
    must be preserved.

### 2.5 Assumptions and Dependencies

-   Users have access to a supported web browser and a network
    connection to the running prototype.
-   Development and demonstration environments can use a local database.
-   Real email, SMS, payment, and QR-scanning integrations are not
    assumed to be available for the current milestone.
-   Demonstration accounts and sample data, if used, are fictional.
-   The detailed behaviour of requirements beyond FR-005 must be
    confirmed against the approved assignment materials before
    implementation.

## 3. System Context

### 3.1 External Actors

-   Applicant
-   Faculty / Verifier
-   Administrator

### 3.2 System Boundary

SAMS is responsible for account creation, authentication, application ID
generation, user-profile retrieval, and role-based authorization in the
current milestone. The complete intended system will also manage
admission-related records and workflows represented by the ten data
entities in Section 5.

External services such as email/SMS providers and payment gateways are
not assumed to be integrated in the current prototype.

**Diagram location:** `docs/requirements/diagrams/System-Context.png`

The existing system-context diagram should be stored at this path and
kept consistent with the approved assignment model.

## 4. Functional Requirements

Requirements are assigned stable IDs for traceability. FR-001 through
FR-005 define the current functional implementation boundary.

### FR-001 --- Account Registration and Verification

The system shall allow an applicant to register an account by providing
the required identity and contact details and credentials. The system
shall validate required inputs and prevent duplicate account
identifiers. The system shall provide an account-verification step or
status. If real email/SMS delivery is unavailable in the prototype,
verification may be simulated and must be labelled as demo verification.

**Priority:** Must have\
**Current milestone:** In scope

### FR-002 --- Unique Application ID Generation

After successful applicant registration, the system shall generate and
associate a unique application ID with the applicant account. The
application ID shall be displayed to the applicant and retrievable for
authenticated account views. The system shall not assign the same
application ID to multiple accounts.

**Priority:** Must have\
**Current milestone:** In scope

### FR-003 --- User Login

The system shall allow a registered user to authenticate using valid
configured credentials. The system shall reject invalid credentials with
a safe error message and shall not reveal sensitive account information
through authentication errors.

**Priority:** Must have\
**Current milestone:** In scope

### FR-004 --- Password Setup and Reset

The system shall provide password setup/reset behaviour appropriate to
the prototype's authentication design. Passwords shall be stored using a
suitable password-hashing method and shall never be returned by an API.
Reset responses shall not disclose whether a particular email address or
account exists.

**Priority:** Must have\
**Current milestone:** In scope

### FR-005 --- Role-Based Access Control

The system shall support the roles Applicant, Verifier, and
Administrator. The system shall associate each authenticated user with
an assigned role and enforce authorization on protected server routes.
Users shall not gain privileges by modifying client-side data or request
payloads. Public registration shall not allow the user to select the
Administrator role.

**Priority:** Must have\
**Current milestone:** In scope

### Requirements Beyond the Current Milestone

The complete intended system includes additional workflows related to
application details, documents, payments, admission tracking, admission
rounds, seat allotment, digital checklists, QR gate passes,
verification, reporting, and notifications. Their detailed functional
requirements and acceptance criteria must be taken from the approved
source requirements and maintained in the relevant assignment artefacts.
They are not authorized for implementation in the current FR-001--FR-005
milestone by this document.

## 5. Data Requirements

The database foundation shall represent the following ten entities.
Field types and implementation-specific naming may vary as long as the
meaning, relationships, and constraints are preserved. Sensitive
credentials such as password hashes must not be exposed in API
responses.

### 5.1 User

**Purpose:** Represents an account that can authenticate to SAMS.

  -----------------------------------------------------------------------
  Attribute                           Description
  ----------------------------------- -----------------------------------
  `id`                                Primary identifier

  `applicationId`                     Unique application identifier
                                      associated with an applicant
                                      account where applicable

  `name`                              User's display name

  `email`                             Email address

  `mobile`                            Mobile number

  `role`                              Assigned role: applicant, verifier,
                                      or admin

  `accountStatus`                     Account/verification status
  -----------------------------------------------------------------------

Email/mobile uniqueness constraints should follow the approved
registration policy. Password credentials must be stored securely; the
credential storage field may be added as an implementation necessity and
must not be returned to clients.

### 5.2 Application

**Purpose:** Represents the applicant's admission application
information.

  Attribute             Description
  --------------------- ------------------------------------------
  `id`                  Primary identifier
  `userId`              Reference to the associated user
  `personalInfo`        Structured personal information
  `address`             Address information
  `educationDetails`    Structured education information
  `branchPreferences`   Applicant's programme/branch preferences
  `status`              Application status

### 5.3 Document

**Purpose:** Represents a document associated with an application.

  Attribute              Description
  ---------------------- ------------------------------
  `id`                   Primary identifier
  `applicationId`        Reference to the application
  `type`                 Document type
  `uploadDate`           Date/time of upload
  `verificationStatus`   Verification state

The charter identifies the statuses Uploaded, Under Verification, and
Rejected. Document upload and verification workflows are outside the
current implementation milestone.

### 5.4 Payment

**Purpose:** Represents a payment record associated with an application.

  Attribute         Description
  ----------------- --------------------------------------
  `id`              Primary identifier
  `applicationId`   Reference to the application
  `amount`          Payment amount
  `paymentDate`     Payment date/time
  `status`          Payment status
  `receiptNumber`   Receipt identifier, where applicable

Payment processing is outside the current implementation milestone.

### 5.5 AdmissionRound

**Purpose:** Represents an admission round for a programme.

  Attribute       Description
  --------------- ----------------------
  `id`            Primary identifier
  `roundNumber`   Round number
  `programme`     Associated programme
  `status`        Round status
  `startDate`     Start date
  `endDate`       End date

### 5.6 SeatAllotment

**Purpose:** Represents a seat-allotment result associated with an
application and round.

  Attribute             Description
  --------------------- --------------------------------------
  `id`                  Primary identifier
  `applicationId`       Reference to the application
  `roundId`             Reference to the admission round
  `allotmentStatus`     Allotment status
  `allottedProgramme`   Programme allotted, where applicable

SeatAllotment is a separate entity and shall not be merged into
AdmissionRound.

### 5.7 DigitalChecklist

**Purpose:** Represents the checklist associated with an application.

  Attribute         Description
  ----------------- ----------------------------------------------------------
  `id`              Primary identifier
  `applicationId`   Reference to the application
  `items`           Checklist item collection or related item representation
  `overallStatus`   Overall checklist status

### 5.8 ChecklistItem

**Purpose:** Represents an individual checklist item and its
verification details.

  Attribute              Description
  ---------------------- ------------------------------------------
  `id`                   Primary identifier
  `checklistId`          Reference to the digital checklist
  `itemName`             Checklist item name
  `verificationStatus`   Item verification status
  `verifiedBy`           Verifier reference, where applicable
  `verifiedAt`           Verification date/time, where applicable

### 5.9 QRGatePass

**Purpose:** Represents a QR-based gate pass associated with an
application.

  Attribute          Description
  ------------------ ------------------------------
  `id`               Primary identifier
  `applicationId`    Reference to the application
  `qrValue`          QR payload/value
  `purpose`          Gate-pass purpose
  `date`             Applicable date
  `timeSlot`         Applicable time slot
  `validityStatus`   Gate-pass validity status

QR gate-pass generation and scanning are outside the current
implementation milestone.

### 5.10 Notification

**Purpose:** Represents a notification intended for a recipient.

  Attribute     Description
  ------------- --------------------------------------------
  `id`          Primary identifier
  `recipient`   Intended recipient reference or identifier
  `type`        Notification type
  `message`     Notification content
  `timestamp`   Creation date/time
  `status`      Notification status

Notification is one entity; a repeated row in an extracted charter table
does not represent a second entity.

### 5.11 Data Integrity

-   Primary keys shall uniquely identify records.
-   Foreign-key relationships shall be enforced where supported by the
    database.
-   User application identifiers shall be unique when assigned.
-   Application-linked records shall reference valid applications.
-   Checklist items shall reference a valid checklist.
-   Seat allotments shall reference a valid application and admission
    round.
-   Dates, amounts, statuses, and required identifiers shall be
    validated before persistence.
-   Sample data shall be fictional and identified as demonstration data.

## 6. Business Rules

  -----------------------------------------------------------------------
  ID                                  Rule
  ----------------------------------- -----------------------------------
  BR-01                               Every registered account must have
                                      an assigned role.

  BR-02                               Public registration creates an
                                      Applicant account; it must not
                                      create an Administrator account.

  BR-03                               An application ID must be unique
                                      and associated with the relevant
                                      applicant account.

  BR-04                               Passwords must not be stored or
                                      transmitted in plaintext by the
                                      system.

  BR-05                               Access to protected resources must
                                      be checked on the server using the
                                      authenticated user's assigned role.

  BR-06                               A user must not gain authorization
                                      by changing frontend state or
                                      submitting a different role in a
                                      request.

  BR-07                               Simulated verification must be
                                      clearly identified as a
                                      demonstration and must not claim
                                      real email/SMS delivery.

  BR-08                               Features outside FR-001--FR-005
                                      must be labelled planned or coming
                                      soon until implemented and tested.

  BR-09                               Demonstration accounts and records
                                      must use fictional data.
  -----------------------------------------------------------------------

## 7. Non-Functional Requirements

The following quality requirements apply to the prototype. Numeric
performance targets are not specified in the available project
requirements and should be agreed by the team if formal load testing is
required.

### NFR-01 --- Usability

The interface shall use clear labels, understandable validation
messages, and consistent navigation. Registration and login shall be
usable without requiring technical knowledge.

### NFR-02 --- Responsive Design

The application shall support phone, tablet, and desktop viewport sizes
without horizontal overflow or loss of essential functionality.

### NFR-03 --- Security

The system shall hash passwords, validate inputs, avoid exposing
secrets, and enforce authorization on the server. Authentication
failures shall use safe messages.

### NFR-04 --- Data Integrity

The database shall use suitable keys, constraints, and relationships to
prevent duplicate application IDs and invalid references.

### NFR-05 --- Maintainability

Frontend modules, backend modules, shared infrastructure, tests, and
documentation shall be organized according to the team-agreed repository
structure.

### NFR-06 --- Testability

Core authentication and authorization behaviours shall be testable
through automated tests or documented reproducible manual tests.

### NFR-07 --- Compatibility

The web interface shall work in current mainstream desktop and mobile
browsers supported by the development environment.

### NFR-08 --- Honest Prototype Status

The user interface and documentation shall distinguish implemented
functionality from planned features. The system shall not fabricate
admission outcomes, completed payments, verification results, or real
notifications.

### NFR-09 --- Configuration

Environment-specific settings and secrets shall be configured outside
source code. An `.env.example` file shall document required variable
names with safe placeholder values.

### NFR-10 --- Error Handling

The system shall handle invalid input, authentication failures, and
unexpected server errors without exposing stack traces or sensitive
internal information to end users.

## 8. Use-Case Summaries

These summaries describe the current authentication scope. The detailed
use-case and activity models required by the assignments must remain
consistent with the selected use cases in the team's approved assignment
documents.

### UC-01 --- Register Applicant Account

**Primary actor:** Applicant\
**Precondition:** The applicant does not already have an account using
the same unique account identifier.\
**Main flow:** 1. The applicant opens the registration screen. 2. The
applicant enters required details and credentials. 3. The system
validates the input. 4. The system checks for duplicate account
identifiers. 5. The system creates the applicant account. 6. The system
generates a unique application ID. 7. The system presents the
registration result and application ID. 8. The system records or
presents the account-verification status.

**Alternative flows:** - Invalid input is rejected with field-level
guidance. - Duplicate account details are rejected with a safe
message. - If external verification is unavailable, the prototype uses a
clearly labelled demo verification flow.

**Postcondition:** A valid applicant account exists with a unique
application ID, or registration has failed without creating a duplicate
account.

### UC-02 --- Log In

**Primary actor:** Registered user\
**Precondition:** The user has an account.\
**Main flow:** 1. The user opens the login screen. 2. The user enters
credentials. 3. The system validates the credentials. 4. The system
establishes authenticated state. 5. The system returns the user's
assigned role and permitted profile information. 6. The interface opens
the appropriate role-specific dashboard.

**Alternative flow:** Invalid credentials are rejected with a safe error
message.

**Postcondition:** A valid user is authenticated, or no authenticated
session is established.

### UC-03 --- Access Role-Specific Area

**Primary actor:** Authenticated applicant, verifier, or administrator\
**Precondition:** The user has authenticated successfully.\
**Main flow:** 1. The user requests a protected page or API resource. 2.
The system verifies authentication. 3. The system checks the assigned
role against the resource's access policy. 4. The system grants access
if authorized. 5. The system rejects unauthorized access.

**Postcondition:** The user can access only the areas permitted for
their assigned role.

Password reset is a separate functional requirement under FR-004 and
shall be tested even if the detailed assignment use-case set represents
it within the authentication flow.

## 9. Acceptance Criteria

  -----------------------------------------------------------------------
  Requirement                         Acceptance criteria
  ----------------------------------- -----------------------------------
  FR-001                              Valid registration data creates an
                                      applicant account; invalid and
                                      duplicate data are rejected; demo
                                      verification is clearly labelled if
                                      simulated.

  FR-002                              A successful registration returns
                                      an application ID; separate
                                      registrations receive distinct IDs;
                                      the ID can be retrieved for the
                                      authenticated user.

  FR-003                              Valid credentials authenticate;
                                      invalid credentials do not
                                      authenticate; responses do not
                                      disclose sensitive account details.

  FR-004                              Passwords are stored as hashes;
                                      password setup/reset follows the
                                      configured flow; reset responses do
                                      not reveal account existence.

  FR-005                              Applicant, verifier, and
                                      administrator accounts receive
                                      their assigned access;
                                      unauthenticated and unauthorized
                                      requests are rejected; public
                                      registration cannot assign the
                                      admin role.

  Data model                          All ten required entities exist in
                                      the schema with documented keys and
                                      relationships.

  Prototype UI                        Core screens work at mobile and
                                      desktop widths; future features are
                                      clearly marked planned or coming
                                      soon.
  -----------------------------------------------------------------------

## 10. Requirement Prioritization

The current milestone uses the following priority scheme:

-   **Must have:** Required for the current demonstration and
    implementation boundary.
-   **Planned:** Part of the intended broader system but not authorized
    for implementation in this milestone.
-   **Not specified:** Requires confirmation from the approved
    assignment materials before a detailed requirement is added.

  -----------------------------------------------------------------------
  Requirement area        Priority for current    Status
                          milestone               
  ----------------------- ----------------------- -----------------------
  Registration and        Must have               Implement now
  verification behaviour                          

  Unique application ID   Must have               Implement now

  Login                   Must have               Implement now

  Password setup/reset    Must have               Implement now

  Role-based access       Must have               Implement now

  Ten-entity data         Must have               Implement now
  foundation                                      

  Application details and Planned                 Out of current
  submission                                      implementation scope

  Document upload and     Planned                 Out of current
  verification                                    implementation scope

  Payment processing and  Planned                 Out of current
  receipts                                        implementation scope

  Admission rounds and    Planned                 Out of current
  seat allotment                                  implementation scope

  Digital checklist and   Planned                 Out of current
  QR gate pass                                    implementation scope

  Reporting and real      Planned                 Out of current
  notification delivery                           implementation scope
  -----------------------------------------------------------------------

## 11. Requirement Traceability

  ---------------------------------------------------------------------------------------------------------
  Requirement / data item         Design or implementation artefact                 Verification approach
  ------------------------------- ------------------------------------------------- -----------------------
  FR-001                          Registration UI, registration API, User entity    Registration tests,
                                                                                    validation tests

  FR-002                          Application ID generation logic, User entity      Uniqueness and
                                                                                    registration tests

  FR-003                          Login UI, authentication API                      Valid/invalid login
                                                                                    tests

  FR-004                          Password setup/reset flow, credential storage     Password hashing and
                                                                                    reset tests

  FR-005                          Authentication middleware, role policies, role    Authorization tests for
                                  dashboards                                        each role

  User                            Database schema and class model                   Schema and relationship
                                                                                    checks

  Application                     Database schema and class model                   Foreign-key and schema
                                                                                    checks

  Document                        Database schema and class model                   Schema checks

  Payment                         Database schema and class model                   Schema checks

  AdmissionRound                  Database schema and class model                   Schema checks

  SeatAllotment                   Database schema and class model                   Relationship checks

  DigitalChecklist                Database schema and class model                   Schema checks

  ChecklistItem                   Database schema and class model                   Foreign-key and schema
                                                                                    checks

  QRGatePass                      Database schema and class model                   Schema checks

  Notification                    Database schema and class model                   Schema checks

  System context                  `docs/requirements/diagrams/System-Context.png`   Review against actors
                                                                                    and system boundary

  Use cases and activity models   Assignment 3 deliverables                         Consistency review

  Class/object models             Assignment 4 deliverables                         Consistency review

  Collaboration/state/component   Assignment 5 deliverables                         Consistency review
  models                                                                            
  ---------------------------------------------------------------------------------------------------------

## 12. Validation and Review

Before this SRS is treated as finalized: 1. Compare each requirement
against the approved Assignment 2 materials and team charter. 2. Confirm
terminology and status values against the class model and data
requirements. 3. Confirm that the system-context diagram matches the
described actors and boundary. 4. Confirm that Assignment 3--5 models
remain consistent with the approved detailed use cases and requirements.
5. Review requirements for clarity, consistency, testability, and
traceability. 6. Record any unresolved ambiguity for team/instructor
review rather than silently inventing behaviour. 7. Update the document
version and change history when approved changes are made.

## 13. Current Milestone Boundary and Limitations

This SRS describes the intended SAMS domain and the current
authentication milestone. Only FR-001 through FR-005 are in the present
implementation boundary. The remaining admission workflows are planned
and must not be claimed as implemented until they are developed,
integrated, and verified.

Real email/SMS delivery, payment-gateway integration, production
deployment, and real QR scanning are not assumed to be available in the
current prototype. Any simulated behaviour must be visibly identified as
such.

## 14. Change History

  -----------------------------------------------------------------------
  Version                             Description
  ----------------------------------- -----------------------------------
  0.1                                 Initial requirements draft prepared
                                      for team review.

  1.0                                 Baseline version for review;
                                      confirm against approved Assignment
                                      2 source before final submission.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

**Suggested commit messages** -
`docs: add initial requirements specification` -
`docs: finalize SRS v1.0`
