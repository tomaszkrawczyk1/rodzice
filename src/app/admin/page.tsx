"use client";
import { useState } from "react";
import { Alert } from "@/components/ui";

function setPath(obj: any, path: (string | number)[], v: any): any {
  if (!path.length) return v;
  const [h, ...t] = path; const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  (copy as any)[h] = setPath((obj as any)[h], t, v); return copy;
}
function Node({ k, v, path, on }: { k: string; v: any; path: (string | number)[]; on: (p: (string | number)[], v: any) => void }) {
  if (k.startsWith("_")) return <p className="small muted">{k === "_opis" ? "" : <b>{k.replace("_", "")}: </b>}{typeof v === "string" ? v : JSON.stringify(v)}</p>;
  if (typeof v === "number") return <div className="field"><label>{k}</label><input type="number" step="any" value={v} onChange={(e) => on(path, e.target.value === "" ? 0 : Number(e.target.value))} /></div>;
  if (typeof v === "boolean") return <label className="check"><input type="checkbox" checked={v} onChange={(e) => on(path, e.target.checked)} />{k}</label>;
  if (typeof v === "string") return <div className="field"><label>{k}</label><input type="text" value={v} onChange={(e) => on(path, e.target.value)} /></div>;
  if (Array.isArray(v)) return <div className="field"><label>{k}</label><div className="row">{v.map((x, i) => typeof x === "number" ? <input key={i} type="number" style={{ width: 90 }} value={x} onChange={(e) => on([...path, i], Number(e.target.value))} /> : <code key={i}>{JSON.stringify(x)}</code>)}</div></div>;
  if (v && typeof v === "object") return <details className="dl" open={path.length < 2}><summary>{k}</summary><div className="grid g2 mt">{Object.entries(v).map(([kk, vv]) => <Node key={kk} k={kk} v={vv} path={[...path, kk]} on={on} />)}</div></details>;
  return null;
}

export default function Admin() {
  const [haslo, setHaslo] = useState(""); const [p, setP] = useState<any>(null); const [msg, setMsg] = useState<{ t: any; m: string } | null>(null); const [raw, setRaw] = useState(false); const [txt, setTxt] = useState("");
  async function wczytaj() {
    const r = await fetch("/api/admin/parametry", { headers: { "x-admin-password": haslo } }); const j = await r.json();
    if (!r.ok) return setMsg({ t: "err", m: j.error }); setP(j); setTxt(JSON.stringify(j, null, 2)); setMsg(null);
  }
  async function zapisz() {
    let body = p; if (raw) { try { body = JSON.parse(txt); } catch { return setMsg({ t: "err", m: "Niepoprawny JSON" }); } }
    const r = await fetch("/api/admin/parametry", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-password": haslo }, body: JSON.stringify(body) }); const j = await r.json();
    setMsg(r.ok ? { t: "ok", m: "Zapisano. Kalkulator używa nowych parametrów od następnego zapytania." } : { t: "err", m: j.error }); if (r.ok) { setP(body); setTxt(JSON.stringify(body, null, 2)); }
  }
  const on = (path: (string | number)[], v: any) => { const n = setPath(p, path, v); setP(n); setTxt(JSON.stringify(n, null, 2)); };
  return (
    <>
      <h1>Panel administratora</h1>
      <p className="lead">Zmieniaj stawki, wymiary urlopów, limity i terminy bez dotykania kodu – np. po zmianie przepisów. Kalkulator czyta te parametry przy każdym obliczeniu.</p>
      {!p ? <div className="card" style={{ maxWidth: 420 }}><div className="field"><label>Hasło administratora</label><input type="password" value={haslo} onChange={(e) => setHaslo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && wczytaj()} /></div><button className="btn btn-primary" onClick={wczytaj}>Zaloguj</button>{msg && <Alert t={msg.t}>{msg.m}</Alert>}</div> : (
        <>
          <div className="row mb"><button className="btn btn-primary" onClick={zapisz}>Zapisz zmiany</button><button className="btn btn-ghost" onClick={() => { if (raw) { try { setP(JSON.parse(txt)); } catch {} } setRaw(!raw); }}>{raw ? "Widok formularza" : "Edytuj jako JSON"}</button><span className="muted small">Wersja: {p.wersja_parametrow}</span></div>
          {msg && <Alert t={msg.t}>{msg.m}</Alert>}
          {raw ? <textarea rows={28} style={{ fontFamily: "monospace", fontSize: ".85rem" }} value={txt} onChange={(e) => setTxt(e.target.value)} /> : Object.entries(p).filter(([k]) => !k.startsWith("_") && typeof p[k] === "object").map(([k, v]) => <Node key={k} k={k} v={v} path={[k]} on={on} />)}
        </>
      )}
    </>
  );
}
