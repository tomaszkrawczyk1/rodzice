"use client";
import Link from "next/link";
import { DataPole } from "@/components/DataPole";
import { useState } from "react";
import parametry from "../../../data/parametry.json";
import { api } from "@/lib/sesja";
import { dataPL, liczba, pln, tygodnie, opisObliczenia } from "@/lib/format";
import { Alert } from "@/components/ui";
import type { PlanWejscie, PlanWynik } from "@/engine/kalkulator";
import { Pole } from "@/components/Pole";

const L = parametry.limity_dni;
const W = parametry.wymiary_tygodnie;
const P = parametry.procenty;
const niezbywalne = W.niezbywalne_prawo_kazdego_rodzica_rodzicielski;

export default function Ojcowski() {
  const [data, setData] = useState("");
  const [dzieci, setDzieci] = useState(1);
  const [podstawa, setPodstawa] = useState("");
  const [rodzicielski, setRodzicielski] = useState(niezbywalne);
  const [ojcowski, setOjcowski] = useState(L.urlop_ojcowski_dni);
  const [od, setOd] = useState("");
  const [odRodz, setOdRodz] = useState("");
  const [busy, setBusy] = useState(false);
  const [wynik, setWynik] = useState<PlanWynik["okresy"] | null>(null);
  const [blad, setBlad] = useState("");
  const [sprawdz, setSprawdz] = useState(false);
  const limit = (dzieci === 1 ? W.urlop_rodzicielski["1"] : W.urlop_rodzicielski["2_i_wiecej"]) - niezbywalne;

  async function policz() {
    setBlad("");
    setWynik(null);
    setSprawdz(false);
    const kwota = Number(podstawa.replace(/[\s\u00a0]/g, "").replace(",", "."));
    if (!data) return setBlad("Podaj datę urodzenia lub przewidywaną datę porodu.");
    if (!Number.isFinite(kwota) || kwota <= 0) return setBlad("Wpisz dodatnią kwotę podstawy zasiłku.");
    if (!Number.isInteger(rodzicielski) || rodzicielski < 0 || rodzicielski > limit) return setBlad(`Wpisz od 0 do ${limit} tygodni urlopu rodzicielskiego.`);
    if (!rodzicielski && !ojcowski) return setBlad("Wybierz co najmniej jeden okres do obliczenia.");
    if (ojcowski && od && od < data || rodzicielski && odRodz && odRodz < data) return setBlad("Urlop zaplanuj na dzień narodzin dziecka lub później.");

    const wejscie: PlanWejscie = {
      tytul: "porod", dataZdarzenia: data, liczbaDzieci: dzieci, wariant: "zmienny_100_70",
      podstawy: { matka: 0, ojciec: kwota },
      rodzicielski: rodzicielski ? [{ kto: "ojciec", tygodnie: rodzicielski, ...(odRodz ? { od: odRodz } : {}) }] : [],
      ojcowski: ojcowski ? [{ od: od || data, dni: ojcowski }] : [],
    };
    setBusy(true);
    try {
      const plan = await api<PlanWynik>("/api/oblicz/plan", wejscie);
      if (plan.bledy.length) {
        setBlad(plan.bledy.map(opisObliczenia).join(" "));
        return;
      }
      setWynik(plan.okresy.filter((o) => o.kto === "ojciec"));
      setSprawdz(plan.okresy.some((o) => o.kto === "ojciec" && o.podwyzszoneDoSwiadczeniaRodzicielskiego));
    } catch {
      setBlad("Nie udało się policzyć zasiłku. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p>Policz zasiłek za urlop ojcowski lub rodzicielski. Do obliczenia wystarczą dane taty albo drugiego rodzica, który korzysta z urlopu.</p>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <form className="card" onSubmit={(e) => { e.preventDefault(); void policz(); }} onChange={() => { setWynik(null); setBlad(""); }}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <DataPole label="Data urodzenia lub przewidywana data porodu" value={data} onChange={(iso) => setData(iso)} />
            <Pole label="Liczba dzieci przy jednym porodzie"><select value={dzieci} onChange={(e) => setDzieci(+e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>)}
            </select></Pole>
            <Pole label="Twoja miesięczna podstawa zasiłku (zł)" hint="Sprawdź kwotę w decyzji ZUS lub zapytaj w kadrach."><input inputMode="decimal" value={podstawa} onChange={(e) => setPodstawa(e.target.value)} /></Pole>
            <Pole label="Liczba tygodni urlopu rodzicielskiego" hint={`Każdy rodzic ma ${tygodnie(niezbywalne)} wyłącznie dla siebie. Podaj, ile tygodni chcesz wykorzystać.`}><input type="number" min={0} max={limit} value={rodzicielski} onChange={(e) => setRodzicielski(+e.target.value)} /></Pole>
            {rodzicielski > 0 && <DataPole label="Początek urlopu rodzicielskiego" hint="Bez daty przyjmiemy początek po zakończeniu urlopu macierzyńskiego." value={odRodz} onChange={(iso) => setOdRodz(iso)} />}
            <Pole label="Urlop ojcowski" hint="Wybierz okres, który chcesz uwzględnić w wyliczeniu."><select value={ojcowski} onChange={(e) => setOjcowski(+e.target.value)}>
              <option value={0}>Nie uwzględniaj</option>
              <option value={L.urlop_ojcowski_min_czesc_dni}>{tygodnie(L.urlop_ojcowski_min_czesc_dni / 7)}</option>
              <option value={L.urlop_ojcowski_dni}>{tygodnie(L.urlop_ojcowski_dni / 7)}</option>
            </select></Pole>
            {ojcowski > 0 && <DataPole label="Początek urlopu ojcowskiego" hint="Bez daty przyjmiemy dzień narodzin dziecka." value={od} onChange={(iso) => setOd(iso)} />}
            <button className="btn btn-primary">{busy ? "Liczymy zasiłek…" : "Policz zasiłek"}</button>
          </fieldset>
          {blad && <Alert t="err">{blad}</Alert>}
        </form>
        <section className="card" aria-live="polite">
          <h2>Wyliczenie zasiłku</h2>
          {wynik ? <>
            <p>Łącznie przed zaliczką na podatek: <b>{pln(wynik.reduce((s, o) => s + o.kwota, 0))}</b></p>
            <ul className="clean">{wynik.map((o, i) => <li key={i}>
              <b>{o.rodzaj === "ojcowski" ? "Urlop ojcowski" : "Urlop rodzicielski"}</b>
              <div>{dataPL(o.od)} do {dataPL(o.do)}</div>
              <div>{pln(o.kwota)} ({liczba(o.procent)}% podstawy)</div>
            </li>)}</ul>
            {sprawdz && <Alert t="warn">Wyliczenie uwzględnia podwyższenie do kwoty świadczenia rodzicielskiego. Sprawdź w ZUS, czy dotyczy Twojej sytuacji.</Alert>}
            {ojcowski > 0 && <p className="mt"><Link href="/wnioski?urlop=ojcowski">Przygotuj wniosek o urlop ojcowski</Link></p>}
          </> : <p>Urlop ojcowski: {liczba(P.zasilek_za_urlop_ojcowski)}% podstawy zasiłku. Urlop rodzicielski w tym wyliczeniu: {liczba(P.zasilek_za_urlop_rodzicielski)}% podstawy.</p>}
        </section>
      </div>
    </>
  );
}
