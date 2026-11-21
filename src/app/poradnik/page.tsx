"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KATEGORIE, PYTANIA, kalkulatorLink, pytanie, type Pytanie, type Zrodlo } from "@/content/poradnik";
import { StatusBadge, StatusNota } from "@/components/StatusPytania";

const zr = (z: Zrodlo) => (z.typ === "excel" ? `Wytyczne urzędowe (wiersz ${z.wiersz})` : `Baza reguł i przepisów (${z.id})`);

function Karta({ p, open, onToggle }: { p: Pytanie; open: boolean; onToggle: (o: boolean) => void }) {
  const k = kalkulatorLink(p.kalkulator);
  const luka = p.status === "luka";
  return (
    <details id={p.id} className="dl faq" open={open} onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}>
      <summary>{p.pytanie} <StatusBadge s={p.status} /></summary>
      <StatusNota s={p.status} uwaga={p.uwaga} />
      <p className="mt">{luka ? <><b>Ogólne zasady powiązane z tą sytuacją:</b> {p.odpowiedz.replace(/^Baza nie zawiera[^.]*\.\s*/, "").replace(/^W przepisach brakuje[^.]*\.\s*/, "")}</> : p.odpowiedz}</p>
      {!luka && p.kroki && p.kroki.length > 0 && (<><h4>Co zrobić krok po kroku</h4><ol className="steps">{p.kroki.map((s, i) => <li key={i}>{s}</li>)}</ol></>)}
      <div className="row mt no-print">
        {p.druki?.map((d) => <Link key={d} className="btn btn-secondary btn-sm" href={`/druki#${d}`}>Formularz {d}</Link>)}
        {!luka && k && <Link className="btn btn-primary btn-sm" href={k.href}>{k.etykieta}</Link>}
      </div>
      {p.powiazane && p.powiazane.length > 0 && (
        <p className="small mt"><b>Zobacz też powiązane tematy:</b> {p.powiazane.map((id) => pytanie(id) && <a key={id} href={`#${id}`} style={{ marginRight: 10 }}>{pytanie(id)!.pytanie}</a>)}</p>
      )}
      {p.zrodla && <details className="small mt"><summary>Podstawa prawna i źródła odpowiedzi</summary><ul>{p.zrodla.map((z, i) => <li key={i}>{zr(z)}</li>)}</ul></details>}
    </details>
  );
}

export default function Poradnik() {
  const [kat, setKat] = useState("");
  const [q, setQ] = useState("");
  const [otw, setOtw] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) { setOtw({ [id]: true }); setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50); }
  }, []);
  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PYTANIA.filter((p) => (!kat || p.kategoria === kat) && (!s || (p.pytanie + " " + p.odpowiedz).toLowerCase().includes(s)));
  }, [kat, q]);
  return (
    <>
      <h1>Poradnik rodzica: pytania i odpowiedzi</h1>
      <p className="lead">Proste odpowiedzi, instrukcje krok po kroku i potrzebne formularze. Nie wiesz, od czego zacząć? <Link href="/kreator">Uruchom kreator spraw</Link> – odpowiesz na kilka prostych pytań i dowiesz się, co przysługuje w Twojej sytuacji.</p>
      <div className="card">
        <div className="field"><label htmlFor="szukaj">Wyszukaj w poradniku</label><input id="szukaj" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="np. urlop ojcowski, 81,5%, zwolnienie lekarskie" /></div>
        <div className="tabs" role="group" aria-label="Kategorie">
          <button className={"tab" + (!kat ? " on" : "")} onClick={() => setKat("")}>Wszystkie tematy ({PYTANIA.length})</button>
          {KATEGORIE.map((c) => <button key={c.id} className={"tab" + (kat === c.id ? " on" : "")} onClick={() => setKat(c.id)}>{c.nazwa} ({PYTANIA.filter((p) => p.kategoria === c.id).length})</button>)}
        </div>
      </div>
      <div className="mt" aria-live="polite">
        {lista.length === 0 && <p className="muted">Nie znaleźliśmy odpowiedzi dla tego hasła. Spróbuj zadać pytanie innymi słowami albo wybierz kategorię powyżej.</p>}
        {lista.map((p) => <Karta key={p.id} p={p} open={!!otw[p.id]} onToggle={(o) => setOtw((x) => ({ ...x, [p.id]: o }))} />)}
      </div>
      <p className="small muted mt">Odpowiedzi opracowano na podstawie Kodeksu pracy i ustawy o świadczeniach pieniężnych z ubezpieczenia społecznego. Treści mają charakter informacyjny i nie stanowią oficjalnej decyzji ZUS.</p>
    </>
  );
}
