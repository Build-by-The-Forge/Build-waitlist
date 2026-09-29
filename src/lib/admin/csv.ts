/**
 * CSV encoding for waitlist exports.
 *
 * Signups are untrusted input, so a cell like `=HYPERLINK(...)` must not run
 * as a formula when the export is opened in Excel or Sheets (CSV injection).
 * Such cells are prefixed with an apostrophe, the conventional neutralizer.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let s = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}
