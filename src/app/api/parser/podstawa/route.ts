import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { policzPodstawe } from "@/lib/parser";

export const dynamic = "force-dynamic";

/** POST JSON { typ_dokumentu, zatrudnienie, skladniki_miesieczne } (po korekcie użytkownika) -> podstawa z silnika. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!Array.isArray(b?.skladniki_miesieczne) || b.skladniki_miesieczne.length > 60) return bad("Podaj wiersze wynagrodzeń.");
    return NextResponse.json({ podstawa: policzPodstawe(b) });
  } catch (e: any) { return bad(String(e?.message || e)); }
}
