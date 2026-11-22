"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSesja } from "@/lib/sesja";
import { TYTULY_SPRAW } from "@/lib/sprawy-tytuly";
import Dostepnosc from "./Dostepnosc";
import Jezyk from "./Jezyk";
import { useT } from "@/lib/jezyk";
import PasekDemo from "@/components/PasekDemo";

import s from "./Header.module.css";

/*
 * Mapa nazw (adresy URL bez zmian, zmieniły się tylko etykiety, żeby każda mówiła, czym strona różni się od innych):
 *   /sprawy      „Sprawy krok po kroku"         wybierasz sprawę, prowadzimy pytanie po pytaniu
 *   /kreator     „Co mnie dotyczy?"             kilka pytań o Twoją sytuację, potem lista tematów
 *   /ciaza       „Co mi przysługuje w ciąży"
 *   /kalkulator  „Kalkulator zasiłku"
 *   /kalendarz   „Kalendarz ciąży"              wizyty, badania i terminy liczone od terminu porodu z profilu
 *   /terminarz   „Kalendarz w urzędzie"       co złożyć w ZUS, u pracodawcy, w gminie i USC i do kiedy (+ plik .ics)
 *   /dokumenty   „Kto wypłaca zasiłek"          ZUS czy pracodawca, ile masz czasu na wniosek
 *   /formularze  „Wnioski i druki"              strona wyboru, pod nią:
 *   /wnioski     „Napisz wniosek"               kreator tekstu wniosku do wydruku
 *   /druki       „Jak wypełnić druk ZUS"        instrukcje do pustych formularzy
 *   /wgraj       „Odczyt ze skanu (przykłady)"  demonstracja odczytu danych ze skanu Z-3 / ZAM
 *   /pue         „Konto w ZUS (symulacja)"
 *   /poradnik    „Pomoc / FAQ"
 *   /trudne      „Pomoc w trudnej sytuacji"
 *   /ryzyka      „Ochrona w pracy"
 */
type Pozycja = { href: string; nazwa: string; krotko?: string; opis?: string };
const P: Record<string, Pozycja> = {
  start: { href: "/", nazwa: "Start" },
  sprawy: { href: "/sprawy", nazwa: "Sprawy krok po kroku", krotko: "Sprawy krok po kroku", opis: "Wybierz sprawę, poprowadzimy Cię" },
  kreator: { href: "/kreator", nazwa: "Co mnie dotyczy?", opis: "Kilka pytań o Twoją sytuację" },
  ciaza: { href: "/ciaza", nazwa: "Co mi przysługuje w ciąży", krotko: "W ciąży" },
  kalkulator: { href: "/kalkulator", nazwa: "Kalkulator zasiłku", krotko: "Kalkulator" },
  kalendarz: { href: "/kalendarz", nazwa: "Kalendarz ciąży", opis: "Wizyty i badania, termin porodu z profilu" },
  terminarz: { href: "/terminarz", nazwa: "Kalendarz w urzędzie", opis: "Co złożyć i do kiedy: ZUS, praca, gmina" },
  formularze: { href: "/formularze", nazwa: "Wnioski i druki", opis: "Wszystkie formularze w jednym miejscu" },
  wnioski: { href: "/wnioski", nazwa: "Napisz wniosek" },
  druki: { href: "/druki", nazwa: "Jak wypełnić druk ZUS" },
  wgraj: { href: "/wgraj", nazwa: "Odczyt ze skanu (przykłady)" },
  pue: { href: "/pue", nazwa: "Konto w ZUS (symulacja)" },
  dokumenty: { href: "/dokumenty", nazwa: "Kto wypłaca zasiłek" },
  poradnik: { href: "/poradnik", nazwa: "Pomoc / FAQ", opis: "Odpowiedzi na częste pytania" },
  trudne: { href: "/trudne", nazwa: "Pomoc w trudnej sytuacji", krotko: "Trudna sytuacja" },
  ryzyka: { href: "/ryzyka", nazwa: "Ochrona w pracy" },
  oProjekcie: { href: "/o-projekcie", nazwa: "O projekcie i użyciu AI" },
};

