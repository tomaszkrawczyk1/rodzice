import { dodajDni, dodajMiesiace, dniMiedzy, wymiarRodzicielski, type Parametry } from "@/engine/kalkulator";
import { pln, dataPL, dataKrotka, liczba, tygodnie, dzis, RODZAJE } from "./format";
import { pytanie, type Status } from "@/content/poradnik";
import { WSPARCIE, WSPARCIE_UWAGA } from "@/content/tresci";
import parametry from "../../data/parametry.json";

/* ============ typy ============ */
export type Api = <T = any>(url: string, body?: unknown) => Promise<T>;
export type Odp = Record<string, any>;
export type Moment = "plan" | "ciaza" | "dziecko";

/** Dane o rodzicu pobrane po zalogowaniu (symulowany ZUS + scenariusz persony) – służą do wstępnego wypełnienia odpowiedzi. */
export interface Ctx {
  osoba?: string; pesel?: string;
  tytul?: string; dniUbezpieczenia?: number; dobrowolne?: boolean; wDniuPorodu?: boolean; liczbaUbezpieczonychPlatnika?: number; platnik?: string; zadluzenie?: number; ezlaDni?: number;
  dataPorodu?: string; dataPrzyjecia?: string; liczbaDzieci?: number; liczbaPrzyjetychDzieci?: number; podstawaM?: number; podstawaO?: number;
  rodzajPrzyjecia?: "przysposobienie" | "rodzina_zastepcza";
}

export interface Pyt {
  id: string;
  tekst: string | ((o: Odp) => string);
  typ: "wybor" | "liczba" | "data" | "tak_nie" | "tekst";
  opcje?: { v: string; label: string; opis?: string }[];
  domyslne?: (c: Ctx) => any;       // wartość z danych ZUS (jeśli jest, pytanie trafia na ekran „Sprawdź swoje dane”)
  etykietaDanych?: string;          // jak nazwać to pole na ekranie „Sprawdź swoje dane”
  poCo: string;                     // „Po co pytamy?”
  skad?: string;                    // „Skąd to wziąć?”
  warunek?: (o: Odp, c: Ctx) => boolean;
  sprawdz?: (v: string, o: Odp) => string | undefined;
  zalezyOd?: string[];
  jednostka?: string; min?: number; max?: number | ((o: Odp) => number); calkowita?: boolean; przyklad?: string;
}

export interface Wynik {
  glowne: string; duza?: string; podpis?: string;
  szczegoly?: [string, string][];
  tabela?: { kolumny: string[]; wiersze: string[][]; uwaga?: string };
  ostrzezenia?: string[];
  zrob: { kiedy?: string; tekst: string; uwaga?: string }[];
  sciaga?: { tytul: string; wiersze: [string, string, string][]; uwaga?: string };
  tekstDoKopii?: { tytul: string; tresc: string };
  info?: { tytul: string; tresc: string }[];
  druki?: string[]; linki?: { href: string; etykieta: string }[];
  terminy?: { co: string; do: string }[];
  jakLiczono?: string[]; status?: Status; uwagaStatus?: string; lagodny?: boolean;
  nastepne?: string[];              // id kolejnych spraw
}

export interface Sprawa {
  id: string; tytul: string; krotko: string; ikona: string; czas: string; slowa: string; faq: string[];
  pytania: Pyt[];
  licz: (o: Odp, c: Ctx, api: Api) => Promise<Wynik>;
}

/* ============ pomocnicze ============ */
const num = (x: unknown) => {
  const s = String(x ?? "").trim();
  if (!/^-?(?:\d+|\d{1,3}(?:[ \u00a0\u202f]\d{3})+)(?:[,.]\d+)?$/.test(s)) return NaN;
  return Number(s.replace(/\s/g, "").replace(",", "."));
};
const W = parametry.wymiary_tygodnie;
const L = parametry.limity_dni;
const niezbywalne = W.niezbywalne_prawo_kazdego_rodzica_rodzicielski;
const progPlatnika = parametry.platnik.prog_liczby_ubezpieczonych_powyzej;
const wDniach = (n: number) => n === 1 ? "1 dzień" : `${n} dni`;
const tygodniDopelniacz = (n: number) => `${liczba(n, 1)} ${n === 1 ? "tygodnia" : "tygodni"}`;
// Limity wieku z reguł adopcji i przyjęcia do rodziny zastępczej w bazie.
const limitWiekuAdopcja = (o: Odp) => o.rodzajAdopcji === "przysposobienie" ? 14 : o.odroczenie === "tak" ? 10 : 7;
const dataLimituAdopcja = (o: Odp) => dodajMiesiace(o.dataUr, limitWiekuAdopcja(o) * 12);

export function bladOdpowiedzi(q: Pyt, v: string, o: Odp): string | undefined {
  const s = v.trim();
  if (!s) return "Podaj odpowiedź.";
  if (q.typ === "wybor" && !q.opcje?.some((op) => op.v === s)) return "Wybierz jedną z dostępnych odpowiedzi.";
  if (q.typ === "tak_nie" && s !== "tak" && s !== "nie") return "Wybierz „Tak” lub „Nie”.";
  if (q.typ === "data") {
    const data = new Date(`${s}T00:00:00Z`);
    if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== s) {
      return "Podaj prawidłową datę.";
    }
  }
  if (q.typ === "liczba") {
    const n = num(s);
    if (!Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER / 100) return "Podaj prawidłową liczbę.";
    if (q.calkowita && !Number.isInteger(n)) return "Podaj pełną liczbę.";
    const min = q.min ?? 0;
    const max = typeof q.max === "function" ? q.max(o) : q.max;
    if (n < min || (max !== undefined && n > max)) {
      return max === undefined ? `Wpisz co najmniej ${liczba(min)}.` : `Wpisz liczbę od ${liczba(min)} do ${liczba(max)}.`;
    }
  }
  return q.sprawdz?.(s, o);
}

export function domyslneOdpowiedzi(pytania: Pyt[], c: Ctx): Odp {
  const odp: Odp = {};
  for (const q of pytania) {
    const v = q.domyslne?.(c);
    if (v != null && (q.warunek?.(odp, c) ?? true) && !bladOdpowiedzi(q, String(v), odp)) odp[q.id] = String(v);
  }
  return odp;
}

export function zapiszOdpowiedz(pytania: Pyt[], odp: Odp, q: Pyt, v: string): Odp {
  const nowe = { ...odp, [q.id]: v };
  if (odp[q.id] !== undefined && odp[q.id] !== v) {
    const zmienione = new Set([q.id]);
    for (const pole of pytania) {
      if (pole.zalezyOd?.some((id) => zmienione.has(id))) {
        delete nowe[pole.id];
        zmienione.add(pole.id);
      }
    }
  }
  return nowe;
}

export function aktywneOdpowiedzi(pytania: Pyt[], odp: Odp, c: Ctx): Odp {
  return Object.fromEntries(pytania.filter((q) => odp[q.id] !== undefined && (q.warunek?.(odp, c) ?? true)).map((q) => [q.id, odp[q.id]]));
}
const DZIECI = [{ v: "1", label: "Jedno dziecko" }, { v: "2", label: "Dwoje dzieci (bliźnięta)" }, { v: "3", label: "Troje dzieci" }, { v: "4", label: "Czworo dzieci" }, { v: "5", label: "Pięcioro lub więcej dzieci" }];
const ZATRUDNIENIE = [
  { v: "umowa", label: "Umowa o pracę", opis: "Zatrudnienie na etacie u pracodawcy" },
  { v: "dzialalnosc", label: "Własna firma (działalność gospodarcza)", opis: "Opłacam składki samodzielnie" },
  { v: "zlecenie", label: "Umowa zlecenia", opis: "Praca na podstawie umowy zlecenia" },
];
const czyPracownik = (o: Odp) => o.zatrudnienie === "umowa" || !o.zatrudnienie;
const maChorobowe = (o: Odp) => o.tytul === "umowa_o_prace" || ((o.tytul === "zlecenie" || o.tytul === "dzialalnosc") && o.dobrowolne === "tak");
const pPlatnik: Pyt = {
  id: "platnik", typ: "wybor", tekst: "Ile osób Twój pracodawca lub zleceniodawca zgłasza do ubezpieczenia chorobowego?",
  opcje: [{ v: "duzy", label: `Więcej niż ${progPlatnika} osób (zasiłek wypłaca pracodawca)` }, { v: "maly", label: `${progPlatnika} osób lub mniej (zasiłek wypłaca ZUS)` }, { v: "nie_wiem", label: "Nie wiem – sprawdzimy to" }],
  domyslne: (c) => c.liczbaUbezpieczonychPlatnika === undefined ? undefined : c.liczbaUbezpieczonychPlatnika > progPlatnika ? "duzy" : "maly",
  etykietaDanych: "Liczba ubezpieczonych u pracodawcy",
  poCo: "W firmach zgłaszających powyżej 20 osób zasiłek wypłaca pracodawca razem z pensją. W mniejszych firmach wypłatą zajmuje się bezpośrednio ZUS.", skad: "Możesz zapytać w kadrach lub księgowości (liczy się stan na 30 listopada poprzedniego roku). Jeśli nie masz pewności, wybierz «Nie wiem».",
};
const pyt = (id: string) => pytanie(id);
const kroki = (...ids: string[]) => ids.flatMap((i) => pyt(i)?.kroki ?? []);
const dniDo = (iso: string) => dniMiedzy(dzis(), iso);
const zaIle = (iso: string) => { const d = dniDo(iso); return d < 0 ? "termin minął" : d === 0 ? "dziś" : d === 1 ? "jutro" : `za ${d} dni`; };

