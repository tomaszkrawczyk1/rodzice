// Uruchom: node --experimental-strip-types test/ux.ts   (Node 22+)
// Mechanika przewijania, fokusu i stanu kroku w sprawach. Bez przeglądarki: tylko czysta logika.
import { readFileSync } from "node:fs";
import { TYTULY_SPRAW } from "../src/lib/sprawy-tytuly.ts";
import { celPrzewijania, czyZasloniety, MARGINES } from "../src/lib/ekran.ts";
import { dataZFormularza } from "../src/lib/data-formularza.ts";
import { etapZAdresu, ETAP_W_ADRESIE, MAKS_ZAPYTANIA, normalizujZapytanie } from "../src/lib/adres-glowna.ts";
import { odczytajPostep, odczytajWpis, polaczPrzyPowrocie, stanHistorii, usunPostep, zapiszPostep, type Migawka } from "../src/lib/stan-sprawy.ts";

let ok = 0, fail = 0;
function rowne(nazwa: string, got: unknown, exp: unknown) {
  if (JSON.stringify(got) === JSON.stringify(exp)) ok++;
  else { fail++; console.log(`FAIL  ${nazwa}\n   oczekiwano: ${JSON.stringify(exp)}\n   jest:       ${JSON.stringify(got)}`); }
}

// ---- przewijanie: tytuł ma wylądować pod przyklejonym nagłówkiem, nie pod nim ----
rowne("brak nagłówka: tytuł 400 px niżej, strona na 0", celPrzewijania(400, 0, 0), 400 - MARGINES);
rowne("nagłówek 100 px: tytuł 400 px niżej", celPrzewijania(400, 0, 100), 400 - 100 - MARGINES);
rowne("po przewinięciu: scrollY 300, tytuł 50 px od góry okna", celPrzewijania(50, 300, 0), 350 - MARGINES);
rowne("nie schodzimy poniżej zera", celPrzewijania(5, 0, 0), 0);
rowne("tytuł nad oknem (ujemne top) przewija w górę", celPrzewijania(-200, 600, 0), 600 - 200 - MARGINES);
const wynik = celPrzewijania(400, 0, 100);
rowne("po przewinięciu tytuł nie jest zasłonięty", czyZasloniety(400 - wynik, 440 - wynik, 100, 800), false);

// ---- zasłonięty fokus ----
rowne("pod nagłówkiem 100 px, element od 60 px", czyZasloniety(60, 110, 100, 800), true);
rowne("tuż pod nagłówkiem", czyZasloniety(100, 150, 100, 800), false);
rowne("poniżej dolnej krawędzi okna", czyZasloniety(790, 840, 0, 800), true);
rowne("cały nad oknem", czyZasloniety(-50, -10, 0, 800), true);

// ---- stan kroku w historii ----
const ID = ["a", "b", "c"];
const m: Migawka = { faza: "pytania", historia: ["a", "b"], odp: { a: "tak", b: "5000" }, potwierdzone: {} };
const wpis = { s: "sprawa", t: "tok", n: 2, m };
const stan = stanHistorii({ __NA: true, inne: 1 }, wpis);
rowne("stan routera zostaje, dochodzi tylko rks", [stan.__NA, stan.inne, Object.keys(stan).includes("rks")], [true, 1, true]);
rowne("poprawny wpis wraca bez zmian", odczytajWpis(stan, "sprawa", "tok", ID), wpis);
rowne("inna sprawa: ignoruj", odczytajWpis(stan, "inna", "tok", ID), null);
rowne("inny token (inny profil): ignoruj", odczytajWpis(stan, "sprawa", "", ID), null);
rowne("brak stanu", odczytajWpis(null, "sprawa", "tok", ID), null);
rowne("stan bez rks (zwykły stan routera)", odczytajWpis({ __NA: true }, "sprawa", "tok", ID), null);
rowne("nieznane pytanie w odpowiedziach", odczytajWpis(stanHistorii(null, { ...wpis, m: { ...m, odp: { x: "1" } } }), "sprawa", "tok", ID), null);
rowne("nieznana faza", odczytajWpis(stanHistorii(null, { ...wpis, m: { ...m, faza: "cos" as never } }), "sprawa", "tok", ID), null);
rowne("odpowiedź nie jest tekstem", odczytajWpis(stanHistorii(null, { ...wpis, m: { ...m, odp: { a: 5 as never } } }), "sprawa", "tok", ID), null);
rowne("ujemny numer kroku", odczytajWpis(stanHistorii(null, { ...wpis, n: -1 }), "sprawa", "tok", ID), null);

