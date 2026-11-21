// Uruchom: node --experimental-strip-types test/wsparcie.ts
import { readFileSync } from "node:fs";
type Rowne = (nazwa: string, got: unknown, exp: unknown) => void;
const dane = JSON.parse(readFileSync(new URL("../data/wsparcie.json", import.meta.url), "utf8"));
const TYPY = ["martwe", "ciaza", "zgon", "wczesniak", "chore", "kryzys"];

export function testyWsparcie(rowne: Rowne) {
  const p: Record<string, unknown>[] = dane.pozycje;
  const id = new Set(p.map((x) => x.id));
  rowne("wsparcie: unikalne id", id.size, p.length);
  for (const x of p) {
    const n = String(x.id);
    rowne(`wsparcie ${n}: źródło to adres https`, /^https:\/\/[^\s]+$/.test(String(x.zrodlo)), true);
    rowne(`wsparcie ${n}: data sprawdzenia ISO, nie z przyszłości`, /^\d{4}-\d{2}-\d{2}$/.test(String(x.dataSprawdzenia)) && String(x.dataSprawdzenia) <= new Date().toISOString().slice(0, 10), true);
    rowne(`wsparcie ${n}: pewność ok albo do_potwierdzenia`, ["ok", "do_potwierdzenia"].includes(String(x.pewnosc)), true);
    rowne(`wsparcie ${n}: telefon lub e-mail`, Boolean(x.telefon || x.email), true);
    rowne(`wsparcie ${n}: nazwa, opis, www, zakres`, [x.nazwa, x.opis, x.www, x.zakres].every((v) => typeof v === "string" && v.length > 0), true);
    rowne(`wsparcie ${n}: znane typy sytuacji`, (x.typy as string[]).every((t) => [...TYPY, "matka"].includes(t)), true);
  }
  for (const t of ["martwe", "ciaza", "wczesniak", "chore", "kryzys"]) rowne(`wsparcie: jest podmiot dla ${t}`, p.some((x) => (x.typy as string[]).includes(t)), true);
}

// Samodzielne uruchomienie
if (process.argv[1]?.endsWith("wsparcie.ts")) {
  let fail = 0;
  testyWsparcie((nazwa, got, exp) => { if (JSON.stringify(got) !== JSON.stringify(exp)) { fail++; console.log(`FAIL  ${nazwa}`); } });
  console.log(fail ? `${fail} błędów` : "wsparcie: OK");
  process.exit(fail ? 1 : 0);
}
