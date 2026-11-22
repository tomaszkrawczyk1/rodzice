"use client";

import { Fragment, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import dane from "../../data/kalendarz_medyczny.json";
import { dniMiedzy, type Parametry, type PlanWejscie } from "@/engine/kalkulator";
import { DataPole } from "@/components/DataPole";
import OsKalendarza from "@/components/OsKalendarza";
import PanelBoczny from "@/components/PanelBoczny";
import { useZrobione } from "@/lib/zrobione";
import { dataPL, formaty, liczba, tygodnie } from "@/lib/format";
import {
  kalendarz, najblizszeZadania, poprawnaData, terminyKalendarza,
  type BazaKalendarza, type Informacja, type KalendarzWynik, type Trymestr, type WydarzenieNaOsi,
} from "@/lib/kalendarz";
import { api, useSesja } from "@/lib/sesja";
import style from "./kalendarz.module.css";
import { useFormaty, useT } from "@/lib/jezyk";
import { wstaw } from "@/i18n/bogaty";

const baza: BazaKalendarza = dane as BazaKalendarza;
const warunkiBazy = baza.warunki ?? [];
const klucz = "rodzice.kalendarz";
type Daty = "terminPorodu" | "dataPorodu" | "dataWypisu";

type Tryb = "ciaza" | "urodzone";

interface Formularz {
  /** Wybrany etap: „Jestem w ciąży” albo „Dziecko już się urodziło”. Pokazujemy tylko pola wybranej opcji. */
  tryb?: Tryb;
  terminPorodu?: string;
  dataPorodu?: string;
  dataWypisu?: string;
  warunki: string[];
}

interface Scenariusze {
  przypadki?: { id: string; wejscie?: Partial<PlanWejscie> }[];
}

function odczytajFormularze(): Record<string, Partial<Formularz>> {
  const zapis = JSON.parse(localStorage.getItem(klucz) ?? "{}");
  return zapis && typeof zapis === "object" && !Array.isArray(zapis) ? zapis : {};
}

function odczytajFormularz(profil: string): Formularz {
  try {
    const zapis = odczytajFormularze()[profil];
    if (zapis) return {
      // Zapisy sprzed wyboru etapu: dziecko urodzone, jeśli wpisano datę porodu albo wypisu.
      tryb: zapis.tryb === "ciaza" || zapis.tryb === "urodzone" ? zapis.tryb
        : zapis.dataPorodu || zapis.dataWypisu ? "urodzone" : "ciaza",
      terminPorodu: zapis.terminPorodu === "" || poprawnaData(zapis.terminPorodu) ? zapis.terminPorodu : undefined,
      dataPorodu: poprawnaData(zapis.dataPorodu) ? zapis.dataPorodu : undefined,
      dataWypisu: poprawnaData(zapis.dataWypisu) ? zapis.dataWypisu : undefined,
      warunki: Array.isArray(zapis.warunki)
        ? warunkiBazy.filter(w => zapis.warunki!.includes(w.id)).map(w => w.id)
        : [],
    };
  } catch { /* Formularz działa również bez zapisu w przeglądarce. */ }
  return { warunki: [] };
}

function zapiszFormularz(profil: string, formularz: Formularz) {
  try {
    let formularze: Record<string, Partial<Formularz>>;
    try { formularze = odczytajFormularze(); } catch { formularze = {}; }
    localStorage.setItem(klucz, JSON.stringify({ ...formularze, [profil]: formularz }));
  } catch { /* Formularz działa również bez zapisu w przeglądarce. */ }
}

function czyPlanPorodu(plan?: Partial<PlanWejscie>): plan is PlanWejscie {
  return plan?.tytul === "porod" && poprawnaData(plan.dataZdarzenia) &&
    typeof plan.liczbaDzieci === "number" && !!plan.podstawy && Array.isArray(plan.rodzicielski);
}

function dzisLokalnie() {
  const dzis = new Date();
  return `${dzis.getFullYear()}-${String(dzis.getMonth() + 1).padStart(2, "0")}-${String(dzis.getDate()).padStart(2, "0")}`;
}

function Data({ value }: { value: string }) {
  const { dataPL } = useFormaty();
  return <time dateTime={value}>{dataPL(value)}</time>;
}

function Podsumowanie({ wynik, dzis }: { wynik: KalendarzWynik; dzis: string }) {
  const t = useT();
  const { tygodnie, dni: dniF } = useFormaty();
  const dni = dniMiedzy(wynik.dataPorodu ?? wynik.poczatekCiazy, dzis);
  const pozostalo = dniMiedzy(dzis, wynik.terminPorodu);
  const czas = t("{tyg} i {dni}", { tyg: tygodnie(Math.floor(dni / 7)), dni: dniF(dni % 7) });
  return (
    <section className={`card ${style.podsumowanie}`} aria-labelledby="kalendarz-podsumowanie">
      <h2 id="kalendarz-podsumowanie">
        {wynik.dataPorodu
          ? dni >= 0 ? t("Dziecko ma {czas}", { czas }) : wstaw(t("Wpisana data porodu to {data}"), { data: <Data value={wynik.dataPorodu} /> })
          : dni < 0 ? t("Sprawdź planowany termin porodu")
          : pozostalo >= 0 ? t("Ciąża trwa {czas}", { czas })
          : t("Planowany termin porodu już minął")}
      </h2>
      {!wynik.dataPorodu && dni >= 0 && pozostalo > 0 && (
        <p>{wstaw(t("Planowany termin porodu to {data}. Pozostało {dni}."), { data: <Data value={wynik.terminPorodu} />, dni: dniF(pozostalo) })}</p>
      )}
      {!wynik.dataPorodu && pozostalo === 0 && <p>{t("Planowany termin porodu wypada dziś.")}</p>}
      {!wynik.dataPorodu && dni < 0 && <p>{t("Według wpisanego terminu początek ciąży wypada po dzisiejszej dacie.")}</p>}
      {!wynik.dataPorodu && (
        <p>{t("Terminy po porodzie są orientacyjne. Gdy dziecko się urodzi, wybierz „Dziecko już się urodziło” i wpisz datę porodu, a przeliczymy je dokładnie.")}</p>
      )}
      {wynik.dataPorodu && wynik.uzytoZalozonegoWypisu && (
        <p>{wstaw(t("Przyjęta data wypisu to {data}. Możesz wpisać datę wypisu ze szpitala, aby przeliczyć związane z nim terminy."), { data: <Data value={wynik.wypis.data} /> })}</p>
      )}
    </section>
  );
}

function trwa(e: WydarzenieNaOsi, dzis: string) {
  return e.od <= dzis && dzis <= e.do;
}

function rozwinDo(id: string) {
  let d = id ? document.getElementById(id)?.closest("details") ?? null : null;
  while (d) {
    d.open = true;
    d = d.parentElement?.closest("details") ?? null;
  }
}

/**
 * Kliknięcie dowolnego linku „#…” w kalendarzu (ramka zadań, lista „Teraz”, oś czasu): przed przewinięciem
 * rozwijamy zwinięte grupy, w których leży cel. Obsługa w fazie przechwytywania, więc działa dla linków z każdego komponentu.
 */
function odslon(e: MouseEvent<HTMLElement>) {
  const a = (e.target as Element).closest?.("a[href^='#']") as HTMLAnchorElement | null;
  if (a) rozwinDo(decodeURIComponent(a.hash.slice(1)));
}

const ID_ZUS = "kalendarz-zus";

/** Id pozycji w panelu i na osi czasu: wydarzenia z bazy to „w-<id>”, wniosek do ZUS to „wniosek-zus”. */
const idPozycji = (id: string) => id === ID_ZUS ? "wniosek-zus" : `w-${id}`;

function Najblizsze({ wynik, dzis, plan, parametry, zrobione, onOtworz }: {
  wynik: KalendarzWynik; dzis: string; plan?: PlanWejscie; parametry: Parametry;
  zrobione: ReadonlySet<string>; onOtworz: (id: string) => void;
}) {
  const { wniosek } = terminyKalendarza(wynik, parametry, plan);
  const zus = {
    id: ID_ZUS, nazwa: "Wniosek do ZUS o zasiłek macierzyński",
    od: wynik.dataPorodu ?? wynik.terminPorodu, do: wniosek, szacunkowe: !wynik.dataPorodu,
  };
  const t = useT();
  const { dni: dniF } = useFormaty();
  const zadania = najblizszeZadania([...wynik.oś, zus].filter(p => !zrobione.has(idPozycji(p.id))), dzis, 2);
  return (
    <section className={`card ${style.najblizsze}`} aria-labelledby="kalendarz-najblizsze">
      <h2 id="kalendarz-najblizsze">{t("Najbliższe zadania dla Ciebie")}</h2>
      {zadania.length ? (
        <ol className={style.zadania}>
          {zadania.map(z => (
            <li key={z.id}>
              <span className={style.ile}>
                {z.trwa
                  ? z.dni === 0 ? t("Ostatni dzień: dziś") : t("Zostało {dni}", { dni: dniF(z.dni) })
                  : z.dni === 0 ? t("Zaczyna się dziś") : t("Za {dni}", { dni: dniF(z.dni) })}
              </span>
              <button type="button" className={style.przyciskTytul} onClick={() => onOtworz(idPozycji(z.id))}>{t(z.nazwa)}</button>
              <span className={style.kiedyZadanie}>
                {z.trwa ? wstaw(t("Do {data}"), { data: <Data value={z.do} /> })
                  : z.od === z.do ? <Data value={z.od} />
                  : wstaw(t("Od {od}, najpóźniej do {do}"), { od: <Data value={z.od} />, do: <Data value={z.do} /> })}
                {z.szacunkowe && " · " + t("orientacyjnie")}
              </span>
            </li>
          ))}
        </ol>
      ) : <p>{t("Na razie nie masz zbliżających się terminów.")}</p>}
      <p className={style.reszta}>{t("Kliknij tytuł, żeby zobaczyć krótki opis. Pozostałe terminy są niżej, na osi czasu i w etapach.")}</p>
    </section>
  );
}

function Lista({ pozycje }: { pozycje: string[] }) {
  const t = useT();
  return <ul>{pozycje.map((p, i) => <li key={i}>{t(p)}</li>)}</ul>;
}

function Czestotliwosc({ wartosc }: { wartosc?: string }) {
  const t = useT();
  if (typeof wartosc !== "string" || !wartosc.trim()) return null;
  return <span>{t("Jak często?")} {t(wartosc.trim())}</span>;
}

function TekstZeZrodlami({ tekst }: { tekst: string }) {
  const t = useT();
  const wezly: ReactNode[] = [];
  const re = /https?:\/\/[^\s<>"']+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tekst))) {
    let url = m[0];
    let ogon = "";
    while (url && /[),.;:]$/.test(url)) {
      ogon = url.slice(-1) + ogon;
      url = url.slice(0, -1);
    }
    if (m.index > last) wezly.push(<Fragment key={`t${last}`}>{tekst.slice(last, m.index)}</Fragment>);
    if (url) {
      wezly.push(
        <a key={`a${m.index}`} href={url} target="_blank" rel="noopener noreferrer">
          {url}
          <span className={style.tylkoCzytnik}> ({t("otwiera się w nowej karcie")})</span>
        </a>,
      );
    }
    if (ogon) wezly.push(<Fragment key={`o${m.index}`}>{ogon}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < tekst.length) wezly.push(<Fragment key={`k${last}`}>{tekst.slice(last)}</Fragment>);
  return <>{wezly}</>;
}

function Zrodla({ tekst, nazwa }: { tekst?: string; nazwa: string }) {
  const t = useT();
  if (typeof tekst !== "string" || !tekst.trim()) return null;
  return (
    <details className={style.zrodla}>
      <summary>{t("Źródła")} <span className={style.tylkoCzytnik}>{t("pozycji „{nazwa}”", { nazwa: t(nazwa) })}</span></summary>
      <p lang="pl"><TekstZeZrodlami tekst={tekst} /></p>
    </details>
  );
}

function Niepotwierdzone({ wynik }: { wynik: KalendarzWynik }) {
  const t = useT();
  const lista = wynik.ostrzezenia.map(o => o.trim()).filter(o => o.includes("do potwierdzenia"));
  if (lista.length === 0) return null;
  return (
    <div className={style.ostrzezenie} role="status">
      {lista.map(o => <p key={o}>{t(o)}</p>)}
    </div>
  );
}

function Karta({ wydarzenie: e, dzis, poczatek }: { wydarzenie: WydarzenieNaOsi; dzis: string; poczatek: string }) {
  const t = useT();
  const teraz = trwa(e, dzis);
  const odznaki = [
    teraz ? "Teraz" : "",
    e.do < dzis ? "Termin minął" : "",
    e.szacunkowe ? "Orientacyjnie" : "",
    e.typ === "warunkowe" ? "Dotyczy Twojej sytuacji" : "",
    e.dla === "matka" ? "Dla mamy" : e.dla === "dziecko" ? "Dla dziecka" : "",
  ].filter(Boolean);
  return (
    <article id={`kalendarz-w-${e.id}`} tabIndex={-1} className={`card ${style.wydarzenie} ${teraz ? style.trwa : ""}`}>
      <h3>{t(e.nazwa)}</h3>
      {odznaki.length > 0 && (
        <div className={style.odznaki}>
          {odznaki.map(nazwa => (
            <span key={nazwa} className={nazwa === "Teraz" || nazwa === "Dotyczy Twojej sytuacji" ? "badge ok" : "badge sim"}>{t(nazwa)}</span>
          ))}
        </div>
      )}
      <p className={style.daty}>
        <strong>
          {e.od === e.do ? <Data value={e.od} />
            : e.od === poczatek ? <>{wstaw(t("Do {data}"), { data: <Data value={e.do} /> })}</>
            : <><Data value={e.od} /> – <Data value={e.do} /></>}
        </strong>
        {e.kiedy && <span>{t(e.kiedy)}</span>}
        {e.najpozniej && <span>{wstaw(t("Najpóźniej {data}"), { data: <Data value={e.najpozniej} /> })}</span>}
        <Czestotliwosc wartosc={e.czestotliwosc} />
      </p>
      {e.opis && <p>{t(e.opis)}</p>}
      {e.skutek && (
        <p className={style.skutek}>
          <strong>{t("Gdy pominiesz termin")}</strong>
          {t(e.skutek)}
          <span className={style.porada}>{t("Sprawdź u lekarza prowadzącego, co to oznacza w Twoim przypadku.")}</span>
        </p>
      )}
      {(!!e.pozycje?.length || !!e.uwagi?.length) && (
        <details>
          <summary>{t("Szczegóły")} <span className={style.tylkoCzytnik}>{t("pozycji „{nazwa}”", { nazwa: t(e.nazwa) })}</span></summary>
          {!!e.pozycje?.length && <><h4>{t("Co obejmuje")}</h4><Lista pozycje={e.pozycje} /></>}
          {!!e.uwagi?.length && <><h4>{t("Warto wiedzieć")}</h4><Lista pozycje={e.uwagi} /></>}
        </details>
      )}
      <Zrodla tekst={e.zrodlo} nazwa={e.nazwa} />
    </article>
  );
}

function Informacje({ informacje }: { informacje: Informacja[] }) {
  const t = useT();
  return informacje.map(i => (
    <article className={`card ${style.informacja}`} key={i.id}>
      <h3>{t(i.temat)}</h3>
      <Lista pozycje={i.tresc} />
      <Zrodla tekst={i.zrodlo} nazwa={i.temat} />
    </article>
  ));
}

function Zus({ wynik, plan, parametry }: { wynik: KalendarzWynik; plan?: PlanWejscie; parametry: Parametry }) {
  const t = useT();
  const { liczba, dni } = useFormaty();
  const dataPolska = formaty("pl").dataPL; // zdania z silnika są po polsku: daty wstawiamy po polsku i dopiero tłumaczymy całe zdanie
  const { wniosek, doPracodawcy } = terminyKalendarza(wynik, parametry, plan);
  const procent = liczba(parametry.procenty.wariant_pelny_wymiar_81_5);
  const terminy = parametry.terminy_dni;
  return (
    <section id="kalendarz-zus" className={`card ${style.zus}`} aria-labelledby="kalendarz-zus-tytul">
      <h2 id="kalendarz-zus-tytul">{t("W ZUS")}</h2>
      <h3>{t("Wniosek o zasiłek macierzyński w wariancie {procent}%", { procent })}</h3>
      <p><strong>{wstaw(t("Do {data}"), { data: <Data value={wniosek} /> })}</strong></p>
      <p>{t(wynik.dataPorodu ? "Termin liczony od wpisanej daty porodu." : "Termin orientacyjny. Liczymy od planowanego terminu porodu.")}</p>
      <h3>{t("Wnioski o urlop do pracodawcy")}</h3>
      {doPracodawcy.length > 0 ? (
        <ul>
          {doPracodawcy.map((w, i) => (
            <li key={i}>
              {wstaw(t("{co}. Złóż do {data}."), { co: t(w.co.replace(/\d{4}-\d{2}-\d{2}/g, dataPolska)), data: <Data value={w.do!} /> })}
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          <li>{t("Wniosek o urlop rodzicielski złóż {dni} przed rozpoczęciem urlopu.", { dni: dni(terminy.wniosek_urlop_rodzicielski_przed_startem) })}</li>
          <li>{t("Wniosek o urlop ojcowski złóż {dni} przed rozpoczęciem urlopu.", { dni: dni(terminy.wniosek_urlop_ojcowski_przed_startem) })}</li>
        </ul>
      )}
      <Link href="/sprawa/urlop-pracodawca">{t("Sprawdź termin dla wybranej daty urlopu")}</Link>
    </section>
  );
}

/** Krótki opis pozycji do panelu z boku. Zwraca null, gdy pozycja nie ma opisu (np. poród, okres urlopu). */
function szczegolyPozycji(t: (s: string, v?: Record<string, string | number>) => string, id: string, wynik: KalendarzWynik, parametry: Parametry, plan?: PlanWejscie): { tytul: string; tresc: ReactNode } | null {
  if (id.startsWith("w-")) {
    const e = wynik.oś.find(x => x.id === id.slice(2));
    if (!e) return null;
    return {
      tytul: t(e.nazwa),
      tresc: (
        <>
          <p>
            <strong>{e.od === e.do ? <Data value={e.od} /> : <><Data value={e.od} /> – <Data value={e.do} /></>}</strong>
            {e.szacunkowe && " · " + t("orientacyjnie")}
          </p>
          {e.kiedy && <p>{t(e.kiedy)}</p>}
          {e.najpozniej && <p>{wstaw(t("Najpóźniej {data}"), { data: <Data value={e.najpozniej} /> })}</p>}
          {e.opis && <p>{t(e.opis)}</p>}
          {!!e.pozycje?.length && <><h3>{t("Co obejmuje")}</h3><Lista pozycje={e.pozycje} /></>}
          {!!e.uwagi?.length && <><h3>{t("Warto wiedzieć")}</h3><Lista pozycje={e.uwagi} /></>}
          {e.skutek && <><h3>{t("Gdy pominiesz termin")}</h3><p>{t(e.skutek)} {t("Sprawdź u lekarza prowadzącego, co to oznacza w Twoim przypadku.")}</p></>}
        </>
      ),
    };
  }
  const { wniosek, doPracodawcy } = terminyKalendarza(wynik, parametry, plan);
  if (id === "wniosek-zus") {
    return {
      tytul: t("Wniosek o zasiłek macierzyński"),
      tresc: (
        <>
          <p><strong>{wstaw(t("Do {data}"), { data: <Data value={wniosek} /> })}</strong>{!wynik.dataPorodu && " · " + t("orientacyjnie")}</p>
          <p>{t(wynik.dataPorodu ? "Termin liczony od wpisanej daty porodu." : "Termin orientacyjny. Liczymy od planowanego terminu porodu.")}</p>
          <p><Link href="/dokumenty">{t("Sprawdź, kto wypłaca zasiłek i gdzie złożyć wniosek")}</Link></p>
        </>
      ),
    };
  }
  const m = /^wniosek-pracodawca-(\d+)$/.exec(id);
  const tm = m ? doPracodawcy[+m[1]] : undefined;
  if (!tm?.do) return null;
  return {
    tytul: t(tm.co.replace(/\d{4}-\d{2}-\d{2}/g, dataPL)),
    tresc: (
      <>
        <p><strong>{wstaw(t("Złóż do pracodawcy do {data}"), { data: <Data value={tm.do} /> })}</strong></p>
        <p><Link href="/sprawa/urlop-pracodawca">{t("Sprawdź termin dla wybranej daty urlopu")}</Link></p>
      </>
    ),
  };
}

function Os({ wynik, dzis, plan, parametry, zrobione, onZrobione, onOtworz }: {
  wynik: KalendarzWynik; dzis: string; plan?: PlanWejscie; parametry: Parametry;
  zrobione: ReadonlySet<string>; onZrobione: (id: string) => void; onOtworz: (id: string) => void;
}) {
  const t = useT();
  const ileTerminow = (n: number) => t(n === 1 ? "{n} termin" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20) ? "{n} terminy" : "{n} terminów", { n });
  const teraz = wynik.oś.filter(e => trwa(e, dzis)).sort((a, b) => a.do.localeCompare(b.do));
  const sytuacje = wynik.informacje.filter(i => i.rodzaj === "sytuacja_szczegolna");
  const ogolne = wynik.informacje.filter(i => i.rodzaj !== "sytuacja_szczegolna" && i.trymestr === undefined);
  const etapy = wynik.wgTrymestrow;
  const zus = <Zus wynik={wynik} plan={plan} parametry={parametry} />;
  const zusPrzyPologu = etapy.some(e => e.trymestr === "polog");
  // Rozwinięty jest tylko etap, w którym jesteś teraz (coś trwa albo zaraz się zacznie). Pozostałe są zwinięte.
  const aktywny: Trymestr | undefined =
    etapy.find(e => e.wydarzenia.some(w => trwa(w, dzis)))?.trymestr ??
    etapy.find(e => e.wydarzenia.some(w => w.do >= dzis))?.trymestr;
  return (
    <>
      <Podsumowanie wynik={wynik} dzis={dzis} />
      <Niepotwierdzone wynik={wynik} />
      <section className={`card ${style.teraz}`} aria-labelledby="kalendarz-teraz">
        <h2 id="kalendarz-teraz">{t("Teraz warto zrobić")}</h2>
        {teraz.length ? (
          <details>
            <summary>{t("Pokaż wszystko, co trwa teraz")} ({ileTerminow(teraz.length)})</summary>
          <ul>
            {teraz.map(e => (
              <li key={e.id}>
                  <button type="button" className={style.przyciskTytul} onClick={() => onOtworz(idPozycji(e.id))}>{t(e.nazwa)}</button>
                  <div>{t("Do ")}<Data value={e.do} />{e.szacunkowe && " · orientacyjnie"}</div>
              </li>
            ))}
          </ul>
          </details>
        ) : <p>{t("Na dziś w kalendarzu nie ma zaplanowanych wizyt ani badań.")}</p>}
      </section>
      <OsKalendarza wynik={wynik} dzis={dzis} plan={plan} parametry={parametry}
        zrobione={zrobione} onZrobione={onZrobione} onOtworz={onOtworz} />
      <nav aria-label={t("Etapy kalendarza")}>
        <ul className={style.nawigacja}>
          {etapy.map(e => (
            <Fragment key={e.trymestr}>
              <li><a href={`#kalendarz-etap-${e.trymestr}`}>{t(e.nazwa)}</a></li>
              {e.trymestr === "polog" && <li><a className={style.linkZus} href="#kalendarz-zus">{t("W ZUS")}</a></li>}
            </Fragment>
          ))}
          {!zusPrzyPologu && <li><a className={style.linkZus} href="#kalendarz-zus">{t("W ZUS")}</a></li>}
        </ul>
      </nav>
      {etapy.map(e => (
        <Fragment key={e.trymestr}>
          <section className={style.etap} aria-labelledby={`kalendarz-etap-${e.trymestr}`}>
            <h2 id={`kalendarz-etap-${e.trymestr}`}>
              {t(e.nazwa)}
              {e.trymestr === aktywny && <span className={`badge ok ${style.etapTeraz}`}>{t("Teraz")}</span>}
            </h2>
            {e.opis && <p className={style.opisEtapu}>{t(e.opis)}</p>}
            <details className={style.zwijane} open={e.trymestr === aktywny}>
              <summary>{t("Terminy na tym etapie")} ({ileTerminow(e.wydarzenia.length)})</summary>
            {e.wydarzenia.map(w => <Karta key={w.id} wydarzenie={w} dzis={dzis} poczatek={wynik.poczatekCiazy} />)}
            <Informacje informacje={wynik.informacje.filter(i => i.rodzaj !== "sytuacja_szczegolna" && i.trymestr === e.trymestr)} />
            </details>
          </section>
          {e.trymestr === "polog" && zus}
        </Fragment>
      ))}
      {!zusPrzyPologu && zus}
      {wynik.bezTrymestru.map(w => <Karta key={w.id} wydarzenie={w} dzis={dzis} poczatek={wynik.poczatekCiazy} />)}
      {!!sytuacje.length && (
        <section className={style.etap} aria-labelledby="kalendarz-sytuacje">
          <h2 id="kalendarz-sytuacje">{t("Twoja sytuacja")}</h2>
          <Informacje informacje={sytuacje} />
        </section>
      )}
      {!!ogolne.length && (
        <section className={style.etap} aria-labelledby="kalendarz-informacje">
          <h2 id="kalendarz-informacje">{t("Warto wiedzieć")}</h2>
          <Informacje informacje={ogolne} />
        </section>
      )}
    </>
  );
}

function FormularzKalendarza({ personaId, parametry }: { personaId?: string; parametry: Parametry }) {
  const t = useT();
  const { dni } = useFormaty();
  const profil = personaId ? `profil:${personaId}` : "gosc";
  const [stan, setStan] = useState<Formularz | null>(null);
  const [pokazWarunki, setPokazWarunki] = useState(false);
  const [scenariusz, setScenariusz] = useState<Partial<PlanWejscie>>();
  const [zapisanyPlan, setZapisanyPlan] = useState<PlanWejscie>();
  const [panel, setPanel] = useState<string | null>(null);
  const { zrobione, przelacz } = useZrobione(`${klucz}.zrobione.${profil}`);

  useEffect(() => {
    const zapis = odczytajFormularz(profil);
    setStan(zapis);
    setPokazWarunki(zapis.warunki.length > 0);
    if (!personaId) {
      try {
        const plan = JSON.parse(localStorage.getItem("rodzice.plan") ?? "null")?.wejscie;
        if (czyPlanPorodu(plan)) setZapisanyPlan(plan);
      } catch { /* Kalendarz działa również bez zapisanego planu. */ }
      return;
    }
    let aktywny = true;
    api<Scenariusze>("/api/scenariusze").then(dane => {
      const wejscie = dane.przypadki?.find(p => p.id === personaId.replace(/[ab]$/, ""))?.wejscie;
      if (aktywny && wejscie?.tytul === "porod") setScenariusz(wejscie);
    }).catch(() => { /* Na wypadek braku scenariusza datę można wpisać samodzielnie. */ });
    return () => { aktywny = false; };
  }, [personaId, profil]);

  if (stan === null) return null;

  const terminProfilu = poprawnaData(scenariusz?.dataZdarzenia) ? scenariusz.dataZdarzenia : "";
  const tryb: Tryb = stan.tryb ?? "ciaza";
  const urodzone = tryb === "urodzone";
  const { warunki } = stan;
  // Pola drugiej opcji zostają zapisane, ale nie wpływają na kalendarz, dopóki nie wybierzesz tamtego etapu.
  const dataPorodu = urodzone ? stan.dataPorodu : undefined;
  const dataWypisu = urodzone ? stan.dataWypisu : undefined;
  const terminWpisany = stan.terminPorodu ?? terminProfilu;
  // Gdy dziecko już jest na świecie, kalendarz liczymy od daty porodu.
  const terminPorodu = urodzone ? dataPorodu ?? "" : terminWpisany;
  const daty = urodzone ? { dataPorodu, dataWypisu } : { terminPorodu };
  const niepoprawneDaty = Object.entries(daty).filter(([, data]) => data && !poprawnaData(data)).map(([pole]) => pole);
  const wypisZaWczesnie = !niepoprawneDaty.length && !!(dataWypisu && terminPorodu && dataWypisu < (dataPorodu || terminPorodu));
  const wynik = terminPorodu && !niepoprawneDaty.length && !wypisZaWczesnie ? kalendarz({
    terminPorodu, dataPorodu: dataPorodu || undefined, dataWypisu: dataWypisu || undefined, warunki,
  }, baza) : null;

  const aktualizuj = (nowy: Formularz) => {
    setStan(nowy);
    zapiszFormularz(profil, nowy);
  };
  const ustawDate = (pole: Daty, value: string) => aktualizuj({ ...stan, [pole]: value });
  const ustawTryb = (nowy: Tryb) => aktualizuj({ ...stan, tryb: nowy });
  const plan = czyPlanPorodu(scenariusz) ? scenariusz : zapisanyPlan;
  const pobyt = baza.zalozenia?.pobyt_w_szpitalu_dni ?? 0;
  const dzis = dzisLokalnie();

  return (
    <>
      {wynik && <Najblizsze wynik={wynik} dzis={dzis} plan={plan} parametry={parametry} zrobione={zrobione} onOtworz={setPanel} />}
      {wynik && panel && (() => {
        const s = szczegolyPozycji(t, panel, wynik, parametry, plan);
        return s && <PanelBoczny key={panel} tytul={s.tytul} onZamknij={() => setPanel(null)}>{s.tresc}</PanelBoczny>;
      })()}
      <form className={`card ${style.formularz}`} aria-labelledby="kalendarz-dane" onSubmit={e => e.preventDefault()}>
        <h2 id="kalendarz-dane">{t("Twoje dane")}</h2>
        <fieldset className={style.tryb}>
          <legend>{t("Na jakim jesteś etapie?")}</legend>
          <div className={style.tryby}>
            <button type="button" className={`btn ${urodzone ? "btn-ghost" : "btn-primary"}`} aria-pressed={!urodzone}
              onClick={() => ustawTryb("ciaza")}>{t("Jestem w ciąży")}</button>
            <button type="button" className={`btn ${urodzone ? "btn-primary" : "btn-ghost"}`} aria-pressed={urodzone}
              onClick={() => ustawTryb("urodzone")}>{t("Dziecko już się urodziło")}</button>
        </div>
        </fieldset>
        {urodzone ? (
          <div className={style.dwieDaty}>
            <DataPole label={t("Data porodu")} value={stan.dataPorodu ?? ""}
              hint={t("Terminy po porodzie przeliczą się od tej daty.")} onChange={value => ustawDate("dataPorodu", value)} />
            <DataPole label={t("Data wypisu ze szpitala")} value={stan.dataWypisu ?? ""}
              hint={t("Bez tej daty przyjmujemy wypis {dni} po porodzie.", { dni: dni(pobyt) })}
              onChange={value => ustawDate("dataWypisu", value)} />
          </div>
        ) : (
          <div className={style.glownaData}>
            <DataPole label="Planowany termin porodu" value={terminWpisany}
              hint={t(terminProfilu && stan.terminPorodu === undefined ? "Termin z profilu testowego. Możesz go zmienić." : "Znajdziesz go w karcie ciąży.")}
              onChange={value => ustawDate("terminPorodu", value)} />
          </div>
        )}
        <details open={pokazWarunki} onToggle={e => setPokazWarunki(e.currentTarget.open)}>
          <summary>{t("Czy lekarz powiedział Ci, że…?")}</summary>
          <p className="muted">{t("Zaznacz to, co Cię dotyczy, aby zobaczyć dodatkowe pozycje w kalendarzu.")}</p>
          {warunkiBazy.map(w => (
            <label className={`check ${style.warunek}`} key={w.id}>
              <input type="checkbox" checked={warunki.includes(w.id)} onChange={e => aktualizuj({
                ...stan, warunki: e.target.checked ? [...warunki, w.id] : warunki.filter(id => id !== w.id),
              })} />
              <span>{t(w.etykieta)}{w.pomoc && <small>{t(w.pomoc)}</small>}</span>
            </label>
          ))}
        </details>
        {(niepoprawneDaty.length > 0 || wypisZaWczesnie) && (
          <p id="kalendarz-blad" role="alert" className={style.blad}>
            {t(niepoprawneDaty.length ? "Sprawdź rok we wpisanej dacie."
              : dataPorodu ? "Data wypisu nie może być wcześniejsza niż data porodu."
              : "Jeśli dziecko urodziło się przed planowanym terminem, wpisz datę porodu przed datą wypisu.")}
          </p>
        )}
        <button type="button" className={`btn btn-ghost ${style.wyczysc}`}
          onClick={() => aktualizuj({ tryb, terminPorodu: "", warunki: [] })}>{t("Wyczyść formularz")}</button>
      </form>
      {wynik && <Os wynik={wynik} dzis={dzis} plan={plan} parametry={parametry}
        zrobione={zrobione} onZrobione={przelacz} onOtworz={setPanel} />}
      {!terminPorodu && <p className={style.start} role="status">{t(urodzone ? "Wpisz datę porodu, aby zobaczyć swój kalendarz." : "Wpisz termin porodu, aby zobaczyć swój kalendarz.")}</p>}
    </>
  );
}

export default function Kalendarz({ parametry }: { parametry: Parametry }) {
  const t = useT();
  const { dni } = useFormaty();
  const pobytZalozony = baza.zalozenia?.pobyt_w_szpitalu_dni ?? 0;
  const { sesja, gotowa } = useSesja();
  return (
    <div className={style.kalendarz} onClickCapture={odslon}>
      <h1>{t("Kalendarz ciąży i połogu")}</h1>
      <p className={style.wstep}>{t("Informacje są ogólne i nie zastępują wizyty u lekarza lub położnej.")}</p>
      {gotowa && <FormularzKalendarza key={sesja?.personaId ?? "gosc"} personaId={sesja?.personaId} parametry={parametry} />}
      <section className={style.ograniczenia} aria-labelledby="kalendarz-ograniczenia">
        <h2 id="kalendarz-ograniczenia">{t("Podstawa i ograniczenia")}</h2>
        <details className={style.zwijane}>
        <summary>{t("Pokaż, na czym opiera się kalendarz")}</summary>
        <ul>
          <li>{t("Wizyta położnej po wypisie ze szpitala: przepis liczy 48 godzin bez sobót, niedziel i świąt. Kalendarz liczy zwykłe dni, więc koniec tego terminu może wypaść wcześniej.")}</li>
          <li>{t("Zdanie „Gdy pominiesz termin” to ogólne wyjaśnienie, a nie zapis przepisu. Co w Twoim przypadku oznacza pominięcie badania, sprawdź u lekarza prowadzącego.")}</li>
          <li>{t("Gdy nie podasz daty wypisu, przyjmujemy {dni} pobytu w szpitalu. Przepisy nie określają tej wartości, więc wpisz prawdziwą datę wypisu, aby terminy przeliczyły się dokładnie.", { dni: dni(pobytZalozony) })}</li>
          <li>{t("Szczepienia i bilanse dziecka są według programu szczepień na 2026 i 2027 rok. Program zmienia się co roku.")}</li>
          <li>{t("Standard opieki okołoporodowej w obecnym brzmieniu obowiązuje od 7 maja 2026. Przy ciąży prowadzonej wcześniej część badań mogła być inna, na przykład różyczka, konsultacja lekarza, cytologia i test cukru między 24. a 26. tygodniem.")}</li>
          <li>{t("Test potrójny (badanie krwi między 14. a 20. tygodniem) opisujemy na podstawie opracowań. Sam standard każe poinformować o badaniach genetycznych.")}</li>
        </ul>
        </details>
      </section>
    </div>
  );
}
