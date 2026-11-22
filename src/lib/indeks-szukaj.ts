/*
 * Indeks wyszukiwarki „co można zrobić na tej stronie": wyniki drzewka (kreatora), druki, sprawy, pytania z poradnika
 * i kilka stron bez własnego drzewka. Każdy rekord ma istniejący adres, pod który prowadzi klik. Liczy się lokalnie
 * i synchronicznie, od pierwszej litery (bez opóźnień), więc można go wołać przy każdym znaku.
 *
 * Kolejność: kod druku (ZAM, Z-3) > tytuł zaczyna się od wpisanego tekstu > każde wpisane słowo zaczyna słowo tytułu >
 * słowa dodatkowe i pojęcia (tata, JDG, L4…) > jedna literówka. Jedna litera to początek słowa, nigdy środek.
 */
import { DRZEWO, DRUKI, PYTANIA } from "@/content/poradnik";
import { SPRAWY } from "./sprawy";
import { pojecia, jednaRoznica } from "./szukaj";
import type { Jezyk } from "@/i18n/jezyki";

export type Rodzaj = "druk" | "wynik" | "sprawa" | "faq" | "strona";

export interface Rekord {
  rodzaj: Rodzaj;
  id: string;
  tytul: string;
  /** Krótki opis pod tytułem (kafelek). */
  opis: string;
  href: string;
  /** Kod druku (np. „Z-3”), tylko dla druków. */
  kod?: string;
  /** Dodatkowe słowa, po których też można znaleźć rekord (słabszy sygnał niż tytuł). */
  slowa: string;
}

