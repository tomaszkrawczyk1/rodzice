// Stan strony głównej zapisany w adresie: etap (`?etap=czekamy`) i zapytanie wyszukiwarki (`?q=urlop+ojcowski`).
// Czyste funkcje, bez dostępu do window, więc da się je testować bez przeglądarki (test/ux.ts).

export type Etap = "plan" | "ciaza" | "dziecko";

/** Wartość parametru `etap` w adresie dla każdego etapu. */
export const ETAP_W_ADRESIE: Record<Etap, string> = { plan: "planuje", ciaza: "czekamy", dziecko: "dziecko" };

/** Etap z parametru adresu; nieznana lub pusta wartość to „brak wyboru" (ekran wyboru etapu). */
export function etapZAdresu(wartosc: string | null | undefined): Etap | null {
  const znaleziony = (Object.keys(ETAP_W_ADRESIE) as Etap[]).find((e) => ETAP_W_ADRESIE[e] === wartosc);
  return znaleziony ?? null;
}

/** Najdłuższe zapytanie, jakie trafia do adresu i do wyszukiwarki. */
export const MAKS_ZAPYTANIA = 200;

/** Zapytanie bez białych znaków na brzegach i z pojedynczymi spacjami w środku, ucięte do MAKS_ZAPYTANIA. */
export function normalizujZapytanie(tekst: string | null | undefined): string {
  return (tekst ?? "").replace(/\s+/g, " ").trim().slice(0, MAKS_ZAPYTANIA).trim();
}
