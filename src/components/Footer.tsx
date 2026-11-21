import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer zus-footer" role="contentinfo">
      <div className="container footer__cols">
        <nav aria-label="Strony zus.pl">
          <ul className="footer__links">
            <li><a href="https://www.zus.pl/" target="_blank" rel="noreferrer">Strona główna ZUS</a></li>
            <li><a href="https://www.zus.pl/swiadczenia" target="_blank" rel="noreferrer">Świadczenia</a></li>
            <li><a href="https://www.zus.pl/wzory-formularzy" target="_blank" rel="noreferrer">Wzory formularzy</a></li>
            <li><a href="https://www.zus.pl/ezus/logowanie?jezyk=pl" target="_blank" rel="noreferrer">Logowanie do PUE/eZUS</a></li>
          </ul>
        </nav>
        <nav aria-label="Kontakt i dostępność">
          <ul className="footer__links">
            <li><a href="https://www.zus.pl/o-zus/kontakt/centrum-obslugi-telefonicznej-cot-" target="_blank" rel="noreferrer">Centrum Obsługi Telefonicznej</a></li>
            <li><a href="https://www.zus.pl/o-zus/kontakt/obsluga-osob-z-niepelnosprawnosciami" target="_blank" rel="noreferrer">Obsługa osób z niepełnosprawnościami</a></li>
            <li><a href="https://www.zus.pl/dostepnosc/deklaracja-dostepnosci-zus.pl" target="_blank" rel="noreferrer">Deklaracja dostępności zus.pl</a></li>
            <li><a href="https://bip.zus.pl/" target="_blank" rel="noreferrer">Biuletyn Informacji Publicznej</a></li>
          </ul>
        </nav>
        <div className="footer__side">
          {/* Strona „O projekcie" nie miała żadnego linku w serwisie. */}
          <nav aria-label="O serwisie">
            <ul className="footer__links">
              <li><Link href="/o-projekcie">O projekcie i użyciu AI</Link></li>
            </ul>
          </nav>
          <a className="to-top" href="#header">Do góry<span className="to-top__circle" aria-hidden="true" /></a>
          {/* Informacja „to nie ZUS" jest tylko w pasku u góry strony. Tu zostaje uwaga o charakterze wyliczeń. */}
          <p className="footer__note">Wyliczenia są orientacyjne. Wiążącą decyzję wydaje ZUS albo płatnik składek.</p>
        </div>
      </div>
    </footer>
  );
}
