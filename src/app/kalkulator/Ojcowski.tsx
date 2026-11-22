"use client";
import Link from "next/link";
import { DataPole } from "@/components/DataPole";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/sesja";
import { useFormaty, useT } from "@/lib/jezyk";
import { Alert } from "@/components/ui";
import { Wstaw } from "@/components/Wstaw";
import type { PlanWejscie, PlanWynik, OkresZNetto, PodstawaWynik } from "@/engine/kalkulator";
import { Pole } from "@/components/Pole";
import { Kreator, useKreator, type KrokDef } from "./Kreator";
import { WyborSytuacji } from "./WyborSytuacji";
import { L, W, P, niezbywalne, num, type Sytuacja } from "./stale";
import { etykietaKwoty, podpowiedzKwoty, PoleRodzaju, PoleZadluzenia, OstrzezenieZadluzenia, usePodstawa, useProfilZus, opisPoroduMnogiego, OPIS_NETTO, type Rodzaj } from "./zarobki";
import { parametrZywy } from "./adres";
import css from "./kalkulator.module.css";

const KROKI: KrokDef[] = [
  { id: "sytuacja", nazwa: "Sytuacja", tytul: "Dla kogo liczysz?" },
  { id: "dziecko", nazwa: "Dziecko", tytul: "Dziecko i podstawa zasiłku" },
  { id: "urlopy", nazwa: "Urlopy", tytul: "Urlopy taty lub drugiego rodzica" },
  { id: "wynik", nazwa: "Wynik", tytul: "Wyliczenie zasiłku" },
];
const K = { sytuacja: 0, dziecko: 1, urlopy: 2, wynik: 3 };

type Zapisany = { klucz: string; okresy: OkresZNetto[]; sprawdz: boolean };

