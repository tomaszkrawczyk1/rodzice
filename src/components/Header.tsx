"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSesja } from "@/lib/sesja";
import Dostepnosc from "./Dostepnosc";

const NAV = [
  ["/", "Start"], ["/kreator", "Kreator"], ["/poradnik", "Poradnik"], ["/ciaza", "W ciąży"], ["/kalkulator", "Kalkulator"], ["/druki", "Druki"], ["/dokumenty", "Terminy"],
  ["/wnioski", "Wnioski"], ["/wgraj", "Wgraj wniosek"], ["/ryzyka", "Ryzyka"], ["/trudne", "Trudne sytuacje"], ["/pue", "PUE"],
] as const;

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { sesja, wyloguj } = useSesja();
  return (
    <>
      <div className="sim-banner">Prototyp HackNation 2026 · wszystkie integracje (mObywatel, ZUS, PUE, USC) są <b>symulowane</b>, dane są fikcyjne</div>
      <header className="header">
        <div className="container">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark" aria-hidden />
            <span className="brand-text"><b>Przewodnik Przyszłego Rodzica</b><span>Prototyp · zasiłki i urlopy dla rodziców</span></span>
          </Link>
          <button className="menu-btn" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>{open ? "Zamknij" : "Menu"}</button>
          <nav id="nav" className={"nav" + (open ? " open" : "")} aria-label="Główna nawigacja">
            {NAV.map(([h, t]) => (
              <Link key={h} href={h} aria-current={path === h ? "page" : undefined} className={path === h ? "active" : ""} onClick={() => setOpen(false)}>{t}</Link>
            ))}
            {sesja ? (
              <a href="#" onClick={(e) => { e.preventDefault(); wyloguj(); setOpen(false); }} title="Wyloguj">Wyloguj ({sesja.osoba.split(" ")[0]})</a>
            ) : (
              <Link href="/logowanie" className="login" onClick={() => setOpen(false)}>Zaloguj</Link>
            )}
            <Dostepnosc />
          </nav>
        </div>
      </header>
    </>
  );
}
