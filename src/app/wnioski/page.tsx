"use client";
import { DataPole } from "@/components/DataPole";
import { useEffect, useRef, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dzis, formaty, RODZAJE } from "@/lib/format";
import { useFormaty, useT, useTb } from "@/lib/jezyk";
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
type Tab = "urlop" | "laczenie" | "zam" | "jeden" | "rezygnacja" | "zas53" | "zas26";
const ZAKLADKI: [Tab, string][] = [
  ["urlop", "Wniosek o urlop"],
  ["jeden", "Macierzyński + rodzicielski (jeden wniosek)"],
  ["rezygnacja", "Rezygnacja z części urlopu macierzyńskiego"],
  ["laczenie", "Połączenie pracy z urlopem"],
  ["zam", "Wniosek o zasiłek (ZAM)"],
  ["zas53", "Zasiłek chorobowy w ciąży (ZAS-53)"],
  ["zas26", "Adopcja / rodzina zastępcza (ZAS-26)"],
];
const MIN_TYGODNI_MATKI = 14;
const PUSTY_WNIOSEK = {
  rodzOd: "", rodzDo: "", ojciecImie: "",
  adres: "", telefon: "", nip: "", zlaOd: "", zlaDo: "", zlaNr: "", konto: "",
  tytulAdopcji: "rodzina", daneDziecka: "",
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
  rodzOd: "wn-rodz-od", rodzDo: "wn-rodz-do", ojciecImie: "wn-ojciec", adres: "wn-adres", zlaOd: "wn-zla-od", zlaDo: "wn-zla-do", daneDziecka: "wn-dane-dziecka",
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
  const doPracodawcy = tab === "zam" ? f.adresat === "pracodawca" : tab !== "zas53" && tab !== "zas26";
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
    } else if (tab === "urlop" || tab === "laczenie" || tab === "jeden") {
      if (!f.od) dodaj("od", "Wpisz pierwszy dzień urlopu.");
      if (!f.do) dodaj("do", "Wpisz ostatni dzień urlopu.");
      else if (f.od && f.do < f.od) dodaj("do", "Koniec urlopu nie może być przed jego początkiem.");
    }
    if (tab === "jeden") {
      if (!f.dziecko) dodaj("dziecko", "Wpisz datę urodzenia albo przewidywaną datę porodu.");
      if (!f.rodzOd) dodaj("rodzOd", "Wpisz pierwszy dzień urlopu rodzicielskiego.");
      else if (f.do && f.rodzOd <= f.do) dodaj("rodzOd", "Urlop rodzicielski musi zaczynać się po zakończeniu urlopu macierzyńskiego.");
      if (!f.rodzDo) dodaj("rodzDo", "Wpisz ostatni dzień urlopu rodzicielskiego.");
      else if (f.rodzOd && f.rodzDo < f.rodzOd) dodaj("rodzDo", "Koniec urlopu nie może być przed jego początkiem.");
    }
    if (tab === "rezygnacja") {
      const najwczesniej = f.dziecko ? dodajDni(f.dziecko, MIN_TYGODNI_MATKI * 7) : "";
      if (!f.dziecko) dodaj("dziecko", "Wpisz datę urodzenia dziecka.");
      if (!f.do) dodaj("do", "Wpisz, do kiedy trwałby Twój urlop macierzyński.");
      if (!f.od) dodaj("od", "Wpisz dzień, od którego rezygnujesz z reszty urlopu.");
      else if (najwczesniej && f.od < najwczesniej) dodaj("od", `Rezygnacja jest możliwa dopiero po ${MIN_TYGODNI_MATKI} tygodniach urlopu po porodzie, czyli od ${dataPL(najwczesniej)}.`);
      else if (f.do && f.od > f.do) dodaj("od", "Dzień rezygnacji nie może być po końcu urlopu.");
      if (!f.ojciecImie.trim()) dodaj("ojciecImie", "Wpisz imię i nazwisko ojca dziecka, który przejmie urlop.");
    }
    if (tab === "zas53") {
      if (!f.adres.trim()) dodaj("adres", "Wpisz adres zamieszkania.");
      if (!f.zlaOd) dodaj("zlaOd", "Wpisz pierwszy dzień niezdolności do pracy z zaświadczenia.");
      if (!f.zlaDo) dodaj("zlaDo", "Wpisz ostatni dzień niezdolności do pracy z zaświadczenia.");
      else if (f.zlaOd && f.zlaDo < f.zlaOd) dodaj("zlaDo", "Koniec nie może być przed początkiem.");
    }
    if (tab === "zas26") {
      if (!f.dziecko) dodaj("dziecko", f.tytulAdopcji === "rodzina" ? "Wpisz datę przyjęcia dziecka." : "Wpisz datę wniosku do sądu.");
      if (!f.daneDziecka.trim()) dodaj("daneDziecka", "Wpisz imię i nazwisko dziecka oraz miejsce i datę urodzenia.");
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
      const url = tab === "zam" ? "/api/wniosek/zasilek" : tab === "zas53" || tab === "zas26" ? "/api/wniosek/zas" : "/api/wniosek/urlop";
      const dane = tab === "zam"
        ? { adresat: f.adresat, w815: f.w815, okresy }
        : tab === "zas53" ? { druk: "ZAS-53", od: f.zlaOd, do: f.zlaDo }
        : tab === "zas26" ? { druk: "ZAS-26", data: f.dziecko }
        : tab === "jeden" ? { rodzaj: "macierzynski_rodzicielski", od: f.od, do: f.rodzDo, pracodawca: f.pracodawca }
        : tab === "rezygnacja" ? { rodzaj: "rezygnacja_macierzynski", od: f.od, do: f.do, pracodawca: f.pracodawca }
        : { rodzaj: tab === "laczenie" ? "rodzicielski" : f.rodzaj, od: f.od, do: koniec, pracodawca: f.pracodawca };
      setWyn(await api(url, dane));
    } catch {
      setErr(t("Nie udało się zapisać wniosku testowego. Spróbuj ponownie."));
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
          {tab !== "zam" && tab !== "zas53" && tab !== "zas26" && <>
            {jdg && <Alert t="warn">Wniosek o urlop składa osoba zatrudniona na umowę o pracę. Jeśli masz też etat, wpisz pracodawcę. Jeśli nie, wybierz zakładkę „Wniosek o zasiłek (ZAM)”.</Alert>}
            <Field label="Pracodawca (nazwa i adres)" required error={bladPola("pracodawca")}><input id={ID.pracodawca} type="text" autoComplete="organization" value={f.pracodawca} onChange={(e) => set({ pracodawca: e.target.value })} /></Field>
          </>}
          {tab === "zas26" && <Field label="Płatnik składek (pracodawca lub zleceniodawca)" hint="Zostaw puste, jeśli składasz do ZUS."><input type="text" autoComplete="organization" value={f.pracodawca} onChange={(e) => set({ pracodawca: e.target.value })} /></Field>}
          {tab === "zas53" && <>
            <Field label="Adres zamieszkania" required error={bladPola("adres")}><input id={ID.adres} type="text" autoComplete="street-address" value={f.adres} onChange={(e) => set({ adres: e.target.value })} /></Field>
            <div className="grid g2">
              <Field label="Telefon" hint="Dobrowolnie. Ułatwia kontakt z ZUS."><input type="tel" autoComplete="tel" value={f.telefon} onChange={(e) => set({ telefon: e.target.value })} /></Field>
              <Field label="NIP płatnika składek" hint="Jeśli opłacasz składki sama, wpisz swój NIP."><input type="text" inputMode="numeric" value={f.nip} onChange={(e) => set({ nip: e.target.value.replace(/\D/g, "") })} /></Field>
            </div>
          </>}
          <Field label="Miejscowość" hint="Możesz ją też dopisać ręcznie na wydruku."><input type="text" autoComplete="address-level2" value={f.miasto} onChange={(e) => set({ miasto: e.target.value })} /></Field>
          {tab === "urlop" && <>
            <Field label={t("Rodzaj urlopu")}><select value={f.rodzaj} onChange={(e) => set({ rodzaj: e.target.value })}>{Object.keys(RODZ_URLOP).map((k) => <option key={k} value={k}>{t(RODZAJE[k])}</option>)}</select></Field>
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
                <Alert>{tb("Możecie skorzystać z urlopu rodzicielskiego w tym samym czasie. Oba okresy liczą się do wspólnej puli. Wniosek złóż co najmniej **{dni}** przed rozpoczęciem.", { dni: dni(T.wniosek_urlop_rodzicielski_przed_startem) })}</Alert>
              </>}
              {f.rodzaj === "macierzynski" && <Alert>{t("Jeśli zaczynasz urlop macierzyński przed porodem, dołącz zaświadczenie lekarskie o przewidywanej dacie porodu.")}</Alert>}
            </>}
          </>}
          {tab === "laczenie" && <>
            <Field label="Wymiar czasu pracy w okresie urlopu" hint="Maksymalnie ½ etatu"><select value={f.etat} onChange={(e) => set({ etat: e.target.value })}><option>1/2</option><option>1/4</option><option>1/3</option><option>2/5</option></select></Field>
            <div className="grid g2">
              <DataPole id={ID.od} required label="Od" error={bladPola("od")} value={f.od} onChange={(iso) => set({ od: iso })} />
              <DataPole id={ID.do} required label="Do" error={bladPola("do")} value={f.do} onChange={(iso) => set({ do: iso })} />
            </div>
            <Alert t="warn">Wniosek składa się co najmniej <b>{T.wniosek_laczenie_z_praca_przed_startem} dni</b> przed rozpoczęciem. Pracodawca może odmówić z przyczyn organizacyjnych – poinformuje o tym w ciągu {T.odmowa_laczenia_z_praca_odpowiedz_pracodawcy} dni.</Alert></>}
          {tab === "jeden" && <>
            <DataPole id={ID.dziecko} required label="Data urodzenia lub przewidywana data porodu" hint={podpowiedzDziecka} error={bladPola("dziecko")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            <div className="grid g2">
              <DataPole id={ID.od} required label="Urlop macierzyński: od" error={bladPola("od")} value={f.od} onChange={(iso) => set({ od: iso })} />
              <DataPole id={ID.do} required label="Urlop macierzyński: do" error={bladPola("do")} value={f.do} onChange={(iso) => set({ do: iso })} />
              <DataPole id={ID.rodzOd} required label="Urlop rodzicielski: od" hint="Zwykle następny dzień po urlopie macierzyńskim." error={bladPola("rodzOd")} value={f.rodzOd} onChange={(iso) => set({ rodzOd: iso })} />
              <DataPole id={ID.rodzDo} required label="Urlop rodzicielski: do" error={bladPola("rodzDo")} value={f.rodzDo} onChange={(iso) => set({ rodzDo: iso })} />
            </div>
            <Alert>Jeden wniosek wystarczy, gdy urlop rodzicielski zaczyna się zaraz po macierzyńskim. Złóż go co najmniej <b>{T.wniosek_urlop_rodzicielski_przed_startem} dni</b> przed rozpoczęciem urlopu rodzicielskiego. Pierwszych {MIN_TYGODNI_MATKI} tygodni po porodzie musisz wykorzystać osobiście.</Alert>
          </>}
          {tab === "rezygnacja" && <>
            <DataPole id={ID.dziecko} required label="Data urodzenia dziecka" hint={podpowiedzDziecka} error={bladPola("dziecko")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            <DataPole id={ID.do} required label="Urlop macierzyński trwałby do" error={bladPola("do")} value={f.do} onChange={(iso) => set({ do: iso })} />
            <DataPole id={ID.od} required label="Rezygnuję z reszty urlopu od dnia" hint={`Najwcześniej po ${MIN_TYGODNI_MATKI} tygodniach od porodu.`} error={bladPola("od")} value={f.od} onChange={(iso) => set({ od: iso })} />
            <Field label="Imię i nazwisko ojca dziecka (przejmuje urlop)" required error={bladPola("ojciecImie")}><input id={ID.ojciecImie} type="text" value={f.ojciecImie} onChange={(e) => set({ ojciecImie: e.target.value })} /></Field>
            <Alert t="warn">Złóż wniosek co najmniej <b>{T.wniosek_rezygnacja_matki_z_czesci_urlopu_przed_powrotem} dni</b> przed dniem, w którym wracasz do pracy. Ojciec musi złożyć własny wniosek o urlop (co najmniej {T.wniosek_przejecie_macierzynskiego_przez_ojca_przed_startem} dni przed startem), bo bez tego rezygnacja nie zadziała.</Alert>
          </>}
          {tab === "zas53" && <>
            <div className="grid g2">
              <DataPole id={ID.zlaOd} required label="Niezdolność do pracy: od" error={bladPola("zlaOd")} value={f.zlaOd} onChange={(iso) => set({ zlaOd: iso })} />
              <DataPole id={ID.zlaDo} required label="Niezdolność do pracy: do" error={bladPola("zlaDo")} value={f.zlaDo} onChange={(iso) => set({ zlaDo: iso })} />
            </div>
            <Field label="Seria i numer zaświadczenia lekarskiego" hint="Jeśli znasz."><input type="text" value={f.zlaNr} onChange={(e) => set({ zlaNr: e.target.value })} /></Field>
            <Field label="Numer konta do wypłaty" hint="Dobrowolnie. Bez konta zasiłek przyjdzie przekazem pocztowym."><input type="text" inputMode="numeric" value={f.konto} onChange={(e) => set({ konto: e.target.value })} /></Field>
            <Alert>ZAS-53 składasz do ZUS, jeśli prowadzisz działalność, pracujesz na zleceniu albo choroba zaczęła się po ustaniu ubezpieczenia. Przy zwolnieniu z kodem „B” (ciąża) zasiłek wynosi <b>100%</b> podstawy. Pracownica na etacie nie składa ZAS-53: zwolnienie e-ZLA trafia do pracodawcy.</Alert>
          </>}
          {tab === "zas26" && <>
            <Field label="Podstawa"><select value={f.tytulAdopcji} onChange={(e) => set({ tytulAdopcji: e.target.value })}>
              <option value="rodzina">Przyjęłam dziecko jako rodzina zastępcza</option>
              <option value="sad">Wystąpiłam do sądu o przysposobienie dziecka</option>
            </select></Field>
            <DataPole id={ID.dziecko} required label={f.tytulAdopcji === "rodzina" ? "Data przyjęcia dziecka na wychowanie" : "Data wniosku do sądu opiekuńczego"} error={bladPola("dziecko")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            <Field label="Dane dziecka" required hint="Imię i nazwisko oraz miejsce i data urodzenia." error={bladPola("daneDziecka")}><textarea id={ID.daneDziecka} rows={3} value={f.daneDziecka} onChange={(e) => set({ daneDziecka: e.target.value })} /></Field>
            <Alert>Oświadczenie ZAS-26 dołączasz do wniosku ZAM. Wniosek o urlop złóż w ciągu <b>{T.adopcja_wniosek_o_urlop_po_przyjeciu_dziecka} dni</b> od przyjęcia dziecka, a wariant {liczba(P.wariant_pelny_wymiar_81_5)}% (uśredniona stawka) w ciągu <b>{T.adopcja_wniosek_81_5_po_przyjeciu} dni</b>.</Alert>
          </>}
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
            <div className="row between no-print"><h2>{t("Podgląd wniosku")}</h2><Sim /></div>
            {fmt.jezyk !== "pl" && <p className="small muted no-print">{t("Wersja po polsku: wniosek składasz w polskiej firmie lub w ZUS, więc jego tekst zostaje po polsku. Poniżej możesz go sprawdzić i wydrukować.")}</p>}
            <div lang="pl" style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
              <p className="right">{f.miasto || "………"}, {dataPL(data)}</p>
              <p><b>{f.imie || "Imię i nazwisko"}</b><br />PESEL: {f.pesel || "…………"}</p>
              {tab === "zas53" ? <p className="right"><b>Zakład Ubezpieczeń Społecznych</b></p> : tab === "zas26" ? <p className="right"><b>{f.pracodawca || "Płatnik składek / ZUS"}</b></p> : tab !== "zam" ? <p className="right"><b>{f.pracodawca || "Pracodawca"}</b></p> : <p className="right"><b>{f.adresat === "ZUS" ? "Zakład Ubezpieczeń Społecznych" : f.pracodawca || "Pracodawca (płatnik składek)"}</b></p>}
              {tab === "jeden" && <><h3 style={{ textAlign: "center" }}>Wniosek o udzielenie urlopu macierzyńskiego i urlopu rodzicielskiego</h3>
                <p>Na podstawie przepisów Kodeksu pracy wnoszę o udzielenie mi urlopu macierzyńskiego w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(f.do)}</b> oraz bezpośrednio po nim urlopu rodzicielskiego w okresie od <b>{dataPL(f.rodzOd)}</b> do <b>{dataPL(f.rodzDo)}</b>.</p>
                <p>Data urodzenia lub przewidywana data porodu: <b>{dataPL(f.dziecko)}</b>.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "rezygnacja" && <><h3 style={{ textAlign: "center" }}>Rezygnacja z części urlopu macierzyńskiego</h3>
                <p>Na podstawie art. 180 § 5 Kodeksu pracy rezygnuję z urlopu macierzyńskiego od dnia <b>{dataPL(f.od)}</b> (do dnia <b>{dataPL(f.do)}</b>). Wykorzystałam co najmniej {MIN_TYGODNI_MATKI} tygodni urlopu po porodzie.</p>
                <p>Data urodzenia dziecka: <b>{dataPL(f.dziecko)}</b>. Pozostałą część urlopu macierzyńskiego przejmie ojciec dziecka: <b>{f.ojciecImie || "…………"}</b>.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "zas53" && <><h3 style={{ textAlign: "center" }}>Wniosek o zasiłek chorobowy (ZAS-53)</h3>
                <p>Adres: <b>{f.adres || "…………"}</b>{f.telefon ? <>, tel. {f.telefon}</> : ""}. NIP płatnika składek: <b>{f.nip || "…………"}</b>.</p>
                <p>Składam wniosek o przyznanie zasiłku chorobowego za okres niezdolności do pracy od <b>{dataPL(f.zlaOd)}</b> do <b>{dataPL(f.zlaDo)}</b>{f.zlaNr ? <> (zaświadczenie lekarskie: {f.zlaNr})</> : ""}. Niezdolność przypada w okresie ciąży (kod „B”), więc zasiłek przysługuje w wysokości 100% podstawy wymiaru.</p>
                <p>{f.konto ? <>Zasiłek proszę wypłacić na rachunek: <b>{f.konto}</b>.</> : "Zasiłek proszę wypłacić przekazem pocztowym na podany adres."}</p>
                <p>Oświadczam, że dane podałam zgodnie z prawdą. Jeśli ulegną zmianie, poinformuję o tym ZUS.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "zas26" && <><h3 style={{ textAlign: "center" }}>Oświadczenie o przyjęciu na wychowanie dziecka (ZAS-26)</h3>
                <p>{f.tytulAdopcji === "rodzina" ? <>Oświadczam, że przyjęłam na wychowanie dziecko jako rodzina zastępcza w dniu <b>{dataPL(f.dziecko)}</b>.</> : <>Oświadczam, że wystąpiłam do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie przysposobienia dziecka w dniu <b>{dataPL(f.dziecko)}</b>.</>}</p>
                <p>Dane dziecka: <b style={{ whiteSpace: "pre-line" }}>{f.daneDziecka || "…………"}</b></p>
                <p>Oświadczam, że dane podałam zgodnie z prawdą. Jeśli ulegną zmianie, poinformuję o tym płatnika zasiłku.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
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
              <button className="btn btn-secondary" onClick={() => wykonaj(true)} disabled={busy}>{t("Wydrukuj wniosek")}</button>
              <button className="btn btn-primary" onClick={() => wykonaj(false)} disabled={busy}>{t("Wyślij wniosek testowy")}</button>
            </div>
            {lista.length > 0 && <p className={`no-print ${css.przyPrzyciskach}`}>Najpierw uzupełnij pola zaznaczone w formularzu ({lista.length}).</p>}
            {err && <Alert t="err">{err}</Alert>}
            {wyn && <Alert t="ok">{tb("Zapisano wniosek testowy. Numer: **{numer}**.", { numer: wyn.numerWniosku })} <Sim /></Alert>}
          </div>
        </div>
      </div>
    </>
  );
}
