"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DataPole } from "@/components/DataPole";
import { api } from "@/lib/sesja";
import { useFormaty, useT } from "@/lib/jezyk";
import { Wstaw } from "@/components/Wstaw";
import { Alert, Kroki, Lista } from "@/components/ui";
import { Pole as Field } from "@/components/Pole";
import { Kreator, useKreator, type KrokDef } from "./Kreator";
import { WyborSytuacji } from "./WyborSytuacji";
import { P, L, W, T, niezbywalne, standard, usredniony, num, czySytuacja, type Tryb, type Sytuacja } from "./stale";
import { parametrZywy, zastap } from "./adres";
import type { DaneWstepne } from "./SzybkiePorownanie";
import { etykietaKwoty, podpowiedzKwoty, PoleRodzaju, PoleZadluzenia, OstrzezenieZadluzenia, usePodstawa, useProfilZus, opisPoroduMnogiego, OPIS_NETTO, type Rodzaj } from "./zarobki";
import css from "./kalkulator.module.css";

// Oś czasu, tabela i porównanie wariantów ładują się dopiero przy ostatnim kroku.
const WynikSzczegoly = dynamic(() => import("./WynikSzczegoly"), {
  loading: () => <p role="status" className={css.statusLadowania}><span className="spin" aria-hidden="true" /> Wczytuję szczegóły wyniku…</p>,
});

const KROKI: KrokDef[] = [
  { id: "sytuacja", nazwa: "Sytuacja", tytul: "Dla kogo liczysz?" },
  { id: "dziecko", nazwa: "Dziecko", tytul: "Dziecko i data zdarzenia" },
  { id: "zarobki", nazwa: "Zarobki", tytul: "Zarobki (podstawa zasiłku)" },
  { id: "urlopy", nazwa: "Urlopy", tytul: "Urlopy i ich podział" },
  { id: "wariant", nazwa: "Wariant", tytul: "Wariant wysokości zasiłku" },
  { id: "wynik", nazwa: "Wynik", tytul: "Wynik" },
];
const K = { sytuacja: 0, dziecko: 1, zarobki: 2, urlopy: 3, wariant: 4, wynik: 5 };

// Data zdarzenia startuje pusta: nie zgadujemy jej za użytkownika (poprzednio „dziś + 100 dni" przy każdym wejściu).
const START = {
  tryb: "oboje" as Tryb, tytul: "porod", data: "", dzieci: 1, zaZyciem: false, martwe: false,
  bruttoM: "6500", bruttoO: "7000", podstawaM: "", podstawaO: "",
  // Rodzaj zatrudnienia każdego rodzica. Zaległe składki (tylko JDG): null = nie wpisano ręcznie (bierzemy z profilu, jeśli jest).
  rodzajM: "umowa_o_prace" as Rodzaj, rodzajO: "umowa_o_prace" as Rodzaj, zadlM: null as string | null, zadlO: null as string | null,
  przedPorodem: 0, ojciecPrzejmuje: 0, rodzM: 32, rodzO: niezbywalne, laczTyg: 0, etat: 0.5,
  ojcowski: true, ojcowskiOd: "", uzup: 0, wariant: "zmienny_100_70",
  dataUrDziecka: "", extra: {} as Record<string, any>,
};
type F = typeof START;

/** Ustawienia dla trybu wybranego w adresie (?tryb=…) albo przy wejściu z innej ścieżki kalkulatora. */
function stanPoczatkowy(tryb: Tryb): F {
  const dod: Partial<F> =
    tryb === "matka" ? { rodzO: 0, ojcowski: false }
    : tryb === "laczenie" ? { rodzM: 12, laczTyg: 20 }   // 12 + 20 + 9 (drugi rodzic) = 41 tyg., czyli cała pula
    : tryb === "adopcja" ? { tytul: "przysposobienie", ojcowski: false }
    : {};
  return { ...START, tryb, ...dod };
}

