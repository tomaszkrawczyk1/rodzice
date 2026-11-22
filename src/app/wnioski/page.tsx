"use client";
import { DataPole } from "@/components/DataPole";
import { useEffect, useRef, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dataPL, dzis, RODZAJE, tygodnie, liczba } from "@/lib/format";
import { Alert, Sim } from "@/components/ui";
import { Pole as Field } from "@/components/Pole";
import { zakresUrlopuOjcowskiego } from "@/lib/urlop-ojcowski";
import { zbudujCtx } from "@/lib/sprawy";
import { dodajDni, dodajMiesiace, type Okres } from "@/engine/kalkulator";
import Link from "next/link";
import parametry from "../../../data/parametry.json";
import css from "./wnioski.module.css";

const L = parametry.limity_dni;
const T = parametry.terminy_dni;
const P = parametry.procenty;

const RODZ_URLOP: Record<string, string> = { macierzynski: "urlopu macierzyńskiego", uzupelniajacy: "uzupełniającego urlopu macierzyńskiego", rodzicielski: "urlopu rodzicielskiego", ojcowski: "urlopu ojcowskiego", na_warunkach_macierzynskiego: "urlopu na warunkach urlopu macierzyńskiego" };
type Tab = "urlop" | "laczenie" | "zam";
const ZAKLADKI: [Tab, string][] = [
  ["urlop", "Wniosek o urlop"],
  ["laczenie", "Połączenie pracy z urlopem"],
  ["zam", "Wniosek o zasiłek (ZAM)"],
];
const PUSTY_WNIOSEK = {
  imie: "", pesel: "", pracodawca: "", miasto: "", rodzaj: "rodzicielski", od: "", do: "",
  czesc: 1, dziecko: "", urodzenie: "", drugi: "", drugiOd: "", drugiDo: "",
  ojcowskiDni: L.urlop_ojcowski_dni, etat: "1/2", adresat: "pracodawca",
  w815: false, chorobowe: true, przedsiebiorca: false,
};
type Wniosek = typeof PUSTY_WNIOSEK;

/** Identyfikatory pól: komunikaty błędów, linki w podsumowaniu i fokus na pierwszy błąd. */
const ID = {
  imie: "wn-imie", pesel: "wn-pesel", pracodawca: "wn-pracodawca", urodzenie: "wn-urodzenie", od: "wn-od", do: "wn-do",
  dziecko: "wn-dziecko", drugi: "wn-drugi", drugiOd: "wn-drugi-od", drugiDo: "wn-drugi-do",
} as const;
type PoleId = keyof typeof ID;
type Blad = { pole: PoleId; tekst: string };

/** Co wiemy z profilu testowego (po zalogowaniu): rodzaj ubezpieczenia, płatnik i data porodu ze scenariusza. */
type ZProfilu = { jdg: boolean; platnik?: string; dataPorodu?: string };

