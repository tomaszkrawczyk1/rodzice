import dane from "../../data/wsparcie.json";

export type PodmiotWsparcia = {
  id: string; typy: string[]; nazwa: string; opis: string; telefon: string | null; godziny: string | null; email: string | null;
  www: string; zakres: string; krs: string | null; zrodlo: string; dataSprawdzenia: string; pewnosc: "ok" | "do_potwierdzenia"; uwaga?: string;
};

export const PODMIOTY_WSPARCIA = dane.pozycje as PodmiotWsparcia[];

export const WSPARCIE_UWAGA = "Dane sprawdziliśmy na stronach organizacji. Zanim zadzwonisz, upewnij się, że numer i godziny się nie zmieniły.";

/** Podmioty dla danej sytuacji; "wsparcie" w kreatorze to każda sytuacja. */
export function podmiotyDla(sytuacja: string): PodmiotWsparcia[] {
  return sytuacja === "wsparcie" ? PODMIOTY_WSPARCIA : PODMIOTY_WSPARCIA.filter((p) => p.typy.includes(sytuacja));
}

export function liniaKontaktu(p: PodmiotWsparcia): string {
  return [p.telefon && `tel. ${p.telefon}${p.godziny ? ` (${p.godziny})` : ""}`, p.email, p.www.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")].filter(Boolean).join(", ");
}

/** Odnośnik tel: bez dopisku o numerze wewnętrznym. */
export function telHref(telefon: string): string {
  return `tel:${telefon.split(",")[0].replace(/[^\d+]/g, "")}`;
}
