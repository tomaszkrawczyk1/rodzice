export interface UbezpieczenieProfilu {
  tytul: string;
  od: string;
  do: string | null;
  chorobowe: string;
  platnik?: { nazwa: string; nip: string; liczbaUbezpieczonych: number };
}

export interface ZwolnienieProfilu {
  seria_numer: string;
  kodLiterowy?: string;
  od: string;
  do: string;
  dni: number;
  szpital?: boolean;
}

export function nazwaUbezpieczenia(tytul: string) {
  switch (tytul) {
    case "umowa_o_prace": return "Umowa o pracę";
    case "zlecenie": return "Umowa zlecenia";
    case "dzialalnosc": return "Działalność gospodarcza";
    default: return "Inny rodzaj ubezpieczenia";
  }
}

export function rodzajChorobowego(chorobowe: string) {
  switch (chorobowe) {
    case "obowiazkowe": return "obowiązkowe";
    case "dobrowolne": return "dobrowolne";
    case "brak": return "brak";
    default: return "do sprawdzenia";
  }
}

export interface StanZadluzeniaNaDzien {
  naDzien: string;
  kwotaZadluzenia: number;
  prog: number;
  przekroczonyProg: boolean;
  wynik: "nie_dotyczy" | "brak_zadluzenia" | "ponizej_progu" | "powyzej_progu";
  komunikat: string;
  numerZaswiadczenia: string;
  wystawiono: string;
  skladniki: { okres: string; kwota: number; terminPlatnosci: string }[];
}

/** Krótki wynik dla ekranu: czy prawo do zasiłku jest zachowane przy zadłużeniu w wybranym dniu. */
export function wynikZadluzenia(z: Pick<StanZadluzeniaNaDzien, "wynik">) {
  switch (z.wynik) {
    case "powyzej_progu": return "ryzyko: zasiłek po spłacie zadłużenia";
    case "ponizej_progu": return "prawo zachowane (zadłużenie poniżej progu)";
    case "brak_zadluzenia": return "prawo zachowane (brak zadłużenia)";
    default: return "nie dotyczy (składki opłaca płatnik)";
  }
}
