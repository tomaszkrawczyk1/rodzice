// Przewijanie i fokus przy zmianie kroku. Matematyka jest osobno (da się ją testować bez przeglądarki).
// Zasada: po zmianie kroku tytuł pytania ląduje tuż pod górną krawędzią widoku (pod przyklejonym nagłówkiem,
// jeśli taki jest) i dostaje fokus bez przewijania. Nigdy nie przewijamy do pola, tylko do tytułu.

export const MARGINES = 12;

/** Docelowe window.scrollY, przy którym góra elementu leży `margines` px pod przyklejonym nagłówkiem. */
export function celPrzewijania(gora: number, scrollY: number, wysNaglowka: number, margines = MARGINES): number {
  return Math.max(0, Math.round(scrollY + gora - wysNaglowka - margines));
}

/** Czy element (góra/dół względem okna) jest zasłonięty przez przyklejony nagłówek albo wystaje poza okno. */
export function czyZasloniety(gora: number, dol: number, wysNaglowka: number, wysOkna: number): boolean {
  return gora < wysNaglowka - 0.5 || dol > wysOkna + 0.5 || dol <= 0;
}

/** Wysokość przyklejonego nagłówka z CSS (--header-h); 0, gdy nagłówek się przewija razem ze stroną. */
export function wysokoscNaglowka(): number {
  if (typeof document === "undefined") return 0;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h"));
  return Number.isFinite(v) ? v : 0;
}

/** Dotykowy ekran bez precyzyjnego wskaźnika: nie wolno tam otwierać klawiatury ani przewijać do pola. */
export function ekranDotykowy(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && !window.matchMedia("(pointer: fine)").matches;
}

/** Przewiń tak, by `blok` zaczynał się pod nagłówkiem, i (opcjonalnie) przenieś fokus na `fokus` bez przewijania. */
export function przejdzDoKroku(blok: HTMLElement | null, fokus?: HTMLElement | null): void {
  if (!blok || typeof window === "undefined") return;
  const cel = celPrzewijania(blok.getBoundingClientRect().top, window.scrollY, wysokoscNaglowka());
  window.scrollTo({ top: cel, left: 0, behavior: "instant" });
  fokus?.focus({ preventScroll: true });
}
