/*
 * Wyszukiwarka „Opisz sprawę własnymi słowami" — warstwa luźnego języka.
 *
 * Najpierw pytamy dotychczasowy silnik (`szukaj` z sprawy.ts: intencje + dopasowanie słów). Gdy on nic nie znajdzie,
 * rozpoznajemy w zapytaniu „pojęcia" (tata/ojciec/mąż/partner, bliźniaki/poród mnogi, urlop, pieniądze/zasiłek,
 * JDG/firma/działalność…) po rdzeniach słów, więc odmiany i potoczne słowa też trafiają. Każda sprawa i każde pytanie
 * z poradnika ma wagi pojęć; liczy się suma, więc częściowe trafienie też daje wynik. Gdy nic nie jest pewne, zwracamy
 * 2–4 najbliższe sprawy zamiast pustej listy. Wszystko liczy się lokalnie, w przeglądarce.
 */
import { SPRAWY, sprawa, szukaj, zapytanieMaSens, type Sprawa } from "./sprawy";

type Faq = { id: string; pytanie: string; odpowiedz: string; kroki?: string[] };

export interface WynikWyszukiwania<T extends Faq> {
  /** Sprawy, które pasują na pewno (puste, gdy brak jednoznacznego wyniku). */
  sprawy: Sprawa[];
  /** Pytania i odpowiedzi z poradnika. */
  faq: T[];
  /** Gdy `sprawy` jest puste: 2–4 najbliższe sprawy do wyboru (nigdy pusta lista). */
  podobne: Sprawa[];
  /** Czy `podobne` wynikają z zapytania (true), czy to tylko najczęstsze sprawy (false). */
  podobneZZapytania: boolean;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ł/g, "l");
const tokeny = (s: string) => norm(s).match(/\d+(?:[,.]\d+)?%?|[a-z][a-z0-9]*/g) ?? [];

/** Pojęcia: `p` to początki słów (rdzenie), `d` to dokładne słowa (krótkie, żeby nie łapać przypadkowych). */
const POJECIA: Record<string, { p?: string[]; d?: string[] }> = {
  ojciec: { p: ["ojc", "tatus", "tatk", "tatu", "partnerow"], d: ["tata", "taty", "tacie", "tato", "tate", "maz", "meza", "mezem", "mezowi", "mezu", "partner", "partnera", "partnerem", "facet", "chlopak", "narzeczony", "narzeczonego"] },
  mama: { p: ["mam", "matk", "matc", "partnerk", "zon", "narzeczon"] },
  blizniaki: { p: ["blizni", "blizn", "trojacz", "czworacz", "mnog"], d: ["dwoje", "dwojka", "dwojke", "dwojga", "troje", "trojka", "trojke"] },
  urlop: { p: ["urlop", "wolne", "wolnego", "opiek", "siedziec", "zostac w domu"] },
  pieniadze: { p: ["zasil", "pieniad", "pieniedz", "kas", "wyplat", "wyplac", "swiadcz", "kwot", "dostan", "dostac", "dostaj", "zaplac", "placi", "wynagrodz", "pensj", "ile wynosi", "ile bede", "kosiniak", "tysiac", "procent"], d: ["ile", "1000", "100%", "80%", "70%", "81,5%", "81.5%"] },
  porod: { d: ["rodzila", "rodzilam", "rodzilas"], p: ["urodz", "porod", "narodz", "noworod", "rozwiaz", "cesar"] },
  ciaza: { p: ["ciaz", "spodziew", "oczekuj"] },
  jdg: { p: ["jdg", "firm", "dzialaln", "samozatrud", "b2b", "przedsiebior", "ceidg", "skladk"] },
  zlecenie: { p: ["zlecen", "dzielo", "umowa o", "umowie"] },
  l4: { p: ["zwolnien", "chorob", "lekarz", "ezla", "e-zla"], d: ["l4", "zla"] },
  pracodawca: { p: ["pracodawc", "szef", "kadr", "kierown", "przelozon"], d: ["hr"] },
  macierzynski: { p: ["macierz"] },
  rodzicielski: { p: ["rodziciel"] },
  ojcowski: { p: ["ojcowsk", "tacierz"] },
  adopcja: { p: ["adop", "przysposob", "zastepcz"] },
  praca: { p: ["pracowac", "pracuj", "etat", "dorab", "wroc", "powrot", "zarab", "polaczyc", "laczyc"] },
  terminy: { p: ["termin", "spozn", "przegap", "przedawn", "zdaz", "zapomn", "czasu"], d: ["kiedy"] },
  dokumenty: { p: ["dokument", "zaswiadcz", "zalacz", "papier"] },
  wniosek: { p: ["wnios", "druk", "formular", "zglos", "zlozyc"], d: ["zam"] },
  akt: { p: ["odpis", "usc"], d: ["akt", "aktu"] },
  strata: { p: ["poron", "martw", "zmarl", "smierc", "zgon", "strat", "zalob", "umarl"] },
  wczesniak: { p: ["wczesniak", "przedwczes", "szpital", "inkubator"] },
  podzial: { p: ["podziel", "podzial", "oboje", "razem", "jednoczesn", "naraz", "przejac", "przejm", "oddac", "odstap"], d: ["dzielic", "dzielimy", "dzielenie"] },
  kolejne: { p: ["kolejn", "nastepn"], d: ["drugie", "drugim", "trzecie", "trzecim"] },
  utrataPracy: { p: ["upadl", "bezrobot", "wypowiedz", "stracil", "zwolnil", "likwidac"] },
  umowa: { p: ["okreslon", "umow"] },
  zaZyciem: { p: ["zyciem", "niepelnospr", "wada", "wady"] },
  podstawa: { p: ["podstaw", "wylicz", "oblicz", "liczy"] },
  bezPrawa: { p: ["student", "bezrobot", "nie przysluguje", "nie nalezy"] },
  zmiana: { p: ["zmian", "zmienil", "przerw"] },
  prawo: { p: ["nalez", "przyslug", "prawo", "prawa", "uprawn"] },
  wsparcie: { p: ["wsparc", "psycholog", "zalam", "smut"] },
};

