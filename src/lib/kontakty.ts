// Ogólnie znane, pewne kontakty: numery alarmowe, infolinia ZUS i bezpłatne linie wsparcia.
// Używane na /trudne; mogą z nich korzystać też Poradnik i stopka. Nie dopisuj numerów, których nie da się sprawdzić
// na oficjalnej stronie – lepiej podać samą nazwę z linkiem do strony.

export type Kontakt = {
  id: string;
  /** Krótka nazwa do wyświetlenia. */
  nazwa: string;
  /** Jedno proste zdanie: kiedy dzwonić. */
  opis: string;
  /** Numer w zapisie dla ludzi, np. "22 560 16 00". */
  telefon?: string;
  godziny?: string;
  /** Oficjalna strona (https). */
  www?: string;
};

/** Odnośnik tel: z numeru zapisanego ze spacjami. */
export function telLink(telefon: string): string {
  return `tel:${telefon.replace(/[^\d+]/g, "")}`;
}

/** Adres strony bez https:// i www, do wyświetlenia. */
export function krotkiAdres(www: string): string {
  return www.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export const NUMER_ALARMOWY: Kontakt = {
  id: "112",
  nazwa: "Numer alarmowy",
  opis: "Gdy zagrożone jest życie lub zdrowie Twoje albo dziecka.",
  telefon: "112",
  godziny: "całą dobę",
};

export const CENTRUM_WSPARCIA: Kontakt = {
  id: "centrum-wsparcia",
  nazwa: "Centrum Wsparcia dla Osób Dorosłych w Kryzysie Psychicznym",
  opis: "Bezpłatna rozmowa z psychologiem, gdy jest Ci bardzo ciężko.",
  telefon: "800 70 2222",
  godziny: "całą dobę, 7 dni w tygodniu",
  www: "https://centrumwsparcia.pl",
};

export const TELEFON_ZAUFANIA_DOROSLI: Kontakt = {
  id: "116-123",
  nazwa: "Telefon zaufania dla dorosłych",
  opis: "Bezpłatna, anonimowa rozmowa w kryzysie emocjonalnym.",
  telefon: "116 123",
  www: "https://116sos.pl",
};

export const TELEFON_ZAUFANIA_DZIECI: Kontakt = {
  id: "116-111",
  nazwa: "Telefon zaufania dla dzieci i młodzieży",
  opis: "Bezpłatna pomoc dla dzieci i nastolatków, np. starszego rodzeństwa w żałobie.",
  telefon: "116 111",
  godziny: "całą dobę",
  www: "https://116111.pl",
};

export const ZUS_COT: Kontakt = {
  id: "zus-cot",
  nazwa: "Centrum Obsługi Telefonicznej ZUS",
  opis: "Pytania o zasiłek macierzyński, urlopy i wnioski.",
  telefon: "22 560 16 00",
  godziny: "w dni robocze, 7.00–18.00",
  www: "https://www.zus.pl",
};

export const RODZIC_PO_LUDZKU: Kontakt = {
  id: "rodzic-po-ludzku",
  nazwa: "Fundacja Rodzić po Ludzku",
  opis: "Prawa pacjentki w szpitalu i poradnik o poronieniu oraz urodzeniu martwego dziecka.",
  www: "https://rodzicpoludzku.pl",
};

/** Ramka „Potrzebujesz pomocy teraz?”: kolejność od najpilniejszego. */
export const POMOC_TERAZ: Kontakt[] = [NUMER_ALARMOWY, CENTRUM_WSPARCIA, ZUS_COT];

/** Wszystkie pewne kontakty (np. do stopki lub Poradnika). */
export const KONTAKTY: Kontakt[] = [NUMER_ALARMOWY, CENTRUM_WSPARCIA, TELEFON_ZAUFANIA_DOROSLI, TELEFON_ZAUFANIA_DZIECI, ZUS_COT, RODZIC_PO_LUDZKU];

/** Organizacje spoza data/wsparcie.json, dobrane do sytuacji na /trudne (id sytuacji jak w TRUDNE). */
export const KONTAKTY_DLA_SYTUACJI: Record<string, Kontakt[]> = {
  martwe: [RODZIC_PO_LUDZKU],
  ciaza: [RODZIC_PO_LUDZKU],
  zgon: [TELEFON_ZAUFANIA_DZIECI],
  matka: [TELEFON_ZAUFANIA_DZIECI],
};
