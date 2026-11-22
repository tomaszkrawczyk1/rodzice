// Uruchom: node --experimental-strip-types test/parser.ts   (Node 22+)
// Odczyt lokalny (OCR) syntetycznych skanów z public/demo -> pola -> podstawa z silnika. Bez AI i bez sieci.
// Opcjonalnie: RODZICE_SPRAWY_DIR=<katalog z PDF-ami> sprawdza prawdziwe skany lokalnie i wypisuje TYLKO liczby (bez treści).
import { registerHooks } from "node:module";
import { readFileSync, readdirSync } from "node:fs";

let ok = 0, fail = 0;
function rowne(nazwa: string, got: unknown, exp: unknown) {
  if (JSON.stringify(got) === JSON.stringify(exp)) ok++;
  else { fail++; console.log(`FAIL  ${nazwa}\n   oczekiwano: ${JSON.stringify(exp)}\n   jest:       ${JSON.stringify(got)}`); }
}

const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    const sciezka = specifier.startsWith("@/") ? new URL(`../src/${specifier.slice(2)}`, import.meta.url).href : specifier;
    const lokalna = (sciezka.startsWith("file:") || sciezka.startsWith(".")) && !context.parentURL?.includes("/node_modules/") && !sciezka.includes("/node_modules/");
    const rozszerzenie = /\.(ts|json|js|mjs|cjs)$/.test(sciezka);
    return nextResolve(lokalna && !rozszerzenie ? sciezka + ".ts" : sciezka, context);
  },
});
const { odczytajTekst, rozpoznajFormat, zamknijOcr } = await import("../src/lib/ocr.ts");
const { parsujTekst, policzPodstawe, peselOk, dataIso, kwota } = await import("../src/lib/parser.ts").finally(() => hook.deregister());
const { podstawaPracownik, wierszZ3NaMiesiac } = await import("../src/engine/kalkulator.ts");
const parametry = JSON.parse(readFileSync(new URL("../data/parametry.json", import.meta.url), "utf8"));

// --- walidatory ---
rowne("PESEL poprawny", peselOk("44051401359"), true);
rowne("PESEL zła suma", peselOk("44051401358"), false);
rowne("PESEL za krótki", peselOk("123"), false);
rowne("data ISO", dataIso("od 2027-03-15"), "2027-03-15");
rowne("data polska", dataIso("15.03.2027 r."), "2027-03-15");
rowne("data z błędem OCR (rok 2627)", dataIso("2627-03-15"), null);
rowne("data nieistniejąca", dataIso("2027-02-31"), null);
rowne("kwota z przecinkiem i spacją", kwota("6 500,00"), 6500);
rowne("liczba całkowita nie jest kwotą", kwota("6500"), null);
rowne("format PDF po nagłówku", rozpoznajFormat(new TextEncoder().encode("%PDF-1.7 abc"))?.mime, "application/pdf");
rowne("format PNG po nagłówku", rozpoznajFormat(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5]))?.mime, "image/png");
rowne("plik tekstowy odrzucony", rozpoznajFormat(new TextEncoder().encode("to nie jest PDF")), null);

