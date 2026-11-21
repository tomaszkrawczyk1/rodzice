"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dataKrotka, pln, dzis } from "@/lib/format";
import { Alert, Sim } from "@/components/ui";
import Szukaj from "@/components/Szukaj";
import { SPRAWY, TOP, najpilniejsze, sprawa, zaIle, type Moment } from "@/lib/sprawy";
import { dataPL } from "@/lib/format";

export default function Home() {
  const { sesja } = useSesja(); const [d, setD] = useState<any>(null); const [moment, setMoment] = useState<Moment | null>(null); const [pilne, setPilne] = useState<any>(null);
  useEffect(() => { if (!sesja) { setPilne(null); return; } najpilniejsze(api, sesja).then(setPilne); }, [sesja]);
  useEffect(() => {
    if (!sesja) return setD(null);
    const naDzien = dzis();
    Promise.all([api(`/api/zus/ubezpieczenie?pesel=${sesja.pesel}&naDzien=${naDzien}`), api(`/api/zus/ezla?pesel=${sesja.pesel}`), api(`/api/zus/zadluzenie?pesel=${sesja.pesel}&naDzien=${naDzien}`)]).then(([u, e, z]) => setD({ u, e, z })).catch(() => setD(null));
  }, [sesja]);
  const MOMENTY: [Moment, string, string, string][] = [["plan", "🗓️", "Planuję dziecko", "Co zrobić wcześniej, żeby niczego nie stracić"], ["ciaza", "🤰", "Jestem w ciąży", "Zwolnienie, zasiłek, urlop"], ["dziecko", "👶", "Dziecko już jest", "Wniosek o zasiłek, urlopy, podział z partnerem"]];
  const imie = sesja?.osoba.split(" ")[0];
  return (
    <>
      <section className="hero">
        <h1>{sesja ? `Dzień dobry, ${imie}` : "Co chcesz załatwić?"}</h1>
        <p>{sesja ? (pilne ? "Masz jedną rzecz do zrobienia. Resztę znajdziesz niżej." : "Wybierz, czym się zajmiemy.") : "Nie musisz znać nazw urzędowych. Wybierz, gdzie jesteś, a pokażemy trzy najczęstsze sprawy."}</p>
        {!sesja && <div className="row"><Link href="/logowanie" className="btn btn-login">Zaloguj przez mObywatela</Link><span className="small muted">Pobierzemy Twoje dane z ZUS (symulacja), żeby nie wpisywać ich ręcznie.</span></div>}
      </section>

      {pilne && (
        <div className="card urgent mb">
          <span className="badge warn">Najpilniejsze</span>
          <h2 style={{ marginTop: 8 }}>{pilne.co}</h2>
          <p>Termin: <b>{dataPL(pilne.do)}</b> ({zaIle(pilne.do)}). Masz już wpisane: imię, PESEL, datę porodu i pracodawcę.</p>
          <Link href={`/sprawa/${pilne.sprawa}`} className="btn btn-primary">Zrób to teraz · {sprawa(pilne.sprawa)?.czas.split(" · ")[1] ?? "kilka minut"}</Link>
        </div>
      )}

      {!moment ? (
        <>
          <h2>1. Gdzie jesteś?</h2>
          <div className="grid g3">{MOMENTY.map(([k, ic, t, o]) => <button key={k} className="tile" onClick={() => { setMoment(k); scrollTo(0, 0); }}><span className="ic">{ic}</span><b>{t}</b><span>{o}</span></button>)}</div>
          <p className="mt small">Inna sytuacja: <Link href="/sprawa/adopcja">adopcja lub rodzina zastępcza</Link> · <Link href="/sprawa/trudna-sytuacja">stało się coś trudnego</Link></p>
        </>
      ) : (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setMoment(null)}>← Zmień</button>
          <h2 className="mt">2. {TOP[moment].tytul}: co chcesz zrobić?</h2>
          <div className="grid g3">{TOP[moment].ids.map((id) => { const s = sprawa(id)!; return <Link key={id} href={`/sprawa/${id}`} className="tile"><span className="ic">{s.ikona}</span><b>{s.tytul}</b><span>{s.krotko}</span><span className="time">⏱ {s.czas}</span></Link>; })}</div>
          <p className="mt"><Link href="/sprawy" className="btn btn-secondary btn-sm">Pokaż pozostałe sprawy ({SPRAWY.length - TOP[moment].ids.length})</Link></p>
        </>
      )}

      <Szukaj />

      {sesja && (
        <div className="card mt">
          <div className="row between"><h3>Twoje dane z ZUS</h3><span><Sim /> dane testowe</span></div>
          {d ? (
            <div className="grid g3">
              <div className="stat"><div className="v">{d.u.dniNieprzerwanegoUbezpieczeniaChorobowego} dni</div><div className="l">nieprzerwanego ubezpieczenia chorobowego</div></div>
              <div className="stat"><div className="v">{d.e.lacznieDni} dni</div><div className="l">zwolnień e-ZLA ({d.e.ezla.length})</div></div>
              <div className="stat"><div className="v">{pln(d.z.kwotaZadluzenia)}</div><div className="l">zadłużenie składkowe {d.z.przekroczonyProg ? "– powyżej progu" : ""}</div></div>
            </div>
          ) : <p className="muted">Pobieram dane…</p>}
          {d && d.u.ubezpieczenie.map((u: any, i: number) => <p key={i} className="small muted">Tytuł: <b>{u.tytul.replaceAll("_", " ")}</b> · od {dataKrotka(u.od)}{u.do ? ` do ${dataKrotka(u.do)}` : ""} · chorobowe: {u.chorobowe} · płatnik: {u.platnik.nazwa} ({u.platnik.liczbaUbezpieczonych} ubezp.)</p>)}
          {d?.z.przekroczonyProg && <Alert t="warn">Masz zadłużenie składkowe powyżej progu ({pln(d.z.prog)}). To może wstrzymać wypłatę zasiłku.</Alert>}
        </div>
      )}
    </>
  );
}
