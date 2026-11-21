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
        {SPRAWY.map((s) => <Link key={s.id} href={`/sprawa/${s.id}`} className="tile"><span className="ic">{s.ikona}</span><b>{s.tytul}</b><span>{s.krotko}</span><span className="time">⏱ {s.czas}</span></Link>)}
      </div>
      <Szukaj />
      <h2 className="mt">Dla bardziej zaawansowanych</h2>
      <div className="grid g3">
        <Link href="/kalkulator" className="tile"><b>Pełny kalkulator</b><span>Wszystkie ustawienia urlopów, oś czasu, porównanie wariantów.</span></Link>
        <Link href="/poradnik" className="tile"><b>Poradnik</b><span>28 pytań z odpowiedziami i krokami.</span></Link>
        <Link href="/wgraj" className="tile"><b>Wgraj wniosek (AI)</b><span>Odczytaj dane ze skanu ZAM / Z-3.</span></Link>
        <Link href="/ryzyka" className="tile"><b>Ryzyka i ochrona</b><span>Co może pozbawić zasiłku, ochrona przed zwolnieniem.</span></Link>
        <Link href="/dokumenty" className="tile"><b>Dokumenty i terminy</b><span>Kto wypłaca, jaki druk i do kiedy.</span></Link>
        <Link href="/kreator" className="tile"><b>Kreator „co mnie dotyczy?”</b><span>Drzewko decyzyjne z odpowiedziami poradnika.</span></Link>
      </div>
    </>
  );
}
