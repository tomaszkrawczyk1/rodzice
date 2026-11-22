import { metadane } from "@/i18n/metadane";
import { kanoniczny } from "@/lib/adres-serwisu";

// Kanoniczny adres tej treści: warianty z parametrem (?sytuacja=…) wskazują na /trudne.
export const generateMetadata = () => metadane(
  "Pomoc w trudnej sytuacji",
  "Wsparcie i wskazówki, gdy ciąża lub poród przebiegają trudno: strata dziecka, wcześniactwo, śmierć rodzica.",
  { alternates: { canonical: kanoniczny("/trudne") } },
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
