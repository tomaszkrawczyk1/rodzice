import Link from "next/link";
import { tZSerwera } from "@/i18n/serwer";

export default async function Footer() {
  const t = await tZSerwera();
  return (
    <footer className="footer zus-footer" role="contentinfo">
      <div className="container footer__cols">
        <nav aria-label={t("Strony zus.pl")}>
          <ul className="footer__links">
            <li><a href="https://www.zus.pl/" target="_blank" rel="noreferrer">{t("Strona główna ZUS")}</a></li>
            <li><a href="https://www.zus.pl/swiadczenia" target="_blank" rel="noreferrer">{t("Świadczenia")}</a></li>
            <li><a href="https://www.zus.pl/wzory-formularzy" target="_blank" rel="noreferrer">{t("Wzory formularzy")}</a></li>
            <li><a href="https://www.zus.pl/ezus/logowanie?jezyk=pl" target="_blank" rel="noreferrer">{t("Logowanie do PUE/eZUS")}</a></li>
          </ul>
        </nav>
        <nav aria-label={t("Kontakt i dostępność")}>
          <ul className="footer__links">
            <li><a href="tel:+48225601600">Infolinia ZUS: 22 560 16 00</a></li>
            <li><a href="https://www.zus.pl/o-zus/kontakt/centrum-obslugi-telefonicznej-cot-" target="_blank" rel="noreferrer">{t("Centrum Obsługi Telefonicznej")}</a></li>
            <li><a href="https://www.zus.pl/o-zus/kontakt/obsluga-osob-z-niepelnosprawnosciami" target="_blank" rel="noreferrer">{t("Obsługa osób z niepełnosprawnościami")}</a></li>
            <li><a href="https://www.zus.pl/dostepnosc/deklaracja-dostepnosci-zus.pl" target="_blank" rel="noreferrer">{t("Deklaracja dostępności zus.pl")}</a></li>
            <li><a href="https://bip.zus.pl/" target="_blank" rel="noreferrer">{t("Biuletyn Informacji Publicznej")}</a></li>
          </ul>
        </nav>
        <div className="footer__side">
          {/* Strona „O projekcie" nie miała żadnego linku w serwisie. */}
          <nav aria-label={t("O serwisie")}>
            <ul className="footer__links">
              <li><Link href="/o-projekcie">{t("O projekcie")}</Link></li>
              <li><Link href="/prywatnosc">{t("Polityka prywatności")}</Link></li>
            </ul>
          </nav>
          <a className="to-top" href="#header">{t("Do góry")}<span className="to-top__circle" aria-hidden="true" /></a>
          <p className="footer__note">{t("Bezpłatny, nieoficjalny projekt hackathonu HackNation 2026. Nie jest usługą ZUS. Wyliczenia są orientacyjne. Wiążącą decyzję wydaje ZUS albo płatnik składek.")}</p>
        </div>
      </div>
    </footer>
  );
}
