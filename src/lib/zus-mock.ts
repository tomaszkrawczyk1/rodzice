import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./params";
import { dniMiedzy, dodajDni } from "@/engine/kalkulator";

export interface Persona {
  id: string; osoba: string; pesel: string;
  ubezpieczenie: { tytul: string; od: string; do: string | null; chorobowe: string; platnik: { nazwa: string; nip: string; liczbaUbezpieczonych: number } }[];
  ezla: any[]; zadluzenie: { kwota: number; naDzien: string };
}

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

export const numerSprawy = (prefix: string) => `${prefix}/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`;
export { dodajDni };
