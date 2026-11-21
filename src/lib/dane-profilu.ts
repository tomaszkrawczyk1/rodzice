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
