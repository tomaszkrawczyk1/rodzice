"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { useT } from "@/lib/jezyk";
import { dzis } from "@/lib/format";
import { useFormaty } from "@/lib/jezyk";
import { nazwaUbezpieczenia, rodzajChorobowego, wynikZadluzenia, type StanZadluzeniaNaDzien, type UbezpieczenieProfilu } from "@/lib/dane-profilu";
import { Alert, Sim } from "@/components/ui";
import Szkielet from "@/components/Szkielet";
import Szukaj from "@/components/Szukaj";
import { Plakietka, ikonaSprawy } from "@/components/Ikony";
import { przejdzDoKroku } from "@/lib/ekran";
import { przejdzKrok, wrocDoKroku } from "@/lib/adres-kroku";
import { ETAP_W_ADRESIE, etapZAdresu, normalizujZapytanie } from "@/lib/adres-glowna";
import { najpilniejsze, sprawa, zaIle, type Moment } from "@/lib/sprawy";

const MOMENTY = {
  plan: { tytul: "Planuję dziecko", opis: "Ubezpieczenie i urlop", sprawy: ["co-przysluguje", "podzial-urlopu"] },
  ciaza: { tytul: "Czekamy na dziecko", opis: "Zwolnienie, urlopy, wnioski", sprawy: ["co-przysluguje", "podzial-urlopu", "wniosek-zasilek", "zwolnienie-ciaza"] },
  dziecko: { tytul: "Dziecko już jest z nami", opis: "Zasiłek, urlopy, terminy", sprawy: ["wniosek-zasilek", "urlop-pracodawca", "podzial-urlopu", "terminy"] },
} satisfies Record<Moment, { tytul: string; opis: string; sprawy: string[] }>;
// „Dziecko już jest z nami" jest pierwsze i wyróżnione: kto jest po porodzie, ma najmniej sił i najkrótszy czas na wnioski.
const KOLEJNOSC: Moment[] = ["dziecko", "ciaza", "plan"];

type Dane = {
  u: { dniNieprzerwanegoUbezpieczeniaChorobowego: number; ubezpieczenie: UbezpieczenieProfilu[] };
  e: { lacznieDni: number };
  z: StanZadluzeniaNaDzien;
};

function PodgladProfilu({ pesel }: { pesel: string }) {
  const { dataPL, pln } = useFormaty();
  const t = useT();
  const [dane, setDane] = useState<Dane | null>(null);
  const [blad, setBlad] = useState(false);

  useEffect(() => {
    let aktualne = true;
    const zapytanie = { pesel, naDzien: dzis() };
    Promise.all([
      api<Dane["u"]>("/api/zus/ubezpieczenie", zapytanie),
      api<Dane["e"]>("/api/zus/ezla", zapytanie),
      api<Dane["z"]>("/api/zus/zadluzenie", zapytanie),
    ]).then(([u, e, z]) => { if (aktualne) setDane({ u, e, z }); })
      .catch(() => { if (aktualne) setBlad(true); });
    return () => { aktualne = false; };
  }, [pesel]);

  return (
    <section className={"card mt" + (dane || blad ? "" : " slot-profil")}>
      <h2>{t("Dane z profilu testowego")}</h2>
      {blad && <Alert t="err">{t("Nie udało się pobrać danych profilu. Nadal możesz wybrać sprawę i wpisać dane samodzielnie.")}</Alert>}
      {!dane && !blad && <Szkielet etykieta={t("Wczytujemy dane profilu…")} wiersze={3} />}
      {dane && <>
        <dl>
          <dt>{t("Dni ubezpieczenia chorobowego")}</dt><dd>{dane.u.dniNieprzerwanegoUbezpieczeniaChorobowego}</dd>
          <dt>{t("Dni zwolnień lekarskich")}</dt><dd>{dane.e.lacznieDni}</dd>
        </dl>
        <h3>{t("Stan zadłużenia na dzień {data}", { data: dataPL(dane.z.naDzien) })} <Sim /></h3>
        {dane.z.wynik === "nie_dotyczy" ? <p>{dane.z.komunikat}</p> : (
          <dl>
            <dt>{t("Zaległości w składkach")}</dt><dd>{pln(dane.z.kwotaZadluzenia)}</dd>
            <dt>{t("Próg")}</dt><dd>{pln(dane.z.prog)}</dd>
            <dt>{t("Wynik")}</dt><dd>{t(wynikZadluzenia(dane.z))}</dd>
          </dl>
        )}
        {dane.u.ubezpieczenie.map((u, i) => (
          <p key={i}>
            <b>{t(nazwaUbezpieczenia(u.tytul))}</b> {t("od")} {dataPL(u.od)}{u.do && <> {t("do")} {dataPL(u.do)}</>}.
            {" " + t("Ubezpieczenie chorobowe:") + " "}{t(rodzajChorobowego(u.chorobowe))}.
            {u.platnik && <> {t("Płatnik składek:")} {u.platnik.nazwa}.</>}
          </p>
        ))}
        {dane.z.przekroczonyProg && <Alert t="warn">{dane.z.komunikat} {t("Sprawdź w ZUS, jak to wygląda w Twojej sprawie.")}</Alert>}
      </>}
    </section>
  );
}