/** Jedna litera różnicy (literówka), tylko dla dłuższych słów. */
export function jednaRoznica(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length < b.length ? a.slice(i) === b.slice(i + 1) : a.slice(i + 1) === b.slice(i);
}

/** Dokładne dopasowanie: całe słowo z listy `d` albo początek słowa z listy `p`. */
function pasuje(slowo: string, { p = [], d = [] }: { p?: string[]; d?: string[] }): boolean {
  return d.some((x) => norm(x) === slowo) || p.some((r) => !r.includes(" ") && slowo.startsWith(r));
}

/** Dopasowanie z jedną literówką (np. „bliżniaki", „urlpo"), tylko dla dłuższych rdzeni. */
function pasujeZLiterowka(slowo: string, { p = [] }: { p?: string[] }): boolean {
  // Przy krótkich rdzeniach pierwsze trzy litery muszą się zgadzać („pogoda" to nie „poród").
  return p.some((r) => !r.includes(" ") && r.length >= 5 && (r.length >= 6 || slowo.slice(0, 3) === r.slice(0, 3)) &&
    ((slowo.length >= r.length && jednaRoznica(slowo.slice(0, r.length), r)) ||
     (slowo.length >= r.length + 1 && jednaRoznica(slowo.slice(0, r.length + 1), r))));
}

