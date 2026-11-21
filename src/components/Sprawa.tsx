"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, useSesja } from "@/lib/sesja";
import { sprawa, SPRAWY, zbudujCtx, etykietaOdp, zaIle, type Ctx, type Odp, type Pyt, type Wynik } from "@/lib/sprawy";
import { PYTANIA, DRUKI, pytanie } from "@/content/poradnik";
import { dataPL } from "@/lib/format";
import { Alert, Kroki, Spin } from "./ui";
import { StatusNota } from "./StatusPytania";

const tekstPytania = (q: Pyt, o: Odp) => (typeof q.tekst === "function" ? q.tekst(o) : q.tekst);

export default function SprawaWidok({ id }: { id: string }) {
  const s = sprawa(id)!;
  const { sesja, gotowa } = useSesja();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [odp, setOdp] = useState<Odp>({});
  const [faza, setFaza] = useState<"dane" | "pytania" | "wynik">("pytania");
  const [i, setI] = useState(0);
  const [pomin, setPomin] = useState<Set<string>>(new Set());
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [blad, setBlad] = useState("");
  const [busy, setBusy] = useState(false);
  const [wpis, setWpis] = useState("");

  // dane o rodzicu (po zalogowaniu) + wartości domyślne
  useEffect(() => {
    if (!gotowa) return;
    (async () => {
      const c = sesja ? await zbudujCtx(api, sesja) : {};
      setCtx(c);
      const d: Odp = {};
      for (const q of s.pytania) { const v = q.domyslne?.(c); if (v !== undefined && v !== null) d[q.id] = String(v); }
      setOdp(d);
      const wstepne = s.pytania.filter((q) => d[q.id] !== undefined && (q.warunek?.(d, c) ?? true));
      if (!s.pytania.length) { setFaza("wynik"); }
      else setFaza(wstepne.length ? "dane" : "pytania");
    })();
  }, [gotowa, sesja]); // eslint-disable-line

  const c = ctx ?? {};
  const aktywne = useMemo(() => s.pytania.filter((q) => (q.warunek?.(odp, c) ?? true) && !pomin.has(q.id)), [odp, pomin, ctx]); // eslint-disable-line
  const wstepne = useMemo(() => s.pytania.filter((q) => q.domyslne?.(c) !== undefined && (q.warunek?.(odp, c) ?? true)), [odp, ctx]); // eslint-disable-line
  const q = aktywne[i];
  const razem = aktywne.length + (faza === "dane" || wstepne.length ? 0 : 0) + 1;

  useEffect(() => { if (q) setWpis(odp[q.id] ?? ""); }, [q?.id, faza]); // eslint-disable-line
  useEffect(() => { if (faza === "pytania" && ctx && i >= aktywne.length && s.pytania.length) uruchom(odp); }, [i, faza, aktywne.length, ctx]); // eslint-disable-line
  useEffect(() => { if (faza === "wynik" && !wynik && !blad && ctx && !s.pytania.length) uruchom({}); }, [faza, ctx]); // eslint-disable-line

  async function uruchom(o: Odp) {
    setFaza("wynik"); setBusy(true); setBlad(""); setWynik(null);
    try { setWynik(await s.licz(o, c, api)); } catch (e: any) { setBlad(e.message || "Nie udało się policzyć."); } finally { setBusy(false); scrollTo(0, 0); }
  }
  function odpowiedz(v: string) {
    if (!q) return;
    const nowe = { ...odp, [q.id]: v }; setOdp(nowe);
    const nast = s.pytania.filter((x) => (x.warunek?.(nowe, c) ?? true) && !pomin.has(x.id));
    if (i + 1 >= nast.length) uruchom(nowe); else { setI(i + 1); scrollTo(0, 0); }
  }
  const dalej = () => { const v = wpis.trim(); if (!v) return; if (q?.typ === "liczba") { const n = Number(v.replace(",", ".")); if (!(n >= (q.min ?? 0))) return; } odpowiedz(v); };
  const zatwierdzDane = () => { setPomin(new Set(wstepne.map((x) => x.id))); setFaza("pytania"); setI(0); };
  const poprawDane = () => { setPomin(new Set()); setFaza("pytania"); setI(0); };
  const wstecz = () => { if (i > 0) setI(i - 1); else if (wstepne.length) setFaza("dane"); };
  const odNowa = () => { setWynik(null); setBlad(""); setI(0); setPomin(new Set()); setFaza(wstepne.length ? "dane" : "pytania"); };

  if (!ctx) return <p><Spin /> Wczytuję…</p>;
  const postep = faza === "wynik" ? 100 : faza === "dane" ? 5 : Math.round(((i + 1) / razem) * 100);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <p className="small no-print"><Link href="/sprawy">← Wszystkie sprawy</Link></p>
      <h1>{s.tytul}</h1>
      <div className="prog" role="progressbar" aria-valuenow={postep} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp"><i style={{ width: `${postep}%` }} /></div>

      {faza === "dane" && (
        <div className="card">
          <span className="lab">Krok 1 · sprawdź swoje dane</span>
          <p className="muted small mt">Pobraliśmy je z ZUS (symulacja dla {sesja?.osoba}). Jeśli coś się nie zgadza – popraw.</p>
          <dl className="kv">{wstepne.map((x) => <div key={x.id} style={{ display: "contents" }}><dt>{x.etykietaDanych ?? tekstPytania(x, odp)}</dt><dd>{etykietaOdp(x, odp[x.id])}</dd></div>)}</dl>
          <div className="row mt"><button className="btn btn-primary" onClick={zatwierdzDane}>Wszystko się zgadza</button><button className="btn btn-secondary" onClick={poprawDane}>Coś trzeba poprawić</button></div>
        </div>
      )}

      {faza === "pytania" && q && (
        <div className="card" key={q.id}>
          <span className="lab">Pytanie {i + 1} z {razem - 1}</span>
          <h2 className="mt" id="pyt">{tekstPytania(q, odp)}</h2>
          {q.typ === "wybor" && <div role="group" aria-labelledby="pyt">{q.opcje!.map((op) => <button key={op.v} className={"opt" + (odp[q.id] === op.v ? " sel" : "")} onClick={() => odpowiedz(op.v)}><b>{op.label}</b>{op.opis && <span className="muted small" style={{ display: "block" }}>{op.opis}</span>}</button>)}</div>}
          {q.typ === "tak_nie" && <div className="row" role="group" aria-labelledby="pyt"><button className="opt" style={{ flex: 1 }} onClick={() => odpowiedz("tak")}><b>Tak</b></button><button className="opt" style={{ flex: 1 }} onClick={() => odpowiedz("nie")}><b>Nie</b></button></div>}
          {(q.typ === "liczba" || q.typ === "data" || q.typ === "tekst") && (
            <form onSubmit={(e) => { e.preventDefault(); dalej(); }}>
              <div className="row"><input aria-labelledby="pyt" autoFocus type={q.typ === "data" ? "date" : q.typ === "liczba" ? "text" : "text"} inputMode={q.typ === "liczba" ? "decimal" : undefined} value={wpis} placeholder={q.przyklad} onChange={(e) => setWpis(e.target.value)} style={{ flex: 1, minWidth: 180 }} />{q.jednostka && <span className="muted">{q.jednostka}</span>}</div>
              <div className="row mt"><button className="btn btn-primary" disabled={!wpis.trim()}>Dalej</button></div>
            </form>
          )}
          <details className="dl mt"><summary>Po co o to pytamy?</summary><p className="small">{q.poCo}</p></details>
          {q.skad && <details className="dl"><summary>Skąd to wziąć?</summary><p className="small">{q.skad}</p></details>}
          <div className="row mt no-print">{(i > 0 || wstepne.length > 0) && <button className="btn btn-ghost btn-sm" onClick={wstecz}>← Wstecz</button>}</div>
        </div>
      )}

      {faza === "wynik" && (
        <div aria-live="polite">
          {busy && <p><Spin /> Liczę…</p>}
          {blad && <><Alert t="err">{blad}</Alert><button className="btn btn-secondary" onClick={odNowa}>Wróć i popraw odpowiedzi</button></>}
          {wynik && <WynikWidok w={wynik} o={odp} onNowa={odNowa} bezPytan={!s.pytania.length} />}
        </div>
      )}
    </div>
  );
}

