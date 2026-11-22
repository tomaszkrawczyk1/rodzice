import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Polityka prywatności – Przewodnik Przyszłego Rodzica",
  description: "Jakie dane zbiera Przewodnik Przyszłego Rodzica, gdzie są przetwarzane i jak je usunąć.",
};

export default function Prywatnosc() {
  return (
    <div style={{ maxWidth: 820 }}>
      <h1>Polityka prywatności</h1>
      <p className="lead">W skrócie: nie prosimy o konto, nie śledzimy Cię i nie wysyłamy Twoich danych do firm zewnętrznych. To wersja demonstracyjna z hackathonu HackNation 2026 – działa na danych fikcyjnych.</p>

      <div className="card accent"><h2>Najważniejsze: nie wgrywaj prawdziwych dokumentów</h2>
        <p>To prototyp, a nie usługa ZUS. <b>Nie wgrywaj prawdziwych zaświadczeń ani wniosków z PESEL-em, adresem czy danymi o zarobkach.</b> Do sprawdzenia działania użyj przykładowych plików dostępnych na stronie „Odczyt ze skanu (przykłady)”.</p></div>

      <div className="card mt"><h2>Jakie dane trafiają do serwisu</h2>
        <ul className="clean">
          <li><b>To, co wpiszesz w formularze</b> (np. daty, kwoty wynagrodzenia, liczba dzieci). Służy tylko do policzenia wyniku.</li>
          <li><b>Plik, który wgrasz</b> w „Odczyt ze skanu (przykłady)” (PDF, JPG, PNG). Służy tylko do odczytania pól.</li>
          <li><b>Symulowane logowanie</b> otwiera fikcyjny profil testowy. Nie łączymy się z prawdziwym mObywatelem, ZUS, PUE/eZUS ani rejestrem stanu cywilnego.</li>
        </ul></div>

      <div className="card mt"><h2>Gdzie są przetwarzane</h2>
        <ul className="clean">
          <li><b>Obliczenia</b> wykonuje serwer tej aplikacji. Wynik wraca do Twojej przeglądarki. Serwer go nie zapisuje.</li>
          <li><b>Odczyt pliku</b> też odbywa się na serwerze tej aplikacji – lokalnymi bibliotekami (mupdf i tesseract.js), bez sztucznej inteligencji i bez zewnętrznych usług. Plik nie jest zapisywany na dysku. Po odczycie zostaje odrzucony.</li>
          <li><b>Nie przekazujemy danych</b> firmom zewnętrznym, reklamodawcom ani ZUS.</li>
        </ul></div>

      <div className="card mt"><h2>Co zostaje w Twojej przeglądarce</h2>
        <p>Część ustawień zapisujemy w pamięci Twojej przeglądarki (localStorage), żeby nie trzeba było wpisywać ich od nowa. Te dane nie są wysyłane na serwer same z siebie i widzisz je tylko Ty, na tym urządzeniu:</p>
        <ul className="clean">
          <li>ustawienia dostępności (wielkość tekstu, wysoki kontrast),</li>
          <li>informacja o symulowanym logowaniu (fikcyjny profil),</li>
          <li>ostatni plan z kalkulatora i postęp w sprawach,</li>
          <li>wpisy w terminarzu i kalendarzu.</li>
        </ul>
        <p><b>Jak to usunąć:</b> wyloguj się z profilu testowego albo wyczyść dane witryny w ustawieniach przeglądarki.</p></div>

      <div className="card mt"><h2>Cookies i śledzenie</h2>
        <p>Nie używamy cookies śledzących, reklam ani narzędzi analitycznych. Dlatego nie pokazujemy baneru zgody na cookies. Czcionki są wczytywane z serwera tej aplikacji.</p></div>

      <div className="card mt"><h2>Kontakt</h2>
        <p>Serwis zbudował zespół HackTribe (HackNation 2026). Pytania i zgłoszenia błędów: <a href="https://github.com/tomaszkrawczyk1/rodzice/issues" target="_blank" rel="noreferrer">zgłoszenia w repozytorium na GitHubie</a>. Więcej w zakładce <Link href="/o-projekcie">O projekcie</Link>.</p>
        <p>W prawdziwych sprawach dotyczących zasiłków skontaktuj się z ZUS: <a href="tel:+48225601600">22 560 16 00</a> albo <a href="https://www.zus.pl/" target="_blank" rel="noreferrer">zus.pl</a>.</p></div>
    </div>
  );
}
