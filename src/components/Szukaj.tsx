"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useJezyk } from "@/lib/jezyk";
import { pytanieWJezyku } from "@/content/poradnik-i18n";
import type { Pytanie } from "@/content/poradnik";
import { naPolskieZapytanie } from "@/lib/szukaj-jezyki";
import { PYTANIA } from "@/content/poradnik";
import { szukajLuzno, maSens } from "@/lib/szukaj";
import { trafienia, type Rekord } from "@/lib/indeks-szukaj";
import { przejdzKrok } from "@/lib/adres-kroku";
import { MAKS_ZAPYTANIA, normalizujZapytanie } from "@/lib/adres-glowna";
import { przejdzDoKroku } from "@/lib/ekran";
import { StatusBadge } from "./StatusPytania";
import { Plakietka, Lupa, ikonaSprawy } from "./Ikony";

const PRZYKLADY = ["urodziły nam się bliźniaki", "ile dostanę po porodzie", "urlop dla taty", "szef nie chce dać urlopu", "mam firmę (JDG)"];
const IKONY_STRON: Record<string, string> = { kalkulator: "plan", kalendarz: "kalendarz", terminarz: "zegar", ryzyka: "tarcza", trudne: "trudne", pue: "budynek", wnioski: "formularz" };
const ikonaRekordu = (r: Rekord) => r.rodzaj === "sprawa" ? ikonaSprawy(r.id) : r.rodzaj === "druk" ? "formularz" : r.rodzaj === "wynik" ? "plan" : r.rodzaj === "strona" ? (IKONY_STRON[r.id] ?? "dokument") : "dokument";
const PODPOWIEDZ_PUSTE = "Wpisz kilka słów opisujących sprawę, np. „zasiłek po porodzie” albo „urlop ojcowski”.";
const PODPOWIEDZ_BEZ_SLOW = "Nie rozpoznaliśmy w tym tekście słów do wyszukania. Wpisz kilka słów opisujących sprawę, np. „urlop ojcowski”.";

/**
 * Wyszukiwarka spraw.
 * `zapytanie` (tekst z parametru `q` adresu) włącza tryb z adresem: wysłanie zapytania dodaje wpis historii (`?q=…`),
 * „Wstecz" wraca do poprzednich wyników, a link z `?q=` od razu pokazuje wyniki. Bez tego propsa (strona /sprawy)
 * wyszukiwarka działa lokalnie, jak dotąd. Nic nie jest wysyłane na serwer: wyszukiwanie liczy się w przeglądarce.
 * wariant "glowny": duże pole na górze strony głównej; wejście na `/#zapytaj` przenosi do niego fokus.
 */
