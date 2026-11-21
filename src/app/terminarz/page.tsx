import { connection } from "next/server";
import { getParametry } from "@/lib/params";
import Terminarz from "./Terminarz";

// Metadane (tytuł strony) są w layout.tsx tej trasy. Parametry czytamy po stronie serwera tym samym
// mechanizmem co /kalendarz (data/parametry.json, panel admina), a daty i tak liczy w przeglądarce buildCalendar.
export default async function TerminarzPage() {
  await connection();
  return <Terminarz parametry={getParametry()} />;
}
