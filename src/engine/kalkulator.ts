// =====================================================================
// kalkulator.ts — REFERENCYJNY silnik obliczeń (zasiłki ciąża/rodzicielstwo)
// Zero zależności. Uruchamiasz: node --experimental-strip-types plik.ts (Node 22+)
// albo przez tsx / ts-node. Składnia celowo "erasable" (bez enum).
// WSZYSTKIE liczby pochodzą z parametry.json (panel admina) — nie zaszywaj ich w kodzie.
// Kwoty: PLN. Daty: "YYYY-MM-DD". Miesiąc zasiłkowy = 30 dni (art. 11 ust. 5 ustawy zasiłkowej).
// =====================================================================

export type Kto = "matka" | "ojciec";

export interface Parametry {
  kwoty: {
    placa_minimalna_brutto: number;
    max_podstawa_skladek_chorobowe_dobrowolne: number;
    swiadczenie_rodzicielskie_miesieczne: number;
    zasilek_pogrzebowy_martwe_dziecko: number;
  };
  procenty: Record<string, number>;
  wymiary_tygodnie: Record<string, any>;
  limity_dni: Record<string, number>;
  terminy_dni: Record<string, number>;
  platnik: { prog_liczby_ubezpieczonych_powyzej: number };
}

// ---------- pomocnicze: daty i zaokrąglenia ----------
const MS = 86400000;
const toMs = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const dodajDni = (s: string, n: number) => toIso(toMs(s) + n * MS);
export const dniMiedzy = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / MS);
export function dodajMiesiace(s: string, m: number): string {
  const dt = new Date(toMs(s));
  const day = dt.getUTCDate();
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + m);
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(day, last));
  return toIso(dt.getTime());
}
export const r2 = (x: number) => Math.round((x + 1e-9) * 100) / 100;
const pr = (p: Parametry, k: string) => p.procenty[k];

// ---------- wartości pochodne z parametrów ----------
export function minPodstawaZasilkuPracownik(p: Parametry): number {
  return r2(p.kwoty.placa_minimalna_brutto * (1 - pr(p, "skladki_odliczane_od_podstawy") / 100));
}
export function maxPodstawaZasilkuNiepracownik(p: Parametry): number {
  return r2(p.kwoty.max_podstawa_skladek_chorobowe_dobrowolne * (1 - pr(p, "skladki_odliczane_od_podstawy") / 100));
}
export function progZadluzenia(p: Parametry): number {
  return r2(p.kwoty.placa_minimalna_brutto * pr(p, "prog_zadluzenia_proc_placy_minimalnej") / 100);
}

// =====================================================================
// 1. PODSTAWA WYMIARU
// =====================================================================
export interface MiesiacWynagrodzenia {
  miesiac: string;                       // "2026-03"
  kwota: number;                         // wynagrodzenie brutto stanowiące podstawę składek chorobowego
  mniejNizPolowaCzasuPracy?: boolean;    // usprawiedliwiona nieobecność > połowy czasu pracy -> miesiąc wyłączany
  kwotaUzupelniona?: number;             // art. 37: kwota po uzupełnieniu do pełnego miesiąca (jeśli >= połowy czasu)
}
export interface PodstawaPracownikWejscie {
  miesiace: MiesiacWynagrodzenia[];      // max 12 miesięcy poprzedzających miesiąc zdarzenia (tylko okres nieprzerwanego ubezpieczenia)
  premieKwartalne4Kw?: number;           // suma premii kwartalnych za 4 kwartały -> 1/12
  premieRoczne?: number;                 // suma premii rocznych za rok poprzedni -> 1/12
  pelnyWymiarEtatu: boolean;             // warunek zastosowania minimalnej podstawy (art. 45)
}
export interface PodstawaWynik {
  sredniaBrutto: number;
  podstawaMiesieczna: number;            // po odjęciu 13,71 %
  podstawaDzienna: number;               // = miesięczna / 30 (tylko do wyświetlenia; liczenie używa pełnej precyzji)
  zastosowanoMinimum: boolean;
  zastosowanoMaksimum: boolean;
  kroki: string[];                       // "dlaczego taki wynik" — gotowe do pokazania w UI
  ostrzezenia: string[];
}

export function podstawaPracownik(w: PodstawaPracownikWejscie, p: Parametry): PodstawaWynik {
  const kroki: string[] = [];
  const ostrzezenia: string[] = [];
  if (w.miesiace.length === 0) throw new Error("Brak miesięcy do podstawy — wymagany art. 37 (wynagrodzenie za pełny miesiąc z umowy).");
  const wszystkieMniejNizPolowa = w.miesiace.every(m => m.mniejNizPolowaCzasuPracy);
  const uzyte = wszystkieMniejNizPolowa ? w.miesiace : w.miesiace.filter(m => !m.mniejNizPolowaCzasuPracy);
  const wykluczone = w.miesiace.length - uzyte.length;
  if (wykluczone > 0) kroki.push(`Wyłączono ${wykluczone} mies. z przepracowaną mniej niż połową czasu pracy (usprawiedliwiona nieobecność).`);
  if (w.miesiace.length < 12) ostrzezenia.push(`Podstawa z ${w.miesiace.length} pełnych miesięcy ubezpieczenia (krócej niż 12) — art. 36 ust. 2.`);
  const suma = uzyte.reduce((s, m) => s + (m.kwotaUzupelniona ?? m.kwota), 0);
  let srednia = suma / uzyte.length;
  kroki.push(`Średnie miesięczne wynagrodzenie brutto z ${uzyte.length} mies.: ${r2(srednia)} zł.`);
  if (w.premieKwartalne4Kw) { srednia += w.premieKwartalne4Kw / 12; kroki.push(`+ 1/12 premii kwartalnych (${w.premieKwartalne4Kw} zł za 4 kwartały).`); }
  if (w.premieRoczne) { srednia += w.premieRoczne / 12; kroki.push(`+ 1/12 premii rocznej (${w.premieRoczne} zł).`); }
  const sredniaBrutto = r2(srednia);
  let podst = r2(srednia * (1 - pr(p, "skladki_odliczane_od_podstawy") / 100));
  kroki.push(`Odjęcie ${pr(p, "skladki_odliczane_od_podstawy")} % składek społecznych: ${podst} zł.`);
  let min = false;
  if (w.pelnyWymiarEtatu) {
    const m = minPodstawaZasilkuPracownik(p);
    if (podst < m) { podst = m; min = true; kroki.push(`Podstawa podniesiona do minimalnej (${m} zł) — art. 45, pełny etat.`); }
  }
  return { sredniaBrutto, podstawaMiesieczna: podst, podstawaDzienna: r2(podst / p.limity_dni.dni_w_miesiacu_dla_zasilkow), zastosowanoMinimum: min, zastosowanoMaksimum: false, kroki, ostrzezenia };
}