// Etap i zapytanie wyszukiwarki są w adresie (`/?etap=czekamy`, `/?q=urlop+ojcowski`). Każdy wybór etapu to nowy wpis
// historii, więc „Wstecz" wraca do wyboru etapu, a adres można podlinkować i odświeżyć.
export default function Home() {
  const { opisTerminu, dataPL } = useFormaty();
  const t = useT();
  const { sesja } = useSesja();
  const params = useSearchParams();
  const etapZAdresuUrl = etapZAdresu(params.get("etap"));
  const zapytanie = normalizujZapytanie(params.get("q"));
  // Lokalna kopia, żeby ekran zmieniał się od razu (adres odświeża się chwilę później); „Wstecz" i „Dalej" ją synchronizują.
  const [moment, setMoment] = useState<Moment | null>(etapZAdresuUrl);
  useEffect(() => { setMoment(etapZAdresuUrl); }, [etapZAdresuUrl]);
  const etapy = useRef<HTMLHeadingElement>(null);
  const poprzedni = useRef(moment);

  function wybierzEtap(wybrany: Moment) {
    setMoment(wybrany);
    przejdzKrok({ etap: ETAP_W_ADRESIE[wybrany] });
  }
  // Jeśli poprzedni wpis historii to ekran wyboru etapu, cofamy historię (jak „Wstecz"); przy wejściu z linku dodajemy wpis.
  function wrocDoWyboru() {
    setMoment(null);
    wrocDoKroku({ etap: null });
  }

  // Po każdej zmianie etapu (kliknięcie, „Wróć", „Wstecz" w przeglądarce) fokus ląduje na nagłówku nowego ekranu.
  useEffect(() => {
    if (poprzedni.current === moment) return;
    poprzedni.current = moment;
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
        <h1>{t("Co chcesz dzisiaj załatwić?")}</h1>
        <p>{t("Wybierz sytuację albo opisz sprawę swoimi słowami. Bez logowania.")}</p>
      </section>

      {/* Wyszukiwarka jest pierwszą rzeczą po tytule: kto wie, czego szuka, nie musi przechodzić przez kafle. */}
      <Szukaj wariant="glowny" zapytanie={zapytanie} />

      {/* Miejsce na kartę rezerwuje CSS od pierwszego malowania, jeśli w przeglądarce jest zapisana sesja (html[data-sesja]). */}
      {(
        <div className={sesja && pilnaSprawa?.token === sesja.token ? undefined : "slot-pilne"}>
          {sesja && (pilne ? (
            <section className="card urgent mb" style={{ overflowWrap: "anywhere" }}>
              <h2>{t("Najbliższy termin z profilu")}</h2>
              <p>{opisTerminu(pilne.co)}</p>
              <p><b>{dataPL(pilne.do)}</b> ({zaIle(pilne.do)})</p>
              <Link href={`/sprawa/${pilne.sprawa}`} className="btn btn-primary">{t("Otwórz sprawę")}</Link>
            </section>
          ) : pilnaSprawa?.token !== sesja.token && <p className="muted" role="status">{t("Sprawdzam najbliższy termin z profilu…")}</p>)}
        </div>
      )}

      {!moment ? (
        <>
          <h2 ref={etapy} tabIndex={-1}>{t("Na jakim jesteście etapie?")}</h2>
          <div className="grid g3 grid--etapy">
            {KOLEJNOSC.map((id) => (
              <button key={id} type="button" className={"tile tile--ico" + (id === "dziecko" ? " tile--glowny" : "")} onClick={() => wybierzEtap(id)}>
                <Plakietka nazwa={id} />
                <span className="tile__txt"><b>{t(MOMENTY[id].tytul)}</b><span>{t(MOMENTY[id].opis)}</span></span>
              </button>
            ))}
            <Link href="/kalendarz" className="tile tile--ico">
              <Plakietka nazwa="kalendarz" />
              <span className="tile__txt"><b>{t("Kalendarz ciąży i połogu")}</b><span>{t("Badania i terminy ZUS w jednym miejscu")}</span></span>
            </Link>
            <Link href="/sprawa/adopcja" className="tile tile--ico">
              <Plakietka nazwa="adopcja" />
              <span className="tile__txt"><b>{t("Adopcja lub rodzina zastępcza")}</b><span>{t("Urlopy i zasiłek po przyjęciu dziecka")}</span></span>
            </Link>
            <Link href="/trudne" className="tile tile--ico tile--szeroki">
              <Plakietka nazwa="trudne" />
              <span className="tile__txt"><b>{t("Trudna sytuacja")}</b><span>{t("Strata, wcześniactwo, choroba")}</span></span>
            </Link>
          </div>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-ghost" onClick={wrocDoWyboru}>{t("Wróć do wyboru etapu")}</button>
          <h2 className="mt" ref={etapy} tabIndex={-1}>{t(MOMENTY[moment].tytul)}</h2>
          <div className="grid g3">
            {MOMENTY[moment].sprawy.map((id) => {
              const s = sprawa(id);
              return s && <Link key={id} href={`/sprawa/${id}`} className="tile tile--ico">
                <Plakietka nazwa={ikonaSprawy(id)} />
                <span className="tile__txt"><b>{t(s.tytul)}</b><span>{t(s.krotko)}</span></span>
              </Link>;
            })}
            <Link href="/kreator?sciezka=ojciec" className="tile tile--ico">
              <Plakietka nazwa="rodzina" />
              <span className="tile__txt"><b>{t("Urlopy dla taty i drugiego rodzica")}</b><span>{t("Urlop ojcowski i podział urlopu")}</span></span>
            </Link>
            {(moment === "ciaza" || moment === "dziecko") && (
              <Link href="/kalendarz" className="tile tile--ico">
                <Plakietka nazwa="kalendarz" />
                <span className="tile__txt"><b>{t("Kalendarz ciąży i połogu")}</b><span>{t("Badania i terminy ZUS w jednym miejscu")}</span></span>
              </Link>
            )}
            {moment === "plan" && (
              <Link href="/ryzyka" className="tile tile--ico">
                <Plakietka nazwa="praca" />
                <span className="tile__txt"><b>{t("Ubezpieczenie i ochrona w pracy")}</b><span>{t("Co może wpłynąć na zasiłek i kiedy prawo chroni umowę o pracę")}</span></span>
              </Link>
            )}
          </div>
          <p className="mt"><Link href="/sprawy" className="btn btn-secondary">{t("Zobacz wszystkie sprawy")}</Link></p>
        </>
      )}

      {sesja && <PodgladProfilu key={sesja.token} pesel={sesja.pesel} />}
    </>
  );
}
