import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Konto w ZUS (eZUS)",
  "Symulacja konta w ZUS (eZUS): podgląd danych o ubezpieczeniu, zwolnieniach i składkach."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
