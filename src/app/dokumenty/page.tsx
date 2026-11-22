"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/sesja";
import { useFormaty, useT, useTb } from "@/lib/jezyk";
import { opisTerminuT } from "@/lib/termin-tekst";
import { nazwaUbezpieczenia } from "@/lib/dane-profilu";
import { DRUKI } from "@/content/poradnik";
import { Alert } from "@/components/ui";
import { Pole } from "@/components/Pole";
import parametry from "../../../data/parametry.json";
import type { Termin } from "@/engine/kalkulator";

const T = parametry.terminy_dni;
const P = parametry.procenty;
const prog = parametry.platnik.prog_liczby_ubezpieczonych_powyzej;
const terminy = (t: (pl: string, z?: Record<string, string | number>) => string, liczba: (n: number) => string, dni: (n: number) => string) => [
  [t("Wniosek o urlop ojcowski"), t("Co najmniej {dni} przed rozpoczęciem urlopu.", { dni: dni(T.wniosek_urlop_ojcowski_przed_startem) })],
  [t("Wniosek o urlop rodzicielski"), t("Co najmniej {dni} przed rozpoczęciem urlopu.", { dni: dni(T.wniosek_urlop_rodzicielski_przed_startem) })],
  [t("Wniosek ojca o przejęcie części urlopu macierzyńskiego"), t("Co najmniej {dni} przed rozpoczęciem urlopu.", { dni: dni(T.wniosek_przejecie_macierzynskiego_przez_ojca_przed_startem) })],
  [t("Wniosek o łączenie pracy z urlopem rodzicielskim"), t("Co najmniej {dni} przed rozpoczęciem pracy.", { dni: dni(T.wniosek_laczenie_z_praca_przed_startem) })],
  [t("Wniosek o uśrednioną stawkę zasiłku ({procent}%)", { procent: liczba(P.wariant_pelny_wymiar_81_5) }), t("Do {dni} od porodu albo do {dni2} od przyjęcia dziecka.", { dni: dni(T.wniosek_pelny_wymiar_81_5_po_porodzie), dni2: dni(T.adopcja_wniosek_81_5_po_przyjeciu) })],
  [t("Wniosek o urlop na warunkach urlopu macierzyńskiego"), t("Do {dni} od przyjęcia dziecka.", { dni: dni(T.adopcja_wniosek_o_urlop_po_przyjeciu_dziecka) })],
] as const;

const KLUCZ_DAT = "rodzice.plan.daty";
const kluczDaty = (t: Termin) => `${t.co}|${t.do ?? t.od ?? ""}`;

