import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Poradnik: pytania i odpowiedzi",
  "Odpowiedzi na najczęstsze pytania o zasiłki, urlopy i zwolnienia w związku z rodzicielstwem."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
