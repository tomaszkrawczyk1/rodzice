"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DataPole } from "@/components/DataPole";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/sesja";
import { pln, dataPL, RODZAJE, tygodnie, liczba, opisObliczenia } from "@/lib/format";
import Timeline from "@/components/Timeline";
import { Alert, Kroki, Lista, Spin } from "@/components/ui";
import { Pole as Field } from "@/components/Pole";
import parametry from "../../../data/parametry.json";
import Ojcowski from "./Ojcowski";

const P = parametry.procenty;
const L = parametry.limity_dni;
const W = parametry.wymiary_tygodnie;
const T = parametry.terminy_dni;
const niezbywalne = W.niezbywalne_prawo_kazdego_rodzica_rodzicielski;
const standard = `${liczba(P.zasilek_za_urlop_macierzynski)}% / ${liczba(P.zasilek_za_urlop_rodzicielski)}%`;
const usredniony = `${liczba(P.wariant_pelny_wymiar_81_5)}%`;

type Tryb = "matka" | "oboje" | "laczenie" | "adopcja" | "wlasne";
const plus = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const num = (s: string) => (s === "" || s == null ? NaN : Number(String(s).replace(",", ".")));

const START = {
  tryb: "oboje" as Tryb, tytul: "porod", data: plus(100), dzieci: 1, zaZyciem: false, martwe: false,
  bruttoM: "6500", bruttoO: "7000", podstawaM: "", podstawaO: "",
  przedPorodem: 0, ojciecPrzejmuje: 0, rodzM: 32, rodzO: niezbywalne, laczTyg: 0, etat: 0.5,
  ojcowski: true, ojcowskiOd: "", uzup: 0, wariant: "zmienny_100_70",
  dataUrDziecka: "", extra: {} as Record<string, any>,
};
type F = typeof START;

