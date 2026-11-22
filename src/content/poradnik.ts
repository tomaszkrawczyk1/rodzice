import faqJson from "./poradnik/faq.json";
import drukiJson from "./poradnik/druki.json";
import drzewoJson from "./poradnik/drzewo_decyzyjne.json";

export type Status = "ok" | "do_potwierdzenia" | "luka";
export type Zrodlo = { typ: "excel"; wiersz: number; kol: string[] } | { typ: "json"; id: string };
export type Pytanie = {
  id: string; kategoria: string; status: Status; pytanie: string; odpowiedz: string; kroki?: string[]; druki?: string[];
  zrodla?: Zrodlo[]; powiazane?: string[]; uwaga?: string; kalkulator?: { tryb: string; opcja?: string } | null;
};
export type Druk = {
  id: string; nazwa: string; do_czego: string; kto_sklada: string; gdzie: string; terminy: string[]; uwagi: string[]; tutorial: string[]; pytania: string[];
};
export type Wezel =
  | { typ: "pytanie"; tekst: string; podpowiedz?: string; opcje: { etykieta: string; nastepny: string }[] }
  | {
      typ: "wynik"; tytul: string; pytania: string[]; druki: string[]; kalkulator?: { tryb: string; opcja?: string };
      // Pola opcjonalne, które może mieć węzeł wyniku w drzewo_decyzyjne.json.
      status?: Status; komunikat_luki?: string; ton?: string; wstep?: string;
      cta?: { href?: string; etykieta?: string }; link?: { href: string; etykieta: string }; inne_swiadczenia?: string[];
    };

export const KATEGORIE = faqJson.kategorie as { id: string; nazwa: string }[];
export const PYTANIA = faqJson.pytania as Pytanie[];
export const DRUKI = drukiJson.druki as Druk[];
export const LINK_WZORY = drukiJson.link_wzory_zus as string;
export const DRZEWO = drzewoJson.wezly as unknown as Record<string, Wezel>;
export const DRZEWO_START = drzewoJson.start as string;

export const pytanie = (id: string) => PYTANIA.find((p) => p.id === id);

/** Dokąd prowadzi wynik kreatora/pytania poradnika (tryb z drzewa → podstrona aplikacji). */
export function kalkulatorLink(k?: { tryb: string; opcja?: string } | null): { href: string; etykieta: string } | null {
  if (!k) return null;
  const kalk = (t: string) => ({ href: `/kalkulator?tryb=${t}`, etykieta: "Policz zasiłek w kalkulatorze" });
  switch (k.tryb) {
    case "matka": case "uprawnienia_matka": return kalk("matka");
    case "ojciec": return kalk("ojciec");
    case "oboje_rodzice": case "porownanie_wariantow": return kalk("oboje");
    case "praca_i_urlop": return kalk("laczenie");
    case "adopcja": return kalk("adopcja");
    case "podstawa": return kalk("wlasne");
    case "chorobowe_w_ciazy": case "rehabilitacja":
      return { href: "/ciaza", etykieta: "Sprawdź świadczenia w ciąży" };
    // F21 i ogólne uprawnienia dotyczą też osób po porodzie, więc nie kierujemy ich do strony „w ciąży”.
    // Nie odsyłamy też z powrotem do kreatora („Co mnie dotyczy?”) – to kółko; prowadzimy do sprawy „Co mi przysługuje”.
    case "uprawnienia": case "swiadczenie_rodzicielskie":
      return { href: "/sprawa/co-przysluguje", etykieta: "Sprawdź, co Ci przysługuje" };
    case "terminy": return { href: "/terminarz", etykieta: "Zobacz swój Kalendarz w urzędzie" };
    case "dokumenty": return { href: "/dokumenty", etykieta: "Zobacz, kto wypłaca zasiłek i gdzie złożyć wniosek" };
    case "wczesniak": case "martwe_dziecko": return { href: "/trudne", etykieta: "Poznaj wsparcie w trudnej sytuacji" };
  }
  return null;
}

export const STATUS_OPIS: Record<Status, string> = {
  ok: "",
  do_potwierdzenia: "W tej sprawie przepisy nie są do końca jasne. Warto potwierdzić szczegóły w ZUS.",
  luka: "To nietypowa sytuacja – przepisy nie opisują jej wprost. Najlepiej zapytaj bezpośrednio w ZUS.",
};
