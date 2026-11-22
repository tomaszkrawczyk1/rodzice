import type { Metadata } from "next";
import Link from "next/link";
import { tZSerwera } from "@/i18n/serwer";
import { pogrubienia } from "@/i18n/bogaty";
import { metadane } from "@/i18n/metadane";

export const generateMetadata = (): Promise<Metadata> => metadane(
  "Polityka prywatności",
  "Jakie dane zbiera Przewodnik Przyszłego Rodzica, gdzie są przetwarzane i jak je usunąć.",
);

export default async function Prywatnosc() {
  const t = await tZSerwera();
  const tb = (pl: string) => pogrubienia(t(pl));
  return (
    <div style={{ maxWidth: 820 }}>
      <h1>{t("Polityka prywatności")}</h1>
      <p className="lead">{t("W skrócie: nie prosimy o konto, nie śledzimy Cię i nie wysyłamy Twoich danych do firm zewnętrznych. To wersja demonstracyjna z hackathonu HackNation 2026 – działa na danych fikcyjnych.")}</p>

      <div className="card accent"><h2>{t("Najważniejsze: nie wgrywaj prawdziwych dokumentów")}</h2>
        <p>{tb("To prototyp, a nie usługa ZUS. **Nie wgrywaj prawdziwych zaświadczeń ani wniosków z PESEL-em, adresem czy danymi o zarobkach.** Do sprawdzenia działania użyj przykładowych plików dostępnych na stronie „Odczyt ze skanu (przykłady)”.")}</p></div>

      <div className="card mt"><h2>{t("Jakie dane trafiają do serwisu")}</h2>
        <ul className="clean">
          <li>{tb("**To, co wpiszesz w formularze** (np. daty, kwoty wynagrodzenia, liczba dzieci). Służy tylko do policzenia wyniku.")}</li>
          <li>{tb("**Plik, który wgrasz** w „Odczyt ze skanu (przykłady)” (PDF, JPG, PNG). Służy tylko do odczytania pól.")}</li>
          <li>{tb("**Symulowane logowanie** otwiera fikcyjny profil testowy. Nie łączymy się z prawdziwym mObywatelem, ZUS, PUE/eZUS ani rejestrem stanu cywilnego.")}</li>
        </ul></div>

      <div className="card mt"><h2>{t("Gdzie są przetwarzane")}</h2>
        <ul className="clean">
          <li>{tb("**Obliczenia** wykonuje serwer tej aplikacji. Wynik wraca do Twojej przeglądarki. Serwer go nie zapisuje.")}</li>
          <li>{tb("**Odczyt pliku** też odbywa się na serwerze tej aplikacji – lokalnymi bibliotekami (mupdf i tesseract.js), bez sztucznej inteligencji i bez zewnętrznych usług. Plik nie jest zapisywany na dysku. Po odczycie zostaje odrzucony.")}</li>
          <li>{tb("**Nie przekazujemy danych** firmom zewnętrznym, reklamodawcom ani ZUS.")}</li>
        </ul></div>

      <div className="card mt"><h2>{t("Co zostaje w Twojej przeglądarce")}</h2>
        <p>{t("Część ustawień zapisujemy w pamięci Twojej przeglądarki (localStorage), żeby nie trzeba było wpisywać ich od nowa. Te dane nie są wysyłane na serwer same z siebie i widzisz je tylko Ty, na tym urządzeniu:")}</p>
        <ul className="clean">
          <li>{t("ustawienia dostępności (wielkość tekstu, wysoki kontrast),")}</li>
          <li>{t("informacja o symulowanym logowaniu (fikcyjny profil),")}</li>
          <li>{t("ostatni plan z kalkulatora i postęp w sprawach,")}</li>
          <li>{t("wpisy w terminarzu i kalendarzu.")}</li>
        </ul>
        <p>{tb("**Jak to usunąć:** wyloguj się z profilu testowego albo wyczyść dane witryny w ustawieniach przeglądarki.")}</p></div>

      <div className="card mt"><h2>{t("Cookies i śledzenie")}</h2>
        <p>{t("Nie używamy cookies śledzących, reklam ani narzędzi analitycznych. Dlatego nie pokazujemy baneru zgody na cookies. Czcionki są wczytywane z serwera tej aplikacji.")}</p></div>

      <div className="card mt"><h2>{t("Kontakt")}</h2>
        <p>{t("Serwis zbudował zespół HackTribe (HackNation 2026). Pytania i zgłoszenia błędów:")} <a href="https://github.com/tomaszkrawczyk1/rodzice/issues" target="_blank" rel="noreferrer">{t("zgłoszenia w repozytorium na GitHubie")}</a>. {t("Więcej w zakładce")} <Link href="/o-projekcie">{t("O projekcie")}</Link>.</p>
        <p>{t("W prawdziwych sprawach dotyczących zasiłków skontaktuj się z ZUS:")} <a href="tel:+48225601600">22 560 16 00</a> {t("albo")} <a href="https://www.zus.pl/" target="_blank" rel="noreferrer">zus.pl</a>.</p></div>
    </div>
  );
}