/** Pojęcia rozpoznane w zapytaniu. Frazy kilkuwyrazowe (np. „umowa o", „zostać w domu") sprawdzamy w całym tekście. */
export function pojecia(q: string): Set<string> {
  const slowa = tokeny(q);
  const tekst = " " + slowa.join(" ") + " ";
  const definicje = Object.entries(POJECIA);
  const wynik = new Set<string>();
  for (const [nazwa, def] of definicje) {
    const frazy = (def.p ?? []).filter((r) => r.includes(" "));
    if (slowa.some((w) => pasuje(w, def)) || frazy.some((f) => tekst.includes(" " + f))) wynik.add(nazwa);
  }
  // Literówki sprawdzamy tylko dla słów, które nie pasują dokładnie do żadnego pojęcia (żeby „zwolnienie" nie stało się „zwolnił").
  for (const w of slowa) {
    if (w.length < 5 || definicje.some(([, def]) => pasuje(w, def))) continue;
    for (const [nazwa, def] of definicje) if (pasujeZLiterowka(w, def)) wynik.add(nazwa);
  }
  // „mam"/„mamy" to zwykle czasownik („mamy bliźniaki"): liczymy mamę tylko przy innym słowie.
  if (wynik.has("mama") && !slowa.some((w) => w !== "mam" && w !== "mamy" && pasuje(w, POJECIA.mama))) wynik.delete("mama");
  // „pracodawca" nie jest pracą na urlopie.
  if (wynik.has("praca") && !slowa.some((w) => !w.startsWith("pracodaw") && pasuje(w, POJECIA.praca))) wynik.delete("praca");
  // Tata + urlop (bez dzielenia się) to zwykle urlop ojcowski.
  if (wynik.has("ojciec") && wynik.has("urlop") && !wynik.has("podzial")) wynik.add("ojcowski");
  // „ile" samo w sobie to za mało na pieniądze, gdy pytanie jest o czas („ile tygodni", „ile mam czasu").
  if (wynik.has("pieniadze") && slowa.some((w) => /^(tygodn|dni|miesi|czasu)/.test(w)) &&
      !slowa.some((w) => w !== "ile" && pasuje(w, POJECIA.pieniadze))) wynik.delete("pieniadze");
  return wynik;
}

/** Wagi pojęć dla spraw (ile dane pojęcie mówi o tej sprawie). */
const WAGI_SPRAW: Record<string, Record<string, number>> = {
  "co-przysluguje": { prawo: 2, jdg: 3, zlecenie: 3, bezPrawa: 2, pieniadze: 1, ciaza: 1, zmiana: 1, umowa: 1 },
  "zwolnienie-ciaza": { l4: 4, ciaza: 2, pieniadze: 1 },
  "wniosek-zasilek": { pieniadze: 3, porod: 2, macierzynski: 3, wniosek: 2, blizniaki: 2, mama: 1, rodzicielski: 1, podstawa: 1 },
  "urlop-pracodawca": { pracodawca: 4, ojcowski: 4, urlop: 2, wniosek: 1, macierzynski: 1, rodzicielski: 1, ojciec: 1 },
  "podzial-urlopu": { podzial: 4, ojciec: 2, mama: 1, urlop: 1, rodzicielski: 2, blizniaki: 1 },
  "praca-na-urlopie": { praca: 4, urlop: 1, rodzicielski: 1 },
  adopcja: { adopcja: 5 },
  "trudna-sytuacja": { strata: 5, wczesniak: 4, wsparcie: 2 },
  terminy: { terminy: 4, wniosek: 1 },
  "odpis-aktu": { akt: 5, dokumenty: 2 },
};

/** Wagi pojęć dla pytań poradnika (po identyfikatorze pytania). */
const WAGI_FAQ: Record<string, Record<string, number>> = {
  F01: { ciaza: 2, l4: 3, pieniadze: 1 },
  F02: { ciaza: 1, l4: 2 },
  F03: { ciaza: 1, l4: 1 },
  F04: { ciaza: 2, utrataPracy: 4 },
  F05: { pracodawca: 2, utrataPracy: 3, ciaza: 1 },
  F06: { umowa: 3, ciaza: 1 },
  F07: { macierzynski: 3, blizniaki: 4, urlop: 1, porod: 1, mama: 1 },
  F08: { pieniadze: 4, porod: 1, macierzynski: 1 },
  F09: { pieniadze: 1, terminy: 2, wniosek: 1 },
  F10: { podstawa: 4, pieniadze: 1 },
  F11: { ojciec: 3, macierzynski: 2, podzial: 2 },
  F12: { podzial: 4, rodzicielski: 2, ojciec: 1, mama: 1, urlop: 1 },
  F13: { praca: 4, rodzicielski: 1 },
  F14: { ojcowski: 5, ojciec: 3, urlop: 2, blizniaki: 1, porod: 1 },
  F15: { wczesniak: 5 },
  F16: { zaZyciem: 5 },
  F17: { wniosek: 2, pracodawca: 1, pieniadze: 1 },
  F18: { dokumenty: 4, wniosek: 1 },
  F19: { terminy: 4 },
  F20: { jdg: 5 },
  F21: { prawo: 1, bezPrawa: 4, zlecenie: 1, pieniadze: 1 },
  F22: { zmiana: 3, umowa: 1 },
  F23: { adopcja: 5 },
  F24: { strata: 5 },
  F25: { strata: 2, ojciec: 2, mama: 1 },
  F26: { strata: 3, wczesniak: 2, wsparcie: 3 },
  F27: { akt: 5 },
  F28: { kolejne: 5, macierzynski: 2, ciaza: 1 },
};

