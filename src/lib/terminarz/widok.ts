// Logika widoku Terminarza bez Reacta: grupowanie względem dzisiejszej daty, walidacja formularza,
// dopasowanie linków do druków i zapis w przeglądarce. Żadnych dat ani liczb z przepisów:
// te liczy wyłącznie buildCalendar (terminarz.js), a teksty są w rules.json.
// Testy: test/terminarz-widok.ts (node --experimental-strip-types).

import type { Kategoria, Link, Rola, Wejscie, Wydarzenie, Zatrudnienie } from "./terminarz.js";

const DZIEN_MS = 86400000;

/** Okna grup w widoku (ustawienia prezentacji, nie przepisy). */
export const OKNO_TERAZ_DNI = 14;
export const OKNO_WKROTCE_DNI = 90;

export type Grupa = "teraz" | "wkrotce" | "pozniej" | "minelo";

export const GRUPY: { id: Grupa; tytul: string }[] = [
  { id: "teraz", tytul: "Teraz" },
  { id: "wkrotce", tytul: "Wkrótce" },
  { id: "pozniej", tytul: "Później" },
  { id: "minelo", tytul: "Minęło" },
];

export const KLUCZ_ZAPISU = "rodzice.terminarz";
export const MAX_DZIECI = 20;
const ROK_MIN = 2000;
const ROK_MAX = 2100;

