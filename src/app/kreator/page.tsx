import Pytania from "./Pytania";
import { tZSerwera } from "@/i18n/serwer";

// Strona renderuje się na serwerze przy każdym żądaniu (czytamy searchParams), więc pierwsze pytanie
// albo zapisany krok (`?krok=…`, `?sciezka=ojciec`) jest już w HTML, bez ekranu „Wczytujemy pytania…".
// Kolejne kroki zmieniają tylko adres po stronie przeglądarki (history.pushState), bez zapytań do serwera.
export default async function Kreator({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await searchParams;
  const t = await tZSerwera();
  return (
    <>
      <h1>{t("Kreator spraw")}</h1>
      <p className="lead">{t("Odpowiedz na kilka pytań, żeby znaleźć potrzebne informacje i formularze.")}</p>
      <Pytania />
    </>
  );
}
