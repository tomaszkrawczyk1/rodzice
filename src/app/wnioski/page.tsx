"use client";
import { DataPole } from "@/components/DataPole";
import { useEffect, useState } from "react";
import { api, useSesja } from "@/lib/sesja";
import { dzis, formaty, RODZAJE } from "@/lib/format";
import { useFormaty, useT, useTb } from "@/lib/jezyk";
import { Alert, Sim } from "@/components/ui";
import { Pole as Field } from "@/components/Pole";
import { zakresUrlopuOjcowskiego } from "@/lib/urlop-ojcowski";
import { dodajDni, type Okres } from "@/engine/kalkulator";
import Link from "next/link";
import parametry from "../../../data/parametry.json";

const L = parametry.limity_dni;
const T = parametry.terminy_dni;
const P = parametry.procenty;

const RODZ_URLOP: Record<string, string> = { macierzynski: "urlopu macierzyńskiego", uzupelniajacy: "uzupełniającego urlopu macierzyńskiego", rodzicielski: "urlopu rodzicielskiego", ojcowski: "urlopu ojcowskiego", na_warunkach_macierzynskiego: "urlopu na warunkach urlopu macierzyńskiego" };
type Tab = "urlop" | "laczenie" | "zam" | "jeden" | "rezygnacja" | "zas53" | "zas26";
const ZAKLADKI: [Tab, string][] = [
  ["urlop", "Wniosek o urlop"],
  ["jeden", "Macierzyński + rodzicielski (jeden wniosek)"],
  ["rezygnacja", "Rezygnacja z części urlopu macierzyńskiego"],
  ["laczenie", "Połączenie pracy z urlopem"],
  ["zam", "Wniosek o zasiłek (ZAM)"],
  ["zas53", "Zasiłek chorobowy w ciąży (ZAS-53)"],
  ["zas26", "Adopcja / rodzina zastępcza (ZAS-26)"],
];
const MIN_TYGODNI_MATKI = 14;
const PUSTY_WNIOSEK = {
  rodzOd: "", rodzDo: "", ojciecImie: "",
  adres: "", telefon: "", nip: "", zlaOd: "", zlaDo: "", zlaNr: "", konto: "",
  tytulAdopcji: "rodzina", daneDziecka: "",
  imie: "", pesel: "", pracodawca: "", miasto: "", rodzaj: "rodzicielski", od: "", do: "",
  czesc: 1, dziecko: "", urodzenie: "", drugi: "", drugiOd: "", drugiDo: "",
  ojcowskiDni: L.urlop_ojcowski_dni, etat: "1/2", adresat: "pracodawca",
  w815: false, chorobowe: true, przedsiebiorca: false,
};

