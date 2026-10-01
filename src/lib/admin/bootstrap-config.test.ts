import { describe, expect, it } from "vitest";
import { parseBootstrapConfig } from "./bootstrap-config";

describe("parseBootstrapConfig", () => {
  it("reads the numbered admin bootstrap emails in order", () => {
    expect(
      parseBootstrapConfig({
        ADMIN_BOOTSTRAP_EMAIL_1: " A@Example.com ",
        ADMIN_BOOTSTRAP_EMAIL_2: "b@example.com",
        ADMIN_BOOTSTRAP_EMAIL_3: "C@example.com",
      }).emails,
    ).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
  });

  it("falls back to the legacy single bootstrap email when numbered values are absent", () => {
    expect(parseBootstrapConfig({ ADMIN_BOOTSTRAP_EMAIL: " Legacy@Example.com " }).emails).toEqual(["legacy@example.com"]);
  });

  it("prefers numbered values over the legacy variable", () => {
    expect(
      parseBootstrapConfig({
        ADMIN_BOOTSTRAP_EMAIL: "legacy@example.com",
        ADMIN_BOOTSTRAP_EMAIL_1: "one@example.com",
        ADMIN_BOOTSTRAP_EMAIL_2: "two@example.com",
      }).emails,
    ).toEqual(["one@example.com", "two@example.com"]);
  });

  it("ignores duplicates and malformed entries", () => {
    expect(
      parseBootstrapConfig({
        ADMIN_BOOTSTRAP_EMAIL_1: "one@example.com",
        ADMIN_BOOTSTRAP_EMAIL_2: " ONE@example.com ",
        ADMIN_BOOTSTRAP_EMAIL_3: "not-an-email",
      }),
    ).toEqual({
      emails: ["one@example.com"],
      ignored: { duplicates: 1, invalid: 1 },
    });
  });
});
