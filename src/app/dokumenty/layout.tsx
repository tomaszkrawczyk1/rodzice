import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Dokumenty i terminy",
  "Lista dokumentów i terminów, o których warto pamiętać przed urodzeniem dziecka i po nim."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