export interface PodstawaNiepracownikWejscie {
  // podstawa wymiaru SKŁADEK na ubezpieczenie chorobowe w kolejnych miesiącach (zadeklarowana kwota / przychód ze zlecenia)
  miesiace: { miesiac: string; podstawaSkladek: number }[];
  zadeklarowanaKwota: boolean;
}
export function podstawaNiepracownik(w: PodstawaNiepracownikWejscie, p: Parametry): PodstawaWynik {
  const kroki: string[] = [];
  const ostrzezenia: string[] = [];
  if (w.miesiace.length === 0) throw new Error("Brak miesięcy — art. 49 (najniższa podstawa / kwota z umowy).");
  const srednia = w.miesiace.reduce((s, m) => s + m.podstawaSkladek, 0) / w.miesiace.length;
  kroki.push(`Przeciętna miesięczna podstawa składek z ${w.miesiace.length} mies.: ${r2(srednia)} zł.`);
  if (w.miesiace.length < 12 && w.zadeklarowanaKwota)
    ostrzezenia.push("Ubezpieczenie < 12 mies. przy zadeklarowanej kwocie: art. 48a (suma najniższej podstawy i 1/12 nadwyżki) — NIE zaimplementowano w wersji referencyjnej; wynik przybliżony. Patrz LUKI_I_DECYZJE.md.");
  let podst = r2(srednia * (1 - pr(p, "skladki_odliczane_od_podstawy") / 100));
  kroki.push(`Odjęcie ${pr(p, "skladki_odliczane_od_podstawy")} %: ${podst} zł.`);
  const max = maxPodstawaZasilkuNiepracownik(p);
  let czyMax = false;
  if (podst > max) { podst = max; czyMax = true; kroki.push(`Ograniczono do maksymalnej podstawy zasiłku (${max} zł).`); }
  return { sredniaBrutto: r2(srednia), podstawaMiesieczna: podst, podstawaDzienna: r2(podst / p.limity_dni.dni_w_miesiacu_dla_zasilkow), zastosowanoMinimum: false, zastosowanoMaksimum: czyMax, kroki, ostrzezenia };
}

// =====================================================================
// 2. WYMIARY URLOPÓW (tabele z załącznika i KP)
// =====================================================================
const kl = (n: number, maxKlucz: number) => Math.min(Math.max(1, Math.floor(n)), maxKlucz);
export function wymiarMacierzynski(liczbaDzieci: number, p: Parametry): number {
  const t = p.wymiary_tygodnie.urlop_macierzynski_wg_liczby_dzieci;
  return liczbaDzieci >= 5 ? t["5_i_wiecej"] : t[String(kl(liczbaDzieci, 4))];
}
export function wymiarRodzicielski(liczbaDzieci: number, zaZyciem: boolean, p: Parametry): number {
  const t = zaZyciem ? p.wymiary_tygodnie.urlop_rodzicielski_za_zyciem : p.wymiary_tygodnie.urlop_rodzicielski;
  return liczbaDzieci >= 2 ? t["2_i_wiecej"] : t["1"];
}
export function maxRodzicielskiPrzyLaczeniu(liczbaDzieci: number, zaZyciem: boolean, p: Parametry): number {
  const t = zaZyciem ? p.wymiary_tygodnie.urlop_rodzicielski_za_zyciem_przy_laczeniu_z_praca_max : p.wymiary_tygodnie.urlop_rodzicielski_przy_laczeniu_z_praca_max;
  return liczbaDzieci >= 2 ? t["2_i_wiecej"] : t["1"];
}

// ---- uzupełniający urlop macierzyński (art. 1802 KP) ----
export interface UzupelniajacyWejscie {
  dataPorodu: string;
  tydzienCiazyUkonczone: number;         // ukończone tygodnie ciąży w dniu porodu
  masaUrodzeniowaG: number;              // przy ciąży mnogiej: NAJNIŻSZA masa
  pobytySzpital: { od: string; do: string }[]; // przy ciąży mnogiej: najdłuższa hospitalizacja
}
export function wymiarUzupelniajacy(w: UzupelniajacyWejscie, p: Parametry): { tygodnie: number; przypadek: string; dniWOknie: number } {
  const lim = p.wymiary_tygodnie.uzupelniajacy_limit_do_tygodnia_po_porodzie;
  let przypadek: string, koniecTyg: number, startDzien = 1;
  if (w.tydzienCiazyUkonczone < 28 || w.masaUrodzeniowaG <= 1000) { przypadek = "przed_28_tc_lub_masa_do_1000g"; koniecTyg = lim[przypadek]; }
  else if (w.tydzienCiazyUkonczone < 37) { przypadek = "28_do_37_tc_masa_ponad_1000g"; koniecTyg = lim[przypadek]; }
  else { przypadek = "po_37_tc"; koniecTyg = lim[przypadek]; startDzien = p.wymiary_tygodnie.uzupelniajacy_po_37_tc_pierwszy_dzien_pobytu_miedzy_dniem[0]; }
  // dzień 1 = dzień porodu; okno = [startDzien, koniecTyg*7]
  const oknoOd = dodajDni(w.dataPorodu, startDzien - 1), oknoDo = dodajDni(w.dataPorodu, koniecTyg * 7 - 1);
  let dni = 0;
  for (const s of w.pobytySzpital) {
    const a = toMs(s.od) > toMs(oknoOd) ? s.od : oknoOd;
    const b = toMs(s.do) < toMs(oknoDo) ? s.do : oknoDo;
    if (toMs(b) >= toMs(a)) dni += dniMiedzy(a, b) + 1;
  }
  if (przypadek === "po_37_tc") {
    const [od5, do28] = p.wymiary_tygodnie.uzupelniajacy_po_37_tc_pierwszy_dzien_pobytu_miedzy_dniem;
    const maPierwszyWOknie = w.pobytySzpital.some(s => toMs(s.od) >= toMs(dodajDni(w.dataPorodu, od5 - 1)) && toMs(s.od) <= toMs(dodajDni(w.dataPorodu, do28 - 1)) && dniMiedzy(s.od, s.do) + 1 >= p.wymiary_tygodnie.uzupelniajacy_po_37_tc_pobyt_min_dni);
    if (!maPierwszyWOknie) return { tygodnie: 0, przypadek, dniWOknie: 0 };
  }
  return { tygodnie: Math.ceil(dni / 7), przypadek, dniWOknie: dni }; // niepełny tydzień w górę
}

