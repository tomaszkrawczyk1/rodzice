"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DataPole } from "@/components/DataPole";
import { api } from "@/lib/sesja";
import { pln, tygodnie, liczba, opisObliczenia } from "@/lib/format";
import { Alert, Kroki, Lista } from "@/components/ui";
import { Pole as Field } from "@/components/Pole";
import { Kreator, useKreator, type KrokDef } from "./Kreator";
import { WyborSytuacji } from "./WyborSytuacji";
import { P, L, W, T, niezbywalne, standard, usredniony, num, type Tryb, type Sytuacja } from "./stale";
import css from "./kalkulator.module.css";

// Oś czasu, tabela i porównanie wariantów ładują się dopiero przy ostatnim kroku.
const WynikSzczegoly = dynamic(() => import("./WynikSzczegoly"), {
  loading: () => <p role="status" className={css.statusLadowania}><span className="spin" aria-hidden="true" /> Wczytuję szczegóły wyniku…</p>,
});

const KROKI: KrokDef[] = [
  { id: "sytuacja", nazwa: "Sytuacja", tytul: "Dla kogo liczysz?" },
  { id: "dziecko", nazwa: "Dziecko", tytul: "Dziecko i data zdarzenia" },
  { id: "zarobki", nazwa: "Zarobki", tytul: "Zarobki (podstawa zasiłku)" },
  { id: "urlopy", nazwa: "Urlopy", tytul: "Urlopy i ich podział" },
  { id: "wariant", nazwa: "Wariant", tytul: "Wariant wysokości zasiłku" },
  { id: "wynik", nazwa: "Wynik", tytul: "Wynik" },
];
const K = { sytuacja: 0, dziecko: 1, zarobki: 2, urlopy: 3, wariant: 4, wynik: 5 };

// Data zdarzenia startuje pusta: nie zgadujemy jej za użytkownika (poprzednio „dziś + 100 dni" przy każdym wejściu).
const START = {
  tryb: "oboje" as Tryb, tytul: "porod", data: "", dzieci: 1, zaZyciem: false, martwe: false,
  bruttoM: "6500", bruttoO: "7000", podstawaM: "", podstawaO: "",
  przedPorodem: 0, ojciecPrzejmuje: 0, rodzM: 32, rodzO: niezbywalne, laczTyg: 0, etat: 0.5,
  ojcowski: true, ojcowskiOd: "", uzup: 0, wariant: "zmienny_100_70",
  dataUrDziecka: "", extra: {} as Record<string, any>,
};
type F = typeof START;

/** Ustawienia dla trybu wybranego w adresie (?tryb=…) albo przy wejściu z innej ścieżki kalkulatora. */
function stanPoczatkowy(tryb: Tryb): F {
  const dod: Partial<F> =
    tryb === "matka" ? { rodzO: 0, ojcowski: false }
    : tryb === "laczenie" ? { rodzM: 14, laczTyg: 20 }
    : tryb === "adopcja" ? { tytul: "przysposobienie", ojcowski: false }
    : {};
  return { ...START, tryb, ...dod };
}

