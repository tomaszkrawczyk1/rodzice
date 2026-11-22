"use client";

import { Fragment, useId, useState } from "react";
import Link from "next/link";
import { dniMiedzy, dodajMiesiace, type Parametry, type PlanWejscie } from "@/engine/kalkulator";
import { useFormaty, useT } from "@/lib/jezyk";
import { Wstaw } from "@/components/Wstaw";
import type { KalendarzWynik } from "@/lib/kalendarz";
import {
  ETYKIETY_RODZAJU, czyZadanie, kamienieMilowe, pasujeDoFiltra, stanKamienia,
  type FiltrOsi, type Kamien,
} from "@/lib/os-kalendarza";
import style from "./os-kalendarza.module.css";

const FILTRY: { id: FiltrOsi; nazwa: string }[] = [
  { id: "wszystko", nazwa: "Wszystko" },
  { id: "badania", nazwa: "Badania i wizyty" },
  { id: "urlop", nazwa: "Urlop i wnioski" },
];

function Data({ value }: { value: string }) {
  const { dataPL } = useFormaty();
  return <time dateTime={value}>{dataPL(value)}</time>;
}

function Terminy({ k }: { k: Kamien }) {
  const t = useT();
  if (k.od === k.do) return <>{k.termin && t("Do") + " "}<Data value={k.do} /></>;
  return <><Data value={k.od} /> – <Data value={k.do} /></>;
}

/** Pasek poglądowy: ciąża i pierwszy rok dziecka z zaznaczonym dniem dzisiejszym. Cała treść jest też w liście poniżej. */
function Pasek({ wynik, dzis }: { wynik: KalendarzWynik; dzis: string }) {
  const t = useT();
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
        <div className={style.ciaza} style={{ width: `${pPorod}%` }}>{t("Ciąża")}</div>
        <div className={style.rok} style={{ width: `${100 - pPorod}%` }}>{t("Pierwszy rok dziecka")}</div>
        {widocznaDzis && <span className={style.znacznikDzis} style={{ left: `${pDzis}%` }} />}
      </div>
      {widocznaDzis && (
        <span className={`${style.etykieta} ${style.etykietaGora} ${wyrownanie(pDzis)}`} style={{ left: `${pDzis}%` }}>{t("Dziś")}</span>
      )}
      {!dzisPrzyPorodzie && (
        <span className={`${style.etykieta} ${style.etykietaDol} ${wyrownanie(pPorod)}`} style={{ left: `${pPorod}%` }}>
          {t(wynik.dataPorodu ? "Poród" : "Termin porodu")}
        </span>
      )}
    </div>
  );
}

function Pozycja({ k, dzis, zrobione, onZrobione, onOtworz }: {
  k: Kamien; dzis: string; zrobione: boolean; onZrobione: (id: string) => void; onOtworz: (id: string) => void;
}) {
  const t = useT();
  const stan = stanKamienia(k, dzis);
  const zadanie = czyZadanie(k);
  const poTerminie = zadanie && !zrobione && stan === "minelo";
  const tytul = k.href
    ? <button type="button" className={style.tytulPrzycisk} onClick={() => onOtworz(k.id)}>{t(k.tytul)}</button>
    : t(k.tytul);
  const klasy = [
    style.pozycja, style[`r_${k.rodzaj}`],
    stan === "minelo" ? style.minelo : "", zrobione ? style.jestZrobione : "", poTerminie ? style.poTerminie : "",
  ].join(" ");
  return (
    <li className={klasy}>
      <span className={style.kropka} aria-hidden="true" />
      <div className={`${style.tresc} ${stan === "trwa" && !zrobione ? style.trwa : ""}`}>
        <p className={style.data}><Terminy k={k} /></p>
        <p className={style.tytul}>{tytul}</p>
        <p className={style.znaczki}>
          <span className={style.rodzaj}>{t(ETYKIETY_RODZAJU[k.rodzaj])}</span>
          {zrobione ? <span className={style.stan}>{t("Zrobione")}</span> : <>
            {stan === "trwa" && <span className={style.stan}>{t(k.od === k.do ? "Dziś" : "Trwa teraz")}</span>}
            {poTerminie && <span className={style.stanPo}>{t("Po terminie")}</span>}
            {stan === "minelo" && !zadanie && <span className={style.stan}>{t("Minęło")}</span>}
          </>}
          {k.szacunkowe && <span className={style.stan}>{t("Orientacyjnie")}</span>}
        </p>
        {zadanie && (
          <label className={style.zrobione}>
            <input type="checkbox" checked={zrobione} onChange={() => onZrobione(k.id)} />
            <span>{t("Zrobione")}<span className={style.tylkoCzytnik}>: {t(k.tytul)}</span></span>
          </label>
        )}
      </div>
    </li>
  );
}

