"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSesja, type Sesja } from "@/lib/sesja";
import { sprawa, zbudujCtx, etykietaOdp, zaIle, aktywneOdpowiedzi, bladOdpowiedzi, domyslneOdpowiedzi, zapiszOdpowiedz, type Ctx, type Odp, type Pyt, type Sprawa, type Wynik } from "@/lib/sprawy";
import { DRUKI } from "@/content/poradnik";
import { dataPL } from "@/lib/format";
import { Alert, Kroki, Spin } from "./ui";

const tekstPytania = (q: Pyt, o: Odp) => (typeof q.tekst === "function" ? q.tekst(o) : q.tekst);
const kolumnyDanych = { gridTemplateColumns: "fit-content(42%) minmax(0, 1fr)", overflowWrap: "anywhere" } as const;

export default function SprawaWidok({ id }: { id: string }) {
  const { sesja, gotowa } = useSesja();
  if (!gotowa) return <p><Spin /> Wczytuję…</p>;
  return <WczytajSprawe key={JSON.stringify([id, sesja?.token])} s={sprawa(id)!} sesja={sesja} />;
}

function WczytajSprawe({ s, sesja }: { s: Sprawa; sesja: Sesja | null }) {
  const [ctx, setCtx] = useState<Ctx | null>(sesja && s.pytania.length ? null : {});
  useEffect(() => {
    if (!sesja || !s.pytania.length) return;
    let aktywne = true;
    zbudujCtx(api, sesja).then((dane) => { if (aktywne) setCtx(dane); });
    return () => { aktywne = false; };
  }, [s, sesja]);
  if (!ctx) return <p><Spin /> Wczytuję…</p>;
  return <KrokiSprawy s={s} c={ctx} />;
}

