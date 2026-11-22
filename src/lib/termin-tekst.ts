/**
 * Opis terminu z silnika („Wniosek o urlop ojcowski od 2026-05-01") w języku użytkownika.
 * Silnik składa zdanie po polsku z datami RRRR-MM-DD, więc najpierw tłumaczymy zdanie (wzorce ze słownika
 * z miejscami {od}, {do}, {kto}), a dopiero potem zamieniamy daty i kwoty na zapis w danym języku.
 */
export function opisTerminuT(t: (pl: string) => string, opisObliczenia: (tekst: string) => string, co: string): string {
  const pl = co
    .replace("Wniosek matki o zasiłek w pełnym wymiarze", "Wniosek matki o uśrednioną stawkę zasiłku")
    .replace("Wniosek o zasiłek w pełnym wymiarze", "Wniosek o uśrednioną stawkę zasiłku")
    .replace(/\s*— nieprzekraczalnie/i, "")
    .replace(/(\d) %/g, "$1%");
  return opisObliczenia(t(pl));
}
