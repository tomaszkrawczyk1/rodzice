"use client";
import { useId, type ReactNode } from "react";
import type { Sytuacja } from "./stale";
import css from "./kalkulator.module.css";

const OPCJE: { id: Sytuacja; tytul: string; opis: string }[] = [
  { id: "matka", tytul: "Plan dla mamy", opis: "Urlop macierzyński i rodzicielski jednej osoby." },
  { id: "oboje", tytul: "Oboje rodzice", opis: "Podział urlopu rodzicielskiego, urlop ojcowski i porównanie kwot." },
  { id: "laczenie", tytul: "Praca + urlop rodzicielski", opis: "Łączenie urlopu rodzicielskiego z pracą do połowy etatu." },
  { id: "adopcja", tytul: "Adopcja / rodzina zastępcza", opis: "Dziecko przyjęte na wychowanie." },
  { id: "ojciec", tytul: "Tata lub drugi rodzic", opis: "Tylko urlop ojcowski i rodzicielski jednej osoby." },
  { id: "wlasne", tytul: "Moje dane / przykładowa sprawa", opis: "Gotowy scenariusz albo dane z wgranego wniosku." },
];

/** Krok 1 obu ścieżek kalkulatora: jedna grupa przycisków radiowych zamiast dwóch rzędów zakładek. */
export function WyborSytuacji({ wartosc, onZmiana, children }: { wartosc: Sytuacja; onZmiana: (s: Sytuacja) => void; children?: ReactNode }) {
  const nazwa = useId();
  return (
    <>
      <fieldset className={css.zestaw}>
        <legend>Wybierz, co chcesz policzyć</legend>
        <div className={css.opcje}>
          {OPCJE.map((o) => (
            <label key={o.id} className={css.opcja}>
              <input type="radio" name={nazwa} value={o.id} checked={wartosc === o.id} onChange={() => onZmiana(o.id)} />
              <span><b>{o.tytul}</b><span className={css.opis}>{o.opis}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      {children}
    </>
  );
}
