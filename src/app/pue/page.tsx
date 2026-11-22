"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSesja } from "@/lib/sesja";
import { dataPL, dzis, pln } from "@/lib/format";
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
  const [dzien, setDzien] = useState(dzis());
  const [z, setZ] = useState<StanZadluzeniaNaDzien | null>(null);
  const [blad, setBlad] = useState(false);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dzien)) return;
    let aktualne = true;
    api<StanZadluzeniaNaDzien>(`/api/zus/zadluzenie?${new URLSearchParams({ pesel, naDzien: dzien })}`)
      .then((w) => { if (aktualne) { setZ(w); setBlad(false); } })
      .catch(() => { if (aktualne) setBlad(true); });
    return () => { aktualne = false; };
  }, [pesel, dzien]);

  return (
    <section className="card" style={{ overflowWrap: "anywhere" }}>
      <h2>Zadłużenie z tytułu składek <Sim /></h2>
      <p>Wybierz dzień, w którym powstaje prawo do świadczenia, na przykład dzień porodu. Pokażemy zadłużenie z tego dnia.</p>
      <Field label="Stan na dzień"><input type="date" value={dzien} onChange={(e) => setDzien(e.target.value)} /></Field>
      {blad && <Alert t="err">Nie udało się pobrać zaświadczenia.</Alert>}
      {z && <>
        <h3>Stan zadłużenia na dzień {dataPL(z.naDzien)}</h3>
        {z.wynik === "nie_dotyczy" ? <p>{z.komunikat}</p> : <>
          <dl>
            <dt>Zaległości w składkach</dt><dd>{pln(z.kwotaZadluzenia)}</dd>
            <dt>Próg</dt><dd>{pln(z.prog)}</dd>
            <dt>Wynik</dt><dd>{wynikZadluzenia(z)}</dd>
          </dl>
          <Alert t={z.przekroczonyProg ? "warn" : "ok"}>{z.komunikat}</Alert>
          {z.skladniki.length > 0 && <ul className="clean">{z.skladniki.map((s) => <li key={s.okres}>
            Składka za {s.okres.slice(5)}.{s.okres.slice(0, 4)}: {pln(s.kwota)}, termin płatności minął {dataPL(s.terminPlatnosci)}.
          </li>)}</ul>}
        </>}
        <p className="small muted">Zaświadczenie (symulacja) nr {z.numerZaswiadczenia}, wystawione {dataPL(z.wystawiono)}. To nie jest dokument z ZUS.</p>
      </>}
    </section>
  );
}

function PodgladKonta({ pesel }: { pesel: string }) {
  const [konto, setKonto] = useState<Konto | null>(null);
  const [q, setQ] = useState({ temat: "Zasiłek macierzyński", tresc: "" });
  const [numer, setNumer] = useState("");
  const [bladKonta, setBladKonta] = useState(false);
  const [bladPytania, setBladPytania] = useState("");
  const [wysylanie, setWysylanie] = useState(false);

  useEffect(() => {
    let aktualne = true;
    api<Konto>(`/api/pue/konto?${new URLSearchParams({ pesel })}`)
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
        <h2>Dane profilu</h2>
        {bladKonta && <Alert t="err">Nie udało się pobrać danych profilu.</Alert>}
        {!konto && !bladKonta && <p role="status">Wczytujemy dane konta…</p>}
        {konto && <>
          <p><b>{konto.osoba}</b></p>
          <dl>
            <dt>PESEL</dt><dd>{konto.pesel}</dd>
            <dt>Dni ubezpieczenia chorobowego</dt><dd>{konto.dniNieprzerwanegoUbezpieczenia}</dd>
          </dl>
          <h3>Ubezpieczenia</h3>
          {konto.ubezpieczenie.map((u, i) => <p key={i}>
            <b>{nazwaUbezpieczenia(u.tytul)}</b> od {dataPL(u.od)}{u.do && <> do {dataPL(u.do)}</>}.
            {" Ubezpieczenie chorobowe: "}{rodzajChorobowego(u.chorobowe)}.
            {u.platnik && <> Płatnik składek: {u.platnik.nazwa}, NIP {u.platnik.nip}.</>}
          </p>)}
          <h3>Zwolnienia lekarskie</h3>
          {konto.ezla.length ? <ul className="clean">{konto.ezla.map((z) => <li key={z.seria_numer}>
            Od {dataPL(z.od)} do {dataPL(z.do)}. Liczba dni: {z.dni}.
            {z.kodLiterowy === "B" && <> Zwolnienie w ciąży.</>}
            {z.szpital && <> Pobyt w szpitalu.</>}
          </li>)}</ul> : <p>Brak zwolnień w profilu.</p>}
        </>}
      </section>
      <Zaswiadczenie pesel={pesel} />
      <form className="card" onSubmit={(e) => { e.preventDefault(); void wyslij(); }}>
        <h2>Wypróbuj wysłanie pytania</h2>
        <p>Wpisz przykładową treść. Pytanie zostanie obsłużone w prototypie.</p>
        <div className="field">
          <label htmlFor="pue-temat">Temat</label>
          <select id="pue-temat" value={q.temat} onChange={(e) => setQ({ ...q, temat: e.target.value })}>
            <option>Zasiłek macierzyński</option><option>Zasiłek chorobowy</option><option>Ubezpieczenie chorobowe</option><option>Inne</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="pue-tresc">Treść pytania</label>
          <textarea id="pue-tresc" rows={5} value={q.tresc} onChange={(e) => setQ({ ...q, tresc: e.target.value })} />
        </div>
        <button className="btn btn-primary" disabled={wysylanie}>Wyślij pytanie testowe</button>
        {bladPytania && <Alert t="err">{bladPytania}</Alert>}
        {numer && <Alert t="ok">Zapisano pytanie testowe. Numer: <b>{numer}</b>.</Alert>}
      </form>
    </div>
  );
}

export default function Pue() {
  const { sesja, gotowa } = useSesja();
  return (
    <>
      <h1>Konto w ZUS (eZUS)</h1>
      <p className="lead">W eZUS, dawniej PUE ZUS, możesz sprawdzać dane o ubezpieczeniu i zwolnieniach oraz pisać do ZUS. Tutaj możesz wypróbować te czynności na fikcyjnych danych.</p>
      {!gotowa ? <p role="status">Wczytujemy sesję…</p> : sesja
        ? <PodgladKonta key={sesja.token} pesel={sesja.pesel} />
        : <section className="card">
          <h2>Sprawdź, jak wygląda konto</h2>
          <Link href="/logowanie?powrot=pue" className="btn btn-primary">Wybierz profil testowy</Link>
        </section>}
    </>
  );
}
