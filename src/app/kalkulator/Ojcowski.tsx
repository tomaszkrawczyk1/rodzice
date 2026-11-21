"use client";
import Link from "next/link";
import { DataPole } from "@/components/DataPole";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/sesja";
import { dataPL, liczba, pln, tygodnie, opisObliczenia } from "@/lib/format";
import { Alert } from "@/components/ui";
import type { PlanWejscie, PlanWynik } from "@/engine/kalkulator";
import { Pole } from "@/components/Pole";
import { Kreator, useKreator, type KrokDef } from "./Kreator";
import { WyborSytuacji } from "./WyborSytuacji";
import { L, W, P, niezbywalne, type Sytuacja } from "./stale";
import css from "./kalkulator.module.css";

const KROKI: KrokDef[] = [
  { id: "sytuacja", nazwa: "Sytuacja", tytul: "Dla kogo liczysz?" },
  { id: "dziecko", nazwa: "Dziecko", tytul: "Dziecko i podstawa zasiłku" },
  { id: "urlopy", nazwa: "Urlopy", tytul: "Urlopy taty lub drugiego rodzica" },
  { id: "wynik", nazwa: "Wynik", tytul: "Wyliczenie zasiłku" },
];
const K = { sytuacja: 0, dziecko: 1, urlopy: 2, wynik: 3 };

type Zapisany = { klucz: string; okresy: PlanWynik["okresy"]; sprawdz: boolean };

