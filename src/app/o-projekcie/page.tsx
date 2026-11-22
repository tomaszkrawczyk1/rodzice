import Link from "next/link";
import { tZSerwera } from "@/i18n/serwer";

export default async function OProjekcie() {
  const t = await tZSerwera();
  return (
    <div style={{ maxWidth: 820 }}>
      <h1>{t("O projekcie")}</h1>
      <p className="lead">{t("Przewodnik Przyszłego Rodzica powstał podczas hackathonu HackNation 2026 jako odpowiedź na zadanie Zakładu Ubezpieczeń Społecznych.")}</p>
      <div className="card accent"><h2>{t("Gdzie używamy sztucznej inteligencji")}</h2>
        <ul className="clean"><li><b>{t("Odczyt wniosków (ZAM, Z-3, Z-3a) ze skanów")}</b> – {t("model językowy z funkcją rozpoznawania obrazu (DeepSeek V4.1 Flash) odczytuje pola dokumentu do ustalonego schematu JSON. Wynik zawsze potwierdza użytkownik, a dane przechodzą walidację w kodzie (PESEL, daty, spójność okresów).")}</li>
          <li><b>{t("Silnik obliczeń NIE używa AI.")}</b> {t("Kwoty i okresy liczy deterministyczny kod z parametrami z przepisów (76 testów jednostkowych). Dzięki temu wynik jest powtarzalny i możliwy do sprawdzenia – każdy wynik pokazuje kroki i podstawę prawną.")}</li>
          <li>{t("Przy tworzeniu aplikacji używano asystenta AI do przygotowania bazy reguł z przepisów (z automatyczną weryfikacją cytatów względem źródeł) oraz do pisania kodu.")}</li></ul></div>
      <div className="card mt"><h2>{t("Źródła i ograniczenia")}</h2>
        <p>{t("Podstawa: ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa, Kodeks pracy, rozporządzenia, Poradnik ZUS 2026 oraz załącznik ZUS z tabelami wymiarów i wysokości. Liczby są w pliku parametrów edytowalnym w")} <Link href="/admin">{t("panelu administratora")}</Link>.</p>
        <p>{t("Wyliczenia są orientacyjne – przed zaliczką na podatek. Nie zastępują decyzji ZUS ani porady prawnej. Integracje z mObywatelem, ZUS, PUE i rejestrem stanu cywilnego są")} <b>{t("symulowane")}</b>{t(", a dane w aplikacji są fikcyjne.")}</p></div>
    </div>
  );
}