const pDataPorodu: Pyt = {
  id: "dataPorodu", typ: "data", tekst: "Kiedy dziecko się urodziło lub jaki jest planowany termin porodu?",
  domyslne: (c) => c.dataPorodu, etykietaDanych: "Data porodu",
  poCo: "Od tej daty liczymy wszystkie okresy urlopów i terminy wniosków.", skad: "Karta przebiegu ciąży albo odpis aktu urodzenia dziecka.",
};
const pDzieci: Pyt = {
  id: "liczbaDzieci", typ: "wybor", tekst: "Ile dzieci urodziło się (lub urodzi) przy jednym porodzie?", opcje: DZIECI,
  domyslne: (c) => (c.liczbaDzieci ? String(Math.min(c.liczbaDzieci, 5)) : undefined), etykietaDanych: "Liczba dzieci",
  poCo: "Od liczby dzieci przy jednym porodzie zależy wymiar urlopu i zasiłku macierzyńskiego.",
};
const pZatrudnienie: Pyt = {
  id: "zatrudnienie", typ: "wybor", tekst: "Na jakiej podstawie pracujesz?", opcje: ZATRUDNIENIE,
  domyslne: (c) => (c.tytul ? (c.tytul === "umowa_o_prace" ? "umowa" : c.tytul === "dzialalnosc" ? "dzialalnosc" : c.tytul === "zlecenie" ? "zlecenie" : undefined) : undefined), etykietaDanych: "Forma zatrudnienia",
  poCo: "Od formy zatrudnienia zależy, jak obliczamy podstawę zasiłku i kto go wypłaca.", skad: "Z umowy o pracę, umowy zlecenia lub wpisu w CEIDG. Sprawdzisz to także na koncie PUE / eZUS.",
};
const pChorobowe: Pyt = {
  id: "chorobowe", typ: "tak_nie", tekst: "Czy masz dobrowolne ubezpieczenie chorobowe?",
  warunek: (o) => o.zatrudnienie === "zlecenie" || o.zatrudnienie === "dzialalnosc",
  domyslne: (c) => c.dobrowolne === undefined ? undefined : c.dobrowolne ? "tak" : "nie",
  etykietaDanych: "Dobrowolne ubezpieczenie chorobowe",
  zalezyOd: ["zatrudnienie"],
  poCo: "Przy umowie zlecenia i własnej działalności gospodarczej prawo do zasiłku przysługuje tylko wtedy, gdy opłacasz dobrowolną składkę chorobową.", skad: "Z potwierdzenia zgłoszenia ZUS ZUA lub pytając w księgowości.",
};
const poPotwierdzeniuChorobowego = (pytania: Pyt[]) => pytania.map((q) => ({
  ...q, warunek: (o: Odp, c: Ctx) => o.chorobowe !== "nie" && (q.warunek?.(o, c) ?? true),
}));
const brakChorobowego = (): Wynik => ({
  glowne: "Bez ubezpieczenia chorobowego z tej umowy lub działalności ZUS nie wypłaca zasiłku.",
  zrob: [{ tekst: "Sprawdź, co przysługuje Ci w Twojej sytuacji, także jeśli masz inny tytuł do ubezpieczenia (np. świadczenie rodzicielskie «kosiniakowe»)." }],
  status: "ok", nastepne: ["co-przysluguje"],
});
const pPelnyEtat = (kto: "M" | "O"): Pyt => ({
  id: kto === "M" ? "pelnyEtat" : "pelnyEtatO", typ: "tak_nie",
  tekst: kto === "M" ? "Czy pracujesz na pełnym etacie?" : "Czy drugi rodzic pracuje na pełnym etacie?",
  warunek: (o, c) => kto === "M" ? pBrutto("M").warunek!(o, c) && czyPracownik(o) : pBrutto("O").warunek!(o, c) && o.zatrudnienieO === "umowa",
  zalezyOd: [kto === "M" ? "zatrudnienie" : "zatrudnienieO"],
  poCo: "Minimalną gwarantowaną podstawę wymiaru zasiłku stosujemy przy pełnym etacie.",
});
const pZatrudnienieO: Pyt = { ...pZatrudnienie, id: "zatrudnienieO", tekst: "Na jakiej podstawie pracuje drugi rodzic?", domyslne: undefined, warunek: (o, c) => pBrutto("O").warunek!(o, c) };
const pPodstawaZUS = (kto: "M" | "O"): Pyt => ({
  id: kto === "M" ? "podstawaM" : "podstawaO", typ: "liczba", min: 0.01, tekst: kto === "M" ? "Miesięczna podstawa wymiaru Twojego zasiłku (zł)" : "Miesięczna podstawa wymiaru zasiłku drugiego rodzica (zł)",
  domyslne: (c) => (kto === "M" ? c.podstawaM : c.podstawaO), etykietaDanych: kto === "M" ? "Podstawa wymiaru zasiłku" : "Podstawa wymiaru zasiłku drugiego rodzica", jednostka: "zł",
  zalezyOd: kto === "M" ? ["zatrudnienie"] : undefined,
  warunek: (o, c) => {
    const zatrudnienieZProfilu = pZatrudnienie.domyslne?.(c);
    if (kto === "M" && zatrudnienieZProfilu && o.zatrudnienie && o.zatrudnienie !== zatrudnienieZProfilu) return false;
    const podstawa = kto === "M" ? c.podstawaM : c.podstawaO;
    return Number.isFinite(podstawa) && (podstawa ?? 0) > 0;
  },
  poCo: "To kwota, od której liczymy zasiłek (średnie miesięczne wynagrodzenie z ostatnich 12 miesięcy po odliczeniu 13,71% składek).",
});
const pBrutto = (kto: "M" | "O"): Pyt => ({
  id: kto === "M" ? "brutto" : "bruttoO", typ: "liczba", jednostka: "zł", min: 0.01, przyklad: "np. 6500",
  zalezyOd: [kto === "M" ? "zatrudnienie" : "zatrudnienieO"],
  tekst: (o) => kto === "O"
    ? o.zatrudnienieO === "umowa"
      ? "Ile wynosi miesięczne wynagrodzenie brutto drugiego rodzica (kwota z umowy)?"
      : "Od jakiej kwoty drugi rodzic opłaca miesięcznie składki na ubezpieczenia społeczne?"
    : czyPracownik(o)
      ? "Ile wynosi Twoje miesięczne wynagrodzenie brutto (kwota z umowy przed odliczeniem podatku i składek)?"
      : "Od jakiej kwoty opłacasz miesięcznie składki na ubezpieczenia społeczne (podstawa składek)?",
  warunek: (o, c) => !pPodstawaZUS(kto).warunek!(o, c),
  poCo: `Z tego liczymy podstawę zasiłku (średnia z ostatnich 12 miesięcy pomniejszona o ${liczba(parametry.procenty.skladki_odliczane_od_podstawy)}% składek na ubezpieczenia społeczne).`,
  skad: "Sprawdź kwotę brutto na umowie o pracę lub pasku płacowym (przed odliczeniem podatku i składek). Jeśli pensja się zmieniała, wpisz średnią z ostatnich 12 miesięcy. Przy własnej firmie: kwota zadeklarowana w deklaracji ZUS DRA.",
});

async function podstawaDla(api: Api, o: Odp, kto: "M" | "O"): Promise<number> {
  const gotowa = num(kto === "M" ? o.podstawaM : o.podstawaO);
  if (gotowa > 0) return gotowa;
  const kw = num(kto === "M" ? o.brutto : o.bruttoO);
  if (!Number.isFinite(kw) || kw <= 0) throw new Error("Podaj kwotę zarobków większą od zera.");
  const niepr = kto === "M" ? !czyPracownik(o) : o.zatrudnienieO !== "umowa";
  const r = await api("/api/oblicz/podstawa", niepr ? { typ: "niepracownik", sredniaPodstawa: kw } : {
    typ: "pracownik", sredniaBrutto: kw, pelnyWymiarEtatu: (kto === "M" ? o.pelnyEtat : o.pelnyEtatO) === "tak",
  });
  return r.podstawaMiesieczna;
}

const wariantKlucz = (o: Odp) => (o.wariant === "usredniony" ? "usredniony_81_5" : "zmienny_100_70");

async function bazaPlanu(api: Api, o: Odp, podM: number, extra: any = {}) {
  const baza = { tytul: "porod", dataZdarzenia: o.dataPorodu, liczbaDzieci: num(o.liczbaDzieci) || 1, zaswiadczenieZaZyciem: false, wariant: wariantKlucz(o), podstawy: { matka: podM }, rodzicielski: [] as any[], ...extra };
  const w0 = await api("/api/oblicz/plan", baza);
  const limit = w0.wymiary.rodzicielskiTyg as number;
  // 9 tygodni urlopu rodzicielskiego przysługuje wyłącznie drugiemu rodzicowi (KP art. 182¹c § 4) – jeden rodzic może wziąć najwyżej E−9
  return { baza, limit, matkaMax: Math.max(limit - niezbywalne, 0), mac: w0.wymiary.macierzynskiTyg as number };
}

const zapiszPlan = (wejscie: any) => { try { localStorage.setItem("rodzice.plan", JSON.stringify({ wejscie })); } catch { /* brak localStorage */ } };
const koniec = (okresy: any[]) => okresy.reduce((m: string, x: any) => (x.do > m ? x.do : m), "");
const miesiecznie = (okres: any) => (okres && okres.dni ? Math.round((okres.kwota / okres.dni) * L.dni_w_miesiacu_dla_zasilkow * 100) / 100 : 0);

function terminyDlaRodzica(t: any[]): { co: string; do: string }[] {
  return t.filter((x) => x.do && !/Przedawnienie/.test(x.co)).map((x) => ({ co: String(x.co).replace(/\d{4}-\d{2}-\d{2}/g, (d) => dataPL(d)), do: x.do })).sort((a, b) => a.do.localeCompare(b.do));
}

const LINK_KALK = { href: "/kalkulator", etykieta: "Dopracuj szczegóły w pełnym kalkulatorze" };

