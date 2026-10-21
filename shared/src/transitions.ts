import {
  AdmissionStage,
  ApplicationStatus,
  ChecklistItemStatus,
  ChecklistStatus,
  DocumentStatus,
  GatePassValidity,
  PaymentStatus,
  RoundStatus,
  SeatPublication,
  SeatResponse,
} from './enums';

export type TransitionTable<T extends string> = Record<T, readonly T[]>;

export function canTransition<T extends string>(
  table: TransitionTable<T>,
  from: T,
  to: T,
): boolean {
  return (table[from] ?? []).includes(to);
}

export const APPLICATION_STATUS_TRANSITIONS: TransitionTable<ApplicationStatus> = {
  Draft: ['Submitted'],
  Submitted: ['UnderReview'],
  UnderReview: ['Eligible', 'Rejected'],
  Eligible: [],
  Rejected: [],
};

export const ADMISSION_STAGE_TRANSITIONS: TransitionTable<AdmissionStage> = {
  Registered: ['ApplicationInProgress'],
  ApplicationInProgress: ['Submitted', 'Withdrawn'],
  Submitted: ['UnderReview', 'Withdrawn'],
  UnderReview: ['Eligible', 'Rejected'],
  Eligible: ['InRound', 'Withdrawn'],
  InRound: ['Waitlisted', 'SeatConfirmed', 'NotAllotted', 'Withdrawn', 'InRound'],
  Waitlisted: ['InRound', 'SeatConfirmed', 'NotAllotted', 'Withdrawn'],
  SeatConfirmed: ['PaymentPending', 'Withdrawn'],
  PaymentPending: ['PaymentCompleted'],
  PaymentCompleted: ['VerificationPending'],
  VerificationPending: ['AdmissionConfirmed'],
  AdmissionConfirmed: [],
  Rejected: [],
  NotAllotted: [],
  Withdrawn: [],
};

export const ROUND_STATUS_TRANSITIONS: TransitionTable<RoundStatus> = {
  Draft: ['Open'],
  Open: ['AllotmentRun', 'Closed'],
  AllotmentRun: ['Open', 'Published'],
  Published: ['Closed'],
  Closed: [],
};

export const SEAT_PUBLICATION_TRANSITIONS: TransitionTable<SeatPublication> = {
  Proposed: ['Published'],
  Published: ['Revised'],
  Revised: ['Published'],
};

export const SEAT_RESPONSE_TRANSITIONS: TransitionTable<SeatResponse> = {
  Pending: ['Accepted', 'OptedNextRound', 'Declined', 'Expired'],
  Accepted: [],
  OptedNextRound: [],
  Declined: [],
  Expired: [],
};

export const DOCUMENT_STATUS_TRANSITIONS: TransitionTable<DocumentStatus> = {
  Uploaded: ['UnderVerification'],
  UnderVerification: ['Rejected'],
  Rejected: ['Uploaded'],
};

export const PAYMENT_STATUS_TRANSITIONS: TransitionTable<PaymentStatus> = {
  Pending: ['Success', 'Failed'],
  Failed: ['Pending', 'Success'],
  Success: [],
};

export const CHECKLIST_STATUS_TRANSITIONS: TransitionTable<ChecklistStatus> = {
  NotGenerated: ['Pending'],
  Pending: ['PartiallyVerified', 'FullyVerified'],
  PartiallyVerified: ['FullyVerified', 'PartiallyVerified'],
  FullyVerified: [],
};

export const CHECKLIST_ITEM_TRANSITIONS: TransitionTable<ChecklistItemStatus> = {
  Pending: ['Verified', 'NotVerified'],
  NotVerified: ['Verified', 'NotVerified'],
  Verified: [],
};

export const GATE_PASS_TRANSITIONS: TransitionTable<GatePassValidity> = {
  Valid: ['Used', 'Expired', 'Revoked'],
  Used: [],
  Expired: [],
  Revoked: [],
};
