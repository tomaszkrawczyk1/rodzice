// =====================================================================
// kalendarz.ts — Moduł medyczny, ETAP 1: oś czasu ciąży i połogu
// Zero zależności, funkcja czysta. Treść (wizyty, badania, terminy) pochodzi WYŁĄCZNIE
// z data/kalendarz_medyczny.json — w kodzie nie ma żadnej wartości medycznej.
//
// Wejście: termin porodu (TP) i opcjonalnie rzeczywista data porodu.
// Wyjście: lista wydarzeń z oknami dat (od–do), posortowana chronologicznie.
//
// Konwencje:
//  - Początek ciąży (1. dzień ostatniej miesiączki) = TP − 280 dni (reguła Naegelego, TP = 40+0 tc).
//  - Tydzień ciąży zapisujemy jak w medycynie: "11+0" = 11 tygodni i 0 dni = początek + 7*11 + 0 dni.
//  - Wydarzenia "po_porodzie" liczone od rzeczywistej daty porodu; gdy jej nie ma — od TP
//    i oznaczane `szacunkowe: true` (UI ma wtedy pokazać „orientacyjnie”).
//  - Dzień porodu = dzień 0.
// =====================================================================
import { dniMiedzy, dodajDni, dodajMiesiace, planZasilku, terminy, type Parametry, type PlanWejscie } from "../engine/kalkulator.ts";

export type Grupa = "przed_porodem" | "po_porodzie";
/** Etap na osi: 1–3 = trymestry ciąży, "polog" = po porodzie (mama i noworodek), "niemowle" = 1. rok życia dziecka. */
export type Trymestr = 1 | 2 | 3 | "polog" | "niemowle";
export const KOLEJNOSC_TRYMESTROW: Trymestr[] = [1, 2, 3, "polog", "niemowle"];
const jestPoPorodzie = (t: Trymestr) => t === "polog" || t === "niemowle";

/** Okno przed porodem: tygodnie ciąży "N+D" (np. "11+0"); `do` może być "porod" (do dnia porodu). */
export interface OknoTc { typ: "tc"; od: string; do: string; najpozniej?: string /* twardy termin, np. "12+0" */ }
/**
 * Okno po porodzie: liczba jednostek od kotwicy (domyślnie dzień porodu; "wypis" = dzień wypisu ze szpitala).
 * `do` może być "wypis" (do dnia wypisu). `bezOstatniegoDnia`: granica `do` jest wyłączona (kończymy dzień wcześniej) —
 * pozwala zapisać „6.–9. tydzień życia” jako od 6 do 10 tygodni i „3.–4. miesiąc” jako od 3 do 5 miesięcy.
 */
export interface OknoPo { typ: "po_porodzie"; jednostka: "dni" | "tygodnie" | "miesiace"; od: number; do: number | "wypis"; kotwica?: "porod" | "wypis"; bezOstatniegoDnia?: boolean }

export interface WpisKalendarza {
  id: string;
  nazwa: string;
  grupa: Grupa;
  kategoria: string;        // np. wizyta, usg, badanie_prenatalne, test_glukozy, szkola_rodzenia,
                            // wizyta_patronazowa, badanie_poporodowe, bilans, szczepienie
  okno: OknoTc | OknoPo;
  trymestr?: Trymestr;      // podaje dane (nie liczymy z dat — granice trymestrów to treść medyczna)
  dla?: "matka" | "dziecko"; // kogo dotyczy (głównie po porodzie); brak = osoba w ciąży / oboje
  kiedy?: string;           // termin zwykłym językiem, np. "do 10. tygodnia ciąży" (to widzi użytkownik)
  czestotliwosc?: string;   // dla wizyt cyklicznych, np. "co ok. 4 tygodnie" (okno obejmuje cały etap)
  typ?: "standard" | "warunkowe";  // domyślnie standard; warunkowe = tylko gdy spełniony `warunek`
  warunek?: string;         // opis kiedy dotyczy (opcjonalny, dla człowieka)
  warunki?: string[];       // id z `baza.warunki` — wpis typu "warunkowe" pokazuje się, gdy zaznaczono którykolwiek
  skutek?: string;          // krótko: co się stanie, jeśli tego nie zrobisz
  pozycje?: string[];       // co obejmuje wizyta/badanie (lista)
  uwagi?: string[];         // modyfikacje i dodatkowe zasady
  opis?: string;
  zrodlo: string;           // podstawa (rozporządzenie / standard / program) — wymagane
  status?: "ok" | "do_potwierdzenia";
}

