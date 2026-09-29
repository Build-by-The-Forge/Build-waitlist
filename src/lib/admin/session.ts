import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findActiveAdmin } from "./admins";
import type { AdminRecord } from "./authorize";

/**
 * The signed-in admin, re-checked against the database on every call so that
 * disabling an admin takes effect immediately rather than when their session
 * cookie expires.
 */
export async function getAdmin(): Promise<AdminRecord | null> {
  const session = await auth();
  const subject = session?.user?.subject;
  return subject ? findActiveAdmin(subject) : null;
}

/** For admin pages: the admin, or a redirect to the login page. */
export async function requireAdminPage(): Promise<AdminRecord> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For admin API routes: the admin, or a 401 response to return as-is. */
export async function requireAdminApi(): Promise<AdminRecord | NextResponse> {
  const admin = await getAdmin();
  return admin ?? NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
