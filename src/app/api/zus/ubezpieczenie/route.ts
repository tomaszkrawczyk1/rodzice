import { bad, prywatne, zapytanieOsoby } from "@/lib/handler";
import { dzis } from "@/lib/format";
import { znajdzPersone, dniNieprzerwanego, ubezpieczonaWDniu } from "@/lib/zus-mock";
export const dynamic = "force-dynamic";
/** POST { pesel, naDzien } — SYMULACJA odpowiedzi systemu ZUS (dane fikcyjne). */
export async function POST(req: Request) {
  const z = await zapytanieOsoby(req); const pesel = z.pesel;
  const naDzien = z.naDzien ?? dzis();
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  return prywatne({ symulacja: true, osoba: p.osoba, pesel: p.pesel, naDzien, ubezpieczenie: p.ubezpieczenie,
    dniNieprzerwanegoUbezpieczeniaChorobowego: dniNieprzerwanego(p, naDzien), ubezpieczonaWDniu: ubezpieczonaWDniu(p, naDzien) });
}