function KrokiSprawy({ s, c }: { s: Sprawa; c: Ctx }) {
  const [domyslne] = useState(() => domyslneOdpowiedzi(s.pytania, c));
  const [odp, setOdp] = useState<Odp>(domyslne);
  const [szkice, setSzkice] = useState<Record<string, string>>({});
  const [potwierdzone, setPotwierdzone] = useState<Odp>({});
  const [historia, setHistoria] = useState<string[]>([]);
  const [faza, setFaza] = useState<"dane" | "pytania" | "wynik">(
    !s.pytania.length ? "wynik" : Object.keys(domyslne).length ? "dane" : "pytania",
  );
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [blad, setBlad] = useState("");
  const [bladPola, setBladPola] = useState("");
  const [busy, setBusy] = useState(!s.pytania.length);
  const wstepne = s.pytania.filter((q) => Object.hasOwn(domyslne, q.id) && odp[q.id] !== undefined &&
    (q.warunek?.(odp, c) ?? true) && !bladOdpowiedzi(q, odp[q.id], odp));
  const aktywne = (o: Odp, p: Odp) => s.pytania.filter((q) =>
    (q.warunek?.(o, c) ?? true) && !(p[q.id] !== undefined && p[q.id] === o[q.id] && !bladOdpowiedzi(q, o[q.id], o)),
  );
  const pytania = aktywne(odp, potwierdzone);
  const q = s.pytania.find((x) => x.id === historia.at(-1)) ?? pytania[0];
  const i = q ? pytania.indexOf(q) : -1;
  const wpis = q ? szkice[q.id] ?? odp[q.id] ?? "" : "";
  const postep = faza === "wynik" ? 100 : faza === "dane" ? 5 : Math.round(((i + 1) / (pytania.length + 1)) * 100);

  async function uruchom(o: Odp) {
    setFaza("wynik");
    setBusy(true);
    setBlad("");
    setWynik(null);
    try {
      setWynik(await s.licz(aktywneOdpowiedzi(s.pytania, o, c), c, api));
    } catch (e) {
      setBlad(e instanceof Error ? e.message : "Nie udało się policzyć.");
    } finally {
      setBusy(false);
      window.scrollTo(0, 0);
    }
  }
  useEffect(() => {
    if (s.pytania.length) return;
    let aktywne = true;
    s.licz({}, c, api).then(
      (w) => { if (aktywne) { setWynik(w); setBusy(false); } },
      () => { if (aktywne) { setBlad("Nie udało się wczytać sprawy."); setBusy(false); } },
    );
    return () => { aktywne = false; };
  }, [s, c]);

  function odpowiedz(v: string) {
    if (!q) return;
    const odpowiedz = v.trim();
    const blad = bladOdpowiedzi(q, odpowiedz, odp);
    setBladPola(blad ?? "");
    if (blad) return;

    const nowe = zapiszOdpowiedz(s.pytania, odp, q, odpowiedz);
    setOdp(nowe);
    setSzkice((stare) => Object.fromEntries(Object.entries(stare).filter(([id]) =>
      id !== q.id && !(odp[id] !== undefined && nowe[id] === undefined),
    )));
    const lista = aktywne(nowe, potwierdzone);
    const pozycja = s.pytania.indexOf(q);
    const nastepne = lista.find((x) => s.pytania.indexOf(x) > pozycja)
      ?? lista.find((x) => bladOdpowiedzi(x, nowe[x.id] ?? "", nowe));
    const odwiedzone = historia.length ? historia : [q.id];
    setHistoria(nastepne ? [...odwiedzone, nastepne.id] : odwiedzone);
    if (nastepne) window.scrollTo(0, 0);
    else void uruchom(nowe);
  }
  function rozpocznij(p: Odp) {
    setPotwierdzone(p);
    setBladPola("");
    const pierwsze = aktywne(odp, p)[0];
    setHistoria(pierwsze ? [pierwsze.id] : []);
    if (pierwsze) setFaza("pytania");
    else void uruchom(odp);
    window.scrollTo(0, 0);
  }
  function wstecz() {
    setBladPola("");
    if (faza === "wynik" && historia.length) setFaza("pytania");
    else if (historia.length > 1) setHistoria(historia.slice(0, -1));
    else if (wstepne.length) setFaza("dane");
    window.scrollTo(0, 0);
  }

  return (
    <div className="narrow">
      <p className="small no-print"><Link href="/sprawy">← Wróć do listy spraw</Link></p>
      <h1>{s.tytul}</h1>
      <div className="prog" role="progressbar" aria-valuenow={postep} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp wypełniania sprawy"><i style={{ width: `${postep}%` }} /></div>

      {faza === "dane" && (
        <div className="card">
          <span className="lab">Krok 1: sprawdź swoje dane</span>
          <p className="muted small mt">Dane pobrane z ZUS (profil testowy: {c.osoba}). Sprawdź, czy wszystko się zgadza. Jeśli zauważysz błąd, możesz go teraz poprawić.</p>
          <dl className="kv" style={kolumnyDanych}>{wstepne.map((x) => <div key={x.id} style={{ display: "contents" }}><dt>{x.etykietaDanych ?? tekstPytania(x, odp)}</dt><dd>{etykietaOdp(x, odp[x.id])}</dd></div>)}</dl>
          <div className="row mt"><button className="btn btn-primary" onClick={() => rozpocznij(Object.fromEntries(wstepne.map((x) => [x.id, odp[x.id]])))}>Potwierdzam dane</button><button className="btn btn-secondary" onClick={() => rozpocznij({})}>Chcę poprawić dane</button></div>
        </div>
      )}

      {faza === "pytania" && q && (
        <div className="card" key={q.id}>
          <span className="lab">Pytanie {i + 1}</span>
          <h2 className="mt" id="pyt">{tekstPytania(q, odp)}</h2>
          {q.typ === "wybor" && <div role="group" aria-labelledby="pyt">{q.opcje!.map((op) => <button key={op.v} className={"opt" + (odp[q.id] === op.v ? " sel" : "")} onClick={() => odpowiedz(op.v)}><b>{op.label}</b>{op.opis && <span className="muted small" style={{ display: "block" }}>{op.opis}</span>}</button>)}</div>}
          {q.typ === "tak_nie" && <div className="row" role="group" aria-labelledby="pyt"><button className={"opt" + (odp[q.id] === "tak" ? " sel" : "")} style={{ flex: 1 }} onClick={() => odpowiedz("tak")}><b>Tak</b></button><button className={"opt" + (odp[q.id] === "nie" ? " sel" : "")} style={{ flex: 1 }} onClick={() => odpowiedz("nie")}><b>Nie</b></button></div>}
          {(q.typ === "liczba" || q.typ === "data" || q.typ === "tekst") && (
            <form noValidate onSubmit={(e) => { e.preventDefault(); odpowiedz(wpis); }}>
              <div className="row">
                <input aria-labelledby="pyt" aria-invalid={!!bladPola} aria-describedby={bladPola ? "blad-pola" : undefined}
                  autoFocus type={q.typ === "data" ? "date" : "text"} inputMode={q.typ === "liczba" ? (q.calkowita ? "numeric" : "decimal") : undefined}
                  value={wpis} placeholder={q.przyklad} onChange={(e) => { setSzkice({ ...szkice, [q.id]: e.target.value }); setBladPola(""); }}
                  style={{ flex: 1, minWidth: 0, maxWidth: "100%" }} />
                {q.jednostka && <span className="muted">{q.jednostka}</span>}
              </div>
              {bladPola && <p id="blad-pola" role="alert" className="alert err">{bladPola}</p>}
              <div className="row mt">
                <button className="btn btn-primary">
                  {i === pytania.length - 1
                    ? "Policz i sprawdź wynik"
                    : q.typ === "data"
                    ? "Zatwierdź datę"
                    : q.typ === "liczba"
                    ? "Zapisz kwotę"
                    : "Zapisz i przejdź dalej"}
                </button>
              </div>
            </form>
          )}
          <details className="dl mt"><summary>Po co o to pytamy?</summary><p className="small">{q.poCo}</p></details>
          {q.skad && <details className="dl"><summary>Skąd to wziąć?</summary><p className="small">{q.skad}</p></details>}
          <div className="row mt no-print">{(historia.length > 1 || wstepne.length > 0) && <button className="btn btn-ghost btn-sm" onClick={wstecz}>← Poprzednie pytanie</button>}</div>
        </div>
      )}

      {faza === "wynik" && (
        <div aria-live="polite">
          {busy && <p><Spin /> Przeliczam Twoje dane…</p>}
          {blad && <><Alert t="err">{blad}</Alert><button className="btn btn-secondary" onClick={s.pytania.length ? wstecz : () => uruchom({})}>{s.pytania.length ? "Wróć i popraw odpowiedzi" : "Wczytaj sprawę ponownie"}</button></>}
          {wynik && <><WynikWidok w={wynik} bezPytan={!s.pytania.length} />{s.pytania.length > 0 && <div className="row mt no-print"><button className="btn btn-ghost" onClick={wstecz}>← Poprzednie pytanie</button><button className="btn btn-ghost" onClick={() => rozpocznij({})}>Zmień odpowiedzi</button><Link href="/" className="btn btn-ghost">Wróć na stronę główną</Link></div>}</>}
        </div>
      )}
    </div>
  );
}



