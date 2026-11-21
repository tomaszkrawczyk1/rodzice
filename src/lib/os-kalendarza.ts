// =====================================================================
// os-kalendarza.ts — kamienie milowe do wizualnej osi czasu na stronie /kalendarz.
// Funkcja czysta: nie zawiera żadnej treści medycznej ani przepisów. Bierze gotowy wynik
// kalendarza (wydarzenia z data/kalendarz_medyczny.json), terminy wniosków z silnika oraz
// (opcjonalnie) plan urlopów z kalkulatora i układa je w jedną listę chronologiczną.
// =====================================================================
import { planZasilku, type Parametry, type PlanWejscie } from "../engine/kalkulator.ts";
import { RODZAJE } from "./format.ts";
import { terminyKalendarza, type KalendarzWynik, type WydarzenieNaOsi } from "./kalendarz.ts";

export type RodzajKamienia = "badanie" | "wizyta" | "szczepienie" | "zajecia" | "urlop" | "wniosek" | "porod";
export type FiltrOsi = "wszystko" | "badania" | "urlop";

export interface Kamien {
  id: string;
  rodzaj: RodzajKamienia;
  tytul: string;
  /** Początek okna (ISO). Dla terminu jednodniowego równy `do`. */
  od: string;
  /** Koniec okna albo termin (ISO). */
  do: string;
  /** true, gdy to termin składania („do dnia…”), a nie okno wykonania. */
  termin?: boolean;
  /** Kotwica na stronie (np. #kalendarz-w-USG-01). */
  href?: string;
  szacunkowe?: boolean;
}

export const ETYKIETY_RODZAJU: Record<RodzajKamienia, string> = {
  badanie: "Badanie",
  wizyta: "Wizyta",
  szczepienie: "Szczepienie",
  zajecia: "Zajęcia",
  urlop: "Urlop",
  wniosek: "Wniosek",
  porod: "Poród",
};

const RODZAJ_WG_KATEGORII: Record<string, RodzajKamienia> = {
  usg: "badanie",
  badanie_prenatalne: "badanie",
  badanie_krwi: "badanie",
  test_glukozy: "badanie",
  wymaz: "badanie",
  badanie_poporodowe: "badanie",
  wizyta: "wizyta",
  wizyta_patronazowa: "wizyta",
  bilans: "wizyta",
  szczepienie: "szczepienie",
  szkola_rodzenia: "zajecia",
};

const ISO = /\d{4}-\d{2}-\d{2}/g;

/** Czy kamień należy do widoku wybranego filtrem. Poród widać zawsze. */
export function pasujeDoFiltra(k: Kamien, filtr: FiltrOsi): boolean {
  if (filtr === "wszystko" || k.rodzaj === "porod") return true;
  const urlopowy = k.rodzaj === "urlop" || k.rodzaj === "wniosek";
  return filtr === "urlop" ? urlopowy : !urlopowy;
}

function zWydarzenia(e: WydarzenieNaOsi): Kamien {
  return {
    id: `w-${e.id}`,
    rodzaj: RODZAJ_WG_KATEGORII[e.kategoria] ?? "wizyta",
    tytul: e.nazwa,
    od: e.od,
    do: e.do,
    href: `#kalendarz-w-${e.id}`,
    szacunkowe: e.szacunkowe,
  };
}

/**
 * Układa kamienie milowe w kolejności chronologicznej (po początku okna).
 * Pomijamy wizyty cykliczne (pole `czestotliwosc`, np. „co 4 tygodnie”) — ich okna obejmują cały
 * etap i zasłoniłyby oś; są w opisach etapów poniżej.
 */
export function kamienieMilowe(
  wynik: KalendarzWynik,
  parametry: Parametry,
  formatujDate: (iso: string) => string,
  plan?: PlanWejscie,
): { kamienie: Kamien[]; pominieteCykliczne: number; brakPlanuUrlopu: boolean } {
  const kamienie: Kamien[] = [];
  let pominiete = 0;
  for (const e of wynik.oś) {
    if (e.czestotliwosc?.trim()) { pominiete++; continue; }
    kamienie.push(zWydarzenia(e));
  }

  const dataPorodu = wynik.dataPorodu ?? wynik.terminPorodu;
  kamienie.push({
    id: "porod",
    rodzaj: "porod",
    tytul: wynik.dataPorodu ? "Poród" : "Planowany termin porodu",
    od: dataPorodu,
    do: dataPorodu,
  });

  const { wniosek, doPracodawcy } = terminyKalendarza(wynik, parametry, plan);
  kamienie.push({
    id: "wniosek-zus",
    rodzaj: "wniosek",
    tytul: "Wniosek o zasiłek macierzyński",
    od: wniosek,
    do: wniosek,
    termin: true,
    href: "#kalendarz-zus",
    szacunkowe: !wynik.dataPorodu,
  });
  doPracodawcy.forEach((t, i) => kamienie.push({
    id: `wniosek-pracodawca-${i}`,
    rodzaj: "wniosek",
    tytul: t.co.replace(ISO, formatujDate),
    od: t.do!,
    do: t.do!,
    termin: true,
    href: "#kalendarz-zus",
  }));

  // Urlopy: tylko gdy w kalkulatorze policzono plan dla tej samej daty porodu.
  const planPasuje = plan?.tytul === "porod" && plan.dataZdarzenia === dataPorodu;
  if (planPasuje) {
    for (const [i, o] of planZasilku(plan, parametry).okresy.entries()) {
      kamienie.push({
        id: `urlop-${i}`,
        rodzaj: "urlop",
        tytul: `${RODZAJE[o.rodzaj] ?? "Okres zasiłku"} (${o.kto === "matka" ? "matka" : "ojciec"})`,
        od: o.od,
        do: o.do,
      });
    }
  }

  kamienie.sort((a, b) => a.od.localeCompare(b.od) || a.do.localeCompare(b.do) || a.id.localeCompare(b.id));
  return { kamienie, pominieteCykliczne: pominiete, brakPlanuUrlopu: !planPasuje };
}

export type StanKamienia = "minelo" | "trwa" | "przed";
export function stanKamienia(k: Kamien, dzis: string): StanKamienia {
  return k.do < dzis ? "minelo" : k.od <= dzis ? "trwa" : "przed";
}