/** `poczatkowy` to tryb z adresu (?tryb=…): ustala stan startowy, a potem to wybór użytkownika jest źródłem prawdy, a adres za nim podąża. */
export default function PlanRodziny({ poczatkowy, onOjciec, wstepne }: { poczatkowy: Tryb; onOjciec: () => void; wstepne?: (DaneWstepne & { nr: number }) | null }) {
  const t = useT();
  const { liczba, opisObliczenia, pln, tygodnie } = useFormaty();
  const [f, setF] = useState<F>(() => stanPoczatkowy(poczatkowy));
  const [wyn, setWyn] = useState<any>(null);
  const [por, setPor] = useState<any>(null);
  const [wym, setWym] = useState<any>(null);
  const [blad, setBlad] = useState("");
  const [busy, setBusy] = useState(false);
  const [scen, setScen] = useState<any[]>([]);
  const [wczytano, setWczytano] = useState("");
  const [uzupForm, setUzupForm] = useState({ tc: 31, masa: 1500, od: "", do: "" });
  const [uzupWyn, setUzupWyn] = useState<any>(null);
  const [laczReczne, setLaczReczne] = useState<boolean | null>(null);
  // Uzupełniający urlop i przejęcie końcówki macierzyńskiego przez ojca to wyjątki: domyślnie ukryte, odsłania je dopiero zaznaczenie.
  // null = jeszcze nie klikano, wtedy decydują wczytane dane (np. scenariusz z już wpisanymi tygodniami).
  const [wczesniak, setWczesniak] = useState<boolean | null>(null);
  const [przejmuje, setPrzejmuje] = useState<boolean | null>(null);
  const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }));
  const dwoje = f.tryb !== "matka";

  const [pokazBledy, setPokazBledy] = useState(false);
  const [fokusBledu, setFokusBledu] = useState(0);
  const tresc = useRef<HTMLDivElement>(null);
  const wariantNazwa = useId();

  // Gotowe scenariusze pobieramy dopiero, gdy ktoś wybierze „Moje dane / przykładowa sprawa".
  useEffect(() => {
    if (f.tryb !== "wlasne" || scen.length) return;
    api("/api/scenariusze").then((j) => setScen((j.przypadki || []).filter((c: any) => c.wejscie?.tytul))).catch(() => {});
  }, [f.tryb, scen.length]);
  useEffect(() => {
    try {
      const pre = JSON.parse(localStorage.getItem("rodzice.prefill") || "null");
      if (pre?.podstawaM) {
        setF((x) => ({ ...x, podstawaM: String(pre.podstawaM), bruttoM: "", tryb: "wlasne", ...(pre.data ? { data: pre.data } : {}), ...(pre.dzieci ? { dzieci: Math.min(pre.dzieci, 5) } : {}) }));
        setWczytano(t("Wczytano dane z wgranego dokumentu: podstawa zasiłku {kwota}.", { kwota: pln(Number(pre.podstawaM)) }));
        localStorage.removeItem("rodzice.prefill");
      }
    } catch {}
  }, []);

  // Dane przeniesione z szybkiego porównania (nad kreatorem).
  useEffect(() => {
    if (!wstepne) return;
    setF((x) => ({ ...x, rodzajM: wstepne.rodzaj, bruttoM: wstepne.kwota || x.bruttoM, podstawaM: wstepne.podstawa, dzieci: wstepne.dzieci }));
  }, [wstepne?.nr]);

  // Profil ZUS zalogowanej osoby: domyślny rodzaj zatrudnienia i zaległe składki na dzień porodu.
  // Profil przypisujemy rodzicowi zgadniętemu z imienia (można zmienić w kroku „Zarobki").
  const profil = useProfilZus(f.data);
  const [profilDla, setProfilDla] = useState<"matka" | "ojciec">("matka");
  const zastosowany = useRef("");
  function przypiszProfil(kto: "matka" | "ojciec") {
    setProfilDla(kto);
    if (!profil?.rodzaj) return;
    const r = profil.rodzaj, kw = profil.zadeklarowanaPodstawa;
    setF((x) => kto === "matka"
      ? { ...x, rodzajM: r, ...(r === "dzialalnosc" && kw && (x.bruttoM === START.bruttoM || !x.bruttoM) ? { bruttoM: String(kw), podstawaM: "" } : {}) }
      : { ...x, rodzajO: r, ...(r === "dzialalnosc" && kw && (x.bruttoO === START.bruttoO || !x.bruttoO) ? { bruttoO: String(kw), podstawaO: "" } : {}) });
  }
  useEffect(() => {
    if (!profil || zastosowany.current === profil.osoba) return;
    zastosowany.current = profil.osoba;
    przypiszProfil(!dwoje || /a$/i.test(profil.osoba.split(" ")[0] ?? "") ? "matka" : "ojciec");
  }, [profil]);
  const zadlZProfilu = (kto: "matka" | "ojciec") => (profil && profilDla === kto && (dwoje || kto === "matka") ? profil.zadluzenie?.kwotaZadluzenia ?? null : null);
  const zadluzenie = (kto: "matka" | "ojciec") => {
    if ((kto === "matka" ? f.rodzajM : f.rodzajO) !== "dzialalnosc") return 0;
    const reczne = kto === "matka" ? f.zadlM : f.zadlO;
    return reczne !== null ? (num(reczne) || 0) : (zadlZProfilu(kto) ?? 0);
  };

  // podstawa wymiaru z kwoty i rodzaju zatrudnienia
  const podM = usePodstawa(f.rodzajM, f.bruttoM);
  const podO = usePodstawa(f.rodzajO, f.bruttoO, dwoje);

  const podstawaM = !Number.isNaN(num(f.podstawaM)) ? num(f.podstawaM) : (podM?.podstawaMiesieczna ?? NaN);
  const podstawaO = !Number.isNaN(num(f.podstawaO)) ? num(f.podstawaO) : (podO?.podstawaMiesieczna ?? NaN);

  // --- krok z adresu (?krok=…) ---
  // Najdalszy krok, do którego wystarczą wpisane dane. Adres z dalszym krokiem (odświeżenie, link) prowadzi do pierwszego braku.
  const brakData = !f.data;
  const brakPodstawy = !(podstawaM > 0);
  const { krok, maks, idz, wstecz, adres } = useKreator(KROKI, brakData ? K.dziecko : brakPodstawy ? K.zarobki : K.wynik);
  useEffect(() => { setPokazBledy(false); }, [krok]);   // zmiana kroku (także „Wstecz" przeglądarki) czyści komunikaty o błędach

  // Wybrany tryb zapisujemy w adresie (?tryb=…) bez nowego wpisu w historii. Dotyczy też trybu ustawionego przez
  // wczytany scenariusz albo dane z wgranego dokumentu, a po „Wstecz"/„Dalej" przeglądarki przywraca adres do bieżącego wyboru.
  useEffect(() => {
    const zAdresu = parametrZywy("tryb");
    if (f.tryb !== (czySytuacja(zAdresu) ? zAdresu : "oboje")) zastap({ tryb: f.tryb });
  }, [f.tryb, poczatkowy]);

  // przy porodzie mnogim jedno dziecko urodzone martwe: urlopy przysługują dla pozostałych przy życiu (art. 180¹ § 1 KP)
  const bezZywych = f.martwe && f.dzieci <= 1;
  const wiekGranicy = useMemo(() => {
    if (f.tytul === "porod" || !f.dataUrDziecka) return undefined;
    const lat = f.tytul === "przysposobienie" ? 14 : 7; const d = new Date(f.dataUrDziecka + "T00:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() + lat); return d.toISOString().slice(0, 10);
  }, [f.tytul, f.dataUrDziecka]);

  const wejscie = useMemo(() => {
    const rodz: any[] = [];
    if (f.rodzM > 0) rodz.push({ kto: "matka", tygodnie: f.rodzM });
    if (f.laczTyg > 0) rodz.push({ kto: "matka", tygodnie: f.laczTyg, wspolczynnikPracy: f.etat });
    if (dwoje && f.rodzO > 0) rodz.push({ kto: "ojciec", tygodnie: f.rodzO });
    const w: any = { ...f.extra, tytul: f.tytul, dataZdarzenia: f.data, liczbaDzieci: f.dzieci, zaswiadczenieZaZyciem: f.zaZyciem, wariant: f.wariant,
      podstawy: { matka: podstawaM, ...(dwoje && podstawaO ? { ojciec: podstawaO } : {}) }, rodzicielski: bezZywych ? [] : rodz };
    if (f.martwe) w.martwe = bezZywych ? {} : { liczbaDzieciPozostalychPrzyZyciu: f.dzieci - 1 }; else delete w.martwe;
    if (f.tytul === "porod" && f.przedPorodem > 0) w.przedPorodemDni = f.przedPorodem; else if (f.tytul === "porod") delete w.przedPorodemDni;
    if (dwoje && f.ojciecPrzejmuje > 0) w.macierzynskiOjciecPrzejmujeTyg = f.ojciecPrzejmuje; else if (!f.extra.macierzynskiOjciecPrzejmujeDni) delete w.macierzynskiOjciecPrzejmujeTyg;
    if (f.uzup > 0 && !bezZywych) w.uzupelniajacy = { kto: "matka", tygodnie: f.uzup }; else delete w.uzupelniajacy;
    if (dwoje && f.ojcowski && f.tytul === "porod" && !bezZywych) w.ojcowski = [{ od: f.ojcowskiOd || f.data, dni: L.urlop_ojcowski_dni }]; else if (!f.extra.ojcowski) delete w.ojcowski;
    if (wiekGranicy) w.wiekGranicyDzieckaData = wiekGranicy;
    return w;
  }, [f, bezZywych, podstawaM, podstawaO, dwoje, wiekGranicy]);

  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    setWyn(null);
    setPor(null);
    setBlad("");
    if (!f.data || !(podstawaM > 0)) { setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await api("/api/oblicz/plan", wejscie);
        if (my !== seq.current) return;
        setWyn(r);
        if (r.bledy.length) return;
        const { wariant, ...bez } = wejscie;
        const porownanie = await api("/api/oblicz/porownanie", bez);
        if (my !== seq.current) return;
        setPor(porownanie);
        try { localStorage.setItem("rodzice.plan", JSON.stringify({ wejscie })); } catch {}
      } catch {
        if (my === seq.current) setBlad("Nie udało się policzyć zasiłku. Sprawdź wpisane dane.");
      } finally {
        if (my === seq.current) setBusy(false);
      }
    }, 350);
    return () => { clearTimeout(t); ++seq.current; };
  }, [wejscie, podstawaM, f.data]);

  useEffect(() => {
    if (!f.data || !(podstawaM > 0)) return;
    let aktualne = true;
    api("/api/oblicz/plan", { tytul: f.tytul, dataZdarzenia: f.data, liczbaDzieci: f.dzieci, zaswiadczenieZaZyciem: f.zaZyciem, wariant: "zmienny_100_70", podstawy: { matka: podstawaM }, rodzicielski: [] })
      .then((r) => { if (aktualne) setWym(r.wymiary); }).catch(() => {});
    return () => { aktualne = false; };
  }, [f.tytul, f.data, f.dzieci, f.zaZyciem, podstawaM]);

  // Kwoty jednego wariantu z planu użytkownika: łącznie i miesięcznie (zakres, gdy stawka zmienia się w czasie).
  const kwotyWariantu = (w: any) => {
    if (!w?.sumy) return null;
    const mies: number[] = (w.okresy ?? []).map((o: any) => o.miesiecznieBrutto).filter((x: any) => typeof x === "number" && x > 0);
    const min = Math.min(...mies), max = Math.max(...mies);
    return (
      <span className={css.opis}>
        <b>Twoje kwoty: łącznie {pln(w.sumy.razem)} brutto</b>
        {w.sumyNetto && <> (ok. {pln(w.sumyNetto.razem)} na rękę)</>}
        {mies.length > 0 && <>, miesięcznie {Math.round(min) === Math.round(max) ? `ok. ${pln(max)}` : `od ${pln(min)} do ${pln(max)}`} brutto</>}.
      </span>
    );
  };
  const przyjecie = f.tytul !== "porod";
  const rodzicPierwszy = przyjecie ? "Rodzic 1" : "Matka";
  const rodzicDrugi = przyjecie ? "Rodzic 2" : "Ojciec";
  const limit = wym?.rodzicielskiTyg ?? W.urlop_rodzicielski["1"];
  const podzial = () => set({ rodzO: Math.min(niezbywalne, limit), rodzM: Math.max(limit - niezbywalne, 0), laczTyg: 0 });

  // Limity suwaków urlopu rodzicielskiego (te same zasady co w silniku): pula `limit` tyg. jest wspólna dla obojga,
  // a jeden rodzic może wziąć najwyżej `limit` − 9 tyg. (9 tyg. zostaje wyłącznie drugiemu). Tygodnie łączone z pracą też zużywają pulę.
  const limitRodzica = Math.max(limit - niezbywalne, 0);
  const rodzODrugiego = dwoje ? f.rodzO : 0;
  const maxRodzM = Math.max(0, Math.min(limitRodzica, limit - rodzODrugiego) - f.laczTyg);
  const maxRodzO = Math.max(0, Math.min(limitRodzica, limit - f.rodzM - f.laczTyg));
  const maxLacz = Math.max(0, Math.min(60, limitRodzica - f.rodzM, limit - rodzODrugiego - f.rodzM));
  const sumaRodz = f.rodzM + f.laczTyg + rodzODrugiego;
  const zostaloRodz = Math.max(limit - sumaRodz, 0);
  // Krótkie wyjaśnienie, dlaczego suwak dalej nie idzie (pokazujemy je tylko, gdy stoi na maksimum).
  const powodM = f.rodzM < maxRodzM ? "" : dwoje && limit - f.rodzO < limitRodzica
    ? `Więcej nie można: razem rodzice mają ${tygodnie(limit)}, a ${rodzicDrugi} ma już ${tygodnie(f.rodzO)}. Zmniejsz jego suwak, żeby ten poszedł dalej.`
    : `Więcej nie można: ${tygodnie(niezbywalne)} z puli ${tygodnie(limit)} zostaje wyłącznie dla drugiego rodzica.`;
  const powodO = f.rodzO < maxRodzO ? "" : limit - f.rodzM - f.laczTyg < limitRodzica
    ? `Więcej nie można: razem rodzice mają ${tygodnie(limit)}, a ${rodzicPierwszy} ma już ${tygodnie(f.rodzM + f.laczTyg)}. Zmniejsz jej suwak, żeby ten poszedł dalej.`
    : `Więcej nie można: ${tygodnie(niezbywalne)} z puli ${tygodnie(limit)} zostaje wyłącznie dla drugiego rodzica.`;
  const powodLacz = f.laczTyg < maxLacz ? "" : maxLacz >= 60 ? "" : `Więcej nie można: pula urlopu rodzicielskiego (${tygodnie(limit)}) jest już rozdzielona.`;
  // Po zmianie liczby dzieci lub zaświadczeniu „Za życiem” pula się zmienia: ucinamy tygodnie, które się już nie mieszczą.
  useEffect(() => {
    if (!wym) return;
    setF((x) => {
      const d = x.tryb !== "matka";
      const o = d ? Math.min(x.rodzO, limitRodzica) : x.rodzO;
      const m = Math.min(x.rodzM, limitRodzica, Math.max(limit - (d ? o : 0), 0));
      const l = Math.max(0, Math.min(x.laczTyg, limitRodzica - m, limit - (d ? o : 0) - m));
      return o === x.rodzO && m === x.rodzM && l === x.laczTyg ? x : { ...x, rodzO: o, rodzM: m, laczTyg: l };
    });
  }, [wym, limit, limitRodzica]);

  // Ojciec może przejąć końcówkę macierzyńskiego dopiero po 14 tyg. matki po porodzie (tyle samo liczy silnik).
  const macTyg = wym?.macierzynskiTyg ?? W.urlop_macierzynski_wg_liczby_dzieci["1"];
  const maxPrzejmuje = (przed: number) => Math.max(0, Math.floor((macTyg * 7 - przed - W.macierzynski_matka_obowiazkowo_po_porodzie_min * 7) / 7));
  const przejmujeOtwarte = przejmuje ?? f.ojciecPrzejmuje > 0;
  const wczesniakOtwarte = wczesniak ?? f.uzup > 0;
  const maxUzup = uzupWyn && !uzupWyn.error ? uzupWyn.tygodnie : f.uzup;
  const zmienUzupForm = (p: Partial<typeof uzupForm>) => { setUzupForm((x) => ({ ...x, ...p })); setUzupWyn(null); set({ uzup: 0 }); };

  function zmienTryb(k: Tryb) {
    setWczesniak(null); setPrzejmuje(null);
    set({ tryb: k, ...(k === "matka" ? { rodzO: 0, ojciecPrzejmuje: 0, ojcowski: false } : k === "oboje" ? { rodzO: niezbywalne, rodzM: Math.max(limit - niezbywalne, 0), ojcowski: true, laczTyg: 0 } : k === "laczenie" ? { rodzM: Math.max(limit - niezbywalne - 20, 0), laczTyg: 20, rodzO: niezbywalne } : k === "adopcja" ? { tytul: f.tytul === "porod" ? "przysposobienie" : f.tytul, martwe: false, ojcowski: false, ojciecPrzejmuje: 0, uzup: 0 } : {}), ...(k !== "adopcja" && f.tytul !== "porod" && k !== "wlasne" ? { tytul: "porod" } : {}) });
    setLaczReczne(null);
  }

  function wczytaj(id: string) {
    const c = scen.find((x) => x.id === id); if (!c) return; const w = c.wejscie;
    const { tytul, dataZdarzenia, liczbaDzieci, zaswiadczenieZaZyciem, wariant, podstawy, rodzicielski, ojcowski, uzupelniajacy, przedPorodemDni, macierzynskiOjciecPrzejmujeTyg, martwe, wiekGranicyDzieckaData, ...reszta } = w;
    const bl = rodzicielski || []; const m1 = bl.find((b: any) => b.kto === "matka" && !b.wspolczynnikPracy); const m2 = bl.find((b: any) => b.kto === "matka" && b.wspolczynnikPracy); const o = bl.find((b: any) => b.kto === "ojciec");
    const tryb: Tryb = tytul !== "porod" ? "adopcja" : m2 ? "laczenie" : (podstawy?.ojciec || reszta.macierzynskiOjciecPrzejmujeDni) ? "oboje" : "matka";
    setF({ ...START, tryb, tytul, data: dataZdarzenia, dzieci: liczbaDzieci, zaZyciem: !!zaswiadczenieZaZyciem, martwe: !!martwe, bruttoM: "", bruttoO: "", podstawaM: String(podstawy?.matka ?? ""), podstawaO: String(podstawy?.ojciec ?? ""),
      przedPorodem: przedPorodemDni ?? 0, ojciecPrzejmuje: macierzynskiOjciecPrzejmujeTyg ?? 0, rodzM: m1?.tygodnie ?? 0, laczTyg: m2?.tygodnie ?? 0, etat: m2?.wspolczynnikPracy ?? 0.5, rodzO: o?.tygodnie ?? 0,
      ojcowski: !!ojcowski, ojcowskiOd: ojcowski?.[0]?.od ?? "", uzup: uzupelniajacy?.tygodnie ?? 0, wariant: wariant ?? "zmienny_100_70", extra: reszta });
    setLaczReczne(null); setWczesniak(null); setPrzejmuje(null); setUzupWyn(null);
    setWczytano(`Wczytano scenariusz: ${c.osoba}. Przejdź dalej, żeby sprawdzić dane.`);
  }

  async function liczUzup() {
    if (!f.data) { setUzupWyn({ error: "Najpierw podaj datę porodu w kroku „Dziecko”." }); return; }
    try { setUzupWyn(await api("/api/oblicz/uzupelniajacy", { dataPorodu: f.data, tydzienCiazyUkonczone: uzupForm.tc, masaUrodzeniowaG: uzupForm.masa, pobytySzpital: uzupForm.od && uzupForm.do ? [{ od: uzupForm.od, do: uzupForm.do }] : [] })); } catch (e: any) { setUzupWyn({ error: e.message }); }
  }


  // --- kroki: walidacja i nawigacja ---
  const komunikatData = przyjecie ? "Podaj datę przyjęcia dziecka na wychowanie." : "Podaj datę urodzenia dziecka lub przewidywaną datę porodu.";
  const komunikatPodstawy = "Wpisz kwotę zarobków albo gotową podstawę zasiłku.";
  const mnogi = opisPoroduMnogiego(f.dzieci, f.tytul, f.zaZyciem);
  useEffect(() => { if (fokusBledu) tresc.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [fokusBledu]);

  function idzDo(k: number) { setPokazBledy(false); idz(k); }   // nowy krok = nowy wpis historii (adres ?krok=…)
  function dalej() {
    if ((krok === K.dziecko && brakData) || (krok === K.zarobki && brakPodstawy)) { setPokazBledy(true); setFokusBledu((n) => n + 1); return; }
    idzDo(krok + 1);
  }

  const laczOtwarte = laczReczne ?? (f.tryb === "laczenie" || f.laczTyg > 0);
  const sytuacja = (s: Sytuacja) => { if (s === "ojciec") onOjciec(); else zmienTryb(s); };

  const podglad = krok >= K.zarobki && krok <= K.wariant ? (
    <p className={css.podglad}>
      {busy ? t("Liczymy wstępny wynik…") : wyn ? <Wstaw tekst={t("Wstępny wynik: {kwota} razem. Pełny wynik zobaczysz w ostatnim kroku.")} wartosci={{ kwota: <b>{pln(wyn.sumy.razem)}</b> }} /> : t("Wstępny wynik pojawi się, gdy podasz datę i zarobki.")}
    </p>
  ) : null;

  return (
    <Kreator kroki={KROKI} krok={krok} maks={maks} onKrok={idzDo} onWstecz={wstecz} adres={adres} onDalej={dalej} dalejEtykieta={krok === K.wariant ? "Pokaż wynik" : "Dalej"} podglad={podglad}>
      <div ref={tresc}>
        {krok === K.sytuacja && (
          <WyborSytuacji wartosc={f.tryb} onZmiana={sytuacja}>
            {f.tryb === "wlasne" && (
              <div className={css.sekcja}>
                <p className={css.mala}><Wstaw tekst={t("Wczytaj gotowy scenariusz (fikcyjna osoba) albo {link}: podstawa wymiaru zostanie odczytana z dokumentu.")} wartosci={{ link: <Link href="/wgraj">{t("wgraj skan wniosku")}</Link> }} /></p>
                <Field label={t("Scenariusz")}><select defaultValue="" onChange={(e) => e.target.value && wczytaj(e.target.value)}><option value="">{t("— wybierz —")}</option>{scen.map((c) => <option key={c.id} value={c.id}>{c.osoba}</option>)}</select></Field>
              </div>
            )}
            <div role="status">{wczytano && <Alert t="ok">{wczytano}</Alert>}</div>
          </WyborSytuacji>
        )}

        {krok === K.dziecko && (
          <>
            <Field label={t("Co się wydarzyło / wydarzy?")}><select value={f.tytul} onChange={(e) => set({ tytul: e.target.value, ...(e.target.value !== "porod" ? { martwe: false, ojcowski: false, ojciecPrzejmuje: 0, uzup: 0 } : {}) })}>
              <option value="porod">{t("Poród (urodzenie dziecka)")}</option><option value="przysposobienie">{t("Przysposobienie (adopcja)")}</option><option value="rodzina_zastepcza">{t("Rodzina zastępcza niezawodowa")}</option></select></Field>
            <DataPole label={f.tytul === "porod" ? "Data urodzenia lub przewidywana data porodu" : "Data przyjęcia dziecka na wychowanie"} value={f.data} onChange={(iso) => set({ data: iso })} error={pokazBledy && brakData ? komunikatData : undefined} />
            <div className="grid g2">
              <Field label={t(f.tytul === "porod" ? "Liczba dzieci przy jednym porodzie" : "Liczba dzieci przyjmowanych jednocześnie")}><select value={f.dzieci} onChange={(e) => set({ dzieci: +e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? t("5 lub więcej") : n}</option>)}</select></Field>
              {f.tytul !== "porod" && <DataPole label="Data urodzenia dziecka" hint="Do limitu wieku (7/10 lat – rodzina zastępcza, 14 lat – adopcja)" value={f.dataUrDziecka} onChange={(iso) => set({ dataUrDziecka: iso })} />}
            </div>
            {mnogi && <p className={css.mala} role="status">{mnogi}</p>}
            <label className="check"><input type="checkbox" checked={f.zaZyciem} onChange={(e) => set({ zaZyciem: e.target.checked })} />{t("Dziecko ma zaświadczenie „Za życiem” (dłuższy urlop rodzicielski)")}</label>
            {f.tytul === "porod" && <label className="check"><input type="checkbox" checked={f.martwe} onChange={(e) => set({ martwe: e.target.checked })} />{f.dzieci > 1 ? "Jedno z dzieci urodziło się martwe" : "Dziecko urodziło się martwe"}</label>}
          </>
        )}

        {krok === K.zarobki && (
          <>
            {profil && dwoje && (
              <Field label={`Dane z Twojego profilu ZUS (${profil.osoba}) dotyczą`} hint="Z profilu bierzemy rodzaj zatrudnienia i zaległe składki. Wybierz, czyje to dane.">
                <select value={profilDla} onChange={(e) => przypiszProfil(e.target.value === "ojciec" ? "ojciec" : "matka")}>
                  <option value="matka">{rodzicPierwszy}</option><option value="ojciec">{rodzicDrugi}</option>
                </select></Field>
            )}
            <div className={dwoje ? "grid g2" : undefined}>
              {(["matka", ...(dwoje ? ["ojciec"] : [])] as ("matka" | "ojciec")[]).map((kto) => {
                const m = kto === "matka";
                const rodzaj = m ? f.rodzajM : f.rodzajO;
                const kwota = m ? f.bruttoM : f.bruttoO;
                const pods = m ? podstawaM : podstawaO;
                const reczne = m ? f.zadlM : f.zadlO;
                const zProf = zadlZProfilu(kto);
                const przyklad = kwota === (m ? START.bruttoM : START.bruttoO);
                return (
                  <fieldset key={kto} className={css.zestawRodzica}>
                    {dwoje && <legend>{m ? rodzicPierwszy : rodzicDrugi}</legend>}
                    <PoleRodzaju rodzaj={rodzaj} zProfilu={!!profil?.rodzaj && profilDla === kto && rodzaj === profil.rodzaj}
                      onZmiana={(r) => set(m ? { rodzajM: r } : { rodzajO: r })} />
                    <Field label={etykietaKwoty(rodzaj)} hint={`${podpowiedzKwoty(rodzaj)}${przyklad ? " Podana kwota jest przykładowa, wpisz własną." : ""}`}
                      error={m && pokazBledy && brakPodstawy ? komunikatPodstawy : undefined}>
                      <input type="number" inputMode="decimal" min={0} value={kwota} onChange={(e) => set(m ? { bruttoM: e.target.value, podstawaM: "" } : { bruttoO: e.target.value, podstawaO: "" })} /></Field>
                    {pods > 0 && <p className={css.mala}>Podstawa zasiłku: <b>{pln(pods)}</b> miesięcznie.</p>}
                    {rodzaj === "dzialalnosc" && (
                      <>
                        <PoleZadluzenia wartosc={reczne ?? (zProf != null ? String(zProf) : "")} zProfilu={reczne === null && zProf != null}
                          onZmiana={(s) => set(m ? { zadlM: s } : { zadlO: s })} />
                        <OstrzezenieZadluzenia kwota={zadluzenie(kto)} dzien={f.data || undefined} zProfilu={reczne === null && zProf != null} />
                      </>
                    )}
                  </fieldset>
                );
              })}
            </div>
            <details className="dl"><summary>Znam gotową podstawę zasiłku (np. z decyzji ZUS lub druku Z-3)</summary>
              <p className={css.mala}>Podstawa to kwota po odjęciu składek, od której ZUS liczy zasiłek. Jeśli ją wpiszesz, kwotę powyżej pomijamy.</p>
              <div className="grid g2 mt"><Field label={`${rodzicPierwszy}: podstawa zasiłku (zł)`}><input type="number" inputMode="decimal" min={0} value={f.podstawaM} onChange={(e) => set({ podstawaM: e.target.value })} /></Field>
                {dwoje && <Field label={`${rodzicDrugi}: podstawa zasiłku (zł)`}><input type="number" inputMode="decimal" min={0} value={f.podstawaO} onChange={(e) => set({ podstawaO: e.target.value })} /></Field>}</div></details>
            <Kroki kroki={podM?.kroki?.map(opisObliczenia)} tytul="Jak policzono podstawę zasiłku" />
            {podM && podM.ostrzezenia.length > 0 && <Lista items={podM.ostrzezenia.map(opisObliczenia)} warn />}
          </>
        )}

        {krok === K.urlopy && (
          bezZywych ? <p>{t("Przy urodzeniu martwego dziecka nie planujemy urlopu rodzicielskiego. Przejdź dalej.")}</p> : (
            <>
              {f.tytul === "porod" && <Field label={`Urlop macierzyński przed porodem: ${f.przedPorodem} dni`} hint={`Urlop można rozpocząć do ${tygodnie(W.macierzynski_przed_porodem_max)} przed porodem.`}><input type="range" min={0} max={W.macierzynski_przed_porodem_max * 7} value={f.przedPorodem} aria-valuetext={`${f.przedPorodem} dni`} onChange={(e) => { const p = +e.target.value; set({ przedPorodem: p, ojciecPrzejmuje: Math.min(f.ojciecPrzejmuje, maxPrzejmuje(p)) }); }} /></Field>}
              <Field label={`${rodzicPierwszy}: urlop rodzicielski ${tygodnie(f.rodzM)}`} hint={`Wspólna pula dla obojga rodziców: ${tygodnie(limit)}. Wykorzystano ${tygodnie(sumaRodz)}, zostało ${tygodnie(zostaloRodz)}.${powodM ? " " + powodM : ""}`}><input type="range" min={0} max={maxRodzM} value={Math.min(f.rodzM, maxRodzM)} aria-valuetext={tygodnie(f.rodzM)} onChange={(e) => set({ rodzM: +e.target.value })} /></Field>
              {dwoje && <Field label={`${rodzicDrugi}: urlop rodzicielski ${tygodnie(f.rodzO)}`} hint={`Każdy rodzic ma ${tygodnie(niezbywalne)} wyłącznie dla siebie.${powodO ? " " + powodO : ""}`}><input type="range" min={0} max={maxRodzO} value={Math.min(f.rodzO, maxRodzO)} aria-valuetext={tygodnie(f.rodzO)} onChange={(e) => set({ rodzO: +e.target.value })} /></Field>}
              {dwoje && <button type="button" className="btn btn-ghost btn-sm" onClick={podzial}>Ustaw {tygodnie(niezbywalne)} dla drugiego rodzica</button>}
              <details className="dl mt" open={laczOtwarte} onToggle={(e) => setLaczReczne(e.currentTarget.open)}>
                <summary>{t("Łączenie pracy z urlopem rodzicielskim")}</summary>
                <p className={css.mala}>{t("Można pracować do ½ etatu u pracodawcy, który udziela urlopu. Urlop wydłuża się proporcjonalnie, a zasiłek maleje proporcjonalnie.")}</p>
                <Field label={`${rodzicPierwszy}: tygodnie urlopu połączone z pracą ${f.laczTyg}`} hint={`Te tygodnie też zużywają wspólną pulę ${tygodnie(limit)}.${powodLacz ? " " + powodLacz : ""}`}><input type="range" min={0} max={maxLacz} value={Math.min(f.laczTyg, maxLacz)} aria-valuetext={tygodnie(f.laczTyg)} onChange={(e) => set({ laczTyg: +e.target.value })} /></Field>
                {f.laczTyg > 0 && <Field label={`Wymiar etatu w pracy: ${f.etat}`}><input type="range" min={0.1} max={L.laczenie_z_praca_max_wymiar_etatu} step={0.05} value={f.etat} onChange={(e) => set({ etat: +e.target.value })} /></Field>}
              </details>
              {dwoje && f.tytul === "porod" && <label className="check mt"><input type="checkbox" checked={f.ojcowski} onChange={(e) => set({ ojcowski: e.target.checked })} />{t("Uwzględnij urlop ojcowski ({tyg})", { tyg: tygodnie(L.urlop_ojcowski_dni / 7) })}</label>}
              {dwoje && f.tytul === "porod" && f.ojcowski && <DataPole label="Początek urlopu ojcowskiego" hint="Domyślnie dzień porodu" value={f.ojcowskiOd} onChange={(iso) => set({ ojcowskiOd: iso })} />}
              {dwoje && !przyjecie && (
                <>
                  <label className="check mt"><input type="checkbox" checked={przejmujeOtwarte} onChange={(e) => { setPrzejmuje(e.target.checked); if (!e.target.checked) set({ ojciecPrzejmuje: 0 }); }} />Ojciec przejmuje końcówkę urlopu macierzyńskiego (tylko w szczególnych sytuacjach)</label>
                  {przejmujeOtwarte && (
                    <div className={css.sekcja}>
                      <p className={css.mala}>To nie jest zwykły podział urlopu. Ojciec może przejąć końcówkę dopiero po tym, jak matka wykorzysta co najmniej {tygodnie(W.macierzynski_matka_obowiazkowo_po_porodzie_min)} urlopu po porodzie, np. gdy wraca do pracy. W razie choroby matki, jej śmierci lub porzucenia dziecka zasady są inne: zapytaj w ZUS.</p>
                      <Field label={`Ojciec przejmuje: ${f.ojciecPrzejmuje} tyg.`} hint={maxPrzejmuje(f.przedPorodem) > 0 ? `Można przekazać najwyżej ${tygodnie(maxPrzejmuje(f.przedPorodem))}.` : `Przy tych danych nie ma czego przekazać: matka musi mieć po porodzie co najmniej ${tygodnie(W.macierzynski_matka_obowiazkowo_po_porodzie_min)} urlopu.`}>
                        <input type="range" min={0} max={maxPrzejmuje(f.przedPorodem)} value={Math.min(f.ojciecPrzejmuje, maxPrzejmuje(f.przedPorodem))} aria-valuetext={`${f.ojciecPrzejmuje} tygodni`} onChange={(e) => set({ ojciecPrzejmuje: +e.target.value })} /></Field>
                    </div>
                  )}
                </>
              )}
              {f.tytul === "porod" && (
                <>
                  <label className="check mt"><input type="checkbox" checked={wczesniakOtwarte} onChange={(e) => { setWczesniak(e.target.checked); if (!e.target.checked) { set({ uzup: 0 }); setUzupWyn(null); } }} />Dziecko urodziło się przedwcześnie lub po porodzie było w szpitalu (uzupełniający urlop macierzyński)</label>
                  {wczesniakOtwarte && (
                    <div className={css.sekcja}>
                      <p className={css.mala}>Uzupełniający urlop przysługuje tylko za dni pobytu dziecka w szpitalu. Jego długość zależy od tygodnia porodu: wpisz dane, a policzymy, ile przysługuje.</p>
                      <div className="grid g2">
                        <Field label={t("Tydzień ciąży w dniu porodu")}><input type="number" inputMode="numeric" value={uzupForm.tc} onChange={(e) => zmienUzupForm({ tc: +e.target.value })} /></Field>
                        <Field label={t("Masa urodzeniowa (g)")}><input type="number" inputMode="numeric" value={uzupForm.masa} onChange={(e) => zmienUzupForm({ masa: +e.target.value })} /></Field>
                        <DataPole label={t("Pobyt w szpitalu – od")} value={uzupForm.od} onChange={(iso) => zmienUzupForm({ od: iso })} />
                        <DataPole label={t("Pobyt w szpitalu – do")} value={uzupForm.do} onChange={(iso) => zmienUzupForm({ do: iso })} />
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={liczUzup}>Policz, ile przysługuje</button>
                      <div role="status">{uzupWyn && (uzupWyn.error ? <Alert t="err">{uzupWyn.error}</Alert>
                        : uzupWyn.tygodnie > 0
                          ? <Alert t="ok">{t("Przysługuje ")}<b>{tygodnie(uzupWyn.tygodnie)}</b> (uwzględnione dni pobytu: {uzupWyn.dniWOknie}). <button type="button" className="btn btn-sm btn-ghost" onClick={() => set({ uzup: uzupWyn.tygodnie })}>{t("Dodaj urlop do planu")}</button></Alert>
                          : <Alert t="info">Przy tych danych uzupełniający urlop nie przysługuje. Sprawdź daty pobytu w szpitalu.</Alert>)}</div>
                      {maxUzup > 0 && <Field label={`Uzupełniający urlop w planie: ${f.uzup} tyg.`} hint={`Najwyżej ${tygodnie(maxUzup)}: tyle wynika z Twoich danych.`}><input type="range" min={0} max={maxUzup} value={Math.min(f.uzup, maxUzup)} aria-valuetext={`${f.uzup} tygodni`} onChange={(e) => set({ uzup: +e.target.value })} /></Field>}
                    </div>
                  )}
                </>
              )}
            </>
          )
        )}

        {krok === K.wariant && (
          <fieldset className={css.zestaw}>
            <legend>{t("Jak ma być liczona wysokość zasiłku?")}</legend>
            <div className={`${css.opcje} ${css.pelne}`}>
              <label className={css.opcja}><input type="radio" name={wariantNazwa} checked={f.wariant === "zmienny_100_70"} onChange={() => set({ wariant: "zmienny_100_70" })} /><span><b>Standardowy ({standard(liczba)})</b><span className={css.opis}>Dostajesz więcej na początku, mniej później. Nic nie musisz zgłaszać: to wariant domyślny.</span>{kwotyWariantu(por?.zmienny_100_70)}</span></label>
              <label className={css.opcja}><input type="radio" name={wariantNazwa} checked={f.wariant === "usredniony_81_5"} onChange={() => set({ wariant: "usredniony_81_5" })} /><span><b>Uśredniony ({usredniony(liczba)})</b><span className={css.opis}>Cały czas dostajesz tyle samo. Trzeba to wybrać we wniosku w ciągu {przyjecie ? T.adopcja_wniosek_81_5_po_przyjeciu : T.wniosek_pelny_wymiar_81_5_po_porodzie} dni {przyjecie ? "od przyjęcia dziecka" : "od porodu"}. Wyłączne tygodnie drugiego rodzica zachowują stawkę {liczba(P.zasilek_za_9_tyg_drugiego_rodzica)}%.</span>{kwotyWariantu(por?.usredniony_81_5)}</span></label>
            </div>
            <p className={css.mala}>
              <b>Nie wiesz, który wybrać?</b> Wybierz standardowy: nic nie trzeba zgłaszać.
              {por && por.roznicaRazem !== 0 ? <> W Twoim planie wariant {por.roznicaRazem > 0 ? "uśredniony" : "standardowy"} daje łącznie o {pln(Math.abs(por.roznicaRazem))} więcej (brutto).</> : por ? " W Twoim planie oba warianty dają łącznie tyle samo." : " Gdy wpiszesz datę i zarobki, pokażemy tu kwoty z Twojego planu."}
              {" "}Uśredniony wybierasz tylko wtedy, gdy chcesz co miesiąc tyle samo, i trzeba go zgłosić w {przyjecie ? T.adopcja_wniosek_81_5_po_przyjeciu : T.wniosek_pelny_wymiar_81_5_po_porodzie} dni {przyjecie ? "od przyjęcia dziecka" : "od porodu"}.
            </p>
          </fieldset>
        )}

        {krok === K.wynik && (
          <>
            {/* Stały obszar komunikatów: czytnik ogłasza zmianę stanu (brak danych, liczenie, wynik). */}
            <div role="status">
              {(brakData || brakPodstawy) && (
                <div className={css.kwota}>
                  <p className={css.kwotaOpis}>{t("Zasiłki razem (przed zaliczką na podatek)")}</p>
                  <p className={`${css.kwotaWartosc} ${css.pusta}`}>{pln(null)}</p>
                  <p className={css.mala}>{t("Żeby policzyć zasiłek, uzupełnij:")}</p>
                  <ul className={css.braki}>
                    {brakData && <li><button type="button" className="btn btn-ghost btn-sm" onClick={() => idzDo(K.dziecko)}>{t("Datę zdarzenia")}</button></li>}
                    {brakPodstawy && <li><button type="button" className="btn btn-ghost btn-sm" onClick={() => idzDo(K.zarobki)}>{t("Zarobki lub podstawę zasiłku")}</button></li>}
                  </ul>
                </div>
              )}
              {!brakData && !brakPodstawy && busy && !wyn && <div className={css.kwota}><p className={css.statusLadowania}><span className="spin" aria-hidden="true" /> {t("Liczymy zasiłek…")}</p></div>}
              {wyn && (
                <div className={css.kwota}>
                  <p className={css.kwotaOpis}>Zasiłki razem: brutto (przed zaliczką na podatek)</p>
                  <p className={css.kwotaWartosc}>{pln(wyn.sumy.razem)}</p>
                  {wyn.sumyNetto && <p className={css.kwotaNettoDuza}>Na rękę (szacunkowo): <b>{pln(wyn.sumyNetto.razem)}</b></p>}
                  <dl className={css.podzial}>
                    <div><dt>{rodzicPierwszy}</dt><dd>{pln(wyn.sumy.matka)}{wyn.sumyNetto && <span className={css.dopisekBlok}>na rękę ok. {pln(wyn.sumyNetto.matka)}</span>}</dd></div>
                    {dwoje && <div><dt>{rodzicDrugi}</dt><dd>{pln(wyn.sumy.ojciec)}{wyn.sumyNetto && <span className={css.dopisekBlok}>na rękę ok. {pln(wyn.sumyNetto.ojciec)}</span>}</dd></div>}
                  </dl>
                  {wyn.sumyNetto && <p className={css.mala}>{OPIS_NETTO}</p>}
                </div>
              )}
            </div>
            {blad && <Alert t="err">{t(blad)}</Alert>}
            {wyn && (
              <>
                <p className={css.mala}>Wymiar: {przyjecie ? "urlop na warunkach macierzyńskiego" : "urlop macierzyński"} <b>{tygodnie(wyn.wymiary.macierzynskiTyg)}</b>, rodzicielski <b>{tygodnie(wyn.wymiary.rodzicielskiTyg)}</b> (wykorzystano {tygodnie(wyn.wymiary.rodzicielskiWykorzystaneTyg)}; przy łączeniu z pracą maks. {tygodnie(wyn.wymiary.rodzicielskiMaxPrzyLaczeniuTyg)}).</p>
                {mnogi && !f.martwe && <Alert t="info"><b>Dlaczego urlop jest dłuższy?</b> {mnogi}</Alert>}
                <OstrzezenieZadluzenia kwota={zadluzenie("matka")} dzien={f.data} kto={dwoje ? rodzicPierwszy : undefined} zProfilu={f.zadlM === null && zadlZProfilu("matka") != null} />
                {dwoje && <OstrzezenieZadluzenia kwota={zadluzenie("ojciec")} dzien={f.data} kto={rodzicDrugi} zProfilu={f.zadlO === null && zadlZProfilu("ojciec") != null} />}
                {wyn.bledy?.map((b: string, i: number) => <Alert key={i} t="err">{opisObliczenia(b)}</Alert>)}
                {wyn.ostrzezenia?.map((b: string, i: number) => <Alert key={i} t="warn">{opisObliczenia(b)}</Alert>)}
                <WynikSzczegoly wyn={wyn} por={por} start={f.data} rodzic1={rodzicPierwszy} rodzic2={rodzicDrugi} />
              </>
            )}
          </>
        )}
      </div>
    </Kreator>
  );
}
