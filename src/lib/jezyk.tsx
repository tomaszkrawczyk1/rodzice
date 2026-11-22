"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CIASTECZKO_JEZYKA, LOCALE, tlumacz, type Jezyk } from "@/i18n/jezyki";
import { formatyDla } from "@/i18n/formaty";
import { pogrubienia } from "@/i18n/bogaty";

interface Ctx { jezyk: Jezyk; ustaw: (j: Jezyk) => void; t: (pl: string, zmienne?: Record<string, string | number>) => string; locale: string }
const C = createContext<Ctx>({ jezyk: "pl", ustaw: () => {}, t: (pl) => pl, locale: LOCALE.pl });
export const useJezyk = () => useContext(C);
/** Skrót: const t = useT(); t("Polski tekst") → tekst w wybranym języku. */
export const useT = () => useContext(C).t;

/**
 * Język jest w ciasteczku, więc serwer od razu renderuje właściwą wersję (bez migania po polsku).
 * Zmiana: zapisuje ciasteczko, przestawia stan i prosi Next.js o ponowne wyrenderowanie części serwerowych.
 */
export function JezykProvider({ poczatkowy, children }: { poczatkowy: Jezyk; children: ReactNode }) {
  const [jezyk, setJezyk] = useState<Jezyk>(poczatkowy);
  const router = useRouter();
  const ustaw = useCallback((j: Jezyk) => {
    try { document.cookie = `${CIASTECZKO_JEZYKA}=${j}; path=/; max-age=31536000; SameSite=Lax`; } catch {}
    document.documentElement.lang = j;
    setJezyk(j);
    router.refresh();
  }, [router]);
  const wartosc = useMemo<Ctx>(() => ({ jezyk, ustaw, locale: LOCALE[jezyk], t: (pl, zmienne) => tlumacz(jezyk, pl, zmienne) }), [jezyk, ustaw]);
  return <C.Provider value={wartosc}>{children}</C.Provider>;
}

/** Daty, kwoty i liczby w wybranym języku: const { dataPL, pln } = useFormaty(); */
export const useFormaty = () => formatyDla(useContext(C).jezyk);

/** Jak t(), ale **tekst** jest pogrubiony, a [napis](/adres) to odnośnik (zob. pogrubienia w @/i18n/bogaty). */
export const useTb = () => {
  const t = useT();
  return (pl: string, zmienne?: Record<string, string | number>) => pogrubienia(t(pl, zmienne));
};
