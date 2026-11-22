import Kalkulator from "./Kalkulator";
import { tZSerwera } from "@/i18n/serwer";

// Tytuł i opis strony są w layout.tsx tej trasy.
// Odczyt searchParams robi z trasy stronę dynamiczną: treść bieżącego kroku (?tryb=…&krok=…) jest renderowana na serwerze
// i trafia do HTML, a useSearchParams w kliencie nie wymaga Suspense z pustym fallbackiem.
// Dalej adres jest stanem widoku po stronie klienta (history.pushState: krok = wpis historii), więc propsa nie przekazujemy.
export default async function Page({ searchParams }: { searchParams: Promise<{ [klucz: string]: string | string[] | undefined }> }) {
  await searchParams;
  const t = await tZSerwera();
  return (
    <>
      <h1>{t("Kalkulator zasiłku macierzyńskiego")}</h1>
      <p className="lead">{t("Odpowiedz na kilka pytań, a pokażemy szacunkową kwotę zasiłku i podział urlopów. Zasiłek pokazujemy przed zaliczką na podatek.")}</p>
      <Kalkulator />
    </>
  );
}
