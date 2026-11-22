"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSesja } from "@/lib/sesja";
import { dzis } from "@/lib/format";
import { useFormaty, useT, useTb } from "@/lib/jezyk";
import { wynikZadluzenia } from "@/lib/dane-profilu";
import { Alert, Field, Kroki, Spin } from "@/components/ui";
import { LINKI } from "@/content/tresci";

const plus = (n: number) => { const d = new Date(dzis() + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default function Ciaza() {
  const { dataPL, pln, tygodnie, dataKrotka, dni } = useFormaty();
  const t = useT();
  const tb = useTb();
  const { sesja } = useSesja();
  const [f, setF] = useState<any>({ tytul: "umowa_o_prace", dobrowolne: false, dni: 400, wDniu: true, zadl: 0, platnik: 50, dziesiec: false, data: plus(150), brutto: "6500", niezd: 60, w50: false, rehabDni: 90, straciłaPrace: "nie", dzieci: 1 });
  const [w, setW] = useState<any>(null); const [ch, setCh] = useState<any>(null); const [reh, setReh] = useState<any>(null); const [rod, setRod] = useState<any>(null); const [pod, setPod] = useState<any>(null);
  const [skad, setSkad] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [zad, setZad] = useState<any>(null);
  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));

  // dane z (symulowanego) ZUS po zalogowaniu
  useEffect(() => {
    if (!sesja) return;
    (async () => {
      try {
        const [u, e, z] = await Promise.all([api("/api/zus/ubezpieczenie", { pesel: sesja.pesel, naDzien: f.data }), api("/api/zus/ezla", { pesel: sesja.pesel }), api("/api/zus/zadluzenie", { pesel: sesja.pesel, naDzien: f.data })]);
        const ub = u.ubezpieczenie[u.ubezpieczenie.length - 1];
        setF((x: any) => ({ ...x, tytul: ub?.tytul ?? x.tytul, dobrowolne: ub?.chorobowe === "dobrowolne", dni: u.dniNieprzerwanegoUbezpieczeniaChorobowego, wDniu: u.ubezpieczonaWDniu, platnik: ub?.platnik?.liczbaUbezpieczonych ?? x.platnik, zadl: z.kwotaZadluzenia, niezd: e.lacznieDni || x.niezd }));
        setSkad(sesja.osoba);
      } catch (er: any) { setSkad(""); }
    })();
  }, [sesja]); // eslint-disable-line

  // zadłużenie zależy od dnia powstania prawa, więc przy zmianie daty porodu pobieramy je ponownie
  useEffect(() => {
    if (!sesja || !/^\d{4}-\d{2}-\d{2}$/.test(f.data)) return;
    let aktualne = true;
    api("/api/zus/zadluzenie", { pesel: sesja.pesel, naDzien: f.data })
      .then((z: any) => { if (aktualne) { setZad(z); setF((x: any) => ({ ...x, zadl: z.kwotaZadluzenia })); } })
      .catch(() => { if (aktualne) setZad(null); });
    return () => { aktualne = false; };
  }, [sesja, f.data]);

  async function licz() {
    setBusy(true); setErr("");
    try {
      const pr = await api("/api/oblicz/podstawa", { typ: "pracownik", sredniaBrutto: +f.brutto });
      setPod(pr);
      const prac = f.tytul === "umowa_o_prace";
      const [u, c, r, sr] = await Promise.all([
        api("/api/oblicz/uprawnienia", { tytul: f.tytul, dobrowolneChorobowe: f.dobrowolne, dniNieprzerwanegoUbezpieczeniaChorobowego: +f.dni, ubezpieczonaWDniuPorodu: f.wDniu, zadluzenieSkladkowePLN: +f.zadl, liczbaUbezpieczonychPlatnika: +f.platnik, przynajmniej10LatObowiazkowegoUbezp: f.dziesiec }),
        api("/api/oblicz/chorobowe-ciaza", { podstawaMiesieczna: pr.podstawaMiesieczna, dniNiezdolnosci: +f.niezd, pracownik: prac, wiek50Plus: f.w50 }),
        api("/api/oblicz/rehabilitacja", { podstawaMiesieczna: pr.podstawaMiesieczna, dni: +f.rehabDni, wCiazy: true }),
        api("/api/oblicz/swiadczenie-rodzicielskie", { liczbaDzieci: +f.dzieci, odDnia: f.data }),
      ]);
      setW(u); setCh(c); setReh(r); setRod(sr);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { licz(); }, []); // eslint-disable-line

  const tak = (b: boolean) => <span className={"badge " + (b ? "ok" : "no")}>{b ? t("Przysługuje") : t("Nie przysługuje")}</span>;
  return (
    <>
      <h1>{t("Co mi przysługuje w ciąży")}</h1>
      <p className="lead">{tb("Sprawdź, czy masz prawo do zasiłku chorobowego, [świadczenia rehabilitacyjnego](#rehabilitacyjne) i zasiłku macierzyńskiego – a także co zrobić, gdy **nic Ci nie przysługuje**.")}</p>
      {skad ? <Alert t="ok">{t("Dane pobrane z ZUS (symulacja) dla: {osoba}", { osoba: skad })} <span className="badge sim">{t("symulacja")}</span></Alert> : <Alert>{tb("Masz konto? [Zaloguj się przez mObywatela](/logowanie) – wypełnimy dane za Ciebie. Możesz też wpisać je ręcznie.")}</Alert>}

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>{t("Twoja sytuacja")}</h3>
          <Field label="Na jakiej podstawie pracujesz?"><select value={f.tytul} onChange={(e) => set({ tytul: e.target.value })}>
            <option value="umowa_o_prace">{t("Umowa o pracę")}</option><option value="zlecenie">{t("Umowa zlecenie")}</option><option value="dzialalnosc">{t("Własna działalność gospodarcza")}</option>
            <option value="dzielo_lub_brak">{t("Umowa o dzieło / inne")}</option><option value="bezrobotna_bez_ubezpieczenia">{t("Brak ubezpieczenia")}</option></select></Field>
          {(f.tytul === "zlecenie" || f.tytul === "dzialalnosc") && <label className="check"><input type="checkbox" checked={f.dobrowolne} onChange={(e) => set({ dobrowolne: e.target.checked })} />{t("Mam dobrowolne ubezpieczenie chorobowe")}</label>}
          <Field label="Dni nieprzerwanego ubezpieczenia chorobowego" hint="Przerwa do 30 dni nie przerywa ciągłości"><input type="number" value={f.dni} onChange={(e) => set({ dni: e.target.value })} /></Field>
          <Field label="Planowana data porodu"><input type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} /></Field>
          <label className="check"><input type="checkbox" checked={f.wDniu} onChange={(e) => set({ wDniu: e.target.checked })} />{t("W dniu porodu nadal będę ubezpieczona chorobowo")}</label>
          <label className="check"><input type="checkbox" checked={f.dziesiec} onChange={(e) => set({ dziesiec: e.target.checked })} />{t("Mam co najmniej 10 lat obowiązkowego ubezpieczenia chorobowego")}</label>
          {f.tytul === "umowa_o_prace" && <Field label="Ilu ubezpieczonych zgłasza Twój pracodawca?" hint="Powyżej 20 – zasiłek wypłaca pracodawca"><input type="number" value={f.platnik} onChange={(e) => set({ platnik: e.target.value })} /></Field>}
          {f.tytul === "dzialalnosc" && <Field label="Zadłużenie składkowe (zł)" hint="Liczone na dzień porodu"><input type="number" value={f.zadl} onChange={(e) => set({ zadl: e.target.value })} /></Field>}
          {f.tytul === "dzialalnosc" && zad && <Alert t={zad.przekroczonyProg ? "warn" : "info"}><b>{t("Stan zadłużenia na dzień {data} (symulacja):", { data: dataPL(zad.naDzien) })}</b> {t("{kwota}, próg {prog}. Wynik: {wynik}.", { kwota: pln(zad.kwotaZadluzenia), prog: pln(zad.prog), wynik: t(wynikZadluzenia(zad)) })} {t(zad.komunikat)}</Alert>}
          <Field label="Średnie wynagrodzenie brutto / mies." hint="Do wyliczenia kwot poniżej"><input type="number" value={f.brutto} onChange={(e) => set({ brutto: e.target.value })} /></Field>
          <Field label="Dni zwolnienia lekarskiego w ciąży (kod B)"><input type="number" value={f.niezd} onChange={(e) => set({ niezd: e.target.value })} /></Field>
          <label className="check"><input type="checkbox" checked={f.w50} onChange={(e) => set({ w50: e.target.checked })} />{t("Mam ukończone 50 lat")}</label>
          <button className="btn btn-primary" onClick={licz} disabled={busy}>{busy ? <Spin /> : t("Sprawdź uprawnienia")}</button>
        </div>

        <div>
          {err && <Alert t="err">{t(err)}</Alert>}
          {w && (
            <>
              <div className="card accent"><div className="row between"><h3>{t("Zasiłek chorobowy w ciąży")}</h3>{tak(w.zasilekChorobowyWCiazy.przysluguje)}</div>
                <p>{t(w.zasilekChorobowyWCiazy.powod)}</p>
                {ch && w.zasilekChorobowyWCiazy.przysluguje && <>
                  <p>{tb("Przy zwolnieniu z kodem „B” zasiłek wynosi **100% podstawy**. Za **{dni}**: **{razem}** ({dzienna} dziennie).", { dni: dni(+f.niezd), razem: pln(ch.kwotaRazem), dzienna: pln(ch.dzienna) })}</p>
                  <dl className="kv"><dt>{t("Płaci pracodawca")}</dt><dd>{dni(ch.dniPracodawca)} · {pln(ch.kwotaPracodawca)} ({t("wynagrodzenie chorobowe")})</dd><dt>{t("Płaci ZUS")}</dt><dd>{dni(ch.dniZUS)} · {pln(ch.kwotaZUS)}</dd></dl>
                  {ch.ostrzezenia?.map((o: string, i: number) => <Alert key={i} t="warn">{t(o)}</Alert>)}</>}
              </div>

              <div className="card accent"><div className="row between"><h3>{t("Zasiłek macierzyński")}</h3>{tak(w.zasilekMacierzynski.przysluguje)}</div>
                <p>{t(w.zasilekMacierzynski.powod)}</p>
                <p className="small muted">{t("Wypłaca:")} <b>{w.ktoWyplaca === "pracodawca" ? t("pracodawca") : "ZUS"}</b>.</p>
                {w.zasilekMacierzynski.przysluguje && <Link className="btn btn-primary btn-sm" href="/kalkulator">{t("Policz zasiłek →")}</Link>}
              </div>

              {w.ostrzezenia?.map((o: string, i: number) => <Alert key={i} t="warn">{t(o)}</Alert>)}
              {w.alternatywa && <div className="card warn"><h3>{t("Co zamiast zasiłku?")}</h3><p>{t(w.alternatywa)}</p>
                {rod && <p>{tb("Świadczenie rodzicielskie: **{kwota}** miesięcznie przez **{czas}** (od {od} do {do}) – razem {razem}.", { kwota: pln(rod.kwotaMiesieczna), czas: tygodnie(rod.tygodnie), od: dataKrotka(rod.od), do: dataKrotka(rod.do), razem: pln(rod.kwotaRazem) })}</p>}
                <p className="small muted">{rod?.uwaga && t(rod.uwaga)}</p></div>}

              <div className="card"><h3>{t("Zasiłek w wysokości zasiłku macierzyńskiego")}</h3>
                <p>{tb("To specjalne świadczenie dla kobiety w ciąży, która **straciła pracę** w określonych okolicznościach: z powodu upadłości, likwidacji lub śmierci pracodawcy (bez zapewnienia innego zatrudnienia) albo gdy sąd prawomocnie uznał rozwiązanie umowy za sprzeczne z prawem. Wypłacany jest do dnia porodu, w wysokości 100% podstawy – jak zasiłek macierzyński.")}</p>
                <Field label="Czy to Twoja sytuacja?"><select value={f.straciłaPrace} onChange={(e) => set({ straciłaPrace: e.target.value })}><option value="nie">{t("Nie")}</option><option value="upadlosc">{t("Umowa wygasła: upadłość / likwidacja / śmierć pracodawcy")}</option><option value="wyrok">{t("Rozwiązanie umowy niezgodne z prawem (prawomocny wyrok)")}</option></select></Field>
                {f.straciłaPrace !== "nie" && pod && <Alert t="ok">{tb("Możesz mieć prawo do tego zasiłku do dnia porodu. Szacunkowo **{kwota}** miesięcznie (100% podstawy). Prawo ustala płatnik składek (np. syndyk) albo ZUS.", { kwota: pln(pod.podstawaMiesieczna) })}</Alert>}</div>
              <Kroki kroki={pod?.kroki} tytul="Jak policzono podstawę wymiaru" />
            </>
          )}

          {/* Świadczenie rehabilitacyjne widać zawsze, także przed obliczeniem (wymaganie a). */}
          <section className="card" id="rehabilitacyjne" aria-labelledby="rehab-tytul"><h3 id="rehab-tytul">{t("Świadczenie rehabilitacyjne")}</h3>
            <p>{tb("Przysługuje po wyczerpaniu zasiłku chorobowego (w ciąży: 270 dni), gdy nadal jesteś niezdolna do pracy, a dalsze leczenie lub rehabilitacja rokuje powrót do pracy. Wypłaca się je najdłużej **12 miesięcy**. W ciąży wynosi **100% podstawy** (poza ciążą: 90% przez pierwsze 3 miesiące, potem 75%).")}</p>
            <p className="small">{tb("Wniosek: druk **ZNp-7** + zaświadczenie lekarskie **N-9**, złożone najpóźniej 6 tygodni przed końcem zasiłku chorobowego. O prawie decyduje lekarz orzecznik ZUS.")}</p>
            <Field label="Przykład: ile dni świadczenia?"><input type="number" value={f.rehabDni} onChange={(e) => set({ rehabDni: e.target.value })} onBlur={licz} /></Field>
            {reh && <p>{tb("Za {dni}: **{kwota}**.", { dni: dni(+f.rehabDni), kwota: pln(reh.kwota) })} <span className="small muted">{t(reh.uwaga)}</span></p>}
          </section>

          <section className="card" aria-labelledby="zrodla-tytul"><h3 id="zrodla-tytul">{t("Gdzie sprawdzić więcej")}</h3>
            <ul>{LINKI.map(([nazwa, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{t(nazwa)}</a></li>)}</ul>
          </section>
        </div>
      </div>
    </>
  );
}