export default function Dokumenty() {
  const { dataPL, opisObliczenia, liczba, dni } = useFormaty();
  const t = useT();
  const tb = useTb();
  const [tytul, setTytul] = useState("umowa_o_prace");
  const [liczbaOsob, setLiczbaOsob] = useState("");
  const [terminyPlanu, setTerminyPlanu] = useState<Termin[] | null>(null);
  const [blad, setBlad] = useState(false);

  useEffect(() => {
    try {
      const wejscie = JSON.parse(localStorage.getItem("rodzice.plan") ?? "null")?.wejscie;
      if (!wejscie) return;
      api<Termin[]>("/api/oblicz/terminy", { wejscie }).then(setTerminyPlanu).catch(() => setBlad(true));
    } catch {
      setBlad(true);
    }
  }, []);

  const [wybrane, setWybrane] = useState<string[]>([]);
  useEffect(() => {
    try { const z = JSON.parse(localStorage.getItem(KLUCZ_DAT) ?? "[]"); if (Array.isArray(z)) setWybrane(z); } catch { /* brak localStorage */ }
  }, []);
  const przelacz = (k: string) => setWybrane((w) => {
    const nowe = w.includes(k) ? w.filter((x) => x !== k) : [...w, k];
    try { localStorage.setItem(KLUCZ_DAT, JSON.stringify(nowe)); } catch { /* działa też bez zapisu */ }
    return nowe;
  });
  // Pokazujemy tylko to, co rodzic sam musi zrobić (przedawnienie to nie wniosek), od najwcześniejszej daty.
  const datyDoPokazania = (terminyPlanu ?? []).filter((t) => !/Przedawnienie/i.test(t.co))
    .sort((a, b) => (a.do ?? a.od ?? "").localeCompare(b.do ?? b.od ?? ""));

  const firma = tytul === "dzialalnosc";
  const zlecenie = tytul === "zlecenie";
  return (
    <>
      <h1>{t("Kto wypłaca zasiłek")}</h1>
      <p className="lead">Sprawdź, czy zasiłek wypłaca ZUS, czy pracodawca, gdzie złożyć wniosek i ile masz na to czasu. Wszystkie swoje terminy od daty porodu znajdziesz w <Link href="/terminarz">Kalendarzu w urzędzie</Link>.</p>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>{t("Kto wypłaca zasiłek?")}</h2>
          <Pole label={t("Forma zatrudnienia lub ubezpieczenia")}>
            <select value={tytul} onChange={(e) => { setTytul(e.target.value); setLiczbaOsob(""); }}>
              <option value="umowa_o_prace">{t("Umowa o pracę")}</option>
              <option value="zlecenie">{t("Umowa zlecenia")}</option>
              <option value="dzialalnosc">{t("Własna działalność")}</option>
            </select>
          </Pole>
          {!firma && <Pole label={t("Ile osób płatnik zgłasza do ubezpieczenia chorobowego?")} hint={t("Jeśli nie wiesz, zapytaj płatnika składek, np. w kadrach.")}>
            <select value={liczbaOsob} onChange={(e) => setLiczbaOsob(e.target.value)}>
              <option value="">{t("Nie wiem")}</option>
              <option value="malo">{t("Do {n} osób", { n: prog })}</option>
              <option value="duzo">{t("Powyżej {n} osób", { n: prog })}</option>
            </select>
          </Pole>}
          {firma ? <p>{t("Wniosek o zasiłek (ZAM) składasz w ZUS. ZUS go rozpatrzy i wypłaci zasiłek, jeśli Ci przysługuje.")}</p>
            : liczbaOsob === "duzo" ? <p>{zlecenie ? t("Zasiłek wypłaca płatnik składek. Tam złóż wniosek o zasiłek (ZAM).") : t("Zasiłek wypłaca pracodawca. Tam złóż wniosek o zasiłek (ZAM).")}</p>
            : liczbaOsob === "malo" ? <p>{t("Zasiłek wypłaca ZUS. Płatnik składek przekazuje do ZUS zaświadczenie {druk}.", { druk: zlecenie ? "Z-3a" : "Z-3" })}</p>
            : <p>{zlecenie ? t("Sprawdź u płatnika składek, kto rozpatrzy Twój wniosek o zasiłek.") : t("Sprawdź u pracodawcy, kto rozpatrzy Twój wniosek o zasiłek.")}</p>}
          <p><Link href="/druki#ZAM">{t("Sprawdź, jak wypełnić formularz ZAM")}</Link></p>
        </section>
        <section className="card">
          <h2>{t("Daty z Twojego planu")}</h2>
          {blad && <Alert t="err">{t("Nie udało się odczytać terminów z zapisanego planu.")}</Alert>}
          {datyDoPokazania.length ? <>
            <p className="muted">Sam decydujesz, które daty trafią do Twojego planu. Wybrane zapamiętamy w tej przeglądarce.</p>
            <ul className="clean">
              {datyDoPokazania.map((tm) => {
                const k = kluczDaty(tm), wPlanie = wybrane.includes(k);
                return <li key={k} className="mt">
                  <b>{tm.do ? `${t("Do")} ${dataPL(tm.do)}` : `${t("Od")} ${dataPL(tm.od)}`}</b>{wPlanie && <span className="badge ok"> W Twoim planie</span>}<br />{opisTerminuT(t, opisObliczenia, tm.co)}<br />
                  <button type="button" className={wPlanie ? "btn btn-ghost btn-sm" : "btn btn-secondary btn-sm"} onClick={() => przelacz(k)}>{wPlanie ? "Usuń z mojego planu" : "Dodaj do mojego planu"}</button>
                </li>;
              })}
            </ul>
            <p className="small muted mt">Na dole: masz 6 miesięcy od końca okresu zasiłku, żeby upomnieć się o jego wypłatę.</p>
          </> : <p><Link href="/terminarz">Zobacz swoje terminy w Kalendarzu w urzędzie</Link> lub <Link href="/kalkulator">ułóż plan urlopów w kalkulatorze</Link>.</p>}
        </section>
      </div>
      <section className="card mt">
        <h2>{t("Ile masz czasu na złożenie wniosku")}</h2>
        <dl>
          {terminy(t, liczba, dni).map(([co, kiedy]) => <div key={co} className="mt"><dt><b>{co}</b></dt><dd style={{ margin: 0 }}>{kiedy}</dd></div>)}
        </dl>
      </section>
      <section className="mt">
        <h2>{t("Formularze")}</h2>
        <ul className="clean">
          {DRUKI.map((d) => <li key={d.id}><Link href={`/druki#${d.id}`}>{t(d.nazwa)}</Link></li>)}
        </ul>
      </section>
    </>
  );
}
