"use client";
import { useEffect, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dataPL, dzis, RODZAJE, dataKrotka } from "@/lib/format";
import { Alert, Field, Sim } from "@/components/ui";

const RODZ_URLOP: Record<string, string> = { macierzynski: "urlopu macierzyńskiego", uzupelniajacy: "uzupełniającego urlopu macierzyńskiego", rodzicielski: "urlopu rodzicielskiego", ojcowski: "urlopu ojcowskiego", na_warunkach_macierzynskiego: "urlopu na warunkach urlopu macierzyńskiego" };
type Tab = "urlop" | "laczenie" | "zam";

export default function Wnioski() {
  const { sesja } = useSesja(); const [tab, setTab] = useState<Tab>("urlop"); const [wyn, setWyn] = useState<any>(null); const [err, setErr] = useState(""); const [okresy, setOkresy] = useState<any[]>([]); const [par, setPar] = useState<any>(null);
  const [f, setF] = useState<any>({ imie: "", pesel: "", pracodawca: "", miasto: "", rodzaj: "rodzicielski", od: "", do: "", czesc: 1, dziecko: "", drugi: true, etat: "1/2", adresat: "pracodawca", w815: false, chorobowe: true, przedsiebiorca: false });
  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));
  useEffect(() => { if (sesja) set({ imie: sesja.osoba, pesel: sesja.pesel }); }, [sesja]);
  useEffect(() => { api("/api/parametry").then(setPar).catch(() => {});
    try { const w = JSON.parse(localStorage.getItem("rodzice.plan") || "null")?.wejscie; if (w) { set({ dziecko: w.dataZdarzenia }); api("/api/oblicz/plan", w).then((p) => setOkresy(p.okresy)).catch(() => {}); } } catch {} }, []);
  const terminy = par?.terminy_dni ?? {};
  async function wyslij(url: string, body: any) { setErr(""); setWyn(null); try { setWyn(await api(url, body)); } catch (e: any) { setErr(e.message); } }
  const data = dzis();

  return (
    <>
      <h1>Kreator wniosków</h1>
      <p className="lead">Wypełnij wniosek, obejrzyj gotowy dokument, wydrukuj go albo „wyślij” (symulacja). Wzory mają charakter poglądowy – wniosek o zasiłek wypełnia się na druku ZAM.</p>
      <div className="tabs">{([["urlop", "Wniosek o urlop"], ["laczenie", "Łączenie pracy z urlopem rodzicielskim"], ["zam", "Wniosek o zasiłek (ZAM)"]] as [Tab, string][]).map(([k, t]) => <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => { setTab(k); setWyn(null); }}>{t}</button>)}</div>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card no-print">
          <h3>Dane</h3>
          <div className="grid g2"><Field label="Imię i nazwisko"><input type="text" value={f.imie} onChange={(e) => set({ imie: e.target.value })} /></Field><Field label="PESEL"><input type="text" value={f.pesel} onChange={(e) => set({ pesel: e.target.value })} /></Field></div>
          {tab !== "zam" && <><Field label="Pracodawca (nazwa i adres)"><input type="text" value={f.pracodawca} onChange={(e) => set({ pracodawca: e.target.value })} /></Field></>}
          <Field label="Miejscowość"><input type="text" value={f.miasto} onChange={(e) => set({ miasto: e.target.value })} /></Field>
          {tab === "urlop" && <>
            <Field label="Rodzaj urlopu"><select value={f.rodzaj} onChange={(e) => set({ rodzaj: e.target.value })}>{Object.entries(RODZ_URLOP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <div className="grid g2"><Field label="Od"><input type="date" value={f.od} onChange={(e) => set({ od: e.target.value })} /></Field><Field label="Do"><input type="date" value={f.do} onChange={(e) => set({ do: e.target.value })} /></Field></div>
            {f.rodzaj === "rodzicielski" && <Field label="Która to część urlopu (maks. 5)"><select value={f.czesc} onChange={(e) => set({ czesc: +e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></Field>}
            <Field label="Data urodzenia (lub planowana data porodu) dziecka"><input type="date" value={f.dziecko} onChange={(e) => set({ dziecko: e.target.value })} /></Field>
            {f.rodzaj === "rodzicielski" && <label className="check"><input type="checkbox" checked={f.drugi} onChange={(e) => set({ drugi: e.target.checked })} />Oświadczam, że w tym okresie drugi rodzic nie korzysta z tego samego urlopu w sposób wykluczający</label>}
            <Alert>{f.rodzaj === "rodzicielski" ? <>Wniosek o urlop rodzicielski złóż co najmniej <b>{terminy.wniosek_urlop_rodzicielski_przed_startem ?? 21} dni</b> przed rozpoczęciem.</> : f.rodzaj === "ojcowski" ? "Urlop ojcowski – wniosek składa się najpóźniej na 7 dni przed jego rozpoczęciem." : "Do wniosku dołącz zaświadczenie lekarskie o przewidywanej dacie porodu (urlop macierzyński przed porodem) lub odpowiednie dokumenty."}</Alert></>}
          {tab === "laczenie" && <>
            <Field label="Wymiar czasu pracy w okresie urlopu" hint="Maksymalnie ½ etatu"><select value={f.etat} onChange={(e) => set({ etat: e.target.value })}><option>1/2</option><option>1/4</option><option>1/3</option><option>2/5</option></select></Field>
            <div className="grid g2"><Field label="Od"><input type="date" value={f.od} onChange={(e) => set({ od: e.target.value })} /></Field><Field label="Do"><input type="date" value={f.do} onChange={(e) => set({ do: e.target.value })} /></Field></div>
            <Alert t="warn">Wniosek składa się co najmniej <b>{terminy.wniosek_laczenie_z_praca_przed_startem ?? 21} dni</b> przed rozpoczęciem. Pracodawca może odmówić z przyczyn organizacyjnych – poinformuje o tym w ciągu 7 dni.</Alert></>}
          {tab === "zam" && <>
            <Field label="Adresat wniosku"><select value={f.adresat} onChange={(e) => set({ adresat: e.target.value })}><option value="pracodawca">Pracodawca (płatnik składek &gt; 20 osób)</option><option value="ZUS">Zakład Ubezpieczeń Społecznych</option></select></Field>
            <label className="check"><input type="checkbox" checked={f.w815} onChange={(e) => set({ w815: e.target.checked })} />Zamierzam skorzystać z pełnego wymiaru (wariant 81,5%) – wniosek najpóźniej {terminy.wniosek_pelny_wymiar_81_5_po_porodzie ?? 21} dni po porodzie</label>
            <label className="check"><input type="checkbox" checked={f.przedsiebiorca} onChange={(e) => set({ przedsiebiorca: e.target.checked })} />Prowadzę działalność gospodarczą</label>
            {f.przedsiebiorca && <label className="check"><input type="checkbox" checked={f.chorobowe} onChange={(e) => set({ chorobowe: e.target.checked })} />Jestem objęta dobrowolnym ubezpieczeniem chorobowym</label>}
            <Field label="Data urodzenia dziecka / przyjęcia na wychowanie"><input type="date" value={f.dziecko} onChange={(e) => set({ dziecko: e.target.value })} /></Field>
            {okresy.length > 0 ? <Alert t="ok">Okresy zasiłku wstawiono z Twojego planu w kalkulatorze ({okresy.length}).</Alert> : <Alert>Okresy zasiłku uzupełnimy z planu w <a href="/kalkulator">kalkulatorze</a>.</Alert>}</>}
        </div>

        <div>
          <div className="card" id="podglad">
            <div className="row between no-print"><h3>Podgląd</h3><Sim /></div>
            <div style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
              <p className="right">{f.miasto || "………"}, {dataPL(data)}</p>
              <p><b>{f.imie || "Imię i nazwisko"}</b><br />PESEL: {f.pesel || "…………"}</p>
              {tab !== "zam" ? <p className="right"><b>{f.pracodawca || "Pracodawca"}</b></p> : <p className="right"><b>{f.adresat === "ZUS" ? "Zakład Ubezpieczeń Społecznych" : f.pracodawca || "Pracodawca (płatnik składek)"}</b></p>}
              {tab === "urlop" && <><h3 style={{ textAlign: "center" }}>Wniosek o udzielenie {RODZ_URLOP[f.rodzaj]}</h3>
                <p>Na podstawie przepisów Kodeksu pracy wnoszę o udzielenie mi {RODZ_URLOP[f.rodzaj]} w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(f.do)}</b>{f.rodzaj === "rodzicielski" ? <> (część {f.czesc} z maksymalnie 5)</> : ""}.</p>
                <p>Dotyczy dziecka urodzonego (planowana data porodu) w dniu <b>{dataPL(f.dziecko)}</b>.</p>
                {f.rodzaj === "rodzicielski" && f.drugi && <p>Oświadczam, że wniosek składam zgodnie z uprawnieniami każdego z rodziców, w tym z wyłącznym prawem do 9 tygodni urlopu rodzicielskiego.</p>}
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "laczenie" && <><h3 style={{ textAlign: "center" }}>Wniosek o łączenie korzystania z urlopu rodzicielskiego z wykonywaniem pracy</h3>
                <p>Na podstawie art. 182<sup>1</sup>e Kodeksu pracy wnoszę o udzielenie urlopu rodzicielskiego w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(f.do)}</b> z jednoczesnym wykonywaniem pracy w wymiarze <b>{f.etat}</b> pełnego wymiaru czasu pracy.</p>
                <p>Rozumiem, że wymiar urlopu rodzicielskiego ulega proporcjonalnemu wydłużeniu, a zasiłek macierzyński – proporcjonalnemu zmniejszeniu.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "zam" && <><h3 style={{ textAlign: "center" }}>Wniosek o zasiłek macierzyński (ZAM)</h3>
                <p>Wnoszę o ustalenie prawa do zasiłku macierzyńskiego w związku z urodzeniem dziecka / przyjęciem dziecka na wychowanie w dniu <b>{dataPL(f.dziecko)}</b>.</p>
                {okresy.length > 0 && <table className="tbl"><thead><tr><th>Rodzaj</th><th>Od</th><th>Do</th></tr></thead><tbody>{okresy.filter((o) => o.kto === "matka" || true).map((o, i) => <tr key={i}><td>{RODZAJE[o.rodzaj] ?? o.rodzaj} ({o.kto})</td><td>{dataKrotka(o.od)}</td><td>{dataKrotka(o.do)}</td></tr>)}</tbody></table>}
                {f.w815 && <p>☑ Zamierzam skorzystać z pełnego wymiaru urlopu macierzyńskiego i rodzicielskiego (zasiłek w wysokości 81,5% podstawy) – co najmniej jeden dzień urlopu rodzicielskiego przypadnie w pierwszym roku życia dziecka.</p>}
                {f.przedsiebiorca && <p>Informacja o ubezpieczeniu: prowadzę pozarolniczą działalność gospodarczą, ubezpieczenie chorobowe: <b>{f.chorobowe ? "TAK" : "NIE"}</b>.</p>}
                <p className="right">…………………………<br />(podpis)</p></>}
            </div>
            <div className="row no-print mt"><button className="btn btn-secondary" onClick={() => window.print()}>Drukuj / zapisz PDF</button>
              <button className="btn btn-primary" onClick={() => tab === "zam" ? wyslij("/api/wniosek/zasilek", { adresat: f.adresat === "ZUS" ? "ZUS" : f.pracodawca || "pracodawca", w815: f.w815, okresy }) : wyslij("/api/wniosek/urlop", { rodzaj: f.rodzaj, od: f.od, do: f.do, pracodawca: f.pracodawca })}>Wyślij (symulacja)</button></div>
            {err && <Alert t="err">{err}</Alert>}
            {wyn && <Alert t="ok">{wyn.status}. Numer: <b>{wyn.numerWniosku}</b>. <Sim /></Alert>}
          </div>
        </div>
      </div>
    </>
  );
}
