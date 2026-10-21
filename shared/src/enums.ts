export const UserRole = {
  Applicant: 'Applicant',
  FacultyVerifier: 'FacultyVerifier',
  AdministratorUser: 'AdministratorUser',
  Management: 'Management',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const USER_ROLES = Object.values(UserRole);

export const ApplicationStatus = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  UnderReview: 'UnderReview',
  Eligible: 'Eligible',
  Rejected: 'Rejected',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];
export const APPLICATION_STATUSES = Object.values(ApplicationStatus);

export const AdmissionStage = {
  Registered: 'Registered',
  ApplicationInProgress: 'ApplicationInProgress',
  Submitted: 'Submitted',
  UnderReview: 'UnderReview',
  Eligible: 'Eligible',
  InRound: 'InRound',
  Waitlisted: 'Waitlisted',
  SeatConfirmed: 'SeatConfirmed',
  PaymentPending: 'PaymentPending',
  PaymentCompleted: 'PaymentCompleted',
  VerificationPending: 'VerificationPending',
  AdmissionConfirmed: 'AdmissionConfirmed',
  Rejected: 'Rejected',
  NotAllotted: 'NotAllotted',
  Withdrawn: 'Withdrawn',
} as const;
export type AdmissionStage = (typeof AdmissionStage)[keyof typeof AdmissionStage];
export const ADMISSION_STAGES = Object.values(AdmissionStage);

export const SeatPublication = {
  Proposed: 'Proposed',
  Published: 'Published',
  Revised: 'Revised',
} as const;
export type SeatPublication = (typeof SeatPublication)[keyof typeof SeatPublication];

export const SeatResult = {
  Allotted: 'Allotted',
  Waitlisted: 'Waitlisted',
  NotAllotted: 'NotAllotted',
} as const;
export type SeatResult = (typeof SeatResult)[keyof typeof SeatResult];

export const SeatResponse = {
  Pending: 'Pending',
  Accepted: 'Accepted',
  OptedNextRound: 'OptedNextRound',
  Declined: 'Declined',
  Expired: 'Expired',
} as const;
export type SeatResponse = (typeof SeatResponse)[keyof typeof SeatResponse];

export const RoundStatus = {
  Draft: 'Draft',
  Open: 'Open',
  AllotmentRun: 'AllotmentRun',
  Published: 'Published',
  Closed: 'Closed',
} as const;
export type RoundStatus = (typeof RoundStatus)[keyof typeof RoundStatus];

export const DocumentStatus = {
  Uploaded: 'Uploaded',
  UnderVerification: 'UnderVerification',
  Rejected: 'Rejected',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const PaymentStatus = {
  Pending: 'Pending',
  Success: 'Success',
  Failed: 'Failed',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ChecklistStatus = {
  NotGenerated: 'NotGenerated',
  Pending: 'Pending',
  PartiallyVerified: 'PartiallyVerified',
  FullyVerified: 'FullyVerified',
} as const;
export type ChecklistStatus = (typeof ChecklistStatus)[keyof typeof ChecklistStatus];

export const ChecklistItemStatus = {
  Pending: 'Pending',
  Verified: 'Verified',
  NotVerified: 'NotVerified',
} as const;
export type ChecklistItemStatus = (typeof ChecklistItemStatus)[keyof typeof ChecklistItemStatus];

export const GatePassValidity = {
  Valid: 'Valid',
  Used: 'Used',
  Expired: 'Expired',
  Revoked: 'Revoked',
} as const;
export type GatePassValidity = (typeof GatePassValidity)[keyof typeof GatePassValidity];