/** Treść bez dat (profilaktyka, wyjaśnienia) — pokazywana przy trymestrze albo osobno. */
export interface Informacja { id: string; temat: string; rodzaj?: "ogolna" | "sytuacja_szczegolna"; trymestr?: Trymestr; warunki?: string[] /* pokaż tylko, gdy zaznaczono którykolwiek */; tresc: string[]; zrodlo: string; status?: "ok" | "do_potwierdzenia" }

/** Opis etapu dla użytkownika (np. "I trymestr", "tygodnie 1–13") — granice są w danych, nie w kodzie. */
export interface OpisTrymestru { id: Trymestr; nazwa: string; opis: string }

export interface BazaKalendarza {
  wersja: string; trymestry?: OpisTrymestru[]; wydarzenia: WpisKalendarza[]; informacje?: Informacja[];
  /** Pola do zaznaczenia przez użytkownika („lekarz powiedział mi, że…”). Zaznaczone odblokowują wpisy warunkowe. */
  warunki?: { id: string; etykieta: string; pomoc?: string }[];
  /** Założenia używane, gdy brakuje danych od użytkownika (np. długość pobytu w szpitalu do wyliczenia dnia wypisu). */
  zalozenia?: { pobyt_w_szpitalu_dni?: number };
}

export interface KalendarzWejscie {
  terminPorodu: string;           // "YYYY-MM-DD"
  dataPorodu?: string;            // rzeczywista, jeśli już po porodzie
  dataWypisu?: string;            // rzeczywista data wypisu ze szpitala (dla terminów liczonych od wypisu)
  warunki?: string[];             // zaznaczone przez użytkownika id z `baza.warunki`
}

export interface WydarzenieNaOsi {
  id: string; nazwa: string; grupa: Grupa; kategoria: string;
  trymestr?: Trymestr;
  dla?: "matka" | "dziecko";
  kiedy?: string;
  czestotliwosc?: string;
  typ: "standard" | "warunkowe"; warunek?: string; warunki?: string[]; skutek?: string; pozycje?: string[]; uwagi?: string[];
  od: string; do: string;         // okno wykonania, włącznie
  najpozniej?: string;            // twardy termin (data), jeśli podano
  opis?: string; zrodlo: string; status: "ok" | "do_potwierdzenia";
  szacunkowe: boolean;            // true, gdy liczone od TP zamiast od rzeczywistej daty porodu
}

