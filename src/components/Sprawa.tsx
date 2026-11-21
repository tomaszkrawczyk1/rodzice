"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, useSesja, type Sesja } from "@/lib/sesja";
import { sprawa, zbudujCtx, etykietaOdp, zaIle, aktywneOdpowiedzi, bladOdpowiedzi, domyslneOdpowiedzi, zapiszOdpowiedz, type Ctx, type Odp, type Pyt, type Sprawa, type Wynik } from "@/lib/sprawy";
import { DRUKI } from "@/content/poradnik";
import { dataPL } from "@/lib/format";
import { ekranDotykowy, przejdzDoKroku } from "@/lib/ekran";
import { odczytajWpis, polaczPrzyPowrocie, stanHistorii, type Migawka } from "@/lib/stan-sprawy";
import { Alert, Kroki } from "./ui";
import Szkielet from "./Szkielet";

const tekstPytania = (q: Pyt, o: Odp) => (typeof q.tekst === "function" ? q.tekst(o) : q.tekst);
const kolumnyDanych = { gridTemplateColumns: "fit-content(42%) minmax(0, 1fr)", overflowWrap: "anywhere" } as const;

export default function SprawaWidok({ id }: { id: string }) {
  const { sesja, gotowa } = useSesja();
  const s = sprawa(id)!;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <p className="small no-print"><Link href="/sprawy" className="powrot">← Wróć do listy spraw</Link></p>
      <h1>{s.tytul}</h1>
      {gotowa ? <WczytajSprawe key={JSON.stringify([id, sesja?.token])} s={s} sesja={sesja} /> : <Szkielet etykieta="Wczytuję sprawę…" />}
    </div>
  );
}

function WczytajSprawe({ s, sesja }: { s: Sprawa; sesja: Sesja | null }) {
  const [ctx, setCtx] = useState<Ctx | null>(sesja && s.pytania.length ? null : {});
  const [blad, setBlad] = useState(false);
  const [proba, setProba] = useState(0);
  useEffect(() => {
    if (!sesja || !s.pytania.length) return;
    let aktywne = true;
    setBlad(false);
    zbudujCtx(api, sesja).then(
      (dane) => { if (aktywne) setCtx(dane); },
      () => { if (aktywne) setBlad(true); },
    );
    return () => { aktywne = false; };
  }, [s, sesja, proba]);
  if (blad) return (
    <>
      <div className="prog" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp wypełniania sprawy"><i style={{ width: "0%" }} /></div>
      <Alert t="err">Nie udało się pobrać Twoich danych z profilu. Sprawdź połączenie z internetem i spróbuj jeszcze raz. Możesz też przejść sprawę bez danych z profilu i wpisać je samodzielnie.</Alert>
      <div className="row mt"><button className="btn btn-primary" onClick={() => setProba(proba + 1)}>Spróbuj ponownie</button><button className="btn btn-secondary" onClick={() => setCtx({})}>Przejdź bez danych z profilu</button></div>
    </>
  );
  if (!ctx) return <Szkielet etykieta="Pobieram dane z Twojego profilu…" />;
  return <KrokiSprawy s={s} c={ctx} token={sesja?.token ?? ""} />;
}

