import { dodajDni, dodajMiesiace } from "../engine/kalkulator";

export function zakresUrlopuOjcowskiego(
  urodzenie: string, poczatek: string, dni: number, dzisiaj: string, limitMiesiecy: number,
) {
  if (!urodzenie || urodzenie > dzisiaj) return { blad: "Wpisz datę urodzenia dziecka. Wniosek przygotujesz po narodzinach." };
  if (!poczatek || poczatek < urodzenie) return { blad: "Podaj datę rozpoczęcia urlopu przypadającą w dniu narodzin dziecka lub później." };
  const koniec = dodajDni(poczatek, dni - 1);
  if (koniec >= dodajMiesiace(urodzenie, limitMiesiecy)) return { blad: "Urlop musi się skończyć przed upływem limitu wieku dziecka." };
  return { koniec };
}
