import { ApplicationStatus, PaymentStatus, SeatResponse } from './enums';
import {
  APPLICATION_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
  SEAT_RESPONSE_TRANSITIONS,
  canTransition,
} from './transitions';

describe('state-transition tables', () => {
  it('allows Draft → Submitted and rejects skipping to Eligible', () => {
    expect(canTransition(APPLICATION_STATUS_TRANSITIONS, ApplicationStatus.Draft, ApplicationStatus.Submitted)).toBe(
      true,
    );
    expect(canTransition(APPLICATION_STATUS_TRANSITIONS, ApplicationStatus.Draft, ApplicationStatus.Eligible)).toBe(
      false,
    );
  });

  it('rejects transitions out of terminal application statuses', () => {
    expect(canTransition(APPLICATION_STATUS_TRANSITIONS, ApplicationStatus.Rejected, ApplicationStatus.Draft)).toBe(
      false,
    );
    expect(canTransition(APPLICATION_STATUS_TRANSITIONS, ApplicationStatus.Eligible, ApplicationStatus.Submitted)).toBe(
      false,
    );
  });

  it('allows payment retry after failure but not after success', () => {
    expect(canTransition(PAYMENT_STATUS_TRANSITIONS, PaymentStatus.Failed, PaymentStatus.Pending)).toBe(true);
    expect(canTransition(PAYMENT_STATUS_TRANSITIONS, PaymentStatus.Success, PaymentStatus.Failed)).toBe(false);
  });

  it('allows a pending seat response to Accept or Decline once', () => {
    expect(canTransition(SEAT_RESPONSE_TRANSITIONS, SeatResponse.Pending, SeatResponse.Accepted)).toBe(true);
    expect(canTransition(SEAT_RESPONSE_TRANSITIONS, SeatResponse.Accepted, SeatResponse.Declined)).toBe(false);
  });
});
