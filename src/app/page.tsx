"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dataPL, pln, dzis, opisTerminu } from "@/lib/format";
import { nazwaUbezpieczenia, rodzajChorobowego, type UbezpieczenieProfilu } from "@/lib/dane-profilu";
import { Alert } from "@/components/ui";
import Szkielet from "@/components/Szkielet";
import Szukaj from "@/components/Szukaj";
import { przejdzDoKroku } from "@/lib/ekran";
import { najpilniejsze, sprawa, zaIle, type Moment } from "@/lib/sprawy";

const MOMENTY = {
  plan: { tytul: "Planuję dziecko", opis: "Ubezpieczenie i przygotowanie do urlopu", sprawy: ["co-przysluguje", "podzial-urlopu"] },
  ciaza: { tytul: "Czekamy na dziecko", opis: "Urlopy dla rodziców, zwolnienie w ciąży i przygotowanie do wniosku", sprawy: ["co-przysluguje", "podzial-urlopu", "wniosek-zasilek", "zwolnienie-ciaza"] },
  dziecko: { tytul: "Dziecko już jest z nami", opis: "Zasiłek, urlopy i terminy po narodzinach", sprawy: ["wniosek-zasilek", "urlop-pracodawca", "podzial-urlopu", "terminy"] },
} satisfies Record<Moment, { tytul: string; opis: string; sprawy: string[] }>;

type Dane = {
  u: { dniNieprzerwanegoUbezpieczeniaChorobowego: number; ubezpieczenie: UbezpieczenieProfilu[] };
  e: { lacznieDni: number };
  z: { kwotaZadluzenia: number; prog: number; przekroczonyProg: boolean };
};

function PodgladProfilu({ pesel }: { pesel: string }) {
  const [dane, setDane] = useState<Dane | null>(null);
  const [blad, setBlad] = useState(false);

  useEffect(() => {
    let aktualne = true;
    const query = new URLSearchParams({ pesel, naDzien: dzis() });
    Promise.all([
      api<Dane["u"]>(`/api/zus/ubezpieczenie?${query}`),
      api<Dane["e"]>(`/api/zus/ezla?${query}`),
      api<Dane["z"]>(`/api/zus/zadluzenie?${query}`),
    ]).then(([u, e, z]) => { if (aktualne) setDane({ u, e, z }); })
      .catch(() => { if (aktualne) setBlad(true); });
    return () => { aktualne = false; };
  }, [pesel]);

  return (
    <section className={"card mt" + (dane || blad ? "" : " slot-profil")}>
      <h2>Dane z profilu testowego</h2>
      {blad && <Alert t="err">Nie udało się pobrać danych profilu. Nadal możesz wybrać sprawę i wpisać dane samodzielnie.</Alert>}
      {!dane && !blad && <Szkielet etykieta="Wczytujemy dane profilu…" wiersze={3} />}
      {dane && <>
        <dl>
          <dt>Dni ubezpieczenia chorobowego</dt><dd>{dane.u.dniNieprzerwanegoUbezpieczeniaChorobowego}</dd>
          <dt>Dni zwolnień lekarskich</dt><dd>{dane.e.lacznieDni}</dd>
          <dt>Zaległości w składkach</dt><dd>{pln(dane.z.kwotaZadluzenia)}</dd>
        </dl>
        {dane.u.ubezpieczenie.map((u, i) => (
          <p key={i}>
            <b>{nazwaUbezpieczenia(u.tytul)}</b> od {dataPL(u.od)}{u.do && <> do {dataPL(u.do)}</>}.
            {" Ubezpieczenie chorobowe: "}{rodzajChorobowego(u.chorobowe)}.
            {u.platnik && <> Płatnik składek: {u.platnik.nazwa}.</>}
          </p>
        ))}
        {dane.z.przekroczonyProg && (
          <Alert t="warn">Zaległość przekracza próg {pln(dane.z.prog)}. Sprawdź w ZUS, czy wpłynie na wypłatę zasiłku.</Alert>
        )}
      </>}
    </section>
  );
}

