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
const { szukajLuzno, maSens, pojecia } = await import("../src/lib/szukaj.ts").finally(() => hook.deregister());

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

console.log(`Wyszukiwarka: ${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
