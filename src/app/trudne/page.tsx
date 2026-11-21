"use client";
import { useState } from "react";
import { TRUDNE, WSPARCIE, WSPARCIE_UWAGA } from "@/content/tresci";
import { Alert } from "@/components/ui";

export default function Trudne() {
  const [id, setId] = useState(TRUDNE[0].id); const s = TRUDNE.find((x) => x.id === id)!;
  const org = WSPARCIE.filter((w) => w.dla.includes(id));
  return (
    <>
      <h1>Trudne sytuacje</h1>
      <p className="lead">Przykro nam, że jesteś w takiej sytuacji. Poniżej znajdziesz, co przysługuje i gdzie szukać pomocy. Nie musisz niczego załatwiać od razu.</p>
      <div className="tabs">{TRUDNE.map((t) => <button key={t.id} className={"tab" + (id === t.id ? " on" : "")} onClick={() => setId(t.id)}>{t.t}</button>)}</div>
      <div className="card navy"><h2>{s.t}</h2><ul className="clean">{s.d.map((x) => <li key={x}>{x}</li>)}</ul></div>
      <div className="card accent mt"><h3>Organizacje, które mogą pomóc</h3>
        {org.length ? org.map((o) => <div key={o.nazwa} style={{ marginBottom: 10 }}><b>{o.nazwa}</b><br /><span className="muted">{o.opis}</span></div>) : <p className="muted">Brak pozycji dla tej sytuacji.</p>}
        <Alert>{WSPARCIE_UWAGA}</Alert></div>
    </>
  );
}