// =====================================================================
// 3. KWOTA ZA OKRES
// =====================================================================
export interface Okres {
  rodzaj: "macierzynski" | "macierzynski_przed_porodem" | "uzupelniajacy" | "rodzicielski" | "rodzicielski_9tyg_drugiego_rodzica" | "ojcowski" | "na_warunkach_macierzynskiego";
  kto: Kto;
  od: string;
  do: string;
  dni: number;
  procent: number;
  wspolczynnikZasilku: number;           // 1 normalnie; (1 - w) przy łączeniu z pracą (art. 31 ust. 4a)
  kwotaDzienna: number;
  kwota: number;
  podwyzszoneDoSwiadczeniaRodzicielskiego: boolean;
  uwagi?: string;
}
export function kwotaOkresu(podstawaMies: number, procent: number, dni: number, wsp: number, laczenieZPraca: boolean, p: Parametry) {
  const dniM = p.limity_dni.dni_w_miesiacu_dla_zasilkow;
  let dzienna = podstawaMies * procent / 100 / dniM * wsp;
  const minDzienna = p.kwoty.swiadczenie_rodzicielskie_miesieczne / dniM;
  let podwyzszone = false;
  // art. 31 ust. 3a, 3c: podwyższenie do 1000 zł/mies., proporcjonalnie za niepełny miesiąc.
  // Przy łączeniu z pracą NIE stosujemy (niejasne w przepisach — patrz LUKI_I_DECYZJE.md).
  if (!laczenieZPraca && dzienna < minDzienna) { dzienna = minDzienna; podwyzszone = true; }
  return { kwotaDzienna: r2(dzienna * 100) / 100, kwota: r2(dzienna * dni), podwyzszone };
}

function zrobOkres(base: Omit<Okres, "dni" | "do" | "kwotaDzienna" | "kwota" | "podwyzszoneDoSwiadczeniaRodzicielskiego">, dni: number, podstawa: number, laczenie: boolean, p: Parametry): Okres {
  const k = kwotaOkresu(podstawa, base.procent, dni, base.wspolczynnikZasilku, laczenie, p);
  return { ...base, dni, do: dodajDni(base.od, dni - 1), kwotaDzienna: k.kwotaDzienna, kwota: k.kwota, podwyzszoneDoSwiadczeniaRodzicielskiego: k.podwyzszone };
}

// =====================================================================
// 4. PLAN ZASIŁKU DLA RODZICÓW (matka / ojciec / oboje) — rdzeń kalkulatora b, d, e, j
// =====================================================================
export interface BlokRodzicielski { kto: Kto; tygodnie: number; od?: string; wspolczynnikPracy?: number /* 0..0.5 */ }
export interface PlanWejscie {
  tytul: "porod" | "rodzina_zastepcza" | "przysposobienie";
  dataZdarzenia: string;                 // data porodu / przyjęcia dziecka na wychowanie
  liczbaDzieci: number;
  zaswiadczenieZaZyciem?: boolean;
  podstawy: { matka?: number; ojciec?: number }; // podstawa wymiaru miesięczna (po 13,71 %), z podstawaPracownik/Niepracownik
  wariant: "zmienny_100_70" | "usredniony_81_5";
  przedPorodemDni?: number;              // ile dni urlopu macierzyńskiego przed porodem (0..42), tylko "porod"
  macierzynskiOjciecPrzejmujeTyg?: number; // ile tygodni końcówki macierzyńskiego przejmuje ojciec (po >=14 tyg matki)
  macierzynskiOjciecPrzejmujeDni?: number; // jw. w dniach (ma pierwszeństwo) — np. po zgonie matki
  drugiRodzicNiedostepny?: boolean;        // zgon / porzucenie: znosi wymóg 14 tyg. matki i limit E-9 dla jednego rodzica (ZAŁOŻENIE do potwierdzenia, LUKI_I_DECYZJE.md)
  uzupelniajacy?: { kto: Kto; tygodnie: number };
  rodzicielski: BlokRodzicielski[];
  ojcowski?: { od: string; dni: number }[];
  martwe?: { liczbaDzieciPozostalychPrzyZyciu?: number };
  zgonDziecka?: { data: string };        // zgon dziecka po porodzie
  wiekGranicyDzieckaData?: string;       // adopcja/RZ: data osiągnięcia limitu wieku (7/10/14 r.ż.) — obcina wymiar, min. 9 tyg.
}
export interface PlanWynik {
  okresy: Okres[];
  sumy: { matka: number; ojciec: number; razem: number };
  wymiary: { macierzynskiTyg: number; rodzicielskiTyg: number; rodzicielskiWykorzystaneTyg: number; rodzicielskiMaxPrzyLaczeniuTyg: number };
  bledy: string[];
  ostrzezenia: string[];
  kroki: string[];
}