/* ============ sprawy ============ */
export const SPRAWY: Sprawa[] = [
  /* ---- 1. Co mi przysługuje ---- */
  {
    id: "co-przysluguje", tytul: "Sprawdzić, co mi przysługuje", krotko: "Zasiłek chorobowy w ciąży i zasiłek macierzyński: czy masz prawo i na jakich zasadach", ikona: "🛡️", czas: "3–5 pytań · 2 min",
    slowa: "przysługuje prawo uprawnienia czy dostanę zasiłek ubezpieczenie chorobowe karencja okres wyczekiwania umowa zlecenie działalność brak ubezpieczenia", faq: ["F01", "F02", "F20", "F21", "F22"],
    pytania: [
      { id: "tytul", typ: "wybor", tekst: "Jaka jest Twoja obecna forma zatrudnienia lub ubezpieczenia?", domyslne: (c) => c.tytul, etykietaDanych: "Forma ubezpieczenia",
        opcje: [{ v: "umowa_o_prace", label: "Umowa o pracę (etat)" }, { v: "zlecenie", label: "Umowa zlecenia" }, { v: "dzialalnosc", label: "Własna działalność gospodarcza (firma)" }, { v: "dzielo_lub_brak", label: "Umowa o dzieło lub brak ubezpieczenia" }],
        poCo: "Od formy zatrudnienia zależy, czy podlegasz ubezpieczeniu chorobowemu i jakie świadczenia Ci przysługują.", skad: "Z umowy lub z informacji o ubezpieczeniu na koncie PUE / eZUS." },
      { id: "dobrowolne", typ: "tak_nie", tekst: "Czy opłacasz dobrowolną składkę na ubezpieczenie chorobowe?", warunek: (o) => o.tytul === "zlecenie" || o.tytul === "dzialalnosc",
        domyslne: (c) => c.dobrowolne === undefined ? undefined : c.dobrowolne ? "tak" : "nie", etykietaDanych: "Dobrowolna składka chorobowa", zalezyOd: ["tytul"],
        poCo: "Przy umowie zlecenia i działalności gospodarczej zasiłek przysługuje tylko wtedy, gdy dobrowolnie opłacasz składkę na ubezpieczenie chorobowe.", skad: "Z potwierdzenia zgłoszenia ZUS ZUA lub z comiesięcznych rozliczeń składek." },
      { id: "od", typ: "data", tekst: `Od kiedy masz nieprzerwane ubezpieczenie chorobowe (bez przerw dłuższych niż ${L.przerwa_wliczana_do_karencji_dni} dni)?`, warunek: maChorobowe,
        zalezyOd: ["tytul", "dobrowolne"], sprawdz: (v) => v > dzis() ? "Data rozpoczęcia ubezpieczenia nie może być w przyszłości." : undefined,
        domyslne: (c) => (c.dniUbezpieczenia !== undefined ? dodajDni(dzis(), -c.dniUbezpieczenia + 1) : undefined), etykietaDanych: "Ubezpieczenie nieprzerwanie od",
        poCo: "Prawo do zasiłku chorobowego wymaga wymaganego stażu ubezpieczenia: 30 dni przy umowie o pracę lub 90 dni przy ubezpieczeniu dobrowolnym. Zasiłek macierzyński po porodzie przysługuje bez tego okresu wyczekiwania.", skad: "Wpisz datę startu obecnej umowy. Jeśli wcześniej była inna umowa o pracę, a przerwa między umowami nie przekroczyła 30 dni, podaj datę ze starszej umowy." },
      { ...pDataPorodu, warunek: maChorobowe,
        poCo: "Prawo do zasiłku macierzyńskiego przysługuje, jeśli rodzic ma ważne ubezpieczenie chorobowe w dniu narodzin dziecka.", skad: "Karta przebiegu ciąży lub akt urodzenia dziecka." },
      { id: "wDniu", typ: "tak_nie", tekst: (o) => `Czy ${dataPL(o.dataPorodu)} ${o.dataPorodu < dzis() ? "trwało Twoje" : o.dataPorodu === dzis() ? "trwa Twoje" : "będzie trwało Twoje"} ubezpieczenie chorobowe (umowa o pracę lub opłacone składki)?`, domyslne: (c) => (c.wDniuPorodu === undefined ? undefined : c.wDniuPorodu ? "tak" : "nie"), etykietaDanych: "Ubezpieczenie w dniu porodu",
        warunek: maChorobowe, zalezyOd: ["tytul", "dobrowolne", "dataPorodu"],
        poCo: "To najważniejszy warunek prawa do zasiłku macierzyńskiego: ubezpieczenie musi trwać w dniu narodzin dziecka.", skad: "Sprawdź datę końcową na umowie o pracę. Jeśli masz umowę na czas nieokreślony lub regularnie opłacasz składki, wybierz «Tak»." },
      { id: "zadluzenie", typ: "liczba", tekst: "Ile wynosi Twoje ewentualne zadłużenie składkowe w ZUS? (jeśli nie masz zaległości, wpisz 0)", jednostka: "zł", min: 0, warunek: (o) => o.tytul === "dzialalnosc" && maChorobowe(o), zalezyOd: ["tytul"],
        domyslne: (c) => c.zadluzenie, etykietaDanych: "Zadłużenie składkowe w ZUS", poCo: "Zaległości w opłacaniu składek powyżej ustawowego limitu wstrzymują wypłatę zasiłku do czasu ich uregulowania.", skad: "Sprawdzisz to na koncie PUE / eZUS w zakładce «Rozliczenia» lub pytając księgowość." },
      { ...pPlatnik, warunek: (o) => o.tytul === "umowa_o_prace" || (o.tytul === "zlecenie" && maChorobowe(o)), zalezyOd: ["tytul"] },
    ],
    async licz(o, c, api) {
      const tytul = o.tytul;
      const maCh = maChorobowe(o);
      const dni = maCh && o.od ? Math.max(dniMiedzy(o.od, dzis()) + 1, 0) : 0;
      const r = await api("/api/oblicz/uprawnienia", {
        tytul, dobrowolneChorobowe: o.dobrowolne === "tak", dniNieprzerwanegoUbezpieczeniaChorobowego: dni, ubezpieczonaWDniuPorodu: o.wDniu === "tak" && maCh,
        zadluzenieSkladkowePLN: num(o.zadluzenie) || 0, liczbaUbezpieczonychPlatnika: o.platnik === "duzy" ? progPlatnika + 1 : undefined,
      });
      const mac = r.zasilekMacierzynski, ch = r.zasilekChorobowyWCiazy;
      const zrob: Wynik["zrob"] = [];
      if (mac.przysluguje) zrob.push({ tekst: "Sprawdź w kalkulatorze wysokość zasiłku i przygotuj wniosek o zasiłek macierzyński." });
      else zrob.push({ tekst: "Jeśli Twoja sytuacja zawodowa się zmieniła lub masz pytania, skonsultuj się z doradcą w ZUS." });
      if (ch.przysluguje) zrob.push({ tekst: "Dla mamy: jeśli lekarz wystawi zwolnienie w ciąży, zasiłek chorobowy wynosi 100% pensji – sprawdź szczegóły w sprawie o zwolnieniu." });
      zrob.push({ tekst: "Dla taty: po narodzinach dziecka przysługuje Ci 2 tygodnie urlopu ojcowskiego (100% płatne) oraz część urlopu rodzicielskiego." });
      return {
        glowne: mac.przysluguje ? (r.zasilekMacierzynski.zawieszonyDoSplatyZadluzenia ? "Masz prawo do zasiłku macierzyńskiego, ale wypłata nastąpi po uregulowaniu zaległych składek." : "Masz prawo do zasiłku macierzyńskiego.") : "Z podanych informacji wynika, że zasiłek macierzyński może Ci nie przysługiwać.",
        szczegoly: [["Zasiłek chorobowy w ciąży", `${ch.przysluguje ? "przysługuje" : "nie przysługuje"} – ${ch.powod}`], ["Zasiłek macierzyński", `${mac.przysluguje ? "przysługuje" : "nie przysługuje"} – ${mac.powod}`],
          ...(mac.przysluguje || ch.przysluguje ? [["Kto wypłaca zasiłek", o.platnik === "nie_wiem" ? "Do potwierdzenia w kadrach" : o.platnik === "duzy" ? "Pracodawca (płatnik składek)" : "ZUS"] as [string, string]] : [])],
        ostrzezenia: [...r.ostrzezenia.filter((x: string) => x !== mac.powod), ...(r.alternatywa ? [r.alternatywa] : [])],
        zrob, druki: mac.przysluguje ? ["ZAM"] : [], nastepne: [...(mac.przysluguje ? ["wniosek-zasilek"] : []), ...(ch.przysluguje ? ["zwolnienie-ciaza"] : [])],
        status: o.platnik === "nie_wiem" ? "do_potwierdzenia" : "ok", uwagaStatus: "Ustal w dziale kadr, czy pracodawca zatrudnia powyżej 20 osób i wypłaca zasiłek samodzielnie.",
        linki: [{ href: "/pue", etykieta: "Zadaj pytanie przez internet (symulacja PUE / eZUS)" }],
      };
    },
  },

  /* ---- 2. Zwolnienie w ciąży ---- */
  {
    id: "zwolnienie-ciaza", tytul: "Zwolnienie w ciąży – ile dostanę", krotko: "Zasiłek chorobowy w ciąży (100% pensji) i informacja, kto go wypłaca", ikona: "🩺", czas: "4 pytania · 2 min",
    slowa: "zwolnienie l4 e-zla chorobowe ciąża ciążowe chorobowy zasiłek 100% lekarz pracodawca wynagrodzenie chorobowe", faq: ["F01", "F02", "F03"],
    pytania: [
      pZatrudnienie, pChorobowe, ...poPotwierdzeniuChorobowego([pPelnyEtat("M"),
      pPodstawaZUS("M"),
      pBrutto("M"),
      { id: "dniNiezd", typ: "liczba", tekst: "Za ile dni zwolnienia w ciąży chcesz policzyć zasiłek? (e-ZLA z kodem B)", jednostka: "dni", min: 1, max: L.okres_zasilkowy_ciaza_dni, calkowita: true, przyklad: "np. 60",
        domyslne: (c) => (c.ezlaDni ? c.ezlaDni : undefined), etykietaDanych: "Liczba dni zwolnienia e-ZLA",
        poCo: "Zasiłek chorobowy w ciąży wynosi 100% podstawy wymiaru za każdy dzień kalendarzowy zwolnienia (także za weekendy).", skad: "Z elektronicznego zwolnienia e-ZLA na koncie PUE / eZUS lub od lekarza. Jeśli planujesz z góry, wpisz np. 30 dni za pełny miesiąc." },
      { id: "w50", typ: "tak_nie", tekst: "Czy Twoje 50. urodziny przypadały przed rokiem, którego dotyczy zwolnienie?", warunek: czyPracownik, poCo: "Od roku kalendarzowego następującego po 50. urodzinach pracodawca wypłaca wynagrodzenie chorobowe tylko za pierwsze 14 dni w roku (zamiast 33). Od 15. dnia zasiłek przejmuje ZUS." },
      { id: "dniWykorzystane", typ: "liczba", tekst: "Za ile dni zwolnienia lekarskiego pracodawca zapłacił Ci już w tym roku kalendarzowym?", jednostka: "dni", calkowita: true, warunek: czyPracownik,
        max: (o) => o.w50 === "tak" ? L.wynagrodzenie_chorobowe_dni_od_50_lat : L.wynagrodzenie_chorobowe_dni_do_50_lat,
        poCo: "W danym roku pracodawca finansuje pierwsze 33 dni choroby (lub 14 dni po 50. roku życia). Dopiero po ich wykorzystaniu wypłatę rozpoczyna ZUS. Jeśli w tym roku nie było jeszcze płatnego zwolnienia, wpisz 0." },
      { ...pPlatnik, warunek: (o) => !czyPracownik(o) ? o.zatrudnienie === "zlecenie" :
        num(o.dniNiezd) > (o.w50 === "tak" ? L.wynagrodzenie_chorobowe_dni_od_50_lat : L.wynagrodzenie_chorobowe_dni_do_50_lat) - num(o.dniWykorzystane) },
      ]),
    ],
    async licz(o, c, api) {
      if (o.chorobowe === "nie") return brakChorobowego();
      const podM = await podstawaDla(api, o, "M");
      const r = await api("/api/oblicz/chorobowe-ciaza", { podstawaMiesieczna: podM, dniNiezdolnosci: num(o.dniNiezd), pracownik: czyPracownik(o), wiek50Plus: o.w50 === "tak", dniWynagrodzeniaJuzWykorzystaneWRoku: num(o.dniWykorzystane) || 0 });
      const dni = num(o.dniNiezd);
      const f = pyt("F01");
      const pct = parametry.procenty.zasilek_chorobowy_w_ciazy;
      const platnik = o.platnik === "duzy" ? "pracodawca (płatnik składek)" : o.platnik === "nie_wiem" ? "do potwierdzenia w kadrach" : "ZUS";
      return {
        glowne: `Za zwolnienie w ciąży (${wDniach(dni)}) stawka wynosi ${pct}% podstawy.`, duza: pln(r.kwotaRazem), podpis: `ok. ${pln(r.dzienna)} za każdy dzień zwolnienia`,
        szczegoly: [["Podstawa zasiłku", `${pln(podM)} miesięcznie`],
          ...(r.dniPracodawca > 0 ? [["Wynagrodzenie chorobowe od pracodawcy", `${wDniach(r.dniPracodawca)}: ${pln(r.kwotaPracodawca)}`] as [string, string]] : []),
          ...(r.dniZUS > 0 ? [["Zasiłek chorobowy", `${wDniach(r.dniZUS)}: ${pln(r.kwotaZUS)}. Kto wypłaca: ${platnik}.`] as [string, string]] : [])],
        ostrzezenia: r.ostrzezenia,
        zrob: kroki("F01").map((t) => ({ tekst: t })), druki: f?.druki, status: o.platnik === "nie_wiem" ? "do_potwierdzenia" : f?.status,
        uwagaStatus: "Ustal w kadrach, kto wypłaca zasiłek.", nastepne: ["wniosek-zasilek"],
        jakLiczono: [`Podstawa ${pln(podM)} × ${pct}% ÷ ${L.dni_w_miesiacu_dla_zasilkow} dni = ${pln(r.dzienna)} za dzień.`],
      };
    },
  },

  /* ---- 3. Wniosek o zasiłek (ZAM) ---- */
  {
    id: "wniosek-zasilek", tytul: "Złożyć wniosek o zasiłek po porodzie", krotko: "Ile dostaniesz, kiedy złożyć wniosek i co wpisać w druku ZAM", ikona: "📄", czas: "5 pytań · 3 min",
    slowa: "zasiłek macierzyński wniosek zam po porodzie ile dostanę pieniądze kwota 81,5 100% 70% urlop rodzicielski macierzyński wypłata druk", faq: ["F07", "F08", "F09", "F17", "F18"],
    pytania: [
      pZatrudnienie, pChorobowe, ...poPotwierdzeniuChorobowego([pDataPorodu, pDzieci, pPelnyEtat("M"), pPodstawaZUS("M"), pBrutto("M"),
      { ...pPlatnik, warunek: (o) => o.zatrudnienie === "umowa" || o.zatrudnienie === "zlecenie", zalezyOd: ["zatrudnienie"] },
      { id: "wariant", typ: "wybor", tekst: "W jaki sposób chcesz otrzymywać zasiłek macierzyński?",
        opcje: [
          { v: "zmienny", label: "Wariant standardowy: 100% i 70%", opis: "100% podstawy przez urlop macierzyński (pierwsze 20 tygodni), potem 70% w czasie rodzicielskiego" },
          { v: "usredniony", label: "Wariant stały: 81,5% przez cały rok", opis: "Jednakowa wypłata co miesiąc – wniosek musisz złożyć w ciągu 21 dni po porodzie" },
          { v: "nie_wiem", label: "Nie wiem – chcę porównać oba warianty", opis: "Przeliczymy i pokażemy różnicę między obiema opcjami" },
        ],
        poCo: "Wybór wariantu decyduje o wysokości comiesięcznych wypłat. Pokażemy różnicę i podpowiemy, co zaznaczyć we wniosku.", skad: "Możesz wybrać «Nie wiem», aby porównać obie opcje przed podjęciem decyzji." },
      ]),
    ],
    async licz(o, c, api) {
      if (o.chorobowe === "nie") return brakChorobowego();
      const podM = await podstawaDla(api, o, "M");
      const par: Parametry = await api("/api/parametry");
      const t815 = dodajDni(o.dataPorodu, par.terminy_dni.wniosek_pelny_wymiar_81_5_po_porodzie);
      const poTerminie = t815 < dzis();
      const uzywa815 = o.wariant === "usredniony" && !poTerminie;
      const porownaj = o.wariant === "nie_wiem" && !poTerminie;
      const { baza, limit, matkaMax } = await bazaPlanu(api, o, podM);
      const wejscie = { ...baza, wariant: uzywa815 ? "usredniony_81_5" as const : "zmienny_100_70" as const, rodzicielski: [{ kto: "matka", tygodnie: matkaMax }] };
      const { wariant, ...bez } = wejscie;
      const por = porownaj ? await api("/api/oblicz/porownanie", bez) : null;
      const wyn = por ? por[wariant] : await api("/api/oblicz/plan", wejscie);
      const term = await api("/api/oblicz/terminy", { wejscie });
      zapiszPlan(wejscie);
      const okr = wyn.okresy;
      const mac = okr.find((x: any) => x.rodzaj === "macierzynski");
      const rod = okr.find((x: any) => x.rodzaj === "rodzicielski");
      const adresat = o.platnik === "duzy" ? "Pracodawca (płatnik składek)" : o.platnik === "nie_wiem" ? "Do ustalenia w kadrach (pracodawca lub ZUS)" : "Zakład Ubezpieczeń Społecznych (ZUS)";
      const ost = [...wyn.bledy, ...wyn.ostrzezenia, `Z ${tygodniDopelniacz(limit)} urlopu rodzicielskiego ${tygodnie(limit - matkaMax)} przysługuje wyłącznie drugiemu rodzicowi (część nieprzenoszalna dla drugiego rodzica). Tutaj liczymy Twoje ${tygodnie(matkaMax)}. Jeśli oboje rodzice biorą urlop, sprawdź sprawę „Podzielić urlop z partnerem”.`];
      if (o.wariant !== "zmienny" && poTerminie) ost.push(`Termin złożenia wniosku o stawkę 81,5% minął ${dataPL(t815)} (21 dni od porodu). Pokazujemy wariant standardowy (100% / 70%) przy założeniu, że wniosek o stawkę 81,5% nie został złożony w terminie.`);
      const zrob: Wynik["zrob"] = [
        { kiedy: uzywa815 ? `do ${dataPL(t815)}` : "po porodzie", tekst: o.platnik === "nie_wiem" ? "Ustal w kadrach, gdzie złożyć wniosek ZAM." : o.platnik === "duzy" ? "Złóż wniosek ZAM u pracodawcy." : "Złóż wniosek ZAM w ZUS (elektronicznie przez PUE / eZUS lub w placówce).",
          uwaga: porownaj ? `Jeśli wybierzesz stawkę 81,5%, złóż wniosek do ${dataPL(t815)}.` : undefined },
        { tekst: "Dołącz dokumenty z listy w poradniku (m.in. odpis aktu urodzenia dziecka lub zaświadczenie lekarskie).", uwaga: "Pełną listę znajdziesz w pytaniu «Jakie dokumenty muszę dołączyć?»." },
        { kiedy: `do ${par.terminy_dni.zasilek_wyplata_po_wyjasnieniu_okolicznosci_max} dni`, tekst: "Maksymalny czas oczekiwania na pierwszą wypłatę po wyjaśnieniu wszystkich okoliczności." },
      ];
      const sciagaWiersze: [string, string, string][] = [
        ["Dane wnioskodawcy", `${c.osoba ?? "Twoje imię i nazwisko"}, PESEL ${c.pesel ?? "…"}`, "Dowód osobisty"],
        ["Data urodzenia dziecka", dataPL(o.dataPorodu), "Akt urodzenia (albo termin z karty ciąży przed porodem)"],
        ["Za jaki okres wnioskujesz", [mac && `urlop macierzyński: od ${dataPL(mac.od)} do ${dataPL(mac.do)}`, rod && `urlop rodzicielski: od ${dataPL(rod.od)} do ${dataPL(rod.do)}`].filter(Boolean).join("; "), "Wynika z Twojego planu (tabela powyżej)"],
        ["Pełny wymiar (81,5%)", uzywa815 ? "Zaznacz pole" : porownaj ? "Zaznacz tylko, jeśli wybierzesz stawkę 81,5%" : "Nie zaznaczaj", "Dotyczy wyboru stawki 81,5%"],
        ["Do kogo składasz", adresat, `Sprawdź, czy płatnik zgłasza do ubezpieczenia chorobowego więcej niż ${progPlatnika} osób.`],
      ];
      return {
        glowne: `Za cały urlop dostaniesz ok. ${pln(wyn.sumy.razem)} (macierzyński ${tygodnie(wyn.wymiary.macierzynskiTyg)} i rodzicielski ${tygodnie(matkaMax)}).`,
        duza: pln(wyn.sumy.razem), podpis: mac ? `W okresie macierzyńskim: ok. ${pln(miesiecznie(mac))} miesięcznie` : undefined,
        szczegoly: [["Urlop macierzyński", mac ? `${dataPL(mac.od)} – ${dataPL(mac.do)}` : "—"], ["Urlop rodzicielski", rod ? `${dataPL(rod.od)} – ${dataPL(rod.do)}` : "—"], ["Podstawa zasiłku", `${pln(podM)} miesięcznie`], ["Wariant", uzywa815 ? "uśredniona stawka 81,5%" : "standardowy (100% / 70%)"]],
        ostrzezenia: ost, terminy: terminyDlaRodzica(term), zrob, sciaga: { tytul: "Ściąga: co wpisać w druku ZAM", wiersze: sciagaWiersze, uwaga: "Nazwy pól mogą się nieznacznie różnić od aktualnego druku – sprawdź wzór na zus.pl." },
        druki: ["ZAM", ...(o.zatrudnienie === "umowa" ? ["Z-3"] : o.zatrudnienie === "zlecenie" ? ["Z-3a"] : [])],
        status: o.platnik === "nie_wiem" ? "do_potwierdzenia" : "ok", uwagaStatus: "Ustal w kadrach, gdzie złożyć wniosek ZAM.",
        info: por ? [{ tytul: "Porównanie wariantów", tresc: `Standardowy (100% i 70%): ${pln(por.zmienny_100_70.sumy.razem)}\nUśredniony (81,5%): ${pln(por.usredniony_81_5.sumy.razem)}\n${por.roznicaRazem === 0 ? "Łącznie obie stawki dają tę samą kwotę." : `Różnica: ${pln(Math.abs(por.roznicaRazem))}.`}\n\nWskazówka: wariant stały 81,5% gwarantuje równy budżet co miesiąc, a wariant standardowy daje wyższy zastrzyk gotówki w pierwszych miesiącach po narodzinach.` }] : undefined,
        linki: [LINK_KALK], nastepne: o.zatrudnienie === "umowa" ? ["urlop-pracodawca", "podzial-urlopu"] : ["podzial-urlopu"],
        jakLiczono: wyn.kroki,
        tabela: { kolumny: ["Rodzaj urlopu", "Okres", "Dni", "Kwota brutto"], wiersze: okr.map((x: any) => [RODZAJE[x.rodzaj] ?? x.rodzaj, `${dataPL(x.od)} – ${dataPL(x.do)}`, String(x.dni), pln(x.kwota)]) },
      };
    },
  },

  /* ---- 4. Urlop u pracodawcy ---- */
  {
    id: "urlop-pracodawca", tytul: "Poprosić pracodawcę o urlop", krotko: "Gotowy tekst wniosku i termin, do kiedy go złożyć", ikona: "🏢", czas: "5 pytań · 3 min",
    slowa: "urlop wniosek pracodawca macierzyński rodzicielski ojcowski uzupełniający szef kadry pismo", faq: ["F12", "F14", "F13"],
    pytania: [
      { id: "rodzaj", typ: "wybor", tekst: "O jaki urlop wnioskujesz?",
        opcje: [{ v: "macierzynski", label: "Urlop macierzyński", opis: "Pierwsze tygodnie po porodzie (dla mamy)" }, { v: "rodzicielski", label: "Urlop rodzicielski", opis: "Po macierzyńskim, dla mamy lub taty" }, { v: "ojcowski", label: "Urlop ojcowski", opis: "Dla taty, 2 tygodnie (do 1. urodzin dziecka)" }, { v: "uzupelniajacy", label: "Uzupełniający urlop macierzyński", opis: "Gdy dziecko długo przebywa w szpitalu" }],
        poCo: "Każdy urlop ma inny termin złożenia wniosku." },
      { id: "od", typ: "data", tekst: "Od kiedy chcesz rozpocząć urlop?", poCo: "Od tej daty liczymy termin złożenia wniosku." },
      { id: "do", typ: "data", tekst: "Do kiedy ma trwać urlop?", poCo: "Dzięki temu wniosek zawiera pełny okres urlopu.",
        sprawdz: (v, o) => v < o.od ? "Koniec urlopu nie może być przed jego początkiem." : o.rodzaj === "ojcowski" && dniMiedzy(o.od, v) + 1 > L.urlop_ojcowski_dni ? `Urlop ojcowski może trwać najwyżej ${L.urlop_ojcowski_dni} dni (2 tygodnie).` : undefined },
      { id: "dziecko", typ: "data", tekst: (o) => o.rodzaj === "ojcowski" ? "Kiedy urodziło się dziecko?" : "Kiedy urodziło się dziecko (albo jaki jest planowany termin porodu)?", domyslne: (c) => c.dataPorodu, etykietaDanych: "Data porodu",
        poCo: "Pracodawca potrzebuje daty, żeby powiązać urlop z dzieckiem. Do wniosku o urlop ojcowski dołącza się odpis aktu urodzenia dziecka.",
        skad: "Akt urodzenia lub karta ciąży.",
        sprawdz: (v, o) => {
          if (!o.od) return;
          if (o.rodzaj === "macierzynski") {
            if (o.od < dodajDni(v, -W.macierzynski_przed_porodem_max * 7)) return "Początek urlopu wypada za wcześnie przed porodem.";
            if (o.do < v) return "Koniec urlopu macierzyńskiego wypada przed porodem.";
          } else if (o.od < v) return "Początek tego urlopu nie może wypaść przed porodem.";
          if (o.rodzaj === "ojcowski" && o.do >= dodajMiesiace(v, L.urlop_ojcowski_do_wieku_dziecka_miesiecy)) return `Urlop ojcowski musi się skończyć przed ukończeniem przez dziecko ${L.urlop_ojcowski_do_wieku_dziecka_miesiecy} miesięcy.`;
          if (o.rodzaj === "rodzicielski" && o.do > `${Number(v.slice(0, 4)) + L.urlop_rodzicielski_do_konca_roku_w_ktorym_dziecko_konczy_lat}-12-31`) return "Koniec urlopu rodzicielskiego przekracza limit wieku dziecka.";
        } },
      { id: "czesc", typ: "wybor", tekst: "Która to część urlopu rodzicielskiego?", warunek: (o) => o.rodzaj === "rodzicielski",
        opcje: [{ v: "1", label: "Pierwsza" }, { v: "2", label: "Druga" }, { v: "3", label: "Trzecia" }, { v: "4", label: "Czwarta" }, { v: "5", label: "Piąta (ostatnia)" }],
        poCo: "Urlop rodzicielski można podzielić najwyżej na 5 części. Pracodawca musi wiedzieć, którą wykorzystujesz.", skad: "Jeśli to Twój pierwszy wniosek – wybierz „Pierwsza”." },
      { id: "imie", typ: "tekst", tekst: "Jak się nazywasz?", domyslne: (c) => c.osoba, etykietaDanych: "Imię i nazwisko", poCo: "Wpiszemy to do wniosku.", przyklad: "np. Anna Kowalska" },
      { id: "pracodawca", typ: "tekst", tekst: "Jak nazywa się Twój pracodawca?", domyslne: (c) => c.platnik, etykietaDanych: "Pracodawca", poCo: "Wpiszemy to jako adresata wniosku.", skad: "Z umowy o pracę." },
    ],
    async licz(o, c, api) {
      const par = await api("/api/parametry");
      const T = par.terminy_dni;
      const uzupelniajacy = o.rodzaj === "uzupelniajacy";
      // Art. 180² § 4 w bazie reguł określa termin względem ostatniego dnia urlopu macierzyńskiego.
      const dni = o.rodzaj === "rodzicielski" ? T.wniosek_urlop_rodzicielski_przed_startem : o.rodzaj === "ojcowski" ? T.wniosek_urlop_ojcowski_przed_startem : uzupelniajacy ? 21 : 0;
      const nazwa: Record<string, string> = { macierzynski: "urlopu macierzyńskiego", rodzicielski: "urlopu rodzicielskiego", ojcowski: "urlopu ojcowskiego", uzupelniajacy: "uzupełniającego urlopu macierzyńskiego" };
      const urlop: Record<string, string> = { macierzynski: "urlop macierzyński", rodzicielski: "urlop rodzicielski", ojcowski: "urlop ojcowski", uzupelniajacy: "uzupełniający urlop macierzyński" };
      const termin = dni ? dodajDni(o.od, -dni - (uzupelniajacy ? 1 : 0)) : "";
      const dzieckoOpis = o.rodzaj === "ojcowski" || o.dziecko <= dzis() ? `urodzonego w dniu ${dataPL(o.dziecko)}` : `z planowaną datą porodu na ${dataPL(o.dziecko)}`;
      const tresc = `${dataPL(dzis())}\n\n${o.imie}\n\n${o.pracodawca}\n\nWniosek o udzielenie ${nazwa[o.rodzaj]}\n\nWnoszę o udzielenie mi ${nazwa[o.rodzaj]} w okresie od ${dataPL(o.od)} do ${dataPL(o.do)}${o.rodzaj === "rodzicielski" ? ` (część ${o.czesc} z maksymalnie 5)` : ""}. Dotyczy dziecka ${dzieckoOpis}.\n\n…………………………\n(podpis)`;
      const ost: string[] = [];
      if (termin && termin < dzis()) ost.push(`Termin ${dataPL(termin)} już minął. Złóż wniosek jak najszybciej i zapytaj pracodawcę, czy uwzględni krótszy termin.`);
      if (o.rodzaj === "ojcowski") ost.push("Ważne: Wniosek o urlop ojcowski składa się po narodzinach dziecka. Do wniosku należy dołączyć odpis skrócony aktu urodzenia dziecka (zgodnie z art. 182³ Kodeksu pracy i § 33 rozporządzenia o wnioskach zasiłkowych).");
      return {
        glowne: dni ? `Wniosek o ${urlop[o.rodzaj]} złóż najpóźniej ${dataPL(termin)} (${zaIle(termin)}).` : `Poniżej masz gotowy wniosek o ${urlop[o.rodzaj]}.`,
        tekstDoKopii: { tytul: "Gotowy tekst wniosku", tresc }, ostrzezenia: ost,
        szczegoly: [["Okres urlopu", `${dataPL(o.od)} – ${dataPL(o.do)}`], ["Do kogo", o.pracodawca], ...(dni ? [["Termin złożenia", `co najmniej ${dni} dni ${uzupelniajacy ? "przed końcem urlopu macierzyńskiego" : "przed startem"} (${dataPL(termin)})`] as [string, string]] : [])],
        terminy: termin ? [{ co: `Złożenie wniosku o ${urlop[o.rodzaj]}`, do: termin }] : undefined,
        zrob: [
          ...(o.rodzaj === "ojcowski" ? [{ tekst: "Pamiętaj o dołączeniu odpisu aktu urodzenia dziecka do wniosku o urlop ojcowski." }] : []),
          { kiedy: termin ? `do ${dataPL(termin)}` : undefined, tekst: "Skopiuj lub wydrukuj wniosek, podpisz i złóż pracodawcy." },
          { tekst: "Zachowaj kopię z potwierdzeniem daty złożenia." },
        ],
        status: "ok", nastepne: ["wniosek-zasilek"],
      };
    },
  },

  /* ---- 5. Podział urlopu ---- */
  {
    id: "podzial-urlopu", tytul: "Podzielić urlop z partnerem", krotko: "Porównanie trzech podziałów: kto ile weźmie i ile to wyniesie", ikona: "👨‍👩‍👧", czas: "5 pytań · 3 min",
    slowa: "podział urlopu partner tata ojciec mąż mama oboje rodzice rodzicielski ile wyniesie porównanie dzielić", faq: ["F11", "F12", "F14"],
    pytania: [
      pDataPorodu, pDzieci, pZatrudnienie, pPelnyEtat("M"), pPodstawaZUS("M"), pBrutto("M"), pZatrudnienieO, pPelnyEtat("O"), pPodstawaZUS("O"), pBrutto("O"),
      { id: "ojcowski", typ: "tak_nie", tekst: `Czy tata weźmie też urlop ojcowski (${tygodnie(L.urlop_ojcowski_dni / 7)})?`, poCo: "Urlop ojcowski (2 tygodnie, 100% płatne) jest dodatkowy dla taty – nie odbiera nic z urlopu rodzicielskiego.", skad: "Możecie zmienić to później." },
      { id: "odOjcowski", typ: "data", tekst: "Od kiedy tata chce wziąć urlop ojcowski?", warunek: (o) => o.ojcowski === "tak",
        poCo: "Od tej daty liczymy termin złożenia wniosku u pracodawcy.", sprawdz: (v, o) => v < o.dataPorodu ? "Urlop ojcowski nie może zacząć się przed porodem." :
          dodajDni(v, L.urlop_ojcowski_dni - 1) >= dodajMiesiace(o.dataPorodu, L.urlop_ojcowski_do_wieku_dziecka_miesiecy) ? "Urlop ojcowski skończyłby się po osiągnięciu przez dziecko limitu wieku." : undefined },
    ],
    async licz(o, c, api) {
      const podM = await podstawaDla(api, o, "M"), podO = await podstawaDla(api, o, "O");
      const { baza, limit, matkaMax } = await bazaPlanu(api, o, podM, { podstawy: { matka: podM, ojciec: podO } });
      const oj = o.ojcowski === "tak" ? { ojcowski: [{ od: o.odOjcowski, dni: L.urlop_ojcowski_dni }] } : {};
      const opcje = [
        { nazwa: `Mama bierze ${tygodnie(matkaMax)} rodzicielskiego, tata 0`, m: matkaMax, t: 0 },
        { nazwa: `Tata bierze ${tygodnie(niezbywalne)} rodzicielskiego, mama ${tygodnie(matkaMax)}`, m: matkaMax, t: Math.min(niezbywalne, limit) },
        { nazwa: `Prawie pół na pół (mama ${tygodnie(Math.ceil(limit / 2))}, tata ${tygodnie(Math.floor(limit / 2))})`, m: Math.ceil(limit / 2), t: Math.floor(limit / 2) },
      ];
      const wyniki = await Promise.all(opcje.map(async (op) => {
        const rod = [...(op.m > 0 ? [{ kto: "matka", tygodnie: op.m }] : []), ...(op.t > 0 ? [{ kto: "ojciec", tygodnie: op.t }] : [])];
        const w = { ...baza, ...oj, rodzicielski: rod };
        return { op, w, r: await api("/api/oblicz/plan", w) };
      }));
      const najlepszy = wyniki.reduce((a, b) => (b.r.sumy.razem > a.r.sumy.razem ? b : a));
      const najgorszy = wyniki.reduce((a, b) => (b.r.sumy.razem < a.r.sumy.razem ? b : a));
      zapiszPlan(najlepszy.w);
      const t = await api("/api/oblicz/terminy", { wejscie: najlepszy.w });
      return {
        glowne: `Najwięcej pieniędzy łącznie wyjdzie przy podziale: „${najlepszy.op.nazwa}”. Różnica między podziałami to ${pln(najlepszy.r.sumy.razem - najgorszy.r.sumy.razem)}.`,
        duza: pln(najlepszy.r.sumy.razem), podpis: "razem dla rodziny przy najkorzystniejszym podziale",
        tabela: { kolumny: ["Podział urlopu rodzicielskiego", "Mama", "Tata", "Razem"], wiersze: wyniki.map((x) => [x.op.nazwa, pln(x.r.sumy.matka), pln(x.r.sumy.ojciec), pln(x.r.sumy.razem)]),
          uwaga: `Rodzicielski do podziału: ${tygodnie(limit)}. Każdemu z rodziców przysługuje ${tygodnie(niezbywalne)} tylko dla niego. ${o.ojcowski === "tak" ? "Każdy wariant uwzględnia też urlop ojcowski. " : ""}Pieniądze to niejedyne kryterium – wybierzcie to, co najbardziej odpowiada Waszej rodzinie.` },
        ostrzezenia: [...new Set(wyniki.flatMap((x) => [...(x.r.bledy as string[]), ...(x.r.ostrzezenia as string[])]))],
        terminy: terminyDlaRodzica(t),
        zrob: [{ tekst: "Ustalcie podział razem – można go jeszcze zmieniać." }, { tekst: "Jeśli korzystacie z urlopu jako pracownicy, złóżcie osobne wnioski do swoich pracodawców.", uwaga: "Daty składania wniosków znajdziesz poniżej." }, { tekst: "Każdy z rodziców składa własny wniosek o zasiłek za swój okres." }],
        linki: [LINK_KALK], status: "ok", nastepne: ["urlop-pracodawca", "wniosek-zasilek"],
        jakLiczono: najlepszy.r.kroki,
      };
    },
  },

  /* ---- 6. Praca na urlopie ---- */
  {
    id: "praca-na-urlopie", tytul: "Pracować w czasie urlopu rodzicielskiego", krotko: "Ile pieniędzy i czasu zyskasz lub stracisz, gdy połączysz urlop z pracą", ikona: "💼", czas: "5 pytań · 3 min",
    slowa: "praca urlop rodzicielski łączyć połowa etatu wrócić do pracy pracować częściowo etat zarabiać", faq: ["F13"],
    pytania: [
      pDataPorodu, pDzieci, pPelnyEtat("M"), pPodstawaZUS("M"), pBrutto("M"),
      { id: "tygPraca", typ: "liczba", tekst: "Ile tygodni urlopu rodzicielskiego chcesz połączyć z pracą?", jednostka: "tygodni", min: 1, max: (o) => wymiarRodzicielski(num(o.liczbaDzieci) || 1, false, parametry) - niezbywalne, calkowita: true, przyklad: "np. 20", poCo: "Podaj tygodnie z Twojej puli urlopu rodzicielskiego przed wydłużeniem go przez pracę.", skad: "Wpisz, na jak długo chcesz wrócić do pracy na część etatu." },
      { id: "etat", typ: "wybor", tekst: "Na jaką część etatu wrócisz?", opcje: [{ v: "0.5", label: "Połowa etatu (1/2)" }, { v: "0.4", label: "Dwie piąte etatu (2/5)" }, { v: "0.25", label: "Jedna czwarta etatu (1/4)" }], poCo: "Zgodnie z prawem można pracować najwyżej na pół etatu. Im mniejsza część etatu, tym większą część zasiłku zachowujesz.", skad: "Wymiar czasu pracy ustalasz z pracodawcą." },
    ],
    async licz(o, c, api) {
      const podM = await podstawaDla(api, o, "M");
      const { baza, matkaMax } = await bazaPlanu(api, o, podM);
      const T = num(o.tygPraca);
      if (T > matkaMax) throw new Error(`Możesz połączyć z pracą najwyżej ${tygodnie(matkaMax)} z Twojej puli urlopu rodzicielskiego.`);
      const bez = { ...baza, rodzicielski: [{ kto: "matka", tygodnie: matkaMax }] };
      const z = { ...baza, rodzicielski: [...(matkaMax - T > 0 ? [{ kto: "matka", tygodnie: matkaMax - T }] : []), { kto: "matka", tygodnie: T, wspolczynnikPracy: num(o.etat) }] };
      const [rBez, rZ] = await Promise.all([api("/api/oblicz/plan", bez), api("/api/oblicz/plan", z)]);
      zapiszPlan(z);
      const par = await api("/api/parametry");
      const dniPrzed = par.terminy_dni.wniosek_laczenie_z_praca_przed_startem;
      const kPo = koniec(rBez.okresy), kZ = koniec(rZ.okresy);
      const roz = rBez.sumy.razem - rZ.sumy.razem;
      const mBez = miesiecznie(rBez.okresy.find((x: any) => x.rodzaj === "rodzicielski"));
      const okPraca = rZ.okresy.find((x: any) => x.rodzaj === "rodzicielski" && x.wspolczynnikZasilku !== undefined && x.wspolczynnikZasilku < 1);
      const mPraca = miesiecznie(okPraca);
      const etatTxt = o.etat === "0.5" ? "pół etatu" : o.etat === "0.4" ? "dwie piąte etatu" : "jedną czwartą etatu";
      return {
        glowne: `Przy pracy na ${etatTxt} (${tygodnie(T)} z Twojej puli przed wydłużeniem) urlop potrwa do ${dataPL(kZ)} (zamiast do ${dataPL(kPo)}). ${Math.round(Math.abs(roz) * 100) === 0 ? "Łączna kwota zasiłku wychodzi tak samo, tylko rozłożona na dłuższy czas." : roz > 0 ? `Zasiłek łącznie będzie niższy o ${pln(roz)} (w zamian otrzymujesz normalne wynagrodzenie za pracę).` : `Zasiłek łącznie będzie wyższy o ${pln(-roz)}.`}`,
        ...(mPraca > 0 ? { podpis: `W czasie pracy zasiłek miesięczny to ok. ${pln(mPraca)} (bez pracy: ok. ${pln(mBez)}).` } : {}),
        tabela: { kolumny: ["", "Bez pracy", "Z pracą"], wiersze: [["Zasiłek łącznie", pln(rBez.sumy.razem), pln(rZ.sumy.razem)], ["Urlop kończy się", dataPL(kPo), dataPL(kZ)]], uwaga: "Pensję za pracę dostajesz od pracodawcy – nie jest wliczona w powyższe kwoty." },
        ostrzezenia: [...new Set([...(rZ.ostrzezenia as string[]), ...(rZ.bledy as string[])])],
        zrob: [{ kiedy: `co najmniej ${dniPrzed} dni przed startem pracy`, tekst: "Złóż pracodawcy wniosek o łączenie urlopu z pracą." }, { tekst: `Pracodawca może odmówić, jeśli nie da się tego pogodzić z organizacją pracy – odpowie w ciągu ${par.terminy_dni.odmowa_laczenia_z_praca_odpowiedz_pracodawcy} dni.` }],
        terminy: okPraca ? [{ co: "Wniosek o łączenie pracy z urlopem", do: dodajDni(okPraca.od, -dniPrzed) }] : undefined,
        linki: [{ href: "/wnioski", etykieta: "Otwórz kreator wniosków i wybierz „Łączenie pracy z urlopem”" }, { href: "/kalkulator?tryb=laczenie", etykieta: LINK_KALK.etykieta }], status: "ok", nastepne: ["urlop-pracodawca"], jakLiczono: rZ.kroki,
      };
    },
  },

  /* ---- 7. Adopcja ---- */
  {
    id: "adopcja", tytul: "Adopcja lub rodzina zastępcza", krotko: "Urlop na warunkach macierzyńskiego, zasiłek i terminy po przyjęciu dziecka", ikona: "🧸", czas: "5 pytań · 3 min",
    slowa: "adopcja przysposobienie rodzina zastępcza przyjęcie dziecka na wychowanie urlop zasiłek sąd opiekuńczy", faq: ["F23", "F18"],
    pytania: [
      { id: "rodzajAdopcji", typ: "wybor", tekst: "Jaka jest forma przyjęcia dziecka do rodziny?", opcje: [{ v: "przysposobienie", label: "Przysposobienie (adopcja)", opis: "Dziecko zostało przyjęte, złożono wniosek o przysposobienie do sądu" }, { v: "rodzina_zastepcza", label: "Rodzina zastępcza", opis: "Przyjęcie dziecka w ramach niezawodowej rodziny zastępczej" }], domyslne: (c) => c.rodzajPrzyjecia, etykietaDanych: "Forma przyjęcia dziecka", poCo: "Od formy prawnej przyjęcia dziecka zależy maksymalny limit wieku dziecka uprawniający do urlopu.", skad: "Z postanowienia sądu opiekuńczego albo umowy ze starostą." },
      { id: "dataPorodu", typ: "data", tekst: "Kiedy dziecko zostało przyjęte do Waszej rodziny?", domyslne: (c) => c.dataPrzyjecia, zalezyOd: ["rodzajAdopcji"], etykietaDanych: "Data przyjęcia dziecka", poCo: "Od tej daty liczymy wymiar urlopu i terminy wniosków.", skad: "Z dokumentu o przyjęciu dziecka na wychowanie." },
      { id: "dataUr", typ: "data", tekst: "Kiedy urodziło się najmłodsze przyjęte dziecko?", poCo: "Wiek dziecka wpływa na uprawnienia do urlopu (zgodnie z przepisami Kodeksu pracy).", skad: "Akt urodzenia dziecka.",
        sprawdz: (v, o) => v > o.dataPorodu ? "Data urodzenia nie może być po przyjęciu dziecka." : undefined },
      { id: "odroczenie", typ: "tak_nie", tekst: "Czy dziecku odroczono obowiązek szkolny?", warunek: (o) => o.rodzajAdopcji === "rodzina_zastepcza",
        poCo: "W rodzinie zastępczej decyzja o odroczeniu obowiązku szkolnego wydłuża limit wieku dziecka z 7 do 10 lat." },
      { ...pDzieci, tekst: "Ile dzieci przyjęliście jednocześnie?", domyslne: (c) => c.liczbaPrzyjetychDzieci ? String(Math.min(c.liczbaPrzyjetychDzieci, 5)) : undefined,
        opcje: DZIECI.map((x) => x.v === "2" ? { ...x, label: "Dwoje" } : x), poCo: "Od liczby dzieci przyjętych w tym samym czasie zależy wymiar urlopu." },
      ...[pZatrudnienie, pPelnyEtat("M"), pPodstawaZUS("M"), pBrutto("M")].map((q) => ({
        ...q, warunek: (o: Odp, c: Ctx) => (!o.dataUr || o.dataPorodu < dataLimituAdopcja(o)) && (q.warunek?.(o, c) ?? true),
      })),
    ],
    async licz(o, c, api) {
      const lat = limitWiekuAdopcja(o);
      const granica = dataLimituAdopcja(o);
      if (o.dataPorodu >= granica) return {
        glowne: "W dniu przyjęcia dziecko osiągnęło już limit wieku uprawniający do tego urlopu.",
        status: "do_potwierdzenia", uwagaStatus: "Skonsultuj się z doradcą ZUS, aby sprawdzić uprawnienia w tej sytuacji.",
        szczegoly: [["Data osiągnięcia limitu wieku", dataPL(granica)]],
        zrob: [{ tekst: "Zapytaj w placówce ZUS o uprawnienia po przyjęciu dziecka." }], linki: [{ href: "/pue", etykieta: "Zadaj pytanie w ZUS (PUE / eZUS)" }],
      };
      const podM = await podstawaDla(api, o, "M");
      const { baza, matkaMax, mac: macTyg } = await bazaPlanu(api, o, podM, { tytul: o.rodzajAdopcji, wiekGranicyDzieckaData: granica });
      const dniDoGranicy = dniMiedzy(o.dataPorodu, granica);
      const minimum = W.min_urlop_na_warunkach_macierzynskiego_adopcja;
      const specjalnyWymiar = dniDoGranicy < minimum * 7;
      const rodzicielskiTyg = specjalnyWymiar ? W.urlop_rodzicielski_adopcja_art_183_par_3.standard - niezbywalne :
        o.rodzajAdopcji === "przysposobienie" ? Math.min(matkaMax, Math.max(0, (dniDoGranicy - Math.round(macTyg * 7)) / 7)) : matkaMax;
      const w = { ...baza, rodzicielski: rodzicielskiTyg > 0 ? [{ kto: "matka", tygodnie: rodzicielskiTyg }] : [] };
      const wyn = await api("/api/oblicz/plan", w);
      const t = await api("/api/oblicz/terminy", { wejscie: w });
      zapiszPlan(w);
      const f = pyt("F23");
      const mac = wyn.okresy.find((x: any) => x.rodzaj === "na_warunkach_macierzynskiego" || x.rodzaj === "macierzynski");
      return {
        glowne: `Szacowany zasiłek za urlop na warunkach urlopu macierzyńskiego${rodzicielskiTyg > 0 ? " i rodzicielski" : ""}: ${pln(wyn.sumy.razem)}.`, duza: pln(wyn.sumy.razem), podpis: mac ? `Pierwszy okres: ok. ${pln(miesiecznie(mac))} miesięcznie` : undefined,
        szczegoly: [["Limit wieku dziecka", `do ${dataPL(granica)} (${lat} lat)`], ["Podstawa zasiłku", `${pln(podM)} miesięcznie`]],
        ostrzezenia: [...wyn.bledy, ...wyn.ostrzezenia], terminy: terminyDlaRodzica(t),
        zrob: [...kroki("F23").map((x) => ({ tekst: x })), ...terminyDlaRodzica(t).slice(0, 2).map((x) => ({ kiedy: `do ${dataPL(x.do)}`, tekst: x.co }))],
        druki: f?.druki, status: f?.status, uwagaStatus: "Potwierdź w ZUS, jak limit wieku wpływa na Twój urlop.", linki: [{ href: "/kalkulator?tryb=adopcja", etykieta: LINK_KALK.etykieta }], jakLiczono: wyn.kroki,
      };
    },
  },

  /* ---- 8. Trudna sytuacja ---- */
  {
    id: "trudna-sytuacja", tytul: "Trudna sytuacja: strata, wcześniak, śmierć matki", krotko: "Co przysługuje i gdzie szukać pomocy. Bez pośpiechu", ikona: "🕊️", czas: "1 pytanie · 1 min",
    slowa: "strata martwe urodzenie poronienie zgon śmierć dziecka wcześniak szpital żałoba trudna sytuacja choroba matka zmarła wsparcie psycholog", faq: ["F24", "F15", "F25", "F26"],
    pytania: [
      { id: "sytuacja", typ: "wybor", tekst: "Wybierz sytuację, w której potrzebujesz wsparcia i informacji:", opcje: [{ v: "martwe", label: "Dziecko urodziło się martwe lub doszło do poronienia" }, { v: "wczesniak", label: "Dziecko urodziło się przedwcześnie lub przebywa w szpitalu" }, { v: "zgon", label: "Mama dziecka zmarła lub nie może się nim zająć" }, { v: "wsparcie", label: "Potrzebuję rozmowy lub wsparcia psychologicznego" }], poCo: "Dobierzemy najważniejsze informacje prawne i kontakty. Nie musisz niczego załatwiać od razu – najważniejszy jest spokój." },
    ],
    async licz(o) {
      const mapa: Record<string, string> = { martwe: "F24", wczesniak: "F15", zgon: "F25", wsparcie: "F26" };
      const f = pyt(mapa[o.sytuacja]);
      const org = WSPARCIE.filter((w) => o.sytuacja === "wsparcie" || w.dla.includes(o.sytuacja === "zgon" ? "zgon" : o.sytuacja));
      return {
        lagodny: true, glowne: "Bardzo nam przykro z powodu Twojej straty i trudnej sytuacji. Nie musisz załatwiać formalności natychmiast – poniżej zebraliśmy najważniejsze informacje prawne oraz kontakty do bezpłatnego wsparcia.",
        info: [...(f ? [{ tytul: o.sytuacja === "wsparcie" ? "Gdzie szukać wsparcia" : "Co Ci przysługuje", tresc: f.odpowiedz }] : []), ...(org.length ? [{ tytul: "Organizacje, które mogą pomóc", tresc: org.map((x) => `• ${x.nazwa}: ${x.opis}`).join("\n") + `\n\n${WSPARCIE_UWAGA}` }] : [])],
        zrob: f ? kroki(f.id).map((t) => ({ tekst: t })) : [],
        druki: f?.druki, status: f?.status, linki: o.sytuacja === "wsparcie" ? undefined : [{ href: "/trudne", etykieta: "Sprawdź świadczenia w trudnej sytuacji" }],
      };
    },
  },

  /* ---- 9. Terminy ---- */
  {
    id: "terminy", tytul: "Sprawdzić terminy, których nie mogę przegapić", krotko: "Lista dat: do kiedy złożyć które wnioski", ikona: "⏰", czas: "2 pytania · 1 min",
    slowa: "termin kiedy do kiedy nie przegapić 21 dni przedawnienie ryzyko stracić wniosek data", faq: ["F19", "F09"],
    pytania: [
      { id: "rodzajZdarzenia", typ: "wybor", tekst: "Czego dotyczą terminy, które chcesz sprawdzić?", opcje: [{ v: "porod", label: "Narodziny dziecka (poród)" }, { v: "przysposobienie", label: "Adopcja (przysposobienie)" }, { v: "rodzina_zastepcza", label: "Rodzina zastępcza" }], poCo: "Dla każdej sytuacji obowiązują inne terminy składania wniosków." },
      { ...pDataPorodu, warunek: (o) => o.rodzajZdarzenia === "porod" },
      { id: "dataPrzyjecia", typ: "data", tekst: "Kiedy dziecko zostało przyjęte do rodziny?",
        domyslne: (c) => c.dataPrzyjecia, warunek: (o) => o.rodzajZdarzenia === "przysposobienie" || o.rodzajZdarzenia === "rodzina_zastepcza",
        etykietaDanych: "Data przyjęcia dziecka", poCo: "Od tej daty liczymy ustawowe terminy.", skad: "Z dokumentu o przyjęciu dziecka na wychowanie." },
      { id: "znaKoniec", typ: "tak_nie", tekst: "Czy znasz ostatni dzień okresu, za który chcesz dostać zasiłek?", poCo: "Od tego dnia liczymy 6-miesięczny termin na przedawnienie roszczenia o wypłatę zasiłku." },
      { id: "koniec", typ: "data", tekst: "Jaki jest ostatni dzień tego okresu?", warunek: (o) => o.znaKoniec === "tak",
        poCo: "Podaj ostatni dzień okresu zasiłkowego, którego dotyczy Twój wniosek." },
    ],
    async licz(o, c, api) {
      const t = await api("/api/oblicz/terminy", { tytul: o.rodzajZdarzenia, dataZdarzenia: o.dataPorodu ?? o.dataPrzyjecia,
        plan: { okresy: o.znaKoniec === "tak" ? [{ rodzaj: "macierzynski", do: o.koniec }] : [] } });
      const wszystkie: { co: string; do: string }[] = t.filter((x: { do?: string }) => x.do)
        .map((x: { co: string; do: string }) => ({ ...x, co: x.co.replace(/\d{4}-\d{2}-\d{2}/g, (d) => dataPL(d)) }))
        .sort((a: { do: string }, b: { do: string }) => a.do.localeCompare(b.do));
      const bliski = wszystkie.find((x) => x.do >= dzis());
      return {
        glowne: bliski ? `Najbliższy termin: ${bliski.co} – do ${dataPL(bliski.do)} (${zaIle(bliski.do)}).` : "Wszystkie główne terminy dla tej daty już minęły. Złóż wnioski jak najszybciej.",
        terminy: wszystkie, zrob: [{ tekst: "Wpisz najważniejsze daty do kalendarza w telefonie." }, { tekst: "W razie wątpliwości zapytaj konsultanta ZUS przez konto PUE / eZUS." }],
        linki: [{ href: "/kalendarz", etykieta: "Zobacz terminy ZUS razem z badaniami i wizytami" }, { href: "/pue", etykieta: "Zadaj pytanie w ZUS (PUE / eZUS)" }], status: "ok", nastepne: o.rodzajZdarzenia === "porod" ? ["wniosek-zasilek", "urlop-pracodawca"] : ["adopcja"],
        ostrzezenia: ["Terminy wniosków o urlop rodzicielski i ojcowski zależą od wybranej daty startu – poznasz je w sprawach „Podzielić urlop” i „Poprosić pracodawcę o urlop”."],
      };
    },
  },

  /* ---- 10. Odpis aktu urodzenia ---- */
  {
    id: "odpis-aktu", tytul: "Zdobyć odpis aktu urodzenia", krotko: "Gdzie i jak załatwić odpis, i kiedy ZUS pobiera dane sam", ikona: "🪪", czas: "bez pytań · 1 min",
    slowa: "odpis akt urodzenia usc urząd stanu cywilnego dokument dziecka", faq: ["F27"], pytania: [],
    async licz() {
      const f = pyt("F27");
      return {
        glowne: "Odpis aktu urodzenia dziecka wydaje Urząd Stanu Cywilnego (USC). Do celów zasiłku w ZUS najczęściej nie musisz go pobierać – ZUS pozyskuje dane dziecka z państwowego rejestru PESEL.",
        info: f ? [{ tytul: "Co warto wiedzieć", tresc: f.odpowiedz }] : [],
        zrob: kroki("F27").map((t) => ({ tekst: t })),
        linki: [{ href: "/odpis", etykieta: "Złóż wniosek o odpis aktu urodzenia przez internet (symulacja gov.pl / USC)" }],
        status: f?.status,
      };
    },
  },
];

