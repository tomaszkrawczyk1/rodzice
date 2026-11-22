import type { Metadata } from "next";
import { connection } from "next/server";
import Kalendarz from "@/components/Kalendarz";
import { getParametry } from "@/lib/params";
import { metadane } from "@/i18n/metadane";

export const generateMetadata = (): Promise<Metadata> => metadane(
  "Kalendarz ciąży i połogu",
  "Sprawdź terminy wizyt i badań w ciąży, po porodzie i w pierwszym roku życia dziecka oraz terminy wniosków do ZUS.",
);

export default async function KalendarzPage() {
  await connection();
  return <Kalendarz parametry={getParametry()} />;
}
