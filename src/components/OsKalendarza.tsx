"use client";

import { Fragment, useId, useState } from "react";
import Link from "next/link";
import { dniMiedzy, dodajMiesiace, type Parametry, type PlanWejscie } from "@/engine/kalkulator";
import { dataPL } from "@/lib/format";
import type { KalendarzWynik } from "@/lib/kalendarz";
import {
  ETYKIETY_RODZAJU, kamienieMilowe, pasujeDoFiltra, stanKamienia,
  type FiltrOsi, type Kamien,
} from "@/lib/os-kalendarza";
import style from "./os-kalendarza.module.css";

const FILTRY: { id: FiltrOsi; nazwa: string }[] = [
  { id: "wszystko", nazwa: "Wszystko" },
  { id: "badania", nazwa: "Badania i wizyty" },
  { id: "urlop", nazwa: "Urlop i wnioski" },
];

function Data({ value }: { value: string }) {
  return <time dateTime={value}>{dataPL(value)}</time>;
}

function Terminy({ k }: { k: Kamien }) {
  if (k.od === k.do) return <>{k.termin && "Do "}<Data value={k.do} /></>;
  return <><Data value={k.od} /> – <Data value={k.do} /></>;
}

/** Pasek poglądowy: ciąża i pierwszy rok dziecka z zaznaczonym dniem dzisiejszym. Cała treść jest też w liście poniżej. */
function Pasek({ wynik, dzis }: { wynik: KalendarzWynik; dzis: string }) {
  const start = wynik.poczatekCiazy;
  const porod = wynik.dataPorodu ?? wynik.terminPorodu;
  const koniec = dodajMiesiace(porod, 12);
  const calosc = dniMiedzy(start, koniec);
  if (calosc <= 0) return null;
  const proc = (data: string) => Math.min(100, Math.max(0, (dniMiedzy(start, data) / calosc) * 100));
  const pPorod = proc(porod);
  const pDzis = proc(dzis);
  const widocznaDzis = dzis >= start && dzis <= koniec;
  const dzisPrzyPorodzie = widocznaDzis && Math.abs(pDzis - pPorod) < 14;
  const wyrownanie = (p: number) => p < 9 ? style.etykietaLewa : p > 91 ? style.etykietaPrawa : "";
  return (
    <div className={style.pasek} aria-hidden="true">
      <div className={style.tor}>
        <div className={style.ciaza} style={{ width: `${pPorod}%` }}>Ciąża</div>
        <div className={style.rok} style={{ width: `${100 - pPorod}%` }}>Pierwszy rok dziecka</div>
        {widocznaDzis && <span className={style.znacznikDzis} style={{ left: `${pDzis}%` }} />}
      </div>
      {widocznaDzis && (
        <span className={`${style.etykieta} ${style.etykietaGora} ${wyrownanie(pDzis)}`} style={{ left: `${pDzis}%` }}>Dziś</span>
      )}
      {!dzisPrzyPorodzie && (
        <span className={`${style.etykieta} ${style.etykietaDol} ${wyrownanie(pPorod)}`} style={{ left: `${pPorod}%` }}>
          {wynik.dataPorodu ? "Poród" : "Termin porodu"}
        </span>
      )}
    </div>
  );
}

function Pozycja({ k, dzis }: { k: Kamien; dzis: string }) {
  const stan = stanKamienia(k, dzis);
  const tytul = k.href ? <a href={k.href}>{k.tytul}</a> : k.tytul;
  return (
    <li className={`${style.pozycja} ${style[`r_${k.rodzaj}`]} ${stan === "minelo" ? style.minelo : ""}`}>
      <span className={style.kropka} aria-hidden="true" />
      <div className={`${style.tresc} ${stan === "trwa" ? style.trwa : ""}`}>
        <p className={style.data}><Terminy k={k} /></p>
        <p className={style.tytul}>{tytul}</p>
        <p className={style.znaczki}>
          <span className={style.rodzaj}>{ETYKIETY_RODZAJU[k.rodzaj]}</span>
          {stan === "trwa" && <span className={style.stan}>{k.od === k.do ? "Dziś" : "Trwa teraz"}</span>}
          {stan === "minelo" && <span className={style.stan}>{k.termin ? "Termin minął" : "Minęło"}</span>}
          {k.szacunkowe && <span className={style.stan}>Orientacyjnie</span>}
        </p>
      </div>
    </li>
  );
}

