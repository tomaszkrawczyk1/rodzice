import { bad, prywatne, zapytanieOsoby } from "@/lib/handler";
import { dzis as dzisPL } from "@/lib/format";
import { znajdzPersone, stanZadluzenia, numerZaswiadczenia } from "@/lib/zus-mock";
import { getParametry } from "@/lib/params";
import { progZadluzenia } from "@/engine/kalkulator";
export const dynamic = "force-dynamic";

const KOMUNIKATY = {
  nie_dotyczy: "W tym dniu nie prowadzisz działalności gospodarczej, więc składki opłaca za Ciebie płatnik. Nie ma tu zadłużenia do sprawdzenia.",
  brak_zadluzenia: "W tym dniu nie ma zaległych składek.",
  ponizej_progu: "W tym dniu masz zaległe składki, ale nie więcej niż próg. Prawo do zasiłku jest zachowane.",
  powyzej_progu: "W tym dniu zaległe składki są wyższe niż próg. Zasiłek zostanie wypłacony dopiero po spłacie całego zadłużenia.",
};

/** SYMULACJA zaświadczenia o stanie zadłużenia z tytułu składek na dzień powstania prawa do świadczenia (np. dzień porodu). */
export async function POST(req: Request) {
  const z = await zapytanieOsoby(req); const pesel = z.pesel;
  const dzis = dzisPL();
  const naDzien = z.naDzien ?? dzis;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(naDzien) || Number.isNaN(Date.parse(naDzien))) return bad("Data musi mieć postać RRRR-MM-DD", 400);
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  const prog = progZadluzenia(getParametry());
  const s = stanZadluzenia(p, naDzien, prog);
  return prywatne({ symulacja: true, numerZaswiadczenia: numerZaswiadczenia(p.pesel, naDzien), osoba: p.osoba, naDzien, kwotaZadluzenia: s.kwota,
    prog, przekroczonyProg: s.przekroczonyProg, dotyczyDzialalnosci: s.dotyczy, wynik: s.wynik, komunikat: KOMUNIKATY[s.wynik], skladniki: s.skladniki, wystawiono: dzis });
}