export function planZasilku(w: PlanWejscie, p: Parametry): PlanWynik {
  const bledy: string[] = [], ostrzezenia: string[] = [], kroki: string[] = [];
  const okresy: Okres[] = [];
  const W = p.wymiary_tygodnie;
  const usredniony = w.wariant === "usredniony_81_5";
  const pM = pr(p, "zasilek_za_urlop_macierzynski"), pR = pr(p, "zasilek_za_urlop_rodzicielski"),
    p815 = pr(p, "wariant_pelny_wymiar_81_5"), p9 = pr(p, "zasilek_za_9_tyg_drugiego_rodzica"),
    pOj = pr(p, "zasilek_za_urlop_ojcowski"), pUz = pr(p, "zasilek_za_uzupelniajacy_urlop_macierzynski");
  const podstawaDla = (kto: Kto): number => {
    const v = w.podstawy[kto];
    if (v === undefined) { bledy.push(`Brak podstawy wymiaru dla: ${kto}.`); return 0; }
    return v;
  };

  // --- wymiar macierzyńskiego ---
  let macTyg = wymiarMacierzynski(w.liczbaDzieci, p);
  let macDniOgraniczone: number | null = null;
  if (w.martwe) {
    const zywe = w.martwe.liczbaDzieciPozostalychPrzyZyciu ?? 0;
    macTyg = zywe > 0 ? wymiarMacierzynski(zywe, p) : W.martwe_dziecko_min_po_porodzie;
    kroki.push(zywe > 0 ? `Poród mnogi, ${zywe} dz. przy życiu: wymiar jak dla ${zywe} dzieci.` : `Martwe urodzenie: ${macTyg} tyg. po porodzie.`);
  } else if (w.zgonDziecka) {
    const wiekDni = dniMiedzy(w.dataZdarzenia, w.zgonDziecka.data);
    if (wiekDni < 56) { macDniOgraniczone = Math.max(56, wiekDni + 7); kroki.push(`Zgon dziecka przed ukończeniem 8 tyg. życia: 8 tyg. po porodzie, nie krócej niż 7 dni od zgonu.`); }
    else { macDniOgraniczone = wiekDni + 1 + 7; kroki.push(`Zgon dziecka po 8. tygodniu: prawo zachowane przez 7 dni od zgonu.`); macDniOgraniczone = Math.min(macTyg * 7, wiekDni + 7); }
  }
  let macDni = macDniOgraniczone ?? macTyg * 7;

  // adopcja/RZ: obcięcie wiekiem, minimum 9 tyg. (art. 183 § 3)
  if (w.tytul !== "porod" && w.wiekGranicyDzieckaData) {
    const doGranicy = dniMiedzy(w.dataZdarzenia, w.wiekGranicyDzieckaData);
    const min = W.min_urlop_na_warunkach_macierzynskiego_adopcja * 7;
    if (doGranicy < macDni) { macDni = Math.max(min, doGranicy); kroki.push(`Limit wieku dziecka skraca urlop do ${Math.round(macDni / 7 * 10) / 10} tyg. (min. ${W.min_urlop_na_warunkach_macierzynskiego_adopcja} tyg.).`); }
  }
  const macRodzaj: Okres["rodzaj"] = w.tytul === "porod" ? "macierzynski" : "na_warunkach_macierzynskiego";

  // --- macierzyński: matka (opcjonalnie końcówka u ojca) ---
  const przed = w.tytul === "porod" ? (w.przedPorodemDni ?? 0) : 0;
  if (przed < 0 || przed > W.macierzynski_przed_porodem_max * 7) bledy.push(`Przed porodem można wykorzystać maks. ${W.macierzynski_przed_porodem_max} tyg. urlopu macierzyńskiego.`);
  const start = dodajDni(w.dataZdarzenia, -przed);
  const ojPrzejmuje = w.macierzynskiOjciecPrzejmujeDni ?? (w.macierzynskiOjciecPrzejmujeTyg ?? 0) * 7;
  const matkaMacDni = macDni - ojPrzejmuje;
  const poPorodzieMatka = matkaMacDni - przed;
  if (ojPrzejmuje > 0 && w.tytul === "porod" && !w.drugiRodzicNiedostepny && poPorodzieMatka < W.macierzynski_matka_obowiazkowo_po_porodzie_min * 7)
    bledy.push(`Matka musi wykorzystać po porodzie co najmniej ${W.macierzynski_matka_obowiazkowo_po_porodzie_min} tyg. urlopu macierzyńskiego, by ojciec mógł przejąć resztę.`);
  const procMac = usredniony ? p815 : pM;
  let kurs = start;
  if (przed > 0) {
    okresy.push(zrobOkres({ rodzaj: "macierzynski_przed_porodem", kto: "matka", od: start, procent: procMac, wspolczynnikZasilku: 1 }, przed, podstawaDla("matka"), false, p));
    kurs = w.dataZdarzenia;
  }
  okresy.push(zrobOkres({ rodzaj: macRodzaj, kto: "matka", od: kurs, procent: procMac, wspolczynnikZasilku: 1 }, matkaMacDni - przed, podstawaDla("matka"), false, p));
  let koniecMatki = okresy[okresy.length - 1].do;
  if (ojPrzejmuje > 0) {
    okresy.push(zrobOkres({ rodzaj: macRodzaj, kto: "ojciec", od: dodajDni(koniecMatki, 1), procent: procMac, wspolczynnikZasilku: 1 }, ojPrzejmuje, podstawaDla("ojciec"), false, p));
    koniecMatki = okresy[okresy.length - 1].do;
  }
  let lancuch = koniecMatki; // koniec ostatniego bloku "łańcucha" (macierzyński -> uzupełniający -> rodzicielski)

  // --- uzupełniający ---
  if (w.uzupelniajacy && w.uzupelniajacy.tygodnie > 0) {
    okresy.push(zrobOkres({ rodzaj: "uzupelniajacy", kto: w.uzupelniajacy.kto, od: dodajDni(lancuch, 1), procent: pUz, wspolczynnikZasilku: 1 }, w.uzupelniajacy.tygodnie * 7, podstawaDla(w.uzupelniajacy.kto), false, p));
    lancuch = okresy[okresy.length - 1].do;
  }

  // --- rodzicielski ---
  const E = w.tytul === "porod" || w.tytul === "rodzina_zastepcza" || w.tytul === "przysposobienie"
    ? wymiarRodzicielski(w.liczbaDzieci, !!w.zaswiadczenieZaZyciem, p) : 0;
  const maxLaczenie = maxRodzicielskiPrzyLaczeniu(w.liczbaDzieci, !!w.zaswiadczenieZaZyciem, p);
  const niezbywalne = W.niezbywalne_prawo_kazdego_rodzica_rodzicielski;
  const suma: Record<Kto, number> = { matka: 0, ojciec: 0 };
  for (const b of w.rodzicielski) suma[b.kto] += b.tygodnie;
  const wykorzystane = suma.matka + suma.ojciec;
  if (wykorzystane > E) bledy.push(`Urlop rodzicielski: planujesz ${wykorzystane} tyg., a wspólna pula to ${E} tyg.`);
  // Każdy rodzic ma 9 tyg. wyłącznie dla siebie; drugi rodzic nie może wziąć więcej niż E-9.
  if (w.drugiRodzicNiedostepny) ostrzezenia.push("Drugi rodzic niedostępny (zgon/porzucenie): przyjęto, że jedyny rodzic może wykorzystać całą pulę urlopu rodzicielskiego — potwierdź w ZUS/PIP.");
  for (const kto of ["matka", "ojciec"] as Kto[]) if (!w.drugiRodzicNiedostepny && suma[kto] > E - niezbywalne) bledy.push(`${kto === "matka" ? "Matka" : "Ojciec"} może wykorzystać maks. ${E - niezbywalne} tyg. (reszta: ${niezbywalne} tyg. niezbywalne dla drugiego rodzica).`);
  if (w.rodzicielski.length > p.limity_dni.urlop_rodzicielski_max_czesci) bledy.push(`Urlop rodzicielski można podzielić na maks. ${p.limity_dni.urlop_rodzicielski_max_czesci} części.`);
  let ojciec9Pozostalo = niezbywalne; // ile z własnych 9 tyg. ojca/drugiego rodzica zostało do wskazania stawką 70 %
  let matka9Pozostalo = niezbywalne;
  for (const b of w.rodzicielski) {
    const wp = b.wspolczynnikPracy ?? 0;
    if (wp < 0 || wp > p.limity_dni.laczenie_z_praca_max_wymiar_etatu) { bledy.push(`Łączenie z pracą: maks. ${p.limity_dni.laczenie_z_praca_max_wymiar_etatu * 100} % etatu.`); continue; }
    const odBloku = b.od ?? dodajDni(lancuch, 1);
    const dni = wp > 0 ? Math.floor(b.tygodnie * 7 / (1 - wp)) : b.tygodnie * 7;      // art. 1821f: dni niepełne pomijane
    // Podział na część "9 tyg. własnych" (zawsze 70 %) i resztę (81,5 % w wariancie uśrednionym — wniosek matki art. 30a)
    const rezerwa = b.kto === "ojciec" ? ojciec9Pozostalo : matka9Pozostalo;
    const wTejCzesci = Math.min(b.tygodnie, rezerwa);
    // UWAGA (założenie): w wariancie uśrednionym 81,5 % dotyczy okresów z puli matki; 9 tyg. drugiego rodzica = 70 %.
    // Dla ojca "własne 9 tyg." = 70 %; ponad to (przejęte od matki) = 81,5 %. Do potwierdzenia — LUKI_I_DECYZJE.md.
    const dzieli = (tyg: number) => wp > 0 ? Math.floor(tyg * 7 / (1 - wp)) : tyg * 7;
    const dni70 = Math.min(dni, dzieli(wTejCzesci));
    const reszta = dni - dni70;
    if (b.kto === "ojciec") ojciec9Pozostalo -= wTejCzesci; else matka9Pozostalo -= wTejCzesci;
    // dla matki w wariancie zmiennym/uśrednionym: jej własne 9 tyg. nie są "zarezerwowane dla drugiego" — to ojca; matka używa puli E-9.
    const stawkaGlowna = usredniony ? p815 : pR;
    if (b.kto === "ojciec") {
      if (dni70 > 0) okresy.push(zrobOkres({ rodzaj: "rodzicielski_9tyg_drugiego_rodzica", kto: "ojciec", od: odBloku, procent: p9, wspolczynnikZasilku: 1 - wp }, dni70, podstawaDla("ojciec"), wp > 0, p));
      if (reszta > 0) okresy.push(zrobOkres({ rodzaj: "rodzicielski", kto: "ojciec", od: dodajDni(odBloku, dni70), procent: stawkaGlowna, wspolczynnikZasilku: 1 - wp }, reszta, podstawaDla("ojciec"), wp > 0, p));
    } else {
      okresy.push(zrobOkres({ rodzaj: "rodzicielski", kto: "matka", od: odBloku, procent: stawkaGlowna, wspolczynnikZasilku: 1 - wp }, dni, podstawaDla("matka"), wp > 0, p));
    }
    if (!b.od) lancuch = okresy[okresy.length - 1].do;
    if (wp > 0) kroki.push(`Blok ${b.kto}: ${b.tygodnie} tyg. urlopu łączone z pracą na ${wp * 100} % etatu => ${Math.round(dni / 7 * 100) / 100} tyg. kalendarzowych; zasiłek ×${1 - wp}.`);
  }

  // --- ojcowski ---
  if (w.ojcowski && w.ojcowski.length) {
    const lacznie = w.ojcowski.reduce((s, x) => s + x.dni, 0);
    if (lacznie > p.limity_dni.urlop_ojcowski_dni) bledy.push(`Urlop ojcowski: maks. ${p.limity_dni.urlop_ojcowski_dni} dni.`);
    if (w.ojcowski.length > p.limity_dni.urlop_ojcowski_max_czesci) bledy.push(`Urlop ojcowski: maks. ${p.limity_dni.urlop_ojcowski_max_czesci} części.`);
    if (w.ojcowski.length > 1 && w.ojcowski.some(x => x.dni < p.limity_dni.urlop_ojcowski_min_czesc_dni)) bledy.push(`Każda część urlopu ojcowskiego min. ${p.limity_dni.urlop_ojcowski_min_czesc_dni} dni.`);
    const koniecTermin = w.tytul === "porod" ? dodajMiesiace(w.dataZdarzenia, p.limity_dni.urlop_ojcowski_do_wieku_dziecka_miesiecy) : null;
    for (const o of w.ojcowski) {
      okresy.push(zrobOkres({ rodzaj: "ojcowski", kto: "ojciec", od: o.od, procent: pOj, wspolczynnikZasilku: 1 }, o.dni, podstawaDla("ojciec"), false, p));
      if (koniecTermin && toMs(dodajDni(o.od, o.dni - 1)) >= toMs(koniecTermin)) bledy.push(`Urlop ojcowski musi zakończyć się przed ukończeniem przez dziecko 12 mies. (${koniecTermin}).`);
    }
  }

  // --- limit końca roku, w którym dziecko kończy 6 lat (tylko poród, jeśli znamy datę) ---
  if (w.tytul === "porod") {
    const rokGranicy = +w.dataZdarzenia.slice(0, 4) + p.limity_dni.urlop_rodzicielski_do_konca_roku_w_ktorym_dziecko_konczy_lat;
    const granica = `${rokGranicy}-12-31`;
    for (const o of okresy) if (o.rodzaj.startsWith("rodzicielski") && toMs(o.do) > toMs(granica)) { bledy.push(`Urlop rodzicielski musi zakończyć się do ${granica} (koniec roku, w którym dziecko kończy 6 lat).`); break; }
  }

  const sM = r2(okresy.filter(o => o.kto === "matka").reduce((s, o) => s + o.kwota, 0));
  const sO = r2(okresy.filter(o => o.kto === "ojciec").reduce((s, o) => s + o.kwota, 0));
  if (okresy.some(o => o.podwyzszoneDoSwiadczeniaRodzicielskiego)) ostrzezenia.push(`Część zasiłku podwyższono do ${p.kwoty.swiadczenie_rodzicielskie_miesieczne} zł/mies. (art. 31 ust. 3a — kwota świadczenia rodzicielskiego).`);
  if (w.rodzicielski.some(b => (b.wspolczynnikPracy ?? 0) > 0)) ostrzezenia.push("Łączenie z pracą: wniosek do pracodawcy min. 21 dni przed podjęciem pracy; pracodawca może odmówić z powodu organizacji pracy (art. 1821e § 2) — wtedy odpowiedź w 7 dni.");
  return { okresy, sumy: { matka: sM, ojciec: sO, razem: r2(sM + sO) }, wymiary: { macierzynskiTyg: Math.round(macDni / 7 * 100) / 100, rodzicielskiTyg: E, rodzicielskiWykorzystaneTyg: wykorzystane, rodzicielskiMaxPrzyLaczeniuTyg: maxLaczenie }, bledy, ostrzezenia, kroki };
}

