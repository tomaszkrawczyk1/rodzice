export default function Footer() {
  return (
    <footer className="footer zus-footer" role="contentinfo">
      <div className="container footer__cols">
        <div>
          <h2 className="footer__h">zus.pl</h2>
          <ul className="footer__links">
            <li><a href="https://www.zus.pl/" target="_blank" rel="noreferrer">Strona główna ZUS</a></li>
            <li><a href="https://www.zus.pl/swiadczenia" target="_blank" rel="noreferrer">Świadczenia</a></li>
            <li><a href="https://www.zus.pl/wzory-formularzy" target="_blank" rel="noreferrer">Wzory formularzy</a></li>
            <li><a href="https://www.zus.pl/ezus/logowanie?jezyk=pl" target="_blank" rel="noreferrer">Logowanie do PUE/eZUS</a></li>
          </ul>
        </div>
        <div>
          <h2 className="footer__h">Kontakt i dostępność</h2>
          <ul className="footer__links">
            <li><a href="https://www.zus.pl/o-zus/kontakt/centrum-obslugi-telefonicznej-cot-" target="_blank" rel="noreferrer">Centrum Obsługi Telefonicznej</a></li>
            <li><a href="https://www.zus.pl/o-zus/kontakt/obsluga-osob-z-niepelnosprawnosciami" target="_blank" rel="noreferrer">Obsługa osób z niepełnosprawnościami</a></li>
            <li><a href="https://www.zus.pl/dostepnosc/deklaracja-dostepnosci-zus.pl" target="_blank" rel="noreferrer">Deklaracja dostępności zus.pl</a></li>
            <li><a href="https://bip.zus.pl/" target="_blank" rel="noreferrer">Biuletyn Informacji Publicznej</a></li>
          </ul>
        </div>
        <div className="footer__side">
          <a className="to-top" href="#header"><span aria-hidden="true">↑ </span>Do góry</a>
          <p className="footer__note">Przewodnik Przyszłego Rodzica to prototyp. Wyliczenia są orientacyjne. Wiążącą decyzję wydaje ZUS albo płatnik składek.</p>
        </div>
      </div>
    </footer>
  );
}
