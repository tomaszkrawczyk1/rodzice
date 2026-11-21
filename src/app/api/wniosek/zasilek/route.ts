import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { numerSprawy } from "@/lib/zus-mock";
/** SYMULACJA złożenia wniosku ZAM (do płatnika składek albo ZUS). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!b.adresat) return bad("Wskaż adresata wniosku (pracodawca / ZUS).");
  return NextResponse.json({ symulacja: true, numerWniosku: numerSprawy("ZAM"), adresat: b.adresat, status: "Wniosek ZAM złożony (symulacja)", wyslano: new Date().toISOString() });
}