function PlanRodziny() {
  const [f, setF] = useState<F>(START);
  const [podM, setPodM] = useState<any>(null);
  const [podO, setPodO] = useState<any>(null);
  const [wyn, setWyn] = useState<any>(null);
  const [por, setPor] = useState<any>(null);
  const [wym, setWym] = useState<any>(null);
  const [blad, setBlad] = useState("");
  const [busy, setBusy] = useState(false);
  const [scen, setScen] = useState<any[]>([]);
  const [uzupForm, setUzupForm] = useState({ tc: 31, masa: 1500, od: "", do: "" });
  const [uzupWyn, setUzupWyn] = useState<any>(null);
  const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }));
  const dwoje = f.tryb !== "matka";

  useEffect(() => { api("/api/scenariusze").then((j) => setScen((j.przypadki || []).filter((c: any) => c.wejscie?.tytul))).catch(() => {}); }, []);
  useEffect(() => {
    try { const pre = JSON.parse(localStorage.getItem("rodzice.prefill") || "null"); if (pre?.podstawaM) { setF((x) => ({ ...x, podstawaM: String(pre.podstawaM), bruttoM: "", tryb: "wlasne", ...(pre.data ? { data: pre.data } : {}), ...(pre.dzieci ? { dzieci: Math.min(pre.dzieci, 5) } : {}) })); localStorage.removeItem("rodzice.prefill"); } } catch {}
    const q = new URLSearchParams(location.search).get("tryb"); if (q && ["matka", "oboje", "laczenie", "adopcja", "wlasne"].includes(q)) setF((x) => ({ ...x, tryb: q as Tryb, ...(q === "matka" ? { rodzO: 0, ojcowski: false } : {}), ...(q === "laczenie" ? { rodzM: 14, laczTyg: 20 } : {}), ...(q === "adopcja" ? { tytul: "przysposobienie", ojcowski: false } : {}) }));
  }, []);

  // podstawa wymiaru z wynagrodzenia brutto
  useEffect(() => { const b = num(f.bruttoM); if (!(b >= 0)) return setPodM(null); const t = setTimeout(() => api("/api/oblicz/podstawa", { typ: "pracownik", sredniaBrutto: b }).then(setPodM).catch(() => setPodM(null)), 250); return () => clearTimeout(t); }, [f.bruttoM]);
  useEffect(() => { const b = num(f.bruttoO); if (!(b >= 0) || !dwoje) return setPodO(null); const t = setTimeout(() => api("/api/oblicz/podstawa", { typ: "pracownik", sredniaBrutto: b }).then(setPodO).catch(() => setPodO(null)), 250); return () => clearTimeout(t); }, [f.bruttoO, dwoje]);

  const podstawaM = !Number.isNaN(num(f.podstawaM)) ? num(f.podstawaM) : podM?.podstawaMiesieczna;
  const podstawaO = !Number.isNaN(num(f.podstawaO)) ? num(f.podstawaO) : podO?.podstawaMiesieczna;

  const wiekGranicy = useMemo(() => {
    if (f.tytul === "porod" || !f.dataUrDziecka) return undefined;
    const lat = f.tytul === "przysposobienie" ? 14 : 7; const d = new Date(f.dataUrDziecka + "T00:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() + lat); return d.toISOString().slice(0, 10);
  }, [f.tytul, f.dataUrDziecka]);

  const wejscie = useMemo(() => {
    const rodz: any[] = [];
    if (f.rodzM > 0) rodz.push({ kto: "matka", tygodnie: f.rodzM });
    if (f.laczTyg > 0) rodz.push({ kto: "matka", tygodnie: f.laczTyg, wspolczynnikPracy: f.etat });
    if (dwoje && f.rodzO > 0) rodz.push({ kto: "ojciec", tygodnie: f.rodzO });
    const w: any = { ...f.extra, tytul: f.tytul, dataZdarzenia: f.data, liczbaDzieci: f.dzieci, zaswiadczenieZaZyciem: f.zaZyciem, wariant: f.wariant,
      podstawy: { matka: podstawaM, ...(dwoje && podstawaO ? { ojciec: podstawaO } : {}) }, rodzicielski: f.martwe ? [] : rodz };
    if (f.martwe) w.martwe = {}; else delete w.martwe;
    if (f.tytul === "porod" && f.przedPorodem > 0) w.przedPorodemDni = f.przedPorodem; else if (f.tytul === "porod") delete w.przedPorodemDni;
    if (dwoje && f.ojciecPrzejmuje > 0) w.macierzynskiOjciecPrzejmujeTyg = f.ojciecPrzejmuje; else if (!f.extra.macierzynskiOjciecPrzejmujeDni) delete w.macierzynskiOjciecPrzejmujeTyg;
    if (f.uzup > 0 && !f.martwe) w.uzupelniajacy = { kto: "matka", tygodnie: f.uzup }; else delete w.uzupelniajacy;
    if (dwoje && f.ojcowski && f.tytul === "porod" && !f.martwe) w.ojcowski = [{ od: f.ojcowskiOd || f.data, dni: L.urlop_ojcowski_dni }]; else if (!f.extra.ojcowski) delete w.ojcowski;
    if (wiekGranicy) w.wiekGranicyDzieckaData = wiekGranicy;
    return w;
  }, [f, podstawaM, podstawaO, dwoje, wiekGranicy]);

  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    setWyn(null);
    setPor(null);
    setBlad("");
    if (!f.data || !(podstawaM > 0)) { setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await api("/api/oblicz/plan", wejscie);
        if (my !== seq.current) return;
        setWyn(r);
        if (r.bledy.length) return;
        const { wariant, ...bez } = wejscie;
        const porownanie = await api("/api/oblicz/porownanie", bez);
        if (my !== seq.current) return;
        setPor(porownanie);
        try { localStorage.setItem("rodzice.plan", JSON.stringify({ wejscie })); } catch {}
      } catch {
        if (my === seq.current) setBlad("Nie udało się policzyć zasiłku. Sprawdź wpisane dane.");
      } finally {
        if (my === seq.current) setBusy(false);
      }
    }, 350);
    return () => { clearTimeout(t); ++seq.current; };
  }, [wejscie, podstawaM, f.data]);

  useEffect(() => {
    if (!f.data || !(podstawaM > 0)) return;
    let aktualne = true;
    api("/api/oblicz/plan", { tytul: f.tytul, dataZdarzenia: f.data, liczbaDzieci: f.dzieci, zaswiadczenieZaZyciem: f.zaZyciem, wariant: "zmienny_100_70", podstawy: { matka: podstawaM }, rodzicielski: [] })
      .then((r) => { if (aktualne) setWym(r.wymiary); }).catch(() => {});
    return () => { aktualne = false; };
  }, [f.tytul, f.data, f.dzieci, f.zaZyciem, podstawaM]);

  const limit = wym?.rodzicielskiTyg ?? W.urlop_rodzicielski["1"];
  const podzial = () => set({ rodzO: Math.min(niezbywalne, limit), rodzM: Math.max(limit - niezbywalne, 0), laczTyg: 0 });

  function wczytaj(id: string) {
    const c = scen.find((x) => x.id === id); if (!c) return; const w = c.wejscie;
    const { tytul, dataZdarzenia, liczbaDzieci, zaswiadczenieZaZyciem, wariant, podstawy, rodzicielski, ojcowski, uzupelniajacy, przedPorodemDni, macierzynskiOjciecPrzejmujeTyg, martwe, wiekGranicyDzieckaData, ...reszta } = w;
    const bl = rodzicielski || []; const m1 = bl.find((b: any) => b.kto === "matka" && !b.wspolczynnikPracy); const m2 = bl.find((b: any) => b.kto === "matka" && b.wspolczynnikPracy); const o = bl.find((b: any) => b.kto === "ojciec");
    const tryb: Tryb = tytul !== "porod" ? "adopcja" : m2 ? "laczenie" : (podstawy?.ojciec || reszta.macierzynskiOjciecPrzejmujeDni) ? "oboje" : "matka";
    setF({ ...START, tryb, tytul, data: dataZdarzenia, dzieci: liczbaDzieci, zaZyciem: !!zaswiadczenieZaZyciem, martwe: !!martwe, bruttoM: "", bruttoO: "", podstawaM: String(podstawy?.matka ?? ""), podstawaO: String(podstawy?.ojciec ?? ""),
      przedPorodem: przedPorodemDni ?? 0, ojciecPrzejmuje: macierzynskiOjciecPrzejmujeTyg ?? 0, rodzM: m1?.tygodnie ?? 0, laczTyg: m2?.tygodnie ?? 0, etat: m2?.wspolczynnikPracy ?? 0.5, rodzO: o?.tygodnie ?? 0,
      ojcowski: !!ojcowski, ojcowskiOd: ojcowski?.[0]?.od ?? "", uzup: uzupelniajacy?.tygodnie ?? 0, wariant: wariant ?? "zmienny_100_70", extra: reszta });
  }

  async function liczUzup() {
    try { setUzupWyn(await api("/api/oblicz/uzupelniajacy", { dataPorodu: f.data, tydzienCiazyUkonczone: uzupForm.tc, masaUrodzeniowaG: uzupForm.masa, pobytySzpital: uzupForm.od && uzupForm.do ? [{ od: uzupForm.od, do: uzupForm.do }] : [] })); } catch (e: any) { setUzupWyn({ error: e.message }); }
  }

  const zasilki = wyn?.okresy ?? [];
  const przyjecie = f.tytul !== "porod";
  const rodzicPierwszy = przyjecie ? "Rodzic 1" : "Matka";
  const rodzicDrugi = przyjecie ? "Rodzic 2" : "Ojciec";
  const rola = (kto: string) => kto === "matka" ? rodzicPierwszy : rodzicDrugi;
  return (
    <>
      <p className="lead">Zaplanuj urlopy i porównaj kwoty dla rodziny. Zasiłek pokazujemy przed zaliczką na podatek. Kwoty startowe są przykładowe.</p>

      <div className="tabs" role="group" aria-label="Ustawienia planu">
        {([["matka", "Plan dla mamy"], ["oboje", "Oboje rodzice"], ["laczenie", "Praca + urlop rodzicielski"], ["adopcja", "Adopcja / rodzina zastępcza"], ["wlasne", "Moje dane / przykładowa sprawa"]] as [Tryb, string][]).map(([k, t]) => (
          <button key={k} aria-pressed={f.tryb === k} className={"tab" + (f.tryb === k ? " on" : "")}
            onClick={() => set({ tryb: k, ...(k === "matka" ? { rodzO: 0, ojciecPrzejmuje: 0, ojcowski: false } : k === "oboje" ? { rodzO: niezbywalne, rodzM: Math.max(limit - niezbywalne, 0), ojcowski: true, laczTyg: 0 } : k === "laczenie" ? { rodzM: 14, laczTyg: 20, rodzO: niezbywalne } : k === "adopcja" ? { tytul: f.tytul === "porod" ? "przysposobienie" : f.tytul, martwe: false, ojcowski: false, ojciecPrzejmuje: 0, uzup: 0 } : {}), ...(k !== "adopcja" && f.tytul !== "porod" && k !== "wlasne" ? { tytul: "porod" } : {}) })}>{t}</button>
        ))}
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          {f.tryb === "wlasne" && (
            <div className="card accent">
              <h3>Przykładowa sprawa lub własny wniosek</h3>
              <p className="small muted">Wczytaj gotowy scenariusz (fikcyjna osoba) albo <Link href="/wgraj">wgraj skan wniosku</Link> – podstawa wymiaru zostanie odczytana z dokumentu.</p>
              <Field label="Scenariusz"><select defaultValue="" onChange={(e) => e.target.value && wczytaj(e.target.value)}><option value="">— wybierz —</option>{scen.map((c) => <option key={c.id} value={c.id}>{c.osoba}</option>)}</select></Field>
            </div>
          )}
          <div className="card">
            <h3>1. Zdarzenie</h3>
            <Field label="Co się wydarzyło / wydarzy?"><select value={f.tytul} onChange={(e) => set({ tytul: e.target.value, ...(e.target.value !== "porod" ? { martwe: false, ojcowski: false, ojciecPrzejmuje: 0, uzup: 0 } : {}) })}>
              <option value="porod">Poród (urodzenie dziecka)</option><option value="przysposobienie">Przysposobienie (adopcja)</option><option value="rodzina_zastepcza">Rodzina zastępcza niezawodowa</option></select></Field>
            <DataPole label={f.tytul === "porod" ? "Data urodzenia lub przewidywana data porodu" : "Data przyjęcia dziecka na wychowanie"} value={f.data} onChange={(iso) => set({ data: iso })} />
            <div className="grid g2">
              <Field label={f.tytul === "porod" ? "Liczba dzieci przy jednym porodzie" : "Liczba dzieci przyjmowanych jednocześnie"}><select value={f.dzieci} onChange={(e) => set({ dzieci: +e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>)}</select></Field>
              {f.tytul !== "porod" && <DataPole label="Data urodzenia dziecka" hint="Do limitu wieku (7/10 lat – rodzina zastępcza, 14 lat – adopcja)" value={f.dataUrDziecka} onChange={(iso) => set({ dataUrDziecka: iso })} />}
            </div>
            <label className="check"><input type="checkbox" checked={f.zaZyciem} onChange={(e) => set({ zaZyciem: e.target.checked })} />Dziecko ma zaświadczenie „Za życiem” (dłuższy urlop rodzicielski)</label>
            {f.tytul === "porod" && <label className="check"><input type="checkbox" checked={f.martwe} onChange={(e) => set({ martwe: e.target.checked })} />Dziecko urodziło się martwe</label>}
          </div>

          <div className="card">
            <h3>2. Zarobki (podstawa zasiłku)</h3>
            <div className="grid g2">
              <Field label={dwoje ? `${rodzicPierwszy}: średnie wynagrodzenie brutto` : "Średnie wynagrodzenie brutto"} hint="Wpisz średnie miesięczne wynagrodzenie przed potrąceniami. Jeśli znasz podstawę zasiłku, możesz podać ją niżej."><input type="number" inputMode="decimal" value={f.bruttoM} onChange={(e) => set({ bruttoM: e.target.value, podstawaM: "" })} /></Field>
              {dwoje && <Field label={`${rodzicDrugi}: średnie wynagrodzenie brutto`}><input type="number" inputMode="decimal" value={f.bruttoO} onChange={(e) => set({ bruttoO: e.target.value, podstawaO: "" })} /></Field>}
            </div>
            <p className="small muted">Przy umowie o pracę od średniej odejmujemy składki ({liczba(P.skladki_odliczane_od_podstawy)}%). {podstawaM > 0 && <>{rodzicPierwszy}: <b>{pln(podstawaM)}</b></>}{dwoje && podstawaO > 0 && <> · {rodzicDrugi}: <b>{pln(podstawaO)}</b></>}</p>
            <details className="dl"><summary>Znam gotową podstawę wymiaru (np. z decyzji lub Z-3)</summary>
              <div className="grid g2 mt"><Field label={`${rodzicPierwszy}: podstawa zasiłku (zł)`}><input type="number" value={f.podstawaM} onChange={(e) => set({ podstawaM: e.target.value })} /></Field>
              {dwoje && <Field label={`${rodzicDrugi}: podstawa zasiłku (zł)`}><input type="number" value={f.podstawaO} onChange={(e) => set({ podstawaO: e.target.value })} /></Field>}</div></details>
            <Kroki kroki={podM?.kroki?.map(opisObliczenia)} tytul="Jak policzono podstawę zasiłku" />
            {podM?.ostrzezenia?.length > 0 && <Lista items={podM.ostrzezenia.map(opisObliczenia)} warn />}
          </div>

          <div className="card">
            <h3>3. Urlopy i ich podział</h3>
            {f.tytul === "porod" && !f.martwe && <Field label={`Urlop macierzyński przed porodem: ${f.przedPorodem} dni`} hint={`Urlop można rozpocząć do ${tygodnie(W.macierzynski_przed_porodem_max)} przed porodem.`}><input type="range" min={0} max={W.macierzynski_przed_porodem_max * 7} value={f.przedPorodem} onChange={(e) => set({ przedPorodem: +e.target.value })} /></Field>}
            {!f.martwe && <>
              <Field label={`${rodzicPierwszy}: urlop rodzicielski ${tygodnie(f.rodzM)}`} hint={wym ? `Łącznie do ${tygodnie(limit)} dla obojga rodziców` : ""}><input type="range" min={0} max={limit} value={f.rodzM} onChange={(e) => set({ rodzM: +e.target.value })} /></Field>
              {dwoje && <Field label={`${rodzicDrugi}: urlop rodzicielski ${tygodnie(f.rodzO)}`} hint={`Każdy rodzic ma ${tygodnie(niezbywalne)} wyłącznie dla siebie.`}><input type="range" min={0} max={limit} value={f.rodzO} onChange={(e) => set({ rodzO: +e.target.value })} /></Field>}
              {dwoje && <button className="btn btn-ghost btn-sm" onClick={podzial}>Ustaw {tygodnie(niezbywalne)} dla drugiego rodzica</button>}
              <div className="card mt" style={{ background: "#f8fafb" }}>
                <b>Łączenie pracy z urlopem rodzicielskim</b>
                <p className="small muted">Można pracować do ½ etatu u pracodawcy, który udziela urlopu. Urlop wydłuża się proporcjonalnie, a zasiłek maleje proporcjonalnie.</p>
                <Field label={`${rodzicPierwszy}: tygodnie urlopu połączone z pracą ${f.laczTyg}`}><input type="range" min={0} max={60} value={f.laczTyg} onChange={(e) => set({ laczTyg: +e.target.value })} /></Field>
                {f.laczTyg > 0 && <Field label={`Wymiar etatu w pracy: ${f.etat}`}><input type="range" min={0.1} max={L.laczenie_z_praca_max_wymiar_etatu} step={0.05} value={f.etat} onChange={(e) => set({ etat: +e.target.value })} /></Field>}
              </div>
              {dwoje && f.tytul === "porod" && <label className="check mt"><input type="checkbox" checked={f.ojcowski} onChange={(e) => set({ ojcowski: e.target.checked })} />Uwzględnij urlop ojcowski ({tygodnie(L.urlop_ojcowski_dni / 7)})</label>}
              {dwoje && f.tytul === "porod" && f.ojcowski && <DataPole label="Początek urlopu ojcowskiego" hint="Domyślnie dzień porodu" value={f.ojcowskiOd} onChange={(iso) => set({ ojcowskiOd: iso })} />}
              {dwoje && !przyjecie && <Field label={`Ojciec przejmuje końcówkę urlopu macierzyńskiego: ${f.ojciecPrzejmuje} tyg.`} hint={`Po co najmniej ${W.macierzynski_matka_obowiazkowo_po_porodzie_min} tygodniach urlopu matki po porodzie.`}><input type="range" min={0} max={W.urlop_macierzynski_wg_liczby_dzieci["1"] - W.macierzynski_matka_obowiazkowo_po_porodzie_min} value={f.ojciecPrzejmuje} onChange={(e) => set({ ojciecPrzejmuje: +e.target.value })} /></Field>}
              {f.tytul === "porod" && <Field label={`Uzupełniający urlop macierzyński (wcześniak/szpital): ${f.uzup} tyg.`}><input type="range" min={0} max={W.uzupelniajacy_limit_do_tygodnia_po_porodzie.przed_28_tc_lub_masa_do_1000g} value={f.uzup} onChange={(e) => set({ uzup: +e.target.value })} /></Field>}
              {f.tytul === "porod" && <details className="dl"><summary>Ile przysługuje uzupełniającego? (kalkulator wcześniaka)</summary>
                <div className="grid g2 mt"><Field label="Tydzień ciąży w dniu porodu"><input type="number" value={uzupForm.tc} onChange={(e) => setUzupForm({ ...uzupForm, tc: +e.target.value })} /></Field>
                <Field label="Masa urodzeniowa (g)"><input type="number" value={uzupForm.masa} onChange={(e) => setUzupForm({ ...uzupForm, masa: +e.target.value })} /></Field>
                <DataPole label="Pobyt w szpitalu – od" value={uzupForm.od} onChange={(iso) => setUzupForm({ ...uzupForm, od: iso })} />
                <DataPole label="Pobyt w szpitalu – do" value={uzupForm.do} onChange={(iso) => setUzupForm({ ...uzupForm, do: iso })} /></div>
                <button className="btn btn-secondary btn-sm" onClick={liczUzup}>Policz dodatkowy urlop</button>
                {uzupWyn && (uzupWyn.error ? <Alert t="err">{uzupWyn.error}</Alert> : <Alert t="ok">Przysługuje <b>{tygodnie(uzupWyn.tygodnie)}</b> (uwzględnione dni pobytu: {uzupWyn.dniWOknie}). <button className="btn btn-sm btn-ghost" onClick={() => set({ uzup: uzupWyn.tygodnie })}>Dodaj urlop do planu</button></Alert>)}</details>}
            </>}
          </div>

          <div className="card">
            <h3>4. Wariant wysokości zasiłku</h3>
            <label className="check"><input type="radio" name="w" checked={f.wariant === "zmienny_100_70"} onChange={() => set({ wariant: "zmienny_100_70" })} />Standardowy ({standard}): wyższa stawka na początku, niższa na urlopie rodzicielskim</label>
            <label className="check"><input type="radio" name="w" checked={f.wariant === "usredniony_81_5"} onChange={() => set({ wariant: "usredniony_81_5" })} />Uśredniony ({usredniony}): wniosek w ciągu {przyjecie ? T.adopcja_wniosek_81_5_po_przyjeciu : T.wniosek_pelny_wymiar_81_5_po_porodzie} dni {przyjecie ? "od przyjęcia dziecka" : "od porodu"}. Wyłączne tygodnie drugiego rodzica zachowują stawkę {liczba(P.zasilek_za_9_tyg_drugiego_rodzica)}%.</label>
          </div>
        </div>

        <div style={{ position: "sticky", top: 90 }}>
          {!f.data && <Alert>Wpisz datę, aby zobaczyć wynik.</Alert>}
          {!(podstawaM > 0) && <Alert>Podaj zarobki lub podstawę zasiłku, aby zobaczyć wynik.</Alert>}
          {blad && <Alert t="err">{blad}</Alert>}
          {busy && <p><Spin /> Liczę…</p>}
          {wyn && (
            <>
              <div className="card accent">
                <h2>Wynik</h2>
                <div className="grid g3">
                  <div className="stat"><div className="v">{pln(wyn.sumy.razem)}</div><div className="l">razem zasiłków</div></div>
                  <div className="stat"><div className="v">{pln(wyn.sumy.matka)}</div><div className="l">{rodzicPierwszy}</div></div>
                  {dwoje && <div className="stat"><div className="v">{pln(wyn.sumy.ojciec)}</div><div className="l">{rodzicDrugi}</div></div>}
                </div>
                <p className="small muted mt">Wymiar: {przyjecie ? "urlop na warunkach macierzyńskiego" : "urlop macierzyński"} <b>{tygodnie(wyn.wymiary.macierzynskiTyg)}</b>, rodzicielski <b>{tygodnie(wyn.wymiary.rodzicielskiTyg)}</b> (wykorzystano {tygodnie(wyn.wymiary.rodzicielskiWykorzystaneTyg)}; przy łączeniu z pracą maks. {tygodnie(wyn.wymiary.rodzicielskiMaxPrzyLaczeniuTyg)}).</p>
                {wyn.bledy?.map((b: string, i: number) => <Alert key={i} t="err">{opisObliczenia(b)}</Alert>)}
                {wyn.ostrzezenia?.map((b: string, i: number) => <Alert key={i} t="warn">{opisObliczenia(b)}</Alert>)}
              </div>
              <div className="card"><h3>Oś czasu</h3><Timeline okresy={wyn.okresy} start={f.data} etykiety={{ matka: rodzicPierwszy, ojciec: rodzicDrugi }} /></div>
              <div className="card"><h3>Okresy i kwoty</h3>
                <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>Rodzaj</th><th>Kto</th><th>Od – do</th><th className="num">Dni</th><th className="num">%</th><th className="num">Kwota</th></tr></thead>
                  <tbody>{zasilki.map((o: any, i: number) => <tr key={i}><td data-label="Rodzaj">{RODZAJE[o.rodzaj] ?? "Okres zasiłku"}{o.podwyzszoneDoSwiadczeniaRodzicielskiego && <span className="badge warn"> do {pln(parametry.kwoty.swiadczenie_rodzicielskie_miesieczne)}</span>}{o.uwagi && <div className="small muted">{o.uwagi}</div>}</td><td data-label="Kto">{rola(o.kto)}</td>
                    <td data-label="Od – do">{dataPL(o.od)} do {dataPL(o.do)}</td><td className="num" data-label="Dni">{o.dni}</td><td className="num" data-label="%">{liczba(o.procent)}{o.wspolczynnikZasilku !== 1 ? ` × ${liczba(o.wspolczynnikZasilku)}` : ""}</td><td className="num" data-label="Kwota">{pln(o.kwota)}</td></tr>)}</tbody>
                  <tfoot><tr><td colSpan={5}>Razem</td><td className="num" data-label="Razem">{pln(wyn.sumy.razem)}</td></tr></tfoot></table></div>
                <Kroki kroki={wyn.kroki.map(opisObliczenia)} />
              </div>
              {por && <div className="card navy"><h3>Porównanie wariantów</h3>
                <div className="grid g2"><div className="stat"><div className="v">{pln(por.zmienny_100_70.sumy.razem)}</div><div className="l">standardowy {standard}</div></div>
                <div className="stat"><div className="v">{pln(por.usredniony_81_5.sumy.razem)}</div><div className="l">uśredniony {usredniony}</div></div></div>
                <p className="mt">Różnica łącznych kwot: <b>{pln(Math.abs(por.roznicaRazem))}</b>{por.roznicaRazem !== 0 && (por.roznicaRazem > 0 ? " na korzyść wariantu uśrednionego" : " na korzyść wariantu standardowego")}.</p>
                <p className="small muted">Porównaj też wypłaty w poszczególnych okresach. Przy uśrednionej stawce na początku wypłata jest niższa, a na urlopie rodzicielskim może być wyższa.</p></div>}
              <div className="card"><Link href="/dokumenty" className="btn btn-primary">Sprawdź dokumenty i terminy</Link></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}


function ZakresKalkulatora() {
  const query = useSearchParams();
  const tryb = query.get("tryb");
  const tylkoOjciec = tryb === "ojciec";


  return (
    <>
      <h1>Kalkulator zasiłku macierzyńskiego</h1>
      <nav className="tabs" aria-label="Wybierz zakres obliczeń">
        <Link className={`tab${tylkoOjciec === false ? " on" : ""}`} href="/kalkulator" aria-current={tylkoOjciec === false ? "page" : undefined}>Plan rodziny lub adopcja</Link>
        <Link className={`tab${tylkoOjciec ? " on" : ""}`} href="/kalkulator?tryb=ojciec" aria-current={tylkoOjciec ? "page" : undefined}>Tata lub drugi rodzic</Link>
      </nav>
      {tylkoOjciec ? <Ojcowski /> : <PlanRodziny key={tryb} />}
    </>
  );
}


export default function Kalkulator() {
  return <Suspense fallback={<h1>Kalkulator zasiłku macierzyńskiego</h1>}><ZakresKalkulatora /></Suspense>;
}