// ---- porównanie wariantów 100 %/70 % vs 81,5 % (gotowe do UI) ----
export function porownajWarianty(w: Omit<PlanWejscie, "wariant">, p: Parametry) {
  const a = planZasilku({ ...w, wariant: "zmienny_100_70" }, p);
  const b = planZasilku({ ...w, wariant: "usredniony_81_5" }, p);
  return { zmienny_100_70: a, usredniony_81_5: b, roznicaRazem: r2(b.sumy.razem - a.sumy.razem) };
}

// =====================================================================
// 5. PRAWO DO ŚWIADCZEŃ (uprawnienia w ciąży + macierzyński) — wymóg a)
// =====================================================================
export type TytulUbezpieczenia = "umowa_o_prace" | "zlecenie" | "dzialalnosc" | "dzielo_lub_brak" | "bezrobotna_bez_ubezpieczenia";
export interface UprawnieniaWejscie {
  tytul: TytulUbezpieczenia;
  dobrowolneChorobowe: boolean;           // dla zlecenia/działalności
  dniNieprzerwanegoUbezpieczeniaChorobowego: number; // w dniu zdarzenia (z uwzględnieniem przerw <= 30 dni)
  ubezpieczonaWDniuPorodu: boolean;
  zadluzenieSkladkowePLN?: number;        // dotyczy działalności / osób opłacających składki same za siebie
  liczbaUbezpieczonychPlatnika?: number;
  przynajmniej10LatObowiazkowegoUbezp?: boolean;
}
export interface UprawnieniaWynik {
  zasilekChorobowyWCiazy: { przysluguje: boolean; powod: string };
  zasilekMacierzynski: { przysluguje: boolean; powod: string; zawieszonyDoSplatyZadluzenia?: boolean };
  alternatywa?: string;
  kwotaProguZadluzenia: number;
  ktoWyplaca: "pracodawca" | "ZUS";
  ostrzezenia: string[];
}
export function uprawnienia(w: UprawnieniaWejscie, p: Parametry): UprawnieniaWynik {
  const ostrzezenia: string[] = [];
  const maChorobowe = w.tytul === "umowa_o_prace" || ((w.tytul === "zlecenie" || w.tytul === "dzialalnosc") && w.dobrowolneChorobowe);
  const obowiazkowe = w.tytul === "umowa_o_prace";
  const karencja = obowiazkowe ? p.limity_dni.karencja_ubezpieczenie_obowiazkowe_dni : p.limity_dni.karencja_ubezpieczenie_dobrowolne_dni;
  let chor = { przysluguje: false, powod: "" };
  if (!maChorobowe) chor.powod = "Brak ubezpieczenia chorobowego (zlecenie/działalność bez dobrowolnego chorobowego, umowa o dzieło, brak tytułu).";
  else if (w.dniNieprzerwanegoUbezpieczeniaChorobowego > karencja || (obowiazkowe && w.przynajmniej10LatObowiazkowegoUbezp)) chor = { przysluguje: true, powod: `Spełniono okres wyczekiwania (${karencja} dni).` };
  else chor.powod = `Okres wyczekiwania ${karencja} dni nie upłynął (jest ${w.dniNieprzerwanegoUbezpieczeniaChorobowego}).`;
  let mac = { przysluguje: false, powod: "", zawieszonyDoSplatyZadluzenia: false as boolean };
  if (!maChorobowe) mac.powod = "Brak ubezpieczenia chorobowego w dniu porodu.";
  else if (!w.ubezpieczonaWDniuPorodu) mac.powod = "Ubezpieczenie chorobowe nie trwało w dniu porodu (art. 29 ust. 1) — wyjątki: art. 30 (upadłość/likwidacja/śmierć pracodawcy, wyrok sądu).";
  else {
    mac = { przysluguje: true, powod: "Ubezpieczona w dniu porodu — okres wyczekiwania nie dotyczy zasiłku macierzyńskiego.", zawieszonyDoSplatyZadluzenia: false };
    const prog = progZadluzenia(p);
    if (w.tytul === "dzialalnosc" && (w.zadluzenieSkladkowePLN ?? 0) > prog) {
      mac.zawieszonyDoSplatyZadluzenia = true;
      mac.powod += ` UWAGA: zadłużenie ${w.zadluzenieSkladkowePLN} zł > próg ${prog} zł (1 % płacy min.) w dniu powstania prawa — wypłata po spłacie CAŁOŚCI zadłużenia; prawo przedawnia się, jeśli nie spłacisz w ${p.limity_dni.przedawnienie_przy_zadluzeniu_miesiace} mies. (art. 2a).`;
      ostrzezenia.push(mac.powod);
    }
  }
  const alt = !mac.przysluguje ? `Rozważ świadczenie rodzicielskie (${p.kwoty.swiadczenie_rodzicielskie_miesieczne} zł/mies., ustawa o świadczeniach rodzinnych, art. 17c) — wniosek do gminy/ośrodka pomocy społecznej, nie do ZUS.` : undefined;
  const duzy = (w.liczbaUbezpieczonychPlatnika ?? 0) > p.platnik.prog_liczby_ubezpieczonych_powyzej;
  return { zasilekChorobowyWCiazy: chor, zasilekMacierzynski: mac, alternatywa: alt, kwotaProguZadluzenia: progZadluzenia(p), ktoWyplaca: w.tytul === "umowa_o_prace" && duzy ? "pracodawca" : "ZUS", ostrzezenia };
}

