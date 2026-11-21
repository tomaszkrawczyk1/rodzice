import Pytania from "./Pytania";

// Strona renderuje się na serwerze przy każdym żądaniu (czytamy searchParams), więc pierwsze pytanie
// albo zapisany krok (`?krok=…`, `?sciezka=ojciec`) jest już w HTML, bez ekranu „Wczytujemy pytania…".
// Kolejne kroki zmieniają tylko adres po stronie przeglądarki (history.pushState), bez zapytań do serwera.
export default async function Kreator({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await searchParams;
  return (
    <>
      <h1>Kreator spraw</h1>
      <p className="lead">Odpowiedz na kilka pytań, żeby znaleźć potrzebne informacje i formularze.</p>
      <Pytania />
    </>
  );
}
