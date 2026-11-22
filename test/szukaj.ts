// Uruchom:  node --experimental-strip-types test/szukaj.ts
// Wyszukiwarka „Opisz sprawę własnymi słowami”: luźny język, częściowe trafienia i brak ślepej uliczki.
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

// Node uruchamia testy bez konfiguracji modułów Next. Na czas importu użyj tych samych aliasów (jak w test/sprawy.ts).
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
const { szukajLuzno, maSens, pojecia } = await import("../src/lib/szukaj.ts");
const { trafienia } = await import("../src/lib/indeks-szukaj.ts").finally(() => hook.deregister());

const faq = JSON.parse(readFileSync(new URL("../src/content/poradnik/faq.json", import.meta.url), "utf8")).pytania;
let ok = 0, fail = 0;
function sprawdz(nazwa: string, warunek: boolean, info?: unknown) {
  if (warunek) ok++; else { fail++; console.log(`FAIL  ${nazwa}${info === undefined ? "" : `\n   jest: ${JSON.stringify(info)}`}`); }
}
const wynik = (q: string) => {
  const w = szukajLuzno(q, faq);
  return { sprawy: w.sprawy.map((s) => s.id), faq: w.faq.map((f: { id: string }) => f.id), podobne: w.podobne.map((s) => s.id), zZapytania: w.podobneZZapytania };
};

// Zapytanie z testów UX: ma prowadzić do urlopu ojcowskiego i macierzyńskiego przy porodzie mnogim.
const bl = wynik("urodziły nam się bliźniaki jaki urlop dla ojca");
sprawdz("Bliźniaki + ojciec: jest pasująca sprawa", bl.sprawy.includes("urlop-pracodawca"), bl);
sprawdz("Bliźniaki + ojciec: pytanie o urlop ojcowski (F14)", bl.faq[0] === "F14", bl);
sprawdz("Bliźniaki + ojciec: pytanie o macierzyński przy porodzie mnogim (F07)", bl.faq.includes("F07"), bl);

// Odmiany i synonimy.
for (const q of ["bliźnięta", "poród mnogi", "mamy trojaczki"]) sprawdz(`Pojęcie bliźniąt: ${q}`, pojecia(q).has("blizniaki"), [...pojecia(q)]);
for (const q of ["tata", "ojciec", "mąż", "partner", "dla męża", "tatuś"]) sprawdz(`Pojęcie taty: ${q}`, pojecia(q).has("ojciec"), [...pojecia(q)]);
for (const q of ["JDG", "mam firmę", "prowadzę działalność", "samozatrudnienie"]) sprawdz(`Pojęcie działalności: ${q}`, pojecia(q).has("jdg"), [...pojecia(q)]);
for (const q of ["urodziła", "po porodzie", "urodziły się"]) sprawdz(`Pojęcie porodu: ${q}`, pojecia(q).has("porod"), [...pojecia(q)]);
for (const q of ["zasiłek", "pieniądze", "ile dostanę", "kasa"]) sprawdz(`Pojęcie pieniędzy: ${q}`, pojecia(q).has("pieniadze"), [...pojecia(q)]);
sprawdz("„rodzicielski” to nie poród", !pojecia("urlop rodzicielski").has("porod"));
sprawdz("„mamy” (czasownik) to nie mama", !pojecia("mamy bliźniaki").has("mama"));
sprawdz("„pracodawca” to nie praca na urlopie", !pojecia("pracodawca").has("praca"));

const jdg = wynik("mam jdg i urodziłam, co mi się należy");
sprawdz("JDG: sprawa „co przysługuje” i pytanie F20", jdg.sprawy.includes("co-przysluguje") || jdg.podobne.includes("co-przysluguje"), jdg);
sprawdz("JDG: pytanie F20", jdg.faq.includes("F20"), jdg);

const tata = wynik("ile wolnego dostanie mój facet");
sprawdz("Facet + wolne: wśród wyników urlop u pracodawcy", [...tata.sprawy, ...tata.podobne].includes("urlop-pracodawca"), tata);

// „ile dostanę” same słowa pomijane, ale z sensem: wyszukujemy.
sprawdz("„ile dostanę” ma sens", maSens("ile dostanę"));
sprawdz("„<b>x</b>” nie ma sensu", !maSens("<b>x</b>"));