/** Najczęstsze sprawy po porodzie: gdy z zapytania nic nie wynika, i tak pokazujemy, od czego zacząć. */
export const NAJCZESTSZE = ["wniosek-zasilek", "urlop-pracodawca", "podzial-urlopu", "co-przysluguje"];

const ocena = (wagi: Record<string, number> | undefined, p: Set<string>) =>
  wagi ? [...p].reduce((s, x) => s + (wagi[x] ?? 0), 0) : 0;

/** Czy da się coś wyszukać: zwykłe słowa (jak dotąd) albo choć jedno rozpoznane pojęcie (np. „ile dostanę"). */
export function maSens(q: string): boolean {
  return zapytanieMaSens(q) || pojecia(q).size > 0;
}

/** Próg „pewnego" wyniku z pojęć (suma wag). */
const PROG_PEWNY = 4;

export function szukajLuzno<T extends Faq>(q: string, faq: T[]): WynikWyszukiwania<T> {
  const p = pojecia(q);
  const bazowy = zapytanieMaSens(q) ? szukaj(q, faq) : { sprawy: [] as Sprawa[], faq: [] as T[] };

  const rankingSpraw = SPRAWY.map((s) => ({ s, o: ocena(WAGI_SPRAW[s.id], p) }))
    .filter((x) => x.o > 0).sort((a, b) => b.o - a.o);
  const rankingFaq = faq.map((f) => ({ f, o: ocena(WAGI_FAQ[f.id], p) }))
    .filter((x) => x.o >= 3).sort((a, b) => b.o - a.o);
  const faqZPojec = rankingFaq.slice(0, 3).map((x) => x.f);

  // 1) Dotychczasowy silnik coś znalazł: zostawiamy jego wynik, najwyżej uzupełniamy pytania z poradnika.
  // Mocne pytania z pojęć (np. F14 przy „tata chce urlop") dokładamy na koniec, jeśli jest miejsce.
  if (bazowy.sprawy.length) {
    const mocne = rankingFaq.filter((x) => x.o >= 5).map((x) => x.f);
    const fq = bazowy.faq.length ? [...new Set([...bazowy.faq, ...mocne])].slice(0, Math.max(3, bazowy.faq.length)) : faqZPojec;
    return { sprawy: bazowy.sprawy, faq: fq, podobne: [], podobneZZapytania: true };
  }

  // 2) Pojęcia dają mocny wynik: pokazujemy go jako pasujące sprawy.
  const najlepsza = rankingSpraw[0]?.o ?? 0;
  if (najlepsza >= PROG_PEWNY) {
    const sprawy = rankingSpraw.filter((x) => x.o >= Math.max(3, najlepsza * 0.6)).slice(0, 3).map((x) => x.s);
    const fq = bazowy.faq.length ? bazowy.faq : faqZPojec;
    return { sprawy, faq: fq, podobne: [], podobneZZapytania: true };
  }

  // 3) Brak pewnego wyniku: 2–4 najbliższe sprawy (z pojęć, dopełnione najczęstszymi).
  const zPojec = rankingSpraw.slice(0, 4).map((x) => x.s);
  const podobne = [...zPojec];
  for (const id of NAJCZESTSZE) {
    if (podobne.length >= (zPojec.length ? Math.min(4, Math.max(2, zPojec.length + 1)) : 3)) break;
    const s = sprawa(id);
    if (s && !podobne.includes(s)) podobne.push(s);
  }
  const fq = bazowy.faq.length ? bazowy.faq : faqZPojec;
  return { sprawy: [], faq: fq, podobne: podobne.slice(0, 4), podobneZZapytania: zPojec.length > 0 };
}