// ---- cofnięcie nie kasuje odpowiedzi ----
const wczesniej: Migawka = { faza: "pytania", historia: ["a"], odp: { a: "tak" }, potwierdzone: {} };
rowne("po cofnięciu zostają późniejsze odpowiedzi", polaczPrzyPowrocie(wczesniej, m, true).odp, { a: "tak", b: "5000" });
rowne("po cofnięciu historia i faza są z wcześniejszego kroku", [polaczPrzyPowrocie(wczesniej, m, true).historia, polaczPrzyPowrocie(wczesniej, m, true).faza], [["a"], "pytania"]);
rowne("ruch do przodu bierze zapisaną migawkę", polaczPrzyPowrocie(m, wczesniej, false), m);

// ---- postęp zapisany w przeglądarce: wracamy po przerwie, ale nie przenosimy go między sprawami i profilami ----
{
  const pamiec = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (k: string) => pamiec.get(k) ?? null, setItem: (k: string, v: string) => void pamiec.set(k, v), removeItem: (k: string) => void pamiec.delete(k),
  } });
  zapiszPostep("k", wpis);
  rowne("zapisany postęp wraca", odczytajPostep("k", "sprawa", "tok", ID), m);
  rowne("zapis innego profilu jest ignorowany", odczytajPostep("k", "sprawa", "inny", ID), null);
  rowne("zapis innej sprawy jest ignorowany", odczytajPostep("k", "inna", "tok", ID), null);
  zapiszPostep("pusty", { ...wpis, m: { faza: "pytania", historia: [], odp: {}, potwierdzone: {} } });
  rowne("ekran startowy bez odpowiedzi nie jest postępem", odczytajPostep("pusty", "sprawa", "tok", ID), null);
  pamiec.set("zly", "{nie json");
  rowne("uszkodzony zapis nie psuje strony", odczytajPostep("zly", "sprawa", "tok", ID), null);
  usunPostep("k");
  rowne("po „Zacznij od nowa” nie ma zapisu", odczytajPostep("k", "sprawa", "tok", ID), null);
}

// ---- data wpisywana z klawiatury dziesiętnej telefonu (kropka albo przecinek) ----
rowne("data z kropkami", dataZFormularza("5.04.2027"), "2027-04-05");
rowne("data z przecinkami (klawiatura dziesiętna)", dataZFormularza("5,04,2027"), "2027-04-05");
rowne("data z myślnikami", dataZFormularza("05-04-2027"), "2027-04-05");
rowne("data ze spacjami", dataZFormularza("5 4 2027"), "2027-04-05");
rowne("data ze skośnikami", dataZFormularza("5/4/2027"), "2027-04-05");
rowne("nadal odrzuca nieistniejącą datę", dataZFormularza("31,02,2027"), "");
rowne("nadal odrzuca śmieci", dataZFormularza("jutro"), "");

