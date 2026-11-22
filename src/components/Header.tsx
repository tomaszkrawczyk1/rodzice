"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSesja } from "@/lib/sesja";
import { TYTULY_SPRAW } from "@/lib/sprawy-tytuly";
import Dostepnosc from "./Dostepnosc";
import Jezyk from "./Jezyk";
import { useT } from "@/lib/jezyk";

// Siedem pozycji na wierzchu plus „Więcej": cztery podstrony o papierach (druki, kreator wniosków, wgrywanie, konto w ZUS)
// są pod jedną pozycją „Formularze", a po wejściu w którąkolwiek z nich widać ich wspólne podmenu.
const NAV = [
  ["/", "Start"], ["/sprawy", "Sprawy"], ["/kalendarz", "Kalendarz"], ["/terminarz", "Kalendarz w urzędzie"], ["/kalkulator", "Kalkulator"], ["/poradnik", "Poradnik"], ["/formularze", "Formularze"],
] as const;
const FORMULARZE = [
  ["/druki", "Druki"], ["/wnioski", "Kreator wniosków"], ["/wgraj", "Wgraj wniosek"], ["/pue", "Konto w ZUS"],
] as const;
// „Więcej": strony, do których wcześniej dało się dojść tylko z linków na podstronach. Rozwijane podmenu (komputer)
// albo składana grupa w panelu menu (telefon). Nazwy takie jak tytuły tras.
const WIECEJ = [
  ["/kreator", "Kreator spraw"], ["/trudne", "Pomoc w trudnej sytuacji"], ["/ryzyka", "Ubezpieczenie i ochrona w pracy"], ["/dokumenty", "Dokumenty i terminy"], ["/ciaza", "Co mi przysługuje w ciąży"],
] as const;
const wWiecej = (path: string) => WIECEJ.some(([h]) => path === h || path.startsWith(h + "/"));
const wFormularzach = (path: string) => path === "/formularze" || FORMULARZE.some(([h]) => path === h || path.startsWith(h + "/"));

// Nazwy w okruszkach: te same co w menu, a dla stron spoza menu: tytuły tras.
const NAZWY: Record<string, string> = {
  "/sprawy": "Sprawy",
  "/kalendarz": "Kalendarz",
  "/terminarz": "Kalendarz w urzędzie",
  "/poradnik": "Poradnik",
  "/kalkulator": "Kalkulator",
  "/formularze": "Formularze",
  "/druki": "Druki",
  "/wnioski": "Kreator wniosków",
  "/wgraj": "Wgraj wniosek",
  "/pue": "Konto w ZUS",
  "/logowanie": "Logowanie",
  "/kreator": "Kreator spraw",
  "/ryzyka": "Ubezpieczenie i ochrona w pracy",
  "/trudne": "Pomoc w trudnej sytuacji",
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
  const { sesja, wyloguj } = useSesja();
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
  const logowanie = sesja ? (
    <button type="button" className="pue-login" title={sesja.osoba} aria-label={t("Wyloguj ({imie})", { imie })} onClick={() => { wyloguj(); zamknij(); }}>
      <span className="pue-login__label">{t("Wyloguj")}<span className="pue-login__imie"> ({imie})</span></span><span className="pue-arrow" aria-hidden="true" />
    </button>
  ) : (
    <Link href="/logowanie" className="pue-login login" aria-label={t("Zaloguj się")} onClick={zamknij}><span className="pue-login__label">{t("Zaloguj")}</span><span className="pue-arrow" aria-hidden="true" /></Link>
  );

  return (
    <div className="site-top">
      {/* Jedyny komunikat „to nie ZUS": stopka go już nie powtarza. */}
      <div className="sim-banner" role="note">{t("Wersja testowa. To nie jest oficjalna usługa ZUS.")}</div>
      <header id="header" className="header zus-header">
        <div className="zus-header__bar">
          <Link href="/" className="zus-logo brand" aria-label={t("Przewodnik Przyszłego Rodzica, strona główna")} onClick={zamknij}>
            <img className="zus-logo__img" src="/logo_zus_darker_with_text.svg" alt="" width={250} height={56} />
          </Link>
          <div className="zus-product brand-text">
            <b>{t("Przewodnik Przyszłego Rodzica")}</b>
            <span>{t("Prototyp: zasiłki i urlopy dla rodziców")}</span>
          </div>
          <div className="zus-header__tools">
            <Link href="/#zapytaj" className="zus-search" aria-label={t("Szukaj sprawy")} onClick={zamknij}>
              <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true" focusable="false"><circle cx="19" cy="19" r="17" fill="none" stroke="currentColor" strokeWidth="2.4" /><circle cx="17" cy="17" r="7" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="m22.5 22.5 7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              <span className="zus-search__txt">{t("Szukaj")}</span>
            </Link>
            <Jezyk />
            <Dostepnosc />
            {logowanie}
          </div>
          <button ref={menuBtn} type="button" className="menu-btn" aria-expanded={open} aria-controls="nav" aria-label={open ? t("Zamknij menu") : t("Otwórz menu")} onClick={() => { setOpen(!open); setWiecej(!open && wiecejAktywne); }}>
            {open
              ? <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><path d="m5 5 16 16M21 5 5 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>
              : <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false"><path d="M3 6h20M3 13h20M3 20h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>}
          </button>
        </div>
        <nav id="nav" ref={navRef} className={"nav zus-nav" + (open ? " open" : "")} aria-label={t("Główna nawigacja")}>
          <ul className="zus-nav__list">
            {NAV.map(([h, nazwa]) => {
              const on = aktywny(path, h);
              return (
                <li key={h} className={on ? "selected" : undefined}>
                  <Link href={h} aria-current={on ? "page" : undefined} className={on ? "active" : ""} onClick={zamknij}>{t(nazwa)}</Link>
                  {h === "/formularze" && (
                    <ul className="zus-nav__sub" aria-label={t("Formularze i konto w ZUS")}>
                      {FORMULARZE.map(([sh, st]) => (
                        <li key={sh}><Link href={sh} aria-current={path === sh ? "page" : undefined} onClick={zamknij}>{t(st)}</Link></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <li ref={wiecejLi} className={"zus-nav__more" + (wiecejAktywne ? " selected" : "")} onKeyDown={strzalki}
              onBlur={(e) => { if (wiecej && !e.currentTarget.contains(e.relatedTarget as Node | null)) setWiecej(false); }}>
              <button ref={wiecejBtn} type="button" className={"zus-nav__more-btn" + (wiecejAktywne ? " active" : "")} aria-expanded={wiecej} aria-controls="nav-wiecej" onClick={() => setWiecej(!wiecej)}>
                {t("Więcej")}<svg className="zus-nav__chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <ul id="nav-wiecej" className="zus-nav__drop" aria-label={t("Więcej: pomoc w sytuacji i dodatkowe narzędzia")} hidden={!wiecej}>
                {WIECEJ.map(([h, nazwa]) => (
                  <li key={h}><Link href={h} aria-current={path === h ? "page" : undefined} onClick={zamknij}>{t(nazwa)}</Link></li>
                ))}
              </ul>
            </li>
          </ul>
          <div className="zus-nav__tools"><Jezyk wariant="menu" /><Dostepnosc wariant="menu" /></div>
        </nav>
        {wFormularzach(path) && (
          <nav className="zus-subnav" aria-label={t("Formularze i konto w ZUS")}>
            <ul className="container">
              {FORMULARZE.map(([sh, st]) => (
                <li key={sh}><Link href={sh} aria-current={path === sh ? "page" : undefined}>{t(st)}</Link></li>
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