export default function OsKalendarza({ wynik, dzis, plan, parametry }: {
  wynik: KalendarzWynik; dzis: string; plan?: PlanWejscie; parametry: Parametry;
}) {
  const [filtr, setFiltr] = useState<FiltrOsi>("wszystko");
  const [pokazMinione, setPokazMinione] = useState(false);
  const idListy = useId();
  const { kamienie, pominieteCykliczne, brakPlanuUrlopu } = kamienieMilowe(wynik, parametry, dataPL, plan);

  const wFiltrze = kamienie.filter(k => pasujeDoFiltra(k, filtr));
  const minione = wFiltrze.filter(k => stanKamienia(k, dzis) === "minelo");
  const widoczne = pokazMinione ? wFiltrze : wFiltrze.filter(k => stanKamienia(k, dzis) !== "minelo");
  const indeksDzis = widoczne.findIndex(k => k.od > dzis);
  const miejsceDzis = indeksDzis === -1 ? widoczne.length : indeksDzis;

  const znacznikDzis = (
    <li className={style.dzis} aria-current="date">
      <span className={style.kropka} aria-hidden="true" />
      <p><strong>Dziś</strong>, <Data value={dzis} /></p>
    </li>
  );

  return (
    <section className={`card ${style.os}`} aria-labelledby="kalendarz-os">
      <h2 id="kalendarz-os">Oś czasu</h2>
      <p className={style.wstep}>
        Najważniejsze badania, wizyty, urlopy i terminy wniosków w kolejności od najwcześniejszych.
        Szczegóły każdej pozycji są w opisach etapów poniżej.
      </p>
      <Pasek wynik={wynik} dzis={dzis} />

      <div className={style.filtry} role="group" aria-label="Co pokazać na osi czasu">
        {FILTRY.map(f => (
          <button key={f.id} type="button" className={style.filtr} aria-pressed={filtr === f.id}
            onClick={() => setFiltr(f.id)}>{f.nazwa}</button>
        ))}
      </div>
      <p className={style.tylkoCzytnik} role="status">
        Na osi czasu: {widoczne.length} {widoczne.length === 1 ? "pozycja" : "pozycji"}.
      </p>

      {minione.length > 0 && (
        <button type="button" className={`${style.filtr} ${style.minione}`} aria-expanded={pokazMinione}
          aria-controls={idListy} onClick={() => setPokazMinione(v => !v)}>
          {pokazMinione ? "Ukryj minione pozycje" : `Pokaż minione pozycje (${minione.length})`}
        </button>
      )}

      <ol id={idListy} className={style.lista} aria-label="Oś czasu: terminy i wydarzenia">
        {widoczne.map((k, i) => (
          <Fragment key={k.id}>
            {i === miejsceDzis && znacznikDzis}
            <Pozycja k={k} dzis={dzis} />
          </Fragment>
        ))}
        {miejsceDzis === widoczne.length && znacznikDzis}
      </ol>

      {widoczne.length === 0 && <p>Dla tego widoku nie ma pozycji do pokazania.</p>}
      {pominieteCykliczne > 0 && filtr !== "urlop" && (
        <p className={style.przypis}>Regularne wizyty kontrolne nie są na osi. Znajdziesz je w opisach etapów poniżej.</p>
      )}
      {brakPlanuUrlopu && filtr !== "badania" && (
        <p className={style.przypis}>
          Daty urlopów pojawią się na osi, gdy <Link href="/kalkulator">policzysz zasiłek w kalkulatorze</Link> dla tej samej daty porodu.
        </p>
      )}
    </section>
  );
}
