"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import dane from "../../data/kalendarz_medyczny.json";
import { dniMiedzy, type Parametry, type PlanWejscie } from "@/engine/kalkulator";
import { dataPL, liczba, tygodnie } from "@/lib/format";
import {
  kalendarz, poprawnaData, terminyKalendarza,
  type BazaKalendarza, type Informacja, type KalendarzWynik, type WydarzenieNaOsi,
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

function Medyczna() {
  return <span className={`badge warn ${style.odznaka}`}>opracowanie medyczne - w trakcie weryfikacji</span>;
}

function Data({ value }: { value: string }) {
  return <time dateTime={value}>{dataPL(value)}</time>;
}

function PoleDaty({ id, etykieta, wartosc, pomoc, zmien, blad = false }: {
  id: string;
  etykieta: string;
  wartosc: string;
  pomoc: string;
  zmien: (value: string) => void;
  blad?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{etykieta}</label>
      <input id={id} type="date" min="0101-01-01" max="9998-12-31" value={wartosc} autoComplete="off"
        aria-describedby={`${id}-pomoc${blad ? " kalendarz-blad" : ""}`}
        aria-invalid={blad || undefined} onChange={e => zmien(e.target.value)} />
      <small id={`${id}-pomoc`}>{pomoc}</small>
    </div>
  );
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
      <Medyczna />
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

function Lista({ pozycje }: { pozycje: string[] }) {
  return <ul>{pozycje.map((p, i) => <li key={i}>{p}</li>)}</ul>;
}

function Karta({ wydarzenie: e, dzis, poczatek }: { wydarzenie: WydarzenieNaOsi; dzis: string; poczatek: string }) {
  const teraz = trwa(e, dzis);
  return (
    <article id={`kalendarz-w-${e.id}`} tabIndex={-1} className={`card ${style.wydarzenie} ${teraz ? style.trwa : ""}`}>
      <h3>{e.nazwa}</h3>
      <div className={style.odznaki}>
        <Medyczna />
        {teraz && <span className="badge ok">Teraz</span>}
        {e.do < dzis && <span className="badge sim">Termin minął</span>}
        {e.szacunkowe && <span className="badge sim">Orientacyjnie</span>}
        {e.typ === "warunkowe" && <span className="badge ok">Dotyczy Twojej sytuacji</span>}
        {e.dla && <span className="badge sim">{e.dla === "matka" ? "Dla mamy" : "Dla dziecka"}</span>}
      </div>
      <p className={style.daty}>
        <strong>
          {e.od === e.do ? <Data value={e.od} />
            : e.od === poczatek ? <>Do <Data value={e.do} /></>
            : <><Data value={e.od} /> – <Data value={e.do} /></>}
        </strong>
        {e.kiedy && <span>{e.kiedy}</span>}
        {e.najpozniej && <span>Najpóźniej <Data value={e.najpozniej} /></span>}
        {e.czestotliwosc && <span>Jak często? {e.czestotliwosc}</span>}
      </p>
      {e.opis && <p>{e.opis}</p>}
      {e.skutek && <p className={style.skutek}><strong>Gdy pominiesz termin</strong>{e.skutek}</p>}
      {(!!e.pozycje?.length || !!e.uwagi?.length) && (
        <details>
          <summary>Szczegóły <span className={style.tylkoCzytnik}>pozycji „{e.nazwa}”</span></summary>
          {!!e.pozycje?.length && <><h4>Co obejmuje</h4><Lista pozycje={e.pozycje} /></>}
          {!!e.uwagi?.length && <><h4>Warto wiedzieć</h4><Lista pozycje={e.uwagi} /></>}
        </details>
      )}
    </article>
  );
}

function Informacje({ informacje }: { informacje: Informacja[] }) {
  return informacje.map(i => (
    <article className={`card ${style.informacja}`} key={i.id}>
      <h3>{i.temat}</h3>
      <Medyczna />
      <Lista pozycje={i.tresc} />
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
  return (
    <>
      <Podsumowanie wynik={wynik} dzis={dzis} />
      <section className={`card ${style.teraz}`} aria-labelledby="kalendarz-teraz">
        <h2 id="kalendarz-teraz">Teraz warto zrobić</h2>
        {teraz.length ? (
          <ul>
            {teraz.map(e => (
              <li key={e.id}>
                <a href={`#kalendarz-w-${e.id}`}>{e.nazwa}</a>
                <div>Do <Data value={e.do} />{e.szacunkowe && " · orientacyjnie"}</div>
                <Medyczna />
              </li>
            ))}
          </ul>
        ) : <p>Na dziś w kalendarzu nie ma zaplanowanych wizyt ani badań.</p>}
      </section>
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
            <h2 id={`kalendarz-etap-${e.trymestr}`}>{e.nazwa}</h2>
            {e.opis && <p className={style.opisEtapu}>{e.opis} <Medyczna /></p>}
            {e.wydarzenia.map(w => <Karta key={w.id} wydarzenie={w} dzis={dzis} poczatek={wynik.poczatekCiazy} />)}
            <Informacje informacje={wynik.informacje.filter(i => i.rodzaj !== "sytuacja_szczegolna" && i.trymestr === e.trymestr)} />
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

  return (
    <>
      <form className={`card ${style.formularz}`} aria-labelledby="kalendarz-dane" onSubmit={e => e.preventDefault()}>
        <h2 id="kalendarz-dane">Twoje dane</h2>
        <div className={style.glownaData}>
          <PoleDaty id="kalendarz-termin" etykieta="Planowany termin porodu" wartosc={terminPorodu}
            pomoc={terminProfilu && stan.terminPorodu === undefined ? "Termin z profilu testowego. Możesz go zmienić." : "Znajdziesz go w karcie ciąży."}
            zmien={value => ustawDate("terminPorodu", value)} blad={niepoprawneDaty.includes("terminPorodu")} />
        </div>
        <details open={pokazPorod} onToggle={e => setPokazPorod(e.currentTarget.open)}>
          <summary>Dziecko już się urodziło?</summary>
          <div className={style.dwieDaty}>
            <PoleDaty id="kalendarz-porod" etykieta="Data porodu" wartosc={dataPorodu ?? ""}
              pomoc="Terminy po porodzie przeliczą się od tej daty." zmien={value => ustawDate("dataPorodu", value)}
              blad={niepoprawneDaty.includes("dataPorodu")} />
            <PoleDaty id="kalendarz-wypis" etykieta="Data wypisu ze szpitala" wartosc={dataWypisu ?? ""}
              pomoc={`Bez tej daty przyjmujemy wypis ${pobyt} ${pobyt === 1 ? "dzień" : "dni"} po porodzie.`}
              zmien={value => ustawDate("dataWypisu", value)} blad={wypisZaWczesnie || niepoprawneDaty.includes("dataWypisu")} />
          </div>
          <Medyczna />
        </details>
        <details open={pokazWarunki} onToggle={e => setPokazWarunki(e.currentTarget.open)}>
          <summary>Czy lekarz powiedział Ci, że…?</summary>
          <p className="muted">Zaznacz to, co Cię dotyczy, aby zobaczyć dodatkowe pozycje w kalendarzu.</p>
          {warunkiBazy.map(w => (
            <label className={`check ${style.warunek}`} key={w.id}>
              <input type="checkbox" checked={warunki.includes(w.id)} onChange={e => aktualizuj({
                ...stan, warunki: e.target.checked ? [...warunki, w.id] : warunki.filter(id => id !== w.id),
              })} />
              <span>{w.etykieta}{w.pomoc && <small>{w.pomoc}</small>}<Medyczna /></span>
            </label>
          ))}
        </details>
        {(niepoprawneDaty.length > 0 || wypisZaWczesnie) && (
          <p id="kalendarz-blad" role="alert" className={style.blad}>
            {niepoprawneDaty.length ? "Sprawdź rok w zaznaczonej dacie."
              : dataPorodu ? "Data wypisu nie może być wcześniejsza niż data porodu."
              : "Jeśli dziecko urodziło się przed planowanym terminem, wpisz datę porodu przed datą wypisu."}
          </p>
        )}
        <button type="button" className={`btn btn-ghost ${style.wyczysc}`}
          onClick={() => aktualizuj({ terminPorodu: "", warunki: [] })}>Wyczyść formularz</button>
      </form>
      {wynik && <Os wynik={wynik} dzis={dzisLokalnie()} plan={plan} parametry={parametry} />}
      {!terminPorodu && <p className={style.start} role="status">Wpisz termin porodu, aby zobaczyć swój kalendarz.</p>}
    </>
  );
}

export default function Kalendarz({ parametry }: { parametry: Parametry }) {
  const { sesja, gotowa } = useSesja();
  return (
    <div className={style.kalendarz}>
      <h1>Kalendarz ciąży i połogu</h1>
      <p className={style.wstep}>Informacje są ogólne i nie zastępują wizyty u lekarza lub położnej.</p>
      {gotowa && <FormularzKalendarza key={sesja?.personaId ?? "gosc"} personaId={sesja?.personaId} parametry={parametry} />}
    </div>
  );
}
