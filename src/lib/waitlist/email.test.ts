import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "./email";

describe("isValidEmail", () => {
  it.each(["ada@example.com", "  ada@example.com  ", "first.last+tag@uni.edu.ng", "a@b.co"])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "ada",
    "ada@",
    "@example.com",
    "ada@example",
    "ada@example.c",
    "ada example@example.com",
    ".ada@example.com",
    "ada.@example.com",
    "a..da@example.com",
    `${"a".repeat(65)}@example.com`,
    `a@${"b".repeat(250)}.com`,
  ])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
    expect(isValidEmail({ email: "ada@example.com" })).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("collapses Gmail dots, +tags and googlemail.com", () => {
    expect(normalizeEmail("Test.User+build@gmail.com")).toBe("testuser@gmail.com");
    expect(normalizeEmail("testuser@googlemail.com")).toBe("testuser@gmail.com");
  });

  it("leaves other providers' dots and +tags alone", () => {
    expect(normalizeEmail("first.last+tag@outlook.com")).toBe("first.last+tag@outlook.com");
  });
});
