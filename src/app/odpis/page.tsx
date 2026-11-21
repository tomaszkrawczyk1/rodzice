"use client";
import { useState } from "react";
import { api } from "@/lib/sesja";
import { Alert, Field, Sim } from "@/components/ui";
export default function Odpis() {
  const [f, setF] = useState<any>({ imieDziecka: "", dataUrodzenia: "", miejsceUrodzenia: "", rodzajOdpisu: "skrocony", odbior: "e-mail" }); const [w, setW] = useState<any>(null); const [err, setErr] = useState("");
  async function wyslij() { setErr(""); try { setW(await api("/api/usc/odpis", f)); } catch (e: any) { setErr(e.message); setW(null); } }
  return (
    <div style={{ maxWidth: 640 }}>
      <div className="row between"><h1>Odpis aktu urodzenia</h1><Sim /></div>
      <p className="lead">ZUS zwykle sam pozyskuje akt z rejestru stanu cywilnego. Jeśli potrzebujesz odpisu dla siebie, złóż wniosek tutaj.</p>
      <div className="card">
        <Field label="Imię (imiona) dziecka"><input type="text" value={f.imieDziecka} onChange={(e) => setF({ ...f, imieDziecka: e.target.value })} /></Field>
        <Field label="Data urodzenia"><input type="date" value={f.dataUrodzenia} onChange={(e) => setF({ ...f, dataUrodzenia: e.target.value })} /></Field>
        <Field label="Miejsce urodzenia"><input type="text" value={f.miejsceUrodzenia} onChange={(e) => setF({ ...f, miejsceUrodzenia: e.target.value })} /></Field>
        <Field label="Rodzaj odpisu"><select value={f.rodzajOdpisu} onChange={(e) => setF({ ...f, rodzajOdpisu: e.target.value })}><option value="skrocony">Skrócony</option><option value="zupelny">Zupełny</option></select></Field>
        <Field label="Odbiór"><select value={f.odbior} onChange={(e) => setF({ ...f, odbior: e.target.value })}><option>e-mail</option><option>skrzynka PUE / mObywatel</option><option>odbiór osobisty w urzędzie</option></select></Field>
        <button className="btn btn-primary" onClick={wyslij}>Złóż wniosek</button>
        {err && <Alert t="err">{err}</Alert>}
        {w && <Alert t="ok">{w.status}. Numer: <b>{w.numerWniosku}</b>. Opłata skarbowa: <b>{w.oplataSkarbowaZl} zł</b>. <Sim /></Alert>}
      </div>
    </div>
  );
}
