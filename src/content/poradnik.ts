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
  | { typ: "wynik"; tytul: string; pytania: string[]; druki: string[]; kalkulator?: { tryb: string; opcja?: string } };

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
  const kalk = (t: string) => ({ href: `/kalkulator?tryb=${t}`, etykieta: "Policz w kalkulatorze" });
  switch (k.tryb) {
    case "matka": case "uprawnienia_matka": return kalk("matka");
    case "ojciec": case "oboje_rodzice": case "porownanie_wariantow": return kalk("oboje");
    case "praca_i_urlop": return kalk("laczenie");
    case "adopcja": return kalk("adopcja");
    case "podstawa": return kalk("wlasne");
    case "chorobowe_w_ciazy": case "rehabilitacja": case "uprawnienia": case "swiadczenie_rodzicielskie":
      return { href: "/ciaza", etykieta: "Sprawdź w module „W ciąży”" };
    case "terminy": case "dokumenty": return { href: "/dokumenty", etykieta: "Dokumenty i terminy" };
    case "wczesniak": case "martwe_dziecko": return { href: "/trudne", etykieta: "Trudne sytuacje – co przysługuje" };
  }
  return null;
}

export const STATUS_OPIS: Record<Status, string> = {
  ok: "",
  do_potwierdzenia: "Sprawdź w ZUS – nasze źródła są w tym miejscu niepewne lub niespójne.",
  luka: "Ten przypadek nie jest opisany w naszych źródłach – nie podajemy wyniku. Skonsultuj się z ZUS.",
};
