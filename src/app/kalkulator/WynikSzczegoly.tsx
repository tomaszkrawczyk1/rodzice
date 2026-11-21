"use client";
import Link from "next/link";
import parametry from "../../../data/parametry.json";
import { pln, dataPL, RODZAJE, liczba, opisObliczenia } from "@/lib/format";
import Timeline from "@/components/Timeline";
import { Kroki } from "@/components/ui";
import { standard, usredniony } from "./stale";

/**
 * Ciężka część wyniku planu: oś czasu, tabela okresów, porównanie wariantów. Ładowana osobno (next/dynamic),
 * dopiero gdy użytkownik dojdzie do ostatniego kroku. Duża karta z kwotą jest w PlanRodziny, więc nie czeka na ten kod.
 */
export default function WynikSzczegoly({ wyn, por, start, rodzic1, rodzic2 }: {
  wyn: any;
  por: any;
  start: string;
  rodzic1: string;
  rodzic2: string;
}) {
  const rola = (kto: string) => (kto === "matka" ? rodzic1 : rodzic2);
  const zasilki: any[] = wyn.okresy ?? [];
  return (
    <>
      <div className="card"><h3>Oś czasu</h3><Timeline okresy={wyn.okresy} start={start} etykiety={{ matka: rodzic1, ojciec: rodzic2 }} /></div>
      <div className="card"><h3>Okresy i kwoty</h3>
        <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>Rodzaj</th><th>Kto</th><th>Od – do</th><th className="num">Dni</th><th className="num">%</th><th className="num">Kwota</th></tr></thead>
          <tbody>{zasilki.map((o, i) => <tr key={i}><td data-label="Rodzaj">{RODZAJE[o.rodzaj] ?? "Okres zasiłku"}{o.podwyzszoneDoSwiadczeniaRodzicielskiego && <span className="badge warn"> do {pln(parametry.kwoty.swiadczenie_rodzicielskie_miesieczne)}</span>}{o.uwagi && <div className="small muted">{o.uwagi}</div>}</td><td data-label="Kto">{rola(o.kto)}</td>
            <td data-label="Od – do">{dataPL(o.od)} do {dataPL(o.do)}</td><td className="num" data-label="Dni">{o.dni}</td><td className="num" data-label="%">{liczba(o.procent)}{o.wspolczynnikZasilku !== 1 ? ` × ${liczba(o.wspolczynnikZasilku)}` : ""}</td><td className="num" data-label="Kwota">{pln(o.kwota)}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={5}>Razem</td><td className="num" data-label="Razem">{pln(wyn.sumy.razem)}</td></tr></tfoot></table></div>
        <Kroki kroki={wyn.kroki.map(opisObliczenia)} />
      </div>
      {por && <div className="card navy"><h3>Porównanie wariantów</h3>
        <div className="grid g2"><div className="stat"><div className="v">{pln(por.zmienny_100_70.sumy.razem)}</div><div className="l">standardowy {standard}</div></div>
          <div className="stat"><div className="v">{pln(por.usredniony_81_5.sumy.razem)}</div><div className="l">uśredniony {usredniony}</div></div></div>
        <p className="mt">Różnica łącznych kwot: <b>{pln(Math.abs(por.roznicaRazem))}</b>{por.roznicaRazem !== 0 && (por.roznicaRazem > 0 ? " na korzyść wariantu uśrednionego" : " na korzyść wariantu standardowego")}.</p>
        <p className="small muted">Porównaj też wypłaty w poszczególnych okresach. Przy uśrednionej stawce na początku wypłata jest niższa, a na urlopie rodzicielskim może być wyższa.</p></div>}
      <div className="card"><Link href="/dokumenty" className="btn btn-primary">Sprawdź dokumenty i terminy</Link></div>
    </>
  );
}
