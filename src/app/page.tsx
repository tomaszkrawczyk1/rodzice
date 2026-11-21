"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dataKrotka, pln, dzis } from "@/lib/format";
import { Alert, Sim } from "@/components/ui";

const ETAPY = [
  ["Planuję dziecko", "Dowiedz się, co przysługuje i jak zabezpieczyć prawo do zasiłków.", "/ciaza"],
  ["Jestem w ciąży", "Zasiłek chorobowy, rehabilitacyjny i co, jeśli straciłaś pracę.", "/ciaza"],
  ["Dziecko już jest", "Policz zasiłek macierzyński i zaplanuj urlopy obojga rodziców.", "/kalkulator"],
  ["Adopcja / rodzina zastępcza", "Urlop na warunkach macierzyńskiego, limity wieku dziecka.", "/kalkulator?tryb=adopcja"],
] as const;
const FUNKCJE = [
  ["/kreator", "Kreator: co mnie dotyczy?", "Kilka pytań i gotowa lista odpowiedzi, druków i właściwy kalkulator."],
  ["/poradnik", "Poradnik", "28 typowych pytań rodziców z krokami do wykonania."],
  ["/druki", "Druki", "ZAM, Z-3, Z-3a, ZAS-12, ZAS-26, ZAS-53: do czego, kto składa, do kiedy."],
  ["/ciaza", "Co mi przysługuje", "Zasiłek chorobowy w ciąży, świadczenie rehabilitacyjne, brak uprawnień i co wtedy."],
  ["/kalkulator", "Kalkulator zasiłku", "Matka, ojciec, oboje, łączenie z pracą, adopcja – okres i kwota."],
  ["/dokumenty", "Dokumenty i terminy", "Kto wypłaca (pracodawca czy ZUS), jaki druk i do kiedy."],
  ["/ryzyka", "Ryzyka i ochrona", "Co może Cię pozbawić zasiłku. Ochrona przed zwolnieniem."],
  ["/trudne", "Trudne sytuacje", "Martwe urodzenie, wcześniak, choroba, śmierć matki. Organizacje wsparcia."],
  ["/wnioski", "Kreator wniosków", "Wniosek o urlop i o zasiłek – wypełnij i „wyślij”."],
  ["/wgraj", "Wgraj wniosek (AI)", "Odczytaj dane ze skanu ZAM / Z-3 i policz zasiłek."],
  ["/pue", "Konto PUE", "Podgląd danych w ZUS i pytanie do ZUS."],
] as const;

export default function Home() {
  const { sesja } = useSesja(); const [d, setD] = useState<any>(null);
  useEffect(() => {
    if (!sesja) return setD(null);
    const naDzien = dzis();
    Promise.all([api(`/api/zus/ubezpieczenie?pesel=${sesja.pesel}&naDzien=${naDzien}`), api(`/api/zus/ezla?pesel=${sesja.pesel}`), api(`/api/zus/zadluzenie?pesel=${sesja.pesel}&naDzien=${naDzien}`)]).then(([u, e, z]) => setD({ u, e, z })).catch(() => setD(null));
  }, [sesja]);
  return (
    <>
      <section className="hero">
        <h1>Wiesz, co Ci przysługuje, zanim urodzi się dziecko</h1>
        <p>Odpowiedz na kilka pytań, a pokażemy zasiłki i urlopy dla Ciebie i drugiego rodzica: <b>ile tygodni, ile pieniędzy, gdzie złożyć dokumenty i czego uważać</b>. Bez szukania po przepisach.</p>
        <div className="row"><Link href="/kalkulator" className="btn btn-primary">Policz zasiłek</Link><Link href="/kreator" className="btn btn-secondary">Co mnie dotyczy?</Link>{!sesja && <Link href="/logowanie" className="btn btn-login">Zaloguj przez mObywatela</Link>}</div>
      </section>

      {sesja && (
        <div className="card accent mb">
          <div className="row between"><h2>Dzień dobry, {sesja.osoba.split(" ")[0]}</h2><span><Sim /> dane z ZUS (dane testowe)</span></div>
          {d ? (
            <div className="grid g3">
              <div className="stat"><div className="v">{d.u.dniNieprzerwanegoUbezpieczeniaChorobowego} dni</div><div className="l">nieprzerwanego ubezpieczenia chorobowego</div></div>
              <div className="stat"><div className="v">{d.e.lacznieDni} dni</div><div className="l">zwolnień e-ZLA ({d.e.ezla.length})</div></div>
              <div className="stat"><div className="v">{pln(d.z.kwotaZadluzenia)}</div><div className="l">zadłużenie składkowe {d.z.przekroczonyProg ? "– powyżej progu" : ""}</div></div>
            </div>
          ) : <p className="muted">Pobieram dane…</p>}
          {d && d.u.ubezpieczenie.map((u: any, i: number) => <p key={i} className="small muted">Tytuł: <b>{u.tytul.replaceAll("_", " ")}</b> · od {dataKrotka(u.od)}{u.do ? ` do ${dataKrotka(u.do)}` : ""} · chorobowe: {u.chorobowe} · płatnik: {u.platnik.nazwa} ({u.platnik.liczbaUbezpieczonych} ubezp.)</p>)}
          {d?.z.przekroczonyProg && <Alert t="warn">Masz zadłużenie składkowe powyżej progu ({pln(d.z.prog)}). To może wstrzymać wypłatę zasiłku – zobacz zakładkę „Ryzyka”.</Alert>}
          <div className="row mt"><Link href="/ciaza?auto=1" className="btn btn-primary">Sprawdź moje uprawnienia</Link><Link href="/pue" className="btn btn-secondary">Konto PUE</Link></div>
        </div>
      )}

      <h2>W jakim jesteś momencie?</h2>
      <div className="grid g4 mb">{ETAPY.map(([t, o, h]) => <Link key={t} href={h} className="card" style={{ textDecoration: "none", color: "inherit" }}><h3>{t}</h3><p className="small muted">{o}</p><span className="btn btn-ghost btn-sm">Dalej →</span></Link>)}</div>

      <h2>Co znajdziesz w przewodniku</h2>
      <div className="grid g4">{FUNKCJE.map(([h, t, o]) => <Link key={h} href={h} className="card" style={{ textDecoration: "none", color: "inherit" }}><h3>{t}</h3><p className="small muted">{o}</p></Link>)}</div>

      <div className="card navy mt"><h3>Dlaczego to ważne</h3><p>Rodzice często nie wiedzą o swoich uprawnieniach, są zaskakiwani brakiem zasiłku albo rezygnują z elastycznych rozwiązań z obawy przed utratą świadczeń. Dobrze zaplanowane urlopy i terminowe wnioski to więcej spokoju w pierwszych miesiącach z dzieckiem.</p></div>
    </>
  );
}