export default function Home() {
  const { sesja } = useSesja();
  const [moment, setMoment] = useState<Moment | null>(null);
  const etapy = useRef<HTMLHeadingElement>(null);
  const poWyborze = useRef(false);

  function wybierzEtap(wybrany: Moment | null) {
    poWyborze.current = true;
    setMoment(wybrany);
  }

  useEffect(() => {
    if (!poWyborze.current) return;
    poWyborze.current = false;
    przejdzDoKroku(etapy.current, etapy.current);
  }, [moment]);
  const [pilnaSprawa, setPilnaSprawa] = useState<{ token: string; termin: Awaited<ReturnType<typeof najpilniejsze>> } | null>(null);
  const pilne = sesja && pilnaSprawa?.token === sesja.token ? pilnaSprawa.termin : null;

  useEffect(() => {
    if (!sesja) return;
    let aktualne = true;
    najpilniejsze(api, sesja).then((termin) => {
      if (aktualne) setPilnaSprawa({ token: sesja.token, termin });
    });
    return () => { aktualne = false; };
  }, [sesja]);

  return (
    <>
      <section className="hero">
        <h1>Co chcesz dzisiaj załatwić?</h1>
        <p>Wybierz sytuację, która dotyczy Ciebie lub bliskiej osoby. Możesz przejść przez sprawę bez logowania.</p>
      </section>

      {sesja && (
        // Miejsce na kartę rezerwujemy od razu po zalogowaniu, żeby jej dojście z serwera nie spychało kafelków w dół.
        <div className={pilnaSprawa?.token === sesja.token && !pilne ? undefined : "slot-pilne"}>
          {pilne ? (
            <section className="card urgent mb" style={{ overflowWrap: "anywhere" }}>
              <h2>Najbliższy termin z profilu</h2>
              <p>{opisTerminu(pilne.co)}</p>
              <p><b>{dataPL(pilne.do)}</b> ({zaIle(pilne.do)})</p>
              <Link href={`/sprawa/${pilne.sprawa}`} className="btn btn-primary">Otwórz sprawę</Link>
            </section>
          ) : pilnaSprawa?.token !== sesja.token && <p className="muted" role="status">Sprawdzam najbliższy termin z profilu…</p>}
        </div>
      )}

      {!moment ? (
        <>
          <h2 ref={etapy} tabIndex={-1}>Na jakim jesteście etapie?</h2>
          <div className="grid g3">
            {Object.entries(MOMENTY).map(([id, m]) => (
              <button key={id} className="tile" onClick={() => wybierzEtap(id as Moment)}>
                <b>{m.tytul}</b><span>{m.opis}</span>
              </button>
            ))}
            <Link href="/kalendarz" className="tile">
              <b>Kalendarz ciąży i połogu</b><span>Badania, wizyty i terminy ZUS na jednej osi czasu</span>
            </Link>
            <Link href="/sprawa/adopcja" className="tile">
              <b>Adopcja lub rodzina zastępcza</b><span>Urlopy, zasiłek i terminy po przyjęciu dziecka</span>
            </Link>
            <Link href="/trudne" className="tile">
              <b>Trudna sytuacja</b><span>Poronienie, strata dziecka, wcześniactwo lub choroba</span>
            </Link>
          </div>
        </>
      ) : (
        <>
          <button className="btn btn-ghost" onClick={() => wybierzEtap(null)}>Wróć do wyboru etapu</button>
          <h2 className="mt" ref={etapy} tabIndex={-1}>{MOMENTY[moment].tytul}</h2>
          <div className="grid g3">
            <Link href="/kreator?sciezka=ojciec" className="tile">
              <b>Urlopy dla taty i drugiego rodzica</b><span>Urlop ojcowski i podział urlopu rodzicielskiego</span>
            </Link>
            {(moment === "ciaza" || moment === "dziecko") && (
              <Link href="/kalendarz" className="tile">
                <b>Kalendarz ciąży i połogu</b><span>Badania, wizyty i terminy ZUS na jednej osi czasu</span>
              </Link>
            )}
            {MOMENTY[moment].sprawy.map((id) => {
              const s = sprawa(id);
              return s && <Link key={id} href={`/sprawa/${id}`} className="tile">
                <b>{s.tytul}</b><span>{s.krotko}</span>
              </Link>;
            })}
          </div>
          <p className="mt"><Link href="/sprawy" className="btn btn-secondary">Zobacz wszystkie sprawy</Link></p>
        </>
      )}

      <Szukaj />

      {sesja
        ? <PodgladProfilu key={sesja.token} pesel={sesja.pesel} />
        : <p className="mt"><Link href="/logowanie">Wypróbuj logowanie na profilu testowym</Link></p>}
    </>
  );
}