export default function PlanRodziny({ poczatkowy, onOjciec }: { poczatkowy: Tryb; onOjciec: () => void }) {
  const [f, setF] = useState<F>(() => stanPoczatkowy(poczatkowy));
  const [podM, setPodM] = useState<any>(null);
  const [podO, setPodO] = useState<any>(null);
  const [wyn, setWyn] = useState<any>(null);
  const [por, setPor] = useState<any>(null);
  const [wym, setWym] = useState<any>(null);
  const [blad, setBlad] = useState("");
  const [busy, setBusy] = useState(false);
  const [scen, setScen] = useState<any[]>([]);
  const [wczytano, setWczytano] = useState("");
  const [uzupForm, setUzupForm] = useState({ tc: 31, masa: 1500, od: "", do: "" });
  const [uzupWyn, setUzupWyn] = useState<any>(null);
  const [laczReczne, setLaczReczne] = useState<boolean | null>(null);
  const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }));
  const dwoje = f.tryb !== "matka";

  const { krok, maks, idz } = useKreator(KROKI.length);
  const [pokazBledy, setPokazBledy] = useState(false);
  const [fokusBledu, setFokusBledu] = useState(0);
  const tresc = useRef<HTMLDivElement>(null);
  const wariantNazwa = useId();

  // Gotowe scenariusze pobieramy dopiero, gdy ktoś wybierze „Moje dane / przykładowa sprawa".
  useEffect(() => {
    if (f.tryb !== "wlasne" || scen.length) return;
    api("/api/scenariusze").then((j) => setScen((j.przypadki || []).filter((c: any) => c.wejscie?.tytul))).catch(() => {});
  }, [f.tryb, scen.length]);
  useEffect(() => {
    try {
      const pre = JSON.parse(localStorage.getItem("rodzice.prefill") || "null");
      if (pre?.podstawaM) {
        setF((x) => ({ ...x, podstawaM: String(pre.podstawaM), bruttoM: "", tryb: "wlasne", ...(pre.data ? { data: pre.data } : {}), ...(pre.dzieci ? { dzieci: Math.min(pre.dzieci, 5) } : {}) }));
        setWczytano(`Wczytano dane z wgranego dokumentu: podstawa zasiłku ${pln(Number(pre.podstawaM))}.`);
        localStorage.removeItem("rodzice.prefill");
      }
    } catch {}
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

  function zmienTryb(k: Tryb) {
    set({ tryb: k, ...(k === "matka" ? { rodzO: 0, ojciecPrzejmuje: 0, ojcowski: false } : k === "oboje" ? { rodzO: niezbywalne, rodzM: Math.max(limit - niezbywalne, 0), ojcowski: true, laczTyg: 0 } : k === "laczenie" ? { rodzM: 14, laczTyg: 20, rodzO: niezbywalne } : k === "adopcja" ? { tytul: f.tytul === "porod" ? "przysposobienie" : f.tytul, martwe: false, ojcowski: false, ojciecPrzejmuje: 0, uzup: 0 } : {}), ...(k !== "adopcja" && f.tytul !== "porod" && k !== "wlasne" ? { tytul: "porod" } : {}) });
    setLaczReczne(null);
  }

  function wczytaj(id: string) {
    const c = scen.find((x) => x.id === id); if (!c) return; const w = c.wejscie;
    const { tytul, dataZdarzenia, liczbaDzieci, zaswiadczenieZaZyciem, wariant, podstawy, rodzicielski, ojcowski, uzupelniajacy, przedPorodemDni, macierzynskiOjciecPrzejmujeTyg, martwe, wiekGranicyDzieckaData, ...reszta } = w;
    const bl = rodzicielski || []; const m1 = bl.find((b: any) => b.kto === "matka" && !b.wspolczynnikPracy); const m2 = bl.find((b: any) => b.kto === "matka" && b.wspolczynnikPracy); const o = bl.find((b: any) => b.kto === "ojciec");
    const tryb: Tryb = tytul !== "porod" ? "adopcja" : m2 ? "laczenie" : (podstawy?.ojciec || reszta.macierzynskiOjciecPrzejmujeDni) ? "oboje" : "matka";
    setF({ ...START, tryb, tytul, data: dataZdarzenia, dzieci: liczbaDzieci, zaZyciem: !!zaswiadczenieZaZyciem, martwe: !!martwe, bruttoM: "", bruttoO: "", podstawaM: String(podstawy?.matka ?? ""), podstawaO: String(podstawy?.ojciec ?? ""),
      przedPorodem: przedPorodemDni ?? 0, ojciecPrzejmuje: macierzynskiOjciecPrzejmujeTyg ?? 0, rodzM: m1?.tygodnie ?? 0, laczTyg: m2?.tygodnie ?? 0, etat: m2?.wspolczynnikPracy ?? 0.5, rodzO: o?.tygodnie ?? 0,
      ojcowski: !!ojcowski, ojcowskiOd: ojcowski?.[0]?.od ?? "", uzup: uzupelniajacy?.tygodnie ?? 0, wariant: wariant ?? "zmienny_100_70", extra: reszta });
    setLaczReczne(null);
    setWczytano(`Wczytano scenariusz: ${c.osoba}. Przejdź dalej, żeby sprawdzić dane.`);
  }

  async function liczUzup() {
    try { setUzupWyn(await api("/api/oblicz/uzupelniajacy", { dataPorodu: f.data, tydzienCiazyUkonczone: uzupForm.tc, masaUrodzeniowaG: uzupForm.masa, pobytySzpital: uzupForm.od && uzupForm.do ? [{ od: uzupForm.od, do: uzupForm.do }] : [] })); } catch (e: any) { setUzupWyn({ error: e.message }); }
  }

  const przyjecie = f.tytul !== "porod";
  const rodzicPierwszy = przyjecie ? "Rodzic 1" : "Matka";
  const rodzicDrugi = przyjecie ? "Rodzic 2" : "Ojciec";

  // --- kroki: walidacja i nawigacja ---
  const brakData = !f.data;
  const brakPodstawy = !(podstawaM > 0);
  const komunikatData = przyjecie ? "Podaj datę przyjęcia dziecka na wychowanie." : "Podaj datę urodzenia dziecka lub przewidywaną datę porodu.";
  const komunikatPodstawy = "Podaj średnie wynagrodzenie brutto albo gotową podstawę zasiłku.";
  useEffect(() => { if (fokusBledu) tresc.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [fokusBledu]);

  function idzDo(k: number) { setPokazBledy(false); idz(k); }
  function dalej() {
    if ((krok === K.dziecko && brakData) || (krok === K.zarobki && brakPodstawy)) { setPokazBledy(true); setFokusBledu((n) => n + 1); return; }
    idzDo(krok + 1);
  }

  const laczOtwarte = laczReczne ?? (f.tryb === "laczenie" || f.laczTyg > 0);
  const sytuacja = (s: Sytuacja) => { if (s === "ojciec") onOjciec(); else zmienTryb(s); };

  const podglad = krok >= K.zarobki && krok <= K.wariant ? (
    <p className={css.podglad}>
      {busy ? "Liczymy wstępny wynik…" : wyn ? <>Wstępny wynik: <b>{pln(wyn.sumy.razem)}</b> razem. Pełny wynik zobaczysz w ostatnim kroku.</> : "Wstępny wynik pojawi się, gdy podasz datę i zarobki."}
    </p>
  ) : null;

  return (
    <Kreator kroki={KROKI} krok={krok} maks={maks} onKrok={idzDo} onDalej={dalej} dalejEtykieta={krok === K.wariant ? "Pokaż wynik" : "Dalej"} podglad={podglad}>
      <div ref={tresc}>
        {krok === K.sytuacja && (
          <WyborSytuacji wartosc={f.tryb} onZmiana={sytuacja}>
            {f.tryb === "wlasne" && (
              <div className={css.sekcja}>
                <p className={css.mala}>Wczytaj gotowy scenariusz (fikcyjna osoba) albo <Link href="/wgraj">wgraj skan wniosku</Link>: podstawa wymiaru zostanie odczytana z dokumentu.</p>
                <Field label="Scenariusz"><select defaultValue="" onChange={(e) => e.target.value && wczytaj(e.target.value)}><option value="">— wybierz —</option>{scen.map((c) => <option key={c.id} value={c.id}>{c.osoba}</option>)}</select></Field>
              </div>
            )}
            <div role="status">{wczytano && <Alert t="ok">{wczytano}</Alert>}</div>
          </WyborSytuacji>
        )}

        {krok === K.dziecko && (
          <>
            <Field label="Co się wydarzyło / wydarzy?"><select value={f.tytul} onChange={(e) => set({ tytul: e.target.value, ...(e.target.value !== "porod" ? { martwe: false, ojcowski: false, ojciecPrzejmuje: 0, uzup: 0 } : {}) })}>
              <option value="porod">Poród (urodzenie dziecka)</option><option value="przysposobienie">Przysposobienie (adopcja)</option><option value="rodzina_zastepcza">Rodzina zastępcza niezawodowa</option></select></Field>
            <DataPole label={f.tytul === "porod" ? "Data urodzenia lub przewidywana data porodu" : "Data przyjęcia dziecka na wychowanie"} value={f.data} onChange={(iso) => set({ data: iso })} error={pokazBledy && brakData ? komunikatData : undefined} />
            <div className="grid g2">
              <Field label={f.tytul === "porod" ? "Liczba dzieci przy jednym porodzie" : "Liczba dzieci przyjmowanych jednocześnie"}><select value={f.dzieci} onChange={(e) => set({ dzieci: +e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "5 lub więcej" : n}</option>)}</select></Field>
              {f.tytul !== "porod" && <DataPole label="Data urodzenia dziecka" hint="Do limitu wieku (7/10 lat – rodzina zastępcza, 14 lat – adopcja)" value={f.dataUrDziecka} onChange={(iso) => set({ dataUrDziecka: iso })} />}
            </div>
            <label className="check"><input type="checkbox" checked={f.zaZyciem} onChange={(e) => set({ zaZyciem: e.target.checked })} />Dziecko ma zaświadczenie „Za życiem” (dłuższy urlop rodzicielski)</label>
            {f.tytul === "porod" && <label className="check"><input type="checkbox" checked={f.martwe} onChange={(e) => set({ martwe: e.target.checked })} />Dziecko urodziło się martwe</label>}
          </>
        )}

        {krok === K.zarobki && (
          <>
            <div className="grid g2">
              <Field label={dwoje ? `${rodzicPierwszy}: średnie wynagrodzenie brutto (zł)` : "Średnie wynagrodzenie brutto (zł)"}
                hint={`Średnie miesięczne wynagrodzenie przed potrąceniami. ${f.bruttoM === START.bruttoM ? "Podana kwota jest przykładowa, wpisz własną. " : ""}Jeśli znasz podstawę zasiłku, możesz podać ją niżej.`}
                error={pokazBledy && brakPodstawy ? komunikatPodstawy : undefined}>
                <input type="number" inputMode="decimal" min={0} value={f.bruttoM} onChange={(e) => set({ bruttoM: e.target.value, podstawaM: "" })} /></Field>
              {dwoje && <Field label={`${rodzicDrugi}: średnie wynagrodzenie brutto (zł)`}><input type="number" inputMode="decimal" min={0} value={f.bruttoO} onChange={(e) => set({ bruttoO: e.target.value, podstawaO: "" })} /></Field>}
            </div>
            <p className={css.mala}>Przy umowie o pracę od średniej odejmujemy składki ({liczba(P.skladki_odliczane_od_podstawy)}%). {podstawaM > 0 && <>{rodzicPierwszy}: <b>{pln(podstawaM)}</b></>}{dwoje && podstawaO > 0 && <> · {rodzicDrugi}: <b>{pln(podstawaO)}</b></>}</p>
            <details className="dl"><summary>Znam gotową podstawę wymiaru (np. z decyzji lub Z-3)</summary>
              <div className="grid g2 mt"><Field label={`${rodzicPierwszy}: podstawa zasiłku (zł)`}><input type="number" inputMode="decimal" min={0} value={f.podstawaM} onChange={(e) => set({ podstawaM: e.target.value })} /></Field>
                {dwoje && <Field label={`${rodzicDrugi}: podstawa zasiłku (zł)`}><input type="number" inputMode="decimal" min={0} value={f.podstawaO} onChange={(e) => set({ podstawaO: e.target.value })} /></Field>}</div></details>
            <Kroki kroki={podM?.kroki?.map(opisObliczenia)} tytul="Jak policzono podstawę zasiłku" />
            {podM?.ostrzezenia?.length > 0 && <Lista items={podM.ostrzezenia.map(opisObliczenia)} warn />}
          </>
        )}

        {krok === K.urlopy && (
          f.martwe ? <p>Przy urodzeniu martwego dziecka nie planujemy urlopu rodzicielskiego. Przejdź dalej.</p> : (
            <>
              {f.tytul === "porod" && <Field label={`Urlop macierzyński przed porodem: ${f.przedPorodem} dni`} hint={`Urlop można rozpocząć do ${tygodnie(W.macierzynski_przed_porodem_max)} przed porodem.`}><input type="range" min={0} max={W.macierzynski_przed_porodem_max * 7} value={f.przedPorodem} aria-valuetext={`${f.przedPorodem} dni`} onChange={(e) => set({ przedPorodem: +e.target.value })} /></Field>}
              <Field label={`${rodzicPierwszy}: urlop rodzicielski ${tygodnie(f.rodzM)}`} hint={wym ? `Łącznie do ${tygodnie(limit)} dla obojga rodziców` : ""}><input type="range" min={0} max={limit} value={f.rodzM} aria-valuetext={tygodnie(f.rodzM)} onChange={(e) => set({ rodzM: +e.target.value })} /></Field>
              {dwoje && <Field label={`${rodzicDrugi}: urlop rodzicielski ${tygodnie(f.rodzO)}`} hint={`Każdy rodzic ma ${tygodnie(niezbywalne)} wyłącznie dla siebie.`}><input type="range" min={0} max={limit} value={f.rodzO} aria-valuetext={tygodnie(f.rodzO)} onChange={(e) => set({ rodzO: +e.target.value })} /></Field>}
              {dwoje && <button type="button" className="btn btn-ghost btn-sm" onClick={podzial}>Ustaw {tygodnie(niezbywalne)} dla drugiego rodzica</button>}
              <details className="dl mt" open={laczOtwarte} onToggle={(e) => setLaczReczne(e.currentTarget.open)}>
                <summary>Łączenie pracy z urlopem rodzicielskim</summary>
                <p className={css.mala}>Można pracować do ½ etatu u pracodawcy, który udziela urlopu. Urlop wydłuża się proporcjonalnie, a zasiłek maleje proporcjonalnie.</p>
                <Field label={`${rodzicPierwszy}: tygodnie urlopu połączone z pracą ${f.laczTyg}`}><input type="range" min={0} max={60} value={f.laczTyg} aria-valuetext={tygodnie(f.laczTyg)} onChange={(e) => set({ laczTyg: +e.target.value })} /></Field>
                {f.laczTyg > 0 && <Field label={`Wymiar etatu w pracy: ${f.etat}`}><input type="range" min={0.1} max={L.laczenie_z_praca_max_wymiar_etatu} step={0.05} value={f.etat} onChange={(e) => set({ etat: +e.target.value })} /></Field>}
              </details>
              {dwoje && f.tytul === "porod" && <label className="check mt"><input type="checkbox" checked={f.ojcowski} onChange={(e) => set({ ojcowski: e.target.checked })} />Uwzględnij urlop ojcowski ({tygodnie(L.urlop_ojcowski_dni / 7)})</label>}
              {dwoje && f.tytul === "porod" && f.ojcowski && <DataPole label="Początek urlopu ojcowskiego" hint="Domyślnie dzień porodu" value={f.ojcowskiOd} onChange={(iso) => set({ ojcowskiOd: iso })} />}
              {dwoje && !przyjecie && <Field label={`Ojciec przejmuje końcówkę urlopu macierzyńskiego: ${f.ojciecPrzejmuje} tyg.`} hint={`Po co najmniej ${W.macierzynski_matka_obowiazkowo_po_porodzie_min} tygodniach urlopu matki po porodzie.`}><input type="range" min={0} max={W.urlop_macierzynski_wg_liczby_dzieci["1"] - W.macierzynski_matka_obowiazkowo_po_porodzie_min} value={f.ojciecPrzejmuje} aria-valuetext={`${f.ojciecPrzejmuje} tygodni`} onChange={(e) => set({ ojciecPrzejmuje: +e.target.value })} /></Field>}
              {f.tytul === "porod" && <Field label={`Uzupełniający urlop macierzyński (wcześniak/szpital): ${f.uzup} tyg.`}><input type="range" min={0} max={W.uzupelniajacy_limit_do_tygodnia_po_porodzie.przed_28_tc_lub_masa_do_1000g} value={f.uzup} aria-valuetext={`${f.uzup} tygodni`} onChange={(e) => set({ uzup: +e.target.value })} /></Field>}
              {f.tytul === "porod" && <details className="dl"><summary>Ile przysługuje uzupełniającego? (kalkulator wcześniaka)</summary>
                <div className="grid g2 mt"><Field label="Tydzień ciąży w dniu porodu"><input type="number" inputMode="numeric" value={uzupForm.tc} onChange={(e) => setUzupForm({ ...uzupForm, tc: +e.target.value })} /></Field>
                  <Field label="Masa urodzeniowa (g)"><input type="number" inputMode="numeric" value={uzupForm.masa} onChange={(e) => setUzupForm({ ...uzupForm, masa: +e.target.value })} /></Field>
                  <DataPole label="Pobyt w szpitalu – od" value={uzupForm.od} onChange={(iso) => setUzupForm({ ...uzupForm, od: iso })} />
                  <DataPole label="Pobyt w szpitalu – do" value={uzupForm.do} onChange={(iso) => setUzupForm({ ...uzupForm, do: iso })} /></div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={liczUzup}>Policz dodatkowy urlop</button>
                <div role="status">{uzupWyn && (uzupWyn.error ? <Alert t="err">{uzupWyn.error}</Alert> : <Alert t="ok">Przysługuje <b>{tygodnie(uzupWyn.tygodnie)}</b> (uwzględnione dni pobytu: {uzupWyn.dniWOknie}). <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ uzup: uzupWyn.tygodnie })}>Dodaj urlop do planu</button></Alert>)}</div></details>}
            </>
          )
        )}

        {krok === K.wariant && (
          <fieldset className={css.zestaw}>
            <legend>Jak ma być liczona wysokość zasiłku?</legend>
            <div className={`${css.opcje} ${css.pelne}`}>
              <label className={css.opcja}><input type="radio" name={wariantNazwa} checked={f.wariant === "zmienny_100_70"} onChange={() => set({ wariant: "zmienny_100_70" })} /><span><b>Standardowy ({standard})</b><span className={css.opis}>Wyższa stawka na początku, niższa na urlopie rodzicielskim.</span></span></label>
              <label className={css.opcja}><input type="radio" name={wariantNazwa} checked={f.wariant === "usredniony_81_5"} onChange={() => set({ wariant: "usredniony_81_5" })} /><span><b>Uśredniony ({usredniony})</b><span className={css.opis}>Wniosek w ciągu {przyjecie ? T.adopcja_wniosek_81_5_po_przyjeciu : T.wniosek_pelny_wymiar_81_5_po_porodzie} dni {przyjecie ? "od przyjęcia dziecka" : "od porodu"}. Wyłączne tygodnie drugiego rodzica zachowują stawkę {liczba(P.zasilek_za_9_tyg_drugiego_rodzica)}%.</span></span></label>
            </div>
          </fieldset>
        )}

        {krok === K.wynik && (
          <>
            {/* Stały obszar komunikatów: czytnik ogłasza zmianę stanu (brak danych, liczenie, wynik). */}
            <div role="status">
              {(brakData || brakPodstawy) && (
                <div className={css.kwota}>
                  <p className={css.kwotaOpis}>Zasiłki razem (przed zaliczką na podatek)</p>
                  <p className={`${css.kwotaWartosc} ${css.pusta}`}>— zł</p>
                  <p className={css.mala}>Żeby policzyć zasiłek, uzupełnij:</p>
                  <ul className={css.braki}>
                    {brakData && <li><button type="button" className="btn btn-ghost btn-sm" onClick={() => idzDo(K.dziecko)}>Datę zdarzenia</button></li>}
                    {brakPodstawy && <li><button type="button" className="btn btn-ghost btn-sm" onClick={() => idzDo(K.zarobki)}>Zarobki lub podstawę zasiłku</button></li>}
                  </ul>
                </div>
              )}
              {!brakData && !brakPodstawy && busy && !wyn && <div className={css.kwota}><p className={css.statusLadowania}><span className="spin" aria-hidden="true" /> Liczymy zasiłek…</p></div>}
              {wyn && (
                <div className={css.kwota}>
                  <p className={css.kwotaOpis}>Zasiłki razem (przed zaliczką na podatek)</p>
                  <p className={css.kwotaWartosc}>{pln(wyn.sumy.razem)}</p>
                  <dl className={css.podzial}>
                    <div><dt>{rodzicPierwszy}</dt><dd>{pln(wyn.sumy.matka)}</dd></div>
                    {dwoje && <div><dt>{rodzicDrugi}</dt><dd>{pln(wyn.sumy.ojciec)}</dd></div>}
                  </dl>
                </div>
              )}
            </div>
            {blad && <Alert t="err">{blad}</Alert>}
            {wyn && (
              <>
                <p className={css.mala}>Wymiar: {przyjecie ? "urlop na warunkach macierzyńskiego" : "urlop macierzyński"} <b>{tygodnie(wyn.wymiary.macierzynskiTyg)}</b>, rodzicielski <b>{tygodnie(wyn.wymiary.rodzicielskiTyg)}</b> (wykorzystano {tygodnie(wyn.wymiary.rodzicielskiWykorzystaneTyg)}; przy łączeniu z pracą maks. {tygodnie(wyn.wymiary.rodzicielskiMaxPrzyLaczeniuTyg)}).</p>
                {wyn.bledy?.map((b: string, i: number) => <Alert key={i} t="err">{opisObliczenia(b)}</Alert>)}
                {wyn.ostrzezenia?.map((b: string, i: number) => <Alert key={i} t="warn">{opisObliczenia(b)}</Alert>)}
                <WynikSzczegoly wyn={wyn} por={por} start={f.data} rodzic1={rodzicPierwszy} rodzic2={rodzicDrugi} />
              </>
            )}
          </>
        )}
      </div>
    </Kreator>
  );
}
