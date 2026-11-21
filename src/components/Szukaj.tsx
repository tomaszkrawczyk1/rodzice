"use client";
import { useState } from "react";
import Link from "next/link";
import { PYTANIA } from "@/content/poradnik";
import { szukaj } from "@/lib/sprawy";
import { StatusBadge } from "./StatusPytania";

const PRZYKLADY = ["szef nie chce dać urlopu", "ile dostanę po porodzie", "mąż chce wziąć urlop", "adopcja"];

export default function Szukaj() {
  const [q, setQ] = useState("");
  const [wyslane, setWyslane] = useState("");
  const w = wyslane ? szukaj(wyslane, PYTANIA) : null;
  const pusto = w && !w.sprawy.length && !w.faq.length;
  return (
    <section className="ask mt" id="zapytaj" aria-labelledby="zq">
      <h3 id="zq">Nie widzisz swojej sprawy? Opisz ją własnymi słowami</h3>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setWyslane(q.trim()); }}>
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="np. zasiłek po porodzie, urlop u pracodawcy"
          aria-label="Opisz, co chcesz załatwić"
          style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}
        />
        <button className="btn btn-primary">Znajdź sprawę</button>
      </form>
      <p className="small muted" style={{ margin: "8px 0 0" }}>
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
                  <Link key={s.id} href={`/sprawa/${s.id}`} className="tile">
                    <span className={`ic ic-${s.id}`} aria-hidden="true">{s.ikona}</span>
                    <b>{s.tytul}</b>
                    <span>{s.krotko}</span>
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
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        Wyszukiwarka przeszukuje oficjalne przepisy ZUS i Kodeksu pracy. Jeśli Twoja sprawa wymaga indywidualnej oceny, wskażemy właściwy kontakt.
      </p>
    </section>
  );
}
