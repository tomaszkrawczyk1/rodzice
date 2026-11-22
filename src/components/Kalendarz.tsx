"use client";

import { Fragment, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import dane from "../../data/kalendarz_medyczny.json";
import { dniMiedzy, type Parametry, type PlanWejscie } from "@/engine/kalkulator";
import { DataPole } from "@/components/DataPole";
import OsKalendarza from "@/components/OsKalendarza";
import { dataPL, liczba, tygodnie } from "@/lib/format";
import {
  kalendarz, najblizszeZadania, poprawnaData, terminyKalendarza,
  type BazaKalendarza, type Informacja, type KalendarzWynik, type Trymestr, type WydarzenieNaOsi,
} from "@/lib/kalendarz";
import { api, useSesja } from "@/lib/sesja";
import style from "./kalendarz.module.css";

const baza: BazaKalendarza = dane as BazaKalendarza;
const warunkiBazy = baza.warunki ?? [];
const klucz = "rodzice.kalendarz";
type Daty = "terminPorodu" | "dataPorodu" | "dataWypisu";

interface Formularz {
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
  return <time dateTime={value}>{dataPL(value)}</time>;
}

function Podsumowanie({ wynik, dzis }: { wynik: KalendarzWynik; dzis: string }) {
  const dni = dniMiedzy(wynik.dataPorodu ?? wynik.poczatekCiazy, dzis);
  const pozostalo = dniMiedzy(dzis, wynik.terminPorodu);
  const czas = `${tygodnie(Math.floor(dni / 7))} i ${dni % 7} ${dni % 7 === 1 ? "dzień" : "dni"}`;
  return (
    <section className={`card ${style.podsumowanie}`} aria-labelledby="kalendarz-podsumowanie">
      <h2 id="kalendarz-podsumowanie">
        {wynik.dataPorodu
          ? dni >= 0 ? `Dziecko ma ${czas}` : <>Wpisana data porodu to <Data value={wynik.dataPorodu} /></>
          : dni < 0 ? "Sprawdź planowany termin porodu"
          : pozostalo >= 0 ? `Ciąża trwa ${czas}`
          : "Planowany termin porodu już minął"}
      </h2>
      {!wynik.dataPorodu && dni >= 0 && pozostalo > 0 && (
        <p>Planowany termin porodu to <Data value={wynik.terminPorodu} />. Pozostało {pozostalo} {pozostalo === 1 ? "dzień" : "dni"}.</p>
      )}
      {!wynik.dataPorodu && pozostalo === 0 && <p>Planowany termin porodu wypada dziś.</p>}
      {!wynik.dataPorodu && dni < 0 && <p>Według wpisanego terminu początek ciąży wypada po dzisiejszej dacie.</p>}
      {!wynik.dataPorodu && (
        <p>Terminy po porodzie są orientacyjne. Wpisz datę porodu, aby je przeliczyć.</p>
      )}
      {wynik.uzytoZalozonegoWypisu && (
        <p>Przyjęta data wypisu to <Data value={wynik.wypis.data} />. Możesz wpisać datę wypisu ze szpitala, aby przeliczyć związane z nim terminy.</p>
      )}
    </section>
  );
}

function trwa(e: WydarzenieNaOsi, dzis: string) {
  return e.od <= dzis && dzis <= e.do;
}

const ileDni = (n: number) => `${n} ${n === 1 ? "dzień" : "dni"}`;
const ileTerminow = (n: number) =>
  `${n} ${n === 1 ? "termin" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20) ? "terminy" : "terminów"}`;

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

function Najblizsze({ wynik, dzis, plan, parametry }: {
  wynik: KalendarzWynik; dzis: string; plan?: PlanWejscie; parametry: Parametry;
}) {
  const { wniosek } = terminyKalendarza(wynik, parametry, plan);
  const zus = {
    id: ID_ZUS, nazwa: "Wniosek do ZUS o zasiłek macierzyński",
    od: wynik.dataPorodu ?? wynik.terminPorodu, do: wniosek, szacunkowe: !wynik.dataPorodu,
  };
  const zadania = najblizszeZadania([...wynik.oś, zus], dzis, 2);
  return (
    <section className={`card ${style.najblizsze}`} aria-labelledby="kalendarz-najblizsze">
      <h2 id="kalendarz-najblizsze">Najbliższe zadania dla Ciebie</h2>
      {zadania.length ? (
        <ol className={style.zadania}>
          {zadania.map(z => (
            <li key={z.id}>
              <span className={style.ile}>
                {z.trwa
                  ? z.dni === 0 ? "Ostatni dzień: dziś" : `Zostało ${ileDni(z.dni)}`
                  : z.dni === 0 ? "Zaczyna się dziś" : `Za ${ileDni(z.dni)}`}
              </span>
              <a href={z.id === ID_ZUS ? `#${ID_ZUS}` : `#kalendarz-w-${z.id}`}>{z.nazwa}</a>
              <span className={style.kiedyZadanie}>
                {z.trwa ? <>Do <Data value={z.do} /></>
                  : z.od === z.do ? <Data value={z.od} />
                  : <>Od <Data value={z.od} />, najpóźniej do <Data value={z.do} /></>}
                {z.szacunkowe && " · orientacyjnie"}
              </span>
            </li>
          ))}
        </ol>
      ) : <p>Na razie nie masz zbliżających się terminów.</p>}
      <p className={style.reszta}>Pozostałe terminy są niżej, pogrupowane według etapów. Rozwiń etap, żeby je zobaczyć.</p>
    </section>
  );
}

function Lista({ pozycje }: { pozycje: string[] }) {
  return <ul>{pozycje.map((p, i) => <li key={i}>{p}</li>)}</ul>;
}

function Czestotliwosc({ wartosc }: { wartosc?: string }) {
  if (typeof wartosc !== "string" || !wartosc.trim()) return null;
  return <span>Jak często? {wartosc.trim()}</span>;
}

function TekstZeZrodlami({ tekst }: { tekst: string }) {
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
          <span className={style.tylkoCzytnik}> (otwiera się w nowej karcie)</span>
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
  if (typeof tekst !== "string" || !tekst.trim()) return null;
  return (
    <details className={style.zrodla}>
      <summary>Źródła <span className={style.tylkoCzytnik}>pozycji „{nazwa}”</span></summary>
      <p><TekstZeZrodlami tekst={tekst} /></p>
    </details>
  );
}

function Niepotwierdzone({ wynik }: { wynik: KalendarzWynik }) {
  const lista = wynik.ostrzezenia.map(o => o.trim()).filter(o => o.includes("do potwierdzenia"));
  if (lista.length === 0) return null;
  return (
    <div className={style.ostrzezenie} role="status">
      {lista.map(o => <p key={o}>{o}</p>)}
    </div>
  );
}

function Karta({ wydarzenie: e, dzis, poczatek }: { wydarzenie: WydarzenieNaOsi; dzis: string; poczatek: string }) {
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
      <h3>{e.nazwa}</h3>
      {odznaki.length > 0 && (
        <div className={style.odznaki}>
          {odznaki.map(nazwa => (
            <span key={nazwa} className={nazwa === "Teraz" || nazwa === "Dotyczy Twojej sytuacji" ? "badge ok" : "badge sim"}>{nazwa}</span>
          ))}
        </div>
      )}
      <p className={style.daty}>
        <strong>
          {e.od === e.do ? <Data value={e.od} />
            : e.od === poczatek ? <>Do <Data value={e.do} /></>
            : <><Data value={e.od} /> – <Data value={e.do} /></>}
        </strong>
        {e.kiedy && <span>{e.kiedy}</span>}
        {e.najpozniej && <span>Najpóźniej <Data value={e.najpozniej} /></span>}
        <Czestotliwosc wartosc={e.czestotliwosc} />
      </p>
      {e.opis && <p>{e.opis}</p>}
      {e.skutek && (
        <p className={style.skutek}>
          <strong>Gdy pominiesz termin</strong>
          {e.skutek}
          <span className={style.porada}>Sprawdź u lekarza prowadzącego, co to oznacza w Twoim przypadku.</span>
        </p>
      )}
      {(!!e.pozycje?.length || !!e.uwagi?.length) && (
        <details>
          <summary>Szczegóły <span className={style.tylkoCzytnik}>pozycji „{e.nazwa}”</span></summary>
          {!!e.pozycje?.length && <><h4>Co obejmuje</h4><Lista pozycje={e.pozycje} /></>}
          {!!e.uwagi?.length && <><h4>Warto wiedzieć</h4><Lista pozycje={e.uwagi} /></>}
        </details>
      )}
      <Zrodla tekst={e.zrodlo} nazwa={e.nazwa} />
    </article>
  );
}

