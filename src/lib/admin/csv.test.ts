import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "./csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("ada@example.com")).toBe("ada@example.com");
    expect(csvCell(42)).toBe("42");
  });

  it("renders null and undefined as empty", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("formats dates as ISO 8601", () => {
    expect(csvCell(new Date("2026-09-29T10:31:00Z"))).toBe("2026-09-29T10:31:00.000Z");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it.each(["=HYPERLINK(\"x\")", "+1+1", "-1+1", "@SUM(A1)", "\tcmd"])("neutralizes formula-like %j", (input) => {
    expect(csvCell(input).replace(/^"|"$/g, "").startsWith("'")).toBe(true);
  });
});

describe("csvRow", () => {
  it("joins cells and ends with CRLF", () => {
    expect(csvRow(["a@b.co", "final_cta", null])).toBe("a@b.co,final_cta,\r\n");
  });
});
