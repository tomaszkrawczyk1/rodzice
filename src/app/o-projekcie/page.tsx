import Link from "next/link";
import { tZSerwera } from "@/i18n/serwer";

export default async function OProjekcie() {
  const t = await tZSerwera();
  return (
    <div style={{ maxWidth: 820 }}>
      <h1>{t("O projekcie")}</h1>
      <p className="lead">{t("Przewodnik Przyszłego Rodzica powstał podczas hackathonu HackNation 2026 jako odpowiedź na zadanie Zakładu Ubezpieczeń Społecznych.")}</p>
      <div className="card"><h2>Dla kogo jest ten serwis</h2>
        <p>Dla osób w ciąży i rodziców po porodzie, którzy chcą sprawdzić, jakie zasiłki i urlopy im przysługują, ile mogą dostać i co złożyć. Serwis jest <b>bezpłatny</b> i nie wymaga zakładania konta.</p>
        <p>To <b>nieoficjalny, niezależny prototyp</b>. Nie jest usługą ZUS i nie jest z ZUS powiązany. Logowanie, PUE/eZUS i wysyłka wniosków są tylko symulowane, a dane w aplikacji są fikcyjne.</p></div>
      <div className="card accent mt"><h2>{t("Gdzie używamy sztucznej inteligencji")}</h2>
        <ul className="clean"><li><b>Odczyt wniosków (ZAM, Z-3, Z-3a) ze skanów NIE używa AI.</b> Tekst odczytujemy na serwerze aplikacji: z warstwy tekstowej PDF (biblioteka mupdf) albo przez rozpoznawanie znaków ze skanu (tesseract.js, język polski). Pola wyszukują zwykłe reguły w kodzie. Plik nie trafia do żadnej zewnętrznej usługi i nie jest zapisywany. Wynik zawsze potwierdzasz sam, a dane przechodzą walidację w kodzie (PESEL, daty, spójność okresów).</li>
          <li><b>{t("Silnik obliczeń NIE używa AI.")}</b> {t("Kwoty i okresy liczy deterministyczny kod z parametrami z przepisów (76 testów jednostkowych). Dzięki temu wynik jest powtarzalny i możliwy do sprawdzenia – każdy wynik pokazuje kroki i podstawę prawną.")}</li>
          <li>Przy tworzeniu aplikacji używano asystenta AI do pisania kodu.</li></ul></div>
      <div className="card mt"><h2>{t("Źródła i ograniczenia")}</h2>
        <p>Podstawa: ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa, Kodeks pracy, rozporządzenia, Poradnik ZUS 2026 oraz załącznik ZUS z tabelami wymiarów i wysokości. Stawki, wymiary i terminy są zapisane w jednym pliku konfiguracyjnym, więc łatwo je zaktualizować.</p>
        <p>Wyliczenia są orientacyjne – przed zaliczką na podatek. Integracje z mObywatelem, ZUS, PUE i rejestrem stanu cywilnego są <b>{t("symulowane")}</b>{t(", a dane w aplikacji są fikcyjne.")}</p>
        <p><b>Uczciwie:</b> treści nie były sprawdzane przez prawnika ani przez ZUS. Mogą zawierać błędy. Nie zastępują porady prawnej ani decyzji ZUS czy pracodawcy. W razie wątpliwości zadzwoń do ZUS: <a href="tel:+48225601600">22 560 16 00</a>.</p></div>
      <div className="card mt"><h2>Kto to zrobił</h2>
        <p>Serwis zbudował zespół <b>HackTribe</b> w czasie hackathonu HackNation 2026, w ramach wyzwania ZUS „Zasiłkowy Przewodnik Przyszłego Rodzica”.</p>
        <p>Kod jest otwarty. Jeśli znajdziesz błąd albo coś jest niejasne, napisz do nas przez <a href="https://github.com/tomaszkrawczyk1/rodzice/issues" target="_blank" rel="noreferrer">zgłoszenia w repozytorium na GitHubie</a> (<a href="https://github.com/tomaszkrawczyk1/rodzice" target="_blank" rel="noreferrer">github.com/tomaszkrawczyk1/rodzice</a>).</p>
        <p>Jak traktujemy Twoje dane, opisujemy w <Link href="/prywatnosc">Polityce prywatności</Link>.</p></div>
    </div>
  );
}
