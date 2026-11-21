"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSesja } from "@/lib/sesja";
import { sprawa } from "@/lib/sprawy";
import Dostepnosc from "./Dostepnosc";

// Sześć pozycji zamiast dziewięciu: cztery podstrony o papierach (druki, kreator wniosków, wgrywanie, konto w ZUS)
// są pod jedną pozycją „Formularze", a po wejściu w którąkolwiek z nich widać ich wspólne podmenu.
const NAV = [
  ["/", "Start"], ["/sprawy", "Sprawy"], ["/kalendarz", "Kalendarz"], ["/terminarz", "Terminarz"], ["/kalkulator", "Kalkulator"], ["/poradnik", "Poradnik"], ["/formularze", "Formularze"],
] as const;
const FORMULARZE = [
  ["/druki", "Druki"], ["/wnioski", "Kreator wniosków"], ["/wgraj", "Wgraj wniosek"], ["/pue", "Konto w ZUS"],
] as const;
const wFormularzach = (path: string) => path === "/formularze" || FORMULARZE.some(([h]) => path === h || path.startsWith(h + "/"));

const NAZWY: Record<string, string> = {
  "/sprawy": "Sprawy",
  "/kalendarz": "Kalendarz ciąży i połogu",
  "/terminarz": "Terminarz",
  "/poradnik": "Poradnik",
  "/kalkulator": "Kalkulator",
  "/formularze": "Formularze",
  "/druki": "Druki",
  "/wnioski": "Kreator wniosków",
  "/wgraj": "Wgraj wniosek",
  "/pue": "Konto w ZUS (PUE)",
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
  if (href === "/formularze") return wFormularzach(path);
  return path === href || path.startsWith(href + "/");
}

function okruszki(path: string): { href: string; label: string; biezacy?: boolean }[] {
  if (path === "/") return [];
  if (path.startsWith("/sprawa/")) {
    return [
      { href: "/sprawy", label: "Sprawy" },
      { href: path, label: sprawa(path.split("/")[2])?.tytul ?? "Sprawa", biezacy: true },
    ];
  }
  const bazowy = "/" + path.split("/").filter(Boolean)[0];
  const label = NAZWY[path] || NAZWY[bazowy];
  if (!label) return [];
  const nadrzedny = path !== "/formularze" && wFormularzach(path) ? [{ href: "/formularze", label: NAZWY["/formularze"] }] : [];
  return [...nadrzedny, { href: path, label, biezacy: true }];
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
      // Panel menu na telefonie zaczyna się tuż pod jednowierszowym paskiem nagłówka.
      const pasek = document.querySelector(".zus-header__bar");
      const dol = pasek ? pasek.getBoundingClientRect().bottom : 0;
      document.documentElement.style.setProperty("--menu-top", `${Math.max(0, Math.round(dol))}px`);
      // Wysokość przyklejonego nagłówka dla przewijania do kotwic i kroków (0, gdy nagłówek jedzie ze stroną).
      const gora = document.querySelector(".site-top");
      const przyklejony = gora && ["sticky", "fixed"].includes(getComputedStyle(gora).position);
      document.documentElement.style.setProperty("--header-h", przyklejony ? `${Math.round(gora.getBoundingClientRect().height)}px` : "0px");
    };
    ustaw();
    const klawisz = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("resize", ustaw);
    window.addEventListener("keydown", klawisz);
    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("resize", ustaw);
      window.removeEventListener("keydown", klawisz);
    };
  }, [open, path]);

  useEffect(() => { setOpen(false); }, [path]);

  const imie = sesja ? sesja.osoba.split(" ")[0] : "";
  const logowanie = sesja ? (
    <button type="button" className="pue-login" title={sesja.osoba} aria-label={`Wyloguj (${imie})`} onClick={() => { wyloguj(); zamknij(); }}>
      <span className="pue-login__label">Wyloguj<span className="pue-login__imie"> ({imie})</span></span><span className="pue-arrow" aria-hidden="true" />
    </button>
  ) : (
    <Link href="/logowanie" className="pue-login login" aria-label="Zaloguj się" onClick={zamknij}><span className="pue-login__label">Zaloguj</span><span className="pue-arrow" aria-hidden="true" /></Link>
  );

  return (
    <div className="site-top">
      {/* Jedyny komunikat „to nie ZUS": stopka go już nie powtarza. */}
      <div className="sim-banner" role="note">Wersja testowa. To nie jest oficjalna usługa ZUS.</div>
      <header id="header" className="header zus-header">
        <div className="zus-header__bar">
          <Link href="/" className="zus-logo brand" aria-label="Przewodnik Przyszłego Rodzica, strona główna" onClick={zamknij}>
            <img className="zus-logo__img" src="/logo_zus_darker_with_text.svg" alt="" width={250} height={56} />
          </Link>
          <div className="zus-product brand-text">
            <b>Przewodnik Przyszłego Rodzica</b>
            <span>Prototyp: zasiłki i urlopy dla rodziców</span>
          </div>
          <div className="zus-header__tools">
            <Link href="/#zapytaj" className="zus-search" aria-label="Szukaj sprawy" onClick={zamknij}>
              <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true" focusable="false"><circle cx="19" cy="19" r="17" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="17" cy="17" r="7" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="m22.5 22.5 7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              <span className="zus-search__txt">Szukaj</span>
            </Link>
            <Dostepnosc />
            {logowanie}
          </div>
          <button type="button" className="menu-btn" aria-expanded={open} aria-controls="nav" aria-label={open ? "Zamknij menu" : "Otwórz menu"} onClick={() => setOpen(!open)}>
            {open
              ? <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><path d="m5 5 16 16M21 5 5 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>
              : <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><path d="M3 6h20M3 13h20M3 20h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>}
          </button>
        </div>
        <nav id="nav" className={"nav zus-nav" + (open ? " open" : "")} aria-label="Główna nawigacja">
          <ul className="zus-nav__list">
            {NAV.map(([h, t]) => {
              const on = aktywny(path, h);
              return (
                <li key={h} className={on ? "selected" : undefined}>
                  <Link href={h} aria-current={on ? "page" : undefined} className={on ? "active" : ""} onClick={zamknij}>{t}</Link>
                  {h === "/formularze" && (
                    <ul className="zus-nav__sub" aria-label="Formularze i konto w ZUS">
                      {FORMULARZE.map(([sh, st]) => (
                        <li key={sh}><Link href={sh} aria-current={path === sh ? "page" : undefined} onClick={zamknij}>{st}</Link></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="zus-nav__tools"><Dostepnosc wariant="menu" /></div>
        </nav>
        {wFormularzach(path) && (
          <nav className="zus-subnav" aria-label="Formularze i konto w ZUS">
            <ul className="container">
              {FORMULARZE.map(([sh, st]) => (
                <li key={sh}><Link href={sh} aria-current={path === sh ? "page" : undefined}>{st}</Link></li>
              ))}
            </ul>
          </nav>
        )}
        {crumbs.length > 0 && (
          <nav className="crumbs" aria-label="Okruszki">
            <div className="container crumbs__row">
              <Link href="/" className="crumbs__home" aria-label="Start" onClick={zamknij}>
                <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M3 13.5 14 4l11 9.5M6 11.5V24h6.5v-7h3v7H22V11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
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
