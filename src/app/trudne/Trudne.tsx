"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TRUDNE } from "@/content/tresci";
import { WSPARCIE_UWAGA, podmiotyDla, telHref } from "@/lib/wsparcie";
import { dataPL } from "@/lib/format";
import { Pole } from "@/components/Pole";
import { przejdzKrok } from "@/lib/adres-kroku";

// Wybrana sytuacja jest w adresie (`?sytuacja=zgon`); pierwsza sytuacja to stan domyślny (bez parametru).
// Każda zmiana wyboru to nowy wpis historii, więc „Wstecz" przywraca poprzednią sytuację.
const SYTUACJE = [...TRUDNE, { id: "chore", t: "Dziecko jest ciężko chore", d: [] as string[] }];

export default function Trudne() {
  const zAdresu = useSearchParams().get("sytuacja");
  const idZAdresu = SYTUACJE.some((x) => x.id === zAdresu) ? zAdresu! : SYTUACJE[0].id;
  // Lokalna kopia, żeby pole wyboru zmieniało się od razu (adres odświeża się chwilę później); „Wstecz" ją synchronizuje.
  const [id, setId] = useState(idZAdresu);
  useEffect(() => { setId(idZAdresu); }, [idZAdresu]);
  const sytuacja = SYTUACJE.find((x) => x.id === id) ?? SYTUACJE[0];
  const organizacje = podmiotyDla(id);

  function wybierz(nowe: string) {
    setId(nowe);
    przejdzKrok({ sytuacja: nowe === SYTUACJE[0].id ? null : nowe });
  }

  return (
    <>
      <h1>Pomoc w trudnej sytuacji</h1>
      <p className="lead">Sprawdź, jakie wsparcie możesz otrzymać i co zrobić, gdy będziesz mieć na to siłę.</p>
      <div className="card">
        <Pole label="Wybierz sytuację">
          <select value={id} onChange={(e) => wybierz(e.target.value)}>
            {SYTUACJE.map((t) => <option key={t.id} value={t.id}>{t.t}</option>)}
          </select>
        </Pole>
      </div>
      <div className="mt" aria-live="polite">
        <section className="card navy">
          <h2>{sytuacja.t}</h2>
          {sytuacja.d.length > 0 && <ul className="clean">{sytuacja.d.map((x) => <li key={x}>{x}</li>)}</ul>}
          <p className="mt"><Link href="/sprawa/trudna-sytuacja">Sprawdź, co załatwić krok po kroku</Link></p>
        </section>
        {organizacje.length > 0 && <section className="card accent mt">
          <h2>Gdzie szukać wsparcia</h2>
          <ul className="clean">{organizacje.map((o) => (
            <li key={o.id}>
              <b>{o.nazwa}</b><br />{o.opis}
              <br />{o.telefon && <>Telefon: <a href={telHref(o.telefon)}>{o.telefon}</a>{o.godziny ? ` (${o.godziny})` : ""}. </>}
              {o.email && <>E-mail: {o.email}. </>}<a href={o.www}>{o.www.replace(/^https?:\/\/(www\.)?/, "")}</a>
              <br /><span className="muted">{o.zakres}{o.uwaga ? ` ${o.uwaga}` : ""} Sprawdzone {dataPL(o.dataSprawdzenia)}, <a href={o.zrodlo}>źródło</a>.{o.pewnosc === "do_potwierdzenia" ? " Do potwierdzenia: zadzwoń lub napisz, zanim na tym polegasz." : ""}</span>
            </li>
          ))}</ul>
          <p className="muted mt">{WSPARCIE_UWAGA}</p>
        </section>}
      </div>
    </>
  );
}
