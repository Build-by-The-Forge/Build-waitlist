/** Response contract of POST /api/waitlist, shared by the route and the form. */
export type WaitlistStatus =
  /** New or still-pending address: a verification link is on its way (or was just sent). */
  | "verification_sent"
  /** Address is already verified. */
  | "duplicate"
  | "invalid"
  /** Well-formed address whose domain can't receive email. */
  | "invalid_domain"
  | "rate_limited"
  /** Signup saved as pending, but the email couldn't be sent right now. */
  | "email_failed"
  | "error";
