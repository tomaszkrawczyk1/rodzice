"use client";

import { Fragment, useId, useState } from "react";
import type { Wydarzenie } from "@/lib/terminarz/terminarz.js";
import reguly from "@/lib/terminarz/rules.json";
import { OKNO_TERAZ_DNI, dniMiedzy } from "@/lib/terminarz/widok";
import { useFormaty, useT } from "@/lib/jezyk";
import style from "./terminarz.module.css";

const etykiety = reguly.labels;

/** „za 3 dni”, „5 dni temu”, „dziś”: zapis względem dzisiejszej daty w wybranym języku. */
function useIle() {
  const t = useT();
  const { dni } = useFormaty();
  return (n: number) => n === 0 ? t("dziś") : n === 1 ? t("jutro") : n === -1 ? t("wczoraj") : n > 0 ? t("za {dni}", { dni: dni(n) }) : t("{dni} temu", { dni: dni(-n) });
}

export function Znacznik({ kind }: { kind: Wydarzenie["kind"] }) {
  const t = useT();
  return <span className={`${style.znacznik} ${style[`znacznik_${kind}`]}`}>{t(etykiety.kind[kind])}</span>;
}

type StanPozycji = "punkt" | "zrobione" | "po_terminie" | "teraz" | "pozniej" | "minelo";

/** Termin, który minął i nie jest zaznaczony jako zrobiony, jest „po terminie” (poza pozycjami tylko informacyjnymi). */
function stanPozycji(z: Wydarzenie, dzis: string, zrobione: ReadonlySet<string>): StanPozycji {
  if (z.isBirth) return "punkt";
  if (zrobione.has(z.id)) return "zrobione";
  const roznica = dniMiedzy(dzis, z.date);
  if (roznica < 0) return z.kind === "info" ? "minelo" : "po_terminie";
  return roznica <= OKNO_TERAZ_DNI ? "teraz" : "pozniej";
}

function Czas({ z, dzis, orientacyjnie }: { z: Wydarzenie; dzis: string; orientacyjnie: boolean }) {
  const t = useT();
  const { dataPL } = useFormaty();
  const ile = useIle();
  return (
    <p className={style.data}>
      <time dateTime={z.date}>{dataPL(z.date)}</time>
      <span className={style.ile}>{ile(dniMiedzy(dzis, z.date))}</span>
      {orientacyjnie && !z.isBirth && <span className={style.orient}>{t("orientacyjnie")}</span>}
    </p>
  );
}

function Pozycja({ z, dzis, stan, orientacyjnie, jestZrobione, onZrobione, onOtworz }: {
  z: Wydarzenie; dzis: string; stan: StanPozycji; orientacyjnie: boolean;
  jestZrobione: boolean; onZrobione: (id: string) => void; onOtworz: (id: string) => void;
}) {
  const t = useT();
  return (
    <li className={`${style.pozycjaOsi} ${style[`os_${stan}`]}`}>
      <span className={style.kropkaOsi} aria-hidden="true" />
      <div className={style.trescOsi}>
        <Czas z={z} dzis={dzis} orientacyjnie={orientacyjnie} />
        <p className={style.tytulOsi}>
          <button type="button" className={style.tytulPrzycisk} onClick={() => onOtworz(z.id)}>{t(z.title)}</button>
        </p>
        {z.institution && <p className={style.gdzie}><b>{t("Gdzie:")}</b> {t(z.institution)}</p>}
        <p className={style.znaczniki}>
          {z.isBirth
            ? <span className={`${style.znacznik} ${style.znacznik_porod}`}>{t("Punkt odniesienia")}</span>
            : <>
              <Znacznik kind={z.kind} />
              {stan === "zrobione" && <span className={style.stanOsi}>{t("Zrobione")}</span>}
              {stan === "teraz" && <span className={style.stanTeraz}>{t("Teraz")}</span>}
              {stan === "po_terminie" && <span className={style.stanPo}>{t("Po terminie")}</span>}
              {stan === "minelo" && <span className={style.stanOsi}>{t("Minęło")}</span>}
            </>}
        </p>
        {!z.isBirth && (
          <label className={style.zrobioneEtykieta}>
            <input type="checkbox" checked={jestZrobione} onChange={() => onZrobione(z.id)} />
            <span>{t("Zrobione")}<span className={style.sr}>: {t(z.title)}</span></span>
          </label>
        )}
      </div>
    </li>
  );
}