export default function Wnioski() {
  const t = useT();
  const tb = useTb();
  const fmt = useFormaty();
  const { liczba, tygodnie, dni } = fmt;
  // Tekst wniosku (podgląd i wydruk) zostaje po polsku: to dokument do złożenia w polskiej firmie lub w ZUS, więc daty w nim też są po polsku.
  const dataPL = formaty("pl").dataPL;
  const { sesja } = useSesja();
  const [tab, setTab] = useState<Tab>("urlop");
  const [wyn, setWyn] = useState<{ numerWniosku: string } | null>(null);
  const [err, setErr] = useState("");
  const [okresy, setOkresy] = useState<Okres[]>([]);
  const [f, setF] = useState(PUSTY_WNIOSEK);
  const [busy, setBusy] = useState(false);
  const set = (fragment: Partial<typeof PUSTY_WNIOSEK>) => setF((x) => ({ ...x, ...fragment }));

  useEffect(() => {
    set({ imie: sesja?.osoba ?? "", pesel: sesja?.pesel ?? "" });
    setWyn(null);
  }, [sesja]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("urlop") === "ojcowski") set({ rodzaj: "ojcowski" });
    try {
      const wejscie = JSON.parse(localStorage.getItem("rodzice.plan") ?? "null")?.wejscie;
      if (!wejscie) return;
      if (wejscie.dataZdarzenia && wejscie.dataZdarzenia <= dzis()) set({ dziecko: wejscie.dataZdarzenia });
      api<{ okresy: Okres[] }>("/api/oblicz/plan", wejscie).then((p) => setOkresy(p.okresy)).catch(() => {});
    } catch {}
  }, []);
  const data = dzis();
  const ojcowski = tab === "urlop" && f.rodzaj === "ojcowski";
  const rodzicielski = tab === "urlop" && f.rodzaj === "rodzicielski";
  const zakres = ojcowski ? zakresUrlopuOjcowskiego(f.urodzenie, f.od, f.ojcowskiDni, data, L.urlop_ojcowski_do_wieku_dziecka_miesiecy) : null;
  const koniec = ojcowski ? zakres?.koniec : f.do;

  function sprawdz() {
    if (!f.imie.trim()) return t("Wpisz imię i nazwisko.");
    if (tab === "zam") return f.dziecko ? "" : t("Wpisz datę urodzenia lub przyjęcia dziecka.");
    if (tab === "zas53") return !f.zlaOd || !f.zlaDo || f.zlaDo < f.zlaOd ? t("Podaj okres niezdolności do pracy z zaświadczenia lekarskiego (od – do).") : "";
    if (tab === "zas26") return !f.dziecko ? t("Wpisz datę przyjęcia dziecka albo wystąpienia do sądu.") : !f.daneDziecka.trim() ? t("Wpisz dane dziecka: imię i nazwisko oraz miejsce i datę urodzenia.") : "";
    if (tab === "jeden") {
      if (!f.dziecko) return t("Wpisz datę urodzenia lub przewidywaną datę porodu.");
      if (!f.od || !f.do || f.do < f.od) return t("Podaj prawidłowy okres urlopu macierzyńskiego.");
      if (!f.rodzOd || !f.rodzDo || f.rodzDo < f.rodzOd) return t("Podaj prawidłowy okres urlopu rodzicielskiego.");
      if (f.rodzOd <= f.do) return t("Urlop rodzicielski musi zaczynać się po zakończeniu urlopu macierzyńskiego.");
      return "";
    }
    if (tab === "rezygnacja") {
      if (!f.dziecko) return t("Wpisz datę urodzenia dziecka.");
      if (!f.do) return t("Wpisz, do kiedy trwałby Twój urlop macierzyński.");
      if (!f.od) return t("Wpisz dzień, od którego rezygnujesz z reszty urlopu.");
      if (f.od < dodajDni(f.dziecko, MIN_TYGODNI_MATKI * 7)) return t("Rezygnacja jest możliwa dopiero po wykorzystaniu co najmniej {tyg} urlopu po porodzie (od {data}).", { tyg: tygodnie(MIN_TYGODNI_MATKI), data: fmt.dataPL(dodajDni(f.dziecko, MIN_TYGODNI_MATKI * 7)) });
      if (f.od > f.do) return t("Dzień rezygnacji nie może być po końcu urlopu.");
      if (!f.ojciecImie.trim()) return t("Wpisz imię i nazwisko ojca dziecka, który przejmie urlop.");
      return "";
    }
    if (zakres?.blad) return t(zakres.blad);
    if (tab === "urlop" && !ojcowski && !f.dziecko) return t("Wpisz datę urodzenia, porodu lub przyjęcia dziecka odpowiednią do rodzaju urlopu.");
    if (!f.od || !koniec || koniec < f.od) return t("Podaj prawidłową datę rozpoczęcia i zakończenia urlopu.");
    if (rodzicielski && !f.drugi) return t("Wybierz, czy drugi rodzic będzie korzystać z urlopu lub zasiłku w tym samym czasie.");
    if (rodzicielski && f.drugi === "tak" && (!f.drugiOd || !f.drugiDo || f.drugiOd < f.od || f.drugiDo > koniec || f.drugiOd > f.drugiDo))
      return t("Wpisz daty korzystania przez drugiego rodzica w okresie objętym wnioskiem.");
    return "";
  }

  async function wykonaj(druk: boolean) {
    const blad = sprawdz();
    setErr(blad);
    setWyn(null);
    if (blad) return;
    if (druk) { window.print(); return; }
    setBusy(true);
    try {
      const url = tab === "zam" ? "/api/wniosek/zasilek" : tab === "zas53" || tab === "zas26" ? "/api/wniosek/zas" : "/api/wniosek/urlop";
      const dane = tab === "zam"
        ? { adresat: f.adresat, w815: f.w815, okresy }
        : tab === "zas53" ? { druk: "ZAS-53", od: f.zlaOd, do: f.zlaDo }
        : tab === "zas26" ? { druk: "ZAS-26", data: f.dziecko }
        : tab === "jeden" ? { rodzaj: "macierzynski_rodzicielski", od: f.od, do: f.rodzDo }
        : tab === "rezygnacja" ? { rodzaj: "rezygnacja_macierzynski", od: f.od, do: f.do }
        : { rodzaj: tab === "laczenie" ? "rodzicielski" : f.rodzaj, od: f.od, do: koniec };
      setWyn(await api(url, dane));
    } catch {
      setErr(t("Nie udało się zapisać wniosku testowego. Spróbuj ponownie."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>{t("Kreator wniosków")}</h1>
      <p className="lead">{t("Przygotuj tekst wniosku i wydrukuj go. Wysyłkę możesz wypróbować na danych testowych. Do złożenia wniosku o zasiłek użyj formularza ZAM.")}</p>
      <div className="tabs" role="group" aria-label={t("Rodzaj wniosku")}>
        {ZAKLADKI.map(([k, nazwa]) => <button key={k} className={"tab" + (tab === k ? " on" : "")} aria-pressed={tab === k} disabled={busy} onClick={() => { setTab(k); setWyn(null); setErr(""); }}>{t(nazwa)}</button>)}
      </div>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <fieldset className="card no-print" disabled={busy} style={{ minWidth: 0, margin: 0 }} onChange={() => { setErr(""); setWyn(null); }}>
          <h2>{t("Dane wniosku")}</h2>
          <div className="grid g2"><Field label={t("Imię i nazwisko")}><input type="text" value={f.imie} onChange={(e) => set({ imie: e.target.value })} /></Field><Field label={t("PESEL")}><input type="text" value={f.pesel} onChange={(e) => set({ pesel: e.target.value })} /></Field></div>
          {tab !== "zam" && tab !== "zas53" && <><Field label={t(tab === "zas26" ? "Płatnik składek (pracodawca lub zleceniodawca)" : "Pracodawca (nazwa i adres)")}><input type="text" value={f.pracodawca} onChange={(e) => set({ pracodawca: e.target.value })} /></Field></>}
          {tab === "zas53" && <>
            <Field label={t("Adres zamieszkania")}><input type="text" value={f.adres} onChange={(e) => set({ adres: e.target.value })} /></Field>
            <div className="grid g2">
              <Field label={t("Telefon (dobrowolnie)")}><input type="text" value={f.telefon} onChange={(e) => set({ telefon: e.target.value })} /></Field>
              <Field label={t("NIP płatnika składek")}><input type="text" value={f.nip} onChange={(e) => set({ nip: e.target.value })} /></Field>
            </div>
          </>}
          <Field label={t("Miejscowość")}><input type="text" value={f.miasto} onChange={(e) => set({ miasto: e.target.value })} /></Field>
          {tab === "urlop" && <>
            <Field label={t("Rodzaj urlopu")}><select value={f.rodzaj} onChange={(e) => set({ rodzaj: e.target.value })}>{Object.keys(RODZ_URLOP).map((k) => <option key={k} value={k}>{t(RODZAJE[k])}</option>)}</select></Field>
            {ojcowski ? <>
              <DataPole label={t("Data urodzenia dziecka")} hint={t("Uzupełnij po narodzinach. Informacje o przysposobieniu znajdziesz w poradniku.")} value={f.urodzenie} onChange={(iso) => set({ urodzenie: iso })} />
              <DataPole label={t("Początek urlopu")} value={f.od} onChange={(iso) => set({ od: iso })} />
              <Field label={t("Długość urlopu")}><select value={f.ojcowskiDni} onChange={(e) => set({ ojcowskiDni: +e.target.value })}>
                <option value={L.urlop_ojcowski_min_czesc_dni}>{tygodnie(L.urlop_ojcowski_min_czesc_dni / 7)}</option>
                <option value={L.urlop_ojcowski_dni}>{tygodnie(L.urlop_ojcowski_dni / 7)}</option>
              </select></Field>
              {koniec && <p>{t("Koniec urlopu:")} <b>{fmt.dataPL(koniec)}</b></p>}
              <Alert>{t("Wniosek złóż co najmniej {dni} przed urlopem", { dni: dni(T.wniosek_urlop_ojcowski_przed_startem) })}{f.od && koniec ? " " + t("(do {data})", { data: fmt.dataPL(dodajDni(f.od, -T.wniosek_urlop_ojcowski_przed_startem)) }) : null}{t(". Dołącz odpis skrócony aktu urodzenia, dokument z zagranicy potwierdzający urodzenie albo kopię jednego z tych dokumentów.")}</Alert>
              <p><Link href="/poradnik#F14">{t("Sprawdź zasady urlopu ojcowskiego")}</Link></p>
            </> : <>
              <div className="grid g2">
                <DataPole label={t("Początek urlopu")} value={f.od} onChange={(iso) => set({ od: iso })} />
                <DataPole label={t("Koniec urlopu")} value={f.do} onChange={(iso) => set({ do: iso })} />
              </div>
              {rodzicielski && <Field label={t("Która to część urlopu?")}><select value={f.czesc} onChange={(e) => set({ czesc: +e.target.value })}>{Array.from({ length: L.urlop_rodzicielski_max_czesci }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></Field>}
              <DataPole label={t(f.rodzaj === "macierzynski" ? "Data urodzenia lub przewidywana data porodu" : "Data urodzenia lub przyjęcia dziecka")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
              {rodzicielski && <>
                <Field label={t("Czy drugi rodzic będzie w tym czasie korzystać z urlopu rodzicielskiego lub pobierać zasiłek za ten urlop?")}>
                  <select value={f.drugi} onChange={(e) => set({ drugi: e.target.value })}>
                    <option value="">{t("Wybierz odpowiedź")}</option><option value="nie">{t("Nie")}</option><option value="tak">{t("Tak, podam okres")}</option>
                  </select>
                </Field>
                {f.drugi === "tak" && <div className="grid g2">
                  <DataPole label={t("Drugi rodzic: od kiedy?")} value={f.drugiOd} onChange={(iso) => set({ drugiOd: iso })} />
                  <DataPole label={t("Drugi rodzic: do kiedy?")} value={f.drugiDo} onChange={(iso) => set({ drugiDo: iso })} />
                </div>}
                <Alert>{tb("Możecie skorzystać z urlopu rodzicielskiego w tym samym czasie. Oba okresy liczą się do wspólnej puli. Wniosek złóż co najmniej **{dni}** przed rozpoczęciem.", { dni: dni(T.wniosek_urlop_rodzicielski_przed_startem) })}</Alert>
              </>}
              {f.rodzaj === "macierzynski" && <Alert>{t("Jeśli zaczynasz urlop macierzyński przed porodem, dołącz zaświadczenie lekarskie o przewidywanej dacie porodu.")}</Alert>}
            </>}
          </>}
          {tab === "laczenie" && <>
            <Field label={t("Wymiar czasu pracy w okresie urlopu")} hint={t("Maksymalnie ½ etatu")}><select value={f.etat} onChange={(e) => set({ etat: e.target.value })}><option>1/2</option><option>1/4</option><option>1/3</option><option>2/5</option></select></Field>
            <div className="grid g2"><DataPole label={t("Od")} value={f.od} onChange={(iso) => set({ od: iso })} /><DataPole label={t("Do")} value={f.do} onChange={(iso) => set({ do: iso })} /></div>
            <Alert t="warn">{tb("Wniosek składa się co najmniej **{dni}** przed rozpoczęciem. Pracodawca może odmówić z przyczyn organizacyjnych – poinformuje o tym w ciągu {odp}.", { dni: dni(T.wniosek_laczenie_z_praca_przed_startem), odp: dni(T.odmowa_laczenia_z_praca_odpowiedz_pracodawcy) })}</Alert></>}
          {tab === "jeden" && <>
            <DataPole label={t("Data urodzenia lub przewidywana data porodu")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            <div className="grid g2">
              <DataPole label={t("Urlop macierzyński: od")} value={f.od} onChange={(iso) => set({ od: iso })} />
              <DataPole label={t("Urlop macierzyński: do")} value={f.do} onChange={(iso) => set({ do: iso })} />
              <DataPole label={t("Urlop rodzicielski: od")} hint={t("Zwykle następny dzień po urlopie macierzyńskim.")} value={f.rodzOd} onChange={(iso) => set({ rodzOd: iso })} />
              <DataPole label={t("Urlop rodzicielski: do")} value={f.rodzDo} onChange={(iso) => set({ rodzDo: iso })} />
            </div>
            <Alert>{tb("Jeden wniosek wystarczy, gdy urlop rodzicielski zaczyna się zaraz po macierzyńskim. Złóż go co najmniej **{dni}** przed rozpoczęciem urlopu rodzicielskiego. Pierwsze {tyg} po porodzie musisz wykorzystać osobiście.", { dni: dni(T.wniosek_urlop_rodzicielski_przed_startem), tyg: tygodnie(MIN_TYGODNI_MATKI) })}</Alert>
          </>}
          {tab === "rezygnacja" && <>
            <DataPole label={t("Data urodzenia dziecka")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            <DataPole label={t("Urlop macierzyński trwałby do")} value={f.do} onChange={(iso) => set({ do: iso })} />
            <DataPole label={t("Rezygnuję z reszty urlopu od dnia")} hint={t("Najwcześniej po {tyg} od porodu.", { tyg: tygodnie(MIN_TYGODNI_MATKI) })} value={f.od} onChange={(iso) => set({ od: iso })} />
            <Field label={t("Imię i nazwisko ojca dziecka (przejmuje urlop)")}><input type="text" value={f.ojciecImie} onChange={(e) => set({ ojciecImie: e.target.value })} /></Field>
            <Alert t="warn">{tb("Złóż wniosek co najmniej **{dni}** przed dniem, w którym wracasz do pracy lub kończysz urlop. Ojciec musi w tym czasie złożyć własny wniosek o urlop (co najmniej {ojciec} przed startem), bo bez tego rezygnacja nie zadziała.", { dni: dni(T.wniosek_rezygnacja_matki_z_czesci_urlopu_przed_powrotem), ojciec: dni(T.wniosek_przejecie_macierzynskiego_przez_ojca_przed_startem) })}</Alert>
          </>}
          {tab === "zas53" && <>
            <div className="grid g2">
              <DataPole label={t("Niezdolność do pracy: od")} value={f.zlaOd} onChange={(iso) => set({ zlaOd: iso })} />
              <DataPole label={t("Niezdolność do pracy: do")} value={f.zlaDo} onChange={(iso) => set({ zlaDo: iso })} />
            </div>
            <Field label={t("Seria i numer zaświadczenia lekarskiego (jeśli znasz)")}><input type="text" value={f.zlaNr} onChange={(e) => set({ zlaNr: e.target.value })} /></Field>
            <Field label={t("Numer konta do wypłaty (dobrowolnie)")} hint={t("Bez konta zasiłek przyjdzie przekazem pocztowym.")}><input type="text" value={f.konto} onChange={(e) => set({ konto: e.target.value })} /></Field>
            <Alert>{tb("ZAS-53 składasz do ZUS, jeśli prowadzisz działalność, jesteś zleceniobiorczynią albo choroba zaczęła się po ustaniu ubezpieczenia. Przy zwolnieniu z kodem „B” (ciąża) zasiłek wynosi **100%** podstawy. Pracownica na etacie nie składa ZAS-53: zwolnienie e-ZLA trafia do pracodawcy.")}</Alert>
          </>}
          {tab === "zas26" && <>
            <Field label={t("Podstawa")}><select value={f.tytulAdopcji} onChange={(e) => set({ tytulAdopcji: e.target.value })}>
              <option value="rodzina">{t("Przyjęłam dziecko jako rodzina zastępcza")}</option>
              <option value="sad">{t("Wystąpiłam do sądu o przysposobienie dziecka")}</option>
            </select></Field>
            <DataPole label={t(f.tytulAdopcji === "rodzina" ? "Data przyjęcia dziecka na wychowanie" : "Data wniosku do sądu opiekuńczego")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            <Field label={t("Dane dziecka (imię i nazwisko, miejsce i data urodzenia)")}><textarea rows={3} value={f.daneDziecka} onChange={(e) => set({ daneDziecka: e.target.value })} /></Field>
            <Alert>{tb("Oświadczenie ZAS-26 dołączasz do wniosku ZAM. Wniosek o urlop złóż w ciągu **{dni}** od przyjęcia dziecka, a wariant {proc}% (uśredniona stawka) w ciągu **{dni81}**.", { dni: dni(T.adopcja_wniosek_o_urlop_po_przyjeciu_dziecka), proc: liczba(P.wariant_pelny_wymiar_81_5), dni81: dni(T.adopcja_wniosek_81_5_po_przyjeciu) })}</Alert>
          </>}
          {tab === "zam" && <>
            <Field label={t("Adresat wniosku")}><select value={f.adresat} onChange={(e) => set({ adresat: e.target.value })}><option value="pracodawca">{t("Pracodawca wypłacający zasiłek")}</option><option value="ZUS">{t("Zakład Ubezpieczeń Społecznych")}</option></select></Field>
            <label className="check"><input type="checkbox" checked={f.w815} onChange={(e) => set({ w815: e.target.checked })} />{t("Wybieram uśrednioną stawkę zasiłku ({proc}%).", { proc: liczba(P.wariant_pelny_wymiar_81_5) })}</label>
            <p><Link href="/dokumenty">{t("Sprawdź terminy i gdzie złożyć ZAM")}</Link></p>
            <label className="check"><input type="checkbox" checked={f.przedsiebiorca} onChange={(e) => set({ przedsiebiorca: e.target.checked })} />{t("Prowadzę działalność gospodarczą")}</label>
            {f.przedsiebiorca && <label className="check"><input type="checkbox" checked={f.chorobowe} onChange={(e) => set({ chorobowe: e.target.checked })} />{t("Mam dobrowolne ubezpieczenie chorobowe")}</label>}
            <DataPole label={t("Data urodzenia dziecka / przyjęcia na wychowanie")} value={f.dziecko} onChange={(iso) => set({ dziecko: iso })} />
            {okresy.length > 0 ? <Alert t="ok">{t("Okresy zasiłku wstawiono z Twojego planu w kalkulatorze ({n}).", { n: okresy.length })}</Alert> : <Alert>{tb("Okresy zasiłku uzupełnimy z planu w [kalkulatorze](/kalkulator).")}</Alert>}</>}
        </fieldset>

        <div>
          <div className="card" id="podglad" style={{ overflowWrap: "anywhere" }}>
            <div className="row between no-print"><h2>{t("Podgląd wniosku")}</h2><Sim /></div>
            {fmt.jezyk !== "pl" && <p className="small muted no-print">{t("Wersja po polsku: wniosek składasz w polskiej firmie lub w ZUS, więc jego tekst zostaje po polsku. Poniżej możesz go sprawdzić i wydrukować.")}</p>}
            <div lang="pl" style={{ fontFamily: "Georgia, serif", lineHeight: 1.6 }}>
              <p className="right">{f.miasto || "………"}, {dataPL(data)}</p>
              <p><b>{f.imie || "Imię i nazwisko"}</b><br />PESEL: {f.pesel || "…………"}</p>
              {tab === "zas53" ? <p className="right"><b>Zakład Ubezpieczeń Społecznych</b></p> : tab === "zas26" ? <p className="right"><b>{f.pracodawca || "Płatnik składek / ZUS"}</b></p> : tab !== "zam" ? <p className="right"><b>{f.pracodawca || "Pracodawca"}</b></p> : <p className="right"><b>{f.adresat === "ZUS" ? "Zakład Ubezpieczeń Społecznych" : f.pracodawca || "Pracodawca (płatnik składek)"}</b></p>}
              {tab === "jeden" && <><h3 style={{ textAlign: "center" }}>Wniosek o udzielenie urlopu macierzyńskiego i urlopu rodzicielskiego</h3>
                <p>Na podstawie przepisów Kodeksu pracy wnoszę o udzielenie mi urlopu macierzyńskiego w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(f.do)}</b> oraz bezpośrednio po nim urlopu rodzicielskiego w okresie od <b>{dataPL(f.rodzOd)}</b> do <b>{dataPL(f.rodzDo)}</b>.</p>
                <p>Data urodzenia lub przewidywana data porodu: <b>{dataPL(f.dziecko)}</b>.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "rezygnacja" && <><h3 style={{ textAlign: "center" }}>Rezygnacja z części urlopu macierzyńskiego</h3>
                <p>Na podstawie art. 180 § 5 Kodeksu pracy rezygnuję z urlopu macierzyńskiego od dnia <b>{dataPL(f.od)}</b> (do dnia <b>{dataPL(f.do)}</b>). Wykorzystałam co najmniej {MIN_TYGODNI_MATKI} tygodni urlopu po porodzie.</p>
                <p>Data urodzenia dziecka: <b>{dataPL(f.dziecko)}</b>. Pozostałą część urlopu macierzyńskiego przejmie ojciec dziecka: <b>{f.ojciecImie || "…………"}</b>.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "zas53" && <><h3 style={{ textAlign: "center" }}>Wniosek o zasiłek chorobowy (ZAS-53)</h3>
                <p>Adres: <b>{f.adres || "…………"}</b>{f.telefon ? <>, tel. {f.telefon}</> : ""}. NIP płatnika składek: <b>{f.nip || "…………"}</b>.</p>
                <p>Składam wniosek o przyznanie zasiłku chorobowego za okres niezdolności do pracy od <b>{dataPL(f.zlaOd)}</b> do <b>{dataPL(f.zlaDo)}</b>{f.zlaNr ? <> (zaświadczenie lekarskie: {f.zlaNr})</> : ""}. Niezdolność przypada w okresie ciąży (kod „B"), więc zasiłek przysługuje w wysokości 100% podstawy wymiaru.</p>
                <p>{f.konto ? <>Zasiłek proszę wypłacić na rachunek: <b>{f.konto}</b>.</> : "Zasiłek proszę wypłacić przekazem pocztowym na podany adres."}</p>
                <p>Oświadczam, że dane podałam zgodnie z prawdą. Jeśli ulegną zmianie, poinformuję o tym ZUS.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "zas26" && <><h3 style={{ textAlign: "center" }}>Oświadczenie o przyjęciu na wychowanie dziecka (ZAS-26)</h3>
                <p>{f.tytulAdopcji === "rodzina" ? <>Oświadczam, że przyjęłam na wychowanie dziecko jako rodzina zastępcza w dniu <b>{dataPL(f.dziecko)}</b>.</> : <>Oświadczam, że wystąpiłam do sądu opiekuńczego z wnioskiem o wszczęcie postępowania w sprawie przysposobienia dziecka w dniu <b>{dataPL(f.dziecko)}</b>.</>}</p>
                <p>Dane dziecka: <b style={{ whiteSpace: "pre-line" }}>{f.daneDziecka || "…………"}</b></p>
                <p>Oświadczam, że dane podałam zgodnie z prawdą. Jeśli ulegną zmianie, poinformuję o tym płatnika zasiłku.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {ojcowski && !koniec && <p>{t("Uzupełnij datę narodzin i okres urlopu, aby zobaczyć treść wniosku.")}</p>}
              {tab === "urlop" && (!ojcowski || koniec) && <><h3 style={{ textAlign: "center" }}>Wniosek o udzielenie {RODZ_URLOP[f.rodzaj]}</h3>
                <p>Na podstawie przepisów Kodeksu pracy wnoszę o udzielenie mi {RODZ_URLOP[f.rodzaj]} w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(koniec)}</b>{rodzicielski ? <> (część {f.czesc} z maksymalnie {L.urlop_rodzicielski_max_czesci})</> : ""}.</p>
                <p>{ojcowski ? "Data urodzenia dziecka" : f.rodzaj === "macierzynski" ? "Data urodzenia lub przewidywana data porodu" : "Data urodzenia lub przyjęcia dziecka"}: <b>{dataPL(ojcowski ? f.urodzenie : f.dziecko)}</b>.</p>
                {rodzicielski && f.drugi === "nie" && <p>Oświadczam, że w okresie objętym wnioskiem drugi rodzic nie będzie korzystać z urlopu rodzicielskiego ani pobierać zasiłku za ten urlop.</p>}
                {rodzicielski && f.drugi === "tak" && <p>Oświadczam, że w okresie objętym wnioskiem drugi rodzic zamierza skorzystać z urlopu rodzicielskiego lub pobierać zasiłek za ten urlop od <b>{dataPL(f.drugiOd)}</b> do <b>{dataPL(f.drugiDo)}</b>.</p>}
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "laczenie" && <><h3 style={{ textAlign: "center" }}>Wniosek o łączenie korzystania z urlopu rodzicielskiego z wykonywaniem pracy</h3>
                <p>Na podstawie art. 182<sup>1</sup>e Kodeksu pracy wnoszę o udzielenie urlopu rodzicielskiego w okresie od <b>{dataPL(f.od)}</b> do <b>{dataPL(f.do)}</b> z jednoczesnym wykonywaniem pracy w wymiarze <b>{f.etat}</b> pełnego wymiaru czasu pracy.</p>
                <p>Rozumiem, że wymiar urlopu rodzicielskiego ulega proporcjonalnemu wydłużeniu, a zasiłek macierzyński – proporcjonalnemu zmniejszeniu.</p>
                <p className="right">…………………………<br />(podpis)</p></>}
              {tab === "zam" && <><h3 style={{ textAlign: "center" }}>Podgląd danych do formularza ZAM</h3>
                <p>Wnoszę o ustalenie prawa do zasiłku macierzyńskiego w związku z urodzeniem dziecka / przyjęciem dziecka na wychowanie w dniu <b>{dataPL(f.dziecko)}</b>.</p>
                {okresy.length > 0 && <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>Rodzaj</th><th>Od</th><th>Do</th></tr></thead><tbody>{okresy.map((o, i) => <tr key={i}><td data-label="Rodzaj">{RODZAJE[o.rodzaj] ?? "Okres zasiłku"} ({o.kto === "matka" ? "rodzic 1" : "rodzic 2"})</td><td data-label="Od">{dataPL(o.od)}</td><td data-label="Do">{dataPL(o.do)}</td></tr>)}</tbody></table></div>}
                {f.w815 && <p>Wnoszę o uśrednioną stawkę zasiłku ({liczba(P.wariant_pelny_wymiar_81_5)}% podstawy).</p>}
                {f.przedsiebiorca && <p>Informacja o ubezpieczeniu: prowadzę pozarolniczą działalność gospodarczą, ubezpieczenie chorobowe: <b>{f.chorobowe ? "tak" : "nie"}</b>.</p>}
                <p className="right">…………………………<br />(podpis)</p></>}
            </div>
            <div className="row no-print mt">
              <button className="btn btn-secondary" onClick={() => wykonaj(true)} disabled={busy}>{t("Wydrukuj wniosek")}</button>
              <button className="btn btn-primary" onClick={() => wykonaj(false)} disabled={busy}>{t("Wyślij wniosek testowy")}</button>
            </div>
            {err && <Alert t="err">{err}</Alert>}
            {wyn && <Alert t="ok">{tb("Zapisano wniosek testowy. Numer: **{numer}**.", { numer: wyn.numerWniosku })} <Sim /></Alert>}
          </div>
        </div>
      </div>
    </>
  );
}
