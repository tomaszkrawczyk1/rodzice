import Link from "next/link";
import { DRUKI, LINK_WZORY, pytanie } from "@/content/poradnik";

export const metadata = { title: "Formularze i druki – Przewodnik Przyszłego Rodzica" };

export default function Druki() {
  return (
    <>
      <h1>Formularze i druki do wniosków</h1>
      <p className="lead">Sprawdź, kto składa dany formularz i jak go wypełnić. Wzory znajdziesz na stronie <a href={LINK_WZORY} target="_blank" rel="noopener noreferrer">zus.pl (wzory formularzy)</a>.</p>
      <nav className="tabs" aria-label="Wybierz formularz">{DRUKI.map((d) => <a key={d.id} className="tab" href={`#${d.id}`}>{d.id}</a>)}</nav>
      {DRUKI.map((d) => (
        <section key={d.id} id={d.id} className="card accent mt" aria-labelledby={`h-${d.id}`}>
          <h2 id={`h-${d.id}`}>{d.nazwa}</h2>
          <dl className="kv">
            <dt>Do czego służy</dt><dd>{d.do_czego}</dd>
            <dt>Kto składa</dt><dd>{d.kto_sklada}</dd>
            <dt>Gdzie złożyć</dt><dd>{d.gdzie}</dd>
          </dl>
          {d.terminy.length > 0 && <><h3 className="mt">Ważne terminy</h3><ul className="clean warnlist">{d.terminy.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
          <h3 className="mt">Instrukcja krok po kroku</h3>
          <ol className="steps">{d.tutorial.map((t, i) => <li key={i}>{t}</li>)}</ol>
          {d.uwagi.length > 0 && <div className="alert info"><b>Warto wiedzieć:</b> {d.uwagi.join(" ")}</div>}
          <div className="row mt no-print">
            <a className="btn btn-primary btn-sm" href={LINK_WZORY} target="_blank" rel="noopener noreferrer">Otwórz wykaz formularzy ZUS</a>
            {d.pytania.slice(0, 4).map((q) => {
              const p = pytanie(q);
              return p && <Link key={q} className="btn btn-ghost" href={`/poradnik#${q}`}>{p.pytanie}</Link>;
            })}
          </div>
        </section>
      ))}
      <p className="small muted mt">W aplikacji prezentujemy wskazówki, jak prawidłowo wypełnić wnioski. Dane w prototypie mają charakter przykładowy.</p>
    </>
  );
}
