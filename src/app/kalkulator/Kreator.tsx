"use client";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { przejdzDoKroku } from "@/lib/ekran";
import { parametrZywy, przejdz, wroc, zastap, zbudujAdres } from "./adres";
import css from "./kalkulator.module.css";

export type KrokDef = { id: string; nazwa: string; tytul?: string };

/**
 * Bieżący krok kreatora siedzi w adresie (?krok=…, pierwszy krok bez parametru). Każde przejście dalej to nowy wpis
 * historii, więc „Wstecz" przeglądarki cofa o krok, a odświeżenie i link odtwarzają ten sam krok.
 * `dostepny` to najdalszy krok (indeks), do którego pozwalają dotychczasowe dane: adres wskazujący dalej
 * (np. odświeżony wynik bez wpisanych danych) prowadzi do pierwszego kroku z brakami, a adres jest korygowany
 * bez dodawania wpisu w historii. Krok liczymy przy renderze z useSearchParams, więc serwer od razu zwraca HTML
 * właściwego kroku (bez „Wczytujemy…").
 */
export function useKreator(kroki: KrokDef[], dostepny: number) {
  const params = useSearchParams();
  const sciezka = usePathname();
  const szukaj = params.toString();
  const ostatni = kroki.length - 1;
  const dozwolony = Math.min(Math.max(dostepny, 0), ostatni);
  const indeks = (id: string | null) => Math.max(0, kroki.findIndex((k) => k.id === id));
  const krok = Math.min(indeks(params.get("krok")), dozwolony);
  const idKroku = (k: number) => (k <= 0 ? null : kroki[Math.min(k, ostatni)].id);

  // Najdalszy osiągnięty krok (do niego można wrócić z listy kroków).
  const [maksOsiagniety, setMaks] = useState(krok);
  useEffect(() => { setMaks((m) => Math.max(m, krok)); }, [krok]);
  const maks = Math.min(Math.max(maksOsiagniety, krok), dozwolony);

  // Porządkowanie adresu: nieznany albo niedostępny krok zastępujemy właściwym. Czytamy pasek adresu, a nie render,
  // żeby nie cofnąć przejścia, które router dopiero rejestruje.
  useEffect(() => {
    const zywy = parametrZywy("krok");
    const docelowy = idKroku(Math.min(indeks(zywy), dozwolony));
    if ((zywy ?? null) !== docelowy) zastap({ krok: docelowy });
  }, [szukaj, dozwolony]);

  // „Wstecz" i „Dalej" przeglądarki: przewijaniem i fokusem zajmuje się kreator (jak w sprawach), nie przeglądarka.
  useEffect(() => {
    const poprzednie = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { history.scrollRestoration = poprzednie; };
  }, []);

  return {
    krok,
    maks,
    /** Przejście do wskazanego kroku jako nowy wpis historii. */
    idz: (k: number) => przejdz({ krok: idKroku(k) }),
    /** O krok wstecz: cofa historię, jeśli poprzedni wpis to ten krok. */
    wstecz: () => wroc({ krok: idKroku(krok - 1) }),
    /** Adres kroku (prawdziwe linki na liście kroków; liczone też na serwerze). */
    adres: (k: number) => zbudujAdres(sciezka, szukaj, { krok: idKroku(k) }),
  };
}

/** Zwykłe kliknięcie w link kroku obsługujemy bez przeładowania; Ctrl/Cmd/Shift i środkowy przycisk działają jak w przeglądarce. */
function przejdzLinkiem(e: MouseEvent, idz: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  idz();
}

/**
 * Powłoka kreatora: pasek postępu, lista kroków (aria-current="step"), nagłówek kroku i przyciski.
 * Treść kroku przychodzi jako `children`; walidację robi wywołujący w `onDalej`.
 */
export function Kreator({ kroki, krok, maks, onKrok, onWstecz, adres, onDalej, dalejEtykieta = "Dalej", dalejZablokowany = false, podglad, children }: {
  kroki: KrokDef[];
  krok: number;
  maks: number;
  onKrok: (k: number) => void;
  onWstecz: () => void;
  adres: (k: number) => string;
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

  // Po zmianie kroku (przycisk, link, „Wstecz" i „Dalej" przeglądarki): pasek postępu ląduje pod nagłówkiem strony,
  // a fokus idzie na tytuł kroku (czytnik go odczyta). Przy pierwszym wejściu i po odświeżeniu fokusu nie przenosimy.
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
                    ? <a href={adres(i)} className={`${css.krokEl} ${css.zrobiony}`} onClick={(e) => przejdzLinkiem(e, () => onKrok(i))}>{tresc}</a>
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
          {krok > 0 && <button type="button" className="btn btn-ghost" onClick={onWstecz}>Wstecz</button>}
          {!ostatni && <button type="submit" className="btn btn-primary" disabled={dalejZablokowany}>{dalejEtykieta}</button>}
        </div>
      </form>
    </div>
  );
}
