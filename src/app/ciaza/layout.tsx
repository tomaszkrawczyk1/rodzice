import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Co mi przysługuje w ciąży",
  "Sprawdź, jakie świadczenia i uprawnienia przysługują w czasie ciąży: zasiłek chorobowy, ochrona w pracy, badania."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
