import Link from "next/link";
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div><b>Przewodnik Przyszłego Rodzica</b> – prototyp wykonany w ramach HackNation 2026 (zadanie ZUS). To nie jest oficjalna usługa ZUS ani porada prawna.
          Wyliczenia mają charakter orientacyjny; wiążące decyzje wydaje ZUS lub płatnik składek.</div>
        <div>Oficjalne informacje: <a href="https://www.zus.pl" target="_blank" rel="noreferrer">zus.pl</a> · <a href="https://www.gov.pl/web/rodzina/urlop-rodzicielski" target="_blank" rel="noreferrer">gov.pl – urlop rodzicielski</a> ·{" "}
          <a href="https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo" target="_blank" rel="noreferrer">PIP – rodzicielstwo</a></div>
        <div><Link href="/kreator">Kreator</Link> · <Link href="/ryzyka">Ryzyka</Link> · <Link href="/trudne">Trudne sytuacje</Link> · <Link href="/dokumenty">Dokumenty i terminy</Link> · <Link href="/o-projekcie">O projekcie i użyciu AI</Link> · <Link href="/odpis">Odpis aktu urodzenia</Link> · <Link href="/admin">Panel administratora</Link></div>
      </div>
    </footer>
  );
}