// Komputer: jeden rząd (logo prowadzi na start), reszta w „Więcej".
const NAV: Pozycja[] = [P.sprawy, P.kreator, P.ciaza, P.kalkulator, P.kalendarz, P.terminarz, P.formularze, P.poradnik, P.trudne];
const FORMULARZE: Pozycja[] = [P.wnioski, P.druki, P.wgraj, P.pue];
const WIECEJ: Pozycja[] = [P.dokumenty, P.ryzyka, P.oProjekcie];
// Telefon: grupy z nagłówkami, mniej pozycji na wierzchu, rzadziej używane w „Więcej".
const GRUPY_MENU: { tytul: string; pozycje: Pozycja[] }[] = [
  { tytul: "Sprawdź", pozycje: [P.sprawy, P.kreator, P.ciaza, P.kalkulator] },
  { tytul: "Terminy", pozycje: [P.kalendarz, P.terminarz] },
  { tytul: "Wnioski i druki", pozycje: [P.formularze, P.wnioski, P.druki] },
  { tytul: "Pomoc", pozycje: [P.poradnik, P.trudne] },
];
const WIECEJ_MENU: Pozycja[] = [P.dokumenty, P.ryzyka, P.wgraj, P.pue, P.oProjekcie];

const wWiecej = (path: string) => WIECEJ.some(({ href: h }) => path === h || path.startsWith(h + "/"));
const wFormularzach = (path: string) => path === "/formularze" || FORMULARZE.some(({ href: h }) => path === h || path.startsWith(h + "/"));

