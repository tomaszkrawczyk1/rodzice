"use client";
import { useEffect, useState } from "react";

const KLUCZ = "rodzice.dostepnosc";

export default function Dostepnosc() {
  const [rozm, setRozm] = useState(0);
  const [hc, setHc] = useState(false);
  useEffect(() => {
    try { const z = JSON.parse(localStorage.getItem(KLUCZ) || "{}"); setRozm(z.rozm || 0); setHc(!!z.hc); } catch {}
  }, []);
  useEffect(() => {
    const c = document.documentElement.classList;
    c.toggle("fs-l", rozm === 1); c.toggle("fs-xl", rozm === 2); c.toggle("hc", hc);
    try { localStorage.setItem(KLUCZ, JSON.stringify({ rozm, hc })); } catch {}
  }, [rozm, hc]);
  return (
    <span className="a11y" role="group" aria-label="Dostępność">
      <button type="button" onClick={() => setRozm((rozm + 1) % 3)} aria-label={`Rozmiar tekstu: ${["normalny", "większy", "największy"][rozm]}. Zmień`} title="Rozmiar tekstu">A{rozm === 0 ? "" : rozm === 1 ? "+" : "++"}</button>
      <button type="button" onClick={() => setHc(!hc)} aria-pressed={hc} title="Wysoki kontrast">Kontrast</button>
    </span>
  );
}
