import Link from "next/link";
import { SPRAWY } from "@/lib/sprawy";
import Szukaj from "@/components/Szukaj";
import { tZSerwera } from "@/i18n/serwer";

export async function generateMetadata() {
  const t = await tZSerwera();
  return { title: t("Wszystkie sprawy – Przewodnik Przyszłego Rodzica") };
}

export default async function Sprawy() {
  const t = await tZSerwera();
  return (
    <>
      <h1>{t("Co chcesz załatwić?")}</h1>
      <p className="lead">{t("Wybierz sprawę. Zadamy kilka prostych pytań i powiemy, co zrobić krok po kroku.")}</p>
      <div className="grid g3">
        {SPRAWY.flatMap((s, i) => [
          ...(i === 8 ? [<Link key="terminarz" href="/terminarz" className="tile"><span className="ic ic-terminy" aria-hidden="true">🗓️</span><b>{t("Nie przegapić terminów")}</b><span>{t("Oś terminów od daty porodu: co złożyć, gdzie i do kiedy. Plik do kalendarza w telefonie.")}</span><span className="time"><span className="ico-czas" aria-hidden="true" />{t("4 pola · 1 min")}</span></Link>] : []),
          <Link key={s.id} href={`/sprawa/${s.id}`} className="tile"><span className={`ic ic-${s.id}`} aria-hidden="true">{s.ikona}</span><b>{t(s.tytul)}</b><span>{t(s.krotko)}</span><span className="time"><span className="ico-czas" aria-hidden="true" />{t(s.czas)}</span></Link>,
        ])}
      </div>
      <Szukaj />
      <h2 className="mt">{t("Dla bardziej zaawansowanych")}</h2>
      <div className="linkbars">
        <Link href="/kalkulator" className="linkbar" title={t("Wszystkie ustawienia urlopów, oś czasu, porównanie wariantów")}>{t("Pełny kalkulator")}</Link>
        <Link href="/poradnik" className="linkbar" title={t("28 pytań z odpowiedziami i krokami")}>{t("Poradnik")}</Link>
        <Link href="/wgraj" className="linkbar" title={t("Odczytaj dane ze skanu ZAM / Z-3")}>{t("Wgraj wniosek (AI)")}</Link>
        <Link href="/ryzyka" className="linkbar" title={t("Co może pozbawić zasiłku, ochrona przed zwolnieniem")}>{t("Ryzyka i ochrona")}</Link>
        <Link href="/dokumenty" className="linkbar" title={t("Kto wypłaca, jaki druk i do kiedy")}>{t("Dokumenty i terminy")}</Link>
        <Link href="/kreator" className="linkbar" title={t("Drzewko decyzyjne z odpowiedziami poradnika")}>{t("Kreator „co mnie dotyczy?”")}</Link>
      </div>
    </>
  );
}
