"use client";
import { useState } from "react";
import Link from "next/link";
import { DRZEWO, DRZEWO_START, DRUKI, kalkulatorLink, pytanie } from "@/content/poradnik";
import { StatusBadge } from "@/components/StatusPytania";

export default function Kreator() {
  const [sciezka, setSciezka] = useState<string[]>([DRZEWO_START]);
  const [wybory, setWybory] = useState<string[]>([]);
  const id = sciezka[sciezka.length - 1];
  const w = DRZEWO[id];
  const wroc = () => { setSciezka((s) => s.slice(0, -1)); setWybory((s) => s.slice(0, -1)); };
  const od_nowa = () => { setSciezka([DRZEWO_START]); setWybory([]); };
  return (
    <>
      <h1>Kreator: co mnie dotyczy?</h1>
      <p className="lead">Odpowiedz na kilka pytań. Wskażemy odpowiedzi z poradnika, potrzebne druki i właściwy kalkulator.</p>
      {wybory.length > 0 && <p className="small muted" aria-label="Twoje odpowiedzi">Twoje odpowiedzi: {wybory.join(" → ")}</p>}
      {w.typ === "pytanie" ? (
        <div className="card navy" role="group" aria-labelledby="kq">
          <h2 id="kq">{w.tekst}</h2>
          {w.podpowiedz && <p className="muted">{w.podpowiedz}</p>}
          <div className="grid">
            {w.opcje.map((o) => (
              <button key={o.nastepny + o.etykieta} className="persona" onClick={() => { setSciezka((s) => [...s, o.nastepny]); setWybory((s) => [...s, o.etykieta]); }}>{o.etykieta}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card accent" aria-live="polite">
          <h2>{w.tytul}</h2>
          <h3>Pytania z poradnika, które Cię dotyczą</h3>
          <ul className="clean">
            {w.pytania.map((q) => { const p = pytanie(q); return p && <li key={q}><Link href={`/poradnik#${q}`}>{p.pytanie}</Link> <StatusBadge s={p.status} /></li>; })}
          </ul>
          {w.druki.length > 0 && (<><h3 className="mt">Potrzebne druki</h3><div className="row">{w.druki.map((d) => DRUKI.find((x) => x.id === d) ? <Link key={d} className="btn btn-secondary btn-sm" href={`/druki#${d}`}>{d}</Link> : <span key={d} className="badge sim">{d}</span>)}</div></>)}
          {(() => { const k = kalkulatorLink(w.kalkulator); return k && <div className="mt"><Link className="btn btn-primary" href={k.href}>{k.etykieta}</Link></div>; })()}
        </div>
      )}
      <div className="row mt no-print">
        {sciezka.length > 1 && <button className="btn btn-ghost" onClick={wroc}>← Wstecz</button>}
        {sciezka.length > 1 && <button className="btn btn-ghost" onClick={od_nowa}>Zacznij od nowa</button>}
      </div>
    </>
  );
}