// Nazwy w okruszkach: te same co w menu, a dla stron spoza menu: tytuły tras.
const NAZWY: Record<string, string> = {
  ...Object.fromEntries(Object.values(P).filter((p) => p.href !== "/").map((p) => [p.href, p.nazwa])),
  "/logowanie": "Logowanie",
  "/odpis": "Odpis aktu urodzenia",
  "/admin": "Panel administratora",
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
      { href: path, label: TYTULY_SPRAW[path.split("/")[2]] ?? "Sprawa", biezacy: true },
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
  const t = useT();
  const [open, setOpen] = useState(false);
  const [wiecej, setWiecej] = useState(false);
  const { sesja, wyloguj, gotowa } = useSesja();
  const crumbs = okruszki(path);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const wiecejLi = useRef<HTMLLIElement>(null);
  const wiecejBtn = useRef<HTMLButtonElement>(null);
  const fokusPierwszy = useRef(false);
  const zamknij = () => { setOpen(false); setWiecej(false); };
  const wiecejAktywne = wWiecej(path);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    // Na telefonie otwarte menu ma jeden pasek przewijania: blokujemy przewijanie samej strony na <html>
    // (globals.css blokuje tylko <body>, a przy overflow-x: clip na <html> strona pod menu dalej się przewijała).
    const mqTel = window.matchMedia("(max-width: 1099px)");
    const html = document.documentElement;
    html.style.overflow = open && mqTel.matches ? "hidden" : "";
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
    window.addEventListener("resize", ustaw);
    return () => {
      document.body.classList.remove("nav-open");
      html.style.overflow = "";
      window.removeEventListener("resize", ustaw);
    };
  }, [open, path]);

  useEffect(() => { setOpen(false); setWiecej(false); }, [path]);

  // Na telefonie otwarte menu zasłania stronę, więc to, co jest pod nim (treść, stopka, link „Przejdź do treści"), nie może
  // łapać fokusu: Tab krąży po nagłówku i panelu (pułapka fokusu), a czytnik ekranu nie czyta zasłoniętej treści.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(max-width: 1099px)");
    const cele = () => Array.from(document.querySelectorAll<HTMLElement>("#tresc, footer.footer, a.skip"));
    const stosuj = () => cele().forEach((el) => (mq.matches ? el.setAttribute("inert", "") : el.removeAttribute("inert")));
    stosuj();
    mq.addEventListener("change", stosuj);
    return () => {
      mq.removeEventListener("change", stosuj);
      cele().forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // Escape zamyka rozwinięte podmenu albo menu (także gdy fokus jest w panelu) i zwraca fokus na przycisk, który je otworzył.
  // Kliknięcie poza menu zamyka je bez przenoszenia fokusu.
  useEffect(() => {
    if (!open && !wiecej) return;
    const klawisz = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const hamburger = menuBtn.current;
      if (open && hamburger && hamburger.offsetParent !== null) {
        setOpen(false); setWiecej(false); hamburger.focus();
      } else if (wiecej) {
        setWiecej(false); wiecejBtn.current?.focus();
      }
    };
    const poza = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wiecej && !wiecejLi.current?.contains(t)) setWiecej(false);
      if (open && !navRef.current?.contains(t) && !menuBtn.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", klawisz);
    document.addEventListener("pointerdown", poza);
    return () => {
      document.removeEventListener("keydown", klawisz);
      document.removeEventListener("pointerdown", poza);
    };
  }, [open, wiecej]);

  useEffect(() => {
    if (wiecej && fokusPierwszy.current) wiecejLi.current?.querySelector<HTMLElement>("ul a")?.focus();
    fokusPierwszy.current = false;
  }, [wiecej]);

  // Strzałki w „Więcej": ↓ na przycisku otwiera listę, w liście góra/dół/Home/End przechodzą po pozycjach.
  function strzalki(e: React.KeyboardEvent<HTMLLIElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const linki = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("ul a"));
    if (e.target === wiecejBtn.current) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (wiecej) linki[0]?.focus(); else { fokusPierwszy.current = true; setWiecej(true); }
      }
      return;
    }
    const i = linki.indexOf(e.target as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const cel = e.key === "Home" ? 0 : e.key === "End" ? linki.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + linki.length) % linki.length;
    linki[cel]?.focus();
  }

  const imie = sesja ? sesja.osoba.split(" ")[0] : "";
  // Dopóki sesja nie wczyta się z przeglądarki, nie wiemy, czy pokazać „Zaloguj", czy „Wyloguj".
  // Zamiast migać jednym i drugim, trzymamy puste miejsce tej samej szerokości.
  const logowanie = !gotowa ? (
    <span className={"pue-login " + s.loginMiejsce} aria-hidden="true"><span className="pue-login__label">{t("Zaloguj")}</span><span className="pue-arrow" /></span>
  ) : sesja ? (
    <button type="button" className="pue-login" title={sesja.osoba} aria-label={`Wyloguj (${imie})`} onClick={() => { wyloguj(); zamknij(); }}>
      <span className="pue-login__label">{t("Wyloguj")}<span className="pue-login__imie"> ({imie})</span></span><span className="pue-arrow" aria-hidden="true" />
    </button>
  ) : (
    <Link href="/logowanie" className="pue-login login" aria-label={t("Zaloguj się")} onClick={zamknij}><span className="pue-login__label">{t("Zaloguj")}</span><span className="pue-arrow" aria-hidden="true" /></Link>
  );

  const link = (p: Pozycja, zOpisem = false) => {
    const on = aktywny(path, p.href);
    return (
      <Link href={p.href} aria-current={on ? "page" : undefined} className={zOpisem && p.opis ? s.linkZOpisem : undefined} onClick={zamknij}>
        {t(p.nazwa)}{zOpisem && p.opis && <span className={s.opis}>{t(p.opis)}</span>}
      </Link>
    );
  };

  return (
    <div className={"site-top " + s.gora + (open ? " " + s.goraOtwarta : "")}>
      <PasekDemo />
      <header id="header" className={"header zus-header " + s.naglowek + (open ? " " + s.naglowekOtwarty : "")}>
        <div className={"zus-header__bar " + s.bar}>
          <Link href="/" className={"zus-logo brand " + s.logo} aria-label={t("Przewodnik Przyszłego Rodzica, strona główna")} onClick={zamknij}>
            <img className={"zus-logo__img " + s.logoImg} src="/logo_zus_darker_with_text.svg" alt="" width={250} height={56} />
          </Link>
          <div className={"zus-product brand-text " + s.produkt}>
            <b>{t("Przewodnik Przyszłego Rodzica")}</b>
            <span className={s.dopisek}>{t("Projekt hackathonowy, nieoficjalny")}</span>
          </div>
          <div className="zus-header__tools">
            <Link href="/#zapytaj" className="zus-search" aria-label={t("Szukaj sprawy")} onClick={zamknij}>
              <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true" focusable="false"><circle cx="19" cy="19" r="17" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="17" cy="17" r="7" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="m22.5 22.5 7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              <span className="zus-search__txt">{t("Szukaj")}</span>
            </Link>
            <div className={s.dostepnosc}>
              <Dostepnosc />
              <span className={s.dostepnoscPodpis} aria-hidden="true">{t("Tekst i kontrast")}</span>
            </div>
            <div className="logowanie-jezyk">
              {logowanie}
              <Jezyk />
            </div>
          </div>
          <button ref={menuBtn} type="button" className="menu-btn" aria-expanded={open} aria-controls="nav" aria-label={open ? t("Zamknij menu") : t("Otwórz menu")} onClick={() => { setOpen(!open); setWiecej(false); }}>
            {open
              ? <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><path d="m5 5 16 16M21 5 5 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>
              : <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><path d="M3 6h20M3 13h20M3 20h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>}
          </button>
        </div>
        <nav id="nav" ref={navRef} className={"nav zus-nav " + s.panel + (open ? " open " + s.panelOtwarty : "")} aria-label={t("Główna nawigacja")}>
          {/* Komputer: jeden rząd pozycji i „Więcej". */}
          <ul className={"zus-nav__list " + s.listaKomputer}>
            {NAV.map((p) => {
              const on = aktywny(path, p.href);
              return (
                <li key={p.href} className={on ? "selected" : undefined}>
                  <Link href={p.href} aria-current={on ? "page" : undefined} className={on ? "active" : ""} title={p.krotko ? t(p.nazwa) : undefined} onClick={zamknij}>{t(p.krotko ?? p.nazwa)}</Link>
                </li>
              );
            })}
            <li ref={wiecejLi} className={"zus-nav__more" + (wiecejAktywne ? " selected" : "")} onKeyDown={strzalki}
              onBlur={(e) => { if (wiecej && !e.currentTarget.contains(e.relatedTarget as Node | null)) setWiecej(false); }}>
              <button ref={wiecejBtn} type="button" className={"zus-nav__more-btn" + (wiecejAktywne ? " active" : "")} aria-expanded={wiecej} aria-controls="nav-wiecej" onClick={() => setWiecej(!wiecej)}>
                {t("Więcej")}<svg className="zus-nav__chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <ul id="nav-wiecej" className="zus-nav__drop" aria-label={t("Więcej stron")} hidden={!wiecej}>
                {WIECEJ.map((p) => (
                  <li key={p.href}><Link href={p.href} aria-current={path === p.href ? "page" : undefined} onClick={zamknij}>{t(p.nazwa)}</Link></li>
                ))}
              </ul>
            </li>
          </ul>
          {/* Telefon i tablet: najpierw rozmiar tekstu i kontrast, potem pozycje w grupach z nagłówkami. */}
          <div className={s.grupy}>
            <div className={s.dostepnoscMenu}>
              <p className={s.dostepnoscMenuTytul} aria-hidden="true">{t("Tekst i kontrast")}</p>
              <Jezyk wariant="menu" />
              <Dostepnosc wariant="menu" />
            </div>
            <ul className={s.grupyLista}>
              <li className={s.grupa}><ul><li>{link(P.start)}</li></ul></li>
              {GRUPY_MENU.map((g, i) => (
                <li key={g.tytul} className={s.grupa}>
                  <p className={s.grupaNaglowek} id={`menu-grupa-${i}`}>{t(g.tytul)}</p>
                  <ul aria-labelledby={`menu-grupa-${i}`}>
                    {g.pozycje.map((p) => <li key={p.href}>{link(p, true)}</li>)}
                  </ul>
                </li>
              ))}
              <li className={s.grupa}>
                <details className={s.wiecejMobile} open={WIECEJ_MENU.some((p) => aktywny(path, p.href)) || undefined}>
                  <summary>{t("Więcej")}</summary>
                  <ul>{WIECEJ_MENU.map((p) => <li key={p.href}>{link(p)}</li>)}</ul>
                </details>
              </li>
            </ul>
          </div>
        </nav>
        {wFormularzach(path) && (
          <nav className="zus-subnav" aria-label={t("Wnioski i druki")}>
            <ul className="container">
              {[P.formularze, ...FORMULARZE].map((p) => (
                <li key={p.href}><Link href={p.href} aria-current={path === p.href ? "page" : undefined}>{t(p.href === "/formularze" ? "Wszystkie wnioski i druki" : p.nazwa)}</Link></li>
              ))}
            </ul>
          </nav>
        )}
        {crumbs.length > 0 && (
          <nav className="crumbs" aria-label={t("Ścieżka nawigacji")}>
            <div className="container crumbs__row">
              <Link href="/" className="crumbs__home" aria-label={t("Start")} onClick={zamknij}>
                <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M3 13.5 14 4l11 9.5M6 11.5V24h6.5v-7h3v7H22V11.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
              </Link>
              <ol className="crumbs__list">
                {crumbs.map((c) => (
                  <li key={c.href} className={c.biezacy ? "last" : undefined}>
                    {c.biezacy ? <span aria-current="page">{t(c.label)}</span> : <Link href={c.href} onClick={zamknij}>{t(c.label)}</Link>}
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
