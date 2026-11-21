"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TRUDNE, WSPARCIE, WSPARCIE_UWAGA } from "@/content/tresci";
import { Pole } from "@/components/Pole";
import { przejdzKrok } from "@/lib/adres-kroku";

// Wybrana sytuacja jest w adresie (`?sytuacja=zgon`); pierwsza sytuacja to stan domyślny (bez parametru).
// Każda zmiana wyboru to nowy wpis historii, więc „Wstecz" przywraca poprzednią sytuację.
export default function Trudne() {
  const zAdresu = useSearchParams().get("sytuacja");
  const idZAdresu = TRUDNE.some((x) => x.id === zAdresu) ? zAdresu! : TRUDNE[0].id;
  // Lokalna kopia, żeby pole wyboru zmieniało się od razu (adres odświeża się chwilę później); „Wstecz" ją synchronizuje.
  const [id, setId] = useState(idZAdresu);
  useEffect(() => { setId(idZAdresu); }, [idZAdresu]);
  const sytuacja = TRUDNE.find((x) => x.id === id) ?? TRUDNE[0];
  const organizacje = WSPARCIE.filter((w) => w.dla.includes(id));

  function wybierz(nowe: string) {
    setId(nowe);
    przejdzKrok({ sytuacja: nowe === TRUDNE[0].id ? null : nowe });
  }

  return (
    <>
      <h1>Pomoc w trudnej sytuacji</h1>
      <p className="lead">Sprawdź, jakie wsparcie możesz otrzymać i co zrobić, gdy będziesz mieć na to siłę.</p>
      <div className="card">
        <Pole label="Wybierz sytuację">
          <select value={id} onChange={(e) => wybierz(e.target.value)}>
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
