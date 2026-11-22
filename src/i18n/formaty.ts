// Daty, kwoty, liczby i okresy w wybranym języku. Wspólne dla serwera i klienta (bez importów z Reacta i Next.js).
// Plik nie importuje słowników ani `jezyki.ts`, żeby nie tworzyć cyklu: `jezyki.ts` używa go do tłumaczenia gotowych zdań.

export type KodJezyka = "pl" | "en" | "uk";
export const KOD_LOCALE: Record<KodJezyka, string> = { pl: "pl-PL", en: "en-GB", uk: "uk-UA" };

/** Liczba mnoga: polska i ukraińska (1 / 2–4 / reszta, inne końcówki) oraz angielska (1 / reszta). */
function forma(jezyk: KodJezyka, n: number, f: { jeden: string; kilka: string; wiele: string }): string {
  if (jezyk === "en") return n === 1 ? f.jeden : f.wiele;
  const m10 = n % 10, m100 = n % 100;
  if (n === 1) return f.jeden;
  // Ukraiński: 21, 31, 41… to liczba pojedyncza („41 тиждень”), ale 11 to „11 тижнів”. W polskim 21 to „21 tygodni”.
  if (jezyk === "uk" && m10 === 1 && m100 !== 11) return f.jeden;
  return m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 > 20) ? f.kilka : f.wiele;
}

const TYDZIEN: Record<KodJezyka, { jeden: string; kilka: string; wiele: string }> = {
  pl: { jeden: "tydzień", kilka: "tygodnie", wiele: "tygodni" },
  en: { jeden: "week", kilka: "weeks", wiele: "weeks" },
  uk: { jeden: "тиждень", kilka: "тижні", wiele: "тижнів" },
};
const DZIEN: Record<KodJezyka, { jeden: string; kilka: string; wiele: string }> = {
  pl: { jeden: "dzień", kilka: "dni", wiele: "dni" },
  en: { jeden: "day", kilka: "days", wiele: "days" },
  uk: { jeden: "день", kilka: "дні", wiele: "днів" },
};

const dzienSzwedzki = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" });
/** Dzisiejsza data w Polsce (RRRR-MM-DD). Nie używamy toISOString(), bo to czas UTC: między 0:00 a 1:00/2:00 dawał wczorajszy dzień. */
export const dzis = (d: Date = new Date()) => dzienSzwedzki.format(d);

function budujFormaty(jezyk: KodJezyka) {
  const loc = KOD_LOCALE[jezyk];
  const waluta = new Intl.NumberFormat(loc, { style: "currency", currency: "PLN", useGrouping: "always" });
  const walutaPelna = new Intl.NumberFormat(loc, { style: "currency", currency: "PLN", maximumFractionDigits: 0, useGrouping: "always" });
  const pelnaData = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const miesiacRok = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" });
  const liczbaFmt = new Map<number, Intl.NumberFormat>();
  const liczba = (n: number, d = 2) => {
    let f = liczbaFmt.get(d);
    if (!f) liczbaFmt.set(d, (f = new Intl.NumberFormat(loc, { maximumFractionDigits: d })));
    return f.format(n);
  };
  const pln = (n: number | undefined | null) => n == null || !Number.isFinite(n) ? "—" : waluta.format(n);
  /** Kwota „na oko", do pełnych złotych: tam, gdzie obok stoi „ok.", grosze tylko by udawały dokładność. */
  const plOk = (n: number | undefined | null) => n == null || !Number.isFinite(n) ? "—" : walutaPelna.format(n);
  const dataPL = (iso?: string | null) => {
    if (!iso) return "—";
    const data = new Date(iso + "T00:00:00Z");
    return Number.isFinite(data.getTime()) ? pelnaData.format(data) : "—";
  };
  const miesiacPL = (rok: number, miesiac: number) => {
    if (!Number.isInteger(rok) || !Number.isInteger(miesiac) || miesiac < 1 || miesiac > 12) return "—";
    return miesiacRok.format(new Date(Date.UTC(rok, miesiac - 1, 1)));
  };
  const dataKrotka = (iso?: string | null) => (iso ? iso.split("-").reverse().join(".") : "—");
  const tygodnie = (n: number) => `${liczba(n, 1)} ${jezyk === "uk" && !Number.isInteger(n) ? "тижня" : forma(jezyk, n, TYDZIEN[jezyk])}`;
  const dni = (n: number) => `${liczba(n, 0)} ${forma(jezyk, n, DZIEN[jezyk])}`;
  /** Zamienia w opisie obliczeń daty RRRR-MM-DD i kwoty „123.45 zł" na zapis w wybranym języku. */
  const opisObliczenia = (tekst: string) => tekst
    .replace(/\d{4}-\d{2}-\d{2}/g, (d) => dataPL(d))
    .replace(/(\d+(?:\.\d+)?) zł/g, (_, n) => pln(Number(n)));
  /** Jak opisObliczenia, a dodatkowo upraszcza nazwy wniosków i końcówki terminów z reguł. */
  const opisTerminu = (tekst: string) => opisObliczenia(tekst)
    .replace("Wniosek matki o zasiłek w pełnym wymiarze", "Wniosek matki o uśrednioną stawkę zasiłku")
    .replace("Wniosek o zasiłek w pełnym wymiarze", "Wniosek o uśrednioną stawkę zasiłku")
    .replace(/\s*— nieprzekraczalnie/i, "")
    .replace(/(\d) %/g, "$1%");
  return { jezyk, locale: loc, pln, plOk, liczba, dataPL, miesiacPL, dataKrotka, tygodnie, dni, opisObliczenia, opisTerminu };
}

