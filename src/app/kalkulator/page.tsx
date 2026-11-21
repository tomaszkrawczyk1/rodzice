import Kalkulator from "./Kalkulator";

// Tytuł i opis strony są w layout.tsx tej trasy.
// Strona jest renderowana na serwerze (adres ?tryb=… czytamy z propsa), więc cała treść kroku 1 trafia do HTML.
// Wcześniej useSearchParams w kliencie powodował, że w HTML zostawał sam nagłówek.
export default async function Page({ searchParams }: { searchParams: Promise<{ [klucz: string]: string | string[] | undefined }> }) {
  const { tryb } = await searchParams;
  return (
    <>
      <h1>Kalkulator zasiłku macierzyńskiego</h1>
      <p className="lead">Odpowiedz na kilka pytań, a pokażemy szacunkową kwotę zasiłku i podział urlopów. Zasiłek pokazujemy przed zaliczką na podatek.</p>
      <Kalkulator key={String(tryb ?? "")} tryb={Array.isArray(tryb) ? tryb[0] : tryb} />
    </>
  );
}
