"use client";
import { useEffect, useId, useState } from "react";
import { api } from "@/lib/sesja";
import { pln, tygodnie } from "@/lib/format";
import type { EtapPorownania } from "@/engine/kalkulator";
import { Pole } from "@/components/Pole";
import { num, standard, usredniony, niezbywalne, T } from "./stale";
import { etykietaKwoty, podpowiedzKwoty, PoleRodzaju, useProfilZus, OPIS_NETTO, opisPoroduMnogiego, type Rodzaj } from "./zarobki";
import css from "./kalkulator.module.css";

type Wynik = {
  podstawaMiesieczna: number; tygodnieRazem: number; etapy: EtapPorownania[];
  razem: { standard: number; usredniony: number }; razemNetto: { standard: number; usredniony: number } | null; roznicaRazem: number;
};
export type DaneWstepne = { rodzaj: Rodzaj; kwota: string; podstawa: string; dzieci: number };

const NAZWA_ETAPU = { macierzynski: "Urlop macierzyński", rodzicielski: "Urlop rodzicielski" } as const;

function Kwoty({ brutto, netto }: { brutto: number; netto: number | null }) {
  return (
    <>
      <span className={css.kwotaBrutto}>{pln(brutto)} <span className={css.dopisek}>brutto</span></span>
      {netto != null && <span className={css.kwotaNetto}>{pln(netto)} <span className={css.dopisek}>na rękę (szacunkowo)</span></span>}
    </>
  );
}

/**
 * Szybkie porównanie na starcie kalkulatora: pensja brutto -> miesięczne wypłaty w obu wariantach (100%/70% i 81,5%).
 * Bez dat i bez kreatora. Przycisk przenosi wpisane dane do pełnego kalkulatora.
 */
