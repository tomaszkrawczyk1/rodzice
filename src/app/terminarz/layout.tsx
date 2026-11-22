import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Kalendarz w urzędzie",
  "Kalendarz ważnych dat i terminów w sprawach rodzicielskich."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
