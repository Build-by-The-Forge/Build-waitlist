import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://build-waitlist.vercel.app/", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://build-waitlist.vercel.app",
    );
  });

  it("uses Vercel's production domain on production deployments", () => {
    expect(
      resolveSiteUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "build-waitlist.vercel.app", VERCEL_URL: "build-waitlist-abc123.vercel.app" }),
    ).toBe("https://build-waitlist.vercel.app");
  });

  it("uses the deployment's own URL on previews", () => {
    expect(resolveSiteUrl({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "build-git-feat-x.vercel.app", VERCEL_URL: "build-abc.vercel.app" })).toBe(
      "https://build-git-feat-x.vercel.app",
    );
    expect(resolveSiteUrl({ VERCEL_ENV: "preview", VERCEL_URL: "build-abc.vercel.app" })).toBe("https://build-abc.vercel.app");
  });

  it("falls back to localhost only outside Vercel with nothing configured", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "  " })).toBe("http://localhost:3000");
  });
});