export const ETYKIETA_RODZAJU: Record<Rodzaj, string> = {
  druk: "Druk ZUS", wynik: "Wynik z kreatora", sprawa: "Sprawa krok po kroku", faq: "Pytanie z poradnika", strona: "Strona",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l");
const slowaZ = (s: string) => norm(s).match(/[\p{L}\p{N}]+(?:[,.]\p{N}+)?%?/gu) ?? [];
const zwarte = (s: string) => norm(s).replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Wyniki drzewka, które do policzenia czegokolwiek potrzebują liczby dzieci i daty: klik prowadzi od razu do tego kroku
 * kalkulatora (istniejący adres `?tryb=…&krok=dziecko`). Pozostałe wyniki prowadzą do swojego miejsca w kreatorze.
 */
const TRYB_KALKULATORA: Record<string, string> = { matka: "matka", oboje_rodzice: "oboje", praca_i_urlop: "laczenie", adopcja: "adopcja" };

/** Ścieżka kreatora do każdego wyniku: najkrótsza lista indeksów odpowiedzi od startu (`?krok=1.1.2`) i etykiety po drodze. */
function sciezkiDoWynikow(): Map<string, { kroki: number[]; etykiety: string[] }> {
  const wynik = new Map<string, { kroki: number[]; etykiety: string[] }>();
  const kolejka: { id: string; kroki: number[]; etykiety: string[] }[] = [{ id: "start", kroki: [], etykiety: [] }];
  const odwiedzone = new Set<string>();
  while (kolejka.length) {
    const { id, kroki, etykiety } = kolejka.shift()!;
    if (odwiedzone.has(id)) continue;
    odwiedzone.add(id);
    const w = DRZEWO[id];
    if (!w) continue;
    if (w.typ === "wynik") { wynik.set(id, { kroki, etykiety }); continue; }
    w.opcje.forEach((o, i) => kolejka.push({ id: o.nastepny, kroki: [...kroki, i], etykiety: [...etykiety, o.etykieta] }));
  }
  return wynik;
}

const STRONY: { id: string; tytul: string; opis: string; href: string; slowa: string }[] = [
  { id: "kalkulator", tytul: "Kalkulator zasiłku", opis: "Policz zasiłek i długość urlopu", href: "/kalkulator", slowa: "ile dostane policz kwota wyliczenie pieniadze" },
  { id: "kalendarz", tytul: "Kalendarz ciąży i połogu", opis: "Badania i terminy w jednym miejscu", href: "/kalendarz", slowa: "wizyty badania trymestr termin porodu" },
  { id: "terminarz", tytul: "Terminy w urzędach", opis: "Co złożyć i do kiedy: ZUS, praca, gmina", href: "/terminarz", slowa: "terminarz kiedy do kiedy przypomnienie ics becikowe" },
  { id: "ryzyka", tytul: "Ochrona w pracy", opis: "Co może wpłynąć na zasiłek i kiedy prawo chroni umowę", href: "/ryzyka", slowa: "zwolnienie wypowiedzenie umowa szef" },
  { id: "odpis", tytul: "Odpis aktu urodzenia", opis: "Jak zdobyć odpis aktu", href: "/odpis", slowa: "akt usc urzad stanu cywilnego" },
  { id: "trudne", tytul: "Pomoc w trudnej sytuacji", opis: "Strata, wcześniactwo, choroba, wsparcie", href: "/trudne", slowa: "strata poronienie wczesniak psycholog wsparcie" },
  { id: "pue", tytul: "Konto w ZUS (symulacja)", opis: "Zaloguj się i zobacz swoje dane", href: "/pue", slowa: "pue ezus logowanie konto profil" },
  { id: "wnioski", tytul: "Napisz wniosek", opis: "Przygotuj pismo do pracodawcy lub ZUS", href: "/wnioski", slowa: "wniosek pismo formularz urlop" },
  { id: "wgraj", tytul: "Odczyt ze skanu (przykłady)", opis: "Wgraj Z-3 albo ZAM i przelicz podstawę", href: "/wgraj", slowa: "skan pdf ocr zaswiadczenie wgraj podstawa" },
  { id: "poradnik", tytul: "Pomoc / FAQ", opis: "Odpowiedzi na częste pytania", href: "/poradnik", slowa: "pytania odpowiedzi faq" },
];

function zbuduj(): Rekord[] {
  const rekordy: Rekord[] = [];
  for (const d of DRUKI) {
    rekordy.push({ rodzaj: "druk", id: d.id, kod: d.id, tytul: d.nazwa, opis: ETYKIETA_RODZAJU.druk, href: `/druki#${d.id}`, slowa: `${d.do_czego} ${d.kto_sklada}` });
  }
  for (const [id, { kroki, etykiety }] of sciezkiDoWynikow()) {
    const w = DRZEWO[id];
    if (w?.typ !== "wynik") continue;
    const tryb = w.kalkulator && TRYB_KALKULATORA[w.kalkulator.tryb];
    const href = tryb ? `/kalkulator?tryb=${tryb}&krok=dziecko` : `/kreator?krok=${kroki.join(".")}`;
    rekordy.push({ rodzaj: "wynik", id, tytul: w.tytul, opis: ETYKIETA_RODZAJU.wynik, href, slowa: etykiety.join(" ") });
  }
  for (const s of SPRAWY) rekordy.push({ rodzaj: "sprawa", id: s.id, tytul: s.tytul, opis: s.krotko, href: `/sprawa/${s.id}`, slowa: s.slowa });
  for (const f of PYTANIA) rekordy.push({ rodzaj: "faq", id: f.id, tytul: f.pytanie, opis: ETYKIETA_RODZAJU.faq, href: `/poradnik#${f.id}`, slowa: "" });
  for (const p of STRONY) rekordy.push({ rodzaj: "strona", id: p.id, tytul: p.tytul, opis: p.opis, href: p.href, slowa: p.slowa });
  return rekordy;
}

interface Wpis { r: Rekord; tytul: string[]; tytulZwarty: string; tytulCiagly: string; slowa: string[]; kod: string; pojecia: Set<string> }
let wpisy: Wpis[] | null = null;
const indeks = (): Wpis[] => (wpisy ??= zbuduj().map((r) => ({
  r, tytul: slowaZ(r.tytul), tytulZwarty: zwarte(r.tytul), tytulCiagly: slowaZ(r.tytul).join(" "), slowa: slowaZ(r.slowa),
  kod: r.kod ? zwarte(r.kod) : "", pojecia: r.rodzaj === "druk" ? new Set<string>() : pojecia(`${r.tytul} ${r.slowa}`),
})));

const PRIORYTET: Record<Rodzaj, number> = { druk: 0, wynik: 1, sprawa: 2, strona: 3, faq: 4 };

function ocena(w: Wpis, q: string, tokeny: string[], zQ: Set<string>): number {
  const zwQ = zwarte(q);
  if (w.kod && zwQ === w.kod) return 1000;
  if (w.kod && zwQ.length >= 1 && w.kod.startsWith(zwQ)) return 900 - w.kod.length;
  if (w.tytulCiagly.startsWith(tokeny.join(" "))) return 800;
  // Każde wpisane słowo zaczyna jakieś słowo tytułu (ostatnie może być niedokończone, wcześniejsze też są przedrostkami).
  if (tokeny.every((t) => w.tytul.some((x) => x.startsWith(t)))) return 600;
  if (tokeny.every((t) => w.tytul.some((x) => x.startsWith(t)) || w.slowa.some((x) => x.startsWith(t)))) return 400;
  // Pojęcia (tata, JDG, L4, bliźniaki…) z całego zapytania muszą wystąpić w rekordzie.
  if (zQ.size && [...zQ].every((p) => w.pojecia.has(p))) return 250 + zQ.size + 50 * tokeny.filter((t) => w.tytul.some((x) => x.startsWith(t))).length;
  // Jedna literówka, tylko przy dłuższych słowach.
  const dlugie = tokeny.filter((t) => t.length >= 5);
  if (dlugie.length && dlugie.length === tokeny.length && dlugie.every((t) => w.tytul.some((x) => x.startsWith(t) || jednaRoznica(t, x) || jednaRoznica(t, x.slice(0, t.length))))) return 150;
  return 0;
}

/**
 * Najlepsze trafienia dla wpisanego tekstu (od jednej litery). `rodzaje` zawęża typy rekordów.
 * W EN i UK rekord można znaleźć też po przetłumaczonym tytule (`tlumacz` to `t()` z wybranego języka).
 */
export function trafienia(q: string, ile = 3, rodzaje?: readonly Rodzaj[], jezyk: Jezyk = "pl", tlumacz?: (pl: string) => string): Rekord[] {
  const tokeny = slowaZ(q);
  if (!tokeny.length) return [];
  const zQ = tokeny.join("").length >= 3 ? pojecia(q) : new Set<string>();
  return indeks()
    .filter((w) => !rodzaje || rodzaje.includes(w.r.rodzaj))
    .map((w) => {
      let o = ocena(w, q, tokeny, zQ);
      if (jezyk !== "pl" && tlumacz) {
        const alt = slowaZ(tlumacz(w.r.tytul));
        o = Math.max(o, ocena({ ...w, tytul: alt, tytulCiagly: alt.join(" "), tytulZwarty: alt.join("") }, q, tokeny, zQ));
      }
      return { w, o };
    })
    .filter((x) => x.o > 0)
    // Kod druku to konkretne polecenie: wtedy pomijamy rekordy dopasowane tylko pojęciem lub literówką.
    .filter((x, _, wszystkie) => !wszystkie.some((y) => y.o >= 900) || x.o >= 400)
    .sort((a, b) => b.o - a.o || PRIORYTET[a.w.r.rodzaj] - PRIORYTET[b.w.r.rodzaj] || a.w.r.tytul.length - b.w.r.tytul.length)
    .slice(0, ile)
    .map((x) => x.w.r);
}