function Informacje({ informacje }: { informacje: Informacja[] }) {
  return informacje.map(i => (
    <article className={`card ${style.informacja}`} key={i.id}>
      <h3>{i.temat}</h3>
      <Lista pozycje={i.tresc} />
      <Zrodla tekst={i.zrodlo} nazwa={i.temat} />
    </article>
  ));
}

function Zus({ wynik, plan, parametry }: { wynik: KalendarzWynik; plan?: PlanWejscie; parametry: Parametry }) {
  const { wniosek, doPracodawcy } = terminyKalendarza(wynik, parametry, plan);
  const procent = liczba(parametry.procenty.wariant_pelny_wymiar_81_5);
  const terminy = parametry.terminy_dni;
  return (
    <section id="kalendarz-zus" className={`card ${style.zus}`} aria-labelledby="kalendarz-zus-tytul">
      <h2 id="kalendarz-zus-tytul">W ZUS</h2>
      <h3>Wniosek o zasiłek macierzyński w wariancie {procent}%</h3>
      <p><strong>Do <Data value={wniosek} /></strong></p>
      <p>{wynik.dataPorodu ? "Termin liczony od wpisanej daty porodu." : "Termin orientacyjny. Liczymy od planowanego terminu porodu."}</p>
      <h3>Wnioski o urlop do pracodawcy</h3>
      {doPracodawcy.length > 0 ? (
        <ul>
          {doPracodawcy.map((t, i) => (
            <li key={i}>
              {t.co.replace(/\d{4}-\d{2}-\d{2}/g, dataPL)}. Złóż do <Data value={t.do!} />.
            </li>
          ))}
        </ul>
      ) : (
        <ul>
          <li>Wniosek o urlop rodzicielski złóż {terminy.wniosek_urlop_rodzicielski_przed_startem} dni przed rozpoczęciem urlopu.</li>
          <li>Wniosek o urlop ojcowski złóż {terminy.wniosek_urlop_ojcowski_przed_startem} dni przed rozpoczęciem urlopu.</li>
        </ul>
      )}
      <Link href="/sprawa/urlop-pracodawca">Sprawdź termin dla wybranej daty urlopu</Link>
    </section>
  );
}

