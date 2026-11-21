// Stan jednej sprawy (faza, odwiedzone pytania, odpowiedzi) zapisywany we wpisie historii przeglądarki.
// Dzięki temu „Wstecz" przeglądarki cofa krok, a odświeżenie strony wraca do tego samego pytania.
// Niczego stąd nie wysyłamy na serwer ani nie trzymamy w adresie.

export type FazaSprawy = "dane" | "pytania" | "wynik";
export type Wartosci = Record<string, string>;

export interface Migawka {
  faza: FazaSprawy;
  historia: string[];
  odp: Wartosci;
  potwierdzone: Wartosci;
}

export interface WpisHistorii {
  s: string;       // id sprawy
  t: string;       // token sesji ("" dla gościa), żeby nie przenieść odpowiedzi między profilami
  n: number;       // numer kroku w tej sprawie, 0 = pierwszy ekran
  m: Migawka;
}

const FAZY: readonly string[] = ["dane", "pytania", "wynik"];
const prosty = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

function wartosci(x: unknown, dozwolone: ReadonlySet<string>): Wartosci | null {
  if (!prosty(x)) return null;
  const wynik: Wartosci = {};
  for (const [k, v] of Object.entries(x)) {
    if (!dozwolone.has(k) || typeof v !== "string") return null;
    wynik[k] = v;
  }
  return wynik;
}

/** Sprawdza, czy to, co przeglądarka oddała z history.state, jest poprawną migawką tej sprawy. Zwraca null, gdy nie. */
export function odczytajWpis(stan: unknown, idSprawy: string, token: string, idPytan: readonly string[]): WpisHistorii | null {
  const r = prosty(stan) ? stan.rks : null;
  if (!prosty(r) || r.s !== idSprawy || r.t !== token || !Number.isInteger(r.n) || (r.n as number) < 0 || !prosty(r.m)) return null;
  const dozwolone = new Set(idPytan);
  const m = r.m;
  const odp = wartosci(m.odp, dozwolone);
  const potwierdzone = wartosci(m.potwierdzone, dozwolone);
  const historia = Array.isArray(m.historia) && m.historia.every((id) => typeof id === "string" && dozwolone.has(id)) ? (m.historia as string[]) : null;
  if (!odp || !potwierdzone || !historia || typeof m.faza !== "string" || !FAZY.includes(m.faza)) return null;
  return { s: idSprawy, t: token, n: r.n as number, m: { faza: m.faza as FazaSprawy, historia, odp, potwierdzone } };
}

/** Cofnięcie zachowuje już udzielone odpowiedzi (nic, co ktoś wpisał, nie znika). Ruch do przodu bierze zapisaną migawkę. */
export function polaczPrzyPowrocie(zapisana: Migawka, biezaca: Migawka, wstecz: boolean): Migawka {
  return wstecz ? { ...zapisana, odp: biezaca.odp } : zapisana;
}

/** Wartość `state` do history.pushState / replaceState; dokłada się do stanu routera, niczego mu nie zabiera. */
export function stanHistorii(poprzedni: unknown, wpis: WpisHistorii): Record<string, unknown> {
  return { ...(prosty(poprzedni) ? poprzedni : {}), rks: wpis };
}

// Postęp zapisany też w pamięci przeglądarki, żeby po przerwie (dziecko płacze, telefon się wyłączył) nie zaczynać od zera.
// Trzymamy tylko odpowiedzi tej sprawy i tego profilu, tylko na tym urządzeniu; do niczego się nie wysyłają.
export const kluczPostepu = (idSprawy: string, token: string) => `rks-postep:${idSprawy}:${token}`;

export function zapiszPostep(klucz: string, wpis: WpisHistorii): void {
  try { localStorage.setItem(klucz, JSON.stringify(wpis)); } catch { /* tryb prywatny albo brak miejsca: bez zapisu */ }
}

export function usunPostep(klucz: string): void {
  try { localStorage.removeItem(klucz); } catch { /* jak wyżej */ }
}

/** Zapisany postęp, jeśli jest poprawny i dalej niż ekran startowy. Zły albo stary zapis ignorujemy. */
export function odczytajPostep(klucz: string, idSprawy: string, token: string, idPytan: readonly string[]): Migawka | null {
  try {
    const tekst = localStorage.getItem(klucz);
    if (!tekst) return null;
    const w = odczytajWpis({ rks: JSON.parse(tekst) }, idSprawy, token, idPytan);
    return w && (w.m.faza === "wynik" || w.m.historia.length > 0) ? w.m : null;
  } catch { return null; }
}
