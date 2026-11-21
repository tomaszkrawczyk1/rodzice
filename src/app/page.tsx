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
  const { sesja } = useSesja();
  const [d, setD] = useState<any>(null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [pilne, setPilne] = useState<any>(null);

  useEffect(() => {
    if (!sesja) { setPilne(null); return; }
    najpilniejsze(api, sesja).then(setPilne);
  }, [sesja]);

  useEffect(() => {
    if (!sesja) return setD(null);
    const naDzien = dzis();
    Promise.all([
      api(`/api/zus/ubezpieczenie?pesel=${sesja.pesel}&naDzien=${naDzien}`),
      api(`/api/zus/ezla?pesel=${sesja.pesel}`),
      api(`/api/zus/zadluzenie?pesel=${sesja.pesel}&naDzien=${naDzien}`),
    ]).then(([u, e, z]) => setD({ u, e, z })).catch(() => setD(null));
  }, [sesja]);

  const MOMENTY: [Moment, string, string][] = [
    ["plan", "Planuję dziecko", "Co warto wiedzieć wcześniej, żeby nie stracić uprawnień i zasiłku"],
    ["ciaza", "Jestem w ciąży", "Zwolnienie lekarskie, ochrona zatrudnienia i przygotowanie do urlopu"],
    ["dziecko", "Dziecko już jest z nami", "Wniosek o zasiłek, plan urlopów i podział z drugim rodzicem"],
  ];

  const imie = sesja?.osoba.split(" ")[0];

  return (
    <>
      <section className="hero">
        <h1>{sesja ? `Dzień dobry, ${imie}` : "Co chcesz dzisiaj załatwić?"}</h1>
        <p>
          {sesja
            ? (pilne
                ? "Masz jedną pilną sprawę do załatwienia. Szczegóły znajdziesz poniżej."
                : "Wybierz sprawę, w której możemy Ci pomóc.")
            : "Nie musisz znać przepisów ani urzędowych nazw. Wybierz swój etap, a podpowiemy najważniejsze kroki."}
        </p>
        {!sesja && (
          <div className="row">
            <Link href="/logowanie" className="btn btn-login">Zaloguj się przez mObywatela</Link>
            <span className="small muted">Pobierzemy Twoje dane z ZUS (symulacja), żeby nie trzeba było wpisywać ich ręcznie.</span>
          </div>
        )}
      </section>

      {pilne && (
        <div className="card urgent mb">
          <span className="badge warn">Pilna sprawa</span>
          <h2 style={{ marginTop: 8 }}>{pilne.co}</h2>
          <p>
            Termin złożenia: <b>{dataPL(pilne.do)}</b> ({zaIle(pilne.do)}). Mamy już przygotowane Twoje dane: imię, PESEL, datę porodu oraz dane pracodawcy.
          </p>
          <Link href={`/sprawa/${pilne.sprawa}`} className="btn btn-primary">
            Załatw teraz · {sprawa(pilne.sprawa)?.czas.split(" · ")[1] ?? "kilka minut"}
          </Link>
        </div>
      )}

      {!moment ? (
        <>
          <h2>Na jakim jesteś etapie?</h2>
          <div className="grid g3">
            {MOMENTY.map(([k, t, o]) => (
              <button key={k} className="tile" onClick={() => { setMoment(k); scrollTo(0, 0); }}>
                <b>{t}</b>
                <span>{o}</span>
              </button>
            ))}
          </div>
          <p className="mt small">
            Inne sytuacje: <Link href="/sprawa/adopcja">adopcja lub rodzina zastępcza</Link> · <Link href="/sprawa/trudna-sytuacja">trudna sytuacja życiowa (np. strata, leczenie w szpitalu)</Link>
          </p>
        </>
      ) : (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setMoment(null)}>← Wróć do wyboru etapu</button>
          <h2 className="mt">{TOP[moment].tytul}: co chcesz załatwić?</h2>
          <div className="grid g3">
            {TOP[moment].ids.map((id) => {
              const s = sprawa(id)!;
              return (
                <Link key={id} href={`/sprawa/${id}`} className="tile">
                  <b>{s.tytul}</b>
                  <span>{s.krotko}</span>
                  <span className="time">Czas: {s.czas}</span>
                </Link>
              );
            })}
          </div>
          <p className="mt">
            <Link href="/sprawy" className="btn btn-secondary btn-sm">
              Zobacz wszystkie sprawy ({SPRAWY.length - TOP[moment].ids.length} pozostałych)
            </Link>
          </p>
        </>
      )}

      <Szukaj />

      {sesja && (
        <div className="card mt">
          <div className="row between">
            <h3>Twoje dane pobrane z ZUS</h3>
            <span><Sim /> środowisko testowe</span>
          </div>
          {d ? (
            <div className="grid g3">
              <div className="stat">
                <div className="v">{d.u.dniNieprzerwanegoUbezpieczeniaChorobowego} dni</div>
                <div className="l">nieprzerwanego ubezpieczenia chorobowego</div>
              </div>
              <div className="stat">
                <div className="v">{d.e.lacznieDni} dni</div>
                <div className="l">zwolnień lekarskich e-ZLA ({d.e.ezla.length})</div>
              </div>
              <div className="stat">
                <div className="v">{pln(d.z.kwotaZadluzenia)}</div>
                <div className="l">zaległości w składkach {d.z.przekroczonyProg ? "– powyżej limitu" : ""}</div>
              </div>
            </div>
          ) : <p className="muted">Wczytuję dane z ZUS…</p>}
          {d && d.u.ubezpieczenie.map((u: any, i: number) => (
            <p key={i} className="small muted">
              Tytuł ubezpieczenia: <b>{u.tytul.replaceAll("_", " ")}</b> · od {dataKrotka(u.od)}{u.do ? ` do ${dataKrotka(u.do)}` : ""} · chorobowe: {u.chorobowe} · pracodawca: {u.platnik.nazwa} ({u.platnik.liczbaUbezpieczonych} pracowników)
            </p>
          ))}
          {d?.z.przekroczonyProg && (
            <Alert t="warn">
              Masz zaległość w opłacaniu składek przekraczającą dopuszczalny limit ({pln(d.z.prog)}). Dopóki jej nie uregulujesz, ZUS wstrzyma wypłatę zasiłku.
            </Alert>
          )}
        </div>
      )}
    </>
  );
}
