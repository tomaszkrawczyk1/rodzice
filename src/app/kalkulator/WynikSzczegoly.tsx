"use client";
import Link from "next/link";
import parametry from "../../../data/parametry.json";
import { RODZAJE } from "@/lib/format";
import { useFormaty, useT } from "@/lib/jezyk";
import Timeline from "@/components/Timeline";
import { Kroki } from "@/components/ui";
import { Wstaw } from "@/components/Wstaw";
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
  const { pln, dataPL, liczba, opisObliczenia } = useFormaty();
  const t = useT();
  const rola = (kto: string) => (kto === "matka" ? rodzic1 : rodzic2);
  const zasilki: any[] = wyn.okresy ?? [];
  const roznica = pln(Math.abs(por?.roznicaRazem ?? 0));
  return (
    <>
      <div className="card"><h3>{t("Oś czasu")}</h3><Timeline okresy={wyn.okresy} start={start} etykiety={{ matka: rodzic1, ojciec: rodzic2 }} /></div>
      <div className="card"><h3>{t("Okresy i kwoty")}</h3>
        <div className="tbl-wrap"><table className="tbl tbl-karty"><thead><tr><th>{t("Rodzaj")}</th><th>{t("Kto")}</th><th>{t("Od – do")}</th><th className="num">{t("Dni")}</th><th className="num">%</th><th className="num">{t("Kwota")}</th></tr></thead>
          <tbody>{zasilki.map((o, i) => <tr key={i}><td data-label={t("Rodzaj")}>{t(RODZAJE[o.rodzaj] ?? "Okres zasiłku")}{o.podwyzszoneDoSwiadczeniaRodzicielskiego && <span className="badge warn"> {t("do")} {pln(parametry.kwoty.swiadczenie_rodzicielskie_miesieczne)}</span>}{o.uwagi && <div className="small muted">{t(o.uwagi)}</div>}</td><td data-label={t("Kto")}>{rola(o.kto)}</td>
            <td data-label={t("Od – do")}>{dataPL(o.od)} {t("do")} {dataPL(o.do)}</td><td className="num" data-label={t("Dni")}>{o.dni}</td><td className="num" data-label="%">{liczba(o.procent)}{o.wspolczynnikZasilku !== 1 ? ` × ${liczba(o.wspolczynnikZasilku)}` : ""}</td><td className="num" data-label={t("Kwota")}>{pln(o.kwota)}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={5}>{t("Razem")}</td><td className="num" data-label={t("Razem")}>{pln(wyn.sumy.razem)}</td></tr></tfoot></table></div>
        <Kroki kroki={wyn.kroki.map(opisObliczenia)} />
      </div>
      {por && <div className="card navy"><h3>{t("Porównanie wariantów")}</h3>
        <div className="grid g2"><div className="stat"><div className="v">{pln(por.zmienny_100_70.sumy.razem)}</div><div className="l">{t("standardowy")} {standard(liczba)}</div></div>
          <div className="stat"><div className="v">{pln(por.usredniony_81_5.sumy.razem)}</div><div className="l">{t("uśredniony")} {usredniony(liczba)}</div></div></div>
        <p className="mt"><Wstaw
          tekst={t(por.roznicaRazem === 0 ? "Różnica łącznych kwot: {kwota}." : por.roznicaRazem > 0 ? "Różnica łącznych kwot: {kwota} na korzyść wariantu uśrednionego." : "Różnica łącznych kwot: {kwota} na korzyść wariantu standardowego.")}
          wartosci={{ kwota: <b>{roznica}</b> }} /></p>
        <p className="small muted">{t("Porównaj też wypłaty w poszczególnych okresach. Przy uśrednionej stawce na początku wypłata jest niższa, a na urlopie rodzicielskim może być wyższa.")}</p></div>}
      <div className="card"><Link href="/dokumenty" className="btn btn-primary">{t("Sprawdź dokumenty i terminy")}</Link></div>
    </>
  );
}
