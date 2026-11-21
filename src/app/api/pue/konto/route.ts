import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { znajdzPersone, dniNieprzerwanego } from "@/lib/zus-mock";
export const dynamic = "force-dynamic";
/** SYMULACJA podglądu konta ubezpieczonego na PUE/eZUS. */
export function GET(req: Request) {
  const pesel = new URL(req.url).searchParams.get("pesel") ?? "";
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  const dzis = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ symulacja: true, osoba: p.osoba, pesel: p.pesel, ubezpieczenie: p.ubezpieczenie, ezla: p.ezla,
    zadluzenie: p.zadluzenie, dniNieprzerwanegoUbezpieczenia: dniNieprzerwanego(p, dzis), swiadczeniaWypłacone: [] });
}
