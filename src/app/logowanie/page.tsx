import Logowanie from "./Logowanie";

// Odczyt searchParams włącza renderowanie na żądanie: krok „potwierdź wybór" (`?profil=…`) działa po odświeżeniu i z linku.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await searchParams;
  return <Logowanie />;
}