// =====================================================================
// 6. TERMINY (wymóg g) i łączenie z pracą (wymóg c) — pomocnicze
// =====================================================================
export interface Termin { co: string; do?: string; od?: string; podstawa: string }
export function terminy(w: { tytul: PlanWejscie["tytul"]; dataZdarzenia: string; plan: PlanWynik }, p: Parametry): Termin[] {
  const t: Termin[] = [];
  const T = p.terminy_dni;
  if (w.tytul === "porod") {
    t.push({ co: "Wniosek matki o zasiłek w pełnym wymiarze (wariant 81,5 %) — nieprzekraczalnie", do: dodajDni(w.dataZdarzenia, T.wniosek_pelny_wymiar_81_5_po_porodzie), podstawa: "art. 30a ust. 1 ustawy zasiłkowej" });
  } else {
    t.push({ co: "Wniosek o urlop na warunkach urlopu macierzyńskiego (do pracodawcy)", do: dodajDni(w.dataZdarzenia, T.adopcja_wniosek_o_urlop_po_przyjeciu_dziecka), podstawa: "art. 183 § 6 KP" });
    t.push({ co: "Najpóźniejszy start urlopu na warunkach urlopu macierzyńskiego", do: dodajDni(w.dataZdarzenia, T.adopcja_start_urlopu_najpozniej_po_przyjeciu), podstawa: "art. 183 § 6 KP" });
    t.push({ co: "Wniosek o zasiłek w pełnym wymiarze (81,5 %)", do: dodajDni(w.dataZdarzenia, T.adopcja_wniosek_81_5_po_przyjeciu), podstawa: "art. 30a ust. 2" });
  }
  for (const o of w.plan.okresy) {
    if (o.rodzaj.startsWith("rodzicielski")) t.push({ co: `Wniosek o urlop rodzicielski (${o.kto}) od ${o.od}`, do: dodajDni(o.od, -T.wniosek_urlop_rodzicielski_przed_startem), podstawa: "art. 1821d § 1 KP" });
    if (o.rodzaj === "ojcowski") t.push({ co: `Wniosek o urlop ojcowski od ${o.od}`, do: dodajDni(o.od, -T.wniosek_urlop_ojcowski_przed_startem), podstawa: "art. 1823 § 2 KP" });
    t.push({ co: `Przedawnienie roszczenia o zasiłek za okres do ${o.do}`, do: dodajMiesiace(o.do, p.limity_dni.przedawnienie_zasilku_miesiace), podstawa: "art. 67 ustawy zasiłkowej" });
  }
  return t;
}

