import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { numerSprawy } from "@/lib/zus-mock";
/** SYMULACJA wniosku o odpis aktu urodzenia (rejestr stanu cywilnego). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  for (const k of ["imieDziecka", "dataUrodzenia", "miejsceUrodzenia", "rodzajOdpisu"]) if (!b[k]) return bad(`Uzupełnij pole: ${k}`);
  const zupelny = b.rodzajOdpisu === "zupelny";
  return NextResponse.json({ symulacja: true, numerWniosku: numerSprawy("USC"), rodzajOdpisu: b.rodzajOdpisu,
    oplataSkarbowaZl: zupelny ? 33 : 22, status: "Wniosek przyjęty (symulacja)", odbior: b.odbior ?? "e-mail / PUE", wyslano: new Date().toISOString() });
}
