import { readFileSync } from "node:fs";
import { dataZFormularza } from "../src/lib/data-formularza.ts";
import { nazwaUbezpieczenia, rodzajChorobowego } from "../src/lib/dane-profilu.ts";
import { dataPL, opisTerminu, pln } from "../src/lib/format.ts";
import { odczytajPostep, rozwinPostep } from "../src/lib/postep-kreatora.ts";
import { registerHooks } from "node:module";

type Rowne = (nazwa: string, got: unknown, exp: unknown, tol?: number) => void;

export async function testyRodziceUI(rowne: Rowne) {
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(specifier === "../engine/kalkulator" ? specifier + ".ts" : specifier, context);
    },
  });
  const { zakresUrlopuOjcowskiego } = await import("../src/lib/urlop-ojcowski.ts").finally(() => hook.deregister());
  const drzewo = JSON.parse(readFileSync(new URL("../src/content/poradnik/drzewo_decyzyjne.json", import.meta.url), "utf8"));
  const p = JSON.parse(readFileSync(new URL("../data/parametry.json", import.meta.url), "utf8"));
  const limit = p.limity_dni.urlop_ojcowski_do_wieku_dziecka_miesiecy;
  const tydzien = p.limity_dni.urlop_ojcowski_min_czesc_dni;
  const pelny = p.limity_dni.urlop_ojcowski_dni;

  const kroki = odczytajPostep("[1,1,2]", drzewo.start, drzewo.wezly);
  rowne("Kreator otwiera zapisany wynik ojcowskiego", rozwinPostep(kroki, drzewo.start, drzewo.wezly).id, "wynik_ojcowski");
  rowne("Kreator odtwarza poprzednie pytanie", rozwinPostep(kroki.slice(0, -1), drzewo.start, drzewo.wezly).id, "po_podzial");
  rowne("Kreator odtwarza dotychczasowe wybory", rozwinPostep(kroki, drzewo.start, drzewo.wezly).wybory[0], "Czekamy na dziecko");
  rowne("Kreator cofa nieprawidłową końcówkę zapisu", odczytajPostep("[1,1,999,3]", drzewo.start, drzewo.wezly), [1, 1]);
  rowne("Kreator odrzuca uszkodzony zapis", odczytajPostep("{", drzewo.start, drzewo.wezly), []);
  rowne("Kreator nie przyjmuje kroku po ekranie z wynikiem", odczytajPostep("[2,1]", "po_podzial", drzewo.wezly), [2]);
  rowne("Kreator ma osobny zapis ścieżki taty", rozwinPostep([2], "po_podzial", drzewo.wezly).id, "wynik_ojcowski");

  rowne("Polskie pole daty przyjmuje 5.4.2027", dataZFormularza("5.4.2027"), "2027-04-05");
  rowne("Polskie pole odrzuca nieistniejący dzień", dataZFormularza("29.02.2027"), "");
  rowne("Polskie pole przyjmuje datę przestępną", dataZFormularza("29.02.2028"), "2028-02-29");
  rowne("Pełny polski zapis daty", dataPL("2027-04-05"), "5 kwietnia 2027");
  rowne("Format kwoty dla profilu Marka", pln(1200).replaceAll("\u00a0", " "), "1 200,00 zł");
  rowne("Termin z planu nie pokazuje daty ISO", opisTerminu("Wniosek o urlop ojcowski od 2027-04-05"), "Wniosek o urlop ojcowski od 5 kwietnia 2027");
  rowne("Etykieta działalności Marka", nazwaUbezpieczenia("dzialalnosc"), "Działalność gospodarcza");
  rowne("Etykieta ubezpieczenia Katarzyny", rodzajChorobowego("brak"), "brak");

  rowne("Wniosek ojcowski liczy ostatni dzień tygodnia", zakresUrlopuOjcowskiego("2027-04-05", "2027-04-15", tydzien, "2027-04-06", limit).koniec, "2027-04-21");
  rowne("Wniosek ojcowski liczy dwa tygodnie z przejściem miesiąca", zakresUrlopuOjcowskiego("2027-04-05", "2027-04-25", pelny, "2027-04-06", limit).koniec, "2027-05-08");
  rowne("Wniosek ojcowski blokuje przewidywaną datę porodu", Boolean(zakresUrlopuOjcowskiego("2027-04-05", "2027-04-15", tydzien, "2027-04-04", limit).blad), true);
  rowne("Wniosek ojcowski blokuje urlop przed narodzinami", Boolean(zakresUrlopuOjcowskiego("2027-04-05", "2027-04-04", tydzien, "2027-04-06", limit).blad), true);
  rowne("Wniosek ojcowski blokuje okres wykraczający poza limit wieku", Boolean(zakresUrlopuOjcowskiego("2027-04-05", "2028-04-01", tydzien, "2027-04-06", limit).blad), true);
}
