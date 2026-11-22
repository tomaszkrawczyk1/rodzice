"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSesja } from "@/lib/sesja";
import { dzis } from "@/lib/format";
import { useFormaty, useT } from "@/lib/jezyk";
import { nazwaUbezpieczenia, rodzajChorobowego, wynikZadluzenia, type StanZadluzeniaNaDzien, type UbezpieczenieProfilu, type ZwolnienieProfilu } from "@/lib/dane-profilu";
import { Alert, Field, Sim } from "@/components/ui";

type Konto = {
  osoba: string;
  pesel: string;
  dniNieprzerwanegoUbezpieczenia: number;
  ubezpieczenie: UbezpieczenieProfilu[];
  ezla: ZwolnienieProfilu[];
};

function Zaswiadczenie({ pesel }: { pesel: string }) {
  const { dataPL, pln } = useFormaty();
  const t = useT();
  const [dzien, setDzien] = useState(dzis());
  const [z, setZ] = useState<StanZadluzeniaNaDzien | null>(null);
  const [blad, setBlad] = useState(false);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dzien)) return;
    let aktualne = true;
    api<StanZadluzeniaNaDzien>("/api/zus/zadluzenie", { pesel, naDzien: dzien })
      .then((w) => { if (aktualne) { setZ(w); setBlad(false); } })
      .catch(() => { if (aktualne) setBlad(true); });
    return () => { aktualne = false; };
  }, [pesel, dzien]);

  return (
    <section className="card" style={{ overflowWrap: "anywhere" }}>
      <h2>{t("Zadłużenie z tytułu składek")} <Sim /></h2>
      <p>{t("Wybierz dzień, w którym powstaje prawo do świadczenia, na przykład dzień porodu. Pokażemy zadłużenie z tego dnia.")}</p>
      <Field label="Stan na dzień"><input type="date" value={dzien} onChange={(e) => setDzien(e.target.value)} /></Field>
      {blad && <Alert t="err">{t("Nie udało się pobrać zaświadczenia.")}</Alert>}
      {z && <>
        <h3>{t("Stan zadłużenia na dzień {data}", { data: dataPL(z.naDzien) })}</h3>
        {z.wynik === "nie_dotyczy" ? <p>{t(z.komunikat)}</p> : <>
          <dl>
            <dt>{t("Zaległości w składkach")}</dt><dd>{pln(z.kwotaZadluzenia)}</dd>
            <dt>{t("Próg")}</dt><dd>{pln(z.prog)}</dd>
            <dt>{t("Wynik")}</dt><dd>{t(wynikZadluzenia(z))}</dd>
          </dl>
          <Alert t={z.przekroczonyProg ? "warn" : "ok"}>{t(z.komunikat)}</Alert>
          {z.skladniki.length > 0 && <ul className="clean">{z.skladniki.map((s) => <li key={s.okres}>
            {t("Składka za {okres}: {kwota}, termin płatności minął {data}.", { okres: `${s.okres.slice(5)}.${s.okres.slice(0, 4)}`, kwota: pln(s.kwota), data: dataPL(s.terminPlatnosci) })}
          </li>)}</ul>}
        </>}
        <p className="small muted">{t("Zaświadczenie (symulacja) nr {numer}, wystawione {data}. To nie jest dokument z ZUS.", { numer: z.numerZaswiadczenia, data: dataPL(z.wystawiono) })}</p>
      </>}
    </section>
  );
}

