"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSesja } from "@/lib/sesja";
import { pln, dataKrotka, dataPL, dzis, tygodnie } from "@/lib/format";
import { wynikZadluzenia } from "@/lib/dane-profilu";
import { Alert, Field, Kroki, Spin } from "@/components/ui";

const DATA_OK = /^\d{4}-\d{2}-\d{2}$/;

export default function Ciaza() {
  const { sesja } = useSesja();
  const [f, setF] = useState<any>({ tytul: "", dobrowolne: false, dni: "", wDniu: false, zadl: "", platnik: "", dziesiec: false, data: "", brutto: "", niezd: "", w50: false, rehabDni: "", straciłaPrace: "nie", dzieci: 1 });
  const [w, setW] = useState<any>(null); const [ch, setCh] = useState<any>(null); const [reh, setReh] = useState<any>(null); const [rod, setRod] = useState<any>(null); const [pod, setPod] = useState<any>(null);
  const [skad, setSkad] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [zad, setZad] = useState<any>(null);
  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));

  // dane z (symulowanego) ZUS po zalogowaniu
  useEffect(() => {
    if (!sesja) return;
    (async () => {
      try {
        const dzien = DATA_OK.test(f.data) ? f.data : new Date().toISOString().slice(0, 10);
        const [u, e, z] = await Promise.all([api(`/api/zus/ubezpieczenie?pesel=${sesja.pesel}&naDzien=${dzien}`), api(`/api/zus/ezla?pesel=${sesja.pesel}`), api(`/api/zus/zadluzenie?pesel=${sesja.pesel}&naDzien=${dzien}`)]);
        const ub = u.ubezpieczenie[u.ubezpieczenie.length - 1];
        setF((x: any) => ({ ...x, tytul: ub?.tytul ?? x.tytul, dobrowolne: ub?.chorobowe === "dobrowolne", dni: u.dniNieprzerwanegoUbezpieczeniaChorobowego, wDniu: u.ubezpieczonaWDniu, platnik: ub?.platnik?.liczbaUbezpieczonych ?? x.platnik, zadl: z.kwotaZadluzenia, niezd: e.lacznieDni || x.niezd }));
        setSkad(`Dane pobrane z ZUS (symulacja) dla: ${sesja.osoba}`);
      } catch (er: any) { setSkad(""); }
    })();
  }, [sesja]); // eslint-disable-line

  // zadłużenie zależy od dnia powstania prawa, więc przy zmianie daty porodu pobieramy je ponownie
  useEffect(() => {
    if (!sesja || !DATA_OK.test(f.data)) return;
    let aktualne = true;
    api(`/api/zus/zadluzenie?pesel=${sesja.pesel}&naDzien=${f.data}`)
      .then((z: any) => { if (aktualne) { setZad(z); setF((x: any) => ({ ...x, zadl: z.kwotaZadluzenia })); } })
      .catch(() => { if (aktualne) setZad(null); });
    return () => { aktualne = false; };
  }, [sesja, f.data]);

  async function licz() {
    // Bez danych nie liczymy: pola są puste, dopóki ktoś się nie zaloguje albo sam ich nie wpisze.
    const braki: string[] = [];
    if (!f.tytul) braki.push("na jakiej podstawie pracujesz");
    if (f.dni === "" || !(+f.dni >= 0)) braki.push("od ilu dni jesteś ubezpieczona");
    if (!DATA_OK.test(f.data)) braki.push("planowaną datę porodu");
    if (f.tytul === "umowa_o_prace" && (f.platnik === "" || !(+f.platnik >= 0))) braki.push("ile osób zgłasza pracodawca");
    if (f.brutto === "" || !(+f.brutto >= 0)) braki.push("średnią pensję brutto");
    if (braki.length) { setErr("Uzupełnij: " + braki.join(", ") + "."); setW(null); return; }
    setBusy(true); setErr("");
    try {
      const pr = await api("/api/oblicz/podstawa", { typ: "pracownik", sredniaBrutto: +f.brutto });
      setPod(pr);
      const prac = f.tytul === "umowa_o_prace";
      const niezd = f.niezd !== "" && +f.niezd > 0, rehab = f.rehabDni !== "" && +f.rehabDni > 0;
      const [u, c, r, sr] = await Promise.all([
        api("/api/oblicz/uprawnienia", { tytul: f.tytul, dobrowolneChorobowe: f.dobrowolne, dniNieprzerwanegoUbezpieczeniaChorobowego: +f.dni, ubezpieczonaWDniuPorodu: f.wDniu, zadluzenieSkladkowePLN: +f.zadl || 0, liczbaUbezpieczonychPlatnika: +f.platnik || 0, przynajmniej10LatObowiazkowegoUbezp: f.dziesiec }),
        niezd ? api("/api/oblicz/chorobowe-ciaza", { podstawaMiesieczna: pr.podstawaMiesieczna, dniNiezdolnosci: +f.niezd, pracownik: prac, wiek50Plus: f.w50 }) : Promise.resolve(null),
        rehab ? api("/api/oblicz/rehabilitacja", { podstawaMiesieczna: pr.podstawaMiesieczna, dni: +f.rehabDni, wCiazy: true }) : Promise.resolve(null),
        api("/api/oblicz/swiadczenie-rodzicielskie", { liczbaDzieci: +f.dzieci, odDnia: f.data }),
      ]);
      setW(u); setCh(c); setReh(r); setRod(sr);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const tak = (b: boolean) => <span className={"badge " + (b ? "ok" : "no")}>{b ? "Przysługuje" : "Nie przysługuje"}</span>;
  return (
    <>
      <h1>Co mi przysługuje w ciąży</h1>
      <p className="lead">Sprawdź, czy masz prawo do zasiłku chorobowego i macierzyńskiego – a także co zrobić, gdy <b>nic Ci nie przysługuje</b>.</p>
      {skad ? <Alert t="ok">{skad} <span className="badge sim">symulacja</span></Alert> : <Alert>Masz konto? <Link href="/logowanie">Zaloguj się przez mObywatela</Link> – wypełnimy dane za Ciebie. Możesz też wpisać je ręcznie.</Alert>}

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Twoja sytuacja</h3>
          <Field label="Na jakiej podstawie pracujesz?"><select value={f.tytul} onChange={(e) => set({ tytul: e.target.value })}>
            <option value="" disabled>Wybierz…</option><option value="umowa_o_prace">Umowa o pracę</option><option value="zlecenie">Umowa zlecenie</option><option value="dzialalnosc">Własna działalność gospodarcza</option>
            <option value="dzielo_lub_brak">Umowa o dzieło / inne</option><option value="bezrobotna_bez_ubezpieczenia">Brak ubezpieczenia</option></select></Field>
          {(f.tytul === "zlecenie" || f.tytul === "dzialalnosc") && <label className="check"><input type="checkbox" checked={f.dobrowolne} onChange={(e) => set({ dobrowolne: e.target.checked })} />Mam dobrowolne ubezpieczenie chorobowe</label>}
          <Field label="Od ilu dni jesteś bez przerwy ubezpieczona chorobowo?" hint="Przerwa do 30 dni się nie liczy. Zasiłek chorobowy dostaniesz po 30 dniach ubezpieczenia (90 dni przy dobrowolnym) – to tzw. okres wyczekiwania."><input type="number" value={f.dni} onChange={(e) => set({ dni: e.target.value })} /></Field>
          <Field label="Planowana data porodu"><input type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} /></Field>
          <label className="check"><input type="checkbox" checked={f.wDniu} onChange={(e) => set({ wDniu: e.target.checked })} />W dniu porodu nadal będę ubezpieczona chorobowo</label>
          <label className="check"><input type="checkbox" checked={f.dziesiec} onChange={(e) => set({ dziesiec: e.target.checked })} />Mam co najmniej 10 lat obowiązkowego ubezpieczenia chorobowego</label>
          {f.tytul === "umowa_o_prace" && <Field label="Ile osób Twój pracodawca zgłasza do ubezpieczenia chorobowego?" hint="Zapytaj w kadrach. Więcej niż 20 osób – zasiłek wypłaca pracodawca. 20 lub mniej – wypłaca ZUS."><input type="number" value={f.platnik} onChange={(e) => set({ platnik: e.target.value })} /></Field>}
          {f.tytul === "dzialalnosc" && <Field label="Nieopłacone składki w ZUS (zł)" hint="Kwota zaległości w dniu porodu. Jeśli nie masz zaległości, wpisz 0."><input type="number" value={f.zadl} onChange={(e) => set({ zadl: e.target.value })} /></Field>}
          {f.tytul === "dzialalnosc" && zad && <Alert t={zad.przekroczonyProg ? "warn" : "info"}><b>Stan zadłużenia na dzień {dataPL(zad.naDzien)} (symulacja):</b> {pln(zad.kwotaZadluzenia)}, próg {pln(zad.prog)}. Wynik: {wynikZadluzenia(zad)}. {zad.komunikat}</Alert>}
          <Field label="Średnia pensja brutto miesięcznie (z ostatnich 12 miesięcy)" hint="Od niej liczymy podstawę wymiaru, czyli kwotę, od której ZUS liczy zasiłek"><input type="number" value={f.brutto} onChange={(e) => set({ brutto: e.target.value })} /></Field>
          <Field label="Ile dni zwolnienia lekarskiego w ciąży chcesz policzyć?" hint="Chodzi o zwolnienie z kodem B – lekarz wpisuje go, gdy zwolnienie wynika z ciąży"><input type="number" value={f.niezd} onChange={(e) => set({ niezd: e.target.value })} /></Field>
          <label className="check"><input type="checkbox" checked={f.w50} onChange={(e) => set({ w50: e.target.checked })} />Mam ukończone 50 lat</label>
          <button className="btn btn-primary" onClick={licz} disabled={busy}>{busy ? <Spin /> : "Sprawdź uprawnienia"}</button>
        </div>

        <div>
          {err && <Alert t="err">{err}</Alert>}
          {w && (
            <>
              <div className="card accent"><div className="row between"><h3>Zasiłek chorobowy w ciąży</h3>{tak(w.zasilekChorobowyWCiazy.przysluguje)}</div>
                <p>{w.zasilekChorobowyWCiazy.powod}</p>
                {ch && w.zasilekChorobowyWCiazy.przysluguje && <>
                  <p>Przy zwolnieniu z kodem „B” (czyli związanym z ciążą) zasiłek wynosi <b>100% podstawy</b>. Za <b>{f.niezd} dni</b>: <b>{pln(ch.kwotaRazem)}</b> ({pln(ch.dzienna)} dziennie).</p>
                  <dl className="kv"><dt>Płaci pracodawca</dt><dd>{ch.dniPracodawca} dni · {pln(ch.kwotaPracodawca)} (wynagrodzenie chorobowe)</dd><dt>Płaci ZUS</dt><dd>{ch.dniZUS} dni · {pln(ch.kwotaZUS)}</dd></dl>
                  {ch.ostrzezenia?.map((o: string, i: number) => <Alert key={i} t="warn">{o}</Alert>)}</>}
              </div>

              <div className="card accent"><div className="row between"><h3>Zasiłek macierzyński</h3>{tak(w.zasilekMacierzynski.przysluguje)}</div>
                <p>{w.zasilekMacierzynski.powod}</p>
                <p className="small muted">Wypłaca: <b>{w.ktoWyplaca === "pracodawca" ? "pracodawca" : "ZUS"}</b>.</p>
                {w.zasilekMacierzynski.przysluguje && <Link className="btn btn-primary btn-sm" href="/kalkulator">Policz zasiłek →</Link>}
              </div>

              {w.ostrzezenia?.map((o: string, i: number) => <Alert key={i} t="warn">{o}</Alert>)}
              {w.alternatywa && <div className="card warn"><h3>Co zamiast zasiłku?</h3><p>{w.alternatywa}</p>
                {rod && <p>Świadczenie rodzicielskie: <b>{pln(rod.kwotaMiesieczna)}</b> miesięcznie przez <b>{tygodnie(rod.tygodnie)}</b> (od {dataKrotka(rod.od)} do {dataKrotka(rod.do)}) – razem {pln(rod.kwotaRazem)}.</p>}
                <p className="small muted">{rod?.uwaga}</p></div>}

              <div className="card"><h3>Świadczenie rehabilitacyjne</h3>
                <p>Przysługuje po wyczerpaniu zasiłku chorobowego, gdy nadal jesteś niezdolna do pracy, a dalsze leczenie rokuje powrót do pracy (maks. 12 miesięcy). Decyzję podejmuje lekarz orzecznik ZUS. W ciąży wynosi <b>100% podstawy</b>.</p>
                <Field label="Przykład: ile dni świadczenia?"><input type="number" value={f.rehabDni} onChange={(e) => set({ rehabDni: e.target.value })} onBlur={() => { if (w) licz(); }} /></Field>
                {reh ? <p>Za {f.rehabDni} dni: <b>{pln(reh.kwota)}</b>. <span className="small muted">{reh.uwaga}</span></p> : <p className="small muted">Wpisz liczbę dni, a policzymy kwotę.</p>}</div>

              <div className="card"><h3>Zasiłek w wysokości zasiłku macierzyńskiego</h3>
                <p>To specjalne świadczenie dla kobiety w ciąży, która <b>straciła pracę</b> w określonych okolicznościach: z powodu upadłości, likwidacji lub śmierci pracodawcy (bez zapewnienia innego zatrudnienia) albo gdy sąd prawomocnie uznał rozwiązanie umowy za sprzeczne z prawem. Wypłacany jest do dnia porodu, w wysokości 100% podstawy – jak zasiłek macierzyński.</p>
                <Field label="Czy to Twoja sytuacja?"><select value={f.straciłaPrace} onChange={(e) => set({ straciłaPrace: e.target.value })}><option value="nie">Nie</option><option value="upadlosc">Umowa wygasła: upadłość / likwidacja / śmierć pracodawcy</option><option value="wyrok">Rozwiązanie umowy niezgodne z prawem (prawomocny wyrok)</option></select></Field>
                {f.straciłaPrace !== "nie" && pod && <Alert t="ok">Możesz mieć prawo do tego zasiłku do dnia porodu. Szacunkowo <b>{pln(pod.podstawaMiesieczna)}</b> miesięcznie (100% podstawy). O prawie do zasiłku decyduje płatnik składek (czyli ten, kto opłacał za Ciebie składki – np. syndyk upadłej firmy) albo ZUS.</Alert>}</div>
              <Kroki kroki={pod?.kroki} tytul="Jak policzono podstawę wymiaru (kwotę, od której liczy się zasiłek)" />
            </>
          )}
        </div>
      </div>
    </>
  );
}
