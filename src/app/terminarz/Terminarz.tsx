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
import { lokalizujReguly } from "@/lib/terminarz/lokalizacja";
import drukiLinki from "@/lib/terminarz/druki-linki.json";
import drukiJson from "@/content/poradnik/druki.json";
import {
  MAX_DZIECI, PUSTY_FORMULARZ,
  dniMiedzy, dzisISO, ileDni, kategorieZLiczbami, linkiDoDrukow,
  waliduj, wczytajFormularz, wyczyscZapis, zapiszFormularz,
  type Formularz,
} from "@/lib/terminarz/widok";
import PanelBoczny from "@/components/PanelBoczny";
import { useZrobione } from "@/lib/zrobione";
import OsTerminarza, { Czas, Znacznik } from "./OsTerminarza";
import style from "./terminarz.module.css";
import { useFormaty, useJezyk, useT } from "@/lib/jezyk";
import { pogrubienia } from "@/i18n/bogaty";

const etykiety = reguly.labels;

/** Odmiana słowa „termin" po liczbie (pl i uk: 1 / 2–4 / reszta, en: 1 / reszta). */
const TERMIN = {
  pl: ["termin", "terminy", "terminów"],
  en: ["date", "dates", "dates"],
  uk: ["термін", "терміни", "термінів"],
} as const;
function liczbaTerminow(jezyk: "pl" | "en" | "uk", n: number) {
  const [jeden, kilka, wiele] = TERMIN[jezyk];
  const m10 = n % 10, m100 = n % 100;
  if (jezyk === "en") return n === 1 ? jeden : wiele;
  if (n === 1 || (jezyk === "uk" && m10 === 1 && m100 !== 11)) return jeden;
  return m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 > 20) ? kilka : wiele;
}
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