function PodgladKonta({ pesel }: { pesel: string }) {
  const { dataPL } = useFormaty();
  const t = useT();
  const [konto, setKonto] = useState<Konto | null>(null);
  const [q, setQ] = useState({ temat: "Zasiłek macierzyński", tresc: "" });
  const [numer, setNumer] = useState("");
  const [bladKonta, setBladKonta] = useState(false);
  const [bladPytania, setBladPytania] = useState("");
  const [wysylanie, setWysylanie] = useState(false);

  useEffect(() => {
    let aktualne = true;
    api<Konto>("/api/pue/konto", { pesel })
      .then((k) => { if (aktualne) setKonto(k); })
      .catch(() => { if (aktualne) setBladKonta(true); });
    return () => { aktualne = false; };
  }, [pesel]);

  async function wyslij() {
    setNumer("");
    setBladPytania("");
    if (!q.tresc.trim()) return setBladPytania("Wpisz treść pytania.");
    setWysylanie(true);
    try {
      const wynik = await api<{ numerSprawy: string }>("/api/pue/pytanie", { ...q, tresc: q.tresc.trim() });
      setNumer(wynik.numerSprawy);
    } catch {
      setBladPytania("Nie udało się wysłać pytania testowego. Spróbuj ponownie.");
    } finally {
      setWysylanie(false);
    }
  }

  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <section className="card" style={{ overflowWrap: "anywhere" }}>
        <h2>{t("Dane profilu")}</h2>
        {bladKonta && <Alert t="err">{t("Nie udało się pobrać danych profilu.")}</Alert>}
        {!konto && !bladKonta && <p role="status">{t("Wczytujemy dane konta…")}</p>}
        {konto && <>
          <p><b>{konto.osoba}</b></p>
          <dl>
            <dt>PESEL</dt><dd>{konto.pesel}</dd>
            <dt>{t("Dni ubezpieczenia chorobowego")}</dt><dd>{konto.dniNieprzerwanegoUbezpieczenia}</dd>
          </dl>
          <h3>{t("Ubezpieczenia")}</h3>
          {konto.ubezpieczenie.map((u, i) => <p key={i}>
            <b>{t(nazwaUbezpieczenia(u.tytul))}</b> {t("od")} {dataPL(u.od)}{u.do && <> {t("do")} {dataPL(u.do)}</>}.
            {" "}{t("Ubezpieczenie chorobowe:")} {t(rodzajChorobowego(u.chorobowe))}.
            {u.platnik && <> {t("Płatnik składek: {nazwa}, NIP {nip}.", { nazwa: u.platnik.nazwa, nip: u.platnik.nip })}</>}
          </p>)}
          <h3>{t("Zwolnienia lekarskie")}</h3>
          {konto.ezla.length ? <ul className="clean">{konto.ezla.map((z) => <li key={z.seria_numer}>
            {t("Od {od} do {do}. Liczba dni: {dni}.", { od: dataPL(z.od), do: dataPL(z.do), dni: z.dni })}
            {z.kodLiterowy === "B" && <> {t("Zwolnienie w ciąży.")}</>}
            {z.szpital && <> {t("Pobyt w szpitalu.")}</>}
          </li>)}</ul> : <p>{t("Brak zwolnień w profilu.")}</p>}
        </>}
      </section>
      <Zaswiadczenie pesel={pesel} />
      <form className="card" onSubmit={(e) => { e.preventDefault(); void wyslij(); }}>
        <h2>{t("Wypróbuj wysłanie pytania")}</h2>
        <p>{t("Wpisz przykładową treść. Pytanie zostanie obsłużone w prototypie.")}</p>
        <div className="field">
          <label htmlFor="pue-temat">{t("Temat")}</label>
          <select id="pue-temat" value={q.temat} onChange={(e) => setQ({ ...q, temat: e.target.value })}>
            <option value="Zasiłek macierzyński">{t("Zasiłek macierzyński")}</option><option value="Zasiłek chorobowy">{t("Zasiłek chorobowy")}</option><option value="Ubezpieczenie chorobowe">{t("Ubezpieczenie chorobowe")}</option><option value="Inne">{t("Inne")}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="pue-tresc">{t("Treść pytania")}</label>
          <textarea id="pue-tresc" rows={5} value={q.tresc} onChange={(e) => setQ({ ...q, tresc: e.target.value })} />
        </div>
        <button className="btn btn-primary" disabled={wysylanie}>{t("Wyślij pytanie testowe")}</button>
        {bladPytania && <Alert t="err">{t(bladPytania)}</Alert>}
        {numer && <Alert t="ok">{t("Zapisano pytanie testowe. Numer:")} <b>{numer}</b>.</Alert>}
      </form>
    </div>
  );
}

export default function Pue() {
  const { sesja, gotowa } = useSesja();
  const t = useT();
  return (
    <>
      <h1>{t("Konto w ZUS (eZUS)")}</h1>
      <p className="lead">{t("W eZUS, dawniej PUE ZUS, możesz sprawdzać dane o ubezpieczeniu i zwolnieniach oraz pisać do ZUS. Tutaj możesz wypróbować te czynności na fikcyjnych danych.")}</p>
      {!gotowa ? <p role="status">{t("Wczytujemy sesję…")}</p> : sesja
        ? <PodgladKonta key={sesja.token} pesel={sesja.pesel} />
        : <section className="card">
          <h2>{t("Sprawdź, jak wygląda konto")}</h2>
          <Link href="/logowanie?powrot=pue" className="btn btn-primary">{t("Wybierz profil testowy")}</Link>
        </section>}
    </>
  );
}
