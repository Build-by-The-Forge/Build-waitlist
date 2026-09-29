import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin/session";
import { parseListParams } from "@/lib/admin/list-params";
import { listSignups } from "@/lib/admin/signups";

export const runtime = "nodejs";

/** GET /api/admin/waitlist?q=&page= — paginated, searchable signups. Admins only. */
export async function GET(req: NextRequest) {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const params = parseListParams(req.nextUrl.searchParams);
  const result = await listSignups(params);
  return NextResponse.json({ ...result, page: params.page }, { headers: { "Cache-Control": "no-store" } });
}
