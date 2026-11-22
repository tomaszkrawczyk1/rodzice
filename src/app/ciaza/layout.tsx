import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Co mi przysługuje w ciąży – Przewodnik Przyszłego Rodzica",
  description: "Sprawdź, jakie świadczenia i uprawnienia przysługują w czasie ciąży: zasiłek chorobowy, ochrona w pracy, badania.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