export default function Wnioski() {
  const { sesja, gotowa } = useSesja();
  const [tab, setTab] = useState<Tab>("urlop");
  const [wyn, setWyn] = useState<{ numerWniosku: string } | null>(null);
  const [err, setErr] = useState("");
  const [okresy, setOkresy] = useState<Okres[]>([]);
  const [f, setF] = useState(PUSTY_WNIOSEK);
  const [busy, setBusy] = useState(false);
  const [pokazBledy, setPokazBledy] = useState(false);
  const [proba, setProba] = useState(0);
  const [profil, setProfil] = useState<ZProfilu | null>(null);
  const wybranoZakladke = useRef(false);
  const set = (fragment: Partial<Wniosek>) => setF((x) => ({ ...x, ...fragment }));

  useEffect(() => {
    set({ imie: sesja?.osoba ?? "", pesel: sesja?.pesel ?? "" });
    setWyn(null);
  }, [sesja]);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("urlop") === "ojcowski") { set({ rodzaj: "ojcowski" }); wybranoZakladke.current = true; }
    if (p.get("druk") === "ZAM") { setTab("zam"); wybranoZakladke.current = true; }
    try {
      const wejscie = JSON.parse(localStorage.getItem("rodzice.plan") ?? "null")?.wejscie;
      if (!wejscie) return;
      if (wejscie.dataZdarzenia && wejscie.dataZdarzenia <= dzis()) set({ dziecko: wejscie.dataZdarzenia });
      api<{ okresy: Okres[] }>("/api/oblicz/plan", wejscie).then((p) => setOkresy(p.okresy)).catch(() => {});
    } catch {}
  }, []);

  // Dopasowanie do profilu testowego: przy działalności gospodarczej (JDG) domyślnie wniosek ZAM do ZUS (bez pracodawcy),
  // przy umowie o pracę wpisujemy pracodawcę, a datę porodu bierzemy z profilu. Pól już wypełnionych nie nadpisujemy.
  useEffect(() => {
    if (!gotowa) return;
    setProfil(null);
    if (!sesja) return;
    let aktualne = true;
    (async () => {
      const ctx = await zbudujCtx(api, sesja).catch(() => null);
      if (!aktualne || !ctx) return;
      const jdg = ctx.tytul === "dzialalnosc";
      setProfil({ jdg, platnik: ctx.platnik, dataPorodu: ctx.dataPorodu });
      setF((x) => ({
        ...x,
        ...(jdg ? { adresat: "ZUS", przedsiebiorca: true, chorobowe: ctx.dobrowolne ?? true } : {}),
        ...(!jdg && ctx.platnik && !x.pracodawca ? { pracodawca: ctx.platnik } : {}),
        ...(ctx.dataPorodu && !x.dziecko ? { dziecko: ctx.dataPorodu } : {}),
        ...(ctx.dataPorodu && ctx.dataPorodu <= dzis() && !x.urodzenie ? { urodzenie: ctx.dataPorodu } : {}),
      }));
      if (jdg && !wybranoZakladke.current) setTab("zam");
      // Okresy zasiłku z planu persony, gdy rodzic nie zapisał własnego planu w kalkulatorze.
      if (!localStorage.getItem("rodzice.plan")) {
        const sc = await api<any>("/api/scenariusze").catch(() => null);
        const w = sc?.przypadki?.find((x: any) => x.id === sesja.personaId.replace(/[ab]$/, ""))?.wejscie;
        if (w && aktualne) api<{ okresy: Okres[] }>("/api/oblicz/plan", w).then((p) => { if (aktualne) setOkresy(p.okresy); }).catch(() => {});
      }
    })();
    return () => { aktualne = false; };
  }, [sesja, gotowa]);

  const data = dzis();
  const ojcowski = tab === "urlop" && f.rodzaj === "ojcowski";
  const rodzicielski = tab === "urlop" && f.rodzaj === "rodzicielski";
  const zakres = ojcowski ? zakresUrlopuOjcowskiego(f.urodzenie, f.od, f.ojcowskiDni, data, L.urlop_ojcowski_do_wieku_dziecka_miesiecy) : null;
  const koniec = ojcowski ? zakres?.koniec : f.do;
  const doPracodawcy = tab !== "zam" || f.adresat === "pracodawca";
  const jdg = !!profil?.jdg;

  /** Wszystkie błędy formularza, w kolejności pól na ekranie. */
  function bledy(): Blad[] {
    const b: Blad[] = [];
    const dodaj = (pole: PoleId, tekst: string) => b.push({ pole, tekst });
    if (!f.imie.trim()) dodaj("imie", "Wpisz imię i nazwisko.");
    if (!f.pesel.trim()) dodaj("pesel", "Wpisz numer PESEL.");
    else if (!/^\d{11}$/.test(f.pesel.trim())) dodaj("pesel", "PESEL ma 11 cyfr. Sprawdź, czy nie brakuje cyfry.");
    if (doPracodawcy && !f.pracodawca.trim()) dodaj("pracodawca", "Wpisz nazwę i adres pracodawcy.");
    if (ojcowski) {
      if (!f.urodzenie) dodaj("urodzenie", "Wpisz datę urodzenia dziecka.");
      else if (f.urodzenie > data) dodaj("urodzenie", "Ten wniosek przygotujesz po narodzinach dziecka. Data urodzenia nie może być z przyszłości.");
      if (!f.od) dodaj("od", "Wpisz, od kiedy chcesz wziąć urlop.");
      else if (f.urodzenie && f.od < f.urodzenie) dodaj("od", "Urlop może się zacząć w dniu narodzin dziecka albo później.");
      else if (zakres?.blad && f.urodzenie && f.urodzenie <= data) dodaj("od", `Urlop musi się skończyć, zanim dziecko skończy ${L.urlop_ojcowski_do_wieku_dziecka_miesiecy} miesięcy. Wybierz wcześniejszy początek.`);
    } else if (tab !== "zam") {
      if (!f.od) dodaj("od", "Wpisz pierwszy dzień urlopu.");
      if (!f.do) dodaj("do", "Wpisz ostatni dzień urlopu.");
      else if (f.od && f.do < f.od) dodaj("do", "Koniec urlopu nie może być przed jego początkiem.");
    }
    if (tab === "urlop" && !ojcowski && !f.dziecko) dodaj("dziecko", f.rodzaj === "macierzynski" ? "Wpisz datę urodzenia albo przewidywaną datę porodu." : "Wpisz datę urodzenia lub przyjęcia dziecka.");
    if (rodzicielski && !f.drugi) dodaj("drugi", "Wybierz „Tak” albo „Nie”.");
    if (rodzicielski && f.drugi === "tak") {
      if (!f.drugiOd) dodaj("drugiOd", "Wpisz, od kiedy drugi rodzic będzie na urlopie.");
      else if ((f.od && f.drugiOd < f.od) || (koniec && f.drugiOd > koniec)) dodaj("drugiOd", "Ta data musi mieścić się w okresie Twojego urlopu.");
      if (!f.drugiDo) dodaj("drugiDo", "Wpisz, do kiedy drugi rodzic będzie na urlopie.");
      else if (f.drugiOd && f.drugiDo < f.drugiOd) dodaj("drugiDo", "Ta data nie może być przed datą „od kiedy”.");
      else if (koniec && f.drugiDo > koniec) dodaj("drugiDo", "Ta data musi mieścić się w okresie Twojego urlopu.");
    }
    if (tab === "zam" && !f.dziecko) dodaj("dziecko", "Wpisz datę urodzenia lub przyjęcia dziecka.");
    return b;
  }

  const lista = pokazBledy ? bledy() : [];
  const bladPola = (pole: PoleId) => lista.find((x) => x.pole === pole)?.tekst;

  // Po nieudanej próbie druku/wysyłki: fokus na pierwsze pole z błędem (komunikat przy polu czytnik przeczyta z opisu).
  useEffect(() => {
    if (!proba) return;
    const pierwszy = bledy()[0];
    if (pierwszy) document.getElementById(ID[pierwszy.pole])?.focus();
  }, [proba]);

  function zmienZakladke(k: Tab) {
    wybranoZakladke.current = true;
    setTab(k); setWyn(null); setErr(""); setPokazBledy(false);
  }

  async function wykonaj(druk: boolean) {
    setErr("");
    setWyn(null);
    if (bledy().length) { setPokazBledy(true); setProba((n) => n + 1); return; }
    setPokazBledy(false);
    if (druk) { window.print(); return; }
    setBusy(true);
    try {
      const url = tab === "zam" ? "/api/wniosek/zasilek" : "/api/wniosek/urlop";
      const dane = tab === "zam"
        ? { adresat: f.adresat, w815: f.w815, okresy }
        : { rodzaj: tab === "laczenie" ? "rodzicielski" : f.rodzaj, od: f.od, do: koniec, pracodawca: f.pracodawca };
      setWyn(await api(url, dane));
    } catch {
      setErr("Nie udało się zapisać wniosku testowego. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  const zProfilu = (wartosc: string, zrodlo?: string) => !!zrodlo && wartosc === zrodlo;
  const podpowiedzDziecka = profil?.dataPorodu && zProfilu(f.dziecko, profil.dataPorodu)
    ? (profil.dataPorodu > data ? "Wpisaliśmy przewidywany termin porodu z Twojego profilu. Po narodzinach zmień go na prawdziwą datę." : "Wpisaliśmy datę z Twojego profilu. Sprawdź, czy się zgadza.")
    : undefined;

  return (
    <>
      <h1>Kreator wniosków</h1>
      <p className="lead">Przygotuj tekst wniosku i wydrukuj go. Wysyłkę możesz wypróbować na danych testowych. Do złożenia wniosku o zasiłek użyj formularza ZAM.</p>
      {jdg && <Alert t="info">Prowadzisz działalność gospodarczą, więc nie składasz wniosku o urlop do pracodawcy. O zasiłek macierzyński prosisz ZUS wnioskiem ZAM. Dlatego od razu otworzyliśmy ten wniosek.</Alert>}
      <div className="tabs" role="group" aria-label="Rodzaj wniosku">
        {ZAKLADKI.map(([k, t]) => <button key={k} className={"tab" + (tab === k ? " on" : "")} aria-pressed={tab === k} disabled={busy} onClick={() => zmienZakladke(k)}>{t}</button>)}
      </div>

      {lista.length > 0 && <div className={css.podsumowanie} role="alert" aria-labelledby="wn-bledy-h">
        <h2 id="wn-bledy-h" className={css.podsumowanieTytul}>{lista.length === 1 ? "Uzupełnij 1 pole, żeby wydrukować lub wysłać wniosek" : `Uzupełnij ${lista.length} ${lista.length < 5 ? "pola" : "pól"}, żeby wydrukować lub wysłać wniosek`}</h2>
        <ul>
          {lista.map((b) => <li key={b.pole}><a href={`#${ID[b.pole]}`} onClick={(e) => { e.preventDefault(); document.getElementById(ID[b.pole])?.focus(); }}>{b.tekst}</a></li>)}
        </ul>
      </div>}

      <div className="grid g2" style={{ alignItems: "start" }}>
        <fieldset className="card no-print" disabled={busy} style={{ minWidth: 0, margin: 0 }} onChange={() => { setErr(""); setWyn(null); }}>
          <h2>Dane wniosku</h2>
          <p className="small muted">Pola oznaczone gwiazdką (<span className={css.gwiazdka} aria-hidden="true">*</span><span className={css.sr}>gwiazdka</span>) są wymagane.</p>
          <div className="grid g2">
            <Field label="Imię i nazwisko" required error={bladPola("imie")}><input id={ID.imie} type="text" autoComplete="name" value={f.imie} onChange={(e) => set({ imie: e.target.value })} /></Field>
            <Field label="PESEL" required hint="11 cyfr" error={bladPola("pesel")}><input id={ID.pesel} type="text" inputMode="numeric" autoComplete="off" maxLength={11} value={f.pesel} onChange={(e) => set({ pesel: e.target.value.replace(/\D/g, "") })} /></Field>
          </div>
          {tab !== "zam" && <>
            {jdg && <Alert t="warn">Wniosek o urlop składa osoba zatrudniona na umowę o pracę. Jeśli masz też etat, wpisz pracodawcę. Jeśli nie, wybierz zakładkę „Wniosek o zasiłek (ZAM)”.</Alert>}
            <Field label="Pracodawca (nazwa i adres)" required error={bladPola("pracodawca")}><input id={ID.pracodawca} type="text" autoComplete="organization" value={f.pracodawca} onChange={(e) => set({ pracodawca: e.target.value })} /></Field>
          </>}
          <Field label="Miejscowość" hint="Możesz ją też dopisać ręcznie na wydruku."><input type="text" autoComplete="address-level2" value={f.miasto} onChange={(e) => set({ miasto: e.target.value })} /></Field>
          {tab === "urlop" && <>
            <Field label="Rodzaj urlopu"><select value={f.rodzaj} onChange={(e) => set({ rodzaj: e.target.value })}>{Object.keys(RODZ_URLOP).map((k) => <option key={k} value={k}>{RODZAJE[k]}</option>)}</select></Field>
            {ojcowski ? <>
              <DataPole id={ID.urodzenie} required label="Data urodzenia dziecka" hint="Uzupełnij po narodzinach. Informacje o przysposobieniu znajdziesz w poradniku." error={bladPola("urodzenie")} value={f.urodzenie} onChange={(iso) => set({ urodzenie: iso })} />
              <DataPole id={ID.od} required label="Początek urlopu" error={bladPola("od")} value={f.od} onChange={(iso) => set({ od: iso })} />
              <Field label="Długość urlopu"><select value={f.ojcowskiDni} onChange={(e) => set({ ojcowskiDni: +e.target.value })}>
                <option value={L.urlop_ojcowski_min_czesc_dni}>{tygodnie(L.urlop_ojcowski_min_czesc_dni / 7)}</option>
                <option value={L.urlop_ojcowski_dni}>{tygodnie(L.urlop_ojcowski_dni / 7)}</option>
              </select></Field>
              {koniec && <p>Koniec urlopu: <b>{dataPL(koniec)}</b></p>}
              <Alert>Wniosek złóż co najmniej {T.wniosek_urlop_ojcowski_przed_startem} dni przed urlopem{f.od && koniec ? <> (do {dataPL(dodajDni(f.od, -T.wniosek_urlop_ojcowski_przed_startem))})</> : null}. Dołącz odpis skrócony aktu urodzenia, dokument z zagranicy potwierdzający urodzenie albo kopię jednego z tych dokumentów.</Alert>
              {profil?.dataPorodu && profil.dataPorodu > data && <p className="small muted">Przewidywany termin porodu z Twojego profilu: {dataPL(profil.dataPorodu)}. Urlop ojcowski możesz wziąć do {dataPL(dodajDni(dodajMiesiace(profil.dataPorodu, L.urlop_ojcowski_do_wieku_dziecka_miesiecy), -1))}.</p>}
              <p><Link href="/poradnik#F14">Sprawdź zasady urlopu ojcowskiego</Link></p>
            </> : <>
              <div className="grid g2">
                <DataPole id={ID.od} required label="Początek urlopu" error={bladPola("od")} value={f.od} onChange={(iso) => set({ od: iso })} />
                <DataPole id={ID.do} required label="Koniec urlopu" error={bladPola("do")} value={f.do} onChange={(iso) => set({ do: iso })} />
              </div>
              {rodzicielski && <Field label="Która to część urlopu?"><select value={f.czesc} onChange={(e) => set({ czesc: +e.target.value })}>{Array.from({ length: L.urlop_rodzicielski_max_czesci }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></Field>}
              <DataPole id={ID.dziecko} required label={f.rodzaj === "macierzynski" ? "Data urodzenia lub przewidywana data porodu" : "Data urodzenia lub przyjęcia dziecka"} hint={podpowiedzDziecka} error={bladPola("dziecko")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
              {rodzicielski && <>
                <Field label="Czy drugi rodzic będzie w tym czasie korzystać z urlopu rodzicielskiego lub pobierać zasiłek za ten urlop?" required error={bladPola("drugi")}>
                  <select id={ID.drugi} value={f.drugi} onChange={(e) => set({ drugi: e.target.value })}>
                    <option value="">Wybierz odpowiedź</option><option value="nie">Nie</option><option value="tak">Tak, podam okres</option>
                  </select>
                </Field>
                {f.drugi === "tak" && <div className="grid g2">
                  <DataPole id={ID.drugiOd} required label="Drugi rodzic: od kiedy?" error={bladPola("drugiOd")} value={f.drugiOd} onChange={(iso) => set({ drugiOd: iso })} />
                  <DataPole id={ID.drugiDo} required label="Drugi rodzic: do kiedy?" error={bladPola("drugiDo")} value={f.drugiDo} onChange={(iso) => set({ drugiDo: iso })} />
                </div>}
                <Alert>Możecie skorzystać z urlopu rodzicielskiego w tym samym czasie. Oba okresy liczą się do wspólnej puli. Wniosek złóż co najmniej <b>{T.wniosek_urlop_rodzicielski_przed_startem} dni</b> przed rozpoczęciem.</Alert>
              </>}
              {f.rodzaj === "macierzynski" && <Alert>Jeśli zaczynasz urlop macierzyński przed porodem, dołącz zaświadczenie lekarskie o przewidywanej dacie porodu.</Alert>}
            </>}
          </>}
          {tab === "laczenie" && <>
            <Field label="Wymiar czasu pracy w okresie urlopu" hint="Maksymalnie ½ etatu"><select value={f.etat} onChange={(e) => set({ etat: e.target.value })}><option>1/2</option><option>1/4</option><option>1/3</option><option>2/5</option></select></Field>
            <div className="grid g2">
              <DataPole id={ID.od} required label="Od" error={bladPola("od")} value={f.od} onChange={(iso) => set({ od: iso })} />
              <DataPole id={ID.do} required label="Do" error={bladPola("do")} value={f.do} onChange={(iso) => set({ do: iso })} />
            </div>
            <Alert t="warn">Wniosek składa się co najmniej <b>{T.wniosek_laczenie_z_praca_przed_startem} dni</b> przed rozpoczęciem. Pracodawca może odmówić z przyczyn organizacyjnych – poinformuje o tym w ciągu {T.odmowa_laczenia_z_praca_odpowiedz_pracodawcy} dni.</Alert></>}
          {tab === "zam" && <>
            <Field label="Adresat wniosku" hint={jdg ? "Przy działalności gospodarczej zasiłek wypłaca ZUS." : undefined}><select value={f.adresat} onChange={(e) => set({ adresat: e.target.value })}><option value="pracodawca">Pracodawca wypłacający zasiłek</option><option value="ZUS">Zakład Ubezpieczeń Społecznych</option></select></Field>
            {f.adresat === "pracodawca" && <Field label="Pracodawca (nazwa i adres)" required error={bladPola("pracodawca")}><input id={ID.pracodawca} type="text" autoComplete="organization" value={f.pracodawca} onChange={(e) => set({ pracodawca: e.target.value })} /></Field>}
            <label className="check"><input type="checkbox" checked={f.w815} onChange={(e) => set({ w815: e.target.checked })} />Wybieram uśrednioną stawkę zasiłku ({liczba(P.wariant_pelny_wymiar_81_5)}%).</label>
            <p><Link href="/dokumenty">Sprawdź terminy i gdzie złożyć ZAM</Link></p>
            <label className="check"><input type="checkbox" checked={f.przedsiebiorca} onChange={(e) => set({ przedsiebiorca: e.target.checked })} />Prowadzę działalność gospodarczą</label>
            {f.przedsiebiorca && <label className="check"><input type="checkbox" checked={f.chorobowe} onChange={(e) => set({ chorobowe: e.target.checked })} />Mam dobrowolne ubezpieczenie chorobowe</label>}
            <DataPole id={ID.dziecko} required label="Data urodzenia dziecka / przyjęcia na wychowanie" hint={podpowiedzDziecka} error={bladPola("dziecko")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            {okresy.length > 0 ? <Alert t="ok">Okresy zasiłku wstawiono z Twojego planu ({okresy.length}).</Alert> : <Alert>Okresy zasiłku uzupełnimy z planu w <a href="/kalkulator">kalkulatorze</a>.</Alert>}</>}
        </fieldset>

        <div>
          <div className="card" id="podglad" style={{ overflowWrap: "anywhere" }}>
            <div className="row between no-print"><h2>Podgląd wniosku</h2><Sim /></div>
            <div style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
              <p className="right">{f.miasto || "………"}, {dataPL(data)}</p>
              <p><b>{f.imie || "Imię i nazwisko"}</b><br />PESEL: {f.pesel || "…………"}</p>
              {tab !== "zam" ? <p className="right"><b>{f.pracodawca || "Pracodawca"}</b></p> : <p className="right"><b>{f.adresat === "ZUS" ? "Zakład Ubezpieczeń Społecznych" : f.pracodawca || "Pracodawca (płatnik składek)"}</b></p>}
              {ojcowski && !koniec && <p>Uzupełnij datę narodzin i okres urlopu, aby zobaczyć treść wniosku.</p>}
              {tab === "urlop" && (!ojcowski || koniec) && <><h3 style={{ textAlign: "center" }}>Wniosek o udzielenie {RODZ_URLOP[f.rodzaj]}</h3>
                <p>Na podstawie przepisów Kodeksu pracy wnoszę o udzielenie mi {RODZ_URLOP[f.rodzaj]} w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(koniec)}</b>{rodzicielski ? <> (część {f.czesc} z maksymalnie {L.urlop_rodzicielski_max_czesci})</> : ""}.</p>
                <p>{ojcowski ? "Data urodzenia dziecka" : f.rodzaj === "macierzynski" ? "Data urodzenia lub przewidywana data porodu" : "Data urodzenia lub przyjęcia dziecka"}: <b>{dataPL(ojcowski ? f.urodzenie : f.dziecko)}</b>.</p>
                {rodzicielski && f.drugi === "nie" && <p>Oświadczam, że w okresie objętym wnioskiem drugi rodzic nie będzie korzystać z urlopu rodzicielskiego ani pobierać zasiłku za ten urlop.</p>}
                {rodzicielski && f.drugi === "tak" && <p>Oświadczam, że w okresie objętym wnioskiem drugi rodzic zamierza skorzystać z urlopu rodzicielskiego lub pobierać zasiłek za ten urlop od <b>{dataPL(f.drugiOd)}</b> do <b>{dataPL(f.drugiDo)}</b>.</p>}
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "laczenie" && <><h3 style={{ textAlign: "center" }}>Wniosek o łączenie korzystania z urlopu rodzicielskiego z wykonywaniem pracy</h3>
                <p>Na podstawie art. 182<sup>1</sup>e Kodeksu pracy wnoszę o udzielenie urlopu rodzicielskiego w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(f.do)}</b> z jednoczesnym wykonywaniem pracy w wymiarze <b>{f.etat}</b> pełnego wymiaru czasu pracy.</p>
                <p>Rozumiem, że wymiar urlopu rodzicielskiego ulega proporcjonalnemu wydłużeniu, a zasiłek macierzyński – proporcjonalnemu zmniejszeniu.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "zam" && <><h3 style={{ textAlign: "center" }}>Podgląd danych do formularza ZAM</h3>
                <p>Wnoszę o ustalenie prawa do zasiłku macierzyńskiego w związku z urodzeniem dziecka / przyjęciem dziecka na wychowanie w dniu <b>{dataPL(f.dziecko)}</b>.</p>
                {okresy.length > 0 && <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>Rodzaj</th><th>Od</th><th>Do</th></tr></thead><tbody>{okresy.map((o, i) => <tr key={i}><td data-label="Rodzaj">{RODZAJE[o.rodzaj] ?? "Okres zasiłku"} ({o.kto === "matka" ? "rodzic 1" : "rodzic 2"})</td><td data-label="Od">{dataPL(o.od)}</td><td data-label="Do">{dataPL(o.do)}</td></tr>)}</tbody></table></div>}
                {f.w815 && <p>Wnoszę o uśrednioną stawkę zasiłku ({liczba(P.wariant_pelny_wymiar_81_5)}% podstawy).</p>}
                {f.przedsiebiorca && <p>Informacja o ubezpieczeniu: prowadzę pozarolniczą działalność gospodarczą, ubezpieczenie chorobowe: <b>{f.chorobowe ? "tak" : "nie"}</b>.</p>}
                <p className="right">…………………………<br />(podpis)</p></>}
            </div>
            <div className="row no-print mt">
              <button className="btn btn-secondary" onClick={() => wykonaj(true)} disabled={busy}>Wydrukuj wniosek</button>
              <button className="btn btn-primary" onClick={() => wykonaj(false)} disabled={busy}>Wyślij wniosek testowy</button>
            </div>
            {lista.length > 0 && <p className={`no-print ${css.przyPrzyciskach}`}>Najpierw uzupełnij pola zaznaczone w formularzu ({lista.length}).</p>}
            {err && <Alert t="err">{err}</Alert>}
            {wyn && <Alert t="ok">Zapisano wniosek testowy. Numer: <b>{wyn.numerWniosku}</b>. <Sim /></Alert>}
          </div>
        </div>
      </div>
    </>
  );
}