// --- parser na tekście (bez OCR): Z-3 z wierszami o różnej jakości ---
{
  const linie = ["Zaświadczenie płatnika składek Z-3", "Płatnik składek: ACME Sp. z o.o., NIP 123-456-32-18", "Ubezpieczona: Maria Nowak", "PESEL: 44051401359",
    "Wymiar czasu pracy: 1/2 etatu", "Wniosek o zasiłek macierzyński za okres: od 15.03.2027 do 01.08.2027",
    "2026 3 22 22 3 000,00 0,00 0,00 13,71", "2026 4 10 20 3000.00 0.00 0.00 13.71", "2026 5 99 22 3000.00 0.00 0.00 13.71", "2026 6 22 22 3000 0.00 0.00 13.71"];
  const w = parsujTekst([{ nr: 1, zrodlo: "warstwa_tekstowa", linie: linie.map((tekst) => ({ tekst, pewnosc: 0.98 })) }]);
  rowne("tekst: typ", w.dane.typ_dokumentu, "Z-3");
  rowne("tekst: PESEL", w.dane.ubezpieczony.pesel, "44051401359");
  rowne("tekst: osoba", [w.dane.ubezpieczony.imie, w.dane.ubezpieczony.nazwisko], ["Maria", "Nowak"]);
  rowne("tekst: NIP", w.dane.platnik.nip, "1234563218");
  rowne("tekst: wymiar etatu 1/2", w.dane.zatrudnienie.wymiar_etatu, 0.5);
  rowne("tekst: okres macierzyński", w.dane.wnioskowane_okresy[0], { rodzaj: "macierzynski", od: "2027-03-15", do: "2027-08-01", pewnosc: 0.98 });
  rowne("tekst: do tabeli wchodzą tylko poprawne wiersze (dni 99>22 i kwota bez groszy odpadają)", w.dane.skladniki_miesieczne.map((r) => r.miesiac), [3, 4]);
  rowne("tekst: kwota ze spacją tysięcy", w.dane.skladniki_miesieczne[0].stale, 3000);
  rowne("tekst: procent składki", w.dane.skladniki_miesieczne[0].procentSkladki, 13.71);
  rowne("tekst: ostrzeżenie o braku miesięcy", w.ostrzezenia.some((o) => o.includes("2 z 12")), true);
}
{
  const w = parsujTekst([{ nr: 1, zrodlo: "ocr", linie: [{ tekst: "PESEL: 00000000001", pewnosc: 0.9 }, { tekst: "Zdjęcie kota", pewnosc: 0.4 }] }]);
  rowne("zły PESEL obniża pewność i ostrzega", [w.pewnosc.pesel! <= 0.5, w.ostrzezenia.some((o) => o.includes("PESEL"))], [true, true]);
  rowne("nieznany dokument ostrzega", w.ostrzezenia.some((o) => o.includes("Nie rozpoznano rodzaju")), true);
}

{
  const w = parsujTekst([{ nr: 1, zrodlo: "ocr", linie: [{ tekst: "PESEL 4 4 0 5 1 4 0 1 3 5 9", pewnosc: 0.9 }] }]);
  rowne("PESEL w kratkach (cyfry ze spacjami)", w.dane.ubezpieczony.pesel, "44051401359");
}

