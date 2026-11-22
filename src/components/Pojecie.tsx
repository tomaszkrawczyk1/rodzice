"use client";
import { Fragment, useId, useState, type ReactNode } from "react";
import st from "./Pojecie.module.css";

/**
 * Słowniczek trudnych pojęć urzędowych. Przy pierwszym użyciu pojęcia w danym bloku tekstu
 * pokazujemy je jako przycisk: po kliknięciu obok rozwija się krótkie wyjaśnienie prostym językiem.
 * Wyjaśnienia są tylko tutaj – nie zmieniamy cytatów z przepisów w faq.json.
 */
export type Haslo = { id: string; wzor: RegExp; wyjasnienie: string };

const L = "\\p{L}*"; // dowolna końcówka polskiego słowa
const h = (id: string, wzor: string, wyjasnienie: string): Haslo => ({ id, wzor: new RegExp(wzor, "iu"), wyjasnienie });

export const SLOWNIK: Haslo[] = [
  h("podstawa", `podstaw${L} wymiaru`, "czyli kwota, od której ZUS liczy zasiłek. U pracownika to średnia miesięczna pensja brutto z ostatnich 12 miesięcy, pomniejszona o składki (13,71%)."),
  h("1/30", "1/30", "czyli kwota za jeden dzień: miesięczną kwotę dzieli się przez 30."),
  h("zam", "(?:druk\\p{L}* |wniosk\\p{L}* )?\\bZAM\\b", "wniosek o zasiłek macierzyński. Od 24.10.2026 to jeden druk – także na urlop rodzicielski i ojcowski."),
  h("z3a", "\\bZ-3a\\b", "zaświadczenie, które zleceniodawca (lub inny płatnik) wysyła do ZUS. Są w nim Twoje przychody, od których liczy się zasiłek."),
  h("z3", "\\bZ-3(?!a)\\b", "zaświadczenie, które pracodawca wysyła do ZUS. Są w nim Twoje zarobki, od których liczy się zasiłek. Ty go nie wypełniasz."),
  h("zas26", "\\bZAS-26\\b", "oświadczenie, w którym podajesz, kiedy przyjęliście dziecko na wychowanie (adopcja lub rodzina zastępcza)."),
  h("uzupelniajacy", `(?:urlop${L} )?uzupełniając${L}(?: urlop${L})?(?: macierzyńsk${L})?`, "dodatkowy urlop macierzyński, gdy dziecko urodziło się przedwcześnie albo po porodzie leżało w szpitalu: tydzień urlopu za każdy tydzień w szpitalu."),
  h("wyczekiwanie", `okres${L} wyczekiwania`, "czyli czas, przez który trzeba być ubezpieczoną, zanim dostanie się zasiłek chorobowy: 30 dni przy umowie o pracę, 90 dni przy dobrowolnym ubezpieczeniu."),
  h("prog20", "(?:powyżej|więcej niż|ponad|>) ?20(?: osób| ubezpieczonych| osobami)?", "czyli firma, która zgłasza do ubezpieczenia chorobowego więcej niż 20 osób (liczy się stan na 30 listopada poprzedniego roku). Taka firma sama wypłaca zasiłek. Najprościej zapytać w kadrach."),
  h("platnikSkladek", `płatnik${L} składek`, "czyli ten, kto opłaca za Ciebie składki do ZUS – zwykle pracodawca albo zleceniodawca. Gdy masz własną firmę, to Ty."),
  h("platnikZasilku", `płatnik${L} zasiłku`, "czyli ten, kto wypłaca Ci zasiłek: pracodawca (gdy zgłasza powyżej 20 osób) albo ZUS."),
  h("ezla", "\\be-ZLA\\b", "elektroniczne zwolnienie lekarskie. Lekarz wysyła je sam – nie musisz go nigdzie zanosić."),
  h("kodB", `kod${L} „?B”?(?![\\p{L}])`, "oznaczenie na zwolnieniu, że niezdolność do pracy wynika z ciąży. Wtedy zasiłek wynosi 100%."),
  h("815", "81,5\\s?%", "czyli równa kwota co miesiąc przez cały urlop macierzyński i rodzicielski – zamiast 100% na początku i 70% później. W sumie wychodzi prawie tyle samo."),
  h("orzecznik", `lekarz${L} orzeczni${L}`, "lekarz ZUS, który na podstawie dokumentów (czasem badania) ocenia, czy możesz pracować."),
  h("pue", "\\bPUE(?: ?/ ?eZUS)?|\\beZUS\\b", "Twoje konto w ZUS przez internet (Platforma Usług Elektronicznych). Logujesz się np. profilem zaufanym lub bankiem."),
  h("przedawnienie", `przedawni${L}`, "czyli po tym czasie nie można już upomnieć się o wypłatę."),
  h("przysposobienie", `przysposobieni${L}`, "czyli adopcja."),
  h("odpis", `(?:skrócon${L} odpis${L}|odpis${L} skrócon${L})`, "krótka wersja aktu urodzenia dziecka, wydawana przez urząd stanu cywilnego (także przez internet)."),
  h("zazyciem", "„Za życiem”", "zaświadczenie lekarskie o ciężkiej i nieodwracalnej niepełnosprawności albo nieuleczalnej chorobie dziecka. Daje prawo do dłuższego urlopu."),
  h("zadluzenie", `(?:zadłużeni${L}|zaległoś${L}) składkow${L}`, "czyli nieopłacone w terminie składki do ZUS."),
  h("chorobowePracodawcy", `wynagrodzeni${L} chorobow${L}`, "pieniądze za pierwsze dni zwolnienia w roku, które płaci pracodawca. Potem płaci ZUS."),
  h("dobrowolne", `dobrowoln${L} (?:ubezpieczeni${L} )?chorobow${L}`, "składka chorobowa, którą przy zleceniu albo własnej firmie płacisz z wyboru. Bez niej nie dostaniesz zasiłku."),
  h("warunkiMacierzynskiego", `na warunkach (?:urlopu )?macierzyńskiego`, "czyli urlop taki jak macierzyński, ale dla rodziców, którzy adoptują dziecko lub tworzą rodzinę zastępczą."),
];

