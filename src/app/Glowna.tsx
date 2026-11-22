"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dataPL, pln, dzis, opisTerminu } from "@/lib/format";
import { nazwaUbezpieczenia, rodzajChorobowego, wynikZadluzenia, type StanZadluzeniaNaDzien, type UbezpieczenieProfilu } from "@/lib/dane-profilu";
import { Alert, Sim } from "@/components/ui";
import Szkielet from "@/components/Szkielet";
import Szukaj from "@/components/Szukaj";
import { Plakietka, ikonaSprawy } from "@/components/Ikony";
import { przejdzDoKroku } from "@/lib/ekran";
import { przejdzKrok, wrocDoKroku } from "@/lib/adres-kroku";
import { ETAP_W_ADRESIE, etapZAdresu, normalizujZapytanie } from "@/lib/adres-glowna";
import { najpilniejsze, sprawa, zaIle, type Moment } from "@/lib/sprawy";
import css from "./glowna.module.css";

// `sprawy` dotyczą każdej rodziny (także samotnych rodziców); `zDrugimRodzicem` są niżej, w osobnej, neutralnie nazwanej sekcji.
const MOMENTY = {
  plan: { tytul: "Planuję dziecko", opis: "Ubezpieczenie i urlop", sprawy: ["co-przysluguje"], zDrugimRodzicem: ["podzial-urlopu"] },
  ciaza: { tytul: "Czekamy na dziecko", opis: "Zwolnienie, urlopy, wnioski", sprawy: ["co-przysluguje", "zwolnienie-ciaza", "wniosek-zasilek"], zDrugimRodzicem: ["podzial-urlopu"] },
  dziecko: { tytul: "Dziecko już jest z nami", opis: "Zasiłek, urlopy, terminy", sprawy: ["wniosek-zasilek", "terminy", "urlop-pracodawca"], zDrugimRodzicem: ["podzial-urlopu"] },
} satisfies Record<Moment, { tytul: string; opis: string; sprawy: string[]; zDrugimRodzicem: string[] }>;
// Dwa główne etapy są równorzędne i stoją obok siebie na pierwszym ekranie (także na telefonie), w kolejności życia.
const GLOWNE_ETAPY: Moment[] = ["ciaza", "dziecko"];

/** Kafel-link, który od razu po kliknięciu pokazuje „Otwieram…” (nowa strona ładuje się chwilę później). */
function Kafel({ href, ikona, tytul, opis }: { href: string; ikona: string; tytul: string; opis: string }) {
  const [otwieram, setOtwieram] = useState(false);
  return (
    <Link
      href={href}
      className={"tile tile--ico " + css.kafel}
      aria-busy={otwieram || undefined}
      onClick={(e) => {
        // Otwarcie w nowej karcie (Ctrl/Cmd/Shift, środkowy przycisk) nie zmienia tej strony, więc bez „Otwieram…”.
        if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) setOtwieram(true);
      }}
    >
      <Plakietka nazwa={ikona} />
      <span className="tile__txt">
        <b>{tytul}</b><span>{opis}</span>
        {otwieram && <span className={css.otwieram} role="status">Otwieram…</span>}
      </span>
    </Link>
  );
}

type Dane = {
  u: { dniNieprzerwanegoUbezpieczeniaChorobowego: number; ubezpieczenie: UbezpieczenieProfilu[] };
  e: { lacznieDni: number };
  z: StanZadluzeniaNaDzien;
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
        </dl>
        <h3>Stan zadłużenia na dzień {dataPL(dane.z.naDzien)} <Sim /></h3>
        {dane.z.wynik === "nie_dotyczy" ? <p>{dane.z.komunikat}</p> : (
          <dl>
            <dt>Zaległości w składkach</dt><dd>{pln(dane.z.kwotaZadluzenia)}</dd>
            <dt>Próg</dt><dd>{pln(dane.z.prog)}</dd>
            <dt>Wynik</dt><dd>{wynikZadluzenia(dane.z)}</dd>
          </dl>
        )}
        {dane.u.ubezpieczenie.map((u, i) => (
          <p key={i}>
            <b>{nazwaUbezpieczenia(u.tytul)}</b> od {dataPL(u.od)}{u.do && <> do {dataPL(u.do)}</>}.
            {" Ubezpieczenie chorobowe: "}{rodzajChorobowego(u.chorobowe)}.
            {u.platnik && <> Płatnik składek: {u.platnik.nazwa}.</>}
          </p>
        ))}
        {dane.z.przekroczonyProg && <Alert t="warn">{dane.z.komunikat} Sprawdź w ZUS, jak to wygląda w Twojej sprawie.</Alert>}
      </>}
    </section>
  );
}