export type Formaty = ReturnType<typeof budujFormaty>;
const pamiec: Partial<Record<KodJezyka, Formaty>> = {};
/** Formatery dla języka (jeden zestaw na język, tworzony raz). */
export const formatyDla = (jezyk: KodJezyka): Formaty => (pamiec[jezyk] ??= budujFormaty(jezyk));

/* ---------- Gotowe polskie zdania → wybrany język ----------
 * Logika spraw (`sprawy.ts`) składa zdania po polsku, razem z datami („5 marca 2026"), kwotami („1 234,56 zł")
 * i okresami („12 tygodni"). Po przetłumaczeniu zdania zamieniamy te rodzaje zapisów na odpowiedniki w wybranym języku.
 */
const MIESIACE_GENITIWUS = "stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia".split("|");
const SPACJA = "[ \\u00a0\\u202f]";
const RE_DATA = new RegExp(`\\b(\\d{1,2}) (${MIESIACE_GENITIWUS.join("|")}) (\\d{4})\\b`, "g");
const RE_KWOTA = new RegExp(`(?<![\\d,.])(\\d{1,3}(?:${SPACJA}\\d{3})*(?:,\\d{1,2})?)${SPACJA}zł(?![\\p{L}])`, "gu");
const RE_TYGODNIE = /(?<![\d,.])(\d+(?:,\d)?) (tydzień|tygodnie|tygodni|tygodnia)(?![\p{L}])/gu;
const RE_DNI = /(?<![\d,.])(\d+) (dzień|dni)(?![\p{L}])/gu;
const num = (s: string) => Number(s.replace(new RegExp(SPACJA, "g"), "").replace(",", "."));

/**
 * Zamienia polskie zapisy dat, kwot, tygodni i dni w gotowym zdaniu na zapis w wybranym języku.
 * W angielskim dodatkowo przecinek dziesiętny („81,5%") zamienia na kropkę.
 */
export function lokalizujZapisy(jezyk: KodJezyka, tekst: string): string {
  if (jezyk === "pl") return tekst;
  const f = formatyDla(jezyk);
  // Gotowe zapisy chowamy pod znacznikami, żeby kolejne zamiany (np. przecinka dziesiętnego) ich nie ruszały.
  const skrytki: string[] = [];
  const ukryj = (x: string) => `\u0000${skrytki.push(x) - 1}\u0000`;
  let wynik = tekst
    .replace(RE_DATA, (_, d, m, r) => ukryj(f.dataPL(`${r}-${String(MIESIACE_GENITIWUS.indexOf(m) + 1).padStart(2, "0")}-${d.padStart(2, "0")}`)))
    .replace(RE_KWOTA, (_, k) => ukryj(f.pln(num(k))))
    .replace(RE_TYGODNIE, (_, n) => ukryj(f.tygodnie(num(n))))
    .replace(RE_DNI, (_, n) => ukryj(f.dni(num(n))));
  if (jezyk === "en") wynik = wynik.replace(/(?<=\d),(?=\d)/g, ".");
  return wynik.replace(/\u0000(\d+)\u0000/g, (_, i) => skrytki[+i]);
}

/** Czy cały tekst to jeden zapis daty, kwoty, tygodni albo dni (np. komórka tabeli)? Wtedy da się go przełożyć bez słownika. */
export const czySamZapis = (tekst: string) => [RE_DATA, RE_KWOTA, RE_TYGODNIE, RE_DNI].some((re) => {
  re.lastIndex = 0;
  const m = re.exec(tekst);
  re.lastIndex = 0;
  return !!m && m[0] === tekst;
});
