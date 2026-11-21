import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { numerSprawy } from "@/lib/zus-mock";
/** SYMULACJA: pytanie do ZUS zadane z poziomu konta PUE. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!b.tresc || String(b.tresc).trim().length < 5) return bad("Wpisz treść pytania (min. 5 znaków).");
  return NextResponse.json({ symulacja: true, numerSprawy: numerSprawy("PUE"), temat: b.temat ?? "Zasiłki", status: "Przyjęto do rozpatrzenia",
    przewidywanaOdpowiedz: "do 14 dni (symulacja)", wyslano: new Date().toISOString() });
}
