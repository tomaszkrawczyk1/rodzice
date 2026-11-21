import Link from "next/link";
import { SPRAWY } from "@/lib/sprawy";
import Szukaj from "@/components/Szukaj";

export const metadata = { title: "Wszystkie sprawy – Przewodnik Przyszłego Rodzica" };

export default function Sprawy() {
  return (
    <>
      <h1>Co chcesz załatwić?</h1>
      <p className="lead">Wybierz sprawę. Zadamy kilka prostych pytań i powiemy, co zrobić krok po kroku.</p>
      <div className="grid g3">
        {SPRAWY.map((s) => <Link key={s.id} href={`/sprawa/${s.id}`} className="tile"><span className={`ic ic-${s.id}`} aria-hidden="true">{s.ikona}</span><b>{s.tytul}</b><span>{s.krotko}</span><span className="time"><span className="ico-czas" aria-hidden="true" />{s.czas}</span></Link>)}
      </div>
      <Szukaj />
      <h2 className="mt">Dla bardziej zaawansowanych</h2>
      <div className="linkbars">
        <Link href="/kalkulator" className="linkbar" title="Wszystkie ustawienia urlopów, oś czasu, porównanie wariantów">Pełny kalkulator</Link>
        <Link href="/poradnik" className="linkbar" title="28 pytań z odpowiedziami i krokami">Poradnik</Link>
        <Link href="/wgraj" className="linkbar" title="Odczytaj dane ze skanu ZAM / Z-3">Wgraj wniosek (AI)</Link>
        <Link href="/ryzyka" className="linkbar" title="Co może pozbawić zasiłku, ochrona przed zwolnieniem">Ryzyka i ochrona</Link>
        <Link href="/dokumenty" className="linkbar" title="Kto wypłaca, jaki druk i do kiedy">Dokumenty i terminy</Link>
        <Link href="/kreator" className="linkbar" title="Drzewko decyzyjne z odpowiedziami poradnika">Kreator „co mnie dotyczy?”</Link>
      </div>
    </>
  );
}