export const sprawa = (id: string) => SPRAWY.find((s) => s.id === id);

export const TOP: Record<Moment, { tytul: string; ids: string[] }> = {
  plan: { tytul: "Planuję dziecko", ids: ["co-przysluguje", "wniosek-zasilek", "podzial-urlopu"] },
  ciaza: { tytul: "Jestem w ciąży", ids: ["zwolnienie-ciaza", "wniosek-zasilek", "podzial-urlopu"] },
  dziecko: { tytul: "Dziecko już jest", ids: ["wniosek-zasilek", "urlop-pracodawca", "podzial-urlopu"] },
};

export function etykietaOdp(q: Pyt, v: string): string {
  if (q.typ === "wybor") return q.opcje?.find((x) => x.v === v)?.label ?? v;
  if (q.typ === "tak_nie") return v === "tak" ? "Tak" : "Nie";
  if (q.typ === "data") return dataPL(v);
  if (q.typ === "liczba") {
    const n = num(v);
    if (q.jednostka === "zł") return pln(n);
    if (q.jednostka === "dni") return wDniach(n);
    if (q.jednostka === "tygodni") return tygodnie(n);
    return liczba(n);
  }
  return v;
}

/* ============ wyszukiwanie lokalne („opisz własnymi słowami”) ============ */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l");
const pomijane = new Set("aby albo ale bez bo by chce chcialabym czy da dac dla do dostac dostane dziecko dziecka gr ile jak jaka jaki jesli jest juz kiedy kod ktore lub ma mam mnie moge moj moje mu na nam nie np od oraz po pod sie tego to tu ty w we wziac z za ze zus".split(" "));
const tok = (s: string) => norm(s).match(/\d+(?:[,.]\d+)?%?|[a-z][a-z0-9]+/g) ?? [];
const istotne = (slowa: string[]) => [...new Set(slowa.filter((w) => w.length >= 3 && !pomijane.has(w) || w === "l4"))];

