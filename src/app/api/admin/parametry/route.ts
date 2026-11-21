import { NextResponse } from "next/server";
import { getParametry, saveParametry } from "@/lib/params";
import { bad } from "@/lib/handler";
export const dynamic = "force-dynamic";
const haslo = () => process.env.ADMIN_PASSWORD || "admin2026";
const ok = (req: Request) => req.headers.get("x-admin-password") === haslo();
export const GET = (req: Request) => (ok(req) ? NextResponse.json(getParametry()) : bad("Błędne hasło administratora", 401));
export async function PUT(req: Request) {
  if (!ok(req)) return bad("Błędne hasło administratora", 401);
  try { saveParametry(await req.json()); return NextResponse.json({ ok: true, zapisano: new Date().toISOString() }); }
  catch (e: any) { return bad(String(e.message || e)); }
}
