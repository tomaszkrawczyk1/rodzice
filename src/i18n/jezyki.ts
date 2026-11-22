// Wspólne dla serwera i klienta: lista języków, nazwa ciasteczka i sam mechanizm tłumaczenia.
// Kluczem słownika jest polski tekst z kodu: brak wpisu = pokazujemy po polsku, więc tłumaczenia można dodawać stopniowo.
import { EN } from "./en";
import { UK } from "./uk";
import { SPRAWY_EN, SPRAWY_UK } from "./sprawy";
import { EN_PODSTRONY } from "./en-podstrony";
import { UK_PODSTRONY } from "./uk-podstrony";
import { EN_KALKULATOR } from "./en.kalkulator";
import { UK_KALKULATOR } from "./uk.kalkulator";
import { KALENDARZ_EN, KALENDARZ_UK } from "./kalendarz-reszta";
import { DODATKI_EN, DODATKI_UK } from "./dodatki";
import { KOD_LOCALE, czySamZapis, lokalizujZapisy } from "./formaty";

export const JEZYKI = ["pl", "en", "uk"] as const;
export type Jezyk = (typeof JEZYKI)[number];
export const CIASTECZKO_JEZYKA = "rodzice.jezyk";

export const NAZWY_JEZYKOW: Record<Jezyk, { krotko: string; pelna: string }> = {
  pl: { krotko: "PL", pelna: "Polski" },
  en: { krotko: "EN", pelna: "English" },
  uk: { krotko: "UA", pelna: "Українська" },
};

const SLOWNIKI: Record<Jezyk, Record<string, string>> = { pl: {}, en: { ...KALENDARZ_EN, ...EN_KALKULATOR, ...EN, ...SPRAWY_EN, ...EN_PODSTRONY, ...DODATKI_EN }, uk: { ...KALENDARZ_UK, ...UK_KALKULATOR, ...UK, ...SPRAWY_UK, ...UK_PODSTRONY, ...DODATKI_UK } };

export const czyJezyk = (v: unknown): v is Jezyk => typeof v === "string" && (JEZYKI as readonly string[]).includes(v);

interface Wzorzec { re: RegExp; nazwy: string[]; swobodne: boolean[]; cel: string; staly: number }

/**
 * Wolne miejsce na zmienną ({a} bez ograniczenia) nie może przyjąć zwykłego polskiego słowa, którego nie umiemy przetłumaczyć.
 * Inaczej „Do pracodawcy” wyszłoby jako „By pracodawcy”, a „Dziecko ma gorączkę” jako „The baby is gorączkę old”.
 * Cyfry, skróty i nazwy własne wielkimi literami (ZUS-ZLA, Z-3) przechodzą; wtedy zdanie zostaje po polsku w całości.
 */
const surowePolskie = (wartosc: string, przetlumaczone: string) =>
  przetlumaczone === wartosc && !/\d/.test(wartosc) && /[a-ząćęłńóśźż]{3,}/.test(wartosc);
const wzorce: Partial<Record<Jezyk, Wzorzec[]>> = {};
const wyniki: Partial<Record<Jezyk, Map<string, string>>> = {};
const ucieczka = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Wzorce to wpisy słownika z miejscami na zmienne: „Termin {kiedy} już minął.” pasuje do gotowego zdania
 * „Termin 5 marca 2026 już minął.” (logika spraw składa zdania po polsku, więc klucza nie da się znać z góry).
 * Miejsce na zmienną może mieć ograniczenie w postaci wyrażenia regularnego: {ile|\d+ dni} pasuje tylko do „30 dni”.
 * Najpierw próbujemy wzorców o największej ilości stałego tekstu, żeby bardziej szczegółowe wygrywały z ogólnymi.
 */
function wzorceDla(jezyk: Jezyk): Wzorzec[] {
  return (wzorce[jezyk] ??= Object.entries(SLOWNIKI[jezyk])
    .filter(([pl]) => /\{\w+(?:\|[^}]+)?\}/.test(pl))
    .map(([pl, cel]) => {
      const nazwy: string[] = [];
      const swobodne: boolean[] = [];
      let staly = 0;
      const zrodlo = pl.split(/(\{\w+(?:\|[^}]+)?\})/).map((czesc) => {
        const m = /^\{(\w+)(?:\|([^}]+))?\}$/.exec(czesc);
        if (m) {
          nazwy.push(m[1]);
          swobodne.push(!m[2]);
          staly += m[2] ? m[2].length : 0;
          return m[2] ? `(${m[2]})` : "([\\s\\S]+?)";
        }
        staly += czesc.length;
        return ucieczka(czesc);
      }).join("");
      return { re: new RegExp(`^${zrodlo}$`), nazwy, swobodne, cel, staly };
    })
    .sort((a, b) => b.staly - a.staly));
}

const GLEBOKOSC_MAX = 4;
function przeloz(jezyk: Jezyk, pl: string, glebokosc: number): string {
  const slownik = SLOWNIKI[jezyk];
  const dokladne = slownik[pl];
  if (dokladne !== undefined) return lokalizujZapisy(jezyk, dokladne);
  if (glebokosc >= GLEBOKOSC_MAX || !pl.trim()) return pl;
  const pamiec = (wyniki[jezyk] ??= new Map());
  const stary = pamiec.get(pl);
  if (stary !== undefined) return stary;
  let wynik = czySamZapis(pl) ? lokalizujZapisy(jezyk, pl) : pl;
  for (const w of wzorceDla(jezyk)) {
    const m = w.re.exec(pl);
    if (!m) continue;
    const wartosci: Record<string, string> = {};
    let odrzuc = false;
    w.nazwy.forEach((n, i) => {
      wartosci[n] = przeloz(jezyk, m[i + 1], glebokosc + 1);
      if (w.swobodne[i] && surowePolskie(m[i + 1], wartosci[n])) odrzuc = true;
    });
    if (odrzuc) continue;
    wynik = lokalizujZapisy(jezyk, w.cel.replace(/\{(\w+)\}/g, (c, k) => wartosci[k] ?? c));
    break;
  }
  if (pamiec.size > 3000) pamiec.clear();
  pamiec.set(pl, wynik);
  return wynik;
}

/** Tłumaczy polski tekst na wybrany język. W tekście można użyć {nazwa}, które podmieniają wartości z `zmienne`. */
export function tlumacz(jezyk: Jezyk, pl: string, zmienne?: Record<string, string | number>): string {
  if (jezyk === "pl") return zmienne ? pl.replace(/\{(\w+)\}/g, (c, k) => (k in zmienne ? String(zmienne[k]) : c)) : pl;
  if (zmienne) {
    const tekst = SLOWNIKI[jezyk][pl] ?? pl;
    return tekst.replace(/\{(\w+)\}/g, (c, k) => (k in zmienne ? String(zmienne[k]) : c));
  }
  return przeloz(jezyk, pl, 0);
}

/** Wersja dla komponentów serwerowych (Footer, metadane): język z ciasteczka podaje wywołujący. */
export const tlumaczDla = (jezyk: Jezyk) => (pl: string, zmienne?: Record<string, string | number>) => tlumacz(jezyk, pl, zmienne);

/** Kod regionalny do formatowania dat i liczb (Intl). */
export const LOCALE: Record<Jezyk, string> = KOD_LOCALE;