function jednaLiterowka(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) ||
    (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length < b.length ? a.slice(i) === b.slice(i + 1) : a.slice(i + 1) === b.slice(i);
}

function podobienstwo(a: string, b: string): number {
  if (a === b) return 1;
  if (/^\d/.test(a) || /^\d/.test(b)) return a.replace("%", "") === b.replace("%", "") ? 1 : 0;
  const krotsze = Math.min(a.length, b.length);
  if (krotsze >= 5 && (a.startsWith(b) || b.startsWith(a))) return 0.8;
  if (krotsze >= 6 && a.slice(0, -2) === b.slice(0, -2)) return 0.75;
  return krotsze >= 5 && jednaLiterowka(a, b) ? 0.7 : 0;
}

function intencjaZapytania(slowa: string[]): string | undefined {
  const ma = (...rdzenie: string[]) => rdzenie.some((r) => slowa.some((w) => podobienstwo(w, r) > 0));
  const urlop = ma("urlop", "urlopu", "urlopie", "rodziciel", "rodzicielski", "rodzicielskim");
  if (ma("odpis", "usc") || (ma("akt", "aktu") && ma("urodzen", "urodzenia"))) return "odpis-aktu";
  if (ma("poron", "poronilam", "poronienie", "wczesniak", "martwe", "zmarlo", "zmarla", "utrata") ||
      (ma("szpital", "szpitalu") && ma("dziecko", "dziecka"))) return "trudna-sytuacja";
  if (ma("przedawnienie", "termin", "terminy", "spoznienie") || (ma("czasu") && ma("wniosek", "wniosku"))) return "terminy";
  if (ma("adopcja", "adopt", "przysposob", "przysposobienie", "zastepcza")) return "adopcja";
  if (ma("wyczekiwania", "karencja", "ubezpieczen", "ubezpieczenia", "zadluzenie", "dlug", "skladkowe") ||
      (ma("bez") && ma("chorobowe", "chorobowego"))) return "co-przysluguje";
  if (ma("l4", "zwolnienie", "ciazowe", "chorobowy", "chorobowym") || (ma("zla") && ma("kod"))) return "zwolnienie-ciaza";
  if (urlop && ma("pracowac", "praca", "prace", "etatu", "dorabiac", "laczenie", "lacznie")) return "praca-na-urlopie";
  if ((urlop || ma("macierzynski", "ojcowski")) && ma("szef", "szefa", "kadr", "kadry", "pracodawca", "pracodawcy", "pismo", "papier") ||
      ma("ojcowski") && ma("wniosek", "wniosku")) return "urlop-pracodawca";
  if (ma("podzielic", "podzial") || (urlop && ma("maz", "partner", "partnerem", "tata", "taty")) ||
      (ma("tygodni") && ma("tata", "taty", "ojciec", "ojca"))) return "podzial-urlopu";
  if (ma("zam", "macierzynski", "81,5", "81.5") || (ma("porodzie") && ma("dostane", "pieniadze", "wyplata"))) return "wniosek-zasilek";
  if (ma("ojcowski")) return "urlop-pracodawca";
}