export default function SzybkiePorownanie({ onPelny }: { onPelny: (d: DaneWstepne) => void }) {
  const id = useId();
  const profil = useProfilZus("");
  const [rodzaj, setRodzaj] = useState<Rodzaj>("umowa_o_prace");
  const [rodzajReczny, setRodzajReczny] = useState(false);
  const [kwota, setKwota] = useState("");
  const [podstawa, setPodstawa] = useState("");
  const [dzieci, setDzieci] = useState(1);
  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [blad, setBlad] = useState("");

  // Domyślny rodzaj zatrudnienia z profilu (jeśli ktoś jest zalogowany i sam go jeszcze nie zmienił).
  useEffect(() => {
    if (rodzajReczny || !profil?.rodzaj) return;
    setRodzaj(profil.rodzaj);
    if (profil.rodzaj === "dzialalnosc" && profil.zadeklarowanaPodstawa && !kwota) setKwota(String(profil.zadeklarowanaPodstawa));
  }, [profil, rodzajReczny]);

  const wartosc = num(podstawa) > 0 ? num(podstawa) : num(kwota);
  const trybPodstawy = num(podstawa) > 0;
  useEffect(() => {
    setBlad("");
    if (!(wartosc > 0)) { setWynik(null); return; }
    let aktualne = true;
    const t = setTimeout(() => {
      api<Wynik>("/api/oblicz/szybkie", { kwota: wartosc, rodzaj: trybPodstawy ? "podstawa" : rodzaj, liczbaDzieci: dzieci })
        .then((r) => { if (aktualne) setWynik(r); })
        .catch(() => { if (aktualne) { setWynik(null); setBlad("Nie udało się policzyć. Sprawdź wpisaną kwotę."); } });
    }, 250);
    return () => { aktualne = false; clearTimeout(t); };
  }, [wartosc, trybPodstawy, rodzaj, dzieci]);

  const lepszy = wynik && wynik.roznicaRazem !== 0 ? (wynik.roznicaRazem > 0 ? "uśrednionego" : "standardowego") : null;
  const mnogi = opisPoroduMnogiego(dzieci, "porod");

  return (
    <section className={`card accent ${css.szybkie}`} aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className={css.szybkieTytul}>Szybkie porównanie: ile co miesiąc?</h2>
      <p className={css.mala}>Wpisz pensję, a od razu zobaczysz miesięczne wypłaty w obu wariantach zasiłku. Bez dat i bez zakładania konta.</p>
      <div className={css.siatka3}>
        <PoleRodzaju rodzaj={rodzaj} onZmiana={(r) => { setRodzaj(r); setRodzajReczny(true); }} zProfilu={!rodzajReczny && !!profil?.rodzaj} />
        <Pole label={etykietaKwoty(rodzaj)} hint={podpowiedzKwoty(rodzaj)}>
          <input type="number" inputMode="decimal" min={0} placeholder="np. 6500" value={kwota} onChange={(e) => setKwota(e.target.value)} />
        </Pole>
        <Pole label="Liczba dzieci przy porodzie">
          <select value={dzieci} onChange={(e) => setDzieci(+e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? "1" : n === 2 ? "2 (bliźnięta)" : n === 5 ? "5 lub więcej" : n}</option>)}</select>
        </Pole>
      </div>
      <details className="dl">
        <summary>Znam już podstawę zasiłku (dla zaawansowanych)</summary>
        <p className={css.mala}>Podstawa to kwota po odjęciu składek, od której ZUS liczy zasiłek. Znajdziesz ją w decyzji ZUS albo w druku Z-3 od pracodawcy. Jeśli ją wpiszesz, pole z pensją pomijamy.</p>
        <Pole label="Miesięczna podstawa zasiłku (zł)"><input type="number" inputMode="decimal" min={0} value={podstawa} onChange={(e) => setPodstawa(e.target.value)} /></Pole>
      </details>

      <div role="status" aria-live="polite">
        {blad && <p className={css.mala}>{blad}</p>}
        {wynik && <p className={css.mala}>Podstawa zasiłku: <b>{pln(wynik.podstawaMiesieczna)}</b> miesięcznie.{mnogi && <> {mnogi}</>}</p>}
      </div>
      {wynik && (
        <>
          <div className="tbl-wrap">
            <table className={`tbl ${css.tabelaPorownania}`}>
              <caption className="vh">Miesięczne wypłaty zasiłku w dwóch wariantach</caption>
              <thead><tr><th scope="col">Okres</th><th scope="col">Standardowy ({standard})</th><th scope="col">Uśredniony ({usredniony})</th></tr></thead>
              <tbody>
                {wynik.etapy.map((e) => (
                  <tr key={e.etap}>
                    <th scope="row">{NAZWA_ETAPU[e.etap]}<span className={css.dopisekBlok}>{tygodnie(e.tygodnie)}, miesięcznie</span></th>
                    <td><Kwoty brutto={e.standard.brutto} netto={wynik.razemNetto ? e.standard.netto : null} /></td>
                    <td><Kwoty brutto={e.usredniony.brutto} netto={wynik.razemNetto ? e.usredniony.netto : null} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Razem<span className={css.dopisekBlok}>przez {tygodnie(wynik.tygodnieRazem)}</span></th>
                  <td><Kwoty brutto={wynik.razem.standard} netto={wynik.razemNetto?.standard ?? null} /></td>
                  <td><Kwoty brutto={wynik.razem.usredniony} netto={wynik.razemNetto?.usredniony ?? null} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt">
            {lepszy ? <>Łącznie różnica to <b>{pln(Math.abs(wynik.roznicaRazem))}</b> brutto na korzyść wariantu {lepszy}. </> : "Łącznie oba warianty dają tyle samo. "}
            Standardowy daje więcej na początku i mniej później. Uśredniony daje co miesiąc tyle samo. Uśredniony trzeba wybrać we wniosku w ciągu {T.wniosek_pelny_wymiar_81_5_po_porodzie} dni od porodu.
          </p>
          <p className={css.mala}>Liczymy dla mamy, która bierze cały urlop macierzyński i swoją część rodzicielskiego. {tygodnie(niezbywalne)} rodzicielskiego zostaje dla drugiego rodzica. {OPIS_NETTO}</p>
        </>
      )}
      <p className="mt">
        <button type="button" className="btn btn-secondary" onClick={() => onPelny({ rodzaj, kwota, podstawa, dzieci })}>
          {wynik ? "Policz dokładnie z datami i podziałem urlopu" : "Przejdź do pełnego kalkulatora"}
        </button>
      </p>
    </section>
  );
}
