import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { numerSprawy } from "@/lib/zus-mock";
/** SYMULACJA wysłania wniosku o urlop do pracodawcy. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!b.rodzaj || !b.od || !b.do) return bad("Podaj rodzaj urlopu oraz daty od–do.");
  return NextResponse.json({ symulacja: true, numerWniosku: numerSprawy("URL"), adresat: b.pracodawca || "pracodawca", status: "Wysłano do pracodawcy (symulacja)", wyslano: new Date().toISOString() });
}