function kopiuj(txt: string) { navigator.clipboard?.writeText(txt).catch(() => {}); }

function WynikWidok({ w, o, onNowa, bezPytan }: { w: Wynik; o: Odp; onNowa: () => void; bezPytan: boolean }) {
  const [skop, setSkop] = useState("");
  const druki = (w.druki ?? []).filter((d, i, a) => a.indexOf(d) === i);
  const powiazane = (w.nastepne ?? []).map((id) => sprawa(id)).filter(Boolean);
  return (
    <>
      <div className={"card " + (w.lagodny ? "navy" : "accent")}>
        {w.status && w.status !== "ok" && <StatusNota s={w.status} uwaga={w.uwagaStatus} />}
        <h2 style={{ marginTop: 0 }}>{w.glowne}</h2>
        {w.duza && <div className="big">{w.duza}</div>}
        {w.podpis && <p className="muted">{w.podpis}</p>}
        {w.szczegoly && <dl className="kv mt">{w.szczegoly.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        {w.ostrzezenia?.map((x, i) => <Alert key={i} t="warn">{x}</Alert>)}
      </div>

      {w.tabela && <div className="card mt"><div className="tbl-wrap"><table className="tbl"><thead><tr>{w.tabela.kolumny.map((k) => <th key={k}>{k}</th>)}</tr></thead><tbody>{w.tabela.wiersze.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>{w.tabela.uwaga && <p className="small muted mt">{w.tabela.uwaga}</p>}</div>}

      {w.info?.map((x) => <div key={x.tytul} className="card mt"><h3>{x.tytul}</h3><p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{x.tresc}</p></div>)}

      {w.zrob.length > 0 && (
        <div className="card mt"><h2>Co teraz zrobić</h2>
          <ol className="todo">{w.zrob.map((z, i) => <li key={i}>{z.kiedy && <b className="when">{z.kiedy}: </b>}{z.tekst}{z.uwaga && <div className="small muted">{z.uwaga}</div>}</li>)}</ol>
          {w.terminy && w.terminy.length > 0 && <><h3 className="mt">Terminy</h3><ul className="clean warnlist">{w.terminy.map((t, i) => <li key={i}><b>{dataPL(t.do)}</b> ({zaIle(t.do)}): {t.co}</li>)}</ul></>}
        </div>
      )}

      {w.sciaga && (
        <div className="card mt"><h2>{w.sciaga.tytul}</h2><p className="small muted" style={{ marginTop: 0 }}>Otwórz druk obok i przepisz z tej tabeli.</p>
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Pole na druku</th><th>Wpisz</th><th>Skąd to wziąć</th></tr></thead><tbody>{w.sciaga.wiersze.map(([a, b, c], i) => <tr key={i}><td>{a}</td><td><b>{b}</b></td><td className="muted">{c}</td></tr>)}</tbody></table></div>
          {w.sciaga.uwaga && <p className="small muted mt">{w.sciaga.uwaga}</p>}
          <div className="row mt no-print"><button className="btn btn-secondary btn-sm" onClick={() => { kopiuj(w.sciaga!.wiersze.map((r) => r.slice(0, 2).join(": ")).join("\n")); setSkop("sciaga"); }}>{skop === "sciaga" ? "Skopiowano ✓" : "Kopiuj"}</button><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Drukuj</button></div></div>
      )}

      {w.tekstDoKopii && (
        <div className="card mt"><h2>{w.tekstDoKopii.tytul}</h2><pre className="wniosek">{w.tekstDoKopii.tresc}</pre>
          <div className="row no-print"><button className="btn btn-primary btn-sm" onClick={() => { kopiuj(w.tekstDoKopii!.tresc); setSkop("tekst"); }}>{skop === "tekst" ? "Skopiowano ✓" : "Kopiuj tekst"}</button><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Drukuj</button></div></div>
      )}

      {(druki.length > 0 || (w.linki && w.linki.length > 0)) && (
        <div className="row mt no-print">{druki.map((d) => DRUKI.find((x) => x.id === d) && <Link key={d} className="btn btn-secondary" href={`/druki#${d}`}>Druk {d}: jak wypełnić</Link>)}{w.linki?.map((l) => <Link key={l.href} className="btn btn-ghost" href={l.href}>{l.etykieta}</Link>)}</div>
      )}

      {w.jakLiczono && <Kroki kroki={w.jakLiczono} tytul="Jak to policzyliśmy?" />}

      {powiazane.length > 0 && <div className="card mt no-print"><h3>Co dalej?</h3><div className="grid g2">{powiazane.map((s) => <Link key={s!.id} href={`/sprawa/${s!.id}`} className="tile"><span className="ic">{s!.ikona}</span><b>{s!.tytul}</b><span>{s!.krotko}</span></Link>)}</div></div>}

      {!bezPytan && <div className="row mt no-print"><button className="btn btn-ghost" onClick={onNowa}>Zmień odpowiedzi</button><Link href="/" className="btn btn-ghost">Wróć na start</Link></div>}
      <p className="small muted mt">Wyliczenia są orientacyjne i nie stanowią decyzji ZUS. Dane w prototypie są fikcyjne.</p>
    </>
  );
}