export default function Szukaj({ wariant = "karta", zapytanie }: { wariant?: "karta" | "glowny"; zapytanie?: string }) {
  const { t, jezyk } = useJezyk();
  const zAdresem = zapytanie !== undefined;
  const [q, setQ] = useState(zapytanie ?? "");
  const [puste, setPuste] = useState(false);
  const pole = useRef<HTMLInputElement>(null);
  const sekcja = useRef<HTMLElement>(null);
  const glowny = wariant === "glowny";

  // Adres jest źródłem prawdy: przy wejściu z linku i przy „Wstecz/Dalej" odtwarzamy pole i wyniki z `?q=`.
  useEffect(() => {
    if (zapytanie === undefined) return;
    setQ(zapytanie);
    if (zapytanie) setPuste(false);
  }, [zapytanie]);

  // `/#zapytaj`: kotwica to sekcja, a fokus ma trafić do pola. Next nie wywołuje `hashchange` przy kliknięciu linku
  // do tej samej strony, więc nasłuchujemy też kliknięć w linki z tym hashem (np. „Szukaj" w nagłówku).
  useEffect(() => {
    if (!glowny) return;
    let czas: number | undefined;
    // Chwila zwłoki: Next przewija do kotwicy po zmianie adresu, nasze przewinięcie (pod przyklejony nagłówek) ma być ostatnie.
    const doPola = () => {
      window.clearTimeout(czas);
      czas = window.setTimeout(() => przejdzDoKroku(sekcja.current, pole.current), 60);
    };
    const poZmianieHasha = () => { if (window.location.hash === "#zapytaj") doPola(); };
    const poKliknieciu = (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link) return;
      try {
        const cel = new URL((link as HTMLAnchorElement).href, window.location.href);
        if (cel.hash === "#zapytaj" && cel.pathname === window.location.pathname) doPola();
      } catch { /* niepoprawny adres: nic do zrobienia */ }
    };
    poZmianieHasha();
    window.addEventListener("hashchange", poZmianieHasha);
    document.addEventListener("click", poKliknieciu);
    return () => {
      window.clearTimeout(czas);
      window.removeEventListener("hashchange", poZmianieHasha);
      document.removeEventListener("click", poKliknieciu);
    };
  }, [glowny]);

  function wyslij(tekst: string) {
    const fraza = normalizujZapytanie(tekst);
    setQ(fraza);
    setPuste(!fraza);
    // Wpis historii dopiero przy wysłaniu, nie przy każdym znaku. Puste pole zdejmuje `q` z adresu (wyniki znikają, więc „Wstecz" je przywraca).
    if (zAdresem) przejdzKrok({ q: fraza || null });
    if (!maSens(naPolskieZapytanie(fraza, jezyk)) && !trafienia(fraza, 1, undefined, jezyk, t).length) pole.current?.focus();
  }

  // Wyniki liczą się od razu, przy każdym znaku (lokalnie, bez opóźnienia). Enter i przykłady dodatkowo zapisują `?q=` w adresie.
  const tekst = normalizujZapytanie(q);
  const tekstPL = naPolskieZapytanie(tekst, jezyk);   // w EN i UK słowa kluczowe zamieniamy na polskie, bo silnik spraw zna tylko polski
  const wyniki = tekst && maSens(tekstPL) ? szukajLuzno(tekstPL, PYTANIA) : null;
  const pewny = !!wyniki && wyniki.sprawy.length > 0;
  const nowe = tekst ? trafienia(tekstPL === tekst ? tekst : `${tekst} ${tekstPL}`, 3, pewny ? ["wynik", "druk", "strona"] : undefined, jezyk, t) : [];
  const brak = !!wyniki && !pewny && !nowe.length;
  const bezSlow = tekst.length >= 2 && !wyniki && !nowe.length;
  const komunikat = puste && !tekst ? PODPOWIEDZ_PUSTE : bezSlow ? PODPOWIEDZ_BEZ_SLOW : "";
  // Krótkie podsumowanie dla czytników ekranu: zawsze w tym samym, już istniejącym regionie, więc zmiana jest ogłaszana.
  const podsumowanie = komunikat
    || (brak ? `Nie mamy jednej pewnej odpowiedzi. Pokazujemy sprawy, które mogą pasować: ${wyniki?.podobne.length ?? 0}.`
      : wyniki || nowe.length ? `Wyniki wyszukiwania. Najlepsze trafienia: ${nowe.length}. Pasujące sprawy: ${wyniki?.sprawy.length ?? 0}. Pytania i odpowiedzi z poradnika: ${wyniki?.faq.length ?? 0}.` : "");

  return (
    <section className={"ask " + (glowny ? "ask--glowny" : "mt")} id="zapytaj" aria-labelledby="zq" ref={sekcja}>
      {glowny
        ? <h2 id="zq">{t("Opisz sprawę własnymi słowami")}</h2>
        : <h3 id="zq">{t("Nie widzisz swojej sprawy? Opisz ją własnymi słowami")}</h3>}
      <form className={"row search" + (glowny ? " search--duze" : "")} role="search" onSubmit={(e) => { e.preventDefault(); wyslij(q); }}>
        <div className="search__box">
          <Lupa />
          <input
            ref={pole}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={MAKS_ZAPYTANIA}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("np. zasiłek po porodzie, urlop u pracodawcy")}
            aria-label={t("Opisz, co chcesz załatwić")}
            aria-invalid={komunikat ? true : undefined}
            aria-describedby={komunikat ? "zq-komunikat" : undefined}
          />
        </div>
        <button className="btn btn-szukaj">{t("Znajdź sprawę")}</button>
      </form>
      <p className="small muted ask__przyklady">
        {t("Przykłady:")}{" "}
        {PRZYKLADY.map((p) => (
          <button key={p} type="button" className="chip" onClick={() => wyslij(p)}>
            {t(p)}
          </button>
        ))}
      </p>
      <p className="sr-only" role="status" aria-live="polite">{podsumowanie}</p>
      {komunikat && <p id="zq-komunikat" className="mt"><b>{komunikat}</b></p>}
      {(wyniki || nowe.length > 0) && (
        <div className="mt">
          {nowe.length > 0 && (
            <>
              <b>{t("Najlepsze trafienia:")}</b>
              <div className="grid g3 mt">
                {nowe.map((r) => (
                  <Link key={r.rodzaj + r.id} href={r.href} className="tile tile--ico">
                    <Plakietka nazwa={ikonaRekordu(r)} />
                    <span className="tile__txt"><b>{t(r.tytul)}</b><span>{t(r.opis)}</span></span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {wyniki && brak && (
            <div className="alert info" style={{ marginTop: 0 }}>
              <p style={{ margin: 0 }}>
                <b>{wyniki.podobneZZapytania
                  ? "Nie mamy jednej pewnej odpowiedzi, ale te sprawy mogą pasować:"
                  : "Nie rozpoznaliśmy jeszcze tej sprawy. Od tych spraw zaczyna najwięcej rodziców:"}</b>
              </p>
              <p className="small" style={{ margin: "4px 0 0" }}>
                Wybierz najbliższą albo opisz sprawę innymi słowami, np. „urlop dla taty” czy „zasiłek po porodzie”.
              </p>
            </div>
          )}
          {wyniki && brak && (
            <div className="grid g3 mt">
              {wyniki.podobne.map((s) => (
                <Link key={s.id} href={`/sprawa/${s.id}`} className="tile tile--ico">
                  <Plakietka nazwa={ikonaSprawy(s.id)} />
                  <span className="tile__txt"><b>{s.tytul}</b><span>{s.krotko}</span></span>
                </Link>
              ))}
            </div>
          )}
          {wyniki && wyniki.sprawy.length > 0 && (
            <>
              <b>{t("Pasujące sprawy:")}</b>
              <div className="grid g3 mt">
                {wyniki.sprawy.map((s) => (
                  <Link key={s.id} href={`/sprawa/${s.id}`} className="tile tile--ico">
                    <Plakietka nazwa={ikonaSprawy(s.id)} />
                    <span className="tile__txt"><b>{t(s.tytul)}</b><span>{t(s.krotko)}</span></span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {wyniki && wyniki.faq.length > 0 && (
            <>
              <p className="mt"><b>{t("Pytania i odpowiedzi z poradnika:")}</b></p>
              <ul className="clean">
                {wyniki.faq.map((f) => (
                  <li key={f.id}>
                    <Link href={`/poradnik#${f.id}`}>{pytanieWJezyku(f as Pytanie, jezyk).pytanie}</Link> <StatusBadge s={f.status} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {brak && (
            <>
              <p className="mt"><b>Możesz też:</b></p>
              <ul className="clean">
                <li><Link href="/kalkulator">Policzyć w kalkulatorze, ile wyniesie zasiłek i jak długi będzie urlop</Link></li>
                <li><Link href="/poradnik">Przejrzeć Poradnik: pytania i odpowiedzi rodziców</Link></li>
                <li><Link href="/sprawy">Zobaczyć listę wszystkich spraw</Link></li>
              </ul>
              <p className="small muted mt">
                Jeśli nic tu nie pasuje, możesz zapytać konsultanta ZUS:{" "}
                <Link href="/pue">napisz przez konto PUE / eZUS</Link>.
            </p>
            </>
          )}
        </div>
      )}
      {(wyniki || nowe.length > 0) && <p className="small muted ask__nota">
        {t("Wyszukiwarka korzysta z oficjalnych przepisów ZUS i Kodeksu pracy. Jeśli Twoja sprawa wymaga indywidualnej oceny, wskażemy właściwy kontakt.")}
      </p>}
    </section>
  );
}