/** Pełna instrukcja pozycji: treść panelu z boku (dokumenty, linki do druków, źródła). */
function Szczegoly({ z, dzis, orientacyjnie }: { z: Wydarzenie; dzis: string; orientacyjnie: boolean }) {
  const t = useT();
  const wszystkieLinki = z.links;
  return (
    <>
      <div>
        <Czas z={z} dzis={dzis} orientacyjnie={orientacyjnie} />
        <p className={style.znaczniki}>
          {z.isBirth ? <span className={`${style.znacznik} ${style.znacznik_porod}`}>{t("Punkt odniesienia")}</span> : <Znacznik kind={z.kind} />}
          {!z.isBirth && <span className={style.kategoria}>{t(etykiety.category[z.category])}</span>}
        </p>
        <p className={style.opis}>{z.description}</p>
        {z.institution && <p className={style.meta}><b>{t("Gdzie:")}</b> {z.institution}</p>}
        {z.forms.length > 0 && (
          <div className={style.meta}>
            <b>{t("Dokumenty:")}</b>
            <ul>{z.forms.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        )}
        {wszystkieLinki.length > 0 && (
          <ul className={style.linki} aria-label={t("Linki")}>
            {wszystkieLinki.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.title}<span className={style.sr}> ({t("otwiera się w nowej karcie")})</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {z.verify && (
          <p className={style.sprawdz}>
            <strong>{t("Sprawdź w ZUS lub gminie.")}</strong> {t("Tej zasady nie potwierdziliśmy jeszcze w źródle, więc potraktuj datę jako wskazówkę.")}
          </p>
        )}
        {z.sources.length > 0 && (
          <details className={style.zrodla}>
            <summary>{t("Źródła")}</summary>
            <ul>{z.sources.map((s) => <li key={s}><a href={s} target="_blank" rel="noopener noreferrer">{s}<span className={style.sr}> ({t("otwiera się w nowej karcie")})</span></a></li>)}</ul>
          </details>
        )}
      </div>
    </>
  );
}

function pobierzICS(zdarzenia: Wydarzenie[], labels: { where: string; documents: string; verify: string }) {
  const blob = new Blob([toICS(zdarzenia, { labels })], { type: "text/calendar;charset=utf-8" });
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
  const t = useT();
  const { sesja, gotowa } = useSesja();
  // Czekamy na sesję, a potem montujemy widok osobno dla każdego profilu (jak w Kalendarzu ciąży).
  if (!gotowa) return <div className={style.terminarz}><h1>{t("Kalendarz w urzędzie")}</h1></div>;
  return <WidokTerminarza key={sesja?.personaId ?? "gosc"} sesja={sesja} parametry={parametry} />;
}

function WidokTerminarza({ sesja, parametry }: { sesja: Sesja | null; parametry: unknown }) {
  const { dni } = useFormaty();
  const t = useT();
  const { jezyk } = useJezyk();
  const [zProfilu, setZProfilu] = useState<Partial<Formularz>>({});
  const [formularz, setFormularz] = useState<Formularz>(PUSTY_FORMULARZ);
  const [wczytano, setWczytano] = useState(false);
  const [dzis, setDzis] = useState("");
  const [kategoria, setKategoria] = useState<Kategoria | "">("");
  const [odswiez, setOdswiez] = useState(0);
  const [pobrano, setPobrano] = useState(false);
  // „Zrobione” przy terminach: osobny zapis dla każdego profilu, tylko w przeglądarce.
  const { zrobione, przelacz } = useZrobione(`rodzice.terminarz.zrobione:${sesja?.personaId ?? "gosc"}`);
  const [otwarte, setOtwarte] = useState<string | null>(null);

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

  const regulyJezyka = useMemo(() => lokalizujReguly(reguly, t), [t]);
  const ileDniNaglowek = (n: number) => n === 0 ? t("dziś") : n === 1 ? t("jutro") : n === -1 ? t("wczoraj") : n > 0 ? t("za {dni}", { dni: dni(n) }) : t("{dni} temu", { dni: dni(-n) });
  const walidacja = useMemo(() => waliduj(formularz, ROLES, EMPLOYMENT), [formularz]);

  const wynik = useMemo(() => {
    if (!walidacja.wejscie) return { zdarzenia: [] as Wydarzenie[], blad: "" };
    try {
      // Linki z reguł plus puste wzory druków z druki.json (url_zus), gdy reguła nie podaje własnego linku. Trafiają też do pliku .ics.
      const zdarzenia = buildCalendar(regulyJezyka, walidacja.wejscie, { params: parametry, formatDate: (d: Date) => dataPL(d.toISOString().slice(0, 10)) })
        .map((z) => ({ ...z, links: [...z.links, ...linkiDoDrukow(z.forms, z.links, druki, zapasowe).map((l) => ({ ...l, title: t(l.title) }))] }));
      return { zdarzenia, blad: "" };
    } catch {
      return { zdarzenia: [] as Wydarzenie[], blad: t("Nie udało się policzyć terminów. Sprawdź wpisane dane.") };
    }
  }, [walidacja.wejscie, parametry, regulyJezyka, dataPL, t]);

  const zmien = (cz: Partial<Formularz>) => { setFormularz((f) => ({ ...f, ...cz })); setPobrano(false); };
  const zdarzenia = wynik.zdarzenia;
  const pokaz = !!dzis && zdarzenia.length > 0;
  const kategorie = useMemo(() => kategorieZLiczbami(zdarzenia), [zdarzenia]);
  const aktywna = kategorie.some((k) => k.kategoria === kategoria) ? kategoria : "";
  // Filtr instytucji zostawia wszystkie terminy tej instytucji i zawsze punkt „poród”.
  const naOsi = useMemo(() => zdarzenia.filter((z) => z.isBirth || !aktywna || z.category === aktywna), [zdarzenia, aktywna]);
  const porod = zdarzenia.find((z) => z.isBirth);
  const dataPorodu = porod?.date ?? formularz.birthDate;
  const planowany = pokaz && dniMiedzy(dzis, dataPorodu) > 0;
  const zaczeto = !!(formularz.birthDate || formularz.role || formularz.employment || formularz.children);
  const otwartyTermin = otwarte ? zdarzenia.find((z) => z.id === otwarte) : undefined;

  return (
    <div className={style.terminarz}>
      <h1>{t("Kalendarz w urzędzie")}</h1>
      <p className="lead">
        {t("Pokażemy, co złożyć w ZUS, u pracodawcy, w gminie i w urzędzie stanu cywilnego, i do kiedy, z linkami do druków.")}{" "}
        {t("Terminy możesz pobrać do kalendarza w telefonie. Wizyty lekarskie i badania znajdziesz w")} <Link href="/kalendarz">{t("kalendarzu ciąży")}</Link>.
      </p>

      <form className={`card accent ${style.formularz}`} onSubmit={(e) => e.preventDefault()} noValidate aria-labelledby="tz-formularz">
        <h2 id="tz-formularz">{t("Twoje dane")}</h2>
        {zProfiluPola.length > 0 && (
          <p className="alert info" role="status">
            {sesja
              ? t("Część pól wypełniliśmy za Ciebie danymi z profilu ({imie}).", { imie: sesja.osoba.split(" ")[0] })
              : t("Datę porodu wzięliśmy z tego, co wpisano wcześniej w tej przeglądarce.")}
            {" "}{t("Sprawdź je i popraw, jeśli coś się zmieniło.")}
          </p>
        )}
        <div className={style.pola}>
          <DataPole
            key={odswiez}
            label={t("Data porodu (planowana lub faktyczna)")}
            hint={t("Przed porodem wpisz planowany termin. Po porodzie zmień na faktyczną datę, a przeliczymy wszystkie terminy.")}
            value={formularz.birthDate}
            onChange={(iso) => zmien({ birthDate: iso })}
          />
          <fieldset className={style.grupa}>
            <legend>{t("Dla kogo liczymy terminy?")}</legend>
            <div className={style.opcje}>
              {ROLES.map((r) => (
                <label key={r} className={style.opcja}>
                  <input type="radio" name="tz-rola" value={r} checked={formularz.role === r} onChange={() => zmien({ role: r })} />
                  <span>{t(etykiety.who[r])}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="tz-zatrudnienie">{t("Forma zatrudnienia")}</label>
            <select id="tz-zatrudnienie" value={formularz.employment} onChange={(e) => zmien({ employment: e.target.value as Formularz["employment"] })}>
              <option value="">{t("Wybierz…")}</option>
              {EMPLOYMENT.map((z) => <option key={z} value={z}>{t(etykiety.employment[z])}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tz-dzieci">{t("Liczba dzieci w rodzinie")}</label>
            <input
              id="tz-dzieci" type="number" inputMode="numeric" min={1} max={MAX_DZIECI} step={1}
              value={formularz.children} placeholder={t("np. 1")}
              aria-invalid={walidacja.bladDzieci ? true : undefined}
              aria-describedby={walidacja.bladDzieci ? "tz-dzieci-podp tz-dzieci-blad" : "tz-dzieci-podp"}
              onChange={(e) => zmien({ children: e.target.value })}
            />
            <span id="tz-dzieci-podp" className="hint">{t("Wszystkie dzieci po porodzie, razem z nowo narodzonym. Przy większej rodzinie dojdą dodatkowe terminy.")}</span>
            {walidacja.bladDzieci && <span id="tz-dzieci-blad" className={style.blad}>{t(walidacja.bladDzieci)}</span>}
          </div>
        </div>
        {walidacja.bladDaty && <p className={style.blad} role="alert">{t(walidacja.bladDaty)}</p>}
        <div className={style.akcje}>
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => { wyczyscZapis(magazynProfilu(sesja?.personaId)); setZProfilu({}); setFormularz({ ...PUSTY_FORMULARZ }); setKategoria(""); setOdswiez((n) => n + 1); setPobrano(false); }}>
            {t("Wyczyść dane")}
          </button>
          <span className={style.prywatnosc}>Dane zostają w tej przeglądarce. Nie wysyłamy ich nigdzie.</span>
        </div>
      </form>

      <div className={style.uwagi}>
        <p className="alert info">
          {pogrubienia(t("**Ciąża mnoga.** Terminy związane z urlopami liczymy dla jednego dziecka. Przy bliźniętach i większej liczbie dzieci są orientacyjne. Dokładny wymiar i terminy urlopów policzy [kalkulator](/kalkulator)."))}
        </p>
        <p className="alert info">
          {pogrubienia(t("**Sytuacje szczególne.** Kalendarz w urzędzie nie obejmuje adopcji, przedwczesnego porodu, martwego urodzenia ani śmierci matki. W takiej sytuacji skorzystaj z [kreatora](/kreator) lub sprawdź w ZUS."))}
        </p>
      </div>

      <section aria-labelledby="tz-wyniki" className={style.wyniki}>
        <h2 id="tz-wyniki" className={pokaz ? undefined : style.sr}>{t("Twoje terminy")}</h2>

        {!pokaz && !wynik.blad && (
          <div className={`card ${style.start}`}>
            <p><b>{t("Zacznij od daty porodu.")}</b></p>
            <p>
              {t("Wpisz datę porodu, wybierz, dla kogo liczymy terminy, formę zatrudnienia i liczbę dzieci.")}
              {zaczeto && walidacja.brakuje.length > 0 && <> {t("Jeszcze brakuje: {lista}.", { lista: walidacja.brakuje.map((b) => t(b)).join(", ") })}</>}
            </p>
          </div>
        )}
        {wynik.blad && <p className="alert err" role="alert">{wynik.blad}</p>}

        {pokaz && (
          <>
            <div className={`card ${style.podsumowanie}`}>
              <p className={style.podsumowanieTytul}>
                {planowany ? t("Planowany poród:") : t("Poród:")}{" "}
                <time dateTime={dataPorodu}>{dataPL(dataPorodu)}</time>
                {" "}({ileDniNaglowek(dniMiedzy(dzis, dataPorodu))})
              </p>
              <p className={style.meta}>{t("Stan na dziś, {data}. Znaleźliśmy {liczba} {slowo}.", { data: dataPL(dzis), liczba: zdarzenia.length - (porod ? 1 : 0), slowo: liczbaTerminow(jezyk, zdarzenia.length - (porod ? 1 : 0)) })}</p>
              {planowany && (
                <p className="alert warn" role="status">
                  <b>{t("Orientacyjnie.")}</b> {t("Poród jeszcze się nie odbył, więc wszystkie daty są szacunkowe. Po porodzie wpisz faktyczną datę, a przeliczymy terminy.")}
                </p>
              )}
              <ul className={style.legenda} aria-label={t("Znaczenie znaczników")}>
                {(["deadline", "recommended", "info"] as const).map((k) => (
                  <li key={k}><Znacznik kind={k} /> <span>{t(etykiety.kindHelp[k])}</span></li>
                ))}
              </ul>
              <div className={style.akcje}>
                <button type="button" className="btn btn-primary" onClick={() => { pobierzICS(zdarzenia, { where: t("Gdzie:"), documents: t("Dokumenty:"), verify: t("Zasada do weryfikacji w ZUS lub gminie.") }); setPobrano(true); }}>
                  {t("Dodaj do kalendarza (.ics)")}
                </button>
                <span className={style.prywatnosc}>
                  {t("Plik zawiera wszystkie terminy, z linkami do druków. Przy terminach dodaliśmy przypomnienie z wyprzedzeniem. Nie wysyłamy powiadomień, alarmy działają tylko w kalendarzu na telefonie.")}
                </span>
              </div>
              {pobrano && <p className="alert ok" role="status">{t("Pobrano plik terminarz.ics. Otwórz go na telefonie, aby dodać terminy do kalendarza.")}</p>}
            </div>

            {kategorie.length > 1 && (
              <div className={style.filtr} role="group" aria-label={t("Filtr według instytucji")}>
                <button type="button" className={`chip ${style.chip}`} aria-pressed={aktywna === ""} onClick={() => setKategoria("")}>{t("Wszystkie")}</button>
                {kategorie.map((k) => (
                  <button key={k.kategoria} type="button" className={`chip ${style.chip}`} aria-pressed={aktywna === k.kategoria} onClick={() => setKategoria(k.kategoria)}>
                    {t(etykiety.category[k.kategoria])} ({k.liczba})
                  </button>
                ))}
              </div>
            )}

            {naOsi.length === 0 && <p className="alert info">{t("Brak terminów w wybranej kategorii.")}</p>}
            <OsTerminarza zdarzenia={naOsi} dzis={dzis} orientacyjnie={planowany}
              zrobione={zrobione} onZrobione={przelacz} onOtworz={setOtwarte} />

            {otwartyTermin && (
              <PanelBoczny tytul={otwartyTermin.title} onZamknij={() => setOtwarte(null)}>
                <Szczegoly z={otwartyTermin} dzis={dzis} orientacyjnie={planowany} />
              </PanelBoczny>
            )}

            <p className={style.meta}>
              {t("Kalendarz w urzędzie ma charakter informacyjny i nie zastępuje porady ZUS, gminy ani prawnika. Zasady i terminy zmieniają się, dlatego przy ważnych sprawach sprawdź aktualne informacje w urzędzie.")}
              {" "}{t("Wersja reguł: {wersja}, stan na {data}.", { wersja: reguly.meta.version, data: dataPL(reguly.meta.asOf) })}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
