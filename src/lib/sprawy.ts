import { dodajDni, dniMiedzy } from "@/engine/kalkulator";
import { pln, dataPL, dataKrotka, tygodnie, dzis, RODZAJE } from "./format";
import { pytanie, type Status } from "@/content/poradnik";
import { WSPARCIE, WSPARCIE_UWAGA } from "@/content/tresci";

/* ============ typy ============ */
export type Api = <T = any>(url: string, body?: unknown) => Promise<T>;
export type Odp = Record<string, any>;
export type Moment = "plan" | "ciaza" | "dziecko";

/** Dane o rodzicu pobrane po zalogowaniu (symulowany ZUS + scenariusz persony) – służą do wstępnego wypełnienia odpowiedzi. */
export interface Ctx {
  osoba?: string; pesel?: string;
  tytul?: string; dniUbezpieczenia?: number; wDniuPorodu?: boolean; liczbaUbezpieczonychPlatnika?: number; platnik?: string; zadluzenie?: number; ezlaDni?: number;
  dataPorodu?: string; liczbaDzieci?: number; podstawaM?: number; podstawaO?: number; adopcja?: boolean;
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
  jednostka?: string; min?: number; max?: number; przyklad?: string;
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
const num = (x: any) => Number(String(x ?? "").replace(",", ".").replace(/\s/g, ""));
const DZIECI = [{ v: "1", label: "Jedno" }, { v: "2", label: "Dwoje (bliźnięta)" }, { v: "3", label: "Troje" }, { v: "4", label: "Czworo" }, { v: "5", label: "Pięcioro lub więcej" }];
const ZATRUDNIENIE = [
  { v: "umowa", label: "Umowa o pracę", opis: "Etat u pracodawcy" },
  { v: "dzialalnosc", label: "Własna firma (działalność)", opis: "Opłacam składki sama" },
  { v: "zlecenie", label: "Umowa zlecenia", opis: "Z dobrowolnym ubezpieczeniem chorobowym" },
];
const czyPracownik = (o: Odp) => o.zatrudnienie === "umowa" || !o.zatrudnienie;
const pyt = (id: string) => pytanie(id);
const kroki = (...ids: string[]) => ids.flatMap((i) => pyt(i)?.kroki ?? []);
const dniDo = (iso: string) => dniMiedzy(dzis(), iso);
const zaIle = (iso: string) => { const d = dniDo(iso); return d < 0 ? "termin minął" : d === 0 ? "dziś" : d === 1 ? "jutro" : `za ${d} dni`; };

const pDataPorodu: Pyt = {
  id: "dataPorodu", typ: "data", tekst: "Kiedy dziecko się urodziło albo kiedy jest planowany termin porodu?",
  domyslne: (c) => c.dataPorodu, etykietaDanych: "Data porodu",
  poCo: "Od tej daty liczymy wszystkie okresy urlopów i terminy wniosków.", skad: "Karta ciąży albo akt urodzenia. Jeśli nie znasz dokładnie – wpisz termin z karty ciąży, poprawisz później.",
};
const pDzieci: Pyt = {
  id: "liczbaDzieci", typ: "wybor", tekst: "Ile dzieci urodziło się (lub urodzi) przy jednym porodzie?", opcje: DZIECI,
  domyslne: (c) => (c.liczbaDzieci ? String(c.liczbaDzieci) : undefined), etykietaDanych: "Liczba dzieci",
  poCo: "Od liczby dzieci przy jednym porodzie zależy, ile tygodni urlopu Ci przysługuje.",
};
const pZatrudnienie: Pyt = {
  id: "zatrudnienie", typ: "wybor", tekst: "Na jakiej podstawie pracujesz?", opcje: ZATRUDNIENIE,
  domyslne: (c) => (c.tytul ? (c.tytul === "umowa_o_prace" ? "umowa" : c.tytul === "dzialalnosc" ? "dzialalnosc" : c.tytul === "zlecenie" ? "zlecenie" : undefined) : undefined), etykietaDanych: "Rodzaj zatrudnienia",
  poCo: "Od tego zależy, jak liczymy podstawę zasiłku i kto go wypłaca.", skad: "Z umowy. Jeśli nie masz umowy ani własnej firmy – wybierz „Umowa zlecenia”, a my sprawdzimy, czy masz ubezpieczenie.",
};
const pPodstawaZUS = (kto: "M" | "O"): Pyt => ({
  id: kto === "M" ? "podstawaM" : "podstawaO", typ: "liczba", tekst: kto === "M" ? "Podstawa Twojego zasiłku (zł miesięcznie)" : "Podstawa zasiłku drugiego rodzica (zł miesięcznie)",
  domyslne: (c) => (kto === "M" ? c.podstawaM : c.podstawaO), etykietaDanych: kto === "M" ? "Podstawa zasiłku" : "Podstawa zasiłku drugiego rodzica", jednostka: "zł",
  warunek: (o, c) => (kto === "M" ? c.podstawaM !== undefined : c.podstawaO !== undefined),
  poCo: "To kwota, od której liczymy zasiłek (średnia z 12 miesięcy po odliczeniu składek).",
});
const pBrutto = (kto: "M" | "O"): Pyt => ({
  id: kto === "M" ? "brutto" : "bruttoO", typ: "liczba", jednostka: "zł", min: 0, przyklad: "np. 6500",
  tekst: (o) => kto === "O" ? "Ile zarabia drugi rodzic miesięcznie „na papierze” (brutto)?" : czyPracownik(o) ? "Ile zarabiasz miesięcznie „na papierze” (brutto)?" : "Od jakiej kwoty opłacasz miesięcznie składki na ubezpieczenia?",
  warunek: (o, c) => (kto === "M" ? c.podstawaM === undefined : c.podstawaO === undefined),
  poCo: "Z tego liczymy podstawę zasiłku (średnia z ostatnich 12 miesięcy, pomniejszona o 13,71% składek).",
  skad: "Pasek wypłaty albo umowa – kwota „brutto”, czyli przed odliczeniem podatku. Jeśli wynagrodzenie bywa różne, wpisz średnią z roku. Przy własnej firmie: kwota, od której płacisz składki (deklaracja ZUS DRA).",
});

async function podstawaDla(api: Api, o: Odp, kto: "M" | "O"): Promise<number> {
  const gotowa = num(kto === "M" ? o.podstawaM : o.podstawaO);
  if (gotowa > 0) return gotowa;
  const kw = num(kto === "M" ? o.brutto : o.bruttoO);
  if (!(kw >= 0)) throw new Error("Podaj kwotę zarobków.");
  const niepr = kto === "M" && !czyPracownik(o);
  const r = await api(`/api/oblicz/podstawa`, niepr ? { typ: "niepracownik", sredniaPodstawa: kw } : { typ: "pracownik", sredniaBrutto: kw });
  return r.podstawaMiesieczna;
}

const wariantKlucz = (o: Odp) => (o.wariant === "usredniony" ? "usredniony_81_5" : "zmienny_100_70");

async function bazaPlanu(api: Api, o: Odp, podM: number, extra: any = {}) {
  const baza = { tytul: "porod", dataZdarzenia: o.dataPorodu, liczbaDzieci: num(o.liczbaDzieci) || 1, zaswiadczenieZaZyciem: false, wariant: wariantKlucz(o), podstawy: { matka: podM }, rodzicielski: [] as any[], ...extra };
  const w0 = await api("/api/oblicz/plan", baza);
  const limit = w0.wymiary.rodzicielskiTyg as number;
  // 9 tygodni urlopu rodzicielskiego przysługuje wyłącznie drugiemu rodzicowi (KP art. 182¹c § 4) – jeden rodzic może wziąć najwyżej E−9
  return { baza, limit, matkaMax: Math.max(limit - 9, 0), mac: w0.wymiary.macierzynskiTyg as number };
}

const zapiszPlan = (wejscie: any) => { try { localStorage.setItem("rodzice.plan", JSON.stringify({ wejscie })); } catch { /* brak localStorage */ } };
const koniec = (okresy: any[]) => okresy.reduce((m: string, x: any) => (x.do > m ? x.do : m), "");
const miesiecznie = (okres: any) => (okres && okres.dni ? Math.round((okres.kwota / okres.dni) * 30 * 100) / 100 : 0);

function terminyDlaRodzica(t: any[]): { co: string; do: string }[] {
  return t.filter((x) => x.do && !/Przedawnienie/.test(x.co)).map((x) => ({ co: String(x.co).replace(/\d{4}-\d{2}-\d{2}/g, (d) => dataPL(d)), do: x.do })).sort((a, b) => a.do.localeCompare(b.do));
}

const LINK_KALK = { href: "/kalkulator", etykieta: "Dopracuj szczegóły w pełnym kalkulatorze" };

/* ============ sprawy ============ */
export const SPRAWY: Sprawa[] = [
  /* ---- 1. Co mi przysługuje ---- */
  {
    id: "co-przysluguje", tytul: "Sprawdzić, co mi przysługuje", krotko: "Zasiłek chorobowy w ciąży i macierzyński: tak czy nie, i dlaczego", ikona: "🛡️", czas: "3–5 pytań · 2 min",
    slowa: "przysługuje prawo uprawnienia czy dostanę zasiłek ubezpieczenie chorobowe karencja okres wyczekiwania umowa zlecenie działalność brak ubezpieczenia", faq: ["F01", "F02", "F20", "F21", "F22"],
    pytania: [
      { id: "tytul", typ: "wybor", tekst: "Jak jesteś teraz ubezpieczona?", domyslne: (c) => c.tytul, etykietaDanych: "Rodzaj ubezpieczenia",
        opcje: [{ v: "umowa_o_prace", label: "Umowa o pracę" }, { v: "zlecenie", label: "Umowa zlecenia" }, { v: "dzialalnosc", label: "Własna firma (działalność)" }, { v: "dzielo_lub_brak", label: "Umowa o dzieło albo nie mam ubezpieczenia" }],
        poCo: "Od rodzaju ubezpieczenia zależy, czy w ogóle masz prawo do zasiłku.", skad: "Z umowy lub z wyciągu z konta PUE." },
      { id: "dobrowolne", typ: "tak_nie", tekst: "Czy opłacasz dobrowolną składkę na ubezpieczenie chorobowe?", warunek: (o) => o.tytul === "zlecenie" || o.tytul === "dzialalnosc",
        poCo: "Przy zleceniu i własnej firmie zasiłek przysługuje tylko osobom, które same się na chorobowe zgłosiły.", skad: "Z potwierdzenia zgłoszenia do ubezpieczeń (ZUS ZUA) albo z rozliczeń składek." },
      { id: "od", typ: "data", tekst: "Od kiedy masz to ubezpieczenie chorobowe bez przerwy dłuższej niż 30 dni?", warunek: (o) => o.tytul === "umowa_o_prace" || ((o.tytul === "zlecenie" || o.tytul === "dzialalnosc") && o.dobrowolne === "tak"),
        domyslne: (c) => (c.dniUbezpieczenia !== undefined ? dodajDni(dzis(), -c.dniUbezpieczenia + 1) : undefined), etykietaDanych: "Ubezpieczona nieprzerwanie od",
        poCo: "Na zasiłek chorobowy trzeba odczekać: 30 dni przy umowie o pracę, 90 dni przy dobrowolnym ubezpieczeniu.", skad: "Data początku umowy o pracę albo zgłoszenia do ubezpieczenia." },
      { id: "dataPorodu", typ: "data", tekst: "Kiedy jest planowany termin porodu?", domyslne: (c) => c.dataPorodu, etykietaDanych: "Termin porodu",
        poCo: "Zasiłek macierzyński przysługuje, jeśli w dniu porodu jesteś ubezpieczona.", skad: "Karta ciąży." },
      { id: "wDniu", typ: "tak_nie", tekst: "Czy w dniu porodu nadal będziesz ubezpieczona chorobowo?", domyslne: (c) => (c.wDniuPorodu === undefined ? undefined : c.wDniuPorodu ? "tak" : "nie"), etykietaDanych: "Ubezpieczona w dniu porodu",
        warunek: (o) => o.tytul !== "dzielo_lub_brak",
        poCo: "To najważniejszy warunek zasiłku macierzyńskiego. Utrata pracy lub zakończenie umowy przed porodem może go odebrać.", skad: "Pomyśl, czy umowa lub składki potrwają do porodu." },
      { id: "zadluzenie", typ: "liczba", tekst: "Ile wynosi Twoje zadłużenie składkowe w ZUS? (wpisz 0, jeśli nie masz)", jednostka: "zł", min: 0, warunek: (o) => o.tytul === "dzialalnosc",
        domyslne: (c) => c.zadluzenie, etykietaDanych: "Zadłużenie składkowe", poCo: "Zadłużenie powyżej progu wstrzymuje wypłatę zasiłku do czasu spłaty.", skad: "Konto PUE ZUS, zakładka „Rozliczenia”." },
      { id: "platnik", typ: "wybor", tekst: "Ilu pracowników zatrudnia Twój pracodawca?", warunek: (o) => o.tytul === "umowa_o_prace",
        opcje: [{ v: "duzy", label: "Więcej niż 20 osób" }, { v: "maly", label: "20 osób lub mniej (albo nie wiem)" }],
        domyslne: (c) => (c.liczbaUbezpieczonychPlatnika === undefined ? undefined : c.liczbaUbezpieczonychPlatnika > 20 ? "duzy" : "maly"), etykietaDanych: "Wielkość pracodawcy",
        poCo: "Pracodawca zgłaszający więcej niż 20 osób sam wypłaca zasiłek, w pozostałych przypadkach robi to ZUS.", skad: "Zapytaj w kadrach albo sprawdź w paski płacowe/ofercie pracy." },
    ],
    async licz(o, c, api) {
      const tytul = o.tytul;
      const maCh = tytul === "umowa_o_prace" || ((tytul === "zlecenie" || tytul === "dzialalnosc") && o.dobrowolne === "tak");
      const dni = maCh && o.od ? Math.max(dniMiedzy(o.od, dzis()) + 1, 0) : 0;
      const r = await api("/api/oblicz/uprawnienia", {
        tytul, dobrowolneChorobowe: o.dobrowolne === "tak", dniNieprzerwanegoUbezpieczeniaChorobowego: dni, ubezpieczonaWDniuPorodu: o.wDniu === "tak" && maCh,
        zadluzenieSkladkowePLN: num(o.zadluzenie) || 0, liczbaUbezpieczonychPlatnika: o.platnik === "duzy" ? 21 : 5,
      });
      const mac = r.zasilekMacierzynski, ch = r.zasilekChorobowyWCiazy;
      const zrob: Wynik["zrob"] = [];
      if (mac.przysluguje) zrob.push({ tekst: "Policz, ile dostaniesz, i przygotuj wniosek o zasiłek macierzyński." });
      else zrob.push({ tekst: "Sprawdź alternatywę opisaną niżej i zapytaj w ZUS o swoją sytuację (zakładka PUE → „Zadaj pytanie”)." });
      if (ch.przysluguje) zrob.push({ tekst: "Gdy lekarz wystawi zwolnienie w ciąży – zobacz, ile zasiłku Ci się należy." });
      return {
        glowne: mac.przysluguje ? (r.zasilekMacierzynski.zawieszonyDoSplatyZadluzenia ? "Masz prawo do zasiłku macierzyńskiego, ale wypłata czeka na spłatę zadłużenia." : "Masz prawo do zasiłku macierzyńskiego.") : "Z tego, co wpisałaś, zasiłek macierzyński może Ci nie przysługiwać.",
        szczegoly: [["Zasiłek chorobowy w ciąży", `${ch.przysluguje ? "przysługuje" : "nie przysługuje"} – ${ch.powod}`], ["Zasiłek macierzyński", `${mac.przysluguje ? "przysługuje" : "nie przysługuje"} – ${mac.powod}`], ["Kto wypłaca", r.ktoWyplaca === "pracodawca" ? "Twój pracodawca" : "ZUS"]],
        ostrzezenia: [...r.ostrzezenia.filter((x: string) => x !== mac.powod), ...(r.alternatywa ? [r.alternatywa] : [])],
        zrob, druki: mac.przysluguje ? ["ZAM"] : [], nastepne: mac.przysluguje ? ["wniosek-zasilek", "zwolnienie-ciaza"] : ["trudna-sytuacja"],
        linki: [{ href: "/pue", etykieta: "Zadaj pytanie w ZUS (symulacja PUE)" }],
      };
    },
  },

  /* ---- 2. Zwolnienie w ciąży ---- */
  {
    id: "zwolnienie-ciaza", tytul: "Zwolnienie w ciąży – ile dostanę", krotko: "Zasiłek chorobowy w ciąży (100%) i kto go wypłaca", ikona: "🩺", czas: "4 pytania · 2 min",
    slowa: "zwolnienie l4 e-zla chorobowe ciąża ciążowe chorobowy zasiłek 100% lekarz pracodawca wynagrodzenie chorobowe", faq: ["F01", "F02", "F03"],
    pytania: [
      pZatrudnienie,
      pPodstawaZUS("M"),
      pBrutto("M"),
      { id: "dniNiezd", typ: "liczba", tekst: "Ile dni zwolnienia w ciąży masz lub planujesz? (zwolnienie z kodem B)", jednostka: "dni", min: 1, max: 270, przyklad: "np. 60",
        domyslne: (c) => (c.ezlaDni ? c.ezlaDni : undefined), etykietaDanych: "Dni zwolnień e-ZLA",
        poCo: "Tyle dni liczymy, żeby pokazać Twój zasiłek.", skad: "Z e-ZLA (konto PUE ZUS albo od lekarza). Nie wiesz? Wpisz 30, żeby zobaczyć kwotę za miesiąc." },
      { id: "w50", typ: "tak_nie", tekst: "Czy masz ukończone 50 lat?", warunek: (o) => czyPracownik(o), poCo: "Po 50. roku życia pracodawca płaci wynagrodzenie chorobowe krócej (14 dni zamiast 33).", skad: "Z dowodu osobistego." },
    ],
    async licz(o, c, api) {
      const podM = await podstawaDla(api, o, "M");
      const r = await api("/api/oblicz/chorobowe-ciaza", { podstawaMiesieczna: podM, dniNiezdolnosci: num(o.dniNiezd), pracownik: czyPracownik(o), wiek50Plus: o.w50 === "tak" });
      const dni = num(o.dniNiezd);
      const f = pyt("F01");
      return {
        glowne: `Za ${dni} dni zwolnienia w ciąży dostaniesz zasiłek: 100% podstawy.`, duza: pln(r.kwotaRazem), podpis: `ok. ${pln(r.dzienna)} za każdy dzień zwolnienia`,
        szczegoly: [["Podstawa zasiłku", `${pln(podM)} miesięcznie`], ...(r.dniPracodawca > 0 ? [["Płaci pracodawca", `pierwsze ${r.dniPracodawca} dni: ${pln(r.kwotaPracodawca)}`] as [string, string]] : []), ["Płaci ZUS", r.dniZUS > 0 ? `${r.dniZUS} dni: ${pln(r.kwotaZUS)}` : "w tym okresie nic – zasiłek płaci pracodawca"]],
        ostrzezenia: r.ostrzezenia,
        zrob: kroki("F01").map((t) => ({ tekst: t })), druki: f?.druki, status: f?.status, nastepne: ["wniosek-zasilek"],
        jakLiczono: [`Podstawa ${pln(podM)} × 100% ÷ 30 dni = ${pln(r.dzienna)} za dzień.`, "W ciąży zasiłek chorobowy to 100% podstawy (poza ciążą byłoby 80%)."],
      };
    },
  },

  /* ---- 3. Wniosek o zasiłek (ZAM) ---- */
  {
    id: "wniosek-zasilek", tytul: "Złożyć wniosek o zasiłek po porodzie", krotko: "Ile dostaniesz, kiedy złożyć wniosek i co wpisać w druku ZAM", ikona: "📄", czas: "5 pytań · 3 min",
    slowa: "zasiłek macierzyński wniosek zam po porodzie ile dostanę pieniądze kwota 81,5 100% 70% urlop rodzicielski macierzyński wypłata druk", faq: ["F07", "F08", "F09", "F17", "F18"],
    pytania: [
      pDataPorodu, pDzieci, pZatrudnienie, pPodstawaZUS("M"), pBrutto("M"),
      { id: "platnik", typ: "wybor", tekst: "Ilu pracowników zatrudnia Twój pracodawca?", warunek: (o) => o.zatrudnienie === "umowa",
        opcje: [{ v: "duzy", label: "Więcej niż 20 osób" }, { v: "maly", label: "20 osób lub mniej (albo nie wiem)" }],
        domyslne: (c) => (c.liczbaUbezpieczonychPlatnika === undefined ? undefined : c.liczbaUbezpieczonychPlatnika > 20 ? "duzy" : "maly"), etykietaDanych: "Wielkość pracodawcy",
        poCo: "Od tego zależy, gdzie złożysz wniosek: u pracodawcy (powyżej 20 osób) czy w ZUS.", skad: "Zapytaj w kadrach." },
      { id: "wariant", typ: "wybor", tekst: "Jak chcesz dostawać pieniądze?",
        opcje: [{ v: "zmienny", label: "Standardowo", opis: "Wyższa kwota na początku (100%), niższa potem (70%)" }, { v: "usredniony", label: "Stała kwota przez cały czas (81,5%)", opis: "Wniosek trzeba złożyć w ciągu 21 dni po porodzie" }, { v: "nie_wiem", label: "Nie wiem – pokażcie różnicę", opis: "Policzymy oba warianty" }],
        poCo: "To jedno zaznaczone pole we wniosku. Pokażemy, ile różnią się obie opcje.", skad: "Nie musisz tego wiedzieć teraz – wybierz „Nie wiem” i porównaj." },
    ],
    async licz(o, c, api) {
      const podM = await podstawaDla(api, o, "M");
      const { baza, limit, matkaMax } = await bazaPlanu(api, o, podM);
      const wejscie = { ...baza, rodzicielski: [{ kto: "matka", tygodnie: matkaMax }] };
      const wyn = await api("/api/oblicz/plan", wejscie);
      const { wariant, ...bez } = wejscie;
      const por = await api("/api/oblicz/porownanie", bez);
      const term = await api("/api/oblicz/terminy", { wejscie });
      zapiszPlan(wejscie);
      const par = await api("/api/parametry");
      const okr = wyn.okresy.filter((x: any) => x.kwota > 0);
      const mac = okr.find((x: any) => x.rodzaj === "macierzynski");
      const rod = okr.find((x: any) => x.rodzaj === "rodzicielski");
      const t815 = dodajDni(o.dataPorodu, par.terminy_dni.wniosek_pelny_wymiar_81_5_po_porodzie);
      const uzywa815 = o.wariant === "usredniony";
      const adresat = o.zatrudnienie === "umowa" && o.platnik === "duzy" ? "pracodawcy" : "ZUS";
      const roz = por.roznicaRazem as number;
      const ost = [...wyn.bledy, ...wyn.ostrzezenia, `Z ${tygodnie(limit)} urlopu rodzicielskiego ${tygodnie(limit - matkaMax)} przysługuje wyłącznie drugiemu rodzicowi i nie można ich wziąć. Tutaj liczymy Twoje ${tygodnie(matkaMax)}. Jeśli drugi rodzic też weźmie urlop, sprawdź „Podzielić urlop z partnerem”.`];
      if (o.wariant === "nie_wiem" || uzywa815) ost.push(roz >= 0 ? `Wariant 81,5% daje łącznie ${pln(roz)} więcej niż standardowy. Wniosek trzeba złożyć najpóźniej ${dataPL(t815)}.` : `Wariant 81,5% dałby łącznie ${pln(-roz)} mniej niż standardowy, więc zwykle nie ma powodu go wybierać.`);
      const zrob: Wynik["zrob"] = [
        { kiedy: uzywa815 || (o.wariant === "nie_wiem" && roz > 0) ? `do ${dataPL(t815)}` : "po porodzie", tekst: `Złóż wniosek ZAM do ${adresat}.`, uwaga: uzywa815 ? "To termin nieprzekraczalny dla wariantu 81,5%." : undefined },
        { tekst: "Dołącz dokumenty z listy w poradniku (m.in. akt urodzenia lub zaświadczenie lekarskie).", uwaga: "Pełna lista: pytanie „Jakie dokumenty muszę dołączyć?”." },
        { kiedy: `do ${par.terminy_dni.zasilek_wyplata_po_wyjasnieniu_okolicznosci_max} dni`, tekst: "Tyle najwyżej czeka się na wypłatę po wyjaśnieniu wszystkich okoliczności." },
      ];
      const sciagaWiersze: [string, string, string][] = [
        ["Dane wnioskodawcy", `${c.osoba ?? "Twoje imię i nazwisko"}, PESEL ${c.pesel ?? "…"}`, "Dowód osobisty"],
        ["Data urodzenia dziecka", dataKrotka(o.dataPorodu), "Akt urodzenia (albo termin z karty ciąży przed porodem)"],
        ["Za jaki okres wnioskujesz", [mac && `urlop macierzyński: ${dataKrotka(mac.od)} – ${dataKrotka(mac.do)}`, rod && `urlop rodzicielski: ${dataKrotka(rod.od)} – ${dataKrotka(rod.do)}`].filter(Boolean).join("; "), "Wynika z Twojego planu (tabela wyżej)"],
        ["Pełny wymiar (81,5%)", uzywa815 ? "☑ zaznacz pole" : o.wariant === "nie_wiem" ? "zaznacz tylko jeśli wybierzesz stałą kwotę" : "nie zaznaczaj", "Zaznaczasz, gdy chcesz stałą kwotę 81,5% przez cały okres"],
        ["Do kogo składasz", adresat === "ZUS" ? "Zakład Ubezpieczeń Społecznych" : "Pracodawca (płatnik zasiłku)", "Pracodawca zgłaszający powyżej 20 osób sam wypłaca zasiłek"],
        ...(o.zatrudnienie === "dzialalnosc" ? [["Ubezpieczenie chorobowe", "TAK (dobrowolne)", "Zgłoszenie do ZUS"] as [string, string, string]] : []),
      ];
      return {
        glowne: `Za cały urlop dostaniesz ok. ${pln(wyn.sumy.razem)} (macierzyński ${tygodnie(wyn.wymiary.macierzynskiTyg)} i rodzicielski ${tygodnie(matkaMax)}).`,
        duza: pln(wyn.sumy.razem), podpis: mac ? `Pierwsze ${tygodnie(wyn.wymiary.macierzynskiTyg)}: ok. ${pln(miesiecznie(mac))} miesięcznie` : undefined,
        szczegoly: [["Urlop macierzyński", mac ? `${dataPL(mac.od)} – ${dataPL(mac.do)}` : "—"], ["Urlop rodzicielski", rod ? `${dataPL(rod.od)} – ${dataPL(rod.do)}` : "—"], ["Podstawa zasiłku", `${pln(podM)} miesięcznie`], ["Wariant", uzywa815 ? "stała kwota 81,5%" : "standardowy (100% / 70%)"]],
        ostrzezenia: ost, terminy: terminyDlaRodzica(term), zrob, sciaga: { tytul: "Ściąga: co wpisać w druku ZAM", wiersze: sciagaWiersze, uwaga: "Nazwy pól mogą się nieznacznie różnić od aktualnego druku – sprawdź wzór na zus.pl." },
        druki: ["ZAM", ...(o.zatrudnienie === "umowa" ? ["Z-3"] : o.zatrudnienie === "zlecenie" ? ["Z-3a"] : [])], status: "ok",
        linki: [{ href: "/wnioski", etykieta: "Wypełnij wniosek do wydruku" }, LINK_KALK], nastepne: ["urlop-pracodawca", "podzial-urlopu"],
        jakLiczono: wyn.kroki,
        tabela: { kolumny: ["Rodzaj", "Od – do", "Dni", "Kwota"], wiersze: okr.map((x: any) => [RODZAJE[x.rodzaj] ?? x.rodzaj, `${dataKrotka(x.od)} – ${dataKrotka(x.do)}`, String(x.dni), pln(x.kwota)]) },
      };
    },
  },

  /* ---- 4. Urlop u pracodawcy ---- */
  {
    id: "urlop-pracodawca", tytul: "Poprosić pracodawcę o urlop", krotko: "Gotowy tekst wniosku i termin, do kiedy go złożyć", ikona: "🏢", czas: "5 pytań · 3 min",
    slowa: "urlop wniosek pracodawca macierzyński rodzicielski ojcowski uzupełniający szef kadry pismo", faq: ["F12", "F14", "F13"],
    pytania: [
      { id: "rodzaj", typ: "wybor", tekst: "O jaki urlop prosisz?",
        opcje: [{ v: "macierzynski", label: "Macierzyński", opis: "Pierwsze tygodnie po porodzie (dla mamy)" }, { v: "rodzicielski", label: "Rodzicielski", opis: "Po macierzyńskim, dla mamy lub taty" }, { v: "ojcowski", label: "Ojcowski", opis: "Dla taty, do 2 tygodni" }, { v: "uzupelniajacy", label: "Uzupełniający", opis: "Gdy dziecko długo leży w szpitalu" }],
        poCo: "Każdy urlop ma inny termin złożenia wniosku." },
      { id: "od", typ: "data", tekst: "Od kiedy chcesz urlop?", poCo: "Od tej daty liczymy termin złożenia wniosku." },
      { id: "do", typ: "data", tekst: "Do kiedy chcesz urlop?", poCo: "Dzięki temu wniosek ma pełny okres." },
      { id: "dziecko", typ: "data", tekst: "Kiedy urodziło się dziecko (albo jaki jest planowany termin porodu)?", domyslne: (c) => c.dataPorodu, etykietaDanych: "Data porodu", poCo: "Pracodawca potrzebuje daty, żeby powiązać urlop z dzieckiem.", skad: "Akt urodzenia lub karta ciąży." },
      { id: "czesc", typ: "wybor", tekst: "Która to część urlopu rodzicielskiego?", warunek: (o) => o.rodzaj === "rodzicielski",
        opcje: [{ v: "1", label: "Pierwsza" }, { v: "2", label: "Druga" }, { v: "3", label: "Trzecia" }, { v: "4", label: "Czwarta" }, { v: "5", label: "Piąta (ostatnia)" }],
        poCo: "Urlop rodzicielski można podzielić najwyżej na 5 części. Pracodawca musi wiedzieć, którą wykorzystujesz.", skad: "Jeśli to Twój pierwszy wniosek – wybierz „Pierwsza”." },
      { id: "imie", typ: "tekst", tekst: "Jak się nazywasz?", domyslne: (c) => c.osoba, etykietaDanych: "Imię i nazwisko", poCo: "Wpiszemy to do wniosku.", przyklad: "np. Anna Kowalska" },
      { id: "pracodawca", typ: "tekst", tekst: "Jak nazywa się Twój pracodawca?", domyslne: (c) => c.platnik, etykietaDanych: "Pracodawca", poCo: "Wpiszemy to jako adresata wniosku.", skad: "Z umowy o pracę." },
    ],
    async licz(o, c, api) {
      const par = await api("/api/parametry");
      const T = par.terminy_dni;
      const dni = o.rodzaj === "rodzicielski" ? T.wniosek_urlop_rodzicielski_przed_startem : o.rodzaj === "ojcowski" ? T.wniosek_urlop_ojcowski_przed_startem : 0;
      const nazwa: Record<string, string> = { macierzynski: "urlopu macierzyńskiego", rodzicielski: "urlopu rodzicielskiego", ojcowski: "urlopu ojcowskiego", uzupelniajacy: "uzupełniającego urlopu macierzyńskiego" };
      const termin = dni ? dodajDni(o.od, -dni) : "";
      const tresc = `${dataPL(dzis())}\n\n${o.imie}\n\n${o.pracodawca}\n\nWniosek o udzielenie ${nazwa[o.rodzaj]}\n\nWnoszę o udzielenie mi ${nazwa[o.rodzaj]} w okresie od ${dataPL(o.od)} do ${dataPL(o.do)}${o.rodzaj === "rodzicielski" ? ` (część ${o.czesc} z maksymalnie 5)` : ""}. Dotyczy dziecka urodzonego (planowana data porodu) w dniu ${dataPL(o.dziecko)}.\n\n…………………………\n(podpis)`;
      const ost: string[] = [];
      if (termin && termin < dzis()) ost.push(`Termin ${dataPL(termin)} już minął. Złóż wniosek jak najszybciej i zapytaj pracodawcę, czy uwzględni krótszy termin.`);
      return {
        glowne: dni ? `Wniosek o ${nazwa[o.rodzaj].replace("urlopu", "urlop")} złóż najpóźniej ${dataPL(termin)} (${zaIle(termin)}).` : `Poniżej masz gotowy wniosek o ${nazwa[o.rodzaj].replace("urlopu", "urlop")}.`,
        tekstDoKopii: { tytul: "Gotowy tekst wniosku", tresc }, ostrzezenia: ost,
        szczegoly: [["Okres urlopu", `${dataPL(o.od)} – ${dataPL(o.do)}`], ["Do kogo", o.pracodawca], ...(dni ? [["Termin złożenia", `co najmniej ${dni} dni przed startem (${dataPL(termin)})`] as [string, string]] : [])],
        terminy: termin ? [{ co: `Złożenie wniosku o ${nazwa[o.rodzaj].replace("urlopu", "urlop")}`, do: termin }] : undefined,
        zrob: [{ kiedy: termin ? `do ${dataPL(termin)}` : undefined, tekst: "Skopiuj lub wydrukuj wniosek, podpisz i złóż pracodawcy." }, { tekst: "Zachowaj kopię z datą złożenia." }],
        linki: [{ href: "/wnioski", etykieta: "Wydrukuj wniosek jako PDF" }], status: "ok", nastepne: ["wniosek-zasilek"],
      };
    },
  },

  /* ---- 5. Podział urlopu ---- */
  {
    id: "podzial-urlopu", tytul: "Podzielić urlop z partnerem", krotko: "Porównanie trzech podziałów: kto ile weźmie i ile to wyniesie", ikona: "👨‍👩‍👧", czas: "5 pytań · 3 min",
    slowa: "podział urlopu partner tata ojciec mąż mama oboje rodzice rodzicielski ile wyniesie porównanie dzielić", faq: ["F11", "F12", "F14"],
    pytania: [
      pDataPorodu, pDzieci, pPodstawaZUS("M"), pBrutto("M"), pPodstawaZUS("O"), pBrutto("O"),
      { id: "ojcowski", typ: "tak_nie", tekst: "Czy tata weźmie też urlop ojcowski (2 tygodnie)?", poCo: "Urlop ojcowski jest dodatkowy – nie odbiera nic z urlopu rodzicielskiego.", skad: "Możecie zmienić to później." },
    ],
    async licz(o, c, api) {
      const podM = await podstawaDla(api, o, "M"), podO = await podstawaDla(api, o, "O");
      const { baza, limit, matkaMax } = await bazaPlanu(api, o, podM, { podstawy: { matka: podM, ojciec: podO } });
      const oj = o.ojcowski === "tak" ? { ojcowski: [{ od: o.dataPorodu, dni: 14 }] } : {};
      const opcje = [
        { nazwa: `Mama bierze ${matkaMax} tyg. (maksimum), tata nic`, m: matkaMax, t: 0 },
        { nazwa: `Tata bierze 9 tyg. (minimum), mama ${matkaMax} tyg.`, m: matkaMax, t: Math.min(9, limit) },
        { nazwa: "Pół na pół", m: Math.ceil(limit / 2), t: Math.floor(limit / 2) },
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
        tabela: { kolumny: ["Podział", "Mama", "Tata", "Razem"], wiersze: wyniki.map((x) => [x.op.nazwa, pln(x.r.sumy.matka), pln(x.r.sumy.ojciec), pln(x.r.sumy.razem)]),
          uwaga: `Rodzicielski do podziału: ${tygodnie(limit)}. Każdemu z rodziców przysługuje 9 tygodni tylko dla niego. Pieniądze to nie jedyne kryterium – wybierzcie to, co pasuje Waszej rodzinie.` },
        ostrzezenia: [...new Set(wyniki.flatMap((x) => [...(x.r.bledy as string[]), ...(x.r.ostrzezenia as string[])]))],
        terminy: terminyDlaRodzica(t),
        zrob: [{ tekst: "Ustalcie podział razem – można go jeszcze zmieniać." }, { tekst: "Mama i tata składają osobne wnioski o urlop do swoich pracodawców.", uwaga: "Wniosek o urlop rodzicielski: najpóźniej 21 dni przed startem." }, { tekst: "Mama składa wniosek ZAM o zasiłek (tata – swój po urlopie rodzicielskim)." }],
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
      pDataPorodu, pPodstawaZUS("M"), pBrutto("M"),
      { id: "tygPraca", typ: "liczba", tekst: "Ile tygodni urlopu rodzicielskiego chcesz połączyć z pracą?", jednostka: "tygodni", min: 1, max: 41, przyklad: "np. 20", poCo: "Przez tyle tygodni będziesz pracować, a pensję dostaniesz od pracodawcy, a część zasiłku od ZUS.", skad: "Pomyśl, na jak długo chcesz wrócić do pracy." },
      { id: "etat", typ: "wybor", tekst: "Na jaką część etatu wrócisz?", opcje: [{ v: "0.5", label: "Połowa etatu" }, { v: "0.4", label: "Dwie piąte etatu" }, { v: "0.25", label: "Jedna czwarta etatu" }], poCo: "Można pracować najwyżej na pół etatu. Im mniej pracujesz, tym większą część zasiłku zachowujesz.", skad: "Ustalasz z pracodawcą." },
    ],
    async licz(o, c, api) {
      const podM = await podstawaDla(api, o, "M");
      const { baza, matkaMax } = await bazaPlanu(api, o, podM);
      const T = Math.min(num(o.tygPraca), matkaMax);
      const bez = { ...baza, rodzicielski: [{ kto: "matka", tygodnie: matkaMax }] };
      const z = { ...baza, rodzicielski: [...(matkaMax - T > 0 ? [{ kto: "matka", tygodnie: matkaMax - T }] : []), { kto: "matka", tygodnie: T, wspolczynnikPracy: num(o.etat) }] };
      const [rBez, rZ] = [await api("/api/oblicz/plan", bez), await api("/api/oblicz/plan", z)];
      zapiszPlan(z);
      const par = await api("/api/parametry");
      const dniPrzed = par.terminy_dni.wniosek_laczenie_z_praca_przed_startem;
      const kPo = koniec(rBez.okresy), kZ = koniec(rZ.okresy);
      const roz = rBez.sumy.razem - rZ.sumy.razem;
      const mBez = miesiecznie(rBez.okresy.find((x: any) => x.rodzaj === "rodzicielski"));
      const okPraca = rZ.okresy.find((x: any) => x.rodzaj === "rodzicielski" && x.wspolczynnikZasilku !== undefined && x.wspolczynnikZasilku < 1);
      const mPraca = miesiecznie(okPraca);
      const etatTxt = Number(o.etat) === 0.5 ? "pół etatu" : `${o.etat} etatu`;
      return {
        glowne: `Przy pracy na ${etatTxt} przez ${tygodnie(T)} urlop potrwa do ${dataPL(kZ)} (zamiast do ${dataPL(kPo)}). ${Math.abs(roz) < 1 ? "Łączna kwota zasiłku wychodzi tak samo, tylko rozłożona na dłuższy czas." : roz > 0 ? `Zasiłek łącznie będzie niższy o ${pln(roz)}.` : `Zasiłek łącznie będzie wyższy o ${pln(-roz)}.`}`,
        ...(mPraca > 0 ? { podpis: `W czasie pracy zasiłek miesięczny to ok. ${pln(mPraca)} (bez pracy: ok. ${pln(mBez)}).` } : {}),
        tabela: { kolumny: ["", "Bez pracy", "Z pracą"], wiersze: [["Zasiłek łącznie", pln(rBez.sumy.razem), pln(rZ.sumy.razem)], ["Urlop kończy się", dataPL(kPo), dataPL(kZ)]], uwaga: "Pensję za pracę dostajesz od pracodawcy – nie jest wliczona w powyższe kwoty." },
        ostrzezenia: [...new Set([...(rZ.ostrzezenia as string[]), ...(rZ.bledy as string[])])],
        zrob: [{ kiedy: `co najmniej ${dniPrzed} dni przed startem pracy`, tekst: "Złóż pracodawcy wniosek o łączenie urlopu z pracą." }, { tekst: `Pracodawca może odmówić, jeśli nie da się tego pogodzić z organizacją pracy – odpowie w ciągu ${par.terminy_dni.odmowa_laczenia_z_praca_odpowiedz_pracodawcy} dni.` }],
        linki: [{ href: "/wnioski", etykieta: "Przygotuj wniosek o łączenie z pracą" }, LINK_KALK], status: "ok", nastepne: ["urlop-pracodawca"], jakLiczono: rZ.kroki,
      };
    },
  },

  /* ---- 7. Adopcja ---- */
  {
    id: "adopcja", tytul: "Adopcja lub rodzina zastępcza", krotko: "Urlop na warunkach macierzyńskiego, zasiłek i terminy po przyjęciu dziecka", ikona: "🧸", czas: "5 pytań · 3 min",
    slowa: "adopcja przysposobienie rodzina zastępcza przyjęcie dziecka na wychowanie urlop zasiłek sąd opiekuńczy", faq: ["F23", "F18"],
    pytania: [
      { id: "rodzajAdopcji", typ: "wybor", tekst: "Co się u Was dzieje?", opcje: [{ v: "przysposobienie", label: "Adoptujemy dziecko", opis: "Dziecko u nas jest, wniosek w sądzie złożony" }, { v: "rodzina_zastepcza", label: "Zostajemy rodziną zastępczą", opis: "Niezawodową" }], domyslne: (c) => (c.adopcja ? "przysposobienie" : undefined), etykietaDanych: "Rodzaj sprawy", poCo: "Od tego zależy limit wieku dziecka (14 lat przy adopcji, 7 lat – 10 po odroczeniu szkoły – przy rodzinie zastępczej).", skad: "Z postanowienia sądu albo umowy ze starostą." },
      { id: "dataPorodu", typ: "data", tekst: "Kiedy dziecko trafiło do Waszej rodziny?", domyslne: (c) => c.dataPorodu, etykietaDanych: "Data przyjęcia dziecka", poCo: "Od tej daty liczymy urlop i terminy.", skad: "Z dokumentu o przyjęciu dziecka na wychowanie." },
      { id: "dataUr", typ: "data", tekst: "Kiedy urodziło się dziecko?", poCo: "Urlop trwa nie dłużej niż do ukończenia przez dziecko limitu wieku.", skad: "Akt urodzenia dziecka." },
      pDzieci, pPodstawaZUS("M"), pBrutto("M"),
    ],
    async licz(o, c, api) {
      const podM = await podstawaDla(api, o, "M");
      const lat = o.rodzajAdopcji === "przysposobienie" ? 14 : 7;
      const d = new Date(o.dataUr + "T00:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() + lat);
      const granica = d.toISOString().slice(0, 10);
      const { baza, matkaMax } = await bazaPlanu(api, o, podM, { tytul: o.rodzajAdopcji, wiekGranicyDzieckaData: granica });
      const w = { ...baza, rodzicielski: [{ kto: "matka", tygodnie: matkaMax }] };
      const wyn = await api("/api/oblicz/plan", w);
      const t = await api("/api/oblicz/terminy", { wejscie: w });
      zapiszPlan(w);
      const f = pyt("F23");
      const mac = wyn.okresy.find((x: any) => x.rodzaj === "na_warunkach_macierzynskiego" || x.rodzaj === "macierzynski");
      return {
        glowne: `Za urlop na warunkach macierzyńskiego i rodzicielski dostaniesz łącznie ok. ${pln(wyn.sumy.razem)}.`, duza: pln(wyn.sumy.razem), podpis: mac ? `Pierwszy okres: ok. ${pln(miesiecznie(mac))} miesięcznie` : undefined,
        szczegoly: [["Limit wieku dziecka", `do ${dataPL(granica)} (${lat} lat)`], ["Podstawa zasiłku", `${pln(podM)} miesięcznie`]],
        ostrzezenia: [...wyn.bledy, ...wyn.ostrzezenia], terminy: terminyDlaRodzica(t),
        zrob: [...kroki("F23").map((x) => ({ tekst: x })), ...terminyDlaRodzica(t).slice(0, 2).map((x) => ({ kiedy: `do ${dataPL(x.do)}`, tekst: x.co }))],
        druki: f?.druki, status: f?.status, linki: [LINK_KALK], jakLiczono: wyn.kroki,
      };
    },
  },

  /* ---- 8. Trudna sytuacja ---- */
  {
    id: "trudna-sytuacja", tytul: "Trudna sytuacja: strata, wcześniak, śmierć matki", krotko: "Co przysługuje i gdzie szukać pomocy. Bez pośpiechu", ikona: "🕊️", czas: "1 pytanie · 1 min",
    slowa: "strata martwe urodzenie poronienie zgon śmierć dziecka wcześniak szpital żałoba trudna sytuacja choroba matka zmarła wsparcie psycholog", faq: ["F24", "F15", "F25", "F26"],
    pytania: [
      { id: "sytuacja", typ: "wybor", tekst: "Co się stało? Wybierz to, co najbliższe.", opcje: [{ v: "martwe", label: "Dziecko urodziło się martwe lub zmarło" }, { v: "wczesniak", label: "Dziecko urodziło się za wcześnie albo jest w szpitalu" }, { v: "zgon", label: "Mama dziecka zmarła lub nie może się nim zająć" }, { v: "wsparcie", label: "Potrzebuję z kimś porozmawiać" }], poCo: "Dobierzemy informacje do Twojej sytuacji. Nie musisz niczego załatwiać od razu." },
    ],
    async licz(o) {
      const mapa: Record<string, string> = { martwe: "F24", wczesniak: "F15", zgon: "F25", wsparcie: "F26" };
      const f = pyt(mapa[o.sytuacja]);
      const org = WSPARCIE.filter((w) => o.sytuacja === "wsparcie" || w.dla.includes(o.sytuacja === "zgon" ? "zgon" : o.sytuacja));
      return {
        lagodny: true, glowne: "Bardzo nam przykro. Nie musisz niczego załatwiać dziś – poniżej zebraliśmy to, co ważne, i miejsca, gdzie można znaleźć wsparcie.",
        info: [...(f ? [{ tytul: "Co Ci przysługuje", tresc: f.odpowiedz }] : []), ...(org.length ? [{ tytul: "Organizacje, które mogą pomóc", tresc: org.map((x) => `• ${x.nazwa}: ${x.opis}`).join("\n") + `\n\n${WSPARCIE_UWAGA}` }] : [])],
        zrob: [...(f ? kroki(f.id).map((t) => ({ tekst: t })) : []), { tekst: "Gdy będziesz gotowa – wróć tu. Zasiłek można wnioskować później." }],
        druki: f?.druki, status: f?.status, linki: [{ href: "/kalkulator?tryb=matka", etykieta: "Policz zasiłek, gdy będziesz gotowa" }],
      };
    },
  },

  /* ---- 9. Terminy ---- */
  {
    id: "terminy", tytul: "Sprawdzić terminy, których nie mogę przegapić", krotko: "Lista dat: do kiedy złożyć które wnioski", ikona: "⏰", czas: "2 pytania · 1 min",
    slowa: "termin kiedy do kiedy nie przegapić 21 dni przedawnienie ryzyko stracić wniosek data", faq: ["F19", "F09"],
    pytania: [
      { id: "rodzajZdarzenia", typ: "wybor", tekst: "Czego dotyczy Twoja sytuacja?", opcje: [{ v: "porod", label: "Poród (urodzenie dziecka)" }, { v: "przysposobienie", label: "Adopcja" }, { v: "rodzina_zastepcza", label: "Rodzina zastępcza" }], poCo: "Dla każdej sytuacji obowiązują inne terminy." },
      { id: "dataPorodu", typ: "data", tekst: "Podaj datę porodu albo przyjęcia dziecka do rodziny.", domyslne: (c) => c.dataPorodu, etykietaDanych: "Data zdarzenia", poCo: "Od tej daty liczymy terminy.", skad: "Akt urodzenia lub karta ciąży (termin porodu)." },
    ],
    async licz(o, c, api) {
      const plan = { tytul: o.rodzajZdarzenia, dataZdarzenia: o.dataPorodu, liczbaDzieci: 1, wariant: "zmienny_100_70", podstawy: { matka: 5000 }, rodzicielski: [{ kto: "matka", tygodnie: 32 }] };
      const t = await api("/api/oblicz/terminy", { wejscie: plan });
      const lista = terminyDlaRodzica(t).filter((x) => !/urlop rodzicielski|ojcowski/.test(x.co));
      const przy = t.filter((x: any) => /Przedawnienie/.test(x.co)).sort((a: any, b: any) => a.do.localeCompare(b.do)).slice(0, 1);
      const wszystkie = [...lista, ...przy.map((x: any) => ({ co: "Przedawnienie roszczenia o zasiłek: po tej dacie można już nie dostać pieniędzy (dla pierwszego okresu)", do: x.do }))].sort((a, b) => a.do.localeCompare(b.do));
      const bliski = wszystkie.find((x) => x.do >= dzis());
      return {
        glowne: bliski ? `Najbliższy termin: ${bliski.co} – do ${dataPL(bliski.do)} (${zaIle(bliski.do)}).` : "Wszystkie główne terminy dla tej daty już minęły. Złóż wnioski jak najszybciej.",
        terminy: wszystkie, zrob: [{ tekst: "Wpisz najważniejsze daty do kalendarza w telefonie." }, { tekst: "W razie wątpliwości zapytaj ZUS (symulacja PUE → Zadaj pytanie)." }],
        linki: [{ href: "/pue", etykieta: "Zadaj pytanie w ZUS" }], status: "ok", nastepne: ["wniosek-zasilek", "urlop-pracodawca"],
        ostrzezenia: ["Terminy wniosków o urlop rodzicielski i ojcowski zależą od wybranej daty startu – poznasz je w sprawach „Podzielić urlop” i „Poprosić pracodawcę o urlop”."],
      };
    },
  },

  /* ---- 10. Odpis aktu urodzenia ---- */
  {
    id: "odpis-aktu", tytul: "Zdobyć odpis aktu urodzenia", krotko: "Gdzie i jak, i czy w ogóle jest potrzebny", ikona: "🪪", czas: "bez pytań · 1 min",
    slowa: "odpis akt urodzenia usc urząd stanu cywilnego dokument dziecka", faq: ["F27"], pytania: [],
    async licz() {
      const f = pyt("F27");
      return { glowne: "Odpis aktu urodzenia dostaniesz w urzędzie stanu cywilnego.", info: f ? [{ tytul: "Co warto wiedzieć", tresc: f.odpowiedz }] : [], zrob: kroki("F27").map((t) => ({ tekst: t })), linki: [{ href: "/odpis", etykieta: "Złóż wniosek o odpis (symulacja)" }], status: f?.status };
    },
  },
];

export const sprawa = (id: string) => SPRAWY.find((s) => s.id === id);

export const TOP: Record<Moment, { tytul: string; ids: string[] }> = {
  plan: { tytul: "Planuję dziecko", ids: ["co-przysluguje", "wniosek-zasilek", "podzial-urlopu"] },
  ciaza: { tytul: "Jestem w ciąży", ids: ["zwolnienie-ciaza", "wniosek-zasilek", "podzial-urlopu"] },
  dziecko: { tytul: "Dziecko już jest", ids: ["wniosek-zasilek", "urlop-pracodawca", "podzial-urlopu"] },
};

/** Pytanie → odpowiedź o tytule sprawy, gdy opcja odpowiedzi to etykieta z pytania. */
export const etykietaOdp = (q: Pyt, v: any): string => (q.typ === "wybor" ? (q.opcje?.find((x) => x.v === String(v))?.label ?? String(v)) : q.typ === "tak_nie" ? (v === "tak" ? "Tak" : "Nie") : q.typ === "data" ? dataPL(v) : q.typ === "liczba" ? `${v}${q.jednostka ? " " + q.jednostka : ""}` : String(v));

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
  try {
    const [u, e, z, sc] = await Promise.all([
      api(`/api/zus/ubezpieczenie?pesel=${sesja.pesel}&naDzien=${naDzien}`), api(`/api/zus/ezla?pesel=${sesja.pesel}`), api(`/api/zus/zadluzenie?pesel=${sesja.pesel}&naDzien=${naDzien}`), api("/api/scenariusze"),
    ]);
    const ub = u.ubezpieczenie[u.ubezpieczenie.length - 1];
    c.tytul = ub?.tytul; c.platnik = ub?.platnik?.nazwa; c.liczbaUbezpieczonychPlatnika = ub?.platnik?.liczbaUbezpieczonych;
    c.dniUbezpieczenia = u.dniNieprzerwanegoUbezpieczeniaChorobowego || undefined; c.zadluzenie = z.kwotaZadluzenia; c.ezlaDni = e.lacznieDni || undefined;
    const id = sesja.personaId.replace(/[ab]$/, "");
    const w = sc.przypadki?.find((x: any) => x.id === id)?.wejscie;
    if (w?.dataZdarzenia) {
      c.dataPorodu = w.dataZdarzenia; c.liczbaDzieci = w.liczbaDzieci; c.podstawaM = w.podstawy?.matka; c.podstawaO = w.podstawy?.ojciec; c.adopcja = w.tytul && w.tytul !== "porod";
      if (u.ubezpieczonaWDniu !== undefined) c.wDniuPorodu = u.ubezpieczonaWDniu;
    }
  } catch { /* dane opcjonalne */ }
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