export default function Ojcowski({ onSytuacja }: { onSytuacja: (s: Sytuacja) => void }) {
  const [data, setData] = useState("");
  const [dzieci, setDzieci] = useState(1);
  const [podstawa, setPodstawa] = useState("");
  const [rodzicielski, setRodzicielski] = useState(niezbywalne);
  const [ojcowski, setOjcowski] = useState(L.urlop_ojcowski_dni);
  const [od, setOd] = useState("");
  const [odRodz, setOdRodz] = useState("");
  const [busy, setBusy] = useState(false);
  const [zapisany, setZapisany] = useState<Zapisany | null>(null);
  const [blad, setBlad] = useState("");
  const [pokazBledy, setPokazBledy] = useState(false);
  const [fokusBledu, setFokusBledu] = useState(0);
  const tresc = useRef<HTMLDivElement>(null);
  const { krok, maks, idz } = useKreator(KROKI.length);
  const limit = (dzieci === 1 ? W.urlop_rodzicielski["1"] : W.urlop_rodzicielski["2_i_wiecej"]) - niezbywalne;

  // Błędy pól liczone na bieżąco; pokazujemy je dopiero po kliknięciu „Dalej".
  const kwota = Number(podstawa.replace(/[\s ]/g, "").replace(",", "."));
  const nieWczesniej = "Urlop zaplanuj na dzień narodzin dziecka lub później.";
  const bl = {
    data: !data ? "Podaj datę urodzenia lub przewidywaną datę porodu." : "",
    podstawa: !Number.isFinite(kwota) || kwota <= 0 ? "Wpisz dodatnią kwotę podstawy zasiłku." : "",
    rodz: !Number.isInteger(rodzicielski) || rodzicielski < 0 || rodzicielski > limit ? `Wpisz od 0 do ${limit} tygodni urlopu rodzicielskiego.` : "",
    okres: !rodzicielski && !ojcowski ? "Wybierz co najmniej jeden okres do obliczenia." : "",
    odRodz: Boolean(rodzicielski && odRodz && data && odRodz < data) ? nieWczesniej : "",
    od: Boolean(ojcowski && od && data && od < data) ? nieWczesniej : "",
  };
  const pokaz = (k: keyof typeof bl) => (pokazBledy && bl[k]) || undefined;
  const klucz = JSON.stringify([data, dzieci, kwota, rodzicielski, ojcowski, od, odRodz]);
  const wynik = zapisany?.klucz === klucz ? zapisany : null;   // po zmianie danych stary wynik nie jest pokazywany

  useEffect(() => { if (fokusBledu) tresc.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [fokusBledu]);

  async function policz() {
    setBlad("");
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
      setZapisany({ klucz, okresy: plan.okresy.filter((o) => o.kto === "ojciec"), sprawdz: plan.okresy.some((o) => o.kto === "ojciec" && o.podwyzszoneDoSwiadczeniaRodzicielskiego) });
      setPokazBledy(false);
      idz(K.wynik);
    } catch {
      setBlad("Nie udało się policzyć zasiłku. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  function idzDo(k: number) { setPokazBledy(false); idz(k); }
  function dalej() {
    const bledy = krok === K.dziecko ? [bl.data, bl.podstawa] : krok === K.urlopy ? [bl.rodz, bl.okres, bl.odRodz, bl.od] : [];
    if (bledy.some(Boolean)) { setPokazBledy(true); setFokusBledu((n) => n + 1); return; }
    if (krok === K.urlopy) void policz(); else idzDo(krok + 1);
  }

  return (
    <Kreator kroki={KROKI} krok={krok} maks={maks} onKrok={idzDo} onDalej={dalej} dalejEtykieta={krok === K.urlopy ? (busy ? "Liczymy zasiłek…" : "Policz zasiłek") : "Dalej"} dalejZablokowany={busy}>
      <div ref={tresc}>
        {krok === K.sytuacja && <WyborSytuacji wartosc="ojciec" onZmiana={onSytuacja} />}

        {krok === K.dziecko && (
          <>
            <p className={css.mala}>Do obliczenia wystarczą dane taty albo drugiego rodzica, który korzysta z urlopu.</p>
            <DataPole label="Data urodzenia lub przewidywana data porodu" value={data} onChange={setData} error={pokaz("data")} />
            <Pole label="Liczba dzieci przy jednym porodzie"><select value={dzieci} onChange={(e) => setDzieci(+e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>)}
            </select></Pole>
            <Pole label="Twoja miesięczna podstawa zasiłku (zł)" hint="Sprawdź kwotę w decyzji ZUS lub zapytaj w kadrach." error={pokaz("podstawa")}><input inputMode="decimal" value={podstawa} onChange={(e) => setPodstawa(e.target.value)} /></Pole>
          </>
        )}

        {krok === K.urlopy && (
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <Pole label="Liczba tygodni urlopu rodzicielskiego" hint={`Każdy rodzic ma ${tygodnie(niezbywalne)} wyłącznie dla siebie. Podaj, ile tygodni chcesz wykorzystać.`} error={pokaz("rodz")}><input type="number" min={0} max={limit} value={rodzicielski} onChange={(e) => setRodzicielski(+e.target.value)} /></Pole>
            {rodzicielski > 0 && <DataPole label="Początek urlopu rodzicielskiego" hint="Bez daty przyjmiemy początek po zakończeniu urlopu macierzyńskiego." value={odRodz} onChange={setOdRodz} error={pokaz("odRodz")} />}
            <Pole label="Urlop ojcowski" hint="Wybierz okres, który chcesz uwzględnić w wyliczeniu." error={pokaz("okres")}><select value={ojcowski} onChange={(e) => setOjcowski(+e.target.value)}>
              <option value={0}>Nie uwzględniaj</option>
              <option value={L.urlop_ojcowski_min_czesc_dni}>{tygodnie(L.urlop_ojcowski_min_czesc_dni / 7)}</option>
              <option value={L.urlop_ojcowski_dni}>{tygodnie(L.urlop_ojcowski_dni / 7)}</option>
            </select></Pole>
            {ojcowski > 0 && <DataPole label="Początek urlopu ojcowskiego" hint="Bez daty przyjmiemy dzień narodzin dziecka." value={od} onChange={setOd} error={pokaz("od")} />}
            {blad && <Alert t="err">{blad}</Alert>}
          </fieldset>
        )}

        {krok === K.wynik && (
          <>
            <div role="status">
              {busy && <div className={css.kwota}><p className={css.statusLadowania}><span className="spin" aria-hidden="true" /> Liczymy zasiłek…</p></div>}
              {!busy && wynik && (
                <div className={css.kwota}>
                  <p className={css.kwotaOpis}>Łącznie przed zaliczką na podatek</p>
                  <p className={css.kwotaWartosc}>{pln(wynik.okresy.reduce((s, o) => s + o.kwota, 0))}</p>
                </div>
              )}
            </div>
            {blad && <Alert t="err">{blad}</Alert>}
            {!busy && !wynik && (
              <div className={css.kwota}>
                <p className={css.kwotaOpis}>Łącznie przed zaliczką na podatek</p>
                <p className={`${css.kwotaWartosc} ${css.pusta}`}>— zł</p>
                <p className={css.mala}>Dane zmieniły się od ostatniego wyliczenia.</p>
                <button type="button" className="btn btn-primary" onClick={() => void policz()}>Policz zasiłek</button>
              </div>
            )}
            {wynik && (
              <>
                <ul className={css.lista}>{wynik.okresy.map((o, i) => <li key={i}>
                  <b>{o.rodzaj === "ojcowski" ? "Urlop ojcowski" : "Urlop rodzicielski"}</b>
                  <div>{dataPL(o.od)} do {dataPL(o.do)}</div>
                  <div>{pln(o.kwota)} ({liczba(o.procent)}% podstawy)</div>
                </li>)}</ul>
                {wynik.sprawdz && <Alert t="warn">Wyliczenie uwzględnia podwyższenie do kwoty świadczenia rodzicielskiego. Sprawdź w ZUS, czy dotyczy Twojej sytuacji.</Alert>}
                {ojcowski > 0 && <p className="mt"><Link href="/wnioski?urlop=ojcowski" className="btn btn-secondary">Przygotuj wniosek o urlop ojcowski</Link></p>}
              </>
            )}
            <p className={css.mala}>Urlop ojcowski: {liczba(P.zasilek_za_urlop_ojcowski)}% podstawy zasiłku. Urlop rodzicielski w tym wyliczeniu: {liczba(P.zasilek_za_urlop_rodzicielski)}% podstawy.</p>
          </>
        )}
      </div>
    </Kreator>
  );
}
