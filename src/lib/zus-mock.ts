import fs from "node:fs";
import path from "node:path";
import type { UbezpieczenieProfilu, ZwolnienieProfilu } from "./dane-profilu";
import { dataDir } from "./params";
import { dniMiedzy, dodajDni } from "@/engine/kalkulator";

export interface Persona {
  id: string; osoba: string; pesel: string;
  ubezpieczenie: UbezpieczenieProfilu[];
  ezla: ZwolnienieProfilu[]; zadluzenie: { kwota: number; naDzien: string; skladniki?: SkladnikZadluzenia[] };
}
/** Jedna zaległa składka. Zadłużenie istnieje od `terminPlatnosci` (następny dzień po terminie) do dnia przed `splacono`. */
export interface SkladnikZadluzenia { rodzaj: string; okres: string; kwota: number; terminPlatnosci: string; splacono?: string | null }

export function wszystkiePersony(): Persona[] {
  const dir = path.join(dataDir(), "personas");
  return fs.readdirSync(dir).filter((f) => /^P\d+.*\.json$/.test(f)).sort().map((f) => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    return { id: f.replace(".json", ""), ...j } as Persona;
  });
}
export const znajdzPersone = (pesel: string) => wszystkiePersony().find((p) => p.pesel === pesel);

/** Dni nieprzerwanego ubezpieczenia chorobowego w dniu `naDzien` (przerwa do 30 dni nie przerywa — art. 4 ust. 2). */
export function dniNieprzerwanego(p: Persona, naDzien: string, przerwaMax = 30): number {
  const seg = p.ubezpieczenie.filter((u) => u.chorobowe !== "brak").map((u) => ({ od: u.od, do: u.do ?? "9999-12-31" })).sort((a, b) => a.od.localeCompare(b.od));
  let start: string | null = null, koniec: string | null = null;
  for (const s of seg) {
    if (s.od > naDzien) break;
    if (start === null || (koniec !== null && dniMiedzy(koniec, s.od) - 1 > przerwaMax)) start = s.od;
    koniec = s.do < naDzien ? s.do : naDzien;
  }
  if (start === null || koniec === null) return 0;
  if (dniMiedzy(koniec, naDzien) > przerwaMax) return 0;
  return dniMiedzy(start, naDzien) + 1;
}
export const ubezpieczonaWDniu = (p: Persona, dzien: string) =>
  p.ubezpieczenie.some((u) => u.chorobowe !== "brak" && u.od <= dzien && (u.do === null || u.do >= dzien));

export interface StanZadluzenia {
  dotyczy: boolean; kwota: number; przekroczonyProg: boolean;
  wynik: "nie_dotyczy" | "brak_zadluzenia" | "ponizej_progu" | "powyzej_progu";
  skladniki: SkladnikZadluzenia[];
}
/**
 * Stan zadłużenia z tytułu składek w dniu `naDzien` (SYMULACJA na danych fikcyjnych).
 * Dotyczy osoby z działalnością gospodarczą w tym dniu; dla pozostałych składki opłaca płatnik, więc nie ma czego sprawdzać.
 * Przekroczenie progu = kwota > próg, tak samo jak w silniku (uprawnienia).
 */
export function stanZadluzenia(p: Persona, naDzien: string, prog: number): StanZadluzenia {
  const dotyczy = p.ubezpieczenie.some((u) => u.tytul === "dzialalnosc" && u.od <= naDzien && (u.do === null || u.do >= naDzien));
  if (!dotyczy) return { dotyczy, kwota: 0, przekroczonyProg: false, wynik: "nie_dotyczy", skladniki: [] };
  const skladniki = (p.zadluzenie.skladniki ?? []).filter((s) => s.terminPlatnosci < naDzien && !(s.splacono && s.splacono <= naDzien));
  const kwota = Math.round(skladniki.reduce((suma, s) => suma + s.kwota, 0) * 100) / 100;
  const przekroczonyProg = kwota > prog;
  return { dotyczy, kwota, przekroczonyProg, skladniki, wynik: kwota === 0 ? "brak_zadluzenia" : przekroczonyProg ? "powyzej_progu" : "ponizej_progu" };
}
/** Stały numer symulowanego zaświadczenia dla pary osoba + dzień (to samo zapytanie = ten sam numer). */
export function numerZaswiadczenia(pesel: string, naDzien: string): string {
  const cyfry = (pesel + naDzien).replace(/\D/g, "");
  let h = 7; for (const c of cyfry) h = (h * 31 + +c) % 900000;
  return `ZAD/${naDzien.slice(0, 4)}/${100000 + h}`;
}

export const numerSprawy = (prefix: string) => `${prefix}/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`;
export { dodajDni };
