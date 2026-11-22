import Link from "next/link";
import type { Metadata } from "next";
import { DRUKI, LINK_WZORY, pytanie } from "@/content/poradnik";
import { kanoniczny } from "@/lib/adres-serwisu";
import { jezykZSerwera } from "@/i18n/serwer";
import { tlumaczDla } from "@/i18n/jezyki";
import { pytanieWJezyku } from "@/content/poradnik-i18n";
import { metadane } from "@/i18n/metadane";

// Tytuł i nagłówek odróżnione od /formularze (strony wyboru): tu są same instrukcje do druków ZUS.
export const generateMetadata = (): Promise<Metadata> => metadane(
  "Druki ZUS: kto składa i jak wypełnić",
  "Do czego służy każdy druk ZUS, kto go składa, gdzie i w jakim terminie, z instrukcją wypełnienia krok po kroku.",
  { alternates: { canonical: kanoniczny("/druki") } },
);

export default async function Druki() {
  const jezyk = await jezykZSerwera();
  const t = tlumaczDla(jezyk);
  return (
    <>
      <h1>{t("Druki ZUS: kto składa i jak wypełnić")}</h1>
      <p className="lead">{t("Sprawdź, kto składa dany formularz i jak go wypełnić. Wzory znajdziesz na stronie")} <a href={LINK_WZORY} target="_blank" rel="noopener noreferrer">{t("zus.pl (wzory formularzy)")}</a>.</p>
      <nav className="tabs" aria-label={t("Wybierz formularz")}>{DRUKI.map((d) => <a key={d.id} className="tab" href={`#${d.id}`}>{d.id}</a>)}</nav>
      {DRUKI.map((d) => (
        <section key={d.id} id={d.id} className="card accent mt" aria-labelledby={`h-${d.id}`}>
          <h2 id={`h-${d.id}`}>{t(d.nazwa)}</h2>
          <dl className="kv">
            <dt>{t("Do czego służy")}</dt><dd>{t(d.do_czego)}</dd>
            <dt>{t("Kto składa")}</dt><dd>{t(d.kto_sklada)}</dd>
            <dt>{t("Gdzie złożyć")}</dt><dd>{t(d.gdzie)}</dd>
          </dl>
          {d.terminy.length > 0 && <><h3 className="mt">{t("Ważne terminy")}</h3><ul className="clean warnlist">{d.terminy.map((x, i) => <li key={i}>{t(x)}</li>)}</ul></>}
          <h3 className="mt">{t("Instrukcja krok po kroku")}</h3>
          <ol className="steps">{d.tutorial.map((x, i) => <li key={i}>{t(x)}</li>)}</ol>
          {d.uwagi.length > 0 && <div className="alert info"><b>{t("Warto wiedzieć:")}</b> {d.uwagi.map((x) => t(x)).join(" ")}</div>}
          <div className="row mt no-print">
            <a className="btn btn-primary btn-sm" href={LINK_WZORY} target="_blank" rel="noopener noreferrer">{t("Otwórz wykaz formularzy ZUS")}</a>
            {d.pytania.slice(0, 4).map((q) => {
              const p = pytanie(q);
              return p && <Link key={q} className="btn btn-ghost" href={`/poradnik#${q}`}>{pytanieWJezyku(p, jezyk).pytanie}</Link>;
            })}
          </div>
        </section>
      ))}
      <p className="small muted mt">{t("W aplikacji prezentujemy wskazówki, jak prawidłowo wypełnić wnioski. Dane w prototypie mają charakter przykładowy.")}</p>
    </>
  );
}