/** Dzisiejsza data lokalna jako RRRR-MM-DD. */
export function dzisISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function naUTC(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

export function poprawnaData(iso: unknown): iso is string {
  if (typeof iso !== "string") return false;
  const t = naUTC(iso);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === iso;
}

/** Liczba dni od `od` do `do` (ujemna, gdy `do` jest wcześniej). */
export function dniMiedzy(od: string, doDnia: string): number {
  return Math.round((naUTC(doDnia) - naUTC(od)) / DZIEN_MS);
}

export function grupaDla(roznica: number): Grupa {
  if (roznica < 0) return "minelo";
  if (roznica <= OKNO_TERAZ_DNI) return "teraz";
  if (roznica <= OKNO_WKROTCE_DNI) return "wkrotce";
  return "pozniej";
}

const dni = (n: number) => `${n} ${n === 1 ? "dzień" : "dni"}`;

/** „dziś”, „jutro”, „za 5 dni”, „wczoraj”, „5 dni temu”. */
export function ileDni(roznica: number): string {
  if (roznica === 0) return "dziś";
  if (roznica === 1) return "jutro";
  if (roznica === -1) return "wczoraj";
  return roznica > 0 ? `za ${dni(roznica)}` : `${dni(-roznica)} temu`;
}

export type Pogrupowane = Record<Grupa, Wydarzenie[]>;

/** Dzieli wydarzenia na grupy względem `dzis`. Kolejność w grupie jak w buildCalendar (rosnąco po dacie). */
export function pogrupuj(zdarzenia: Wydarzenie[], dzis: string, kategoria: Kategoria | "" = ""): Pogrupowane {
  const wynik: Pogrupowane = { teraz: [], wkrotce: [], pozniej: [], minelo: [] };
  for (const z of zdarzenia) {
    if (kategoria && z.category !== kategoria && !z.isBirth) continue;
    wynik[grupaDla(dniMiedzy(dzis, z.date))].push(z);
  }
  return wynik;
}

/** Kategorie występujące w wynikach z liczbą wydarzeń (kolejność pierwszego wystąpienia). Poród nie liczy się do filtra. */
export function kategorieZLiczbami(zdarzenia: Wydarzenie[]): { kategoria: Kategoria; liczba: number }[] {
  const mapa = new Map<Kategoria, number>();
  for (const z of zdarzenia) if (!z.isBirth) mapa.set(z.category, (mapa.get(z.category) ?? 0) + 1);
  return [...mapa].map(([kategoria, liczba]) => ({ kategoria, liczba }));
}

// ---------- formularz ----------

export interface Formularz {
  birthDate: string;
  role: Rola | "";
  employment: Zatrudnienie | "";
  children: string;
}

export const PUSTY_FORMULARZ: Formularz = { birthDate: "", role: "", employment: "", children: "" };

export interface Walidacja {
  /** Gotowe wejście dla buildCalendar albo null, gdy czegoś brakuje. */
  wejscie: Wejscie | null;
  /** Błąd dla pola daty (gdy data jest, ale poza zakresem). */
  bladDaty: string;
  bladDzieci: string;
  /** Nazwy pól, których jeszcze brakuje. */
  brakuje: string[];
}

export function waliduj(f: Formularz, role: readonly string[], zatrudnienia: readonly string[]): Walidacja {
  const brakuje: string[] = [];
  let bladDaty = "";
  let bladDzieci = "";

  if (!f.birthDate) brakuje.push("data porodu");
  else if (!poprawnaData(f.birthDate)) bladDaty = "Wpisz prawidłową datę, np. 5.04.2027.";
  else {
    const rok = Number(f.birthDate.slice(0, 4));
    if (rok < ROK_MIN || rok > ROK_MAX) bladDaty = `Wpisz datę z lat ${ROK_MIN}–${ROK_MAX}.`;
  }
  if (!role.includes(f.role)) brakuje.push("dla kogo liczymy terminy");
  if (!zatrudnienia.includes(f.employment)) brakuje.push("forma zatrudnienia");

  const dzieci = Number(f.children);
  if (f.children.trim() === "") brakuje.push("liczba dzieci w rodzinie");
  else if (!/^\d+$/.test(f.children.trim()) || dzieci < 1 || dzieci > MAX_DZIECI) {
    bladDzieci = `Wpisz liczbę całkowitą od 1 do ${MAX_DZIECI}.`;
  }

  const ok = brakuje.length === 0 && !bladDaty && !bladDzieci;
  return {
    wejscie: ok ? { birthDate: f.birthDate, role: f.role as Rola, employment: f.employment as Zatrudnienie, children: dzieci } : null,
    bladDaty,
    bladDzieci,
    brakuje,
  };
}

// ---------- zapis w przeglądarce (tylko localStorage, bez wysyłki) ----------

type Magazyn = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function wczytajFormularz(magazyn: Magazyn | undefined, role: readonly string[], zatrudnienia: readonly string[]): Formularz {
  try {
    const surowe = magazyn?.getItem(KLUCZ_ZAPISU);
    if (!surowe) return { ...PUSTY_FORMULARZ };
    const z = JSON.parse(surowe) as Partial<Record<keyof Formularz, unknown>> | null;
    if (!z || typeof z !== "object") return { ...PUSTY_FORMULARZ };
    return {
      birthDate: poprawnaData(z.birthDate) ? z.birthDate : "",
      role: typeof z.role === "string" && role.includes(z.role) ? (z.role as Rola) : "",
      employment: typeof z.employment === "string" && zatrudnienia.includes(z.employment) ? (z.employment as Zatrudnienie) : "",
      children: typeof z.children === "string" && /^\d{1,2}$/.test(z.children) ? z.children : "",
    };
  } catch {
    return { ...PUSTY_FORMULARZ };
  }
}

export function zapiszFormularz(magazyn: Magazyn | undefined, f: Formularz): void {
  try {
    magazyn?.setItem(KLUCZ_ZAPISU, JSON.stringify(f));
  } catch { /* działa bez zapisu (tryb prywatny, zablokowane dane witryny) */ }
}

export function wyczyscZapis(magazyn: Magazyn | undefined): void {
  try {
    magazyn?.removeItem(KLUCZ_ZAPISU);
  } catch { /* j.w. */ }
}

// ---------- linki do druków ----------

export interface DrukZrodlo {
  id: string;
  nazwa?: string;
  url_zus?: string;
}

const specjalne = /[.*+?^${}()|[\]\\]/g;

/**
 * Dla druków wymienionych w `forms`, do których reguła nie podaje własnego linku, zwraca link do pustego wzoru.
 * `druki` to wpisy z druki.json (id, nazwa, url_zus); `zapasowe` uzupełnia url_zus, gdy druki.json go nie ma.
 */
export function linkiDoDrukow(
  forms: string[],
  juzMaLinki: Link[],
  druki: DrukZrodlo[],
  zapasowe: Record<string, { nazwa?: string; url_zus?: string }> = {},
): Link[] {
  const wszystkie = new Map<string, DrukZrodlo>();
  for (const [id, d] of Object.entries(zapasowe)) wszystkie.set(id, { id, ...d });
  for (const d of druki) {
    const klucz = d.id.replace(/^ZUS /, "");
    const wczesniej = wszystkie.get(klucz);
    wszystkie.set(klucz, { id: klucz, nazwa: d.nazwa ?? wczesniej?.nazwa, url_zus: d.url_zus ?? wczesniej?.url_zus });
  }
  const id =[...wszystkie.keys()].sort((a, b) => b.length - a.length);
  const uzyte = new Set(juzMaLinki.map((l) => l.url));
  const wynik: Link[] = [];
  for (const forma of forms) {
    for (const kandydat of id) {
      const wzor = new RegExp(`(?<![\\w-])${kandydat.replace(specjalne, "\\$&")}(?![\\w-])`);
      if (!wzor.test(forma)) continue;
      const d = wszystkie.get(kandydat)!;
      if (d.url_zus && !uzyte.has(d.url_zus)) {
        uzyte.add(d.url_zus);
        wynik.push({ title: `Pusty wzór: ${d.nazwa ?? kandydat} (zus.pl)`, url: d.url_zus });
      }
      break;
    }
  }
  return wynik;
}
