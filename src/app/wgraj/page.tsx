"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/sesja";
import { pln, dataPL, miesiacPL, opisObliczenia } from "@/lib/format";
import { Alert, Field, Kroki, Spin } from "@/components/ui";

const DEMO = [
  ["Z-3_przyklad_Anna_Kowalska.pdf", "Zaświadczenie płatnika składek Z-3, przykład 1"],
  ["Z-3_przyklad_Dominika_Kaminska.pdf", "Zaświadczenie płatnika składek Z-3, przykład 2"],
  ["ZAM_przyklad_Anna_Kowalska.pdf", "Wniosek o zasiłek macierzyński ZAM"],
] as const;
const MAKS_MB = 25;
const NISKA = 0.8;

type Wiersz = { rok: number; miesiac: number; dP: string; dO: string; stale: string; zm: string; pr: string; proc: string; pewnosc: number };
const tx = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const num = (s: string) => { const t = s.trim().replace(/\s/g, "").replace(",", "."); return t === "" || !/^-?\d+(\.\d+)?$/.test(t) ? null : +t; };

export default function Wgraj() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [nazwa, setNazwa] = useState("");
  const [wyn, setWyn] = useState<any>(null);
  const [pesel, setPesel] = useState("");
  const [data, setData] = useState("");
  const [wiersze, setWiersze] = useState<Wiersz[]>([]);
  const [pod, setPod] = useState<any>(null);
  const [ub, setUb] = useState<any>(null);
  const [ubInfo, setUbInfo] = useState("");
  const [dzieci, setDzieci] = useState("1");

  async function odczytaj(blob: Blob, plik: string, etykieta: string) {
    setBusy(true); setErr(""); setWyn(null); setPod(null); setUb(null); setUbInfo(""); setNazwa(etykieta);
    try {
      const fd = new FormData();
      fd.append("plik", blob, plik);
      const r = await fetch("/api/parser", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Nie udało się odczytać dokumentu.");
      setWyn(j);
      setPesel(j.dane?.ubezpieczony?.pesel ?? "");
      setData(j.dane?.data_zdarzenia ?? "");
      setWiersze((j.dane?.skladniki_miesieczne ?? []).map((w: any): Wiersz => ({ rok: w.rok, miesiac: w.miesiac, dP: tx(w.dniPrzepracowal), dO: tx(w.dniObowiazany), stale: tx(w.stale), zm: tx(w.zmiennePomniejszone), pr: tx(w.premieFaktyczne), proc: tx(w.procentSkladki), pewnosc: w.pewnosc ?? 1 })));
      setPod(j.podstawa ?? null);
      setDzieci(String(Math.min(Math.max(j.dane?.dzieci?.length || 1, 1), 5)));
    } catch (e: any) {
      setErr(e?.message || "Nie udało się odczytać dokumentu. Spróbuj ponownie albo wpisz dane w kalkulatorze.");
    } finally { setBusy(false); }
  }

  async function przyklad(plik: string, etykieta: string) {
    const p = await fetch(`/demo/${plik}`).catch(() => null);
    if (!p?.ok) { setErr("Nie udało się pobrać przykładu."); return; }
    await odczytaj(await p.blob(), plik, etykieta);
  }

  function wybranoPlik(f: File | undefined) {
    if (!f) return;
    if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) { setErr("Obsługiwane formaty: PDF, JPG i PNG."); return; }
    if (f.size > MAKS_MB * 1024 * 1024) { setErr(`Plik jest za duży (maksymalnie ${MAKS_MB} MB).`); return; }
    odczytaj(f, f.name, f.name);
  }

  function zmien(i: number, pole: keyof Wiersz, v: string) {
    setWiersze((w) => w.map((x, k) => (k === i ? { ...x, [pole]: v, pewnosc: 1 } : x)));
  }

  /** Gdy odczyt nie znalazł wierszy (np. ręczne pismo), dodaje 12 pustych miesięcy przed datą zdarzenia do ręcznego wpisania. */
  function dodajMiesiace() {
    const b = data ? new Date(data) : new Date();
    setWiersze(Array.from({ length: 12 }, (_, i) => { const d = new Date(b.getFullYear(), b.getMonth() - 12 + i, 1); return { rok: d.getFullYear(), miesiac: d.getMonth() + 1, dP: "", dO: "", stale: "", zm: "", pr: "", proc: "", pewnosc: 1 }; }));
  }

  async function przelicz() {
    setBusy(true); setErr("");
    try {
      if (wiersze.some((w) => [w.dP, w.dO, w.stale, w.zm, w.pr, w.proc].some((x) => (num(x) ?? 0) < 0))) { setErr("Kwoty i liczby dni nie mogą być ujemne. Popraw wpisane wartości."); setBusy(false); return; }
      const sk = wiersze.map((w) => ({ rok: w.rok, miesiac: w.miesiac, dniPrzepracowal: num(w.dP), dniObowiazany: num(w.dO), stale: num(w.stale), zmiennePomniejszone: num(w.zm), premieFaktyczne: num(w.pr), procentSkladki: num(w.proc) }));
      const j = await api<any>("/api/parser/podstawa", { typ_dokumentu: wyn.dane.typ_dokumentu, zatrudnienie: wyn.dane.zatrudnienie, skladniki_miesieczne: sk });
      setPod(j.podstawa);
    } catch (e: any) { setErr(e?.message || "Nie udało się przeliczyć podstawy. Sprawdź wpisane liczby."); }
    finally { setBusy(false); }
  }

  async function sprawdzUb() {
    setUb(null); setUbInfo("");
    if (!/^\d{11}$/.test(pesel.trim())) { setUbInfo("Wpisz 11-cyfrowy numer PESEL."); return; }
    const naDzien = data || new Date().toISOString().slice(0, 10);
    try { setUb(await api(`/api/zus/ubezpieczenie?${new URLSearchParams({ pesel: pesel.trim(), naDzien })}`)); }
    catch { setUbInfo("W danych testowych nie ma takiej osoby. W prawdziwym systemie ZUS sprawdzenie dotyczyłoby jej konta ubezpieczonego."); }
  }

  function policz() {
    const p = pod?.wynik?.podstawaMiesieczna; if (!p) return;
    localStorage.setItem("rodzice.prefill", JSON.stringify({ podstawaM: p, data: data || undefined, dzieci: Math.min(Math.max(parseInt(dzieci) || 1, 1), 5) }));
    router.push("/kalkulator");
  }

  const d = wyn?.dane;
  const p = wyn?.pewnosc ?? {};
  const slabo = (x: number | null | undefined) => x != null && x < NISKA;
  const Sprawdz = ({ x }: { x: number | null | undefined }) => (slabo(x) ? <span className="badge warn" style={{ marginLeft: 8 }}>sprawdź</span> : null);

  return (
    <>
      <h1>Odczytaj dane z dokumentu</h1>
      <p className="lead">Wybierz przykładowy formularz albo wgraj własny skan lub PDF. Odczyt odbywa się na naszym serwerze, bez zewnętrznych usług. Dokument nie jest zapisywany.</p>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>Wybierz dokument</h2>
          <ul className="clean">{DEMO.map(([plik, etykieta]) => <li key={plik}>
            <b>{etykieta}</b>
            <div className="row">
              <button className="btn btn-secondary" disabled={busy} onClick={() => przyklad(plik, etykieta)}>Odczytaj przykład</button>
              <a className="btn btn-ghost" href={`/demo/${plik}`} download>Pobierz przykład</a>
            </div>
          </li>)}</ul>
          <h3 className="mt">Własny plik</h3>
          <Field label="Skan lub PDF (Z-3, Z-3a, ZAM)" hint={`PDF, JPG lub PNG, do ${MAKS_MB} MB. Odczyt skanu może potrwać kilkanaście sekund.`}>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy} onChange={(e) => { wybranoPlik(e.target.files?.[0]); e.target.value = ""; }} />
          </Field>
        </section>

        <div>
          {busy && <p role="status"><Spin /> Odczytujemy dokument „{nazwa}”…</p>}
          {err && <Alert t="err">{err}</Alert>}
          {wyn && d && <>
            <div className="card accent"><h2>Dane odczytane z dokumentu</h2>
              <p className="small muted">Źródło odczytu: {wyn.zrodla?.join(", ")}. Sprawdź pola oznaczone „sprawdź” i popraw, jeśli odczyt jest błędny.</p>
              {wyn.ostrzezenia?.length > 0 && <Alert t="warn"><ul className="clean">{wyn.ostrzezenia.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul></Alert>}
              <dl className="kv mt">
                <dt>Rodzaj dokumentu</dt><dd>{d.typ_dokumentu === "mieszany" ? "Kilka rodzajów dokumentów" : d.typ_dokumentu ?? "nie rozpoznano"}</dd>
                <dt>Ubezpieczony</dt><dd>{[d.ubezpieczony?.imie, d.ubezpieczony?.nazwisko].filter(Boolean).join(" ") || "—"}<Sprawdz x={p.osoba} /></dd>
                <dt>Płatnik</dt><dd>{d.platnik?.nazwa ?? "—"}{d.platnik?.liczba_ubezpieczonych && <span className="small muted"> ({d.platnik.liczba_ubezpieczonych === "powyzej_20" ? "powyżej 20 ubezpieczonych" : "do 20 ubezpieczonych"})</span>}</dd>
                {d.wnioskowane_okresy?.length > 0 && <><dt>Wnioskowane okresy</dt><dd>{d.wnioskowane_okresy.map((o: any, i: number) => <div key={i}>{o.od ? dataPL(o.od) : "?"} – {o.do ? dataPL(o.do) : "?"}<Sprawdz x={o.pewnosc} /></div>)}</dd></>}
              </dl>
              <div className="grid g2 mt">
                <Field label="PESEL"><input inputMode="numeric" autoComplete="off" value={pesel} onChange={(e) => setPesel(e.target.value)} /></Field>
                <Field label="Liczba dzieci"><input inputMode="numeric" autoComplete="off" value={dzieci} onChange={(e) => setDzieci(e.target.value.replace(/\D/g, "").slice(0, 1))} /></Field>
                <Field label="Data porodu lub przyjęcia dziecka"><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
              </div>
              {(slabo(p.pesel) || (slabo(p.data_zdarzenia) && !wyn.ostrzezenia?.some((o: string) => /daty porodu/.test(o)))) && <p className="small muted">Pola PESEL i data zostały odczytane z niską pewnością. Porównaj je z dokumentem.</p>}
              <div className="row mt"><button className="btn btn-secondary" onClick={sprawdzUb}>Sprawdź ubezpieczenie (symulacja ZUS)</button></div>
            </div>

            {(ub || ubInfo) && <div className="card navy"><h3>Czy ma ubezpieczenie? <span className="badge sim">symulacja ZUS</span></h3>
              {ub && <p>Dane fikcyjnego profilu: <b>{ub.osoba}</b>. Nieprzerwane ubezpieczenie chorobowe: <b>{ub.dniNieprzerwanegoUbezpieczeniaChorobowego} dni</b>. Ubezpieczenie w dniu zdarzenia: <b>{ub.ubezpieczonaWDniu ? "aktywne" : "brak"}</b>.</p>}
              {ubInfo && <p>{ubInfo}</p>}</div>}

            {wiersze.length === 0 && <div className="card"><h3>Wynagrodzenia z zaświadczenia</h3>
              <p className="small muted">Nie udało się odczytać tabeli wynagrodzeń (np. przy piśmie odręcznym). Możesz wpisać je ręcznie z dokumentu.</p>
              <div className="row mt"><button className="btn btn-secondary" onClick={dodajMiesiace}>Wpisz wynagrodzenia ręcznie</button></div></div>}
            {wiersze.length > 0 && <div className="card"><h3>Wynagrodzenia z zaświadczenia</h3>
              <p className="small muted">Popraw liczby, jeśli odczyt się pomylił, i kliknij „Przelicz podstawę”.</p>
              <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>Miesiąc</th><th>Dni przepracowane</th><th>Dni obowiązujące</th><th>Składniki stałe (zł)</th><th>Zmienne (zł)</th><th>Premie (zł)</th></tr></thead>
                <tbody>{wiersze.map((w, i) => <tr key={`${w.rok}-${w.miesiac}`}>
                  <td data-label="Miesiąc">{miesiacPL(w.rok, w.miesiac)}{w.pewnosc < NISKA && <span className="badge warn" style={{ marginLeft: 8 }}>sprawdź</span>}</td>
                  {([["dP", "Dni przepracowane"], ["dO", "Dni obowiązujące"], ["stale", "Składniki stałe (zł)"], ["zm", "Zmienne (zł)"], ["pr", "Premie (zł)"]] as const).map(([k, et]) =>
                    <td key={k} data-label={et}><input inputMode="decimal" aria-label={`${miesiacPL(w.rok, w.miesiac)}: ${et}`} autoComplete="off" value={w[k]} onChange={(e) => zmien(i, k, e.target.value)} /></td>)}
                </tr>)}</tbody></table></div>
              <div className="row mt"><button className="btn btn-secondary" disabled={busy} onClick={przelicz}>Przelicz podstawę</button></div></div>}

            {pod?.wynik && <div className="card accent"><h3>Podstawa wymiaru zasiłku</h3>
              <div className="stat"><div className="v">{pln(pod.wynik.podstawaMiesieczna)}</div><div className="l">miesięcznie (dziennie {pln(pod.wynik.podstawaDzienna)})</div></div>
              <Kroki kroki={pod.wynik.kroki?.map(opisObliczenia)} />
              {pod.wynik.ostrzezenia?.length > 0 && <Alert t="warn">Sprawdź dane odczytane z zaświadczenia i skonsultuj wynik z ZUS.</Alert>}
              <button className="btn btn-primary mt" onClick={policz}>Policz zasiłek z tą podstawą →</button></div>}
            {!pod?.wynik && <Alert t="info">Z tego dokumentu nie wyliczono podstawy. {wiersze.length > 0 ? "Uzupełnij wynagrodzenia w tabeli powyżej albo wprowadź je ręcznie w" : "Wpisz wynagrodzenia przyciskiem powyżej albo wprowadź je w"} <a href="/kalkulator">kalkulatorze</a>.</Alert>}
          </>}
        </div>
      </div>
    </>
  );
}
