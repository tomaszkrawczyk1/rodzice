"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/sesja";
import { dzis } from "@/lib/format";
import { useFormaty, useT, useTb } from "@/lib/jezyk";
import { Alert, Field, Kroki, Spin } from "@/components/ui";

const DEMO = [
  ["Z-3_przyklad_Anna_Kowalska.pdf", "Zaświadczenie płatnika składek Z-3, przykład 1"],
  ["Z-3_przyklad_Dominika_Kaminska.pdf", "Zaświadczenie płatnika składek Z-3, przykład 2"],
  ["ZAM_przyklad_Anna_Kowalska.pdf", "Wniosek o zasiłek macierzyński ZAM"],
] as const;
const MAKS_MB = 25;
const NISKA = 0.8;

type Wiersz = { rok: number; miesiac: number; dP: string; dO: string; stale: string; zm: string; pr: string; proc: string; pewnosc: number };
const tx = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const num = (s: string) => { const t = s.trim().replace(/\s/g, "").replace(",", "."); return t === "" || !/^-?\d+(\.\d+)?$/.test(t) ? null : +t; };

export default function Wgraj() {
  const t = useT();
  const tb = useTb();
  const { dataPL, miesiacPL, pln, opisObliczenia, dni } = useFormaty();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [nazwa, setNazwa] = useState("");
  const [wyn, setWyn] = useState<any>(null);
  const [pesel, setPesel] = useState("");
  const [data, setData] = useState("");
  const [wiersze, setWiersze] = useState<Wiersz[]>([]);
  const [pod, setPod] = useState<any>(null);
  const [ub, setUb] = useState<any>(null);
  const [ubInfo, setUbInfo] = useState("");
  const [dzieci, setDzieci] = useState("1");

  async function odczytaj(blob: Blob, plik: string, etykieta: string) {
    setBusy(true); setErr(""); setWyn(null); setPod(null); setUb(null); setUbInfo(""); setNazwa(etykieta);
    try {
      const fd = new FormData();
      fd.append("plik", blob, plik);
      const r = await fetch("/api/parser", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Nie udało się odczytać dokumentu.");
      setWyn(j);
      setPesel(j.dane?.ubezpieczony?.pesel ?? "");
      setData(j.dane?.data_zdarzenia ?? "");
      setWiersze((j.dane?.skladniki_miesieczne ?? []).map((w: any): Wiersz => ({ rok: w.rok, miesiac: w.miesiac, dP: tx(w.dniPrzepracowal), dO: tx(w.dniObowiazany), stale: tx(w.stale), zm: tx(w.zmiennePomniejszone), pr: tx(w.premieFaktyczne), proc: tx(w.procentSkladki), pewnosc: w.pewnosc ?? 1 })));
      setPod(j.podstawa ?? null);
      setDzieci(String(Math.min(Math.max(j.dane?.dzieci?.length || 1, 1), 5)));
    } catch (e: any) {
      setErr(t(e?.message || "Nie udało się odczytać dokumentu. Spróbuj ponownie albo wpisz dane w kalkulatorze."));
    } finally { setBusy(false); }
  }

  async function przyklad(plik: string, etykieta: string) {
    const p = await fetch(`/demo/${plik}`).catch(() => null);
    if (!p?.ok) { setErr(t("Nie udało się pobrać przykładu.")); return; }
    await odczytaj(await p.blob(), plik, etykieta);
  }

  function wybranoPlik(f: File | undefined) {
    if (!f) return;
    const odrzuc = (m: string) => { setWyn(null); setPod(null); setUb(null); setUbInfo(""); setWiersze([]); setErr(m); };
    if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) { odrzuc(t("Obsługiwane formaty: PDF, JPG i PNG.")); return; }
    if (f.size > MAKS_MB * 1024 * 1024) { odrzuc(t("Plik jest za duży (maksymalnie {mb} MB).", { mb: MAKS_MB })); return; }
    odczytaj(f, f.name, f.name);
  }

  function zmien(i: number, pole: keyof Wiersz, v: string) {
    setWiersze((w) => w.map((x, k) => (k === i ? { ...x, [pole]: v, pewnosc: 1 } : x)));
  }

  /** Gdy odczyt nie znalazł wierszy (np. ręczne pismo), dodaje 12 pustych miesięcy przed datą zdarzenia do ręcznego wpisania. */
  function dodajMiesiace() {
    const b = data ? new Date(data) : new Date();
    setWiersze(Array.from({ length: 12 }, (_, i) => { const d = new Date(b.getFullYear(), b.getMonth() - 12 + i, 1); return { rok: d.getFullYear(), miesiac: d.getMonth() + 1, dP: "", dO: "", stale: "", zm: "", pr: "", proc: "", pewnosc: 1 }; }));
  }

  async function przelicz() {
    setBusy(true); setErr("");
    try {
      if (wiersze.some((w) => [w.dP, w.dO, w.stale, w.zm, w.pr, w.proc].some((x) => (num(x) ?? 0) < 0))) { setErr(t("Kwoty i liczby dni nie mogą być ujemne. Popraw wpisane wartości.")); setBusy(false); return; }
      const sk = wiersze.map((w) => ({ rok: w.rok, miesiac: w.miesiac, dniPrzepracowal: num(w.dP), dniObowiazany: num(w.dO), stale: num(w.stale), zmiennePomniejszone: num(w.zm), premieFaktyczne: num(w.pr), procentSkladki: num(w.proc) }));
      const j = await api<any>("/api/parser/podstawa", { typ_dokumentu: wyn.dane.typ_dokumentu, zatrudnienie: wyn.dane.zatrudnienie, skladniki_miesieczne: sk });
      setPod(j.podstawa);
    } catch (e: any) { setErr(t(e?.message || "Nie udało się przeliczyć podstawy. Sprawdź wpisane liczby.")); }
    finally { setBusy(false); }
  }

  async function sprawdzUb() {
    setUb(null); setUbInfo("");
    if (!/^\d{11}$/.test(pesel.trim())) { setUbInfo(t("Wpisz 11-cyfrowy numer PESEL.")); return; }
    const naDzien = data || dzis();
    try { setUb(await api("/api/zus/ubezpieczenie", { pesel: pesel.trim(), naDzien })); }
    catch { setUbInfo(t("W danych testowych nie ma takiej osoby. W prawdziwym systemie ZUS sprawdzenie dotyczyłoby jej konta ubezpieczonego.")); }
  }

  function policz() {
    const p = pod?.wynik?.podstawaMiesieczna; if (!p) return;
    localStorage.setItem("rodzice.prefill", JSON.stringify({ podstawaM: p, data: data || undefined, dzieci: Math.min(Math.max(parseInt(dzieci) || 1, 1), 5) }));
    router.push("/kalkulator");
  }

  const d = wyn?.dane;
  const p = wyn?.pewnosc ?? {};
  const slabo = (x: number | null | undefined) => x != null && x < NISKA;
  const Sprawdz = ({ x }: { x: number | null | undefined }) => (slabo(x) ? <span className="badge warn" style={{ marginLeft: 8 }}>{t("sprawdź")}</span> : null);

  return (
    <>
      <h1>{t("Przetestuj odczyt ze skanu (przykłady)")}</h1>
      <p className="lead">{tb("Tu sprawdzisz, jak aplikacja odczytuje dane z zaświadczenia Z-3 i wniosku ZAM. Najprościej: kliknij **„Odczytaj przykład”** przy jednym z trzech gotowych dokumentów. Mają **fikcyjne dane**. To nie jest składanie wniosku: nic nie trafia do ZUS ani do pracodawcy.")}</p>
      <Alert t="warn">{tb("**Nie wgrywaj prawdziwych dokumentów.** Możesz też wybrać własny plik, ale to wersja testowa: użyj tylko przykładu albo dokumentu bez prawdziwego numeru PESEL, imienia i nazwiska. Odczyt odbywa się na naszym serwerze, bez zewnętrznych usług. Dokument nie jest zapisywany.")}</Alert>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>{t("Przykładowe dokumenty")}</h2>
          <p className="small muted">{t("Trzy przykłady z fikcyjnymi danymi. Możesz je też pobrać i obejrzeć.")}</p>
          <ul className="clean">{DEMO.map(([plik, etykieta]) => <li key={plik}>
            <b>{t(etykieta)}</b>
            <div className="row">
              <button className="btn btn-secondary" disabled={busy} onClick={() => przyklad(plik, etykieta)}>{t("Odczytaj przykład")}</button>
              <a className="btn btn-ghost" href={`/demo/${plik}`} download>{t("Pobierz przykład")}</a>
            </div>
          </li>)}</ul>
          <h3 className="mt">{t("Własny plik testowy (dla chętnych)")}</h3>
          <p className="small">{t("Tylko plik bez prawdziwych danych osobowych, np. zmieniony przykład. Nie wgrywaj skanu ze swoim numerem PESEL.")}</p>
          <Field label={t("Skan lub PDF (Z-3, Z-3a, ZAM)")} hint={t("PDF, JPG lub PNG, do {mb} MB. Odczyt skanu może potrwać kilkanaście sekund.", { mb: MAKS_MB })}>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy} onChange={(e) => { wybranoPlik(e.target.files?.[0]); e.target.value = ""; }} />
          </Field>
        </section>

        <div>
          {busy && <p role="status"><Spin /> {t("Odczytujemy dokument „{nazwa}”…", { nazwa: t(nazwa) })}</p>}
          {err && <Alert t="err">{err}</Alert>}
          {wyn && d && <>
            <div className="card accent"><h2>{t("Dane odczytane z dokumentu")}</h2>
              <p className="small muted">{t("Źródło odczytu: {zrodla}. Sprawdź pola oznaczone „sprawdź” i popraw, jeśli odczyt jest błędny.", { zrodla: wyn.zrodla?.join(", ") ?? "" })}</p>
              {wyn.ostrzezenia?.length > 0 && <Alert t="warn"><ul className="clean">{wyn.ostrzezenia.map((o: string, i: number) => <li key={i}>{t(o)}</li>)}</ul></Alert>}
              <dl className="kv mt">
                <dt>{t("Rodzaj dokumentu")}</dt><dd>{d.typ_dokumentu === "mieszany" ? t("Kilka rodzajów dokumentów") : d.typ_dokumentu ?? t("nie rozpoznano")}</dd>
                <dt>{t("Ubezpieczony")}</dt><dd>{[d.ubezpieczony?.imie, d.ubezpieczony?.nazwisko].filter(Boolean).join(" ") || "—"}<Sprawdz x={p.osoba} /></dd>
                <dt>{t("Płatnik")}</dt><dd>{d.platnik?.nazwa ?? "—"}{d.platnik?.liczba_ubezpieczonych && <span className="small muted"> ({t(d.platnik.liczba_ubezpieczonych === "powyzej_20" ? "powyżej 20 ubezpieczonych" : "do 20 ubezpieczonych")})</span>}</dd>
                {d.wnioskowane_okresy?.length > 0 && <><dt>{t("Wnioskowane okresy")}</dt><dd>{d.wnioskowane_okresy.map((o: any, i: number) => <div key={i}>{o.od ? dataPL(o.od) : "?"} – {o.do ? dataPL(o.do) : "?"}<Sprawdz x={o.pewnosc} /></div>)}</dd></>}
              </dl>
              <div className="grid g2 mt">
                <Field label="PESEL"><input inputMode="numeric" autoComplete="off" value={pesel} onChange={(e) => setPesel(e.target.value)} /></Field>
                <Field label="Liczba dzieci"><input inputMode="numeric" autoComplete="off" value={dzieci} onChange={(e) => setDzieci(e.target.value.replace(/\D/g, "").slice(0, 1))} /></Field>
                <Field label={t("Data porodu lub przyjęcia dziecka")}><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Field>
              </div>
              {(() => { const brakDaty = wyn.ostrzezenia?.some((o: string) => /daty porodu/.test(o)); const pola = [slabo(p.pesel) && "PESEL", slabo(p.data_zdarzenia) && !brakDaty && "data"].filter(Boolean); return pola.length > 0 && <p className="small muted">Niska pewność odczytu: {pola.join(", ")}. Porównaj z dokumentem.</p>; })()}
              <div className="row mt"><button className="btn btn-secondary" onClick={sprawdzUb}>{t("Sprawdź ubezpieczenie (symulacja ZUS)")}</button></div>
            </div>

            {(ub || ubInfo) && <div className="card navy"><h3>{t("Czy ma ubezpieczenie?")} <span className="badge sim">{t("symulacja ZUS")}</span></h3>
              {ub && <p>{tb("Dane fikcyjnego profilu: **{osoba}**. Nieprzerwane ubezpieczenie chorobowe: **{dni}**. Ubezpieczenie w dniu zdarzenia: **{stan}**.", { osoba: ub.osoba, dni: dni(ub.dniNieprzerwanegoUbezpieczeniaChorobowego), stan: t(ub.ubezpieczonaWDniu ? "aktywne" : "brak") })}</p>}
              {ubInfo && <p>{ubInfo}</p>}</div>}

            {wiersze.length === 0 && <div className="card"><h3>{t("Wynagrodzenia z zaświadczenia")}</h3>
              <p className="small muted">{t("Nie udało się odczytać tabeli wynagrodzeń (np. przy piśmie odręcznym). Możesz wpisać je ręcznie z dokumentu.")}</p>
              <div className="row mt"><button className="btn btn-secondary" onClick={dodajMiesiace}>{t("Wpisz wynagrodzenia ręcznie")}</button></div></div>}
            {wiersze.length > 0 && <div className="card"><h3>{t("Wynagrodzenia z zaświadczenia")}</h3>
              <p className="small muted">{t("Popraw liczby, jeśli odczyt się pomylił, i kliknij „Przelicz podstawę”.")}</p>
              <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>{t("Miesiąc")}</th><th>{t("Dni przepracowane")}</th><th>{t("Dni obowiązujące")}</th><th>{t("Składniki stałe (zł)")}</th><th>{t("Zmienne (zł)")}</th><th>{t("Premie (zł)")}</th></tr></thead>
                <tbody>{wiersze.map((w, i) => <tr key={`${w.rok}-${w.miesiac}`}>
                  <td data-label={t("Miesiąc")}>{miesiacPL(w.rok, w.miesiac)}{w.pewnosc < NISKA && <span className="badge warn" style={{ marginLeft: 8 }}>{t("sprawdź")}</span>}</td>
                  {([["dP", "Dni przepracowane"], ["dO", "Dni obowiązujące"], ["stale", "Składniki stałe (zł)"], ["zm", "Zmienne (zł)"], ["pr", "Premie (zł)"]] as const).map(([k, et]) =>
                    <td key={k} data-label={t(et)}><input inputMode="decimal" aria-label={`${miesiacPL(w.rok, w.miesiac)}: ${t(et)}`} autoComplete="off" value={w[k]} onChange={(e) => zmien(i, k, e.target.value)} /></td>)}
                </tr>)}</tbody></table></div>
              <div className="row mt"><button className="btn btn-secondary" disabled={busy} onClick={przelicz}>{t("Przelicz podstawę")}</button></div></div>}

            {pod?.wynik && <div className="card accent"><h3>{t("Podstawa wymiaru zasiłku")}</h3>
              <div className="stat"><div className="v">{pln(pod.wynik.podstawaMiesieczna)}</div><div className="l">{t("miesięcznie (dziennie {kwota})", { kwota: pln(pod.wynik.podstawaDzienna) })}</div></div>
              <Kroki kroki={pod.wynik.kroki?.map(opisObliczenia)} />
              {pod.wynik.ostrzezenia?.length > 0 && <Alert t="warn">{t("Sprawdź dane odczytane z zaświadczenia i skonsultuj wynik z ZUS.")}</Alert>}
              <button className="btn btn-primary mt" onClick={policz}>{t("Policz zasiłek z tą podstawą →")}</button></div>}
            {!pod?.wynik && <Alert t="info">{tb(wiersze.length > 0 ? "Z tego dokumentu nie wyliczono podstawy. Uzupełnij wynagrodzenia w tabeli powyżej albo wprowadź je ręcznie w [kalkulatorze](/kalkulator)." : "Z tego dokumentu nie wyliczono podstawy. Wpisz wynagrodzenia przyciskiem powyżej albo wprowadź je w [kalkulatorze](/kalkulator).")}</Alert>}
          </>}
        </div>
      </div>
    </>
  );
}
