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
      <h3 id="zq">Nie ma tu Twojej sprawy? Opisz własnymi słowami</h3>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setWyslane(q); }}>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="np. szef nie chce mi dać urlopu po porodzie" aria-label="Opisz, co chcesz załatwić" style={{ flex: 1, minWidth: 220 }} />
        <button className="btn btn-primary">Szukaj</button>
      </form>
      <p className="small muted" style={{ margin: "8px 0 0" }}>Przykłady: {PRZYKLADY.map((p) => <button key={p} type="button" className="chip" onClick={() => { setQ(p); setWyslane(p); }}>{p}</button>)}</p>
      {w && (
        <div className="mt" aria-live="polite">
          {w.sprawy.length > 0 && <><b>Sprawy, które mogą pasować:</b><div className="grid g3 mt">{w.sprawy.map((s) => <Link key={s.id} href={`/sprawa/${s.id}`} className="tile"><span className="ic">{s.ikona}</span><b>{s.tytul}</b><span>{s.krotko}</span></Link>)}</div></>}
          {w.faq.length > 0 && <><p className="mt"><b>Odpowiedzi z poradnika:</b></p><ul className="clean">{w.faq.map((f) => <li key={f.id}><Link href={`/poradnik#${f.id}`}>{f.pytanie}</Link> <StatusBadge s={PYTANIA.find((p) => p.id === f.id)!.status} /></li>)}</ul></>}
          {pusto && <p>Nie znaleźliśmy tego w naszych źródłach, więc nie zgadujemy. <Link href="/pue">Zadaj pytanie w ZUS (symulacja PUE)</Link> albo <Link href="/sprawy">zobacz wszystkie sprawy</Link>.</p>}
        </div>
      )}
      <p className="small muted" style={{ margin: "10px 0 0" }}>Szukamy tylko w przepisach i poradniku, które znamy. Gdy czegoś nie wiemy – mówimy to wprost.</p>
    </section>
  );
}
