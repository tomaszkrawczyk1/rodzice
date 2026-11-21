"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSesja } from "@/lib/sesja";
import { dataKrotka, pln } from "@/lib/format";
import { Alert, Field, Sim } from "@/components/ui";

export default function Pue() {
  const { sesja } = useSesja(); const [k, setK] = useState<any>(null); const [q, setQ] = useState({ temat: "Zasiłek macierzyński", tresc: "" }); const [wyn, setWyn] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { if (sesja) api(`/api/pue/konto?pesel=${sesja.pesel}`).then(setK).catch((e) => setErr(e.message)); }, [sesja]);
  if (!sesja) return <><h1>Konto PUE / eZUS</h1><Alert>Zaloguj się, aby zobaczyć dane. <Link href="/logowanie">Zaloguj przez mObywatela</Link></Alert></>;
  async function wyslij() { setErr(""); try { setWyn(await api("/api/pue/pytanie", q)); } catch (e: any) { setErr(e.message); setWyn(null); } }
  return (
    <>
      <div className="row between"><h1>Konto PUE / eZUS</h1><Sim /></div>
      <p className="lead">Podgląd danych zgromadzonych na koncie ubezpieczonego oraz możliwość zadania pytania ZUS.</p>
      {err && <Alert t="err">{err}</Alert>}
      {k && <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card"><h3>{k.osoba}</h3><dl className="kv"><dt>PESEL</dt><dd>{k.pesel}</dd><dt>Nieprzerwane ubezpieczenie</dt><dd>{k.dniNieprzerwanegoUbezpieczenia} dni</dd><dt>Zadłużenie składkowe</dt><dd>{pln(k.zadluzenie.kwota)}</dd></dl>
          <h4 className="mt">Ubezpieczenia</h4>{k.ubezpieczenie.map((u: any, i: number) => <p key={i} className="small">{u.tytul.replaceAll("_", " ")} · {dataKrotka(u.od)} – {u.do ? dataKrotka(u.do) : "trwa"} · chorobowe: {u.chorobowe}<br /><span className="muted">{u.platnik.nazwa}, NIP {u.platnik.nip}</span></p>)}
          <h4>Zwolnienia e-ZLA</h4>{k.ezla.length ? <div className="tbl-wrap"><table className="tbl"><thead><tr>{Object.keys(k.ezla[0]).map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{k.ezla.map((z: any, i: number) => <tr key={i}>{Object.values(z).map((v: any, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody></table></div> : <p className="muted small">Brak zwolnień.</p>}</div>
        <div className="card"><h3>Zadaj pytanie ZUS</h3>
          <Field label="Temat"><select value={q.temat} onChange={(e) => setQ({ ...q, temat: e.target.value })}><option>Zasiłek macierzyński</option><option>Zasiłek chorobowy</option><option>Ubezpieczenie chorobowe</option><option>Inne</option></select></Field>
          <Field label="Treść pytania"><textarea rows={5} value={q.tresc} onChange={(e) => setQ({ ...q, tresc: e.target.value })} /></Field>
          <button className="btn btn-primary" onClick={wyslij}>Wyślij pytanie</button>
          {wyn && <Alert t="ok">Pytanie przyjęte. Numer sprawy: <b>{wyn.numerSprawy}</b>. Odpowiedź: {wyn.przewidywanaOdpowiedz}. <Sim /></Alert>}</div>
      </div>}
    </>
  );
}
