import { bad, prywatne, zapytanieOsoby } from "@/lib/handler";
import { dzis as dzisPL } from "@/lib/format";
import { znajdzPersone, dniNieprzerwanego } from "@/lib/zus-mock";
export const dynamic = "force-dynamic";
/** SYMULACJA podglądu konta ubezpieczonego na PUE/eZUS. */
export async function POST(req: Request) {
  const { pesel } = await zapytanieOsoby(req);
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  const dzis = dzisPL();
  return prywatne({ symulacja: true, osoba: p.osoba, pesel: p.pesel, ubezpieczenie: p.ubezpieczenie, ezla: p.ezla,
    zadluzenie: p.zadluzenie, dniNieprzerwanegoUbezpieczenia: dniNieprzerwanego(p, dzis), swiadczeniaWypłacone: [] });
}
