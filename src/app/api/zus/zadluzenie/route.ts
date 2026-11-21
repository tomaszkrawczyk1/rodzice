import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { znajdzPersone, numerSprawy } from "@/lib/zus-mock";
import { getParametry } from "@/lib/params";
import { progZadluzenia } from "@/engine/kalkulator";
export const dynamic = "force-dynamic";
/** SYMULACJA zaświadczenia o stanie zadłużenia z tytułu składek na dzień powstania prawa do świadczenia. */
export function GET(req: Request) {
  const u = new URL(req.url); const pesel = u.searchParams.get("pesel") ?? "";
  const naDzien = u.searchParams.get("naDzien") ?? new Date().toISOString().slice(0, 10);
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  const prog = progZadluzenia(getParametry());
  return NextResponse.json({ symulacja: true, numerZaswiadczenia: numerSprawy("ZAD"), osoba: p.osoba, naDzien, kwotaZadluzenia: p.zadluzenie.kwota,
    prog, przekroczonyProg: p.zadluzenie.kwota > prog, wystawiono: new Date().toISOString().slice(0, 10) });
}
