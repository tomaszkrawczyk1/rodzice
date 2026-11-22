import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Logowanie testowe na fikcyjnym profilu",
  "Wypróbuj logowanie przez mObywatela na fikcyjnym profilu testowym. Wszystkie dane są wymyślone."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
