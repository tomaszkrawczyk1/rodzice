// Porównuje wyniki silnika z decyzjami ZUS z TWOICH przykładowych spraw — lokalnie, nic nie wychodzi z komputera.
// Użycie:  node sprawdz_sprawy.ts            (czyta wszystkie pliki *.json z ../moje_sprawy/)
//          node sprawdz_sprawy.ts plik.json  (jeden plik)
// Format pliku: patrz szablon_sprawy.json i INSTRUKCJA_SPRAW_ZUS.md
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { podstawaPracownik, podstawaNiepracownik, wierszZ3NaMiesiac, planZasilku, r2 } from "../src/engine/kalkulator.ts";

const p = JSON.parse(readFileSync(new URL("../data/parametry.json", import.meta.url), "utf8"));
const dir = new URL("../moje_sprawy/", import.meta.url);
const arg = process.argv[2];
const pliki: URL[] = arg ? [new URL(arg, "file://" + process.cwd().replace(/\\/g, "/") + "/")]
  : existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json") && !f.startsWith("_")).map(f => new URL(f, dir)) : [];
if (!pliki.length) { console.log("Brak plików. Utwórz folder paczka_dla_programisty/moje_sprawy/ i wrzuć tam pliki *.json (wzór: szablon_sprawy.json)."); process.exit(0); }

const TOL = 1.0; // zł różnicy uznawane za zgodne (zaokrąglenia) — patrz LUKI_I_DECYZJE.md C1
const f = (x: number | undefined) => x === undefined ? "—" : x.toFixed(2);
let zgodne = 0, rozne = 0;

function podstawaZ(b: any): { podstawa: number; kroki: string[] } {
  if (b.niepracownik) {
    const w = podstawaNiepracownik({ miesiace: b.miesiace, zadeklarowanaKwota: !!b.zadeklarowanaKwota }, p);
    return { podstawa: w.podstawaMiesieczna, kroki: [...w.kroki, ...w.ostrzezenia] };
  }
  // wiersze w formacie z druku Z-3 (kolumny 3–8) ALBO gotowe {miesiac,kwota}
  const miesiace = b.miesiace.map((m: any) => m.dniObowiazany !== undefined ? wierszZ3NaMiesiac({ rok: m.rok, miesiac: m.miesiac, dniPrzepracowal: m.dniPrzepracowal, dniObowiazany: m.dniObowiazany, stale: m.stale, zmiennePomniejszone: m.zmiennePomniejszone, premieFaktyczne: m.premieFaktyczne }) : m);
  const w = podstawaPracownik({ miesiace, premieKwartalne4Kw: b.premieKwartalne4Kw, premieRoczne: b.premieRoczne, pelnyWymiarEtatu: b.pelnyWymiarEtatu !== false }, p);
  return { podstawa: w.podstawaMiesieczna, kroki: [...w.kroki, ...w.ostrzezenia] };
}

for (const url of pliki) {
  const s = JSON.parse(readFileSync(url, "utf8"));
  const zus = s.decyzjaZUS ?? {};
  console.log(`\n=== ${s.nazwa ?? url.pathname.split("/").pop()} ===`);
  const wyn: string[] = [];
  let podMatka: number | undefined, podOjciec: number | undefined;
  if (s.podstawaMatka) { const r = podstawaZ(s.podstawaMatka); podMatka = r.podstawa; wyn.push(`podstawa (nasza): ${f(r.podstawa)} | ZUS: ${f(zus.podstawaMatka ?? zus.podstawaMiesieczna)} | różnica: ${zus.podstawaMatka ?? zus.podstawaMiesieczna ? f(r2(r.podstawa - (zus.podstawaMatka ?? zus.podstawaMiesieczna))) : "—"}`); }
  if (s.podstawaOjciec) { const r = podstawaZ(s.podstawaOjciec); podOjciec = r.podstawa; wyn.push(`podstawa ojca (nasza): ${f(r.podstawa)} | ZUS: ${f(zus.podstawaOjciec)}`); }
  // jeśli ZUS podał podstawę, a my jej nie liczymy — użyj podstawy ZUS (izoluje błędy planu od błędów podstawy)
  podMatka ??= zus.podstawaMatka ?? zus.podstawaMiesieczna; podOjciec ??= zus.podstawaOjciec ?? podMatka;
  if (podMatka === undefined) { console.log("  Brak podstawy: podaj podstawaMatka (dane z Z-3) albo decyzjaZUS.podstawaMiesieczna."); rozne++; continue; }
  // wariant "z podstawą ZUS" liczymy dodatkowo, jeśli różni się od naszej — pokazuje, czy błąd jest w podstawie czy w planie
  const wejscie = { ...s.plan, podstawy: { matka: podMatka, ojciec: podOjciec ?? podMatka } };
  const plan = planZasilku(wejscie, p);
  for (const l of wyn) console.log("  " + l);
  if (plan.bledy.length) console.log("  BŁĘDY PLANU:", plan.bledy.join(" | "));
  console.log("  okresy (nasze):");
  for (const o of plan.okresy) console.log(`    ${o.rodzaj.padEnd(36)} ${o.kto.padEnd(7)} ${o.od} → ${o.do}  ${String(o.dni).padStart(4)} dni  ${o.procent}%  ${f(o.kwota)} zł`);
  let ok = true;
  const sprawdz = (nazwa: string, nasza: number, zusV: number | undefined) => {
    if (zusV === undefined) return;
    const d = r2(nasza - zusV), pass = Math.abs(d) <= TOL; ok = ok && pass;
    console.log(`  ${pass ? "OK   " : "RÓŻNICA"} ${nazwa}: nasza ${f(nasza)} | ZUS ${f(zusV)} | różnica ${f(d)} zł`);
  };
  sprawdz("kwota RAZEM", plan.sumy.razem, zus.kwotaRazem);
  sprawdz("kwota matka/rodzic 1", plan.sumy.matka, zus.kwotaMatka);
  sprawdz("kwota ojciec/rodzic 2", plan.sumy.ojciec, zus.kwotaOjciec);
  for (const zo of zus.okresy ?? []) {
    const nasze = plan.okresy.filter(o => o.rodzaj === zo.rodzaj && (!zo.kto || o.kto === zo.kto));
    sprawdz(`okres ${zo.rodzaj}${zo.kto ? " (" + zo.kto + ")" : ""}`, r2(nasze.reduce((a, o) => a + o.kwota, 0)), zo.kwota);
    if (zo.dni !== undefined) { const dn = nasze.reduce((a, o) => a + o.dni, 0); const pass = dn === zo.dni; ok = ok && pass; console.log(`  ${pass ? "OK   " : "RÓŻNICA"} dni ${zo.rodzaj}: nasze ${dn} | ZUS ${zo.dni}`); }
  }
  if (!s.decyzjaZUS) console.log("  (brak decyzjaZUS — tylko wyliczenie, nic do porównania)");
  ok ? zgodne++ : rozne++;
}
console.log(`\nPODSUMOWANIE: ${zgodne} zgodnych, ${rozne} z różnicą (tolerancja ${TOL} zł)`);