// =====================================================================
// 7. MOST Z DRUKU Z-3 -> silnik (dla parsera wniosków)
// Tabela 1 druku Z-3 "Składniki wynagrodzenia za okresy miesięczne", kolumny:
//  3 dni przepracowane, 4 dni obowiązany przepracować, 5 przyczyna, 6 stałe w PEŁNEJ wysokości (z umowy),
//  7 zmienne pomniejszone proporcjonalnie, 8 premie i inne w kwocie FAKTYCZNEJ, 9 procent potrąconej składki.
// Reguły uzupełniania: Załącznik ZUS, sekcja 4 (mniej niż połowa czasu -> miesiąc wyłączony;
// co najmniej połowa -> stałe w pełnej kwocie + zmienne/dni_przepracowane*dni_obowiązany).
// =====================================================================
export interface WierszZ3Miesieczny {
  rok: number; miesiac: number;
  dniPrzepracowal: number; dniObowiazany: number;
  stale?: number; zmiennePomniejszone?: number; premieFaktyczne?: number;
  procentSkladki?: number;               // kol. 9 — uwaga: może różnić się od 13,71 % (np. brak składki emerytalnej)
}
export function wierszZ3NaMiesiac(w: WierszZ3Miesieczny): MiesiacWynagrodzenia {
  const id = `${w.rok}-${String(w.miesiac).padStart(2, "0")}`;
  const stale = w.stale ?? 0, zm = w.zmiennePomniejszone ?? 0, prem = w.premieFaktyczne ?? 0;
  const pelny = w.dniPrzepracowal >= w.dniObowiazany;
  const mniejNizPolowa = w.dniPrzepracowal * 2 < w.dniObowiazany;
  const zmUzup = pelny || w.dniPrzepracowal === 0 ? zm : zm / w.dniPrzepracowal * w.dniObowiazany;
  return { miesiac: id, kwota: r2(stale + zm + prem), kwotaUzupelniona: r2(stale + zmUzup + prem), mniejNizPolowaCzasuPracy: mniejNizPolowa };
}