// --- prawdziwy OCR na skanach z repo ---
async function demo(plik: string) {
  const b = new Uint8Array(readFileSync(new URL(`../public/demo/${plik}`, import.meta.url)));
  const fmt = rozpoznajFormat(b)!;
  const odczyt = await odczytajTekst(b, fmt);
  return { odczyt, wynik: parsujTekst(odczyt.strony) };
}
{
  const { odczyt, wynik: w } = await demo("Z-3_przyklad_Anna_Kowalska.pdf");
  rowne("Z-3 Anna: skan, bez warstwy tekstowej, OCR", odczyt.strony.map((s) => s.zrodlo), ["ocr"]);
  rowne("Z-3 Anna: typ", w.dane.typ_dokumentu, "Z-3");
  rowne("Z-3 Anna: PESEL", w.dane.ubezpieczony.pesel, "00000000001");
  rowne("Z-3 Anna: osoba", [w.dane.ubezpieczony.imie, w.dane.ubezpieczony.nazwisko], ["Anna", "Kowalska"]);
  rowne("Z-3 Anna: powyżej 20", w.dane.platnik.liczba_ubezpieczonych, "powyzej_20");
  rowne("Z-3 Anna: okres", [w.dane.wnioskowane_okresy[0]?.od, w.dane.wnioskowane_okresy[0]?.do], ["2027-03-15", "2027-08-01"]);
  rowne("Z-3 Anna: data zdarzenia", w.dane.data_zdarzenia, "2027-03-15");
  rowne("Z-3 Anna: pełny etat", w.dane.zatrudnienie.wymiar_etatu, 1);
  rowne("Z-3 Anna: 12 miesięcy", w.dane.skladniki_miesieczne.length, 12);
  rowne("Z-3 Anna: wiersze kolejno od 2026-03 do 2027-02", [w.dane.skladniki_miesieczne[0].rok, w.dane.skladniki_miesieczne[0].miesiac, w.dane.skladniki_miesieczne[11].rok, w.dane.skladniki_miesieczne[11].miesiac], [2026, 3, 2027, 2]);
  rowne("Z-3 Anna: stałe 6500 w każdym wierszu", w.dane.skladniki_miesieczne.every((r) => r.stale === 6500 && r.zmiennePomniejszone === 0 && r.premieFaktyczne === 0 && r.procentSkladki === 13.71), true);
  // wynik end-to-end: silnik na odczytanych wierszach = silnik na wierszach wpisanych ręcznie z dokumentu
  const dni = [22, 20, 22, 22, 21, 22, 23, 20, 22, 23, 21, 21];
  const reczne = podstawaPracownik({ miesiace: dni.map((d, i) => wierszZ3NaMiesiac({ rok: i < 10 ? 2026 : 2027, miesiac: ((2 + i) % 12) + 1, dniPrzepracowal: d, dniObowiazany: d, stale: 6500, zmiennePomniejszone: 0, premieFaktyczne: 0 })), pelnyWymiarEtatu: true }, parametry);
  const p = policzPodstawe(w.dane);
  rowne("Z-3 Anna: podstawa z odczytu = podstawa z silnika", p?.wynik.podstawaMiesieczna, reczne.podstawaMiesieczna);
  rowne("Z-3 Anna: podstawa miesięczna (6500 minus 13,71 %)", p?.wynik.podstawaMiesieczna, 5608.85);
}
{
  const { wynik: w } = await demo("Z-3_przyklad_Dominika_Kaminska.pdf");
  rowne("Z-3 Dominika: PESEL i osoba", [w.dane.ubezpieczony.pesel, w.dane.ubezpieczony.imie, w.dane.ubezpieczony.nazwisko], ["00000000008", "Dominika", "Kamińska"]);
  rowne("Z-3 Dominika: 12 miesięcy po 5800", [w.dane.skladniki_miesieczne.length, w.dane.skladniki_miesieczne.every((r) => r.stale === 5800)], [12, true]);
  rowne("Z-3 Dominika: podstawa (5800 minus 13,71 %)", policzPodstawe(w.dane)?.wynik.podstawaMiesieczna, 5004.82);
}
{
  const { wynik: w } = await demo("ZAM_przyklad_Anna_Kowalska.pdf");
  rowne("ZAM: typ", w.dane.typ_dokumentu, "ZAM");
  rowne("ZAM: PESEL", w.dane.ubezpieczony.pesel, "00000000001");
  rowne("ZAM: data porodu", w.dane.data_zdarzenia, "2027-03-15");
  rowne("ZAM: podstawa wniosku", w.dane.podstawa_wniosku, "porod");
  rowne("ZAM: okresy", w.dane.wnioskowane_okresy.map((o) => [o.rodzaj, o.od, o.do]), [["macierzynski", "2027-03-15", "2027-08-01"], ["rodzicielski", "2027-08-02", "2028-03-12"]]);
  rowne("ZAM: wariant 81,5 – nie", w.dane.wariant_81_5, false);
  rowne("ZAM: brak tabeli, brak podstawy", policzPodstawe(w.dane), null);
}

// --- lokalnie: prawdziwe skany ZUS, tylko liczby ---
const dir = process.env.RODZICE_SPRAWY_DIR;
if (dir) {
  const pliki = readdirSync(dir).filter((f) => /\.pdf$/i.test(f)).sort().slice(0, +(process.env.RODZICE_SPRAWY_MAX ?? 5));
  for (const [i, f] of pliki.entries()) {
    const t0 = Date.now(); const b = new Uint8Array(readFileSync(`${dir}/${f}`));
    const o = await odczytajTekst(b, rozpoznajFormat(b)!); const w = parsujTekst(o.strony);
    const pp = policzPodstawe(w.dane);
    console.log(`sprawa ${i + 1}: stron ${o.stron}, typ ${w.dane.typ_dokumentu}, PESEL ${w.dane.ubezpieczony.pesel ? (peselOk(w.dane.ubezpieczony.pesel) ? "poprawny" : "zła suma") : "brak"}, okresów ${w.dane.wnioskowane_okresy.length}, miesięcy ${w.dane.skladniki_miesieczne.length}, podstawa ${pp ? "policzona" : "brak"}, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
}
await zamknijOcr();
console.log(`\nWYNIK parser: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
