import type { ReactNode } from "react";

// Własne ikony kafli i wyszukiwarki: linie 2,2 px na siatce 48 px, kolor z `currentColor`
// (dzięki temu zmieniają barwę przy najechaniu, w kaflu wyróżnionym i w trybie wysokiego kontrastu).
const IKONY: Record<string, ReactNode> = {
  plan: <><path d="M24 41V22" /><path d="M24 28c0-7-4-11-13-11 0 8 4 11 13 11z" /><path d="M24 22c0-7 4-11 13-11 0 8-4 11-13 11z" /><path d="M16 41h16" /></>,
  ciaza: <path d="M24 41S8 31 8 18.5a8.5 8.5 0 0 1 16-3.9 8.5 8.5 0 0 1 16 3.9C40 31 24 41 24 41z" />,
  dziecko: <><circle cx="24" cy="26" r="14" /><path d="M19 24h.01M29 24h.01" strokeWidth="3.4" /><path d="M19 31c2.6 3 7.4 3 10 0" /><path d="M24 12c0-3 3-4.5 5.5-3" /></>,
  kalendarz: <><rect x="8" y="10" width="32" height="30" rx="3" /><path d="M8 19h32M16 6v7M32 6v7M16 27h2M23 27h2M30 27h2M16 33h2M23 33h2" /></>,
  adopcja: <><path d="M8 22 24 8l16 14v18H8V22z" /><path d="M24 35s-6-3.8-6-8a3.4 3.4 0 0 1 6-1.6 3.4 3.4 0 0 1 6 1.6c0 4.2-6 8-6 8z" /></>,
  trudne: <><path d="M16 26c-4 0-7-3-7-7s3-6 6-6 5 2 5 2 2-2 5-2 6 2.6 6 6-3 7-7 7" /><path d="M14 26c0 6 4 12 10 14 6-2 10-8 10-14" /></>,
  rodzina: <><circle cx="17" cy="16" r="4" /><circle cx="31" cy="16" r="4" /><path d="M8 36c1.2-6 4.4-9 9-9s7.8 3 9 9M22 36c1.2-6 4.4-9 9-9s7.8 3 9 9" /></>,
  tarcza: <><path d="M24 6 10 12v12c0 8.5 5.8 14.6 14 17 8.2-2.4 14-8.5 14-17V12L24 6z" /><path d="M17 24.5 22 29.5 31 19" /></>,
  zwolnienie: <><path d="M14 8h14l8 8v24H14V8z" /><path d="M28 8v8h8M24 22v12M18 28h12" /></>,
  formularz: <><path d="M14 7h20v34H14V7z" /><path d="M19 16h10M19 23h10M19 30h6" /></>,
  budynek: <><path d="M8 40V20l16-10 16 10v20H8z" /><path d="M20 40V28h8v12M16 22h2M23 22h2M30 22h2M16 28h2M30 28h2" /></>,
  praca: <><path d="M8 18h32v18H8V18z" /><path d="M18 18v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3M8 26h32" /></>,
  zegar: <><circle cx="24" cy="24" r="14" /><path d="M24 16v9l6 4" /></>,
  dokument: <><rect x="8" y="10" width="32" height="28" rx="2" /><circle cx="18" cy="22" r="3.5" /><path d="M26 20h8M26 26h8M14 32h20" /></>,
};

// Ikona sprawy po jej identyfikatorze (te same obrazy co dawne pliki w /public/ikony, ale w kolorze tekstu).
const DLA_SPRAWY: Record<string, string> = {
  "co-przysluguje": "tarcza",
  "zwolnienie-ciaza": "zwolnienie",
  "wniosek-zasilek": "formularz",
  "urlop-pracodawca": "budynek",
  "podzial-urlopu": "rodzina",
  "praca-na-urlopie": "praca",
  adopcja: "adopcja",
  "trudna-sytuacja": "trudne",
  terminy: "zegar",
  "odpis-aktu": "dokument",
};

export function Ikona({ nazwa }: { nazwa: string }) {
  const tresc = IKONY[nazwa];
  if (!tresc) return null;
  return (
    <svg className="ikona" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {tresc}
    </svg>
  );
}

export const ikonaSprawy = (id: string) => DLA_SPRAWY[id] ?? "dokument";

/** Okrągła plakietka z ikoną do kafli. */
export function Plakietka({ nazwa }: { nazwa: string }) {
  return <span className="tile__ic" aria-hidden="true"><Ikona nazwa={nazwa} /></span>;
}

export function Lupa() {
  return (
    <svg className="search__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" />
    </svg>
  );
}