// ---- układ wąskich ekranów: reguły statyczne w ux.css (pomiar w przeglądarce: scripts/pomiar-rwd.js) ----
const css = readFileSync(new URL("../src/app/ux.css", import.meta.url), "utf8");
rowne("karty tabel zależą od szerokości kontenera, nie okna", /@container tbl \(max-width: 600px\)\s*\{[^]*\.tbl-karty td::before/.test(css), true);
rowne("tabele kart nie są sterowane zapytaniem o okno", /@media[^{]*\{\s*[^}]*\.tbl-karty/.test(css), false);
rowne("kontener tabeli kart ma container-type inline-size", /\.tbl-wrap:has\(\.tbl-karty\)\s*\{[^}]*inline-size/.test(css), true);
rowne("link w stopce ma min. 44 px", /\.footer__links a\s*\{[^}]*min-height: 44px/.test(css), true);
rowne("pola formularza mają 16 px (bez zoomu iOS)", /input:not\(\[type\]\)[^}]*font-size: 16px/.test(css), true);
// ---- strona główna: etap i zapytanie w adresie ----
rowne("etap z adresu: czekamy", etapZAdresu("czekamy"), "ciaza");
rowne("etap z adresu: planuje", etapZAdresu("planuje"), "plan");
rowne("etap z adresu: dziecko", etapZAdresu("dziecko"), "dziecko");
rowne("etap z adresu: nieznany, pusty i brak to ekran wyboru", [etapZAdresu("xyz"), etapZAdresu(""), etapZAdresu(null), etapZAdresu(undefined), etapZAdresu("ciaza")], [null, null, null, null, null]);
rowne("każdy etap ma własną wartość w adresie i wraca do siebie", Object.entries(ETAP_W_ADRESIE).map(([e, v]) => etapZAdresu(v) === e), [true, true, true]);
rowne("zapytanie: spacje na brzegach i w środku", normalizujZapytanie("  szef   nie chce 	 dać urlopu "), "szef nie chce dać urlopu");
rowne("zapytanie: puste i brak", [normalizujZapytanie("   "), normalizujZapytanie(null), normalizujZapytanie(undefined)], ["", "", ""]);
rowne("zapytanie: ucięte do limitu", normalizujZapytanie("a".repeat(MAKS_ZAPYTANIA + 50)).length, MAKS_ZAPYTANIA);
rowne("zapytanie z polskimi znakami i HTML przechodzi przez URLSearchParams bez zmian", (() => {
  const fraza = "ile dostanę po porodzie? <b>x</b> & 81,5%";
  return new URLSearchParams(new URLSearchParams({ q: fraza }).toString()).get("q");
})(), "ile dostanę po porodzie? <b>x</b> & 81,5%");
rowne("kodowanie zapytania w adresie", new URLSearchParams({ q: "szef nie chce dać urlopu" }).toString(), "q=szef+nie+chce+da%C4%87+urlopu");

// ---- tytuły spraw w nagłówku (okruszki) muszą się zgadzać z sprawy.ts ----
{
  const zrodlo = readFileSync(new URL("../src/lib/sprawy.ts", import.meta.url), "utf8");
  const wSprawach = Object.fromEntries([...zrodlo.matchAll(/^\s{4}id: "([a-z-]+)", tytul: "([^"]+)"/gm)].map((m) => [m[1], m[2]]));
  rowne("tytuły spraw w nagłówku = tytuły w sprawy.ts", TYTULY_SPRAW, wSprawach);
}

// ---- paleta: zieleń/granat/neutralne w tokenach, bursztyn tylko jako ostrzeżenie, kontrasty WCAG AA ----
{
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const korzen = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  const tok = (n: string) => new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{6})`).exec(korzen)?.[1] ?? "";
  const lum = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const kontrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const co = (a: string, b: string, min: number) => kontrast(a, b) >= min;
  rowne("przycisk główny: biały na zieleni >= 4,5:1", co("#ffffff", tok("zus-green"), 4.5), true);
  rowne("przycisk główny, hover: biały na ciemnej zieleni >= 4,5:1", co("#ffffff", tok("zus-green-dark"), 4.5), true);
  rowne("ciemna zieleń ciemniejsza od zieleni głównej", lum(tok("zus-green-dark")) < lum(tok("zus-green")), true);
  rowne("link zielony na bieli i na #f3f3f3 >= 4,5:1", [co(tok("zus-green-link"), "#ffffff", 4.5), co(tok("zus-green-link"), "#f3f3f3", 4.5)], [true, true]);
  rowne("zieleń na jasnozielonym tle plakietek >= 4,5:1", co(tok("zus-green"), tok("zus-green-soft"), 4.5), true);
  rowne("granat na bieli >= 4,5:1", co(tok("zus-navy"), "#ffffff", 4.5), true);
  rowne("fokus: kolor >= 3:1 na bieli", co(tok("focus"), "#ffffff", 3), true);
  rowne("fokus: biała przerwa >= 3:1 na zielonym tle", co("#ffffff", tok("zus-green"), 3), true);
  rowne("ostrzeżenie: tekst na jasnym bursztynie >= 4,5:1", co(tok("zus-warn-text"), tok("zus-warn-bg"), 4.5), true);
  rowne("ostrzeżenie: ramka >= 3:1 na bieli i na tle ostrzeżenia", [co(tok("zus-warn"), "#ffffff", 3), co(tok("zus-warn"), tok("zus-warn-bg"), 3)], [true, true]);
  rowne("tryb wysokiego kontrastu: akcent >= 7:1 na czerni, czerń na akcencie >= 7:1", [co(tok("hc-accent"), "#000000", 7), co("#000000", tok("hc-accent"), 7)], [true, true]);

  // żółte i pomarańczowe odcienie (barwa 20-70°, nasycenie > 0,25) mogą wystąpić tylko w tokenach ostrzeżenia
  const odcien = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return { h: 0, s: 0 };
    const hue = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: hue * 60, s: d / mx };
  };
  const pliki = ["app/globals.css", "app/ux.css", "app/kalkulator/kalkulator.module.css", "app/logowanie/logowanie.module.css", "app/terminarz/terminarz.module.css",
    "components/kalendarz.module.css", "components/os-kalendarza.module.css", "components/Pole.module.css", "components/Sprawa.module.css", "lib/format.ts"];
  const ciepleGdzie: string[] = [];
  for (const f of pliki) {
    readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8").split("\n").forEach((linia, i) => {
      if (/--zus-warn(-bg|-text)?:/.test(linia)) return;
      for (const m of linia.matchAll(/#[0-9a-fA-F]{6}\b/g)) { const o = odcien(m[0]); if (o.s > 0.25 && o.h >= 20 && o.h <= 70) ciepleGdzie.push(`${f}:${i + 1} ${m[0]}`); }
    });
  }
  rowne("żółte/pomarańczowe kolory tylko w tokenach ostrzeżenia", ciepleGdzie, []);
  const wszystko = pliki.map((f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8")).join("\n");
  rowne("nie ma już tokenów --zus-orange / --zus-amber", /--zus-orange|--zus-amber/.test(wszystko), false);
}

console.log(`WYNIK: ${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
