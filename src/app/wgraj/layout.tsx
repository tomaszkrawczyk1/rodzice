import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Odczytaj dane ze skanu",
  "Wgraj skan dokumentu, a odczytamy z niego dane do wniosku. Symulacja bez zapisywania plików."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