// Dotychczasowe trafienia silnika zostają.
sprawdz("Adopcja bez zmian", wynik("adopcja").sprawy[0] === "adopcja");
sprawdz("Szef nie chce dać urlopu bez zmian", wynik("szef nie chce dać urlopu").sprawy[0] === "urlop-pracodawca");

// Brak wyniku: nigdy pusta lista, 2–4 propozycje.
for (const q of ["pogoda jutro w Łodzi", "coś tam", "urlop", "chcę wiedzieć o tacie"]) {
  const w = wynik(q);
  const razem = w.sprawy.length + w.podobne.length;
  sprawdz(`Zawsze jest dokąd pójść: ${q}`, razem >= 1 && (w.sprawy.length > 0 || (w.podobne.length >= 2 && w.podobne.length <= 4)), w);
}
sprawdz("Bez pojęć: najczęstsze sprawy (nie z zapytania)", wynik("pogoda jutro w Łodzi").zZapytania === false);


// Indeks „co można zrobić na stronie": druki, wyniki drzewka, od pierwszej litery.
const top = (q: string, ile = 3) => trafienia(q, ile);
sprawdz("indeks: ZAM → druk ZAM na pierwszym miejscu", top("ZAM")[0]?.href === "/druki#ZAM", top("ZAM"));
sprawdz("indeks: kod druku bez wielkich liter i z myślnikiem (z-3a)", top("z-3a")[0]?.href === "/druki#Z-3a", top("z-3a"));
sprawdz("indeks: Z-3 przed Z-3a", top("Z-3")[0]?.href === "/druki#Z-3" && top("Z-3")[1]?.href === "/druki#Z-3a", top("Z-3"));
sprawdz("indeks: jedna litera „z” pokazuje druki na z", top("z").length === 3 && top("z").every((r) => r.rodzaj === "druk"), top("z"));
sprawdz("indeks: jedna litera „n” to początki słów, nie środek", top("n").length === 3 && top("n").every((r) => /(^|[\s–-])n/i.test(r.tytul)), top("n"));
sprawdz("indeks: jedna litera zawsze ma trafienia, nigdy więcej niż 3", "abcdefgijklmnoprstuwz".split("").every((l) => top(l).length >= 1 && top(l).length <= 3), "abcdefgijklmnoprstuwz".split("").filter((l) => !top(l).length));
sprawdz("indeks: wszystkie 29 wyników drzewka da się znaleźć po początku tytułu",
  trafienia("", 9).length === 0 && new Set("abcdefghijklmnopqrstuvwxyz".split("").flatMap((l) => trafienia(l, 999, ["wynik"]).map((r) => r.id))).size === 29);
sprawdz("indeks: wynik liczący zasiłek prowadzi do kroku „dziecko” kalkulatora", top("ile trwa urlop")[0]?.href === "/kalkulator?tryb=matka&krok=dziecko", top("ile trwa urlop"));
sprawdz("indeks: wynik bez liczenia prowadzi do kreatora (krok z adresu)", top("odpis aktu", 5).some((r) => r.rodzaj === "wynik" && /^\/kreator\?krok=\d+(\.\d+)*$/.test(r.href)), top("odpis aktu", 5));
sprawdz("indeks: „tata” → wynik o podziale urlopu między rodziców", top("tata").some((r) => r.href === "/kalkulator?tryb=oboje&krok=dziecko"), top("tata"));
sprawdz("indeks: literówka „urlpo ojcowski”", top("urlpo ojcowski").some((r) => /ojcowski/i.test(r.tytul)), top("urlpo ojcowski"));
sprawdz("indeks: bez bzdur (xyzqw) → brak trafień", top("xyzqw").length === 0, top("xyzqw"));
sprawdz("indeks: kod druku nie ciągnie wyników, które tylko wspominają ZAM", !top("ZAM", 5).some((r) => r.rodzaj === "wynik"), top("ZAM", 5));
sprawdz("indeks: zawężenie do rodzajów", trafienia("zam", 5, ["druk"]).every((r) => r.rodzaj === "druk"));
console.log(`Wyszukiwarka: ${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
