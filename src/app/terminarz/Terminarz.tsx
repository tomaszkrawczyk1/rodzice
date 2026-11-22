"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataPole } from "@/components/DataPole";
import { dataPL } from "@/lib/format";
import { api, useSesja, type Sesja } from "@/lib/sesja";
import type { UbezpieczenieProfilu } from "@/lib/dane-profilu";
import { buildCalendar, toICS, ROLES, EMPLOYMENT } from "@/lib/terminarz/terminarz.js";
import type { Kategoria, Rola, Wydarzenie, Zatrudnienie } from "@/lib/terminarz/terminarz.js";
import reguly from "@/lib/terminarz/rules.json";
import drukiLinki from "@/lib/terminarz/druki-linki.json";
import drukiJson from "@/content/poradnik/druki.json";
import {
  GRUPY, MAX_DZIECI, OKNO_TERAZ_DNI, PUSTY_FORMULARZ,
  dniMiedzy, dzisISO, ileDni, kategorieZLiczbami, linkiDoDrukow, pogrupuj,
  waliduj, wczytajFormularz, wyczyscZapis, zapiszFormularz,
  type Formularz,
} from "@/lib/terminarz/widok";
import style from "./terminarz.module.css";

const etykiety = reguly.labels;
const druki = drukiJson.druki as { id: string; nazwa?: string; url_zus?: string }[];
const zapasowe = drukiLinki.druki as Record<string, { nazwa?: string; url_zus?: string }>;