// Etap i zapytanie wyszukiwarki są w adresie (`/?etap=czekamy`, `/?q=urlop+ojcowski`). Każdy wybór etapu to nowy wpis
// historii, więc „Wstecz" wraca do wyboru etapu, a adres można podlinkować i odświeżyć.
export default function Home() {
  const { sesja } = useSesja();
  const params = useSearchParams();
  const etapZAdresuUrl = etapZAdresu(params.get("etap"));
  const zapytanie = normalizujZapytanie(params.get("q"));
  // Lokalna kopia, żeby ekran zmieniał się od razu (adres odświeża się chwilę później); „Wstecz" i „Dalej" ją synchronizują.
  const [moment, setMoment] = useState<Moment | null>(etapZAdresuUrl);
  useEffect(() => { setMoment(etapZAdresuUrl); }, [etapZAdresuUrl]);
  const etapy = useRef<HTMLHeadingElement>(null);
  const gora = useRef<HTMLElement>(null);
  const widokEtapu = useRef<HTMLDivElement>(null);
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
  // Przewijamy do początku widoku etapu (razem z przyciskiem „Wróć" nad nagłówkiem), a przy powrocie: na górę strony.
  useEffect(() => {
    if (poprzedni.current === moment) return;
    poprzedni.current = moment;
    przejdzDoKroku(moment ? widokEtapu.current : gora.current, etapy.current);
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

  const kafleSpraw = (ids: string[]) => ids.map((id) => {
    const s = sprawa(id);
    return s && <Kafel key={id} href={`/sprawa/${id}`} ikona={ikonaSprawy(id)} tytul={s.tytul} opis={s.krotko} />;
  });

  return (
    <>
      <section className="hero" ref={gora}>
        <h1>Co chcesz dzisiaj załatwić?</h1>
        <p className={css.podtytul}><b>Dla osób w ciąży i rodziców po porodzie.</b> Bezpłatnie, bez logowania.</p>
      </section>

      {!moment ? (
        <>
          {/* Oba etapy na pierwszym ekranie, równorzędne; pod nimi dyskretne skróty, a wyszukiwarka niżej. */}
          <h2 ref={etapy} tabIndex={-1} className={css.etapyNaglowek}>Na jakim jesteście etapie?</h2>
          <div className={css.etapy}>
            {GLOWNE_ETAPY.map((id) => (
              <button key={id} type="button" className={"tile " + css.etap} onClick={() => wybierzEtap(id)}>
                <Plakietka nazwa={id} />
                <span className="tile__txt"><b>{MOMENTY[id].tytul}</b><span className={css.etapOpis}>{MOMENTY[id].opis}</span></span>
              </button>
            ))}
          </div>
          <ul className={css.skroty} aria-label="Na skróty">
            <li><Link href="/kalkulator" className={css.skrot}>Kalkulator zasiłku</Link></li>
            <li><Link href="/trudne" className={css.skrot}>Pomoc w trudnej sytuacji</Link></li>
          </ul>
        </>
      ) : (
        <div ref={widokEtapu}>
          {/* Pasek przyklejony pod nagłówkiem strony: „Wróć" jest pod ręką także po przewinięciu listy spraw. */}
          <div className={css.pasekWroc}>
            <button type="button" className={"btn btn-ghost " + css.wroc} onClick={wrocDoWyboru}>← Wróć do wyboru etapu</button>
          </div>
          <h2 ref={etapy} tabIndex={-1}>{MOMENTY[moment].tytul}</h2>

          {moment === "dziecko" && (
            <section className={"card urgent " + css.pilne} aria-labelledby="pilne-po-porodzie">
              <h3 id="pilne-po-porodzie">Pilne po porodzie: wniosek o zasiłek macierzyński</h3>
              <p>
                Jeśli chcesz dostawać <b>co miesiąc tyle samo (81,5%)</b> przez cały urlop macierzyński i rodzicielski,
                złóż wniosek o oba urlopy <b>w ciągu 21 dni od porodu</b>.
              </p>
              <p className={css.uspokojenie}>
                Minęło już 21 dni? Spokojnie, zasiłek nie przepada. Dostaniesz wtedy 100% za urlop macierzyński
                i 70% za urlop rodzicielski.
              </p>
              <Link href="/sprawa/wniosek-zasilek" className="btn btn-primary">Złóż wniosek krok po kroku</Link>
            </section>
          )}

          <div className="grid g3">
            {kafleSpraw(MOMENTY[moment].sprawy)}
            {(moment === "ciaza" || moment === "dziecko") && (
              <Kafel href="/kalendarz" ikona="kalendarz" tytul="Kalendarz ciąży i połogu" opis="Badania i terminy ZUS w jednym miejscu" />
            )}
            {moment === "plan" && (
              <Kafel href="/ryzyka" ikona="praca" tytul="Ubezpieczenie i ochrona w pracy" opis="Co może wpłynąć na zasiłek i kiedy prawo chroni umowę o pracę" />
            )}
          </div>

          <h3 className={css.podsekcja}>Jeśli wychowujesz dziecko z drugim rodzicem</h3>
          <p className={"muted " + css.podsekcjaOpis}>Urlop ojcowski, część urlopu rodzicielskiego dla drugiego rodzica i to, jak go podzielić.</p>
          <div className="grid g3">
            <Kafel href="/kreator?sciezka=ojciec" ikona="rodzina" tytul="Urlopy dla taty i drugiego rodzica" opis="Urlop ojcowski i podział urlopu" />
            {kafleSpraw(MOMENTY[moment].zDrugimRodzicem)}
          </div>

          <p className="mt"><Link href="/sprawy" className="btn btn-secondary">Zobacz wszystkie sprawy</Link></p>
        </div>
      )}

      {/* Miejsce na kartę rezerwuje CSS od pierwszego malowania, jeśli w przeglądarce jest zapisana sesja (html[data-sesja]). */}
      <div className={sesja && pilnaSprawa?.token === sesja.token ? undefined : "slot-pilne"}>
        {sesja && (pilne ? (
          <section className="card urgent mb mt" style={{ overflowWrap: "anywhere" }}>
            <h2>Najbliższy termin z profilu</h2>
            <p>{opisTerminu(pilne.co)}</p>
            <p><b>{dataPL(pilne.do)}</b> ({zaIle(pilne.do)})</p>
            <Link href={`/sprawa/${pilne.sprawa}`} className="btn btn-primary">Otwórz sprawę</Link>
          </section>
        ) : pilnaSprawa?.token !== sesja.token && <p className="muted" role="status">Sprawdzam najbliższy termin z profilu…</p>)}
      </div>

      {/* Kto wie, czego szuka, wpisuje to swoimi słowami; wyszukiwarka nie wypycha już etapów poza pierwszy ekran. */}
      <Szukaj wariant="glowny" zapytanie={zapytanie} />

      {!moment && (
        <section className={css.inne} aria-labelledby="inne-sytuacje">
          <h2 id="inne-sytuacje" className={css.inneNaglowek}>Inne sytuacje</h2>
          <div className="grid g3">
            <button type="button" className={"tile tile--ico " + css.kafel} onClick={() => wybierzEtap("plan")}>
              <Plakietka nazwa="plan" />
              <span className="tile__txt"><b>{MOMENTY.plan.tytul}</b><span>{MOMENTY.plan.opis}</span></span>
            </button>
            <Kafel href="/kalendarz" ikona="kalendarz" tytul="Kalendarz ciąży i połogu" opis="Badania i terminy ZUS w jednym miejscu" />
            <Kafel href="/sprawa/adopcja" ikona="adopcja" tytul="Adopcja lub rodzina zastępcza" opis="Urlopy i zasiłek po przyjęciu dziecka" />
            <Kafel href="/trudne" ikona="trudne" tytul="Trudna sytuacja" opis="Strata, wcześniactwo, choroba" />
          </div>
        </section>
      )}

      {sesja && <PodgladProfilu key={sesja.token} pesel={sesja.pesel} />}
    </>
  );
}
