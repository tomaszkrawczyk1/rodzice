import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { znajdzPersone, dniNieprzerwanego, ubezpieczonaWDniu } from "@/lib/zus-mock";
export const dynamic = "force-dynamic";
/** GET ?pesel=&naDzien= — SYMULACJA odpowiedzi systemu ZUS (dane fikcyjne). */
export function GET(req: Request) {
  const u = new URL(req.url); const pesel = u.searchParams.get("pesel") ?? "";
  const naDzien = u.searchParams.get("naDzien") ?? new Date().toISOString().slice(0, 10);
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  return NextResponse.json({ symulacja: true, osoba: p.osoba, pesel: p.pesel, naDzien, ubezpieczenie: p.ubezpieczenie,
    dniNieprzerwanegoUbezpieczeniaChorobowego: dniNieprzerwanego(p, naDzien), ubezpieczonaWDniu: ubezpieczonaWDniu(p, naDzien) });
}
