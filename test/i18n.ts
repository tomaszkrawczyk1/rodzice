// Uruchom: node --experimental-strip-types test/i18n.ts   (Node 22+)
// Tłumaczenia (EN, UK): kompletność słowników, wzorce dla zdań z danymi oraz daty, kwoty i liczby mnogie.
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

let ok = 0, fail = 0;
function rowne(nazwa: string, got: unknown, exp: unknown) {
  if (JSON.stringify(got) === JSON.stringify(exp)) ok++;
  else { fail++; console.log(`✗ ${nazwa}\n   jest:     ${JSON.stringify(got)}\n   oczekiwano: ${JSON.stringify(exp)}`); }
}

// Node uruchamia testy bez konfiguracji modułów Next: te same aliasy co w test/sprawy.ts.
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    const sciezka = specifier.startsWith("@/") ? new URL(`../src/${specifier.slice(2)}`, import.meta.url).href : specifier;
    const lokalna = sciezka.startsWith("file:") || sciezka.startsWith(".");
    const rozszerzenie = sciezka.endsWith(".ts") || sciezka.endsWith(".json");
    return nextResolve(lokalna && !rozszerzenie ? sciezka + ".ts" : sciezka, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".json")) {
      return { format: "module", source: `export default ${readFileSync(new URL(url), "utf8")};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { EN } = await import("../src/i18n/en.ts");
const { UK } = await import("../src/i18n/uk.ts");
const { SPRAWY_EN, SPRAWY_UK } = await import("../src/i18n/sprawy.ts");
const { EN_PODSTRONY } = await import("../src/i18n/en-podstrony.ts");
const { UK_PODSTRONY } = await import("../src/i18n/uk-podstrony.ts");
const { EN_KALKULATOR } = await import("../src/i18n/en.kalkulator.ts");
const { UK_KALKULATOR } = await import("../src/i18n/uk.kalkulator.ts");
const { tlumacz } = await import("../src/i18n/jezyki.ts");
const { formatyDla } = await import("../src/i18n/formaty.ts");
const { SPRAWY } = await import("../src/lib/sprawy.ts");
hook.deregister();

const miejsca = (s: string) => [...s.matchAll(/\{(\w+)(?:\|[^}]+)?\}/g)].map((m) => m[1]).sort().join(",");
const slownik = { en: { ...EN_KALKULATOR, ...EN, ...SPRAWY_EN, ...EN_PODSTRONY }, uk: { ...UK_KALKULATOR, ...UK, ...SPRAWY_UK, ...UK_PODSTRONY } };

// --- słowniki: te same klucze, brak pustych wartości, te same miejsca na zmienne ---
const kluczeEn = Object.keys(slownik.en), kluczeUk = Object.keys(slownik.uk);
rowne("Klucze w EN, których brak w UK", kluczeEn.filter((k) => !(k in slownik.uk)), []);
rowne("Klucze w UK, których brak w EN", kluczeUk.filter((k) => !(k in slownik.en)), []);
for (const [j, s] of Object.entries(slownik)) {
  rowne(`Puste tłumaczenia (${j})`, Object.entries(s).filter(([, v]) => !v.trim()).map(([k]) => k), []);
  rowne(`Zmienne {…} w kluczu i tłumaczeniu się zgadzają (${j})`, Object.entries(s).filter(([k, v]) => miejsca(k) !== miejsca(v)).map(([k]) => k), []);
}

// --- daty, kwoty, liczba mnoga ---
const pl = formatyDla("pl"), en = formatyDla("en"), uk = formatyDla("uk");
rowne("Data PL", pl.dataPL("2026-03-05"), "5 marca 2026");
rowne("Data EN", en.dataPL("2026-03-05"), "5 March 2026");
rowne("Data UK", uk.dataPL("2026-03-05"), "5 березня 2026 р.");
rowne("Kwota EN", en.pln(1234.5).replace(/ /g, " "), "PLN 1,234.50");
rowne("Tygodnie PL", [1, 2, 5, 12, 22].map(pl.tygodnie), ["1 tydzień", "2 tygodnie", "5 tygodni", "12 tygodni", "22 tygodnie"]);
rowne("Tygodnie EN", [1, 2, 20].map(en.tygodnie), ["1 week", "2 weeks", "20 weeks"]);
rowne("Tygodnie UK", [1, 2, 5, 11, 22].map(uk.tygodnie), ["1 тиждень", "2 тижні", "5 тижнів", "11 тижнів", "22 тижні"]);
rowne("Tygodnie UK, liczby na 1", [21, 41, 101, 111].map(uk.tygodnie), ["21 тиждень", "41 тиждень", "101 тиждень", "111 тижнів"]);
rowne("Tygodnie PL, liczby na 1", [21, 41].map(pl.tygodnie), ["21 tygodni", "41 tygodni"]);
rowne("Dni UK", [1, 3, 14, 30].map(uk.dni), ["1 день", "3 дні", "14 днів", "30 днів"]);
rowne("Miesiąc UK", uk.miesiacPL(2026, 3), "березень 2026 р.");

// --- zdania składane przez logikę spraw ---
const t = (j: "en" | "uk", s: string) => tlumacz(j, s).replace(/[  ]/g, " ");
rowne("Wzorzec z datą (EN)", t("en", "Termin 5 marca 2026 już minął. Złóż wniosek jak najszybciej i zapytaj pracodawcę, czy uwzględni krótszy termin."),
  "The deadline of 5 March 2026 has already passed. Submit the application as soon as possible and ask your employer whether they will accept a shorter notice period.");
rowne("Wzorzec z dniami (UK)", t("uk", "Pierwsza wypłata przyjdzie najpóźniej 30 dni po tym, jak ZUS wyjaśni wszystkie okoliczności."),
  "Перша виплата надійде не пізніше ніж через 30 днів після того, як ZUS з’ясує всі обставини.");
rowne("Zagnieżdżone: termin „za N dni”", t("en", "Wniosek o urlop rodzicielski złóż najpóźniej 12 maja 2026 (za 5 dni)."), "Submit your application for parental leave by 12 May 2026 at the latest (in 5 days).");
rowne("Kwota i przecinek dziesiętny (EN)", t("en", "Z tego liczymy podstawę zasiłku (średnia z ostatnich 12 miesięcy pomniejszona o 13,71% składek na ubezpieczenia społeczne)."),
  "We use this to calculate the benefit base (the average from the last 12 months reduced by 13.71% social insurance contributions).");
rowne("Samodzielna kwota", t("en", "6 500,00 zł"), "PLN 6,500.00");
rowne("Samodzielne tygodnie", t("uk", "20 tygodni"), "20 тижнів");
rowne("Wzorzec ze zmienną z danymi (UK)", t("uk", "Na początek ok. 4 000 zł miesięcznie (brutto, przed podatkiem)"), "Спочатку бл. 4 000,00 PLN на місяць (брутто, до оподаткування)");
rowne("Brak wpisu = zostaje po polsku", t("en", "Zupełnie nieznane zdanie testowe"), "Zupełnie nieznane zdanie testowe");
rowne("Zmienne podane wprost", tlumacz("en", "Pytanie {n} z {z}", { n: 2, z: 5 }), "Question 2 of 5");
rowne("Polski bez zmian", tlumacz("pl", "Pytanie {n} z {z}", { n: 2, z: 5 }), "Pytanie 2 z 5");

// --- każdy tekst pytań i tytuły spraw mają tłumaczenie ---
const brak: string[] = [];
const sprawdz = (tekst: unknown, gdzie: string) => {
  if (typeof tekst !== "string" || !tekst.trim()) return;
  for (const j of ["en", "uk"] as const) if (tlumacz(j, tekst) === tekst) brak.push(`${j} ${gdzie}: ${tekst.slice(0, 70)}`);
};
for (const s of SPRAWY) {
  for (const k of ["tytul", "krotko", "czas"] as const) sprawdz(s[k], `${s.id}.${k}`);
  for (const q of s.pytania) {
    if (typeof q.tekst === "string") sprawdz(q.tekst, `${s.id}/${q.id}.tekst`);
    for (const k of ["poCo", "skad", "etykietaDanych", "przyklad", "jednostka"] as const) sprawdz(q[k], `${s.id}/${q.id}.${k}`);
    for (const o of q.opcje ?? []) { sprawdz(o.label, `${s.id}/${q.id}/${o.v}.label`); sprawdz(o.opis, `${s.id}/${q.id}/${o.v}.opis`); }
  }
}
rowne("Pytania i tytuły spraw bez tłumaczenia", [...new Set(brak)], []);

console.log(`\ni18n: ${ok} ok, ${fail} błędów`);
process.exit(fail ? 1 : 0);
