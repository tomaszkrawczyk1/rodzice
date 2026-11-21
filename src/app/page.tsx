import Glowna from "./Glowna";

// Odczyt searchParams włącza renderowanie na żądanie: adres z `?etap=…` lub `?q=…` daje od razu właściwy ekran w HTML
// (bez migania wyboru etapu), a komponent kliencki czyta te same parametry przez useSearchParams.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await searchParams;
  return <Glowna />;
}
