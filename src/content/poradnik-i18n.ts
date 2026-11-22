// Poradnik i drzewo kreatora w wybranym języku. Pytania tłumaczymy po id (faq.en.ts, faq.uk.ts), a drzewo kreatora
// zwykłym t() z polskim tekstem jako kluczem (słowniki src/i18n). Brak tłumaczenia = zostaje polski tekst.
import type { Jezyk } from "@/i18n/jezyki";
import type { Pytanie } from "./poradnik";
import { FAQ_EN } from "./poradnik/faq.en";
import { FAQ_UK } from "./poradnik/faq.uk";

const FAQ = { en: FAQ_EN, uk: FAQ_UK } as const;

/** Pytanie poradnika z tekstami w wybranym języku (id, status, druki i powiązania zostają takie same). */
export function pytanieWJezyku(p: Pytanie, jezyk: Jezyk): Pytanie {
  if (jezyk === "pl") return p;
  const tl = FAQ[jezyk][p.id];
  if (!tl) return p;
  return { ...p, pytanie: tl.pytanie, odpowiedz: tl.odpowiedz, kroki: tl.kroki ?? p.kroki };
}