function Os({ wynik, dzis, plan, parametry }: {
  wynik: KalendarzWynik; dzis: string; plan?: PlanWejscie; parametry: Parametry;
}) {
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
        <h2 id="kalendarz-teraz">Teraz warto zrobić</h2>
        {teraz.length ? (
          <details>
            <summary>Pokaż wszystko, co trwa teraz ({ileTerminow(teraz.length)})</summary>
            <ul>
              {teraz.map(e => (
                <li key={e.id}>
                  <a href={`#kalendarz-w-${e.id}`}>{e.nazwa}</a>
                  <div>Do <Data value={e.do} />{e.szacunkowe && " · orientacyjnie"}</div>
                </li>
              ))}
            </ul>
          </details>
        ) : <p>Na dziś w kalendarzu nie ma zaplanowanych wizyt ani badań.</p>}
      </section>
      <OsKalendarza wynik={wynik} dzis={dzis} plan={plan} parametry={parametry} />
      <nav aria-label="Etapy kalendarza">
        <ul className={style.nawigacja}>
          {etapy.map(e => (
            <Fragment key={e.trymestr}>
              <li><a href={`#kalendarz-etap-${e.trymestr}`}>{e.nazwa}</a></li>
              {e.trymestr === "polog" && <li><a className={style.linkZus} href="#kalendarz-zus">W ZUS</a></li>}
            </Fragment>
          ))}
          {!zusPrzyPologu && <li><a className={style.linkZus} href="#kalendarz-zus">W ZUS</a></li>}
        </ul>
      </nav>
      {etapy.map(e => (
        <Fragment key={e.trymestr}>
          <section className={style.etap} aria-labelledby={`kalendarz-etap-${e.trymestr}`}>
            <h2 id={`kalendarz-etap-${e.trymestr}`}>
              {e.nazwa}
              {e.trymestr === aktywny && <span className={`badge ok ${style.etapTeraz}`}>Teraz</span>}
            </h2>
            {e.opis && <p className={style.opisEtapu}>{e.opis}</p>}
            <details className={style.zwijane} open={e.trymestr === aktywny}>
              <summary>Terminy na tym etapie ({ileTerminow(e.wydarzenia.length)})</summary>
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
          <h2 id="kalendarz-sytuacje">Twoja sytuacja</h2>
          <Informacje informacje={sytuacje} />
        </section>
      )}
      {!!ogolne.length && (
        <section className={style.etap} aria-labelledby="kalendarz-informacje">
          <h2 id="kalendarz-informacje">Warto wiedzieć</h2>
          <Informacje informacje={ogolne} />
        </section>
      )}
    </>
  );
}

