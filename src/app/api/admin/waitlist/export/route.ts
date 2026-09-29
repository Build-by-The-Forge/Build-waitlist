import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/admins";
import { csvRow } from "@/lib/admin/csv";
import { requireAdminApi } from "@/lib/admin/session";
import { allSignups } from "@/lib/admin/signups";

export const runtime = "nodejs";

/**
 * GET /api/admin/waitlist/export — every signup as CSV. Admins only.
 * An export is a copy of personal data, so each one is audited.
 */
export async function GET() {
  const admin = await requireAdminApi();
  if (admin instanceof NextResponse) return admin;

  const encoder = new TextEncoder();
  let rows = 0;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Verification token fields are never selected, so they can't reach the export.
        controller.enqueue(encoder.encode(csvRow(["email", "source", "joined_at", "verification_status", "verified_at"])));
        for await (const batch of allSignups()) {
          controller.enqueue(
            encoder.encode(batch.map((s) => csvRow([s.email, s.source, s.createdAt, s.verificationStatus, s.verifiedAt])).join("")),
          );
          rows += batch.length;
        }
        await audit(admin.id, "export_csv", { rows });
        controller.close();
      } catch (err) {
        console.error("[admin] export failed:", err instanceof Error ? err.message : err);
        controller.error(err);
      }
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="build-waitlist-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