export default function Ojcowski({ onSytuacja }: { onSytuacja: (s: Sytuacja) => void }) {
  const { opisObliczenia, tygodnie, pln, dataPL, liczba } = useFormaty();
  const t = useT();
  const [data, setData] = useState("");
  const [dzieci, setDzieci] = useState(1);
  const [podstawa, setPodstawa] = useState("");   // opcja zaawansowana: gotowa podstawa zasiłku
  const [rodzaj, setRodzaj] = useState<Rodzaj>("umowa_o_prace");
  const [rodzajReczny, setRodzajReczny] = useState(false);
  const [brutto, setBrutto] = useState("");      // domyślnie: pensja brutto / przychód / zadeklarowana podstawa składek
  const [zadl, setZadl] = useState<string | null>(null);
  const [rodzicielski, setRodzicielski] = useState(niezbywalne);
  const [ojcowski, setOjcowski] = useState(L.urlop_ojcowski_dni);
  const [od, setOd] = useState("");
  const [odRodz, setOdRodz] = useState("");
  const [busy, setBusy] = useState(false);
  const [zapisany, setZapisany] = useState<Zapisany | null>(null);
  const [blad, setBlad] = useState<string[]>([]);
  const [pokazBledy, setPokazBledy] = useState(false);
  const [fokusBledu, setFokusBledu] = useState(0);
  const tresc = useRef<HTMLDivElement>(null);
  const limit = (dzieci === 1 ? W.urlop_rodzicielski["1"] : W.urlop_rodzicielski["2_i_wiecej"]) - niezbywalne;
  const mnogi = dzieci > 1 ? `${opisPoroduMnogiego(dzieci, "porod")} Ty możesz wziąć do ${tygodnie(limit)} urlopu rodzicielskiego.` : "";

  // Profil ZUS zalogowanej osoby (w tej ścieżce to tata / drugi rodzic): domyślny rodzaj zatrudnienia i zaległe składki.
  const profil = useProfilZus(data);
  useEffect(() => {
    if (rodzajReczny || !profil?.rodzaj) return;
    setRodzaj(profil.rodzaj);
    if (profil.rodzaj === "dzialalnosc" && profil.zadeklarowanaPodstawa) setBrutto((b) => b || String(profil.zadeklarowanaPodstawa));
  }, [profil, rodzajReczny]);
  const zadlProfil = rodzaj === "dzialalnosc" ? profil?.zadluzenie?.kwotaZadluzenia ?? null : null;
  const zadluzenie = rodzaj !== "dzialalnosc" ? 0 : zadl !== null ? (num(zadl) || 0) : (zadlProfil ?? 0);

  // Podstawa zasiłku: gotowa (opcja zaawansowana) albo wyliczona z kwoty i rodzaju zatrudnienia.
  const czysc = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/\s/g, "").replace(",", ".")));
  const podstawaReczna = czysc(podstawa);
  const maReczna = Number.isFinite(podstawaReczna) && podstawaReczna > 0;
  const kwotaZarobkow = czysc(brutto);
  const pods = usePodstawa(rodzaj, maReczna ? "" : String(kwotaZarobkow));
  const kwota = maReczna ? podstawaReczna : pods?.podstawaMiesieczna ?? NaN;

  // Błędy pól liczone na bieżąco; pokazujemy je dopiero po kliknięciu „Dalej".
  const nieWczesniej = t("Urlop zaplanuj na dzień narodzin dziecka lub później.");
  const bl = {
    data: !data ? t("Podaj datę urodzenia lub przewidywaną datę porodu.") : "",
    podstawa: !maReczna && !(Number.isFinite(kwotaZarobkow) && kwotaZarobkow > 0) ? "Wpisz kwotę zarobków albo gotową podstawę zasiłku." : "",
    rodz: !Number.isInteger(rodzicielski) || rodzicielski < 0 || rodzicielski > limit ? `Wpisz od 0 do ${limit} tygodni urlopu rodzicielskiego.` : "",
    okres: !rodzicielski && !ojcowski ? t("Wybierz co najmniej jeden okres do obliczenia.") : "",
    odRodz: Boolean(rodzicielski && odRodz && data && odRodz < data) ? nieWczesniej : "",
    od: Boolean(ojcowski && od && data && od < data) ? nieWczesniej : "",
  };
  const pokaz = (k: keyof typeof bl) => (pokazBledy && bl[k]) || undefined;
  const klucz = JSON.stringify([data, dzieci, rodzaj, brutto, podstawa, rodzicielski, ojcowski, od, odRodz]);
  const wynik = zapisany?.klucz === klucz ? zapisany : null;   // po zmianie danych stary wynik nie jest pokazywany

  // Najdalszy krok dostępny przy tych danych. Adres z dalszym krokiem (odświeżenie, link) prowadzi do pierwszego braku,
  // a wynik jest dostępny dopiero po wyliczeniu (przy zmienionych danych krok wyniku proponuje ponowne wyliczenie).
  const dostepny = bl.data || bl.podstawa ? K.dziecko : bl.rodz || bl.okres || bl.odRodz || bl.od ? K.urlopy : zapisany ? K.wynik : K.urlopy;
  const { krok, maks, idz, wstecz, adres } = useKreator(KROKI, dostepny);
  useEffect(() => { setPokazBledy(false); }, [krok]);   // zmiana kroku (także „Wstecz" przeglądarki) czyści komunikaty o błędach

  useEffect(() => { if (fokusBledu) tresc.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [fokusBledu]);

  async function policz() {
    setBlad([]);
    setBusy(true);
    try {
      // Podstawa z kwoty zarobków liczy się z opóźnieniem; jeśli jeszcze jej nie ma, liczymy ją teraz.
      const podst = Number.isFinite(kwota) ? kwota : (await api<PodstawaWynik>("/api/oblicz/podstawa", rodzaj === "umowa_o_prace"
        ? { typ: "pracownik", sredniaBrutto: kwotaZarobkow } : { typ: "niepracownik", sredniaPodstawa: kwotaZarobkow, zadeklarowanaKwota: rodzaj === "dzialalnosc" })).podstawaMiesieczna;
      const wejscie: PlanWejscie = {
        tytul: "porod", dataZdarzenia: data, liczbaDzieci: dzieci, wariant: "zmienny_100_70",
        podstawy: { matka: 0, ojciec: podst },
        rodzicielski: rodzicielski ? [{ kto: "ojciec", tygodnie: rodzicielski, ...(odRodz ? { od: odRodz } : {}) }] : [],
        ojcowski: ojcowski ? [{ od: od || data, dni: ojcowski }] : [],
      };
      const plan = await api<Omit<PlanWynik, "okresy"> & { okresy: OkresZNetto[] }>("/api/oblicz/plan", wejscie);
      if (plan.bledy.length) {
        setBlad(plan.bledy);
        return;
      }
      setZapisany({ klucz, okresy: plan.okresy.filter((o) => o.kto === "ojciec"), sprawdz: plan.okresy.some((o) => o.kto === "ojciec" && o.podwyzszoneDoSwiadczeniaRodzicielskiego) });
      setPokazBledy(false);
      if (parametrZywy("krok") === KROKI[K.urlopy].id) idz(K.wynik);   // nie przerzucamy do wyniku, jeśli w trakcie liczenia ktoś cofnął się lub wyszedł
    } catch {
      setBlad(["Nie udało się policzyć zasiłku. Spróbuj ponownie."]);
    } finally {
      setBusy(false);
    }
  }

  function idzDo(k: number) { setPokazBledy(false); idz(k); }   // nowy krok = nowy wpis historii (adres ?krok=…)
  function dalej() {
    const bledy = krok === K.dziecko ? [bl.data, bl.podstawa] : krok === K.urlopy ? [bl.rodz, bl.okres, bl.odRodz, bl.od] : [];
    if (bledy.some(Boolean)) { setPokazBledy(true); setFokusBledu((n) => n + 1); return; }
    if (krok === K.urlopy) void policz(); else idzDo(krok + 1);
  }

  return (
    <Kreator kroki={KROKI} krok={krok} maks={maks} onKrok={idzDo} onWstecz={wstecz} adres={adres} onDalej={dalej} dalejEtykieta={krok === K.urlopy ? (busy ? "Liczymy zasiłek…" : "Policz zasiłek") : "Dalej"} dalejZablokowany={busy}
      uwaga={t("Ta ścieżka ma 4 kroki zamiast 6. Pominęliśmy pytania o urlop mamy i wybór wariantu zasiłku, bo nie dotyczą Twojej sytuacji.")}>
      <div ref={tresc}>
        {krok === K.sytuacja && <WyborSytuacji wartosc="ojciec" onZmiana={onSytuacja} />}

        {krok === K.dziecko && (
          <>
            <p className={css.mala}>{t("Do obliczenia wystarczą dane taty albo drugiego rodzica, który korzysta z urlopu.")}</p>
            <DataPole label="Data urodzenia lub przewidywana data porodu" value={data} onChange={setData} error={pokaz("data")} />
            <Pole label={t("Liczba dzieci przy jednym porodzie")}><select value={dzieci} onChange={(e) => setDzieci(+e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? t("5 lub więcej") : n}</option>)}
            </select></Pole>
            {mnogi && <p className={css.mala} role="status">{t(mnogi)}</p>}
            <PoleRodzaju label={t("Twój rodzaj zatrudnienia")} rodzaj={rodzaj} onZmiana={(r) => { setRodzaj(r); setRodzajReczny(true); }} zProfilu={!rodzajReczny && !!profil?.rodzaj} />
            <Pole label={etykietaKwoty(rodzaj)} hint={podpowiedzKwoty(rodzaj)} error={maReczna ? undefined : pokaz("podstawa")}>
              <input type="number" inputMode="decimal" min={0} value={brutto} onChange={(e) => setBrutto(e.target.value)} /></Pole>
            {!maReczna && kwota > 0 && <p className={css.mala}><Wstaw tekst={t("Podstawa zasiłku: {kwota} miesięcznie.")} wartosci={{ kwota: <b>{pln(kwota)}</b> }} /></p>}
            {rodzaj === "dzialalnosc" && (
              <>
                <PoleZadluzenia wartosc={zadl ?? (zadlProfil != null ? String(zadlProfil) : "")} onZmiana={setZadl} zProfilu={zadl === null && zadlProfil != null} />
                <OstrzezenieZadluzenia kwota={zadluzenie} dzien={data || undefined} zProfilu={zadl === null && zadlProfil != null} />
              </>
            )}
            <details className="dl" open={maReczna || undefined}><summary>{t("Znam gotową podstawę zasiłku")}</summary>
              <p className={css.mala}>{t("Podstawa to kwota po odjęciu składek, od której ZUS liczy zasiłek. Znajdziesz ją w decyzji ZUS albo zapytasz w kadrach. Jeśli ją wpiszesz, kwotę zarobków pomijamy.")}</p>
              <Pole label="Miesięczna podstawa zasiłku (zł)"><input inputMode="decimal" value={podstawa} onChange={(e) => setPodstawa(e.target.value)} /></Pole>
            </details>
          </>
        )}

        {krok === K.urlopy && (
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <Pole label={t("Liczba tygodni urlopu rodzicielskiego")} hint={t("Każdy rodzic ma {tyg} wyłącznie dla siebie. Podaj, ile tygodni chcesz wykorzystać.", { tyg: tygodnie(niezbywalne) })} error={pokaz("rodz")}><input type="number" min={0} max={limit} value={rodzicielski} onChange={(e) => setRodzicielski(+e.target.value)} /></Pole>
            {rodzicielski > 0 && <DataPole label="Początek urlopu rodzicielskiego" hint="Bez daty przyjmiemy początek po zakończeniu urlopu macierzyńskiego." value={odRodz} onChange={setOdRodz} error={pokaz("odRodz")} />}
            <Pole label={t("Urlop ojcowski")} hint={t("Wybierz okres, który chcesz uwzględnić w wyliczeniu.")} error={pokaz("okres")}><select value={ojcowski} onChange={(e) => setOjcowski(+e.target.value)}>
              <option value={0}>{t("Nie uwzględniaj")}</option>
              <option value={L.urlop_ojcowski_min_czesc_dni}>{tygodnie(L.urlop_ojcowski_min_czesc_dni / 7)}</option>
              <option value={L.urlop_ojcowski_dni}>{tygodnie(L.urlop_ojcowski_dni / 7)}</option>
            </select></Pole>
            {ojcowski > 0 && <DataPole label="Początek urlopu ojcowskiego" hint="Bez daty przyjmiemy dzień narodzin dziecka." value={od} onChange={setOd} error={pokaz("od")} />}
            {blad.length > 0 && <Alert t="err">{blad.map((b) => t(opisObliczenia(b))).join(" ")}</Alert>}
          </fieldset>
        )}

        {krok === K.wynik && (
          <>
            <div role="status">
              {busy && <div className={css.kwota}><p className={css.statusLadowania}><span className="spin" aria-hidden="true" /> {t("Liczymy zasiłek…")}</p></div>}
              {!busy && wynik && (
                <div className={css.kwota}>
                  <p className={css.kwotaOpis}>{t("Łącznie: brutto (przed zaliczką na podatek)")}</p>
                  <p className={css.kwotaWartosc}>{pln(wynik.okresy.reduce((s, o) => s + o.kwota, 0))}</p>
                  {wynik.okresy.every((o) => o.kwotaNetto != null) && <p className={css.kwotaNettoDuza}><Wstaw tekst={t("Na rękę (szacunkowo): {kwota}")} wartosci={{ kwota: <b>{pln(wynik.okresy.reduce((s, o) => s + (o.kwotaNetto ?? 0), 0))}</b> }} /></p>}
                </div>
              )}
            </div>
            {blad.length > 0 && <Alert t="err">{blad.map((b) => t(opisObliczenia(b))).join(" ")}</Alert>}
            {!busy && !wynik && (
              <div className={css.kwota}>
                <p className={css.kwotaOpis}>{t("Łącznie przed zaliczką na podatek")}</p>
                <p className={`${css.kwotaWartosc} ${css.pusta}`}>{pln(null)}</p>
                <p className={css.mala}>{t("Dane zmieniły się od ostatniego wyliczenia.")}</p>
                <button type="button" className="btn btn-primary" onClick={() => void policz()}>{t("Policz zasiłek")}</button>
              </div>
            )}
            {wynik && (
              <>
                <ul className={css.lista}>{wynik.okresy.map((o, i) => <li key={i}>
                  <b>{t(o.rodzaj === "ojcowski" ? "Urlop ojcowski" : "Urlop rodzicielski")}</b>
                  <div>{dataPL(o.od)} {t("do")} {dataPL(o.do)}</div>
                  <div>{t("{kwota} brutto ({proc}% podstawy)", { kwota: pln(o.kwota), proc: liczba(o.procent) })}{o.kwotaNetto != null && <>, {t("na rękę ok. {kwota}", { kwota: pln(o.kwotaNetto) })}</>}</div>
                  <div className={css.mala}>{t("Miesięcznie: {kwota} brutto", { kwota: pln(o.miesiecznieBrutto) })}{o.miesiecznieNetto != null && <>, {t("{kwota} na rękę (szacunkowo)", { kwota: pln(o.miesiecznieNetto) })}</>}</div>
                </li>)}</ul>
                {mnogi && <Alert t="info">{t(mnogi)}</Alert>}
                <OstrzezenieZadluzenia kwota={zadluzenie} dzien={data} zProfilu={zadl === null && zadlProfil != null} />
                {wynik.okresy.some((o) => o.kwotaNetto != null) && <p className={css.mala}>{t(OPIS_NETTO)}</p>}
                {wynik.sprawdz && <Alert t="warn">{t("Wyliczenie uwzględnia podwyższenie do kwoty świadczenia rodzicielskiego. Sprawdź w ZUS, czy dotyczy Twojej sytuacji.")}</Alert>}
              </>
            )}
            <p className={css.mala}>{t("Urlop ojcowski: {a}% podstawy zasiłku. Urlop rodzicielski w tym wyliczeniu: {b}% podstawy.", { a: liczba(P.zasilek_za_urlop_ojcowski), b: liczba(P.zasilek_za_urlop_rodzicielski) })}</p>
          </>
        )}
      </div>
    </Kreator>
  );
}
