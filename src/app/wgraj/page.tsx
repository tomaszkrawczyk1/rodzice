"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/sesja";
import { pln, dataKrotka, RODZAJE } from "@/lib/format";
import { Alert, Kroki, Spin } from "@/components/ui";

const DEMO = [["Z-3_przyklad_Anna_Kowalska.pdf", "Z-3 – Anna Kowalska (12 mies. × 6 500 zł)"], ["Z-3_przyklad_Dominika_Kaminska.pdf", "Z-3 – Dominika Kamińska (12 mies. × 5 800 zł)"], ["ZAM_przyklad_Anna_Kowalska.pdf", "ZAM – wniosek Anny Kowalskiej"]];
const KROKI = ["Rasteryzuję strony i pomijam puste…", "Rozpoznaję rodzaje stron (ZAM, Z-3, decyzja)…", "Odczytuję pola z dokumentu (model AI)…", "Waliduję dane i liczę podstawę (kod)…"];

export default function Wgraj() {
  const router = useRouter(); const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [krok, setKrok] = useState(0); const [wyn, setWyn] = useState<any>(null); const [err, setErr] = useState(""); const [nazwa, setNazwa] = useState("");
  const [ub, setUb] = useState<any>(null); const [drag, setDrag] = useState(false);

  async function wyslij(plik: File) {
    setBusy(true); setErr(""); setWyn(null); setUb(null); setNazwa(plik.name); setKrok(0);
    const t = setInterval(() => setKrok((k) => Math.min(k + 1, KROKI.length - 1)), 2600);
    try {
      const fd = new FormData(); fd.append("plik", plik);
      const r = await fetch("/api/parser", { method: "POST", body: fd }); const j = await r.json();
      if (!r.ok) throw new Error(j.error || `Błąd ${r.status}`);
      setWyn(j);
      const pesel = j.dane?.ubezpieczony?.pesel;
      if (pesel) api(`/api/zus/ubezpieczenie?pesel=${pesel}&naDzien=${j.dane?.data_zdarzenia ?? new Date().toISOString().slice(0, 10)}`).then(setUb).catch(() => setUb(null));
    } catch (e: any) { setErr(e.message); } finally { clearInterval(t); setBusy(false); }
  }
  async function demo(n: string) { const b = await (await fetch(`/demo/${n}`)).blob(); wyslij(new File([b], n, { type: "application/pdf" })); }
  function policz() {
    const p = wyn.podstawa?.wynik?.podstawaMiesieczna; if (!p) return;
    localStorage.setItem("rodzice.prefill", JSON.stringify({ podstawaM: p, data: wyn.dane?.data_zdarzenia, dzieci: wyn.dane?.dzieci?.length || 1 })); router.push("/kalkulator");
  }
  const d = wyn?.dane; const pod = wyn?.podstawa?.wynik;
  return (
    <>
      <h1>Wgraj wniosek lub zaświadczenie</h1>
      <p className="lead">Wgraj skan druku <b>ZAM</b>, <b>Z-3</b> lub <b>Z-3a</b> (PDF, PNG, JPG). Model AI odczyta pola, a <b>kwoty policzy zwykły kod</b>, nigdy AI. Możesz też sprawdzić działanie na przykładowych dokumentach.</p>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          <div className="card" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) wyslij(f); }}
            style={{ borderStyle: "dashed", borderWidth: 2, borderColor: drag ? "var(--zus-green)" : "var(--line)", textAlign: "center", padding: 34 }}>
            <p className="drop-ic" style={{ margin: 0 }} aria-hidden>📄</p>
            <p><b>Przeciągnij plik tutaj</b> lub</p>
            <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*" hidden onChange={(e) => e.target.files?.[0] && wyslij(e.target.files[0])} />
            <button className="btn btn-primary" onClick={() => ref.current?.click()} disabled={busy}>Wybierz plik</button>
            <p className="small muted mt">Pliki są przetwarzane tymczasowo i nie są zapisywane. Maks. 60 MB.</p>
          </div>
          <div className="card mt"><h3>Przykładowe dokumenty demo</h3><p className="small muted">Dane fikcyjne – wygenerowane na potrzeby pokazu (to nie są druki ZUS).</p>
            {DEMO.map(([n, t]) => <div key={n} className="row between" style={{ margin: "8px 0" }}><span>{t}</span><span className="row"><a className="btn btn-ghost btn-sm" href={`/demo/${n}`} download>Pobierz</a><button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => demo(n)}>Użyj</button></span></div>)}</div>
          <Alert t="info"><b>Jak to działa:</b> (1) puste strony są pomijane lokalnie, (2) AI rozpoznaje, które strony to ZAM / Z-3 / decyzja, (3) AI odczytuje pola do ustalonego schematu, (4) kod waliduje (PESEL, daty) i liczy podstawę wymiaru, (5) Ty potwierdzasz wynik.</Alert>
        </div>

        <div>
          {busy && <div className="card"><p><Spin /> <b>{nazwa}</b></p><ol className="steps">{KROKI.map((k, i) => <li key={k} style={{ opacity: i <= krok ? 1 : 0.35, fontWeight: i === krok ? 700 : 400 }}>{k}</li>)}</ol></div>}
          {err && <Alert t="err">{err}</Alert>}
          {wyn && d && <>
            <div className="card accent"><div className="row between"><h2>Odczytane dane</h2><span className="badge ok">odczyt AI</span></div>
              <div className="row small muted"><span>Stron: {wyn.strony}</span><span>niepustych: {wyn.niepuste}</span><span>odczytanych: {wyn.uzyte.length}</span><span>zapytań AI: {wyn.uzycie.zapytania}</span><span>tokenów: {wyn.uzycie.tokeny}</span><span>pewność: {Math.round((d.pewnosc ?? 0) * 100)}%</span></div>
              {wyn.ostrzezenia.map((o: string, i: number) => <Alert key={i} t="warn">{o}</Alert>)}
              {d.uwagi?.length > 0 && <details className="dl"><summary>Uwagi modelu ({d.uwagi.length})</summary><ul>{d.uwagi.map((u: string, i: number) => <li key={i}>{u}</li>)}</ul></details>}
              <dl className="kv mt">
                <dt>Rodzaj dokumentu</dt><dd>{d.typ_dokumentu ?? "—"}</dd>
                <dt>Ubezpieczony</dt><dd>{[d.ubezpieczony?.imie, d.ubezpieczony?.nazwisko].filter(Boolean).join(" ") || "—"} {d.ubezpieczony?.pesel && <span className="small muted">PESEL {d.ubezpieczony.pesel}</span>}</dd>
                <dt>Płatnik</dt><dd>{d.platnik?.nazwa ?? "—"}{d.platnik?.liczba_ubezpieczonych && <span className="small muted"> ({d.platnik.liczba_ubezpieczonych === "powyzej_20" ? "powyżej 20 ubezpieczonych" : "do 20 ubezpieczonych"})</span>}</dd>
                {(d.podstawa_wniosku || d.data_zdarzenia) && <><dt>Zdarzenie</dt><dd>{[d.podstawa_wniosku, d.data_zdarzenia && dataKrotka(d.data_zdarzenia), d.dzieci?.length ? `dzieci: ${d.dzieci.length}` : null].filter(Boolean).join(", ")}</dd></>}
                <dt>Wnioskowane okresy</dt><dd>{d.wnioskowane_okresy?.length ? d.wnioskowane_okresy.map((o: any, i: number) => <div key={i}>{RODZAJE[o.rodzaj] ?? o.rodzaj}: {dataKrotka(o.od)} – {dataKrotka(o.do)}</div>) : "—"}</dd>
                <dt>Wariant 81,5%</dt><dd>{d.wariant_81_5 == null ? "—" : d.wariant_81_5 ? "tak" : "nie"}</dd>
              </dl></div>

            {ub && <div className="card navy"><h3>Czy ma ubezpieczenie? <span className="badge sim">symulacja ZUS</span></h3>
              <p>W bazie ZUS (dane testowe) znaleziono: <b>{ub.osoba}</b>. Nieprzerwane ubezpieczenie chorobowe: <b>{ub.dniNieprzerwanegoUbezpieczeniaChorobowego} dni</b>. W dniu zdarzenia ubezpieczona: <b>{ub.ubezpieczonaWDniu ? "TAK" : "NIE"}</b>.</p></div>}

            {d.skladniki_miesieczne?.length > 0 && <div className="card"><h3>Wynagrodzenia z zaświadczenia</h3><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Miesiąc</th><th className="num">Dni</th><th className="num">Stałe</th><th className="num">Zmienne</th><th className="num">Premie</th></tr></thead>
              <tbody>{d.skladniki_miesieczne.map((m: any, i: number) => <tr key={i}><td>{m.rok}-{String(m.miesiac).padStart(2, "0")}</td><td className="num">{m.dniPrzepracowal ?? "—"}/{m.dniObowiazany ?? "—"}</td><td className="num">{pln(m.stale)}</td><td className="num">{pln(m.zmiennePomniejszone)}</td><td className="num">{pln(m.premieFaktyczne)}</td></tr>)}</tbody></table></div></div>}

            {pod && <div className="card accent"><h3>Podstawa wymiaru zasiłku <span className="badge ok">policzył kod</span></h3>
              <div className="stat"><div className="v">{pln(pod.podstawaMiesieczna)}</div><div className="l">miesięcznie (dziennie {pln(pod.podstawaDzienna)})</div></div>
              <Kroki kroki={pod.kroki} />{pod.ostrzezenia?.map((o: string, i: number) => <Alert key={i} t="warn">{o}</Alert>)}
              {d.decyzja?.podstawa_wymiaru != null && <Alert t={Math.abs(d.decyzja.podstawa_wymiaru - pod.podstawaMiesieczna) < 1 ? "ok" : "warn"}>Podstawa z decyzji ZUS: <b>{pln(d.decyzja.podstawa_wymiaru)}</b>{Math.abs(d.decyzja.podstawa_wymiaru - pod.podstawaMiesieczna) < 1 ? " – zgodna z naszym wyliczeniem." : " – różni się od naszego wyliczenia, sprawdź dane."}</Alert>}
              <button className="btn btn-primary mt" onClick={policz}>Policz zasiłek z tą podstawą →</button></div>}
            {!pod && <Alert t="info">Z tego dokumentu nie odczytano tabeli wynagrodzeń, więc podstawy nie wyliczono. Wprowadź zarobki ręcznie w <a href="/kalkulator">kalkulatorze</a>.</Alert>}
          </>}
        </div>
      </div>
    </>
  );
}
