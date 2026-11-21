"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSesja } from "@/lib/sesja";
import Dostepnosc from "./Dostepnosc";

const NAV = [
  ["/", "Start"], ["/sprawy", "Sprawy"], ["/kalendarz", "Kalendarz"], ["/poradnik", "Poradnik"], ["/kalkulator", "Kalkulator"], ["/druki", "Druki"], ["/wnioski", "Wnioski"], ["/wgraj", "Wgraj wniosek"], ["/pue", "PUE"],
] as const;

const NAZWY: Record<string, string> = {
  "/sprawy": "Sprawy",
  "/kalendarz": "Kalendarz ciąży i połogu",
  "/poradnik": "Poradnik",
  "/kalkulator": "Kalkulator",
  "/druki": "Druki",
  "/wnioski": "Wnioski",
  "/wgraj": "Wgraj wniosek",
  "/pue": "PUE",
  "/logowanie": "Zaloguj",
  "/kreator": "Kreator",
  "/ryzyka": "Ryzyka",
  "/trudne": "Trudne sytuacje",
  "/dokumenty": "Dokumenty i terminy",
  "/o-projekcie": "O projekcie i użyciu AI",
  "/odpis": "Odpis aktu urodzenia",
  "/admin": "Panel administratora",
  "/ciaza": "Co mi przysługuje w ciąży",
};

function aktywny(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/sprawy") return path === "/sprawy" || path.startsWith("/sprawa/");
  return path === href || path.startsWith(href + "/");
}

function okruszki(path: string): { href: string; label: string; biezacy?: boolean }[] {
  if (path === "/") return [];
  if (path.startsWith("/sprawa/")) {
    return [
      { href: "/sprawy", label: "Sprawy" },
      { href: path, label: "Sprawa", biezacy: true },
    ];
  }
  const bazowy = "/" + path.split("/").filter(Boolean)[0];
  const label = NAZWY[path] || NAZWY[bazowy];
  if (!label) return [];
  return [{ href: path, label, biezacy: true }];
}

export default function Header() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const { sesja, wyloguj } = useSesja();
  const crumbs = okruszki(path);
  const zamknij = () => setOpen(false);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    const ustaw = () => {
      const pasek = document.querySelector(".site-top");
      const dol = pasek ? pasek.getBoundingClientRect().bottom : 0;
      document.documentElement.style.setProperty("--menu-top", `${Math.max(0, Math.round(dol))}px`);
    };
    ustaw();
    window.addEventListener("resize", ustaw);
    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("resize", ustaw);
    };
  }, [open, path]);

  useEffect(() => { setOpen(false); }, [path]);

  const imie = sesja ? sesja.osoba.split(" ")[0] : "";
  const logowanie = sesja ? (
    <button type="button" className="pue-login" title={sesja.osoba} onClick={() => { wyloguj(); zamknij(); }}>
      <span className="pue-login__label">Wyloguj ({imie})</span>
    </button>
  ) : (
    <Link href="/logowanie" className="pue-login login" onClick={zamknij}>Zaloguj</Link>
  );

  return (
    <div className="site-top">
      <div className="sim-banner">Wersja testowa. Dane i logowanie są przykładowe. To nie jest oficjalna usługa ZUS.</div>
      <header id="header" className="header zus-header">
        <div className="zus-header__bar">
          <Link href="/" className="zus-logo brand" title="Przewodnik Przyszłego Rodzica" onClick={zamknij}>
            <img className="zus-logo__img" src="/logo_zus_darker_with_text.svg" alt="Strona główna" width={250} height={56} />
          </Link>
          <div className="zus-product brand-text">
            <b>Przewodnik Przyszłego Rodzica</b>
            <span>Prototyp: zasiłki i urlopy dla rodziców</span>
          </div>
          <button type="button" className="menu-btn" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>{open ? "Zamknij" : "Menu"}</button>
          <div className="zus-header__tools">
            <Link href="/#zapytaj" className="zus-search" onClick={zamknij}>
              <img src="/Ikona_Lupa.svg" alt="" width={28} height={28} />
              <span>Szukaj</span>
            </Link>
            <Dostepnosc />
            {logowanie}
          </div>
        </div>
        <nav id="nav" className={"nav zus-nav" + (open ? " open" : "")} aria-label="Główna nawigacja">
          <ul className="zus-nav__list">
            {NAV.map(([h, t]) => {
              const on = aktywny(path, h);
              return (
                <li key={h} className={on ? "selected" : undefined}>
                  <Link href={h} aria-current={on ? "page" : undefined} className={on ? "active" : ""} onClick={zamknij}>{t}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {crumbs.length > 0 && (
          <nav className="crumbs" aria-label="Okruszki">
            <div className="container crumbs__row">
              <Link href="/" className="crumbs__home" aria-label="Start" onClick={zamknij}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#007834" d="M12 3.2 3 11h2.2v9h5.3v-6.2h3v6.2H19V11H21.2L12 3.2z" /></svg>
              </Link>
              <ol className="crumbs__list">
                {crumbs.map((c) => (
                  <li key={c.href} className={c.biezacy ? "last" : undefined}>
                    {c.biezacy ? <span aria-current="page">{c.label}</span> : <Link href={c.href} onClick={zamknij}>{c.label}</Link>}
                  </li>
                ))}
              </ol>
            </div>
          </nav>
        )}
      </header>
    </div>
  );
}