function FormularzKalendarza({ personaId, parametry }: { personaId?: string; parametry: Parametry }) {
  const profil = personaId ? `profil:${personaId}` : "gosc";
  const [stan, setStan] = useState<Formularz | null>(null);
  const [pokazPorod, setPokazPorod] = useState(false);
  const [pokazWarunki, setPokazWarunki] = useState(false);
  const [scenariusz, setScenariusz] = useState<Partial<PlanWejscie>>();
  const [zapisanyPlan, setZapisanyPlan] = useState<PlanWejscie>();

  useEffect(() => {
    const zapis = odczytajFormularz(profil);
    setStan(zapis);
    setPokazPorod(!!(zapis.dataPorodu || zapis.dataWypisu));
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
  const terminPorodu = stan.terminPorodu ?? terminProfilu;
  const { dataPorodu, dataWypisu, warunki } = stan;
  const daty = { terminPorodu, dataPorodu, dataWypisu };
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
  const plan = czyPlanPorodu(scenariusz) ? scenariusz : zapisanyPlan;
  const pobyt = baza.zalozenia?.pobyt_w_szpitalu_dni ?? 0;
  const dzis = dzisLokalnie();

  return (
    <>
      {wynik && <Najblizsze wynik={wynik} dzis={dzis} plan={plan} parametry={parametry} />}
      <form className={`card ${style.formularz}`} aria-labelledby="kalendarz-dane" onSubmit={e => e.preventDefault()}>
        <h2 id="kalendarz-dane">Twoje dane</h2>
        <div className={style.glownaData}>
          <DataPole label="Planowany termin porodu" value={terminPorodu}
            hint={terminProfilu && stan.terminPorodu === undefined ? "Termin z profilu testowego. Możesz go zmienić." : "Znajdziesz go w karcie ciąży."}
            onChange={value => ustawDate("terminPorodu", value)} />
        </div>
        <details open={pokazPorod} onToggle={e => setPokazPorod(e.currentTarget.open)}>
          <summary>Dziecko już się urodziło?</summary>
          <div className={style.dwieDaty}>
            <DataPole label="Data porodu" value={dataPorodu ?? ""}
              hint="Terminy po porodzie przeliczą się od tej daty." onChange={value => ustawDate("dataPorodu", value)} />
            <DataPole label="Data wypisu ze szpitala" value={dataWypisu ?? ""}
              hint={`Bez tej daty przyjmujemy wypis ${pobyt} ${pobyt === 1 ? "dzień" : "dni"} po porodzie.`}
              onChange={value => ustawDate("dataWypisu", value)} />
          </div>
        </details>
        <details open={pokazWarunki} onToggle={e => setPokazWarunki(e.currentTarget.open)}>
          <summary>Czy lekarz powiedział Ci, że…?</summary>
          <p className="muted">Zaznacz to, co Cię dotyczy, aby zobaczyć dodatkowe pozycje w kalendarzu.</p>
          {warunkiBazy.map(w => (
            <label className={`check ${style.warunek}`} key={w.id}>
              <input type="checkbox" checked={warunki.includes(w.id)} onChange={e => aktualizuj({
                ...stan, warunki: e.target.checked ? [...warunki, w.id] : warunki.filter(id => id !== w.id),
              })} />
              <span>{w.etykieta}{w.pomoc && <small>{w.pomoc}</small>}</span>
            </label>
          ))}
        </details>
        {(niepoprawneDaty.length > 0 || wypisZaWczesnie) && (
          <p id="kalendarz-blad" role="alert" className={style.blad}>
            {niepoprawneDaty.length ? "Sprawdź rok we wpisanej dacie."
              : dataPorodu ? "Data wypisu nie może być wcześniejsza niż data porodu."
              : "Jeśli dziecko urodziło się przed planowanym terminem, wpisz datę porodu przed datą wypisu."}
          </p>
        )}
        <button type="button" className={`btn btn-ghost ${style.wyczysc}`}
          onClick={() => aktualizuj({ terminPorodu: "", warunki: [] })}>Wyczyść formularz</button>
      </form>
      {wynik && <Os wynik={wynik} dzis={dzis} plan={plan} parametry={parametry} />}
      {!terminPorodu && <p className={style.start} role="status">Wpisz termin porodu, aby zobaczyć swój kalendarz.</p>}
    </>
  );
}

export default function Kalendarz({ parametry }: { parametry: Parametry }) {
  const pobytZalozony = baza.zalozenia?.pobyt_w_szpitalu_dni ?? 0;
  const { sesja, gotowa } = useSesja();
  return (
    <div className={style.kalendarz} onClickCapture={odslon}>
      <h1>Kalendarz ciąży i połogu</h1>
      <p className={style.wstep}>Informacje są ogólne i nie zastępują wizyty u lekarza lub położnej.</p>
      {gotowa && <FormularzKalendarza key={sesja?.personaId ?? "gosc"} personaId={sesja?.personaId} parametry={parametry} />}
      <section className={style.ograniczenia} aria-labelledby="kalendarz-ograniczenia">
        <h2 id="kalendarz-ograniczenia">Podstawa i ograniczenia</h2>
        <details className={style.zwijane}>
        <summary>Pokaż, na czym opiera się kalendarz</summary>
        <ul>
          <li>Wizyta położnej po wypisie ze szpitala: przepis liczy 48 godzin bez sobót, niedziel i świąt. Kalendarz liczy zwykłe dni, więc koniec tego terminu może wypaść wcześniej.</li>
          <li>Zdanie „Gdy pominiesz termin” to ogólne wyjaśnienie, a nie zapis przepisu. Co w Twoim przypadku oznacza pominięcie badania, sprawdź u lekarza prowadzącego.</li>
          <li>Gdy nie podasz daty wypisu, przyjmujemy {pobytZalozony} {pobytZalozony === 1 ? "dzień" : "dni"} pobytu w szpitalu. Przepisy nie określają tej wartości, więc wpisz prawdziwą datę wypisu, aby terminy przeliczyły się dokładnie.</li>
          <li>Szczepienia i bilanse dziecka są według programu szczepień na 2026 i 2027 rok. Program zmienia się co roku.</li>
          <li>Standard opieki okołoporodowej w obecnym brzmieniu obowiązuje od 7 maja 2026. Przy ciąży prowadzonej wcześniej część badań mogła być inna, na przykład różyczka, konsultacja lekarza, cytologia i test cukru między 24. a 26. tygodniem.</li>
          <li>Test potrójny (badanie krwi między 14. a 20. tygodniem) opisujemy na podstawie opracowań. Sam standard każe poinformować o badaniach genetycznych.</li>
        </ul>
        </details>
      </section>
    </div>
  );
}