export function szukaj<T extends { id: string; pytanie: string; odpowiedz: string }>(q: string, faq: T[]) {
  const slowa = tok(q);
  const t = istotne(slowa);
  if (!t.length) return { sprawy: [] as Sprawa[], faq: [] as T[] };
  const id = intencjaZapytania(slowa);
  const wynik = (txt: string) => {
    const indeks = istotne(tok(txt));
    return t.reduce((s, w) => s + Math.max(0, ...indeks.map((k) => podobienstwo(w, k))), 0) / t.length;
  };
  const wybrana = id ? sprawa(id) : undefined;
  const sp = wybrana ? [wybrana] : SPRAWY.map((s) => ({ s, p: wynik(`${s.tytul} ${s.slowa} ${s.krotko}`) }))
    .filter((x) => x.p >= 0.7).sort((a, b) => b.p - a.p).slice(0, 3).map((x) => x.s);
  const powiazane = sp[0]?.faq ?? [];
  const fq = faq.filter((f) => !wybrana || powiazane.includes(f.id))
    .map((f) => ({ f, p: wynik(f.pytanie), kolejnosc: powiazane.indexOf(f.id) }))
    .filter((x) => x.p >= 0.7 || (wybrana && x.kolejnosc >= 0 && x.kolejnosc < 2))
    .sort((a, b) => b.p - a.p || a.kolejnosc - b.kolejnosc).slice(0, 3).map((x) => x.f);
  return { sprawy: sp, faq: fq };
}

