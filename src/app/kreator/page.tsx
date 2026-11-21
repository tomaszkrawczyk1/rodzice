"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DRZEWO, DRZEWO_START, DRUKI, kalkulatorLink, pytanie } from "@/content/poradnik";
import { odczytajPostep, rozwinPostep } from "@/lib/postep-kreatora";

function Pytania({ start }: { start: string }) {
  const klucz = `rodzice.kreator.v1.${start}`;
  const [postep, setPostep] = useState<number[] | null>(null);
  const [bladZapisu, setBladZapisu] = useState(false);
  const naglowek = useRef<HTMLHeadingElement>(null);
  const przeniesFokus = useRef(false);
  const { id, wybory } = rozwinPostep(postep ?? [], start, DRZEWO);
  const w = DRZEWO[id];

  useEffect(() => {
    try {
      setPostep(odczytajPostep(sessionStorage.getItem(klucz), start, DRZEWO));
    } catch {
      setPostep([]);
      setBladZapisu(true);
    }
  }, [klucz, start]);

  useEffect(() => {
    if (!przeniesFokus.current) return;
    przeniesFokus.current = false;
    naglowek.current?.focus();
  }, [postep]);

  function zapisz(kroki: number[]) {
    try {
      if (kroki.length) sessionStorage.setItem(klucz, JSON.stringify(kroki));
      else sessionStorage.removeItem(klucz);
      setBladZapisu(false);
    } catch {
      setBladZapisu(true);
    }
    przeniesFokus.current = true;
    setPostep(kroki);
  }

  if (!postep) return <p role="status">Wczytujemy zapisane odpowiedzi…</p>;
  return (
    <>
      <p className="muted" role={bladZapisu ? "status" : undefined}>{bladZapisu
        ? "Nie można zapisać odpowiedzi. Odświeżenie lub zamknięcie karty je usunie."
        : "Możesz odświeżyć tę kartę i wrócić do swoich odpowiedzi."}</p>
      {wybory.length > 0 && <p className="small muted">Twoje wybory: {wybory.join(" / ")}</p>}
      {w.typ === "pytanie" ? (
        <section className="card navy" aria-labelledby="kq">
          <h2 id="kq" ref={naglowek} tabIndex={-1}>{w.tekst}</h2>
          {w.podpowiedz && <p>{w.podpowiedz}</p>}
          <div>
            {w.opcje.map((o, i) => (
              <button key={o.nastepny + o.etykieta} className="persona" onClick={() => zapisz([...postep, i])}>{o.etykieta}</button>
            ))}
          </div>
        </section>
      ) : (
        <section className="card accent">
          <h2 ref={naglowek} tabIndex={-1}>{w.tytul}</h2>
          <ul className="clean">
            {w.pytania.map((q) => {
              const p = pytanie(q);
              return p && <li key={q}><Link href={`/poradnik#${q}`}>{p.pytanie}</Link>
                {p.status !== "ok" && <> <span className="badge warn">Sprawdź w ZUS</span></>}
              </li>;
            })}
          </ul>
          {id === "wynik_ojcowski" && <p className="mt"><Link href="/wnioski?urlop=ojcowski">Przygotuj wniosek do pracodawcy</Link></p>}
          {w.druki.some((id) => DRUKI.some((d) => d.id === id)) && <>
            <h3 className="mt">Formularze</h3>
            <ul className="clean">{w.druki.map((id) => {
              const d = DRUKI.find((x) => x.id === id);
              return d && <li key={id}><Link href={`/druki#${id}`}>{d.nazwa}</Link></li>;
            })}</ul>
          </>}
          {(() => {
            const k = kalkulatorLink(w.kalkulator);
            return k && <p className="mt"><Link className="btn btn-primary" href={k.href}>{id === "wynik_ojcowski" ? "Policz zasiłek dla taty" : k.etykieta}</Link></p>;
          })()}
        </section>
      )}
      {postep.length > 0 && <div className="row mt no-print">
        <button className="btn btn-ghost" onClick={() => zapisz(postep.slice(0, -1))}>Wróć do poprzedniego pytania</button>
        <button className="btn btn-ghost" onClick={() => zapisz([])}>Zacznij od początku</button>
      </div>}
      {start !== DRZEWO_START && <p className="mt"><Link href="/kreator">Zobacz wszystkie sytuacje</Link></p>}
    </>
  );
}

function SciezkaKreatora() {
  const start = useSearchParams().get("sciezka") === "ojciec" ? "po_podzial" : DRZEWO_START;
  return <Pytania key={start} start={start} />;
}

export default function Kreator() {
  return (
    <>
      <h1>Kreator spraw</h1>
      <p className="lead">Odpowiedz na kilka pytań, żeby znaleźć potrzebne informacje i formularze.</p>
      <Suspense fallback={<p role="status">Wczytujemy pytania…</p>}><SciezkaKreatora /></Suspense>
    </>
  );
}
