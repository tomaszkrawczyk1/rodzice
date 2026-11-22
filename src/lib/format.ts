import { formatyDla, dzis as dzisPL } from "../i18n/formaty.ts";
import type { Jezyk } from "@/i18n/jezyki";

/**
 * Daty, kwoty i liczby. Eksporty poniżej są po polsku (dla kodu, który nie zna języka: API, testy, logika).
 * W komponentach używaj wersji zależnej od języka: `useFormaty()` (klient, z "@/lib/jezyk")
 * albo `await formatyZSerwera()` (serwer, z "@/i18n/serwer"). `formaty(jezyk)` działa wszędzie.
 */
export const formaty = (jezyk: Jezyk) => formatyDla(jezyk);

const PL = formatyDla("pl");
export const { pln, plOk, liczba, dataPL, miesiacPL, dataKrotka, tygodnie, opisObliczenia, opisTerminu } = PL;
export const dzis = dzisPL;

export const RODZAJE: Record<string, string> = {
  macierzynski: "Urlop macierzyński", macierzynski_przed_porodem: "Macierzyński przed porodem", uzupelniajacy: "Uzupełniający urlop macierzyński",
  rodzicielski: "Urlop rodzicielski", rodzicielski_9tyg_drugiego_rodzica: "Rodzicielski – 9 tyg. drugiego rodzica", ojcowski: "Urlop ojcowski",
  na_warunkach_macierzynskiego: "Urlop na warunkach macierzyńskiego",
};
export const KOLORY: Record<string, string> = {
  macierzynski: "#00993f", macierzynski_przed_porodem: "#4cb86f", uzupelniajacy: "#7a4cc4", rodzicielski: "#00416e", rodzicielski_9tyg_drugiego_rodzica: "#0a7fb8",
  ojcowski: "#8a1c4d", na_warunkach_macierzynskiego: "#00993f",
};
