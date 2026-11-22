"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/jezyk";

const KLUCZ = "rodzice.dostepnosc";
const ZDARZENIE = "rodzice:dostepnosc";
/** Trzy wyraźne kroki powiększenia tekstu (klasy fs-l i fs-xl w globals.css). */
const ROZMIAR = ["100%", "115%", "130%"] as const;

/**
 * rozm: 0 / 1 / 2 (100% / 115% / 130%), hc: wysoki kontrast,
 * noc: tryb nocny. `undefined` = użytkownik nic nie wybrał, wtedy zawsze jasny motyw (ustawienie systemu nie ma wpływu).
 * Wysoki kontrast ma pierwszeństwo: gdy jest włączony, tryb nocny się nie nakłada.
 */
type Stan = { rozm: number; hc: boolean; noc?: boolean };

function odczytaj(): Stan {
  try {
    const z = JSON.parse(localStorage.getItem(KLUCZ) || "{}");
    return { rozm: z.rozm === 1 || z.rozm === 2 ? z.rozm : 0, hc: !!z.hc, noc: typeof z.noc === "boolean" ? z.noc : undefined };
  } catch {
    return { rozm: 0, hc: false };
  }
}

/** Tryb nocny włącza się tylko po wyborze użytkownika; ustawienie systemu lub przeglądarki go nie włącza. */
function nocAktywna({ hc, noc }: Stan) {
  if (hc) return false;
  return noc === true;
}

function zastosuj(s: Stan) {
  const c = document.documentElement.classList;
  c.toggle("fs-l", s.rozm === 1);
  c.toggle("fs-xl", s.rozm === 2);
  c.toggle("hc", s.hc);
  c.toggle("noc", nocAktywna(s));
}

/**
 * Rozmiar tekstu, tryb nocny i wysoki kontrast. Komponent może stać w dwóch miejscach naraz (pasek na komputerze, menu na telefonie),
 * więc stan idzie przez zdarzenie okna i localStorage, a nie tylko przez lokalny useState.
 * Każdy przycisk ma widoczny podpis (nie tylko ikonę). wariant "menu": dłuższe podpisy, do panelu menu na telefonie.
 */
export default function Dostepnosc({ wariant = "pasek" }: { wariant?: "pasek" | "menu" }) {
  const t = useT();
  const [stan, setStan] = useState<Stan>({ rozm: 0, hc: false });
  const [noc, setNoc] = useState(false);
  useEffect(() => {
    const synchronizuj = (e?: Event) => {
      const szczegol = (e as CustomEvent<Stan> | undefined)?.detail;
      const s = szczegol && typeof szczegol.rozm === "number" ? szczegol : odczytaj();
      zastosuj(s);
      setStan(s);
      setNoc(nocAktywna(s));
    };
    synchronizuj();
    window.addEventListener(ZDARZENIE, synchronizuj);
    window.addEventListener("storage", synchronizuj);
    return () => {
      window.removeEventListener(ZDARZENIE, synchronizuj);
      window.removeEventListener("storage", synchronizuj);
    };
  }, []);
  function zmien(nowy: Stan) {
    zastosuj(nowy);
    try { localStorage.setItem(KLUCZ, JSON.stringify(nowy)); } catch { /* działa też bez zapisu */ }
    setStan(nowy);
    setNoc(nocAktywna(nowy));
    window.dispatchEvent(new CustomEvent<Stan>(ZDARZENIE, { detail: nowy }));
  }
  const { rozm, hc } = stan;
  const naMenu = wariant === "menu";
  const nastepny = (rozm + 1) % 3;
  const podpisRozmiaru = naMenu ? `${t("Rozmiar tekstu:")} ${ROZMIAR[rozm]}` : `${t("Tekst")} ${ROZMIAR[rozm]}`;
  const podpisNocy = t(naMenu ? "Tryb nocny" : "Nocny");
  const podpisKontrastu = t(naMenu ? "Wysoki kontrast" : "Kontrast");
  return (
    <span className={"a11y" + (naMenu ? " a11y--menu" : "")} role="group" aria-label={t("Ustawienia czytelności")}>
      <button type="button" onClick={() => zmien({ ...stan, rozm: nastepny })}
        aria-label={`${podpisRozmiaru}. ${t("Kliknij, żeby ustawić")} ${ROZMIAR[nastepny]}.`} title={`${t("Zmień rozmiar tekstu na")} ${ROZMIAR[nastepny]}`}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><text x="2" y="22" fontSize="22" fontWeight="700" fill="currentColor">A</text><path d="M19 8h7M22.5 4.5v7" stroke="currentColor" strokeWidth="2.4" fill="none" /></svg>
        <span className="a11y__txt">{podpisRozmiaru}</span>
      </button>
      <button type="button" onClick={() => zmien({ ...stan, noc: !noc, hc: false })} aria-pressed={noc}
        aria-label={podpisNocy} title={t(noc ? "Wyłącz tryb nocny" : "Włącz tryb nocny: ciemne, łagodne kolory")}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><path d="M22.5 17.5A9.5 9.5 0 0 1 11 5.5a10 10 0 1 0 11.5 12z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /></svg>
        <span className="a11y__txt">{podpisNocy}</span>
      </button>
      <button type="button" onClick={() => zmien({ ...stan, hc: !hc })} aria-pressed={hc}
        aria-label={podpisKontrastu} title={t(hc ? "Wyłącz wysoki kontrast" : "Włącz wysoki kontrast")}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><circle cx="14" cy="14" r="10.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M14 3.5a10.5 10.5 0 0 1 0 21z" fill="currentColor" /></svg>
        <span className="a11y__txt">{podpisKontrastu}</span>
      </button>
    </span>
  );
}