function WynikWidok({ w, bezPytan }: { w: Wynik; bezPytan: boolean }) {
  const [skop, setSkop] = useState("");
  const [bladKopii, setBladKopii] = useState(false);
  async function kopiuj(typ: string, tresc: string) {
    setSkop("");
    setBladKopii(false);
    try {
      await navigator.clipboard.writeText(tresc);
      setSkop(typ);
    } catch {
      setBladKopii(true);
    }
  }
  const druki = (w.druki ?? []).filter((d, i, a) => a.indexOf(d) === i);
  const powiazane = (w.nastepne ?? []).map((id) => sprawa(id)).filter(Boolean);
  return (
    <>
      <div className={"card" + (w.lagodny ? " navy" : "")}>
        {w.status === "do_potwierdzenia" && (
          <Alert t="warn">
            <b>Warto potwierdzić w ZUS.</b>{" "}
            {w.uwagaStatus
              ? w.uwagaStatus.replace(/^Sprawdź w ZUS[\.\s–-]*/i, "")
              : "W tej sytuacji przepisy wymagają indywidualnej oceny przez pracownika ZUS."}
          </Alert>
        )}
        {w.status === "luka" && (
          <Alert t="warn">
            <b>Nietypowa sytuacja.</b>{" "}
            {w.uwagaStatus ?? "W oficjalnych wytycznych brakuje prostej reguły dla tego przypadku."}{" "}
            <Link href="/pue">Napisz do konsultanta ZUS przez PUE / eZUS</Link>
          </Alert>
        )}
        <h2 style={{ marginTop: 0 }}>{w.glowne}</h2>
        {w.duza && <div className="big">{w.duza}</div>}
        {w.podpis && <p className="muted">{w.podpis}</p>}
        {w.szczegoly && <dl className="kv mt" style={kolumnyDanych}>{w.szczegoly.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        {w.ostrzezenia?.map((x, i) => <Alert key={i} t="warn">{x}</Alert>)}
      </div>

      {w.zrob.length > 0 && (
        <div className="card mt"><h2>Co teraz zrobić krok po kroku</h2>
          <ol className="todo">{w.zrob.map((z, i) => <li key={i}>{z.kiedy && <b className="when">{z.kiedy}: </b>}{z.tekst}{z.uwaga && <div className="small muted">{z.uwaga}</div>}</li>)}</ol>
          {w.terminy && w.terminy.length > 0 && <><h3 className="mt">Ważne terminy</h3><ul className="clean warnlist">{w.terminy.map((t, i) => <li key={i}><b>{dataPL(t.do)}</b> ({zaIle(t.do)}): {t.co}</li>)}</ul></>}
        </div>
      )}

      {w.sciaga && (
        <div className="card mt"><h2>{w.sciaga.tytul}</h2><p className="small muted" style={{ marginTop: 0 }}>Pobierz formularz ZUS lub otwórz go w PUE / eZUS i przepisz poniższe dane do odpowiednich rubryk:</p>
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Pole na druku</th><th>Wpisz</th><th>Skąd to wziąć</th></tr></thead><tbody>{w.sciaga.wiersze.map(([a, b, c], i) => <tr key={i}><td>{a}</td><td><b>{b}</b></td><td className="muted">{c}</td></tr>)}</tbody></table></div>
          {w.sciaga.uwaga && <p className="small muted mt">{w.sciaga.uwaga}</p>}
          <div className="row mt no-print"><button className="btn btn-secondary btn-sm" onClick={() => kopiuj("sciaga", w.sciaga!.wiersze.map((r) => r.slice(0, 2).join(": ")).join("\n"))}>{skop === "sciaga" ? "Skopiowano do schowka ✓" : "Skopiuj dane do wniosku"}</button><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Wydrukuj ściągę</button></div></div>
      )}

      {w.tekstDoKopii && (
        <div className="card mt"><h2>{w.tekstDoKopii.tytul}</h2><pre className="wniosek" style={{ overflowWrap: "anywhere" }}>{w.tekstDoKopii.tresc}</pre>
          <div className="row no-print"><button className="btn btn-primary btn-sm" onClick={() => kopiuj("tekst", w.tekstDoKopii!.tresc)}>{skop === "tekst" ? "Skopiowano do schowka ✓" : "Skopiuj tekst wniosku"}</button><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Wydrukuj wniosek</button></div></div>
      )}

      {w.tabela && <div className="card mt"><div className="tbl-wrap"><table className="tbl"><thead><tr>{w.tabela.kolumny.map((k) => <th key={k}>{k}</th>)}</tr></thead><tbody>{w.tabela.wiersze.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>{w.tabela.uwaga && <p className="small muted mt">{w.tabela.uwaga}</p>}</div>}

      {w.info?.map((x) => <div key={x.tytul} className="card mt"><h3>{x.tytul}</h3><p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{x.tresc}</p></div>)}

      {bladKopii && <p role="alert" className="alert err">Kopiowanie do schowka się nie udało. Zaznacz tekst myszką i skopiuj go ręcznie.</p>}

      {(druki.length > 0 || (w.linki && w.linki.length > 0)) && (
        <div className="row mt no-print">{druki.map((d) => DRUKI.find((x) => x.id === d) && <Link key={d} className="btn btn-secondary" href={`/druki#${d}`}>Formularz {d}: instrukcja wypełnienia</Link>)}{w.linki?.map((l) => <Link key={l.href} className="btn btn-ghost" href={l.href}>{l.etykieta}</Link>)}</div>
      )}

      {w.jakLiczono && <Kroki kroki={w.jakLiczono} tytul="Jak to policzyliśmy?" />}

      {powiazane.length > 0 && <div className="mt no-print"><h2 className="section-h">Przydatne kolejne kroki</h2><div className="grid g2">{powiazane.map((s) => <Link key={s!.id} href={`/sprawa/${s!.id}`} className="tile"><span className={`ic ic-${s!.id}`} aria-hidden="true">{s!.ikona}</span><b>{s!.tytul}</b><span>{s!.krotko}</span></Link>)}</div></div>}

      {bezPytan && <div className="row mt no-print"><Link href="/sprawy" className="btn btn-ghost">← Wróć do listy spraw</Link></div>}
      <p className="small muted mt">Wyliczenia mają charakter pomocniczy i opierają się na aktualnych przepisach. W wersji testowej dane mają charakter przykładowy.</p>
    </>
  );
}
