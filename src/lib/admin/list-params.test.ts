import { describe, expect, it } from "vitest";
import { likePattern, parseListParams } from "./list-params";

describe("parseListParams", () => {
  it("defaults to page 1 with no query", () => {
    expect(parseListParams({})).toEqual({ q: "", page: 1, status: "all" });
  });

  it("trims and caps the query", () => {
    expect(parseListParams({ q: "  gmail  " }).q).toBe("gmail");
    expect(parseListParams({ q: "x".repeat(500) }).q).toHaveLength(100);
  });

  it.each(["0", "-3", "abc", ""])("falls back to page 1 for %j", (page) => {
    expect(parseListParams({ page }).page).toBe(1);
  });

  it("takes the first value of repeated params and reads URLSearchParams", () => {
    expect(parseListParams({ page: ["3", "9"] }).page).toBe(3);
    expect(parseListParams(new URLSearchParams("q=ada&page=2"))).toEqual({ q: "ada", page: 2, status: "all" });
  });
});

describe("status filter", () => {
  it.each(["verified", "pending", "all"])("accepts %s", (status) => {
    expect(parseListParams({ status }).status).toBe(status);
  });

  it.each(["VERIFIED", "deleted", "", "toString"])("falls back to all for %j", (status) => {
    expect(parseListParams({ status }).status).toBe("all");
  });
});

describe("likePattern", () => {
  it("wraps the query for substring search", () => {
    expect(likePattern("ada")).toBe("%ada%");
  });

  it("escapes LIKE wildcards and backslashes", () => {
    expect(likePattern("a_b%c\\d")).toBe("%a\\_b\\%c\\\\d%");
  });
});
