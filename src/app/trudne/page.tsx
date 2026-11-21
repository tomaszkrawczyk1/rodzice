import Trudne from "./Trudne";

// Odczyt searchParams włącza renderowanie na żądanie: strona od razu zawiera wybraną sytuację (`?sytuacja=…`).
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await searchParams;
  return <Trudne />;
}
