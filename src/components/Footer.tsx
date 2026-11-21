import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer__grid">
        <div className="footer__note">
          <p><b>Przewodnik Przyszłego Rodzica</b> – prototyp wykonany w ramach HackNation 2026 (zadanie ZUS). To nie jest oficjalna usługa ZUS ani porada prawna.
            Wyliczenia mają charakter orientacyjny; wiążące decyzje wydaje ZUS lub płatnik składek.</p>
          <p>Oficjalne informacje: <a href="https://www.zus.pl" target="_blank" rel="noreferrer">zus.pl</a> · <a href="https://www.gov.pl/web/rodzina/urlop-rodzicielski" target="_blank" rel="noreferrer">gov.pl – urlop rodzicielski</a> ·{" "}
            <a href="https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo" target="_blank" rel="noreferrer">PIP – rodzicielstwo</a></p>
        </div>
        <ul className="footer__links">
          <li><Link href="/kreator">Kreator</Link></li>
          <li><Link href="/ryzyka">Ryzyka</Link></li>
          <li><Link href="/trudne">Trudne sytuacje</Link></li>
          <li><Link href="/dokumenty">Dokumenty i terminy</Link></li>
          <li><Link href="/o-projekcie">O projekcie i użyciu AI</Link></li>
          <li><Link href="/odpis">Odpis aktu urodzenia</Link></li>
          <li><Link href="/admin">Panel administratora</Link></li>
        </ul>
        <a className="to-top" href="#header"><span aria-hidden="true">↑ </span>Do góry</a>
      </div>
    </footer>
  );
}
