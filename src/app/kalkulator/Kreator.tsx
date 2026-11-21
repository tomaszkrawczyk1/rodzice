"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { przejdzDoKroku } from "@/lib/ekran";
import css from "./kalkulator.module.css";

export type KrokDef = { id: string; nazwa: string; tytul?: string };

/** Numer bieżącego kroku i najdalszy osiągnięty (do niego można wrócić z paska postępu). */
export function useKreator(liczba: number) {
  const [krok, setKrok] = useState(0);
  const [maks, setMaks] = useState(0);
  const idz = useCallback((k: number) => {
    const w = Math.min(Math.max(k, 0), liczba - 1);
    setKrok(w);
    setMaks((m) => Math.max(m, w));
  }, [liczba]);
  return { krok, maks, idz };
}

/**
 * Powłoka kreatora: pasek postępu, lista kroków (aria-current="step"), nagłówek kroku i przyciski.
 * Treść kroku przychodzi jako `children`; walidację robi wywołujący w `onDalej`.
 */
export function Kreator({ kroki, krok, maks, onKrok, onDalej, dalejEtykieta = "Dalej", dalejZablokowany = false, podglad, children }: {
  kroki: KrokDef[];
  krok: number;
  maks: number;
  onKrok: (k: number) => void;
  onDalej: () => void;
  dalejEtykieta?: string;
  dalejZablokowany?: boolean;
  podglad?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const blok = useRef<HTMLDivElement>(null);
  const tytul = useRef<HTMLHeadingElement>(null);
  const poprzedni = useRef(krok);
  const ostatni = krok === kroki.length - 1;
  const aktualny = kroki[krok];

  // Po zmianie kroku: pasek postępu ląduje pod nagłówkiem strony, a fokus idzie na tytuł kroku (czytnik go odczyta).
  useEffect(() => {
    if (poprzedni.current === krok) return;
    poprzedni.current = krok;
    przejdzDoKroku(blok.current, tytul.current);
  }, [krok]);

  return (
    <div className={css.kreator} ref={blok}>
      <nav aria-label="Postęp kalkulatora" className={css.postep}>
        <p className={css.licznik}>Krok {krok + 1} z {kroki.length}: <b>{aktualny.nazwa}</b></p>
        <div className={css.pasek} aria-hidden="true"><div className={css.wypelnienie} style={{ width: `${((krok + 1) / kroki.length) * 100}%` }} /></div>
        <ol className={css.kroki}>
          {kroki.map((k, i) => {
            const tresc = <><span className={css.numer} aria-hidden="true">{i + 1}</span><span className={css.nazwa}><span className="vh">Krok {i + 1}: </span>{k.nazwa}</span></>;
            return (
              <li key={k.id} className={css.krok}>
                {i === krok
                  ? <span className={`${css.krokEl} ${css.biezacy}`} aria-current="step">{tresc}</span>
                  : i <= maks
                    ? <button type="button" className={`${css.krokEl} ${css.zrobiony}`} onClick={() => onKrok(i)}>{tresc}</button>
                    : <span className={`${css.krokEl} ${css.przyszly}`}>{tresc}</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      <form className={css.panel} aria-labelledby={`${id}-tytul`} noValidate onSubmit={(e) => { e.preventDefault(); if (!ostatni) onDalej(); }}>
        <h2 id={`${id}-tytul`} ref={tytul} tabIndex={-1} className={css.tytul}>{aktualny.tytul ?? aktualny.nazwa}</h2>
        {children}
        {podglad}
        <div className={css.nawigacja}>
          {krok > 0 && <button type="button" className="btn btn-ghost" onClick={() => onKrok(krok - 1)}>Wstecz</button>}
          {!ostatni && <button type="submit" className="btn btn-primary" disabled={dalejZablokowany}>{dalejEtykieta}</button>}
        </div>
      </form>
    </div>
  );
}
