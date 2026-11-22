import { post } from "@/lib/handler";
import { podstawaZKwoty, szybkiePorownanie, type RodzajZatrudnienia } from "@/engine/kalkulator";

const RODZAJE: RodzajZatrudnienia[] = ["umowa_o_prace", "zlecenie", "dzialalnosc"];

/**
 * Szybkie porównanie wariantów bez dat: { kwota, rodzaj: "umowa_o_prace"|"zlecenie"|"dzialalnosc"|"podstawa", liczbaDzieci?, zaZyciem? }.
 * `kwota` to pensja brutto (umowa o pracę), przychód ze zlecenia, zadeklarowana podstawa składek (JDG) albo gotowa podstawa zasiłku.
 */
export const POST = post((b, p) => {
  const kwota = Number(b?.kwota);
  if (!(kwota > 0)) throw new Error("Podaj kwotę większą od zera.");
  const liczbaDzieci = Math.min(Math.max(Math.floor(Number(b?.liczbaDzieci ?? 1)) || 1, 1), 5);
  const podstawa = b?.rodzaj === "podstawa" ? null : podstawaZKwoty(kwota, RODZAJE.includes(b?.rodzaj) ? b.rodzaj : "umowa_o_prace", p);
  const podstawaMiesieczna = podstawa ? podstawa.podstawaMiesieczna : kwota;
  return { podstawaMiesieczna, podstawa, ...szybkiePorownanie({ podstawaMiesieczna, liczbaDzieci, zaZyciem: !!b?.zaZyciem }, p) };
});
