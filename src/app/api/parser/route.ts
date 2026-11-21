import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { parsuj } from "@/lib/parser";
import { podstawaPracownik, wierszZ3NaMiesiac, podstawaNiepracownik } from "@/engine/kalkulator";
import { getParametry } from "@/lib/params";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

/** POST multipart (pole "plik": PDF/PNG/JPG) -> odczyt pól AI + walidacja + podstawa wymiaru z silnika (bez AI). */
export async function POST(req: Request) {
  try {
    const fd = await req.formData(); const f = fd.get("plik");
    if (!(f instanceof File)) return bad("Dołącz plik (pole „plik”).");
    if (f.size > 60 * 1024 * 1024) return bad("Plik jest za duży (maks. 60 MB).", 413);
    if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) return bad("Obsługiwane formaty: PDF, PNG, JPG.");
    const wynik = await parsuj(Buffer.from(await f.arrayBuffer()), f.name);
    // podstawa wymiaru liczona KODEM z odczytanych wierszy (kwot nigdy nie liczy model)
    let podstawa: any = null; const p = getParametry(); const d = wynik.dane;
    const wiersze = (d?.skladniki_miesieczne ?? []).filter((w: any) => w.rok && w.miesiac && w.dniObowiazany != null);
    try {
      if (wiersze.length && d.typ_dokumentu !== "Z-3a") {
        const miesiace = wiersze.map((w: any) => wierszZ3NaMiesiac({ rok: w.rok, miesiac: w.miesiac, dniPrzepracowal: w.dniPrzepracowal ?? w.dniObowiazany, dniObowiazany: w.dniObowiazany, stale: w.stale ?? 0, zmiennePomniejszone: w.zmiennePomniejszone ?? 0, premieFaktyczne: w.premieFaktyczne ?? 0, procentSkladki: w.procentSkladki ?? undefined }));
        podstawa = { typ: "pracownik", wynik: podstawaPracownik({ miesiace, pelnyWymiarEtatu: (d.zatrudnienie?.wymiar_etatu ?? 1) >= 1 }, p) };
      } else if (wiersze.length) {
        podstawa = { typ: "niepracownik", wynik: podstawaNiepracownik({ miesiace: wiersze.map((w: any) => ({ miesiac: `${w.rok}-${String(w.miesiac).padStart(2, "0")}`, podstawaSkladek: w.stale ?? 0 })), zadeklarowanaKwota: false }, p) };
      }
    } catch (e: any) { wynik.ostrzezenia.push("Nie udało się policzyć podstawy z odczytanych wierszy: " + e.message); }
    return NextResponse.json({ ...wynik, podstawa });
  } catch (e: any) { return bad(String(e?.message || e), 500); }
}
