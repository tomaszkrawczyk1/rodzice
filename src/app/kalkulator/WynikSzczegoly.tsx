"use client";
import Link from "next/link";
import parametry from "../../../data/parametry.json";
import { RODZAJE } from "@/lib/format";
import { useFormaty, useT } from "@/lib/jezyk";
import Timeline from "@/components/Timeline";
import { Kroki } from "@/components/ui";
import { Wstaw } from "@/components/Wstaw";
import { standard, usredniony } from "./stale";
import { OPIS_NETTO } from "./zarobki";
import css from "./kalkulator.module.css";

function Kwoty({ brutto, netto }: { brutto: number; netto?: number | null }) {
  const { pln } = useFormaty();
  return (
    <>
      <span className={css.kwotaBrutto}>{pln(brutto)} <span className={css.dopisek}>brutto</span></span>
      {netto != null && <span className={css.kwotaNetto}>{pln(netto)} <span className={css.dopisek}>na rękę (szacunkowo)</span></span>}
    </>
  );
}

/**
 * Ciężka część wyniku planu: oś czasu, porównanie wariantów miesiąc po miesiącu, tabela okresów. Ładowana osobno (next/dynamic),
 * dopiero gdy użytkownik dojdzie do ostatniego kroku. Duża karta z kwotą jest w PlanRodziny, więc nie czeka na ten kod.
 * Kwoty „na rękę" (miesiecznieNetto, kwotaNetto, sumyNetto) przychodzą z API jako orientacyjny szacunek.
 */
export default function WynikSzczegoly({ wyn, por, start, rodzic1, rodzic2 }: {
  wyn: any;
  por: any;
  start: string;
  rodzic1: string;
  rodzic2: string;
}) {
  const { pln, dataPL, liczba, opisObliczenia } = useFormaty();
  const t = useT();
  const rola = (kto: string) => (kto === "matka" ? rodzic1 : rodzic2);
  const zasilki: any[] = wyn.okresy ?? [];
  const sNetto = !!wyn.sumyNetto;
  const a: any[] = por?.zmienny_100_70?.okresy ?? [];
  const b: any[] = por?.usredniony_81_5?.okresy ?? [];
  // Oba warianty mają te same okresy w tej samej kolejności (różnią się tylko stawką), więc łączymy je po indeksie.
  const miesiecznie = a.length === b.length ? a.map((o, i) => ({ o, u: b[i] })) : [];
  return (
    <>
      <div className="card"><h3>{t("Oś czasu")}</h3><Timeline okresy={wyn.okresy} start={start} etykiety={{ matka: rodzic1, ojciec: rodzic2 }} /></div>

      {por && miesiecznie.length > 0 && <div className="card navy"><h3>Ile co miesiąc: porównanie wariantów</h3>
        <p className={css.mala}>Kwota za pełny miesiąc (30 dni) w każdym okresie. Za krótszy okres wypłata jest proporcjonalnie mniejsza.</p>
        <div className="tbl-wrap"><table className={`tbl ${css.tabelaPorownania}`}>
          <caption className="vh">Miesięczne wypłaty w wariancie standardowym i uśrednionym</caption>
          <thead><tr><th scope="col">Okres</th><th scope="col">Standardowy ({standard(liczba)})</th><th scope="col">Uśredniony ({usredniony(liczba)})</th></tr></thead>
          <tbody>{miesiecznie.map(({ o, u }, i) => (
            <tr key={i}>
              <th scope="row">{RODZAJE[o.rodzaj] ?? "Okres zasiłku"}<span className={css.dopisekBlok}>{rola(o.kto)}, {dataPL(o.od)} – {dataPL(o.do)}</span></th>
              <td><Kwoty brutto={o.miesiecznieBrutto} netto={o.miesiecznieNetto} /></td>
              <td><Kwoty brutto={u.miesiecznieBrutto} netto={u.miesiecznieNetto} /></td>
            </tr>
          ))}</tbody>
          <tfoot><tr><th scope="row">Razem za cały czas</th>
            <td><Kwoty brutto={por.zmienny_100_70.sumy.razem} netto={por.zmienny_100_70.sumyNetto?.razem} /></td>
            <td><Kwoty brutto={por.usredniony_81_5.sumy.razem} netto={por.usredniony_81_5.sumyNetto?.razem} /></td>
          </tr></tfoot>
        </table></div>
        <p className="mt">Różnica łącznych kwot: <b>{pln(Math.abs(por.roznicaRazem))}</b> brutto{por.roznicaRazem !== 0 && (por.roznicaRazem > 0 ? " na korzyść wariantu uśrednionego" : " na korzyść wariantu standardowego")}.</p>
        <p className={css.mala}>Przy uśrednionej stawce na początku wypłata jest niższa, a na urlopie rodzicielskim wyższa. {sNetto && OPIS_NETTO}</p>
      </div>}

      <div className="card"><h3>{t("Okresy i kwoty")}</h3>
        <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>{t("Rodzaj")}</th><th>{t("Kto")}</th><th>{t("Od – do")}</th><th className="num">{t("Dni")}</th><th className="num">%</th><th className="num">{t("Kwota brutto")}</th>{sNetto && <th className="num">Na rękę (szacunkowo)</th>}</tr></thead>
          <tbody>{zasilki.map((o, i) => <tr key={i}><td data-label={t("Rodzaj")}>{RODZAJE[o.rodzaj] ?? "Okres zasiłku"}{o.podwyzszoneDoSwiadczeniaRodzicielskiego && <span className="badge warn"> do {pln(parametry.kwoty.swiadczenie_rodzicielskie_miesieczne)}</span>}{o.uwagi && <div className="small muted">{o.uwagi}</div>}</td><td data-label={t("Kto")}>{rola(o.kto)}</td>
            <td data-label={t("Od – do")}>{dataPL(o.od)} do {dataPL(o.do)}</td><td className="num" data-label={t("Dni")}>{o.dni}</td><td className="num" data-label="%">{liczba(o.procent)}{o.wspolczynnikZasilku !== 1 ? ` × ${liczba(o.wspolczynnikZasilku)}` : ""}</td><td className="num" data-label={t("Kwota brutto")}>{pln(o.kwota)}</td>
            {sNetto && <td className="num" data-label="Na rękę (szacunkowo)">{pln(o.kwotaNetto)}</td>}</tr>)}</tbody>
          <tfoot><tr><td colSpan={5}>{t("Razem")}</td><td className="num" data-label="Razem brutto">{pln(wyn.sumy.razem)}</td>{sNetto && <td className="num" data-label="Razem na rękę (szacunkowo)">{pln(wyn.sumyNetto.razem)}</td>}</tr></tfoot></table></div>
        <Kroki kroki={wyn.kroki.map(opisObliczenia)} />
      </div>
      <div className="card"><Link href="/dokumenty" className="btn btn-primary">{t("Sprawdź dokumenty i terminy")}</Link></div>
    </>
  );
}
