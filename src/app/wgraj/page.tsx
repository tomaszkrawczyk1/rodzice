"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/sesja";
import { pln, dataPL, RODZAJE } from "@/lib/format";
import { Alert, Kroki, Spin } from "@/components/ui";

const DEMO = [
  ["Z-3_przyklad_Anna_Kowalska.pdf", "Zaświadczenie płatnika składek Z-3, przykład 1"],
  ["Z-3_przyklad_Dominika_Kaminska.pdf", "Zaświadczenie płatnika składek Z-3, przykład 2"],
  ["ZAM_przyklad_Anna_Kowalska.pdf", "Wniosek o zasiłek macierzyński ZAM"],
] as const;
const ZDARZENIA: Record<string, string> = { porod: "Poród", przysposobienie: "Adopcja", rodzina_zastepcza: "Rodzina zastępcza", inna: "Inna sytuacja" };

export default function Wgraj() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [wyn, setWyn] = useState<any>(null);
  const [err, setErr] = useState("");
  const [nazwa, setNazwa] = useState("");
  const [ub, setUb] = useState<any>(null);

  async function demo(plik: string, etykieta: string) {
    setBusy(true);
    setErr("");
    setWyn(null);
    setUb(null);
    setNazwa(etykieta);
    try {
      const przyklad = await fetch(`/demo/${plik}`);
      if (!przyklad.ok) throw new Error();
      const fd = new FormData();
      fd.append("plik", await przyklad.blob(), plik);
      const r = await fetch("/api/parser", { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setWyn(j);
      const pesel = j.dane?.ubezpieczony?.pesel;
      if (pesel) {
        const query = new URLSearchParams({ pesel, naDzien: j.dane?.data_zdarzenia ?? new Date().toISOString().slice(0, 10) });
        setUb(await api(`/api/zus/ubezpieczenie?${query}`).catch(() => null));
      }
    } catch {
      setErr("Nie udało się odczytać przykładu. Spróbuj ponownie lub wpisz dane w kalkulatorze.");
    } finally {
      setBusy(false);
    }
  }
  function policz() {
    const p = wyn.podstawa?.wynik?.podstawaMiesieczna; if (!p) return;
    localStorage.setItem("rodzice.prefill", JSON.stringify({ podstawaM: p, data: wyn.dane?.data_zdarzenia, dzieci: wyn.dane?.dzieci?.length || 1 })); router.push("/kalkulator");
  }
  const d = wyn?.dane; const pod = wyn?.podstawa?.wynik;
  return (
    <>
      <h1>Odczytaj dane ze skanu</h1>
      <p className="lead">Wypróbuj odczyt danych i obliczenie zasiłku na jednym z fikcyjnych formularzy.</p>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>Wybierz przykładowy formularz</h2>
          <ul className="clean">{DEMO.map(([plik, etykieta]) => <li key={plik}>
            <b>{etykieta}</b>
            <div className="row">
              <button className="btn btn-secondary" disabled={busy} onClick={() => demo(plik, etykieta)}>Odczytaj przykład</button>
              <a className="btn btn-ghost" href={`/demo/${plik}`} download>Pobierz przykład</a>
            </div>
          </li>)}</ul>
        </section>

        <div>
          {busy && <p role="status"><Spin /> Odczytujemy dokument „{nazwa}”…</p>}
          {err && <Alert t="err">{err}</Alert>}
          {wyn && d && <>
            <div className="card accent"><h2>Dane odczytane z przykładu</h2>
              <p>Sprawdź odczytane informacje przed użyciem w kalkulatorze.</p>
              <dl className="kv mt">
                <dt>Rodzaj dokumentu</dt><dd>{d.typ_dokumentu === "mieszany" ? "Kilka rodzajów dokumentów" : d.typ_dokumentu === "decyzja" ? "Decyzja ZUS" : ["ZAM", "Z-3", "Z-3a"].includes(d.typ_dokumentu) ? d.typ_dokumentu : "—"}</dd>
                <dt>Ubezpieczony</dt><dd>{[d.ubezpieczony?.imie, d.ubezpieczony?.nazwisko].filter(Boolean).join(" ") || "—"} {d.ubezpieczony?.pesel && <span className="small muted">PESEL {d.ubezpieczony.pesel}</span>}</dd>
                <dt>Płatnik</dt><dd>{d.platnik?.nazwa ?? "—"}{d.platnik?.liczba_ubezpieczonych && <span className="small muted"> ({d.platnik.liczba_ubezpieczonych === "powyzej_20" ? "powyżej 20 ubezpieczonych" : "do 20 ubezpieczonych"})</span>}</dd>
                {(d.podstawa_wniosku || d.data_zdarzenia) && <><dt>Zdarzenie</dt><dd>{[ZDARZENIA[d.podstawa_wniosku], d.data_zdarzenia && dataPL(d.data_zdarzenia), d.dzieci?.length ? `dzieci: ${d.dzieci.length}` : null].filter(Boolean).join(", ")}</dd></>}
                <dt>Wnioskowane okresy</dt><dd>{d.wnioskowane_okresy?.length ? d.wnioskowane_okresy.map((o: any, i: number) => <div key={i}>{RODZAJE[o.rodzaj] ?? (o.rodzaj === "chorobowy" ? "Zasiłek chorobowy" : "Inny okres")}: {dataPL(o.od)} – {dataPL(o.do)}</div>) : "—"}</dd>
                <dt>Wariant 81,5%</dt><dd>{d.wariant_81_5 == null ? "—" : d.wariant_81_5 ? "tak" : "nie"}</dd>
              </dl></div>

            {ub && <div className="card navy"><h3>Czy ma ubezpieczenie? <span className="badge sim">symulacja ZUS</span></h3>
              <p>Dane fikcyjnego profilu: <b>{ub.osoba}</b>. Nieprzerwane ubezpieczenie chorobowe: <b>{ub.dniNieprzerwanegoUbezpieczeniaChorobowego} dni</b>. Ubezpieczenie w dniu zdarzenia: <b>{ub.ubezpieczonaWDniu ? "aktywne" : "nieaktywne"}</b>.</p></div>}

            {d.skladniki_miesieczne?.length > 0 && <div className="card"><h3>Wynagrodzenia z zaświadczenia</h3><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Miesiąc</th><th className="num">Dni</th><th className="num">Stałe</th><th className="num">Zmienne</th><th className="num">Premie</th></tr></thead>
              <tbody>{d.skladniki_miesieczne.map((m: any, i: number) => <tr key={i}><td>{dataPL(`${m.rok}-${String(m.miesiac).padStart(2, "0")}-01`).replace(/^1 /, "")}</td><td className="num">{m.dniPrzepracowal ?? "—"}/{m.dniObowiazany ?? "—"}</td><td className="num">{pln(m.stale)}</td><td className="num">{pln(m.zmiennePomniejszone)}</td><td className="num">{pln(m.premieFaktyczne)}</td></tr>)}</tbody></table></div></div>}

            {pod && <div className="card accent"><h3>Podstawa wymiaru zasiłku</h3>
              <div className="stat"><div className="v">{pln(pod.podstawaMiesieczna)}</div><div className="l">miesięcznie (dziennie {pln(pod.podstawaDzienna)})</div></div>
              <Kroki kroki={pod.kroki} />{pod.ostrzezenia?.length > 0 && <Alert t="warn">Sprawdź dane odczytane z zaświadczenia i skonsultuj wynik z ZUS.</Alert>}
              {d.decyzja?.podstawa_wymiaru != null && <Alert t={Math.abs(d.decyzja.podstawa_wymiaru - pod.podstawaMiesieczna) < 1 ? "ok" : "warn"}>Podstawa z decyzji ZUS: <b>{pln(d.decyzja.podstawa_wymiaru)}</b>{Math.abs(d.decyzja.podstawa_wymiaru - pod.podstawaMiesieczna) < 1 ? " – zgodna z naszym wyliczeniem." : " – różni się od naszego wyliczenia, sprawdź dane."}</Alert>}
              <button className="btn btn-primary mt" onClick={policz}>Policz zasiłek z tą podstawą →</button></div>}
            {!pod && <Alert t="info">Z tego dokumentu nie odczytano tabeli wynagrodzeń, więc podstawy nie wyliczono. Wprowadź zarobki ręcznie w <a href="/kalkulator">kalkulatorze</a>.</Alert>}
          </>}
        </div>
      </div>
    </>
  );
}
