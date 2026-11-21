// Adres kalkulatora jako stan widoku: ?tryb=… (ścieżka/tryb) i ?krok=… (bieżący krok).
// Do adresu nigdy nie trafiają wpisane dane (zarobki, daty). Zostają w stanie komponentu.
//
// Next.js 16 integruje natywne history.pushState/replaceState z routerem: useSearchParams() odświeża się po każdej
// zmianie adresu (bez zapytania do serwera), a „Wstecz" przeglądarki cofa o jeden wpis. Funkcje poniżej wołamy tylko
// z procedur obsługi zdarzeń i efektów, więc nie dotykają window podczas renderu na serwerze.
// Klucz `rkr` w history.state (adres kroku, z którego przyszliśmy) ma to samo znaczenie co w src/lib/adres-kroku.ts.

export type Zmiany = Record<string, string | null | undefined>;

/** Adres ze zmienionymi parametrami (null/undefined/"" usuwa parametr, pozostałe, np. ?tryb=, zostają). Bezpieczne na serwerze. */
export function zbudujAdres(sciezka: string, szukaj: string, zmiany: Zmiany): string {
  const p = new URLSearchParams(szukaj);
  for (const [k, v] of Object.entries(zmiany)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const q = p.toString();
  return sciezka + (q ? `?${q}` : "");
}

const teraz = () => window.location.pathname + window.location.search;
const celZ = (zmiany: Zmiany) => zbudujAdres(window.location.pathname, window.location.search, zmiany);

/** Aktualna wartość parametru, czytana prosto z paska adresu (w efektach i procedurach zdarzeń). */
export const parametrZywy = (nazwa: string): string | null => new URLSearchParams(window.location.search).get(nazwa);

/** Nowy krok = nowy wpis historii. W jego stanie zapamiętujemy adres, z którego przyszliśmy. */
export function przejdz(zmiany: Zmiany): void {
  const cel = celZ(zmiany);
  const skad = teraz();
  if (cel === skad) return;
  window.history.pushState({ rkr: skad }, "", cel);
}

/** Korekta adresu bez nowego wpisu historii (wybór trybu, porządkowanie niepoprawnego kroku). Zachowuje `rkr` bieżącego wpisu. */
export function zastap(zmiany: Zmiany): void {
  const cel = celZ(zmiany);
  if (cel === teraz()) return;
  const stan: unknown = window.history.state;
  const rkr = typeof stan === "object" && stan !== null ? (stan as { rkr?: unknown }).rkr : undefined;
  window.history.replaceState(typeof rkr === "string" ? { rkr } : {}, "", cel);
}

/** „Wstecz": jeśli poprzedni wpis historii to dokładnie ten krok, cofa historię (bez dokładania wpisów); inaczej dodaje wpis. */
export function wroc(zmiany: Zmiany): void {
  const cel = celZ(zmiany);
  const stan: unknown = window.history.state;
  const skad = typeof stan === "object" && stan !== null ? (stan as { rkr?: unknown }).rkr : undefined;
  if (skad === cel) window.history.back();
  else przejdz(zmiany);
}
