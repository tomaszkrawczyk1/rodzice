"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/sesja";
import { pln, dataPL, dataKrotka, RODZAJE, tygodnie } from "@/lib/format";
import Timeline from "@/components/Timeline";
import { Alert, Field, Kroki, Lista, Spin } from "@/components/ui";

type Tryb = "matka" | "oboje" | "laczenie" | "adopcja" | "wlasne";
const plus = (n: number) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const num = (s: string) => (s === "" || s == null ? NaN : Number(String(s).replace(",", ".")));

const START = {
  tryb: "oboje" as Tryb, tytul: "porod", data: plus(100), dzieci: 1, zaZyciem: false, martwe: false,
  bruttoM: "6500", bruttoO: "7000", podstawaM: "", podstawaO: "",
  przedPorodem: 0, ojciecPrzejmuje: 0, rodzM: 32, rodzO: 9, laczTyg: 0, etat: 0.5,
  ojcowski: true, ojcowskiOd: "", uzup: 0, wariant: "zmienny_100_70",
  dataUrDziecka: "", rodzajAdopcji: "przysposobienie", extra: {} as Record<string, any>,
};
type F = typeof START;

export default function Kalkulator() {
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
    try { const pre = JSON.parse(localStorage.getItem("rodzice.prefill") || "null"); if (pre?.podstawaM) { setF((x) => ({ ...x, podstawaM: String(pre.podstawaM), tryb: "wlasne" })); localStorage.removeItem("rodzice.prefill"); } } catch {}
    const q = new URLSearchParams(location.search).get("tryb"); if (q) setF((x) => ({ ...x, tryb: q as Tryb, ...(q === "matka" ? { rodzO: 0, ojcowski: false } : {}), ...(q === "laczenie" ? { rodzM: 14, laczTyg: 20 } : {}), ...(q === "adopcja" ? { tytul: "przysposobienie" } : {}) }));
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
    if (dwoje && f.ojcowski && f.tytul !== "rodzina_zastepcza" && !f.martwe) w.ojcowski = [{ od: f.ojcowskiOd || f.data, dni: 14 }]; else if (!f.extra.ojcowski) delete w.ojcowski;
    if (wiekGranicy) w.wiekGranicyDzieckaData = wiekGranicy;
    return w;
  }, [f, podstawaM, podstawaO, dwoje, wiekGranicy]);

  const seq = useRef(0);
  useEffect(() => {
    if (!(podstawaM > 0)) { setWyn(null); return; }
    const my = ++seq.current; setBusy(true); setBlad("");
    const t = setTimeout(async () => {
      try {
        const r = await api("/api/oblicz/plan", wejscie);
        if (my !== seq.current) return; setWyn(r);
        const { wariant, ...bez } = wejscie; setPor(await api("/api/oblicz/porownanie", bez));
        localStorage.setItem("rodzice.plan", JSON.stringify({ wejscie }));
      } catch (e: any) { if (my === seq.current) { setBlad(e.message); setWyn(null); } } finally { if (my === seq.current) setBusy(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [wejscie, podstawaM]);

  // wymiary (limit rodzicielskiego dla suwaków)
  useEffect(() => { if (!(podstawaM > 0)) return; api("/api/oblicz/plan", { tytul: f.tytul, dataZdarzenia: f.data, liczbaDzieci: f.dzieci, zaswiadczenieZaZyciem: f.zaZyciem, wariant: "zmienny_100_70", podstawy: { matka: podstawaM }, rodzicielski: [] }).then((r) => setWym(r.wymiary)).catch(() => {}); }, [f.tytul, f.data, f.dzieci, f.zaZyciem, podstawaM]);

  const limit = wym?.rodzicielskiTyg ?? 41;
  const zast = wyn ? (f.wariant === "zmienny_100_70" ? wyn : wyn) : null;
  const podzial = () => set({ rodzO: Math.min(9, limit), rodzM: Math.max(limit - 9, 0), laczTyg: 0 });

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
  return (
    <>
      <h1>Kalkulator zasiłku macierzyńskiego</h1>
      <p className="lead">Jeden kalkulator dla wszystkich sytuacji: policzy, ile tygodni i ile pieniędzy przysługuje każdemu z rodziców. Kwoty są <b>przed zaliczką na podatek</b>. Silnik obliczeń to zwykły kod (bez AI) – każdy wynik pokazuje kroki i podstawę.</p>

      <div className="tabs" role="tablist">
        {([["matka", "Matka"], ["oboje", "Oboje rodzice"], ["laczenie", "Praca + urlop rodzicielski"], ["adopcja", "Adopcja / rodzina zastępcza"], ["wlasne", "Moje dane / przykładowa sprawa"]] as [Tryb, string][]).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={f.tryb === k} className={"tab" + (f.tryb === k ? " on" : "")}
            onClick={() => set({ tryb: k, ...(k === "matka" ? { rodzO: 0, ojciecPrzejmuje: 0, ojcowski: false } : k === "oboje" ? { rodzO: 9, rodzM: Math.max(limit - 9, 0), ojcowski: true, laczTyg: 0 } : k === "laczenie" ? { rodzM: 14, laczTyg: 20, rodzO: 9 } : k === "adopcja" ? { tytul: f.tytul === "porod" ? "przysposobienie" : f.tytul } : {}), ...(k !== "adopcja" && f.tytul !== "porod" && k !== "wlasne" ? { tytul: "porod" } : {}) })}>{t}</button>
        ))}
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          {f.tryb === "wlasne" && (
            <div className="card accent">
              <h3>Przykładowa sprawa lub własny wniosek</h3>
              <p className="small muted">Wczytaj gotowy scenariusz (fikcyjna osoba) albo <Link href="/wgraj">wgraj skan wniosku</Link> – podstawa wymiaru zostanie odczytana z dokumentu.</p>
              <Field label="Scenariusz"><select defaultValue="" onChange={(e) => e.target.value && wczytaj(e.target.value)}><option value="">— wybierz —</option>{scen.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.osoba}</option>)}</select></Field>
            </div>
          )}
          <div className="card">
            <h3>1. Zdarzenie</h3>
            <Field label="Co się wydarzyło / wydarzy?"><select value={f.tytul} onChange={(e) => set({ tytul: e.target.value, ...(e.target.value !== "porod" ? { rodzM: 32 } : {}) })}>
              <option value="porod">Poród (urodzenie dziecka)</option><option value="przysposobienie">Przysposobienie (adopcja)</option><option value="rodzina_zastepcza">Rodzina zastępcza niezawodowa</option></select></Field>
            <Field label={f.tytul === "porod" ? "Data porodu (planowana)" : "Data przyjęcia dziecka na wychowanie"}><input type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} /></Field>
            <div className="grid g2">
              <Field label="Liczba dzieci przy jednym porodzie"><select value={f.dzieci} onChange={(e) => set({ dzieci: +e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>)}</select></Field>
              {f.tytul !== "porod" && <Field label="Data urodzenia dziecka" hint="Do limitu wieku (7/10 lat – rodzina zastępcza, 14 lat – adopcja)"><input type="date" value={f.dataUrDziecka} onChange={(e) => set({ dataUrDziecka: e.target.value })} /></Field>}
            </div>
            <label className="check"><input type="checkbox" checked={f.zaZyciem} onChange={(e) => set({ zaZyciem: e.target.checked })} />Dziecko ma zaświadczenie „Za życiem” (dłuższy urlop rodzicielski)</label>
            {f.tytul === "porod" && <label className="check"><input type="checkbox" checked={f.martwe} onChange={(e) => set({ martwe: e.target.checked })} />Dziecko urodziło się martwe</label>}
          </div>

          <div className="card">
            <h3>2. Zarobki (podstawa zasiłku)</h3>
            <div className="grid g2">
              <Field label={dwoje ? "Matka – średnie brutto / mies." : "Średnie wynagrodzenie brutto / mies."} hint="Średnia z 12 miesięcy przed porodem"><input type="number" inputMode="decimal" value={f.bruttoM} onChange={(e) => set({ bruttoM: e.target.value, podstawaM: "" })} /></Field>
              {dwoje && <Field label="Ojciec – średnie brutto / mies."><input type="number" inputMode="decimal" value={f.bruttoO} onChange={(e) => set({ bruttoO: e.target.value, podstawaO: "" })} /></Field>}
            </div>
            <p className="small muted">Podstawa zasiłku = średnia pomniejszona o 13,71% (składki). {podM && <>Matka: <b>{pln(podM.podstawaMiesieczna)}</b></>}{dwoje && podO && <> · Ojciec: <b>{pln(podO.podstawaMiesieczna)}</b></>}</p>
            <details className="dl"><summary>Znam gotową podstawę wymiaru (np. z decyzji lub Z-3)</summary>
              <div className="grid g2 mt"><Field label="Podstawa – matka (zł)"><input type="number" value={f.podstawaM} onChange={(e) => set({ podstawaM: e.target.value })} /></Field>
              {dwoje && <Field label="Podstawa – ojciec (zł)"><input type="number" value={f.podstawaO} onChange={(e) => set({ podstawaO: e.target.value })} /></Field>}</div></details>
            <Kroki kroki={podM?.kroki} tytul="Jak policzono podstawę matki" />
            {podM?.ostrzezenia?.length > 0 && <Lista items={podM.ostrzezenia} warn />}
          </div>

          <div className="card">
            <h3>3. Urlopy i ich podział</h3>
            {f.tytul === "porod" && !f.martwe && <Field label={`Urlop macierzyński przed porodem: ${f.przedPorodem} dni`} hint="Matka może rozpocząć urlop do 6 tygodni (42 dni) przed porodem"><input type="range" min={0} max={42} value={f.przedPorodem} onChange={(e) => set({ przedPorodem: +e.target.value })} /></Field>}
            {!f.martwe && <>
              <Field label={`Urlop rodzicielski – matka: ${tygodnie(f.rodzM)}`} hint={wym ? `Łącznie do ${tygodnie(limit)} dla obojga rodziców` : ""}><input type="range" min={0} max={limit} value={f.rodzM} onChange={(e) => set({ rodzM: +e.target.value })} /></Field>
              {dwoje && <Field label={`Urlop rodzicielski – ojciec: ${tygodnie(f.rodzO)}`} hint="Każdemu rodzicowi przysługuje 9 tygodni wyłącznie dla siebie"><input type="range" min={0} max={limit} value={f.rodzO} onChange={(e) => set({ rodzO: +e.target.value })} /></Field>}
              {dwoje && <button className="btn btn-ghost btn-sm" onClick={podzial}>Ustaw: ojciec 9 tyg., matka reszta</button>}
              <div className="card mt" style={{ background: "#f8fafb" }}>
                <b>Łączenie pracy z urlopem rodzicielskim</b>
                <p className="small muted">Można pracować do ½ etatu u pracodawcy, który udziela urlopu. Urlop wydłuża się proporcjonalnie, a zasiłek maleje proporcjonalnie.</p>
                <Field label={`Tygodnie urlopu rodzicielskiego matki z pracą: ${f.laczTyg}`}><input type="range" min={0} max={60} value={f.laczTyg} onChange={(e) => set({ laczTyg: +e.target.value })} /></Field>
                {f.laczTyg > 0 && <Field label={`Wymiar etatu w pracy: ${f.etat}`}><input type="range" min={0.1} max={0.5} step={0.05} value={f.etat} onChange={(e) => set({ etat: +e.target.value })} /></Field>}
              </div>
              {dwoje && f.tytul !== "rodzina_zastepcza" && <label className="check mt"><input type="checkbox" checked={f.ojcowski} onChange={(e) => set({ ojcowski: e.target.checked })} />Ojciec bierze urlop ojcowski (14 dni)</label>}
              {dwoje && f.ojcowski && <Field label="Początek urlopu ojcowskiego" hint="Domyślnie dzień porodu"><input type="date" value={f.ojcowskiOd} onChange={(e) => set({ ojcowskiOd: e.target.value })} /></Field>}
              {dwoje && <Field label={`Ojciec przejmuje końcówkę urlopu macierzyńskiego: ${f.ojciecPrzejmuje} tyg.`} hint="Dopiero po 14 tygodniach wykorzystanych przez matkę"><input type="range" min={0} max={6} value={f.ojciecPrzejmuje} onChange={(e) => set({ ojciecPrzejmuje: +e.target.value })} /></Field>}
              {f.tytul === "porod" && <Field label={`Uzupełniający urlop macierzyński (wcześniak/szpital): ${f.uzup} tyg.`}><input type="range" min={0} max={15} value={f.uzup} onChange={(e) => set({ uzup: +e.target.value })} /></Field>}
              {f.tytul === "porod" && <details className="dl"><summary>Ile przysługuje uzupełniającego? (kalkulator wcześniaka)</summary>
                <div className="grid g2 mt"><Field label="Tydzień ciąży w dniu porodu"><input type="number" value={uzupForm.tc} onChange={(e) => setUzupForm({ ...uzupForm, tc: +e.target.value })} /></Field>
                <Field label="Masa urodzeniowa (g)"><input type="number" value={uzupForm.masa} onChange={(e) => setUzupForm({ ...uzupForm, masa: +e.target.value })} /></Field>
                <Field label="Pobyt w szpitalu – od"><input type="date" value={uzupForm.od} onChange={(e) => setUzupForm({ ...uzupForm, od: e.target.value })} /></Field>
                <Field label="Pobyt w szpitalu – do"><input type="date" value={uzupForm.do} onChange={(e) => setUzupForm({ ...uzupForm, do: e.target.value })} /></Field></div>
                <button className="btn btn-secondary btn-sm" onClick={liczUzup}>Oblicz</button>
                {uzupWyn && (uzupWyn.error ? <Alert t="err">{uzupWyn.error}</Alert> : <Alert t="ok">Przysługuje <b>{tygodnie(uzupWyn.tygodnie)}</b> ({uzupWyn.przypadek}, dni w oknie: {uzupWyn.dniWOknie}). <button className="btn btn-sm btn-ghost" onClick={() => set({ uzup: uzupWyn.tygodnie })}>Użyj w planie</button></Alert>)}</details>}
            </>}
          </div>

          <div className="card">
            <h3>4. Wariant wysokości zasiłku</h3>
            <label className="check"><input type="radio" name="w" checked={f.wariant === "zmienny_100_70"} onChange={() => set({ wariant: "zmienny_100_70" })} />Standardowy: 100% za urlop macierzyński, 70% za rodzicielski</label>
            <label className="check"><input type="radio" name="w" checked={f.wariant === "usredniony_81_5"} onChange={() => set({ wariant: "usredniony_81_5" })} />Uśredniony: 81,5% przez cały okres (wniosek najpóźniej 21 dni po porodzie)</label>
          </div>
        </div>

        <div style={{ position: "sticky", top: 90 }}>
          {!(podstawaM > 0) && <Alert>Podaj zarobki, aby zobaczyć wynik.</Alert>}
          {blad && <Alert t="err">{blad}</Alert>}
          {busy && <p><Spin /> Liczę…</p>}
          {wyn && (
            <>
              <div className="card accent">
                <h2>Wynik</h2>
                <div className="grid g3">
                  <div className="stat"><div className="v">{pln(wyn.sumy.razem)}</div><div className="l">razem zasiłków</div></div>
                  <div className="stat"><div className="v">{pln(wyn.sumy.matka)}</div><div className="l">matka / rodzic 1</div></div>
                  {dwoje && <div className="stat"><div className="v">{pln(wyn.sumy.ojciec)}</div><div className="l">ojciec / rodzic 2</div></div>}
                </div>
                <p className="small muted mt">Wymiar: macierzyński <b>{tygodnie(wyn.wymiary.macierzynskiTyg)}</b>, rodzicielski <b>{tygodnie(wyn.wymiary.rodzicielskiTyg)}</b> (wykorzystano {tygodnie(wyn.wymiary.rodzicielskiWykorzystaneTyg)}; przy łączeniu z pracą maks. {tygodnie(wyn.wymiary.rodzicielskiMaxPrzyLaczeniuTyg)}).</p>
                {wyn.bledy?.map((b: string, i: number) => <Alert key={i} t="err">{b}</Alert>)}
                {wyn.ostrzezenia?.map((b: string, i: number) => <Alert key={i} t="warn">{b}</Alert>)}
              </div>
              <div className="card"><h3>Oś czasu</h3><Timeline okresy={wyn.okresy} start={f.data} /></div>
              <div className="card"><h3>Okresy i kwoty</h3>
                <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Rodzaj</th><th>Kto</th><th>Od – do</th><th className="num">Dni</th><th className="num">%</th><th className="num">Kwota</th></tr></thead>
                  <tbody>{zasilki.map((o: any, i: number) => <tr key={i}><td>{RODZAJE[o.rodzaj] ?? o.rodzaj}{o.podwyzszoneDoSwiadczeniaRodzicielskiego && <span className="badge warn"> do 1000 zł</span>}{o.uwagi && <div className="small muted">{o.uwagi}</div>}</td><td>{o.kto}</td>
                    <td>{dataKrotka(o.od)} – {dataKrotka(o.do)}</td><td className="num">{o.dni}</td><td className="num">{o.procent}{o.wspolczynnikZasilku !== 1 ? ` × ${o.wspolczynnikZasilku}` : ""}</td><td className="num">{pln(o.kwota)}</td></tr>)}</tbody>
                  <tfoot><tr><td colSpan={5}>Razem</td><td className="num">{pln(wyn.sumy.razem)}</td></tr></tfoot></table></div>
                <Kroki kroki={wyn.kroki} />
              </div>
              {por && <div className="card navy"><h3>Porównanie wariantów</h3>
                <div className="grid g2"><div className="stat"><div className="v">{pln(por.zmienny_100_70.sumy.razem)}</div><div className="l">standardowy 100% / 70%</div></div>
                <div className="stat"><div className="v">{pln(por.usredniony_81_5.sumy.razem)}</div><div className="l">uśredniony 81,5%</div></div></div>
                <Alert t={por.roznicaRazem >= 0 ? "ok" : "warn"}>{por.roznicaRazem >= 0 ? <>Wariant 81,5% daje <b>{pln(por.roznicaRazem)}</b> więcej łącznie. Pamiętaj o terminie: wniosek najpóźniej 21 dni po porodzie.</> : <>Wariant 81,5% daje <b>{pln(-por.roznicaRazem)}</b> mniej łącznie – w Twojej sytuacji bardziej opłaca się wariant standardowy.</>}</Alert>
                <p className="small muted">Wariant uśredniony wypłaca mniej na początku, a więcej w późniejszym okresie – wybierz go, gdy zależy Ci na stałym dochodzie.</p></div>}
              <div className="card"><Link href="/dokumenty" className="btn btn-primary">Co teraz złożyć i do kiedy →</Link></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
