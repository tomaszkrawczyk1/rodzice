import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { odczytajTekst, rozpoznajFormat, MAKS_BAJTOW } from "@/lib/ocr";
import { parsujTekst, policzPodstawe } from "@/lib/parser";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

/** POST multipart (pole "plik": PDF/PNG/JPG) -> odczyt LOKALNY (tekst z PDF albo OCR) + walidacja + podstawa z silnika. Bez AI i bez zewnętrznych usług. */
export async function POST(req: Request) {
  try {
    const f = (await req.formData()).get("plik");
    if (!(f instanceof File)) return bad("Dołącz plik (pole „plik”).");
    if (f.size > MAKS_BAJTOW) return bad(`Plik jest za duży (maksymalnie ${MAKS_BAJTOW / 1024 / 1024} MB).`, 413);
    if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) return bad("Obsługiwane formaty: PDF, JPG, PNG.", 415);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const fmt = rozpoznajFormat(bytes);
    if (!fmt) return bad("Plik nie wygląda na PDF, JPG ani PNG.", 415);
    const odczyt = await odczytajTekst(bytes, fmt).catch(() => null);
    if (!odczyt) return bad("Nie udało się otworzyć pliku. Może być uszkodzony lub zabezpieczony hasłem.", 422);
    const wynik = parsujTekst(odczyt.strony);
    wynik.ostrzezenia.unshift(...odczyt.ostrzezenia);
    let podstawa = null;
    try { podstawa = policzPodstawe(wynik.dane); } catch (e: any) { wynik.ostrzezenia.push("Nie udało się policzyć podstawy z odczytanych wierszy: " + e.message); }
    return NextResponse.json({ ...wynik, stronWPliku: odczyt.stron, podstawa });
  } catch (e: any) { return bad(String(e?.message || e), 500); }
}