function KrokiSprawy({ s, c, token }: { s: Sprawa; c: Ctx; token: string }) {
  const idPytan = s.pytania.map((x) => x.id);
  const [domyslne] = useState(() => domyslneOdpowiedzi(s.pytania, c));
  // Wpis historii z tej samej sprawy i profilu: po odświeżeniu albo powrocie wracamy dokładnie do tego kroku.
  const [zapis] = useState(() => odczytajWpis(history.state, s.id, token, idPytan));
  const [m, setM] = useState<Migawka>(() => zapis?.m ?? {
    faza: !s.pytania.length ? "wynik" : Object.keys(domyslne).length ? "dane" : "pytania",
    historia: [], odp: domyslne, potwierdzone: {},
  });
  const { faza, historia, odp, potwierdzone } = m;
  const [n, setN] = useState(zapis?.n ?? 0);
  const numer = useRef(zapis?.n ?? 0);
  const ruch = useRef(false);
  const blok = useRef<HTMLDivElement>(null);
  const [szkice, setSzkice] = useState<Record<string, string>>({});
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [blad, setBlad] = useState("");
  const [bladPola, setBladPola] = useState("");
  const [proba, setProba] = useState(0);
  const busy = faza === "wynik" && !wynik && !blad;
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

  // Każdy krok to osobny wpis historii: „Wstecz" przeglądarki cofa pytanie, a nie wychodzi ze sprawy.
  function idz(nastepna: Migawka) {
    ruch.current = true;
    numer.current += 1;
    setN(numer.current);
    history.pushState(stanHistorii(history.state, { s: s.id, t: token, n: numer.current, m: nastepna }), "");
    setM(nastepna);
  }
  useEffect(() => {
    const poprzednie = history.scrollRestoration;
    history.scrollRestoration = "manual";
    if (zapis) ruch.current = zapis.n > 0;
    else history.replaceState(stanHistorii(history.state, { s: s.id, t: token, n: 0, m }), "");
    const poCofnieciu = (e: PopStateEvent) => {
      const w = odczytajWpis(e.state, s.id, token, idPytan);
      if (!w) return;
      const wstecz = w.n < numer.current;
      numer.current = w.n;
      ruch.current = true;
      setN(w.n);
      setBladPola("");
      setM((biezaca) => polaczPrzyPowrocie(w.m, biezaca, wstecz));
    };
    window.addEventListener("popstate", poCofnieciu);
    return () => {
      window.removeEventListener("popstate", poCofnieciu);
      history.scrollRestoration = poprzednie;
    };
  }, []);

  // Wynik liczymy z odpowiedzi, więc działa tak samo po kliknięciu, cofnięciu i odświeżeniu.
  useEffect(() => {
    setWynik(null);
    setBlad("");
    if (faza !== "wynik") return;
    let aktywneZadanie = true;
    s.licz(aktywneOdpowiedzi(s.pytania, odp, c), c, api).then(
      (w) => { if (aktywneZadanie) setWynik(w); },
      (e) => { if (aktywneZadanie) setBlad(!s.pytania.length ? "Nie udało się wczytać sprawy." : e instanceof Error ? e.message : "Nie udało się policzyć."); },
    );
    return () => { aktywneZadanie = false; };
  }, [faza, odp, proba]);

  // Po zmianie kroku: tytuł pytania na górę widoku (pod nagłówkiem, jeśli jest przyklejony) i fokus na nim.
  // Na telefonie pole nie dostaje fokusu, bo klawiatura zasłoniłaby pytanie.
  useEffect(() => {
    if (!ruch.current || busy) return;
    ruch.current = false;
    const el = blok.current;
    if (!el) return;
    const pole = el.querySelector<HTMLElement>("form input");
    przejdzDoKroku(el, pole && !ekranDotykowy() ? pole : el.querySelector<HTMLElement>("[data-fokus]"));
  }, [m, busy]);

  function odpowiedz(v: string) {
    if (!q) return;
    const odpowiedz = v.trim();
    const blad = bladOdpowiedzi(q, odpowiedz, odp);
    setBladPola(blad ?? "");
    if (blad) return;

    const nowe = zapiszOdpowiedz(s.pytania, odp, q, odpowiedz);
    setSzkice((stare) => Object.fromEntries(Object.entries(stare).filter(([id]) =>
      id !== q.id && !(odp[id] !== undefined && nowe[id] === undefined),
    )));
    const lista = aktywne(nowe, potwierdzone);
    const pozycja = s.pytania.indexOf(q);
    const nastepne = lista.find((x) => s.pytania.indexOf(x) > pozycja)
      ?? lista.find((x) => bladOdpowiedzi(x, nowe[x.id] ?? "", nowe));
    const odwiedzone = historia.length ? historia : [q.id];
    idz({ faza: nastepne ? "pytania" : "wynik", historia: nastepne ? [...odwiedzone, nastepne.id] : odwiedzone, odp: nowe, potwierdzone });
  }
  function rozpocznij(p: Odp) {
    setBladPola("");
    const pierwsze = aktywne(odp, p)[0];
    idz({ faza: pierwsze ? "pytania" : "wynik", historia: pierwsze ? [pierwsze.id] : [], odp, potwierdzone: p });
  }
  const wstecz = () => history.back();
  const przyciskWstecz = n > 0 && <p className="no-print" style={{ margin: "0 0 12px" }}><button type="button" className="btn btn-ghost btn-sm" onClick={wstecz}>← Poprzednie pytanie</button></p>;

  return (
    <>
      <div className="prog" role="progressbar" aria-valuenow={postep} aria-valuemin={0} aria-valuemax={100} aria-label="Postęp wypełniania sprawy"><i style={{ width: `${postep}%` }} /></div>

      {faza === "dane" && (
        <div className="card" ref={blok}>
          {przyciskWstecz}
          <span className="lab" data-fokus tabIndex={-1}>Krok 1 · Sprawdź swoje dane</span>
          <p className="muted small mt">Dane pobrane z ZUS (profil testowy: {c.osoba}). Sprawdź, czy wszystko się zgadza. Jeśli zauważysz błąd, możesz go teraz poprawić.</p>
          <dl className="kv" style={kolumnyDanych}>{wstepne.map((x) => <div key={x.id} style={{ display: "contents" }}><dt>{x.etykietaDanych ?? tekstPytania(x, odp)}</dt><dd>{etykietaOdp(x, odp[x.id])}</dd></div>)}</dl>
          <div className="row mt"><button className="btn btn-primary" onClick={() => rozpocznij(Object.fromEntries(wstepne.map((x) => [x.id, odp[x.id]])))}>Potwierdzam dane</button><button className="btn btn-secondary" onClick={() => rozpocznij({})}>Chcę poprawić dane</button></div>
        </div>
      )}

      {faza === "pytania" && q && (
        <div className="card" key={q.id} ref={blok}>
          {przyciskWstecz}
          <span className="lab">Pytanie {i + 1}</span>
          <h2 className="mt" id="pyt" data-fokus tabIndex={-1}>{tekstPytania(q, odp)}</h2>
          {q.typ === "wybor" && <div role="group" aria-labelledby="pyt">{q.opcje!.map((op) => <button key={op.v} className={"opt" + (odp[q.id] === op.v ? " sel" : "")} aria-pressed={odp[q.id] === op.v} onClick={() => odpowiedz(op.v)}><b>{op.label}</b>{op.opis && <span className="muted small" style={{ display: "block" }}>{op.opis}</span>}</button>)}</div>}
          {q.typ === "tak_nie" && <div className="row" role="group" aria-labelledby="pyt"><button className={"opt" + (odp[q.id] === "tak" ? " sel" : "")} aria-pressed={odp[q.id] === "tak"} style={{ flex: 1 }} onClick={() => odpowiedz("tak")}><b>Tak</b></button><button className={"opt" + (odp[q.id] === "nie" ? " sel" : "")} aria-pressed={odp[q.id] === "nie"} style={{ flex: 1 }} onClick={() => odpowiedz("nie")}><b>Nie</b></button></div>}
          {(q.typ === "liczba" || q.typ === "data" || q.typ === "tekst") && (
            <form noValidate onSubmit={(e) => { e.preventDefault(); odpowiedz(wpis); }}>
              <div className="row">
                <input aria-labelledby="pyt" aria-invalid={!!bladPola} aria-describedby={bladPola ? "blad-pola" : undefined}
                  type={q.typ === "data" ? "date" : "text"} inputMode={q.typ === "liczba" ? (q.calkowita ? "numeric" : "decimal") : undefined}
                  autoComplete="off" autoCapitalize="off" enterKeyHint={i === pytania.length - 1 ? "done" : "next"}
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
        </div>
      )}

      {faza === "wynik" && (
        <div aria-live="polite" ref={blok}>
          {busy && <Szkielet etykieta="Przeliczam Twoje dane…" />}
          {blad && <><Alert t="err">{blad}</Alert><div className="row mt"><button className="btn btn-primary" onClick={() => setProba(proba + 1)}>Spróbuj ponownie</button>{s.pytania.length > 0 && <button className="btn btn-secondary" onClick={wstecz}>Wróć i popraw odpowiedzi</button>}</div></>}
          {wynik && <><WynikWidok w={wynik} bezPytan={!s.pytania.length} />{s.pytania.length > 0 && <div className="row mt no-print">{n > 0 && <button className="btn btn-ghost" onClick={wstecz}>← Poprzednie pytanie</button>}<button className="btn btn-ghost" onClick={() => rozpocznij({})}>Zmień odpowiedzi</button><Link href="/" className="btn btn-ghost">Wróć na stronę główną</Link></div>}</>}
        </div>
      )}
    </>
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
  // Spis „Na tej stronie" tylko przy długim wyniku, żeby nie dokładać elementu tam, gdzie wszystko widać od razu.
  const spis: [string, string][] = [
    ...(w.zrob.length ? [["w-zrob", "Co teraz zrobić"] as [string, string]] : []),
    ...(w.tabela ? [["w-tabela", "Tabela z wyliczeniem"] as [string, string]] : []),
    ...(w.info ?? []).map((x, i): [string, string] => [`w-info-${i}`, x.tytul]),
    ...(w.sciaga ? [["w-sciaga", w.sciaga.tytul] as [string, string]] : []),
    ...(w.tekstDoKopii ? [["w-tekst", w.tekstDoKopii.tytul] as [string, string]] : []),
    ...(w.jakLiczono?.length ? [["w-jak", "Jak to policzyliśmy"] as [string, string]] : []),
  ];
  function skocz(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const cel = document.getElementById(id);
    const naglowek = cel?.querySelector<HTMLElement>("h2, h3, summary") ?? null;
    if (naglowek && !naglowek.hasAttribute("tabindex") && naglowek.tagName !== "SUMMARY") naglowek.tabIndex = -1;
    przejdzDoKroku(cel, naglowek);
  }
  return (
    <>
      <div className={"card " + (w.lagodny ? "navy" : "accent")}>
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
        <h2 style={{ marginTop: 0 }} data-fokus tabIndex={-1}>{w.glowne}</h2>
        {w.duza && <div className="big">{w.duza}</div>}
        {w.podpis && <p className="muted">{w.podpis}</p>}
        {w.szczegoly && <dl className="kv mt" style={kolumnyDanych}>{w.szczegoly.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        {w.ostrzezenia?.map((x, i) => <Alert key={i} t="warn">{x}</Alert>)}
      </div>

      {spis.length >= 3 && (
        <nav className="na-stronie no-print" aria-label="Na tej stronie">
          <b>Na tej stronie</b>
          <ul>{spis.map(([id, t]) => <li key={id}><a href={`#${id}`} onClick={(e) => skocz(e, id)}>{t}</a></li>)}</ul>
        </nav>
      )}

      {w.tabela && <div className="card mt" id="w-tabela"><div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr>{w.tabela.kolumny.map((k) => <th key={k}>{k}</th>)}</tr></thead><tbody>{w.tabela.wiersze.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} data-label={w.tabela!.kolumny[j]}>{c}</td>)}</tr>)}</tbody></table></div>{w.tabela.uwaga && <p className="small muted mt">{w.tabela.uwaga}</p>}</div>}

      {w.info?.map((x, i) => <div key={x.tytul} id={`w-info-${i}`} className="card mt"><h3>{x.tytul}</h3><p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{x.tresc}</p></div>)}

      {w.zrob.length > 0 && (
        <div className="card mt" id="w-zrob"><h2>Co teraz zrobić krok po kroku</h2>
          <ol className="todo">{w.zrob.map((z, i) => <li key={i}>{z.kiedy && <b className="when">{z.kiedy}: </b>}{z.tekst}{z.uwaga && <div className="small muted">{z.uwaga}</div>}</li>)}</ol>
          {w.terminy && w.terminy.length > 0 && <><h3 className="mt">Ważne terminy</h3><ul className="clean warnlist">{w.terminy.map((t, i) => <li key={i}><b>{dataPL(t.do)}</b> ({zaIle(t.do)}): {t.co}</li>)}</ul></>}
        </div>
      )}

      {w.sciaga && (
        <div className="card mt" id="w-sciaga"><h2>{w.sciaga.tytul}</h2><p className="small muted" style={{ marginTop: 0 }}>Pobierz formularz ZUS lub otwórz go w PUE / eZUS i przepisz poniższe dane do odpowiednich rubryk:</p>
          <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>Pole na druku</th><th>Wpisz</th><th>Skąd to wziąć</th></tr></thead><tbody>{w.sciaga.wiersze.map(([a, b, c], i) => <tr key={i}><td data-label="Pole na druku">{a}</td><td data-label="Wpisz"><b>{b}</b></td><td data-label="Skąd to wziąć" className="muted">{c}</td></tr>)}</tbody></table></div>
          {w.sciaga.uwaga && <p className="small muted mt">{w.sciaga.uwaga}</p>}
          <div className="row mt no-print"><button className="btn btn-secondary btn-sm" onClick={() => kopiuj("sciaga", w.sciaga!.wiersze.map((r) => r.slice(0, 2).join(": ")).join("\n"))}>{skop === "sciaga" ? "Skopiowano do schowka ✓" : "Skopiuj dane do wniosku"}</button><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Wydrukuj ściągę</button></div></div>
      )}

      {w.tekstDoKopii && (
        <div className="card mt" id="w-tekst"><h2>{w.tekstDoKopii.tytul}</h2><pre className="wniosek" style={{ overflowWrap: "anywhere" }}>{w.tekstDoKopii.tresc}</pre>
          <div className="row no-print"><button className="btn btn-primary btn-sm" onClick={() => kopiuj("tekst", w.tekstDoKopii!.tresc)}>{skop === "tekst" ? "Skopiowano do schowka ✓" : "Skopiuj tekst wniosku"}</button><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Wydrukuj wniosek</button></div></div>
      )}

      {bladKopii && <p role="alert" className="alert err">Kopiowanie do schowka się nie udało. Zaznacz tekst myszką i skopiuj go ręcznie.</p>}

      {(druki.length > 0 || (w.linki && w.linki.length > 0)) && (
        <div className="row mt no-print">{druki.map((d) => DRUKI.find((x) => x.id === d) && <Link key={d} className="btn btn-secondary" href={`/druki#${d}`}>Formularz {d}: instrukcja wypełnienia</Link>)}{w.linki?.map((l) => <Link key={l.href} className="btn btn-ghost" href={l.href}>{l.etykieta}</Link>)}</div>
      )}

      {w.jakLiczono && <div id="w-jak"><Kroki kroki={w.jakLiczono} tytul="Jak to policzyliśmy?" /></div>}

      {powiazane.length > 0 && <div className="card mt no-print"><h3>Przydatne kolejne kroki</h3><div className="grid g2">{powiazane.map((s) => <Link key={s!.id} href={`/sprawa/${s!.id}`} className="tile"><span className={`ic ic-${s!.id}`} aria-hidden="true">{s!.ikona}</span><b>{s!.tytul}</b><span>{s!.krotko}</span></Link>)}</div></div>}

      {bezPytan && <div className="row mt no-print"><Link href="/sprawy" className="btn btn-ghost">← Wróć do listy spraw</Link></div>}
      <p className="small muted mt">Wyliczenia mają charakter pomocniczy i opierają się na aktualnych przepisach. W wersji testowej dane mają charakter przykładowy.</p>
    </>
  );
}
