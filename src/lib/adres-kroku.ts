// Krok widoku zapisany w adresie (parametry zapytania) i we wpisie historii przeglądarki.
// Next.js 16 integruje natywne history.pushState/replaceState z routerem: useSearchParams() odświeża się
// po każdej zmianie, a „Wstecz" przeglądarki cofa dokładnie o jeden krok (tak samo jak w src/components/Sprawa.tsx).
// Funkcje wołamy tylko z procedur obsługi zdarzeń, więc nie dotykają window podczas renderu na serwerze.

export type Zmiany = Record<string, string | null | undefined>;

const biezacyAdres = () => window.location.pathname + window.location.search;

/** Adres bieżącej strony z podmienionymi parametrami; null/undefined/"" usuwa parametr, reszta (np. ?sciezka=) zostaje. */
export function adresZ(zmiany: Zmiany): string {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(zmiany)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const q = p.toString();
  return window.location.pathname + (q ? `?${q}` : "");
}

/** Nowy krok = nowy wpis historii. W stanie zapamiętujemy adres kroku, z którego przyszliśmy (`rkr`). */
export function przejdzKrok(zmiany: Zmiany, opcje: { zastap?: boolean } = {}): void {
  const cel = adresZ(zmiany);
  const skad = biezacyAdres();
  if (cel === skad) return;
  const stan = { rkr: skad };
  if (opcje.zastap) window.history.replaceState(stan, "", cel);
  else window.history.pushState(stan, "", cel);
}

/** „Wróć": jeśli poprzedni wpis historii to dokładnie ten krok, cofa historię (bez dokładania wpisów); inaczej (np. wejście z linku) dodaje wpis. */
export function wrocDoKroku(zmiany: Zmiany): void {
  const cel = adresZ(zmiany);
  const stan: unknown = window.history.state;
  const skad = typeof stan === "object" && stan !== null ? (stan as { rkr?: unknown }).rkr : undefined;
  if (skad === cel) window.history.back();
  else przejdzKrok(zmiany);
}
