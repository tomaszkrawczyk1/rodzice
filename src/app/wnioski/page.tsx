"use client";
import { DataPole } from "@/components/DataPole";
import { useEffect, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dataPL, dzis, RODZAJE, tygodnie, liczba } from "@/lib/format";
import { Alert, Sim } from "@/components/ui";
import { Pole as Field } from "@/components/Pole";
import { zakresUrlopuOjcowskiego } from "@/lib/urlop-ojcowski";
import { dodajDni, type Okres } from "@/engine/kalkulator";
import Link from "next/link";
import parametry from "../../../data/parametry.json";

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

export default function Wnioski() {
  const { sesja } = useSesja();
  const [tab, setTab] = useState<Tab>("urlop");
  const [wyn, setWyn] = useState<{ numerWniosku: string } | null>(null);
  const [err, setErr] = useState("");
  const [okresy, setOkresy] = useState<Okres[]>([]);
  const [f, setF] = useState(PUSTY_WNIOSEK);
  const [busy, setBusy] = useState(false);
  const set = (fragment: Partial<typeof PUSTY_WNIOSEK>) => setF((x) => ({ ...x, ...fragment }));

  useEffect(() => {
    set({ imie: sesja?.osoba ?? "", pesel: sesja?.pesel ?? "" });
    setWyn(null);
  }, [sesja]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("urlop") === "ojcowski") set({ rodzaj: "ojcowski" });
    try {
      const wejscie = JSON.parse(localStorage.getItem("rodzice.plan") ?? "null")?.wejscie;
      if (!wejscie) return;
      if (wejscie.dataZdarzenia && wejscie.dataZdarzenia <= dzis()) set({ dziecko: wejscie.dataZdarzenia });
      api<{ okresy: Okres[] }>("/api/oblicz/plan", wejscie).then((p) => setOkresy(p.okresy)).catch(() => {});
    } catch {}
  }, []);
  const data = dzis();
  const ojcowski = tab === "urlop" && f.rodzaj === "ojcowski";
  const rodzicielski = tab === "urlop" && f.rodzaj === "rodzicielski";
  const zakres = ojcowski ? zakresUrlopuOjcowskiego(f.urodzenie, f.od, f.ojcowskiDni, data, L.urlop_ojcowski_do_wieku_dziecka_miesiecy) : null;
  const koniec = ojcowski ? zakres?.koniec : f.do;

  function sprawdz() {
    if (!f.imie.trim()) return "Wpisz imię i nazwisko.";
    if (tab === "zam") return f.dziecko ? "" : "Wpisz datę urodzenia lub przyjęcia dziecka.";
    if (zakres?.blad) return zakres.blad;
    if (tab === "urlop" && !ojcowski && !f.dziecko) return "Wpisz datę urodzenia, porodu lub przyjęcia dziecka odpowiednią do rodzaju urlopu.";
    if (!f.od || !koniec || koniec < f.od) return "Podaj prawidłową datę rozpoczęcia i zakończenia urlopu.";
    if (rodzicielski && !f.drugi) return "Wybierz, czy drugi rodzic będzie korzystać z urlopu lub zasiłku w tym samym czasie.";
    if (rodzicielski && f.drugi === "tak" && (!f.drugiOd || !f.drugiDo || f.drugiOd < f.od || f.drugiDo > koniec || f.drugiOd > f.drugiDo))
      return "Wpisz daty korzystania przez drugiego rodzica w okresie objętym wnioskiem.";
    return "";
  }

  async function wykonaj(druk: boolean) {
    const blad = sprawdz();
    setErr(blad);
    setWyn(null);
    if (blad) return;
    if (druk) { window.print(); return; }
    setBusy(true);
    try {
      const url = tab === "zam" ? "/api/wniosek/zasilek" : "/api/wniosek/urlop";
      const dane = tab === "zam"
        ? { adresat: f.adresat, w815: f.w815, okresy }
        : { rodzaj: tab === "laczenie" ? "rodzicielski" : f.rodzaj, od: f.od, do: koniec };
      setWyn(await api(url, dane));
    } catch {
      setErr("Nie udało się zapisać wniosku testowego. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Kreator wniosków</h1>
      <p className="lead">Przygotuj tekst wniosku i wydrukuj go. Wysyłkę możesz wypróbować na danych testowych. Do złożenia wniosku o zasiłek użyj formularza ZAM.</p>
      <div className="tabs" role="group" aria-label="Rodzaj wniosku">
        {ZAKLADKI.map(([k, t]) => <button key={k} className={"tab" + (tab === k ? " on" : "")} aria-pressed={tab === k} disabled={busy} onClick={() => { setTab(k); setWyn(null); setErr(""); }}>{t}</button>)}
      </div>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <fieldset className="card no-print" disabled={busy} style={{ minWidth: 0, margin: 0 }} onChange={() => { setErr(""); setWyn(null); }}>
          <h2>Dane wniosku</h2>
          <div className="grid g2"><Field label="Imię i nazwisko"><input type="text" value={f.imie} onChange={(e) => set({ imie: e.target.value })} /></Field><Field label="PESEL"><input type="text" value={f.pesel} onChange={(e) => set({ pesel: e.target.value })} /></Field></div>
          {tab !== "zam" && <><Field label="Pracodawca (nazwa i adres)"><input type="text" value={f.pracodawca} onChange={(e) => set({ pracodawca: e.target.value })} /></Field></>}
          <Field label="Miejscowość"><input type="text" value={f.miasto} onChange={(e) => set({ miasto: e.target.value })} /></Field>
          {tab === "urlop" && <>
            <Field label="Rodzaj urlopu"><select value={f.rodzaj} onChange={(e) => set({ rodzaj: e.target.value })}>{Object.keys(RODZ_URLOP).map((k) => <option key={k} value={k}>{RODZAJE[k]}</option>)}</select></Field>
            {ojcowski ? <>
              <DataPole label="Data urodzenia dziecka" hint="Uzupełnij po narodzinach. Informacje o przysposobieniu znajdziesz w poradniku." value={f.urodzenie} onChange={(iso) => set({ urodzenie: iso })} />
              <DataPole label="Początek urlopu" value={f.od} onChange={(iso) => set({ od: iso })} />
              <Field label="Długość urlopu"><select value={f.ojcowskiDni} onChange={(e) => set({ ojcowskiDni: +e.target.value })}>
                <option value={L.urlop_ojcowski_min_czesc_dni}>{tygodnie(L.urlop_ojcowski_min_czesc_dni / 7)}</option>
                <option value={L.urlop_ojcowski_dni}>{tygodnie(L.urlop_ojcowski_dni / 7)}</option>
              </select></Field>
              {koniec && <p>Koniec urlopu: <b>{dataPL(koniec)}</b></p>}
              <Alert>Wniosek złóż co najmniej {T.wniosek_urlop_ojcowski_przed_startem} dni przed urlopem{f.od && koniec ? <> (do {dataPL(dodajDni(f.od, -T.wniosek_urlop_ojcowski_przed_startem))})</> : null}. Dołącz odpis skrócony aktu urodzenia, dokument z zagranicy potwierdzający urodzenie albo kopię jednego z tych dokumentów.</Alert>
              <p><Link href="/poradnik#F14">Sprawdź zasady urlopu ojcowskiego</Link></p>
            </> : <>
              <div className="grid g2">
                <DataPole label="Początek urlopu" value={f.od} onChange={(iso) => set({ od: iso })} />
                <DataPole label="Koniec urlopu" value={f.do} onChange={(iso) => set({ do: iso })} />
              </div>
              {rodzicielski && <Field label="Która to część urlopu?"><select value={f.czesc} onChange={(e) => set({ czesc: +e.target.value })}>{Array.from({ length: L.urlop_rodzicielski_max_czesci }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></Field>}
              <DataPole label={f.rodzaj === "macierzynski" ? "Data urodzenia lub przewidywana data porodu" : "Data urodzenia lub przyjęcia dziecka"} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
              {rodzicielski && <>
                <Field label="Czy drugi rodzic będzie w tym czasie korzystać z urlopu rodzicielskiego lub pobierać zasiłek za ten urlop?">
                  <select value={f.drugi} onChange={(e) => set({ drugi: e.target.value })}>
                    <option value="">Wybierz odpowiedź</option><option value="nie">Nie</option><option value="tak">Tak, podam okres</option>
                  </select>
                </Field>
                {f.drugi === "tak" && <div className="grid g2">
                  <DataPole label="Drugi rodzic: od kiedy?" value={f.drugiOd} onChange={(iso) => set({ drugiOd: iso })} />
                  <DataPole label="Drugi rodzic: do kiedy?" value={f.drugiDo} onChange={(iso) => set({ drugiDo: iso })} />
                </div>}
                <Alert>Możecie skorzystać z urlopu rodzicielskiego w tym samym czasie. Oba okresy liczą się do wspólnej puli. Wniosek złóż co najmniej <b>{T.wniosek_urlop_rodzicielski_przed_startem} dni</b> przed rozpoczęciem.</Alert>
              </>}
              {f.rodzaj === "macierzynski" && <Alert>Jeśli zaczynasz urlop macierzyński przed porodem, dołącz zaświadczenie lekarskie o przewidywanej dacie porodu.</Alert>}
            </>}
          </>}
          {tab === "laczenie" && <>
            <Field label="Wymiar czasu pracy w okresie urlopu" hint="Maksymalnie ½ etatu"><select value={f.etat} onChange={(e) => set({ etat: e.target.value })}><option>1/2</option><option>1/4</option><option>1/3</option><option>2/5</option></select></Field>
            <div className="grid g2"><DataPole label="Od" value={f.od} onChange={(iso) => set({ od: iso })} /><DataPole label="Do" value={f.do} onChange={(iso) => set({ do: iso })} /></div>
            <Alert t="warn">Wniosek składa się co najmniej <b>{T.wniosek_laczenie_z_praca_przed_startem} dni</b> przed rozpoczęciem. Pracodawca może odmówić z przyczyn organizacyjnych – poinformuje o tym w ciągu {T.odmowa_laczenia_z_praca_odpowiedz_pracodawcy} dni.</Alert></>}
          {tab === "zam" && <>
            <Field label="Adresat wniosku"><select value={f.adresat} onChange={(e) => set({ adresat: e.target.value })}><option value="pracodawca">Pracodawca wypłacający zasiłek</option><option value="ZUS">Zakład Ubezpieczeń Społecznych</option></select></Field>
            <label className="check"><input type="checkbox" checked={f.w815} onChange={(e) => set({ w815: e.target.checked })} />Wybieram uśrednioną stawkę zasiłku ({liczba(P.wariant_pelny_wymiar_81_5)}%).</label>
            <p><Link href="/dokumenty">Sprawdź terminy i gdzie złożyć ZAM</Link></p>
            <label className="check"><input type="checkbox" checked={f.przedsiebiorca} onChange={(e) => set({ przedsiebiorca: e.target.checked })} />Prowadzę działalność gospodarczą</label>
            {f.przedsiebiorca && <label className="check"><input type="checkbox" checked={f.chorobowe} onChange={(e) => set({ chorobowe: e.target.checked })} />Mam dobrowolne ubezpieczenie chorobowe</label>}
            <DataPole label="Data urodzenia dziecka / przyjęcia na wychowanie" value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            {okresy.length > 0 ? <Alert t="ok">Okresy zasiłku wstawiono z Twojego planu w kalkulatorze ({okresy.length}).</Alert> : <Alert>Okresy zasiłku uzupełnimy z planu w <a href="/kalkulator">kalkulatorze</a>.</Alert>}</>}
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
            {err && <Alert t="err">{err}</Alert>}
            {wyn && <Alert t="ok">Zapisano wniosek testowy. Numer: <b>{wyn.numerWniosku}</b>. <Sim /></Alert>}
          </div>
        </div>
      </div>
    </>
  );
}
