import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Kreator wniosków",
  "Przygotuj dane do wniosków o zasiłek i urlop krok po kroku."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
