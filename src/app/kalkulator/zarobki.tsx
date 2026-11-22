"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import parametry from "../../../data/parametry.json";
import { api, useSesja } from "@/lib/sesja";
import { pln, liczba, dataPL } from "@/lib/format";
import { progZadluzenia, wymiarMacierzynski, wymiarRodzicielski, type Parametry, type PodstawaWynik, type RodzajZatrudnienia } from "@/engine/kalkulator";
import type { StanZadluzeniaNaDzien, UbezpieczenieProfilu } from "@/lib/dane-profilu";
import { Alert } from "@/components/ui";
import { Pole } from "@/components/Pole";
import { num, P, T } from "./stale";
import css from "./kalkulator.module.css";

const PAR = parametry as unknown as Parametry;
export const PROG_ZADLUZENIA = progZadluzenia(PAR);
const skladki = `${liczba(P.skladki_odliczane_od_podstawy)}%`;

export type Rodzaj = RodzajZatrudnienia;
export const RODZAJE_ZATRUDNIENIA: { id: Rodzaj; nazwa: string }[] = [
  { id: "umowa_o_prace", nazwa: "Umowa o pracę" },
  { id: "zlecenie", nazwa: "Umowa zlecenie" },
  { id: "dzialalnosc", nazwa: "Własna działalność (JDG)" },
];
export const czyRodzaj = (s: unknown): s is Rodzaj => s === "umowa_o_prace" || s === "zlecenie" || s === "dzialalnosc";

export function etykietaKwoty(r: Rodzaj) {
  return r === "umowa_o_prace" ? "Średnia pensja brutto (zł miesięcznie)"
    : r === "zlecenie" ? "Średni przychód ze zlecenia brutto (zł miesięcznie)"
    : "Podstawa składek z deklaracji ZUS (zł miesięcznie)";
}
export function podpowiedzKwoty(r: Rodzaj) {
  return r === "umowa_o_prace" ? `Kwota z umowy, zanim pracodawca coś potrąci. Odejmiemy od niej składki pracownika (${skladki}) i tak dostaniemy podstawę zasiłku.`
    : r === "zlecenie" ? `Zasiłek przysługuje, jeśli płacisz dobrowolną składkę chorobową. Od przychodu odejmiemy składki (${skladki}).`
    : `To kwota, od której płacisz składki (nie przychód firmy). Zasiłek przysługuje przy dobrowolnej składce chorobowej. Odejmiemy ${skladki}.`;
}

/** Podstawa zasiłku z kwoty i rodzaju zatrudnienia (liczy serwer, parametry z panelu admina). */
export function usePodstawa(rodzaj: Rodzaj, kwota: string, wlaczone = true) {
  const [wynik, setWynik] = useState<PodstawaWynik | null>(null);
  useEffect(() => {
    const k = num(kwota);
    if (!wlaczone || !(k >= 0)) { setWynik(null); return; }
    let aktualne = true;
    const cialo = rodzaj === "umowa_o_prace" ? { typ: "pracownik", sredniaBrutto: k } : { typ: "niepracownik", sredniaPodstawa: k, zadeklarowanaKwota: rodzaj === "dzialalnosc" };
    const t = setTimeout(() => api<PodstawaWynik>("/api/oblicz/podstawa", cialo).then((r) => { if (aktualne) setWynik(r); }).catch(() => { if (aktualne) setWynik(null); }), 250);
    return () => { aktualne = false; clearTimeout(t); };
  }, [rodzaj, kwota, wlaczone]);
  return wynik;
}

/** Wybór rodzaju zatrudnienia: lista rozwijana z etykietą. */
export function PoleRodzaju({ label = "Rodzaj zatrudnienia", rodzaj, onZmiana, zProfilu }: { label?: string; rodzaj: Rodzaj; onZmiana: (r: Rodzaj) => void; zProfilu?: boolean }) {
  return (
    <Pole label={label} hint={zProfilu ? "Ustawione na podstawie Twojego profilu ZUS. Możesz zmienić." : "Od tego zależy, jak liczymy podstawę zasiłku."}>
      <select value={rodzaj} onChange={(e) => czyRodzaj(e.target.value) && onZmiana(e.target.value)}>
        {RODZAJE_ZATRUDNIENIA.map((r) => <option key={r.id} value={r.id}>{r.nazwa}</option>)}
      </select>
    </Pole>
  );
}

// ---------- profil ZUS zalogowanej osoby (dane symulowane) ----------
export interface ProfilZus { osoba: string; rodzaj: Rodzaj | null; zadeklarowanaPodstawa: number | null; zadluzenie: StanZadluzeniaNaDzien | null }