export default function OsKalendarza({ wynik, dzis, plan, parametry, zrobione, onZrobione, onOtworz }: {
  wynik: KalendarzWynik; dzis: string; plan?: PlanWejscie; parametry: Parametry;
  /** Id pozycji zaznaczonych jako zrobione. */
  zrobione: ReadonlySet<string>;
  onZrobione: (id: string) => void;
  /** Kliknięcie tytułu pozycji: rodzic otwiera panel z boku. */
  onOtworz: (id: string) => void;
}) {
  const { dataPL } = useFormaty();
  const t = useT();
  const [filtr, setFiltr] = useState<FiltrOsi>("wszystko");
  const [pokazMinione, setPokazMinione] = useState(false);
  const idListy = useId();
  const { kamienie, pominieteCykliczne, brakPlanuUrlopu } = kamienieMilowe(wynik, parametry, dataPL, plan);

  const wFiltrze = kamienie.filter(k => pasujeDoFiltra(k, filtr));
  // Domyślnie chowamy tylko minione pozycje, których nie da się „zrobić” (np. skończony urlop).
  // Zadania zostają widoczne: zrobione są wyszarzone, a minione bez „Zrobione” mają czerwoną etykietę „Po terminie”.
  const schowane = (k: Kamien) => stanKamienia(k, dzis) === "minelo" && !czyZadanie(k);
  const minione = wFiltrze.filter(schowane);
  const widoczne = pokazMinione ? wFiltrze : wFiltrze.filter(k => !schowane(k));
  const indeksDzis = widoczne.findIndex(k => k.od > dzis);
  const miejsceDzis = indeksDzis === -1 ? widoczne.length : indeksDzis;

  const znacznikDzis = (
    <li className={style.dzis} aria-current="date">
      <span className={style.kropka} aria-hidden="true" />
      <p><strong>{t("Dziś")}</strong>, <Data value={dzis} /></p>
    </li>
  );

  return (
    <section className={`card ${style.os}`} aria-labelledby="kalendarz-os">
      <h2 id="kalendarz-os">{t("Oś czasu")}</h2>
      <p className={style.wstep}>
        {t("Najważniejsze badania, wizyty, urlopy i terminy wniosków w kolejności od najwcześniejszych. Kliknij tytuł, żeby zobaczyć krótki opis. Zaznacz „Zrobione”, gdy coś załatwisz.")}
      </p>
      <Pasek wynik={wynik} dzis={dzis} />

      <div className={style.filtry} role="group" aria-label={t("Co pokazać na osi czasu")}>
        {FILTRY.map(f => (
          <button key={f.id} type="button" className={style.filtr} aria-pressed={filtr === f.id}
            onClick={() => setFiltr(f.id)}>{t(f.nazwa)}</button>
        ))}
      </div>
      <p className={style.tylkoCzytnik} role="status">
        {t(widoczne.length === 1 ? "Na osi czasu: {n} pozycja." : widoczne.length % 10 >= 2 && widoczne.length % 10 <= 4 && (widoczne.length % 100 < 10 || widoczne.length % 100 > 20) ? "Na osi czasu: {n} pozycje." : "Na osi czasu: {n} pozycji.", { n: widoczne.length })}
      </p>

      {minione.length > 0 && (
        <button type="button" className={`${style.filtr} ${style.minione}`} aria-expanded={pokazMinione}
          aria-controls={idListy} onClick={() => setPokazMinione(v => !v)}>
          {pokazMinione ? t("Ukryj minione pozycje") : t("Pokaż minione pozycje ({n})", { n: minione.length })}
        </button>
      )}

      <ol id={idListy} className={style.lista} aria-label={t("Oś czasu: terminy i wydarzenia")}>
        {widoczne.map((k, i) => (
          <Fragment key={k.id}>
            {i === miejsceDzis && znacznikDzis}
            <Pozycja k={k} dzis={dzis} zrobione={zrobione.has(k.id)} onZrobione={onZrobione} onOtworz={onOtworz} />
          </Fragment>
        ))}
        {miejsceDzis === widoczne.length && znacznikDzis}
      </ol>

      {widoczne.length === 0 && <p>{t("Dla tego widoku nie ma pozycji do pokazania.")}</p>}
      {pominieteCykliczne > 0 && filtr !== "urlop" && (
        <p className={style.przypis}>{t("Regularne wizyty kontrolne nie są na osi. Znajdziesz je w opisach etapów poniżej.")}</p>
      )}
      {brakPlanuUrlopu && filtr !== "badania" && (
        <p className={style.przypis}>
          <Wstaw tekst={t("Daty urlopów pojawią się na osi, gdy {link} dla tej samej daty porodu.")} wartosci={{ link: <Link href="/kalkulator">{t("policzysz zasiłek w kalkulatorze")}</Link> }} />
        </p>
      )}
    </section>
  );
}