export interface KalendarzWynik {
  poczatekCiazy: string;          // 1. dzień ostatniej miesiączki (wyliczony z TP)
  terminPorodu: string;
  dataPorodu?: string;
  /** Dzień wypisu ze szpitala: podany przez użytkownika albo założony z `zalozenia.pobyt_w_szpitalu_dni`. */
  wypis: { data: string; zalozony: boolean };
  oś: WydarzenieNaOsi[];
  /** Ta sama oś pogrupowana wg pola `trymestr` z danych; wpisy bez trymestru -> `bezTrymestru`. */
  wgTrymestrow: { trymestr: Trymestr; nazwa: string; opis?: string; wydarzenia: WydarzenieNaOsi[] }[];
  bezTrymestru: WydarzenieNaOsi[];
  informacje: Informacja[];
  uzytoZalozonegoWypisu: boolean;
  ostrzezenia: string[];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function poprawnaData(data: unknown): data is string {
  return typeof data === "string" && ISO.test(data) &&
    data >= "0101-01-01" && data <= "9998-12-31" && dodajDni(data, 0) === data;
}

/** "11+3" -> 11*7+3 dni od początku ciąży. */
export function tcNaDni(tc: string): number {
  const m = /^(\d{1,2})\+([0-6])$/.exec(tc);
  if (!m) throw new Error(`Nieprawidłowy zapis tygodnia ciąży: "${tc}" (oczekiwano np. "11+0")`);
  return +m[1] * 7 + +m[2];
}

function przesun(data: string, jednostka: OknoPo["jednostka"], n: number): string {
  if (jednostka === "dni") return dodajDni(data, n);
  if (jednostka === "tygodnie") return dodajDni(data, n * 7);
  return dodajMiesiace(data, n);
}

export function kalendarz(w: KalendarzWejscie, baza: BazaKalendarza): KalendarzWynik {
  if (!poprawnaData(w.terminPorodu)) throw new Error("Nieprawidłowy termin porodu");
  if (w.dataPorodu !== undefined && !poprawnaData(w.dataPorodu)) throw new Error("Nieprawidłowa data porodu");

  const poczatek = dodajDni(w.terminPorodu, -280);
  const ostrzezenia: string[] = [];
  const porodSzacunkowy = w.dataPorodu === undefined;
  const kotwicaPo = w.dataPorodu ?? w.terminPorodu;
  if (w.dataWypisu !== undefined) {
    if (!poprawnaData(w.dataWypisu)) throw new Error("Nieprawidłowa data wypisu");
    if (w.dataWypisu < kotwicaPo) throw new Error("dataWypisu nie może być wcześniejsza niż data porodu");
  }
  const wypis = w.dataWypisu !== undefined
    ? { data: w.dataWypisu, zalozony: false }
    : { data: dodajDni(kotwicaPo, baza.zalozenia?.pobyt_w_szpitalu_dni ?? 0), zalozony: true };
  let uzytoWypisu = false;
  const oś: WydarzenieNaOsi[] = [];
  const widziane = new Set<string>();
  const znaneWarunki = new Set<string>();
  for (const { id } of baza.warunki ?? []) {
    if (znaneWarunki.has(id)) throw new Error(`Powtórzone id warunku: ${id}`);
    znaneWarunki.add(id);
  }
  const opisyEtapow = new Map<Trymestr, OpisTrymestru>();
  for (const etap of baza.trymestry ?? []) {
    if (!KOLEJNOSC_TRYMESTROW.includes(etap.id)) throw new Error(`Nieznany etap kalendarza: ${etap.id}`);
    if (opisyEtapow.has(etap.id)) throw new Error(`Powtórzone id etapu: ${etap.id}`);
    opisyEtapow.set(etap.id, etap);
  }
  const wybrane = new Set(w.warunki ?? []);
  for (const id of wybrane) if (!znaneWarunki.has(id)) throw new Error(`Nieznany warunek: "${id}"`);

  for (const e of baza.wydarzenia) {
    if (widziane.has(e.id)) throw new Error(`Powtórzone id wydarzenia: ${e.id}`);
    widziane.add(e.id);
    if (!e.zrodlo?.trim()) throw new Error(`Wydarzenie ${e.id}: brak pola "zrodlo"`);

    let od: string, do_: string, szacunkowe: boolean, najpozniej: string | undefined;
    if (e.okno.typ === "tc") {
      od = dodajDni(poczatek, tcNaDni(e.okno.od));
      do_ = e.okno.do === "porod" ? (w.dataPorodu ?? w.terminPorodu) : dodajDni(poczatek, tcNaDni(e.okno.do));
      if (e.okno.najpozniej) najpozniej = dodajDni(poczatek, tcNaDni(e.okno.najpozniej));
      if (e.okno.do !== "porod" && tcNaDni(e.okno.od) > tcNaDni(e.okno.do)) throw new Error(`Wydarzenie ${e.id}: okno od > do`);
      szacunkowe = false; // TP jest punktem wyjścia, ale to nadal planowana data — UI pokazuje to na poziomie osi
    } else if (e.okno.typ === "po_porodzie") {
      if (e.okno.do !== "wypis" && e.okno.od > e.okno.do) throw new Error(`Wydarzenie ${e.id}: okno od > do`);
      if (!["dni", "tygodnie", "miesiace"].includes(e.okno.jednostka)) throw new Error(`Wydarzenie ${e.id}: nieznana jednostka okna`);
      if (!Number.isInteger(e.okno.od) || (e.okno.do !== "wypis" && !Number.isInteger(e.okno.do))) {
        throw new Error(`Wydarzenie ${e.id}: granice okna muszą być liczbami całkowitymi`);
      }
      const odWypisu = e.okno.kotwica === "wypis";
      const doWypisu = e.okno.do === "wypis";
      const baza0 = odWypisu ? wypis.data : kotwicaPo;
      od = przesun(baza0, e.okno.jednostka, e.okno.od);
      do_ = e.okno.do === "wypis" ? wypis.data : przesun(baza0, e.okno.jednostka, e.okno.do);
      if (e.okno.bezOstatniegoDnia && !doWypisu) do_ = dodajDni(do_, -1);
      const zWypisu = odWypisu || doWypisu;
      szacunkowe = porodSzacunkowy || (zWypisu && wypis.zalozony);
    } else {
      throw new Error(`Wydarzenie ${e.id}: nieznany typ okna`);
    }
    // Poród już się odbył: pozycje „przed porodem”, które zaczynałyby się po nim, są bezprzedmiotowe;
    // pozostałe przycinamy do dnia porodu. (Musi być przed walidacją okna — „do porodu” kończy się wtedy wcześniej.)
    const pominiete = w.dataPorodu !== undefined && e.grupa === "przed_porodem" && od > w.dataPorodu;
    if (w.dataPorodu !== undefined && e.grupa === "przed_porodem" && !pominiete && do_ > w.dataPorodu) do_ = w.dataPorodu;
    if (!pominiete && od > do_) throw new Error(`Wydarzenie ${e.id}: początek okna (${od}) po końcu (${do_})`);
    if (e.trymestr !== undefined) {
      if (!KOLEJNOSC_TRYMESTROW.includes(e.trymestr)) throw new Error(`Wydarzenie ${e.id}: trymestr musi być 1, 2, 3, "polog" lub "niemowle"`);
      if (jestPoPorodzie(e.trymestr) !== (e.grupa === "po_porodzie")) throw new Error(`Wydarzenie ${e.id}: "polog"/"niemowle" są dozwolone tylko dla grupy po_porodzie (i odwrotnie)`);
    }
    if (e.typ === "warunkowe" && !e.warunki?.length) throw new Error(`Wydarzenie ${e.id}: typ "warunkowe" wymaga niepustego pola "warunki"`);
    for (const id of e.warunki ?? []) if (!znaneWarunki.has(id)) throw new Error(`Wydarzenie ${e.id}: nieznany warunek "${id}"`);
    if (pominiete) continue;
    if (e.typ === "warunkowe" && !e.warunki!.some(x => wybrane.has(x))) continue; // warunek nie zaznaczony
    if (e.okno.typ === "po_porodzie" && (e.okno.kotwica === "wypis" || e.okno.do === "wypis")) uzytoWypisu = true;
    oś.push({
      id: e.id, nazwa: e.nazwa, grupa: e.grupa, kategoria: e.kategoria,
      trymestr: e.trymestr, dla: e.dla, kiedy: e.kiedy, czestotliwosc: e.czestotliwosc,
      typ: e.typ ?? "standard", warunek: e.warunek, warunki: e.warunki,
      skutek: e.skutek, pozycje: e.pozycje, uwagi: e.uwagi, od, do: do_, najpozniej,
      opis: e.opis, zrodlo: e.zrodlo, status: e.status ?? "ok", szacunkowe,
    });
  }

  const wszystkieInfo = baza.informacje ?? [];
  const idInfo = new Set<string>();
  for (const i of wszystkieInfo) {
    if (idInfo.has(i.id)) throw new Error(`Powtórzone id informacji: ${i.id}`);
    idInfo.add(i.id);
    for (const id of i.warunki ?? []) if (!znaneWarunki.has(id)) throw new Error(`Informacja ${i.id}: nieznany warunek "${id}"`);
    if (!i.zrodlo?.trim()) throw new Error(`Informacja ${i.id}: brak pola "zrodlo"`);
    if (i.trymestr !== undefined && !KOLEJNOSC_TRYMESTROW.includes(i.trymestr)) throw new Error(`Informacja ${i.id}: trymestr musi być 1, 2, 3, "polog" lub "niemowle"`);
  }

  const informacje = wszystkieInfo.filter(i => !i.warunki?.length || i.warunki.some(x => wybrane.has(x)));

  oś.sort((a, b) => a.od.localeCompare(b.od) || a.do.localeCompare(b.do) || a.id.localeCompare(b.id));

  const uzytoZalozonegoWypisu = uzytoWypisu && wypis.zalozony;
  if (porodSzacunkowy && oś.some(x => x.grupa === "po_porodzie"))
    ostrzezenia.push("Terminy po porodzie są orientacyjne — liczone od planowanego terminu porodu. Podaj rzeczywistą datę porodu, aby je przeliczyć.");
  if (uzytoZalozonegoWypisu && !porodSzacunkowy)
    ostrzezenia.push(`Data wypisu ze szpitala jest założona (${baza.zalozenia?.pobyt_w_szpitalu_dni ?? 0} dni po porodzie). Podaj rzeczywistą datę wypisu, aby przeliczyć terminy liczone od wypisu.`);
  if (oś.some(x => x.status === "do_potwierdzenia"))
    ostrzezenia.push("Część pozycji ma status „do potwierdzenia” — sprawdź je z lekarzem/położną.");
  if (baza.wydarzenia.length === 0) ostrzezenia.push("Baza kalendarza jest pusta — uzupełnij kalendarz_medyczny.json.");

  const wgTrymestrow = KOLEJNOSC_TRYMESTROW
    .map(t => {
      const m = opisyEtapow.get(t);
      return { trymestr: t, nazwa: m?.nazwa ?? (t === "polog" ? "Po porodzie" : t === "niemowle" ? "Pierwszy rok życia dziecka" : `${"I".repeat(t)} trymestr`), opis: m?.opis, wydarzenia: oś.filter(x => x.trymestr === t) };
    })
    .filter(g => g.wydarzenia.length > 0);
  const bezTrymestru = oś.filter(x => x.trymestr === undefined);
  if (bezTrymestru.length > 0 && wgTrymestrow.length > 0)
    ostrzezenia.push(`Pozycje bez przypisanego trymestru: ${bezTrymestru.map(x => x.id).join(", ")}.`);

  return { poczatekCiazy: poczatek, terminPorodu: w.terminPorodu, dataPorodu: w.dataPorodu, wypis, oś, wgTrymestrow, bezTrymestru, informacje, uzytoZalozonegoWypisu, ostrzezenia };
}

export function terminyKalendarza(w: KalendarzWejscie, parametry: Parametry, plan?: PlanWejscie) {
  const dataZdarzenia = w.dataPorodu ?? w.terminPorodu;
  const wniosek = dodajDni(dataZdarzenia, parametry.terminy_dni.wniosek_pelny_wymiar_81_5_po_porodzie);
  if (plan?.tytul !== "porod" || plan.dataZdarzenia !== dataZdarzenia) return { wniosek, doPracodawcy: [] };
  const obliczony = planZasilku(plan, parametry);
  const doPracodawcy = terminy({ tytul: "porod", dataZdarzenia, plan: obliczony }, parametry)
    .filter(t => t.do && t.co.startsWith("Wniosek o urlop"))
    .sort((a, b) => a.do!.localeCompare(b.do!));
  return { wniosek, doPracodawcy };
}

/** Pozycja ramki „Najbliższe zadania dla Ciebie”: termin z datą i liczbą dni. */
export interface Zadanie {
  id: string; nazwa: string;
  od: string; do: string;          // okno wykonania (włącznie); `do` = twardy termin, jeśli podano „najpóźniej”
  trwa: boolean;                   // true: okno już otwarte, liczymy dni do końca; false: liczymy dni do początku
  dni: number;                     // ile dni zostało do końca (trwa) albo do początku (nie trwa)
  szacunkowe: boolean;
}

type ZrodloZadania = Pick<WydarzenieNaOsi, "id" | "nazwa" | "od" | "do" | "szacunkowe"> & { najpozniej?: string };

/**
 * 1–`ile` najbliższych terminów od dnia `dzis`: najpierw to, co już trwa (wg końca okna), potem to, co się zaczyna (wg początku).
 * Pomija terminy, które minęły. Funkcja czysta: bez dat systemowych, `dzis` podaje wywołujący.
 */
export function najblizszeZadania(pozycje: ZrodloZadania[], dzis: string, ile = 2): Zadanie[] {
  return pozycje
    .map((p) => {
      const koniec = p.najpozniej && p.najpozniej < p.do ? p.najpozniej : p.do;
      const trwa = p.od <= dzis;
      return { id: p.id, nazwa: p.nazwa, od: p.od, do: koniec, trwa, dni: dniMiedzy(dzis, trwa ? koniec : p.od), szacunkowe: p.szacunkowe };
    })
    .filter((z) => z.do >= dzis)
    .sort((a, b) => (a.trwa ? a.do : a.od).localeCompare(b.trwa ? b.do : b.od) || a.do.localeCompare(b.do))
    .slice(0, Math.max(0, ile));
}
