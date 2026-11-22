"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/jezyk";

const KLUCZ = "rodzice.dostepnosc";
const ZDARZENIE = "rodzice:dostepnosc";
const ROZMIAR = ["normalny", "większy", "największy"] as const; // klucze tłumaczeń: "Rozmiar tekstu: …"

type Stan = { rozm: number; hc: boolean };

function odczytaj(): Stan {
  try {
    const z = JSON.parse(localStorage.getItem(KLUCZ) || "{}");
    return { rozm: z.rozm === 1 || z.rozm === 2 ? z.rozm : 0, hc: !!z.hc };
  } catch {
    return { rozm: 0, hc: false };
  }
}

function zastosuj({ rozm, hc }: Stan) {
  const c = document.documentElement.classList;
  c.toggle("fs-l", rozm === 1);
  c.toggle("fs-xl", rozm === 2);
  c.toggle("hc", hc);
}

/**
 * Rozmiar tekstu i wysoki kontrast. Komponent może stać w dwóch miejscach naraz (pasek na komputerze, menu na telefonie),
 * więc stan idzie przez zdarzenie okna i localStorage, a nie tylko przez lokalny useState.
 * wariant "menu": przyciski z widocznym opisem, do panelu menu na telefonie.
 */
export default function Dostepnosc({ wariant = "pasek" }: { wariant?: "pasek" | "menu" }) {
  const t = useT();
  const [stan, setStan] = useState<Stan>({ rozm: 0, hc: false });
  useEffect(() => {
    const synchronizuj = (e?: Event) => {
      const szczegol = (e as CustomEvent<Stan> | undefined)?.detail;
      const s = szczegol && typeof szczegol.rozm === "number" ? szczegol : odczytaj();
      zastosuj(s);
      setStan(s);
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
    try { localStorage.setItem(KLUCZ, JSON.stringify(nowy)); } catch {}
    setStan(nowy);
    window.dispatchEvent(new CustomEvent<Stan>(ZDARZENIE, { detail: nowy }));
  }
  const { rozm, hc } = stan;
  const naMenu = wariant === "menu";
  const opisRozmiaru = t(`Rozmiar tekstu: ${ROZMIAR[rozm]}`);
  return (
    <span className={"a11y" + (naMenu ? " a11y--menu" : "")} role="group" aria-label={t("Dostępność")}>
      <button type="button" onClick={() => zmien({ rozm: (rozm + 1) % 3, hc })} title={`${opisRozmiaru}. ${t("Kliknij, żeby zmienić.")}`}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><text x="2" y="22" fontSize="22" fontWeight="700" fill="currentColor">A</text><path d="M19 8h7M22.5 4.5v7" stroke="currentColor" strokeWidth="2.4" fill="none" /></svg>
        <span className={naMenu ? "a11y__txt" : "vh"}>{opisRozmiaru}</span>
      </button>
      <button type="button" onClick={() => zmien({ rozm, hc: !hc })} aria-pressed={hc} title={hc ? t("Wyłącz wysoki kontrast") : t("Włącz wysoki kontrast")}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><circle cx="14" cy="14" r="10.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M14 3.5a10.5 10.5 0 0 1 0 21z" fill="currentColor" /></svg>
        <span className={naMenu ? "a11y__txt" : "vh"}>{t("Wysoki kontrast")}</span>
      </button>
    </span>
  );
}
