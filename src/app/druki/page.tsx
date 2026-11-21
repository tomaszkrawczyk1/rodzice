import Link from "next/link";
import { DRUKI, LINK_WZORY } from "@/content/poradnik";

export const metadata = { title: "Druki – Przewodnik Przyszłego Rodzica" };

export default function Druki() {
  return (
    <>
      <h1>Druki do wniosków</h1>
      <p className="lead">Sześć druków, z którymi rodzic najczęściej ma do czynienia. Puste wzory pobierzesz ze strony <a href={LINK_WZORY} target="_blank" rel="noopener noreferrer">zus.pl – wzory formularzy</a>.</p>
      <nav className="tabs" aria-label="Skok do druku">{DRUKI.map((d) => <a key={d.id} className="tab" href={`#${d.id}`}>{d.id}</a>)}</nav>
      {DRUKI.map((d) => (
        <section key={d.id} id={d.id} className="card accent mt" aria-labelledby={`h-${d.id}`}>
          <h2 id={`h-${d.id}`}>{d.nazwa}</h2>
          <dl className="kv">
            <dt>Do czego</dt><dd>{d.do_czego}</dd>
            <dt>Kto składa</dt><dd>{d.kto_sklada}</dd>
            <dt>Gdzie</dt><dd>{d.gdzie}</dd>
          </dl>
          {d.terminy.length > 0 && <><h3 className="mt">Terminy</h3><ul className="clean warnlist">{d.terminy.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
          <h3 className="mt">Jak to zrobić</h3>
          <ol className="steps">{d.tutorial.map((t, i) => <li key={i}>{t}</li>)}</ol>
          {d.uwagi.length > 0 && <div className="alert info"><b>Uwaga:</b> {d.uwagi.join(" ")}</div>}
          <div className="row mt no-print">
            <a className="btn btn-primary btn-sm" href={LINK_WZORY} target="_blank" rel="noopener noreferrer">Pobierz wzór na zus.pl</a>
            {d.pytania.slice(0, 4).map((q) => <Link key={q} className="btn btn-ghost btn-sm" href={`/poradnik#${q}`}>Pytanie {q}</Link>)}
          </div>
        </section>
      ))}
      <p className="small muted mt">Wypełnione druki i dokumenty z prawdziwych spraw nie są częścią aplikacji. Dane w prototypie są fikcyjne.</p>
    </>
  );
}