// =====================================================================
// 8. ZASIŁEK CHOROBOWY W CIĄŻY (wymóg a) — kto płaci i ile
// W ciąży (kod B) zasiłek = 100 % podstawy od 1. dnia (art. 11 ust. 2 pkt 1). Pierwsze 33 dni (14 dla >= 50 lat)
// w roku kalendarzowym płaci pracodawca (wynagrodzenie chorobowe), dalej ZUS (zasiłek). Okres zasiłkowy w ciąży: 270 dni.
// =====================================================================
export interface ChorobowyCiazaWejscie {
  podstawaMiesieczna: number;
  dniNiezdolnosci: number;               // suma dni z e-ZLA z kodem B
  pracownik: boolean;                    // tylko pracownik ma wynagrodzenie chorobowe od pracodawcy
  wiek50Plus?: boolean;
  dniWynagrodzeniaJuzWykorzystaneWRoku?: number;
}
export function zasilekChorobowyWCiazy(w: ChorobowyCiazaWejscie, p: Parametry) {
  const limitPrac = w.wiek50Plus ? p.limity_dni.wynagrodzenie_chorobowe_dni_od_50_lat : p.limity_dni.wynagrodzenie_chorobowe_dni_do_50_lat;
  const dostepne = w.pracownik ? Math.max(0, limitPrac - (w.dniWynagrodzeniaJuzWykorzystaneWRoku ?? 0)) : 0;
  const dniPracodawca = Math.min(w.dniNiezdolnosci, dostepne);
  const dniZUS = w.dniNiezdolnosci - dniPracodawca;
  const dzienna = w.podstawaMiesieczna * pr(p, "zasilek_chorobowy_w_ciazy") / 100 / p.limity_dni.dni_w_miesiacu_dla_zasilkow;
  const ostrz: string[] = [];
  if (w.dniNiezdolnosci > p.limity_dni.okres_zasilkowy_ciaza_dni) ostrz.push(`Przekroczono okres zasiłkowy w ciąży (${p.limity_dni.okres_zasilkowy_ciaza_dni} dni) — rozważ świadczenie rehabilitacyjne (${pr(p, "swiadczenie_rehabilitacyjne_w_ciazy")} % w ciąży).`);
  return { dniPracodawca, dniZUS, kwotaPracodawca: r2(dzienna * dniPracodawca), kwotaZUS: r2(dzienna * dniZUS), kwotaRazem: r2(dzienna * w.dniNiezdolnosci), dzienna: r2(dzienna), ostrzezenia: ostrz };
}

// =====================================================================
// 9. ŚWIADCZENIE REHABILITACYJNE (wymóg a): 90 % przez pierwsze 3 mies., potem 75 %, w ciąży 100 % (art. 19 ust. 1)
// Podstawa = podstawa wymiaru zasiłku chorobowego (waloryzacja art. 19 ust. 2 — NIE zaimplementowana). Miesiąc = 30 dni.
// Maks. 12 miesięcy (art. 18 ust. 2).
// =====================================================================
export function swiadczenieRehabilitacyjne(w: { podstawaMiesieczna: number; dni: number; wCiazy?: boolean }, p: Parametry) {
  const M = p.limity_dni.dni_w_miesiacu_dla_zasilkow;
  const dni = Math.min(w.dni, 12 * M);
  const pierwsze = Math.min(dni, 3 * M), reszta = dni - pierwsze;
  const pr1 = w.wCiazy ? pr(p, "swiadczenie_rehabilitacyjne_w_ciazy") : pr(p, "swiadczenie_rehabilitacyjne_pierwsze_3_mies");
  const pr2 = w.wCiazy ? pr(p, "swiadczenie_rehabilitacyjne_w_ciazy") : pr(p, "swiadczenie_rehabilitacyjne_po_3_mies");
  const k1 = w.podstawaMiesieczna * pr1 / 100 / M * pierwsze, k2 = w.podstawaMiesieczna * pr2 / 100 / M * reszta;
  return { dniPierwsze3Mies: pierwsze, procentPierwsze: pr1, dniPozniej: reszta, procentPozniej: pr2, kwota: r2(k1 + k2), ograniczonoDo12Mies: w.dni > 12 * M,
    uwaga: "Prawo do świadczenia orzeka lekarz orzecznik ZUS; waloryzacja podstawy (art. 19 ust. 2) niezaimplementowana." };
}

// =====================================================================
// 10. ŚWIADCZENIE RODZICIELSKIE (alternatywa dla osób bez zasiłku) — ustawa o świadczeniach rodzinnych, art. 17c
// 1000 zł/mies.; 52/65/67/69/71 tyg. wg liczby dzieci; wydłużenie o hospitalizację (ust. 3a) — tu: parametr dodatkoweTygodnie.
// UWAGA: za niepełny miesiąc dzielimy przez liczbę DNI KALENDARZOWYCH miesiąca (art. 17c ust. 7), NIE przez 30 jak w zasiłku.
// =====================================================================
export function swiadczenieRodzicielskie(w: { liczbaDzieci: number; odDnia: string; dodatkoweTygodnie?: number }, p: Parametry) {
  const t = p.wymiary_tygodnie.swiadczenie_rodzicielskie_tygodnie;
  const tyg = (w.liczbaDzieci >= 5 ? t["5_i_wiecej"] : t[String(Math.max(1, Math.floor(w.liczbaDzieci)))]) + (w.dodatkoweTygodnie ?? 0);
  const dniOkres = tyg * 7;
  const doDnia = dodajDni(w.odDnia, dniOkres - 1);
  let kwota = 0, d = w.odDnia;
  while (toMs(d) <= toMs(doDnia)) {
    const y = +d.slice(0, 4), m = +d.slice(5, 7);
    const dniMies = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const koniecMies = `${y}-${String(m).padStart(2, "0")}-${String(dniMies).padStart(2, "0")}`;
    const koniec = toMs(koniecMies) < toMs(doDnia) ? koniecMies : doDnia;
    const dniWMies = dniMiedzy(d, koniec) + 1;
    kwota += p.kwoty.swiadczenie_rodzicielskie_miesieczne * (dniWMies / dniMies);
    d = dodajDni(koniec, 1);
  }
  return { tygodnie: tyg, od: w.odDnia, do: doDnia, kwotaMiesieczna: p.kwoty.swiadczenie_rodzicielskie_miesieczne, kwotaRazem: r2(kwota), uwaga: "Wniosek do gminy / ośrodka pomocy społecznej (nie ZUS); świadczenie nie przysługuje przy pobieraniu zasiłku macierzyńskiego za ten sam okres." };
}
