/** Response contract of POST /api/waitlist, shared by the route and the form. */
export type WaitlistStatus = "created" | "duplicate" | "invalid" | "rate_limited" | "error";