/** Jedno pojęcie: kliknięcie rozwija wyjaśnienie tuż obok, w tekście (działa też na telefonie i z czytnikiem ekranu). */
export function Pojecie({ children, wyjasnienie }: { children: ReactNode; wyjasnienie: string }) {
  const [otwarte, setOtwarte] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" className={st.haslo} aria-expanded={otwarte} aria-controls={id} onClick={() => setOtwarte(!otwarte)}
        title={otwarte ? "Ukryj wyjaśnienie" : "Co to znaczy?"}>
        {children}<span className={st.znak} aria-hidden="true">?</span>
      </button>
      <span id={id} role="note" className={st.wyjasnienie} hidden={!otwarte}>{wyjasnienie}</span>
    </>
  );
}

/**
 * Zamienia tekst na węzły React z objaśnionymi pojęciami. Każde pojęcie objaśniamy tylko raz:
 * `uzyte` to zbiór wspólny dla całej karty/wyniku (twórz go w renderze rodzica: `const uzyte = new Set<string>()`).
 * To zwykła funkcja, a nie komponent – dzięki temu kolejność „pierwszego użycia” jest zawsze taka sama.
 */
export function zPojeciami(tekst: string | undefined, uzyte: Set<string> = new Set()): ReactNode {
  if (!tekst) return tekst;
  const wynik: ReactNode[] = [];
  let reszta = tekst;
  let klucz = 0;
  for (;;) {
    let najblizsze: { haslo: Haslo; poz: number; dl: number } | null = null;
    for (const haslo of SLOWNIK) {
      if (uzyte.has(haslo.id)) continue;
      const m = haslo.wzor.exec(reszta);
      if (m && m[0] && (!najblizsze || m.index < najblizsze.poz)) najblizsze = { haslo, poz: m.index, dl: m[0].length };
    }
    if (!najblizsze) break;
    const { haslo, poz, dl } = najblizsze;
    uzyte.add(haslo.id);
    if (poz > 0) wynik.push(reszta.slice(0, poz));
    wynik.push(<Pojecie key={klucz++} wyjasnienie={haslo.wyjasnienie}>{reszta.slice(poz, poz + dl)}</Pojecie>);
    reszta = reszta.slice(poz + dl);
  }
  if (!wynik.length) return tekst;
  if (reszta) wynik.push(reszta);
  return <Fragment>{wynik}</Fragment>;
}
