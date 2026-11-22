import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "O projekcie",
  "Czym jest Przewodnik Przyszłego Rodzica, na jakich zasadach działa i skąd pochodzą dane."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
