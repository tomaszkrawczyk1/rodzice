"use client";
import { useState } from "react";
import Link from "next/link";
import { TRUDNE, WSPARCIE, WSPARCIE_UWAGA } from "@/content/tresci";
import { Pole } from "@/components/Pole";

export default function Trudne() {
  const [id, setId] = useState(TRUDNE[0].id);
  const sytuacja = TRUDNE.find((x) => x.id === id) ?? TRUDNE[0];
  const organizacje = WSPARCIE.filter((w) => w.dla.includes(id));

  return (
    <>
      <h1>Pomoc w trudnej sytuacji</h1>
      <p className="lead">Sprawdź, jakie wsparcie możesz otrzymać i co zrobić, gdy będziesz mieć na to siłę.</p>
      <div className="card">
        <Pole label="Wybierz sytuację">
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {TRUDNE.map((t) => <option key={t.id} value={t.id}>{t.t}</option>)}
          </select>
        </Pole>
      </div>
      <div className="mt" aria-live="polite">
        <section className="card navy">
          <h2>{sytuacja.t}</h2>
          <ul className="clean">{sytuacja.d.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt"><Link href="/sprawa/trudna-sytuacja">Sprawdź, co załatwić krok po kroku</Link></p>
        </section>
        {organizacje.length > 0 && <section className="card accent mt">
          <h2>Gdzie szukać wsparcia</h2>
          <ul className="clean">{organizacje.map((o) => <li key={o.nazwa}><b>{o.nazwa}</b><br />{o.opis}</li>)}</ul>
          <p className="muted mt">{WSPARCIE_UWAGA}</p>
        </section>}
      </div>
    </>
  );
}