function magazyn(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

type Magazyn = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Osobny zapis dla każdego profilu testowego (jak w Kalendarzu ciąży), żeby dane Anny nie trafiały do Marka. Gość: dotychczasowy klucz. */
function magazynProfilu(personaId?: string): Magazyn | undefined {
  const m = magazyn();
  if (!m || !personaId) return m;
  const k = (klucz: string) => `${klucz}:profil:${personaId}`;
  return { getItem: (x) => m.getItem(k(x)), setItem: (x, v) => m.setItem(k(x), v), removeItem: (x) => m.removeItem(k(x)) };
}

interface Scenariusze { przypadki?: { id: string; wejscie?: { tytul?: string; dataZdarzenia?: string; liczbaDzieci?: number } }[] }

const ZATRUDNIENIE_Z_PROFILU: Record<string, Zatrudnienie> = { umowa_o_prace: "umowa", zlecenie: "zlecenie", dzialalnosc: "jdg" };
const dataOk = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

/** Data porodu wpisana wcześniej w Kalendarzu ciąży (ten sam profil), żeby nie wpisywać jej drugi raz. */
function dataZKalendarza(personaId?: string): string {
  try {
    const zapis = JSON.parse(localStorage.getItem("rodzice.kalendarz") ?? "{}")?.[personaId ? `profil:${personaId}` : "gosc"];
    if (dataOk(zapis?.dataPorodu)) return zapis.dataPorodu;
    if (dataOk(zapis?.terminPorodu)) return zapis.terminPorodu;
  } catch { /* bez zapisu */ }
  return "";
}

/**
 * Podpowiedzi z profilu: data porodu (z Kalendarza ciąży, ze scenariusza profilu testowego albo z planu z kalkulatora),
 * rola (z imienia: polskie imiona żeńskie zwykle kończą się na „a"), forma zatrudnienia (z danych o ubezpieczeniu)
 * i liczba dzieci z porodu. Każde pole można potem zmienić.
 */
async function daneZProfilu(sesja: Sesja | null, dzis: string): Promise<Partial<Formularz>> {
  const wynik: Partial<Formularz> = {};
  const zKalendarza = dataZKalendarza(sesja?.personaId);
  if (zKalendarza) wynik.birthDate = zKalendarza;
  if (!sesja) {
    try {
      const plan = JSON.parse(localStorage.getItem("rodzice.plan") ?? "null")?.wejscie;
      if (plan?.tytul === "porod" && dataOk(plan.dataZdarzenia)) {
        wynik.birthDate ||= plan.dataZdarzenia;
        if (typeof plan.liczbaDzieci === "number" && plan.liczbaDzieci > 0) wynik.children = String(plan.liczbaDzieci);
      }
    } catch { /* bez planu */ }
    return wynik;
  }
  const imie = sesja.osoba.split(" ")[0] ?? "";
  wynik.role = (/a$/i.test(imie) ? "mama" : "tata") as Rola;
  const [sc, ub] = await Promise.all([
    api<Scenariusze>("/api/scenariusze").catch(() => null),
    api<{ ubezpieczenie?: UbezpieczenieProfilu[] }>(`/api/zus/ubezpieczenie?${new URLSearchParams({ pesel: sesja.pesel, naDzien: dzis })}`).catch(() => null),
  ]);
  const wejscie = sc?.przypadki?.find((p) => p.id === sesja.personaId.replace(/[ab]$/, ""))?.wejscie;
  if (wejscie?.tytul === "porod" && dataOk(wejscie.dataZdarzenia)) {
    wynik.birthDate ||= wejscie.dataZdarzenia;
    if (typeof wejscie.liczbaDzieci === "number" && wejscie.liczbaDzieci > 0) wynik.children = String(wejscie.liczbaDzieci);
  }
  const lista = ub?.ubezpieczenie ?? [];
  const biezace = lista.find((u) => u.od <= dzis && (!u.do || u.do >= dzis)) ?? lista[lista.length - 1];
  if (biezace && ZATRUDNIENIE_Z_PROFILU[biezace.tytul]) wynik.employment = ZATRUDNIENIE_Z_PROFILU[biezace.tytul];
  return wynik;
}

function Znacznik({ kind }: { kind: Wydarzenie["kind"] }) {
  return <span className={`${style.znacznik} ${style[`znacznik_${kind}`]}`}>{etykiety.kind[kind]}</span>;
}

function Karta({ z, dzis, orientacyjnie }: { z: Wydarzenie; dzis: string; orientacyjnie: boolean }) {
  const roznica = dniMiedzy(dzis, z.date);
  const wszystkieLinki = z.links;
  const klasa = z.isBirth ? style.porod : style[`karta_${z.kind}`];
  return (
    <li>
      <article className={`${style.karta} ${klasa}`} aria-labelledby={`t-${z.id}`}>
        <p className={style.data}>
          <time dateTime={z.date}>{dataPL(z.date)}</time>
          <span className={style.ile}>{ileDni(roznica)}</span>
          {orientacyjnie && <span className={style.orient}>orientacyjnie</span>}
        </p>
        <h3 id={`t-${z.id}`}>{z.title}</h3>
        <p className={style.znaczniki}>
          {z.isBirth ? <span className={`${style.znacznik} ${style.znacznik_porod}`}>Punkt odniesienia</span> : <Znacznik kind={z.kind} />}
          {!z.isBirth && <span className={style.kategoria}>{etykiety.category[z.category]}</span>}
        </p>
        <p className={style.opis}>{z.description}</p>
        {z.institution && <p className={style.meta}><b>Gdzie:</b> {z.institution}</p>}
        {z.forms.length > 0 && (
          <div className={style.meta}>
            <b>Dokumenty:</b>
            <ul>{z.forms.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        )}
        {wszystkieLinki.length > 0 && (
          <ul className={style.linki} aria-label="Linki">
            {wszystkieLinki.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.title}<span className={style.sr}> (otwiera się w nowej karcie)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {z.verify && (
          <p className={style.sprawdz}>
            <strong>Sprawdź w ZUS lub gminie.</strong> Tej zasady nie potwierdziliśmy jeszcze w źródle, więc potraktuj datę jako wskazówkę.
          </p>
        )}
        {z.sources.length > 0 && (
          <details className={style.zrodla}>
            <summary>Źródła</summary>
            <ul>{z.sources.map((s) => <li key={s}><a href={s} target="_blank" rel="noopener noreferrer">{s}<span className={style.sr}> (otwiera się w nowej karcie)</span></a></li>)}</ul>
          </details>
        )}
      </article>
    </li>
  );
}

function pobierzICS(zdarzenia: Wydarzenie[]) {
  const blob = new Blob([toICS(zdarzenia)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "terminarz.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Terminarz({ parametry }: { parametry: unknown }) {
  const { sesja, gotowa } = useSesja();
  // Czekamy na sesję, a potem montujemy widok osobno dla każdego profilu (jak w Kalendarzu ciąży).
  if (!gotowa) return <div className={style.terminarz}><h1>Terminy w urzędach</h1></div>;
  return <WidokTerminarza key={sesja?.personaId ?? "gosc"} sesja={sesja} parametry={parametry} />;
}

function WidokTerminarza({ sesja, parametry }: { sesja: Sesja | null; parametry: unknown }) {
  const [zProfilu, setZProfilu] = useState<Partial<Formularz>>({});
  const [formularz, setFormularz] = useState<Formularz>(PUSTY_FORMULARZ);
  const [wczytano, setWczytano] = useState(false);
  const [dzis, setDzis] = useState("");
  const [kategoria, setKategoria] = useState<Kategoria | "">("");
  const [odswiez, setOdswiez] = useState(0);
  const [pobrano, setPobrano] = useState(false);

  // Zapis formularza zostaje w przeglądarce (localStorage), nic nie jest wysyłane.
  // Zapis formularza zostaje w przeglądarce. Puste pola uzupełniamy danymi z profilu, a to, co już wpisano, zostaje.
  useEffect(() => {
    const dzien = dzisISO();
    setFormularz(wczytajFormularz(magazynProfilu(sesja?.personaId), ROLES, EMPLOYMENT));
    setDzis(dzien);
    setWczytano(true);
    let aktywny = true;
    daneZProfilu(sesja, dzien).then((p) => {
      if (!aktywny) return;
      setZProfilu(p);
      setFormularz((f) => ({
        birthDate: f.birthDate || p.birthDate || "",
        role: f.role || p.role || "",
        employment: f.employment || p.employment || "",
        children: f.children || p.children || "",
      }));
    }).catch(() => { /* dane można wpisać samodzielnie */ });
    return () => { aktywny = false; };
  }, [sesja]);
  useEffect(() => {
    if (wczytano) zapiszFormularz(magazynProfilu(sesja?.personaId), formularz);
  }, [formularz, wczytano, sesja?.personaId]);
  const zProfiluPola = (Object.keys(zProfilu) as (keyof Formularz)[]).filter((k) => zProfilu[k] && formularz[k] === zProfilu[k]);

  const walidacja = useMemo(() => waliduj(formularz, ROLES, EMPLOYMENT), [formularz]);

  const wynik = useMemo(() => {
    if (!walidacja.wejscie) return { zdarzenia: [] as Wydarzenie[], blad: "" };
    try {
      // Linki z reguł plus puste wzory druków z druki.json (url_zus), gdy reguła nie podaje własnego linku. Trafiają też do pliku .ics.
      const zdarzenia = buildCalendar(reguly, walidacja.wejscie, { params: parametry })
        .map((z) => ({ ...z, links: [...z.links, ...linkiDoDrukow(z.forms, z.links, druki, zapasowe)] }));
      return { zdarzenia, blad: "" };
    } catch {
      return { zdarzenia: [] as Wydarzenie[], blad: "Nie udało się policzyć terminów. Sprawdź wpisane dane." };
    }
  }, [walidacja.wejscie, parametry]);

  const zmien = (cz: Partial<Formularz>) => { setFormularz((f) => ({ ...f, ...cz })); setPobrano(false); };
  const zdarzenia = wynik.zdarzenia;
  const pokaz = !!dzis && zdarzenia.length > 0;
  const kategorie = useMemo(() => kategorieZLiczbami(zdarzenia), [zdarzenia]);
  const aktywna = kategorie.some((k) => k.kategoria === kategoria) ? kategoria : "";
  const grupy = useMemo(() => (pokaz ? pogrupuj(zdarzenia, dzis, aktywna) : null), [pokaz, zdarzenia, dzis, aktywna]);
  const porod = zdarzenia.find((z) => z.isBirth);
  const dataPorodu = porod?.date ?? formularz.birthDate;
  const planowany = pokaz && dniMiedzy(dzis, dataPorodu) > 0;
  const zaczeto = !!(formularz.birthDate || formularz.role || formularz.employment || formularz.children);
  const widocznych = grupy ? GRUPY.reduce((n, g) => n + grupy[g.id].length, 0) : 0;

  return (
    <div className={style.terminarz}>
      <h1>Terminy w urzędach</h1>
      <p className="lead">
        Pokażemy, co złożyć w ZUS, u pracodawcy, w gminie i w urzędzie stanu cywilnego, i do kiedy, z linkami do druków.
        Terminy możesz pobrać do kalendarza w telefonie. Wizyty lekarskie i badania znajdziesz w <Link href="/kalendarz">kalendarzu ciąży</Link>.
      </p>

      <form className={`card accent ${style.formularz}`} onSubmit={(e) => e.preventDefault()} noValidate aria-labelledby="tz-formularz">
        <h2 id="tz-formularz">Twoje dane</h2>
        {zProfiluPola.length > 0 && (
          <p className="alert info" role="status">
            {sesja
              ? <>Część pól wypełniliśmy za Ciebie danymi z profilu ({sesja.osoba.split(" ")[0]}).</>
              : <>Datę porodu wzięliśmy z tego, co wpisano wcześniej w tej przeglądarce.</>}
            {" "}Sprawdź je i popraw, jeśli coś się zmieniło.
          </p>
        )}
        <div className={style.pola}>
          <DataPole
            key={odswiez}
            label="Data porodu (planowana lub faktyczna)"
            hint="Przed porodem wpisz planowany termin. Po porodzie zmień na faktyczną datę, a przeliczymy wszystkie terminy."
            value={formularz.birthDate}
            onChange={(iso) => zmien({ birthDate: iso })}
          />
          <fieldset className={style.grupa}>
            <legend>Dla kogo liczymy terminy?</legend>
            <div className={style.opcje}>
              {ROLES.map((r) => (
                <label key={r} className={style.opcja}>
                  <input type="radio" name="tz-rola" value={r} checked={formularz.role === r} onChange={() => zmien({ role: r })} />
                  <span>{etykiety.who[r]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="tz-zatrudnienie">Forma zatrudnienia</label>
            <select id="tz-zatrudnienie" value={formularz.employment} onChange={(e) => zmien({ employment: e.target.value as Formularz["employment"] })}>
              <option value="">Wybierz…</option>
              {EMPLOYMENT.map((z) => <option key={z} value={z}>{etykiety.employment[z]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tz-dzieci">Liczba dzieci w rodzinie</label>
            <input
              id="tz-dzieci" type="number" inputMode="numeric" min={1} max={MAX_DZIECI} step={1}
              value={formularz.children} placeholder="np. 1"
              aria-invalid={walidacja.bladDzieci ? true : undefined}
              aria-describedby={walidacja.bladDzieci ? "tz-dzieci-podp tz-dzieci-blad" : "tz-dzieci-podp"}
              onChange={(e) => zmien({ children: e.target.value })}
            />
            <span id="tz-dzieci-podp" className="hint">Wszystkie dzieci po porodzie, razem z nowo narodzonym. Przy większej rodzinie dojdą dodatkowe terminy.</span>
            {walidacja.bladDzieci && <span id="tz-dzieci-blad" className={style.blad}>{walidacja.bladDzieci}</span>}
          </div>
        </div>
        {walidacja.bladDaty && <p className={style.blad} role="alert">{walidacja.bladDaty}</p>}
        <div className={style.akcje}>
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => { wyczyscZapis(magazynProfilu(sesja?.personaId)); setZProfilu({}); setFormularz({ ...PUSTY_FORMULARZ }); setKategoria(""); setOdswiez((n) => n + 1); setPobrano(false); }}>
            Wyczyść dane
          </button>
          <span className={style.prywatnosc}>Dane zostają w tej przeglądarce. Nie wysyłamy ich nigdzie.</span>
        </div>
      </form>

      <div className={style.uwagi}>
        <p className="alert info">
          <b>Ciąża mnoga.</b> Terminy związane z urlopami liczymy dla jednego dziecka. Przy bliźniętach i większej liczbie dzieci są orientacyjne.
          Dokładny wymiar i terminy urlopów policzy <Link href="/kalkulator">kalkulator</Link>.
        </p>
        <p className="alert info">
          <b>Sytuacje szczególne.</b> Terminarz nie obejmuje adopcji, przedwczesnego porodu, martwego urodzenia ani śmierci matki.
          W takiej sytuacji skorzystaj z <Link href="/kreator">kreatora</Link> lub sprawdź w ZUS.
        </p>
      </div>

      <section aria-labelledby="tz-wyniki" className={style.wyniki}>
        <h2 id="tz-wyniki" className={pokaz ? undefined : style.sr}>Twoje terminy</h2>

        {!pokaz && !wynik.blad && (
          <div className={`card ${style.start}`}>
            <p><b>Zacznij od daty porodu.</b></p>
            <p>
              Wpisz datę porodu, wybierz, dla kogo liczymy terminy, formę zatrudnienia i liczbę dzieci.
              {zaczeto && walidacja.brakuje.length > 0 && <> Jeszcze brakuje: {walidacja.brakuje.join(", ")}.</>}
            </p>
          </div>
        )}
        {wynik.blad && <p className="alert err" role="alert">{wynik.blad}</p>}

        {pokaz && grupy && (
          <>
            <div className={`card ${style.podsumowanie}`}>
              <p className={style.podsumowanieTytul}>
                {planowany ? "Planowany poród: " : "Poród: "}
                <time dateTime={dataPorodu}>{dataPL(dataPorodu)}</time>
                {" "}({ileDni(dniMiedzy(dzis, dataPorodu))})
              </p>
              <p className={style.meta}>Stan na dziś, {dataPL(dzis)}. Znaleźliśmy {zdarzenia.length - (porod ? 1 : 0)} {liczbaTerminow(zdarzenia.length - (porod ? 1 : 0))}.</p>
              {planowany && (
                <p className="alert warn" role="status">
                  <b>Orientacyjnie.</b> Poród jeszcze się nie odbył, więc wszystkie daty są szacunkowe. Po porodzie wpisz faktyczną datę, a przeliczymy terminy.
                </p>
              )}
              <ul className={style.legenda} aria-label="Znaczenie znaczników">
                {(["deadline", "recommended", "info"] as const).map((k) => (
                  <li key={k}><Znacznik kind={k} /> <span>{etykiety.kindHelp[k]}</span></li>
                ))}
              </ul>
              <div className={style.akcje}>
                <button type="button" className="btn btn-primary" onClick={() => { pobierzICS(zdarzenia); setPobrano(true); }}>
                  Dodaj do kalendarza (.ics)
                </button>
                <span className={style.prywatnosc}>
                  Plik zawiera wszystkie terminy, z linkami do druków. Przy terminach dodaliśmy przypomnienie z wyprzedzeniem. Nie wysyłamy powiadomień, alarmy działają tylko w kalendarzu na telefonie.
                </span>
              </div>
              {pobrano && <p className="alert ok" role="status">Pobrano plik terminarz.ics. Otwórz go na telefonie, aby dodać terminy do kalendarza.</p>}
            </div>

            {kategorie.length > 1 && (
              <div className={style.filtr} role="group" aria-label="Filtr według instytucji">
                <button type="button" className={`chip ${style.chip}`} aria-pressed={aktywna === ""} onClick={() => setKategoria("")}>Wszystkie</button>
                {kategorie.map((k) => (
                  <button key={k.kategoria} type="button" className={`chip ${style.chip}`} aria-pressed={aktywna === k.kategoria} onClick={() => setKategoria(k.kategoria)}>
                    {etykiety.category[k.kategoria]} ({k.liczba})
                  </button>
                ))}
              </div>
            )}

            {widocznych === 0 && <p className="alert info">Brak terminów w wybranej kategorii.</p>}

            {GRUPY.map((g) => {
              const lista = grupy[g.id];
              if (lista.length === 0) {
                return g.id === "teraz" ? (
                  <section key={g.id} className={style.grupaListy} aria-labelledby={`g-${g.id}`}>
                    <h2 id={`g-${g.id}`}>{g.tytul}</h2>
                    <p className={style.meta}>Nie ma terminów w najbliższych {OKNO_TERAZ_DNI} dniach.</p>
                  </section>
                ) : null;
              }
              const karty = <ol className={style.lista}>{lista.map((z) => <Karta key={z.id} z={z} dzis={dzis} orientacyjnie={planowany} />)}</ol>;
              if (g.id === "minelo") {
                return (
                  <details key={g.id} className={style.grupaListy}>
                    <summary><h2 id={`g-${g.id}`}>{g.tytul} ({lista.length})</h2></summary>
                    {karty}
                  </details>
                );
              }
              return (
                <section key={g.id} className={style.grupaListy} aria-labelledby={`g-${g.id}`}>
                  <h2 id={`g-${g.id}`}>{g.tytul} ({lista.length})</h2>
                  {karty}
                </section>
              );
            })}

            <p className={style.meta}>
              Terminarz ma charakter informacyjny i nie zastępuje porady ZUS, gminy ani prawnika. Zasady i terminy zmieniają się,
              dlatego przy ważnych sprawach sprawdź aktualne informacje w urzędzie.
              {" "}Wersja reguł: {reguly.meta.version}, stan na {dataPL(reguly.meta.asOf)}.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function liczbaTerminow(n: number) {
  if (n === 1) return "termin";
  const r = n % 10;
  return r >= 2 && r <= 4 && (n % 100 < 10 || n % 100 > 20) ? "terminy" : "terminów";
}