/**
 * Oś czasu terminów w urzędach: krótka wersja każdej pozycji (data, nazwa, gdzie złożyć), „Co zrobić teraz” na górze,
 * pole „Zrobione” (zapis w przeglądarce) i czerwone „Po terminie”. Pełna instrukcja otwiera się w panelu z boku (rodzic).
 */
export default function OsTerminarza({ zdarzenia, dzis, orientacyjnie, zrobione, onZrobione, onOtworz }: {
  zdarzenia: Wydarzenie[]; dzis: string; orientacyjnie: boolean;
  zrobione: ReadonlySet<string>; onZrobione: (id: string) => void; onOtworz: (id: string) => void;
}) {
  const t = useT();
  const { dataPL } = useFormaty();
  const ile = useIle();
  const [pokazMinione, setPokazMinione] = useState(false);
  const idListy = useId();

  const stany = new Map(zdarzenia.map(z => [z.id, stanPozycji(z, dzis, zrobione)]));
  const stanZ = (z: Wydarzenie) => stany.get(z.id)!;
  const doZrobienia = zdarzenia.filter(z => stanZ(z) === "po_terminie" || stanZ(z) === "teraz");
  // Domyślnie chowamy to, co minęło i nie wymaga już uwagi (zrobione albo tylko informacyjne). Nieodhaczone zaległości zostają widoczne.
  const schowane = (z: Wydarzenie) => !z.isBirth && dniMiedzy(dzis, z.date) < 0 && stanZ(z) !== "po_terminie";
  const minione = zdarzenia.filter(schowane);
  const widoczne = pokazMinione ? zdarzenia : zdarzenia.filter(z => !schowane(z));
  const indeksDzis = widoczne.findIndex(z => z.date > dzis);
  const miejsceDzis = indeksDzis === -1 ? widoczne.length : indeksDzis;

  const znacznikDzis = (
    <li className={style.dzisOsi} aria-current="date">
      <span className={style.kropkaOsi} aria-hidden="true" />
      <p><strong>{t("Dziś")}</strong>, <time dateTime={dzis}>{dataPL(dzis)}</time></p>
    </li>
  );

  return (
    <section className={style.os} aria-labelledby="tz-os">
      <h2 id="tz-os">{t("Oś czasu")}</h2>
      <p className={style.meta}>
        {t("Kliknij nazwę terminu, żeby zobaczyć pełną instrukcję: dokumenty, linki do druków i źródła. Zaznacz „Zrobione”, gdy coś załatwisz.")}
      </p>

      <div className={`card ${style.terazBlok}`} role="region" aria-labelledby="tz-teraz">
        <h3 id="tz-teraz">{t("Co zrobić teraz")}</h3>
        {doZrobienia.length === 0
          ? <p className={style.meta}>{t("Nic pilnego. W najbliższych {n} dniach nie ma terminów do załatwienia.", { n: OKNO_TERAZ_DNI })}</p>
          : (
            <ul className={style.terazLista}>
              {doZrobienia.map(z => (
                <li key={z.id}>
                  <button type="button" className={style.tytulPrzycisk} onClick={() => onOtworz(z.id)}>{t(z.title)}</button>
                  <span className={style.terazMeta}>
                    {" "}<time dateTime={z.date}>{dataPL(z.date)}</time> ({ile(dniMiedzy(dzis, z.date))})
                    {z.institution && <>, {t(z.institution)}</>}
                  </span>
                  {stanZ(z) === "po_terminie" && <> <span className={style.stanPo}>{t("Po terminie")}</span></>}
                </li>
              ))}
            </ul>
          )}
      </div>

      {minione.length > 0 && (
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={pokazMinione} aria-controls={idListy}
          onClick={() => setPokazMinione(v => !v)}>
          {pokazMinione ? t("Ukryj zrobione i minione terminy") : t("Pokaż zrobione i minione terminy ({n})", { n: minione.length })}
        </button>
      )}

      <ol id={idListy} className={style.osLista} aria-label={t("Oś czasu: terminy w urzędach")}>
        {widoczne.map((z, i) => (
          <Fragment key={z.id}>
            {i === miejsceDzis && znacznikDzis}
            <Pozycja z={z} dzis={dzis} stan={stanZ(z)} orientacyjnie={orientacyjnie}
              jestZrobione={zrobione.has(z.id)} onZrobione={onZrobione} onOtworz={onOtworz} />
          </Fragment>
        ))}
        {miejsceDzis === widoczne.length && znacznikDzis}
      </ol>
    </section>
  );
}

export { Czas };
