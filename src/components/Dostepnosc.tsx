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
        {ETYKIETA[rozm]}
      </button>
      <button type="button" onClick={() => setHc(!hc)} aria-pressed={hc} title={hc ? "Wyłącz wysoki kontrast" : "Włącz wysoki kontrast"}>
        {hc ? "Zwykły kontrast" : "Wysoki kontrast"}
      </button>
    </span>
  );
}
