"use client";
import { useState } from "react";
import Link from "next/link";
import { PYTANIA } from "@/content/poradnik";
import { szukaj } from "@/lib/sprawy";
import { StatusBadge } from "./StatusPytania";
import { Plakietka, Lupa, ikonaSprawy } from "./Ikony";

const PRZYKLADY = ["szef nie chce dać urlopu", "ile dostanę po porodzie", "mąż chce wziąć urlop", "adopcja"];

/** wariant "glowny": duże pole jak w wyszukiwarce, na górze strony głównej (nagłówek h2 zaraz pod h1). */
export default function Szukaj({ wariant = "karta" }: { wariant?: "karta" | "glowny" }) {
  const [q, setQ] = useState("");
  const [wyslane, setWyslane] = useState("");
  const w = wyslane ? szukaj(wyslane, PYTANIA) : null;
  const pusto = w && !w.sprawy.length && !w.faq.length;
  const glowny = wariant === "glowny";
  return (
    <section className={"ask " + (glowny ? "ask--glowny" : "mt")} id="zapytaj" aria-labelledby="zq">
      {glowny
        ? <h2 id="zq">Opisz sprawę własnymi słowami</h2>
        : <h3 id="zq">Nie widzisz swojej sprawy? Opisz ją własnymi słowami</h3>}
      <form className={"row search" + (glowny ? " search--duze" : "")} role="search" onSubmit={(e) => { e.preventDefault(); setWyslane(q.trim()); }}>
        <div className="search__box">
          <Lupa />
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="np. zasiłek po porodzie, urlop u pracodawcy"
            aria-label="Opisz, co chcesz załatwić"
          />
        </div>
        <button className="btn btn-szukaj">Znajdź sprawę</button>
      </form>
      <p className="small muted ask__przyklady">
        Przykłady:{" "}
        {PRZYKLADY.map((p) => (
          <button key={p} type="button" className="chip" onClick={() => { setQ(p); setWyslane(p); }}>
            {p}
          </button>
        ))}
      </p>
      {w && (
        <div className="mt" aria-live="polite">
          {w.sprawy.length > 0 && (
            <>
              <b>Pasujące sprawy:</b>
              <div className="grid g3 mt">
                {w.sprawy.map((s) => (
                  <Link key={s.id} href={`/sprawa/${s.id}`} className="tile tile--ico">
                    <Plakietka nazwa={ikonaSprawy(s.id)} />
                    <span className="tile__txt"><b>{s.tytul}</b><span>{s.krotko}</span></span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {w.faq.length > 0 && (
            <>
              <p className="mt"><b>Pytania i odpowiedzi z poradnika:</b></p>
              <ul className="clean">
                {w.faq.map((f) => (
                  <li key={f.id}>
                    <Link href={`/poradnik#${f.id}`}>{f.pytanie}</Link> <StatusBadge s={f.status} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {pusto && (
            <p>
              Nie znaleźliśmy jednoznacznej odpowiedzi w oficjalnych przepisach.{" "}
              <Link href="/pue">Napisz do konsultanta ZUS przez konto PUE / eZUS</Link> albo{" "}
              <Link href="/sprawy">przejrzyj listę wszystkich spraw</Link>.
            </p>
          )}
        </div>
      )}
      <p className="small muted ask__nota">
        Wyszukiwarka korzysta z oficjalnych przepisów ZUS i Kodeksu pracy. Jeśli Twoja sprawa wymaga indywidualnej oceny, wskażemy właściwy kontakt.
      </p>
    </section>
  );
}