/** Profil zalogowanej osoby: rodzaj zatrudnienia w dniu `dzien` (albo ostatni) i stan zaległych składek na ten dzień. */
export function useProfilZus(dzien: string): ProfilZus | null {
  const { sesja } = useSesja();
  const [profil, setProfil] = useState<ProfilZus | null>(null);
  const pesel = sesja?.pesel;
  useEffect(() => {
    if (!pesel) { setProfil(null); return; }
    let aktualne = true;
    const naDzien = dzien || new Date().toISOString().slice(0, 10);
    const q = new URLSearchParams({ pesel, naDzien }).toString();
    Promise.all([
      api<{ osoba: string; ubezpieczenie: (UbezpieczenieProfilu & { zadeklarowanaPodstawa?: number })[] }>(`/api/zus/ubezpieczenie?${q}`),
      api<StanZadluzeniaNaDzien>(`/api/zus/zadluzenie?${q}`).catch(() => null),
    ]).then(([u, z]) => {
      if (!aktualne) return;
      const lista = u.ubezpieczenie ?? [];
      const biezace = lista.find((x) => x.od <= naDzien && (x.do === null || x.do >= naDzien)) ?? lista[lista.length - 1];
      setProfil({ osoba: u.osoba, rodzaj: czyRodzaj(biezace?.tytul) ? biezace.tytul : null, zadeklarowanaPodstawa: biezace?.zadeklarowanaPodstawa ?? null, zadluzenie: z });
    }).catch(() => { if (aktualne) setProfil(null); });
    return () => { aktualne = false; };
  }, [pesel, dzien]);
  return profil;
}

/** Ostrzeżenie dla JDG: zaległe składki powyżej progu w dniu porodu wstrzymują wypłatę zasiłku. */
export function OstrzezenieZadluzenia({ kwota, dzien, kto, zProfilu }: { kwota: number; dzien?: string; kto?: string; zProfilu?: boolean }) {
  if (!(kwota > PROG_ZADLUZENIA)) return null;
  return (
    <Alert t="warn">
      <p className={css.bezMarginesu}><b>{kto ? `${kto}: zaległe` : "Zaległe"} składki {pln(kwota)}{dzien ? ` na dzień ${dataPL(dzien)}` : ""}{zProfilu ? " (z profilu ZUS)" : ""}.</b> To więcej niż próg {pln(PROG_ZADLUZENIA)}, więc ZUS wstrzyma wypłatę zasiłku do czasu spłaty <b>całej</b> zaległości. Kwoty w wyniku zakładają, że zaległość zostanie spłacona.</p>
      <p className={css.bezMarginesu}>Co zrobić:</p>
      <ol className={css.listaKrokow}>
        <li>Sprawdź dokładną kwotę zaległości na <Link href="/pue">profilu PUE/eZUS</Link>.</li>
        <li>Spłać całą zaległość. Masz na to {PAR.limity_dni.przedawnienie_przy_zadluzeniu_miesiace} miesięcy, inaczej prawo do zasiłku za ten czas przepada.</li>
        <li>Po spłacie ZUS wypłaci zasiłek, najpóźniej w ciągu {T.zasilek_wyplata_po_splacie_zadluzenia_max} dni.</li>
      </ol>
    </Alert>
  );
}

/** Pole na zaległe składki (tylko JDG). Pusty ciąg = brak zaległości. */
export function PoleZadluzenia({ wartosc, onZmiana, zProfilu }: { wartosc: string; onZmiana: (s: string) => void; zProfilu?: boolean }) {
  return (
    <Pole label="Zaległe składki w dniu porodu (zł, jeśli są)" hint={zProfilu ? "Kwota z Twojego profilu ZUS na wybrany dzień. Możesz ją poprawić." : `Wpisz 0, jeśli nie masz zaległości. Zaległość powyżej ${pln(PROG_ZADLUZENIA)} wstrzymuje wypłatę zasiłku.`}>
      <input type="number" inputMode="decimal" min={0} value={wartosc} onChange={(e) => onZmiana(e.target.value)} />
    </Pole>
  );
}

/** Jedno zdanie o tym, jak liczba dzieci zmieniła wymiar urlopów (bliźnięta, trojaczki…). Pusty, gdy dziecko jest jedno. */
export function opisPoroduMnogiego(dzieci: number, tytul: string, zaZyciem = false): string {
  if (dzieci < 2) return "";
  const nazwa = tytul !== "porod" ? `Przyjęcie ${dzieci >= 5 ? "5 lub więcej" : dzieci} dzieci naraz` : dzieci === 2 ? "Bliźnięta" : dzieci === 3 ? "Trojaczki" : dzieci === 4 ? "Czworaczki" : "Poród mnogi (5 lub więcej dzieci)";
  const mac1 = wymiarMacierzynski(1, PAR), mac = wymiarMacierzynski(dzieci, PAR);
  const rodz1 = wymiarRodzicielski(1, zaZyciem, PAR), rodz = wymiarRodzicielski(dzieci, zaZyciem, PAR);
  const macNazwa = tytul === "porod" ? "urlop macierzyński" : "urlop na warunkach macierzyńskiego";
  return `${nazwa}: ${macNazwa} ${mac} tyg. zamiast ${mac1}, a urlop rodzicielski ${rodz} tyg. zamiast ${rodz1}.`;
}

/** Krótki opis uproszczenia przy kwotach „na rękę". */
export const OPIS_NETTO = `„Na rękę” to szacunek: od zasiłku nie płaci się składek ZUS ani zdrowotnej, potrąca się tylko zaliczkę na podatek (${PAR.podatek ? `${liczba(PAR.podatek.zaliczka_pit_proc)}% minus ${pln(PAR.podatek.kwota_zmniejszajaca_miesieczna)} miesięcznie, jeśli złożysz PIT-2` : "zależnie od Twojej sytuacji"}). Ostateczna kwota zależy od rozliczenia rocznego.`;
