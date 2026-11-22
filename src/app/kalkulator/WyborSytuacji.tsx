"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useT } from "@/lib/jezyk";
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

// Przejście między „planem rodziny" a „tatą" podmienia cały kreator (inny komponent), więc zaznaczone radio znika z DOM.
// Zanim to zrobimy, zapamiętujemy, że fokus ma wrócić na wybraną opcję w nowym widoku. Dotyczy tylko takiego przejścia:
// przy zwykłym wejściu na stronę fokusu nie ruszamy.
let fokusNaWyborze = false;
export function przekazFokusWyboru() { fokusNaWyborze = true; }

/** Krok 1 obu ścieżek kalkulatora: jedna grupa przycisków radiowych (ten sam wzorzec ARIA co wariant w kroku 5). */
export function WyborSytuacji({ wartosc, onZmiana, children }: { wartosc: Sytuacja; onZmiana: (s: Sytuacja) => void; children?: ReactNode }) {
  const t = useT();
  const nazwa = useId();
  const zestaw = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (!fokusNaWyborze) return;
    fokusNaWyborze = false;
    zestaw.current?.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
  }, []);
  return (
    <>
      <fieldset className={css.zestaw} ref={zestaw}>
        <legend>{t("Wybierz, co chcesz policzyć")}</legend>
        <div className={css.opcje}>
          {OPCJE.map((o) => (
            <label key={o.id} className={css.opcja}>
              <input type="radio" name={nazwa} value={o.id} checked={wartosc === o.id} onChange={() => onZmiana(o.id)} />
              <span><b>{t(o.tytul)}</b><span className={css.opis}>{t(o.opis)}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      {children}
    </>
  );
}
