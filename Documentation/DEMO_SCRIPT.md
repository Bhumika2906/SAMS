# SAMS Demo Presentation Script

This script walks through the end-to-end admission process for the Student Admission Management System (SAMS) presentation demo.

All seeded demo accounts use the standard password: `Password@123`

---

## 1. Demo Credentials Summary

| Role | Email | Status in Seed Data |
|---|---|---|
| **Applicant (New/Draft)** | `applicant1@sams.test` | Application in progress; ready to fill & submit |
| **Applicant (Allotted)** | `applicant4@sams.test` | Allotted CSE in Round 1; ready to Accept seat |
| **Applicant (Accepted)** | `applicant5@sams.test` | Seat accepted; ready to pay admission fee |
| **Applicant (Pass Ready)** | `applicant6@sams.test` | Paid; QR Gate Pass & Checklist active; ready for verification |
| **Administrator** | `admin@sams.test` | Can manage rounds, run deterministic allotment, publish |
| **Faculty Verifier** | `faculty1@sams.test` | Counter 1 verifier; scans pass token and verifies checklist |
| **Management** | `management@sams.test` | Read-only executive dashboard and seat breakdown |

---

## 2. Step-by-Step Presentation Walkthrough

### Step 1: Application Form & Submission (Applicant)
1. **Login** as `applicant1@sams.test` (tap the "Applicant" quick-fill chip on the login screen).
2. Tap **"Fill Application"** or navigate to the Application tab.
3. Observe pre-filled personal information and fill in:
   - Qualifying Exam: `JEE Main`
   - Roll Number: `26030101`
   - Percentage / Score: `96.5`
   - Preferences: 1: `CSE`, 2: `CCE`, 3: `ECE`
4. Tap **"Save Draft"** to see persistence.
5. Tap **"Submit Application"**.
6. Observe:
   - Application is immediately **locked** (fields become read-only).
   - Tracker updates stage to **Submitted / Eligible**.

---

### Step 2: Admission Round & System Allotment (Admin)
1. Switch user / Log out and sign in as `admin@sams.test` (tap "Admin" chip).
2. Go to **"Manage Rounds"**:
   - Tap **"Create Round"** (e.g., Round 2 or inspect Round 1).
   - View the seat matrix across programmes:
     - `CSE`: 3 Capacity
     - `CCE`: 2 Capacity
     - `ECE`: 2 Capacity
3. Go to **"Run Allotment"**:
   - Select the active round.
   - Tap **"Execute Allotment"**.
   - Observe deterministic allotment execution:
     - Applicants are sorted by merit rank (lower rank number = higher priority).
     - Seats are filled based on top preferred choices without exceeding capacity.
4. Tap **"Publish Allotment Results"** to make outcomes visible to applicants.

---

### Step 3: Seat Acceptance (Applicant)
1. Log in as `applicant4@sams.test` (or `applicant1@sams.test` if allotted in Round 2).
2. Go to the **Admission** tab.
3. Observe:
   - Programme Allotted: `CSE` (Rank: 75).
   - Response options: **"Accept Seat"** or **"Decline"**.
4. Tap **"Accept Seat"**.
5. Observe:
   - Seat status updates to **Seat Confirmed**.
   - Application stage transitions to **Fee Payment Required**.

---

### Step 4: Simulated Payment & QR Gate Pass (Applicant)
1. Log in as `applicant5@sams.test` (who already accepted CCE) or continue with `applicant4`.
2. Go to the **Checklist & Verification** tab.
3. Notice the **SIMULATED PAYMENT GATEWAY**:
   - Tap **"Pay Success (Simulated)"**.
4. Observe immediate server-side side effects:
   - Payment receipt generated (e.g. `REC-...`).
   - Digital checklist instantiated with required verification items (Class 10, Class 12, JEE Score Card, ID Proof).
   - QR Gate Pass generated with a cryptographically secure random opaque token and scheduled time slot.
   - Gate Pass manual code is displayed (e.g., `sams_gate_pass_token_app6_secure_128bit` or newly generated code).

---

### Step 5: Document Verification at Campus Counter (Faculty)
1. Log in as `faculty1@sams.test` (tap "Faculty" chip).
2. Go to the **"Scan Gate Pass"** tab.
3. Enter or scan the Gate Pass Token:
   - Quick Demo Code: `sams_gate_pass_token_app6_secure_128bit` (Applicant 6 - Fatima Sheikh).
   - Tap **"Lookup Applicant"**.
4. Observe:
   - Candidate details appear (Fatima Sheikh, ECE, Merit Rank: 110).
   - Verification checklist items appear with **"Verify"** and **"Reject"** buttons.
5. Tap **"Verify"** on all mandatory items:
   - Class 10 Original Certificate & Marksheet → Verified
   - Class 12 Original Certificate & Marksheet → Verified
   - JEE Main Score Card → Verified
   - Government Photo ID Proof → Verified
6. Once all mandatory items are marked Verified:
   - System automatically transitions application stage to **Admission Confirmed**!

---

### Step 6: Final Status & Management Dashboard
1. Log in as `applicant6@sams.test`:
   - Tracker clearly shows **Admission Confirmed**!
2. Log in as `management@sams.test` (tap "Management" chip):
   - Real-time institutional overview:
     - Total Registered Applicants
     - Applications Submitted
     - Seats Allotted
     - Admissions Confirmed
     - Programme-wise base capacity and fee breakdown.
   - Screen is strictly read-only with no modification controls.
