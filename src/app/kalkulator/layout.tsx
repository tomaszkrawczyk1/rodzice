import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Kalkulator zasiłku macierzyńskiego",
  "Policz orientacyjną wysokość zasiłku macierzyńskiego krok po kroku, na podstawie zarobków i okresu ubezpieczenia."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
