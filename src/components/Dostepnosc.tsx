"use client";
import { useEffect, useRef, useState } from "react";

const KLUCZ = "rodzice.dostepnosc";
const ROZMIAR = ["normalny", "większy", "największy"] as const;
const ETYKIETA = ["Większy tekst", "Jeszcze większy", "Zwykły tekst"] as const;

export default function Dostepnosc() {
  const [rozm, setRozm] = useState(0);
  const [hc, setHc] = useState(false);
  const pierwszyZapis = useRef(true);
  useEffect(() => {
    try {
      const z = JSON.parse(localStorage.getItem(KLUCZ) || "{}");
      const r = z.rozm || 0;
      const h = !!z.hc;
      const c = document.documentElement.classList;
      c.toggle("fs-l", r === 1);
      c.toggle("fs-xl", r === 2);
      c.toggle("hc", h);
      setRozm(r);
      setHc(h);
    } catch {}
  }, []);
  useEffect(() => {
    if (pierwszyZapis.current) {
      pierwszyZapis.current = false;
      return;
    }
    const c = document.documentElement.classList;
    c.toggle("fs-l", rozm === 1);
    c.toggle("fs-xl", rozm === 2);
    c.toggle("hc", hc);
    try { localStorage.setItem(KLUCZ, JSON.stringify({ rozm, hc })); } catch {}
  }, [rozm, hc]);
  return (
    <span className="a11y" role="group" aria-label="Dostępność">
      <button type="button" onClick={() => setRozm((rozm + 1) % 3)} aria-pressed={rozm > 0} title={`Rozmiar tekstu: ${ROZMIAR[rozm]}. Kliknij, żeby zmienić.`}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><text x="2" y="22" fontSize="22" fontWeight="700" fill="currentColor">A</text><path d="M19 8h7M22.5 4.5v7" stroke="currentColor" strokeWidth="2.4" fill="none" /></svg>
        <span className="vh">{ETYKIETA[rozm]}</span>
      </button>
      <button type="button" onClick={() => setHc(!hc)} aria-pressed={hc} title={hc ? "Wyłącz wysoki kontrast" : "Włącz wysoki kontrast"}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="10.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M14 3.5a10.5 10.5 0 0 1 0 21z" fill="currentColor" /></svg>
        <span className="vh">{hc ? "Zwykły kontrast" : "Wysoki kontrast"}</span>
      </button>
    </span>
  );
}
