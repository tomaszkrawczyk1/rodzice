import Link from "next/link";
import { SPRAWY } from "@/lib/sprawy";
import Szukaj from "@/components/Szukaj";

export const metadata = { title: "Sprawy krok po kroku – Przewodnik Przyszłego Rodzica" };

export default function Sprawy() {
  return (
    <>
      <h1>Co chcesz załatwić?</h1>
      <p className="lead">Wybierz sprawę. Zadamy kilka prostych pytań i powiemy, co zrobić krok po kroku.</p>
      <div className="grid g3">
        {SPRAWY.flatMap((s, i) => [
          ...(i === 8 ? [<Link key="terminarz" href="/terminarz" className="tile"><span className="ic ic-terminy" aria-hidden="true">🗓️</span><b>Terminy w urzędach</b><span>Co złożyć w ZUS, u pracodawcy i w gminie, i do kiedy. Plik do kalendarza w telefonie.</span><span className="time"><span className="ico-czas" aria-hidden="true" />4 pola · 1 min</span></Link>] : []),
          <Link key={s.id} href={`/sprawa/${s.id}`} className="tile"><span className={`ic ic-${s.id}`} aria-hidden="true">{s.ikona}</span><b>{s.tytul}</b><span>{s.krotko}</span><span className="time"><span className="ico-czas" aria-hidden="true" />{s.czas}</span></Link>,
        ])}
      </div>
      <Szukaj />
      <h2 className="mt">Inne narzędzia</h2>
      <div className="linkbars">
        <Link href="/kalkulator" className="linkbar" title="Wszystkie ustawienia urlopów, oś czasu, porównanie wariantów">Kalkulator zasiłku</Link>
        <Link href="/poradnik" className="linkbar" title="Odpowiedzi na częste pytania z krokami">Pomoc / FAQ</Link>
        <Link href="/wgraj" className="linkbar" title="Pokaz odczytu danych z przykładowego skanu ZAM / Z-3">Odczyt ze skanu (przykłady)</Link>
        <Link href="/ryzyka" className="linkbar" title="Co może pozbawić zasiłku, ochrona przed zwolnieniem">Ochrona w pracy</Link>
        <Link href="/dokumenty" className="linkbar" title="ZUS czy pracodawca, gdzie złożyć wniosek">Kto wypłaca zasiłek</Link>
        <Link href="/kreator" className="linkbar" title="Kilka pytań o Twoją sytuację, potem lista tematów">Co mnie dotyczy?</Link>
      </div>
    </>
  );
}
