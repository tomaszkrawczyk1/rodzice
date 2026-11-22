import Link from "next/link";
import type { Metadata } from "next";
import { DRUKI, LINK_WZORY, pytanie } from "@/content/poradnik";
import { kanoniczny } from "@/lib/adres-serwisu";
import drukiLinki from "@/lib/terminarz/druki-linki.json";
import { tlumaczDla } from "@/i18n/jezyki";
import { metadane } from "@/i18n/metadane";
import { pytanieWJezyku } from "@/content/poradnik-i18n";
import { jezykZSerwera } from "@/i18n/serwer";

// Tytuł i nagłówek odróżnione od /formularze (strony wyboru): tu są same instrukcje do druków ZUS.
export const generateMetadata = (): Promise<Metadata> => metadane(
  "Druki ZUS: kto składa i jak wypełnić",
  "Do czego służy każdy druk ZUS, kto go składa, gdzie i w jakim terminie, z instrukcją wypełnienia krok po kroku.",
  { alternates: { canonical: kanoniczny("/druki") } },
);

/** Adresy pustych wzorów na zus.pl (PDF albo strona druku). Pustych PDF-ów nie ma w public/, więc linkujemy do ZUS. */
const LINKI = drukiLinki.druki as Record<string, { url_zus?: string; pdf_zus?: string }>;

/** Druki wypełniane przez pracodawcę: pomagamy przygotować dane do wniosku. */
const PRZYGOTUJ: Record<string, { href: string; etykieta: string }> = {
  "Z-3": { href: "/sprawa/wniosek-zasilek", etykieta: "Przygotuj dane do wniosku" },
  "Z-3a": { href: "/sprawa/wniosek-zasilek", etykieta: "Przygotuj dane do wniosku" },
};

/** Przykładowo wypełnione druki (dane fikcyjne) z public/demo. */
const PRZYKLAD: Record<string, string> = {
  ZAM: "/demo/ZAM_przyklad_Anna_Kowalska.pdf",
  "Z-3": "/demo/Z-3_przyklad_Anna_Kowalska.pdf",
};

const nowaKarta = (t: (s: string) => string) => <span className="vh"> ({t("otwiera się w nowej karcie")})</span>;

function Akcje({ id, t }: { id: string; t: (s: string) => string }) {
  const NOWA_KARTA = nowaKarta(t);
  const link = LINKI[id];
  const kreator = PRZYGOTUJ[id];
  const przyklad = PRZYKLAD[id];
  return (
    <div className="row no-print druk-akcje">
      {link?.pdf_zus
        ? <a className="btn btn-primary" href={link.pdf_zus} target="_blank" rel="noopener noreferrer">{t("Pobierz PDF")}{NOWA_KARTA}</a>
        : <a className="btn btn-primary" href={link?.url_zus ?? LINK_WZORY} target="_blank" rel="noopener noreferrer">{t("Pobierz druk ze strony ZUS")}{NOWA_KARTA}</a>}
      {kreator && <Link className="btn btn-secondary" href={kreator.href}>{t(kreator.etykieta)}</Link>}
      {przyklad && <a className="btn btn-ghost" href={przyklad} target="_blank" rel="noopener">{t("Zobacz przykład wypełnienia (PDF)")}{NOWA_KARTA}</a>}
    </div>
);
}

export default async function Druki() {
  const jezyk = await jezykZSerwera();
  const t = tlumaczDla(jezyk);
  const NOWA_KARTA = nowaKarta(t);
  return (
    <>
      <h1>{t("Druki ZUS: kto składa i jak wypełnić")}</h1>
      <p className="lead">{t("Przy każdym druku możesz go od razu pobrać. Niżej jest instrukcja krok po kroku.")}</p>
      <nav className="tabs" aria-label={t("Wybierz formularz")}>{DRUKI.map((d) => <a key={d.id} className="tab" href={`#${d.id}`}>{d.id}</a>)}</nav>
      {DRUKI.map((d) => (
        <section key={d.id} id={d.id} className="card accent mt" aria-labelledby={`h-${d.id}`}>
          <h2 id={`h-${d.id}`}>{t(d.nazwa)}</h2>
          <Akcje id={d.id} t={t} />
          <dl className="kv mt">
            <dt>{t("Do czego służy")}</dt><dd>{t(d.do_czego)}</dd>
            <dt>{t("Kto składa")}</dt><dd>{t(d.kto_sklada)}</dd>
            <dt>{t("Gdzie złożyć")}</dt><dd>{t(d.gdzie)}</dd>
          </dl>
          {d.terminy.length > 0 && <><h3 className="mt">{t("Ważne terminy")}</h3><ul className="clean warnlist">{d.terminy.map((x, i) => <li key={i}>{t(x)}</li>)}</ul></>}
          <details className="dl mt">
            <summary>{t("Instrukcja krok po kroku")} ({d.tutorial.length} {t(d.tutorial.length === 1 ? "krok" : d.tutorial.length < 5 ? "kroki" : "kroków")})</summary>
            <ol className="steps">{d.tutorial.map((x, i) => <li key={i}>{t(x)}</li>)}</ol>
          </details>
          {d.uwagi.length > 0 && <div className="alert info"><b>{t("Warto wiedzieć:")}</b> {d.uwagi.map((x) => t(x)).join(" ")}</div>}
          {d.pytania.length > 0 && (
          <div className="row mt no-print">
            {d.pytania.slice(0, 4).map((q) => {
              const p = pytanie(q);
                return p && <Link key={q} className="btn btn-ghost" href={`/poradnik#${q}`}>{pytanieWJezyku(p, jezyk).pytanie}</Link>;
            })}
          </div>
          )}
        </section>
      ))}
      <p className="small muted mt">{t("Wszystkie wzory druków znajdziesz też na stronie")} <a href={LINK_WZORY} target="_blank" rel="noopener noreferrer">{t("zus.pl (wzory formularzy)")}{NOWA_KARTA}</a>. {t("W aplikacji prezentujemy wskazówki, jak prawidłowo wypełnić wnioski. Dane w prototypie mają charakter przykładowy.")}</p>
    </>
  );
}
