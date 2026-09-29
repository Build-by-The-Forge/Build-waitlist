export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id?: string }>;
}

/** Delivery failed. `message` is safe to log: it never contains secrets or the email body. */
export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export class EmailNotConfiguredError extends Error {
  constructor(detail: string) {
    super(`Email delivery is not configured: ${detail}`);
    this.name = "EmailNotConfiguredError";
  }
}
