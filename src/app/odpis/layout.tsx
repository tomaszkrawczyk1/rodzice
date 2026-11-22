import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Odpis aktu urodzenia",
  "Jak zamówić odpis aktu urodzenia dziecka i do czego jest potrzebny w sprawach z ZUS."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
