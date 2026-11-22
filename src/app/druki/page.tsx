import Link from "next/link";
import type { Metadata } from "next";
import { DRUKI, LINK_WZORY, pytanie } from "@/content/poradnik";
import { kanoniczny } from "@/lib/adres-serwisu";
import drukiLinki from "@/lib/terminarz/druki-linki.json";
import { tlumaczDla } from "@/i18n/jezyki";
import { jezykZSerwera } from "@/i18n/serwer";

// Tytuł i nagłówek odróżnione od /formularze (strony wyboru): tu są same instrukcje do druków ZUS.
export const metadata: Metadata = {
  title: "Druki ZUS: kto składa i jak wypełnić – Przewodnik Przyszłego Rodzica",
  description: "Do czego służy każdy druk ZUS, kto go składa, gdzie i w jakim terminie, z instrukcją wypełnienia krok po kroku.",
  alternates: { canonical: kanoniczny("/druki") },
};

/** Adresy pustych wzorów na zus.pl (PDF albo strona druku). Pustych PDF-ów nie ma w public/, więc linkujemy do ZUS. */
const LINKI = drukiLinki.druki as Record<string, { url_zus?: string; pdf_zus?: string }>;

/** Druki, dla których w aplikacji jest kreator wypełnienia. */
const KREATOR: Record<string, { href: string; etykieta: string }> = {
  ZAM: { href: "/wnioski?druk=ZAM", etykieta: "Wypełnij ten druk" },
};

/** Druki wypełniane przez pracodawcę: zamiast kreatora pomagamy przygotować dane do wniosku. */
const PRZYGOTUJ: Record<string, { href: string; etykieta: string }> = {
  "Z-3": { href: "/sprawa/wniosek-zasilek", etykieta: "Przygotuj dane do wniosku" },
  "Z-3a": { href: "/sprawa/wniosek-zasilek", etykieta: "Przygotuj dane do wniosku" },
};

/** Przykładowo wypełnione druki (dane fikcyjne) z public/demo. */
const PRZYKLAD: Record<string, string> = {
  ZAM: "/demo/ZAM_przyklad_Anna_Kowalska.pdf",
  "Z-3": "/demo/Z-3_przyklad_Anna_Kowalska.pdf",
};

const NOWA_KARTA = <span className="vh"> (otwiera się w nowej karcie)</span>;

function Akcje({ id }: { id: string }) {
  const link = LINKI[id];
  const kreator = KREATOR[id] ?? PRZYGOTUJ[id];
  const przyklad = PRZYKLAD[id];
  return (
    <div className="row no-print druk-akcje">
      {link?.pdf_zus
        ? <a className="btn btn-primary" href={link.pdf_zus} target="_blank" rel="noopener noreferrer">Pobierz PDF{NOWA_KARTA}</a>
        : <a className="btn btn-primary" href={link?.url_zus ?? LINK_WZORY} target="_blank" rel="noopener noreferrer">Pobierz druk ze strony ZUS{NOWA_KARTA}</a>}
      {kreator && <Link className={"btn " + (KREATOR[id] ? "btn-primary" : "btn-secondary")} href={kreator.href}>{kreator.etykieta}</Link>}
      {przyklad && <a className="btn btn-ghost" href={przyklad} target="_blank" rel="noopener">Zobacz przykład wypełnienia (PDF){NOWA_KARTA}</a>}
    </div>
);
}

export default async function Druki() {
  const jezyk = await jezykZSerwera();
  const t = tlumaczDla(jezyk);
  return (
    <>
      <h1>{t("Druki ZUS: kto składa i jak wypełnić")}</h1>
      <p className="lead">Przy każdym druku możesz go od razu pobrać, a jeśli mamy kreator, wypełnić go razem z nami. Niżej jest instrukcja krok po kroku.</p>
      <nav className="tabs" aria-label={t("Wybierz formularz")}>{DRUKI.map((d) => <a key={d.id} className="tab" href={`#${d.id}`}>{d.id}</a>)}</nav>
      {DRUKI.map((d) => (
        <section key={d.id} id={d.id} className="card accent mt" aria-labelledby={`h-${d.id}`}>
          <h2 id={`h-${d.id}`}>{d.nazwa}</h2>
          <Akcje id={d.id} />
          {!KREATOR[d.id] && !PRZYGOTUJ[d.id] && <p className="small muted mt">Dla tego druku nie mamy jeszcze kreatora. Pomoże Ci instrukcja poniżej.</p>}
          <dl className="kv mt">
            <dt>{t("Do czego służy")}</dt><dd>{d.do_czego}</dd>
            <dt>{t("Kto składa")}</dt><dd>{d.kto_sklada}</dd>
            <dt>{t("Gdzie złożyć")}</dt><dd>{d.gdzie}</dd>
          </dl>
          {d.terminy.length > 0 && <><h3 className="mt">{t("Ważne terminy")}</h3><ul className="clean warnlist">{d.terminy.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
          <details className="dl mt">
            <summary>Instrukcja krok po kroku ({d.tutorial.length} {d.tutorial.length === 1 ? "krok" : d.tutorial.length < 5 ? "kroki" : "kroków"})</summary>
            <ol className="steps">{d.tutorial.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </details>
          {d.uwagi.length > 0 && <div className="alert info"><b>{t("Warto wiedzieć:")}</b> {d.uwagi.join(" ")}</div>}
          {d.pytania.length > 0 && (
          <div className="row mt no-print">
            {d.pytania.slice(0, 4).map((q) => {
              const p = pytanie(q);
                return p && <Link key={q} className="btn btn-ghost" href={`/poradnik#${q}`}>{p.pytanie}</Link>;
            })}
          </div>
          )}
        </section>
      ))}
      <p className="small muted mt">Wszystkie wzory druków znajdziesz też na stronie <a href={LINK_WZORY} target="_blank" rel="noopener noreferrer">zus.pl (wzory formularzy){NOWA_KARTA}</a>. W aplikacji prezentujemy wskazówki, jak prawidłowo wypełnić wnioski. Dane w prototypie mają charakter przykładowy.</p>
    </>
  );
}