/* ============ dane o rodzicu (po zalogowaniu) ============ */
export async function zbudujCtx(api: Api, sesja: { osoba: string; pesel: string; personaId: string }): Promise<Ctx> {
  const naDzien = dzis();
  const c: Ctx = { osoba: sesja.osoba, pesel: sesja.pesel };
  const dane = async (url: string) => api(url).catch(() => null);
  const pesel = encodeURIComponent(sesja.pesel);
  const [u, e, z, sc] = await Promise.all([
    dane(`/api/zus/ubezpieczenie?pesel=${pesel}&naDzien=${naDzien}`),
    dane(`/api/zus/ezla?pesel=${pesel}`),
    dane(`/api/zus/zadluzenie?pesel=${pesel}&naDzien=${naDzien}`),
    dane("/api/scenariusze"),
  ]);
  type Ubezpieczenie = { od: string; do: string | null; tytul: string; chorobowe: string; platnik?: { nazwa?: string; liczbaUbezpieczonych?: number } };
  const ubezpieczenia: Ubezpieczenie[] = Array.isArray(u?.ubezpieczenie) ? u.ubezpieczenie : [];
  const wDniu = (ub: Ubezpieczenie, data: string) => ub.od <= data && (ub.do === null || ub.do >= data);
  const ub = ubezpieczenia.filter((x) => wDniu(x, naDzien)).sort((a, b) => b.od.localeCompare(a.od))[0];
  c.tytul = ub?.tytul;
  c.platnik = ub?.platnik?.nazwa;
  c.liczbaUbezpieczonychPlatnika = ub?.platnik?.liczbaUbezpieczonych;
  if (ub && (ub.tytul === "dzialalnosc" || ub.tytul === "zlecenie")) c.dobrowolne = ub.chorobowe === "dobrowolne";
  if (ub && ub.chorobowe !== "brak") c.dniUbezpieczenia = u?.dniNieprzerwanegoUbezpieczeniaChorobowego || undefined;
  c.zadluzenie = z?.kwotaZadluzenia;
  c.ezlaDni = e?.lacznieDni || undefined;
  const id = sesja.personaId.replace(/[ab]$/, "");
  const w = sc?.przypadki?.find((x: any) => x.id === id)?.wejscie;
  if (w?.dataZdarzenia) {
    // P07 zawiera dwa profile jednej rodziny. W formularzu pierwsza podstawa dotyczy zalogowanej osoby.
    const drugiProfilAdopcji = sesja.personaId === "P07b";
    c.podstawaM = drugiProfilAdopcji ? w.podstawy?.ojciec : w.podstawy?.matka;
    c.podstawaO = drugiProfilAdopcji ? w.podstawy?.matka : w.podstawy?.ojciec;
    if (w.tytul === "porod") {
      c.dataPorodu = w.dataZdarzenia;
      c.liczbaDzieci = w.liczbaDzieci;
      if (u) c.wDniuPorodu = ubezpieczenia.some((x) => x.chorobowe !== "brak" && wDniu(x, w.dataZdarzenia));
    } else if (w.tytul === "przysposobienie" || w.tytul === "rodzina_zastepcza") {
      c.dataPrzyjecia = w.dataZdarzenia;
      c.liczbaPrzyjetychDzieci = w.liczbaDzieci;
      c.rodzajPrzyjecia = w.tytul;
    }
  }
  return c;
}

/** Najpilniejsza rzecz do zrobienia dla zalogowanego rodzica (najbliższy termin z jego planu). */
export async function najpilniejsze(api: Api, sesja: { personaId: string }): Promise<{ co: string; do: string; sprawa: string; plan: any } | null> {
  try {
    const sc = await api("/api/scenariusze");
    const id = sesja.personaId.replace(/[ab]$/, "");
    const w = sc.przypadki?.find((x: any) => x.id === id)?.wejscie;
    if (!w?.dataZdarzenia || !w.podstawy) return null;
    const t = await api("/api/oblicz/terminy", { wejscie: w });
    const nast = terminyDlaRodzica(t).find((x) => x.do >= dzis());
    if (!nast) return null;
    const sp = /81,5|zasiłek/i.test(nast.co) ? "wniosek-zasilek" : "urlop-pracodawca";
    return { co: nast.co, do: nast.do, sprawa: sp, plan: w };
  } catch { return null; }
}
export { zaIle };
