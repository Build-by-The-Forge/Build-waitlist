import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/session";
import { signupStats } from "@/lib/admin/signups";

export const runtime = "nodejs";

/** GET /api/admin/waitlist/stats — signup totals and sources. Admins only. */
export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  return NextResponse.json(await signupStats(), { headers: { "Cache-Control": "no-store" } });
}
