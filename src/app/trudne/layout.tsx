import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pomoc w trudnej sytuacji – Przewodnik Przyszłego Rodzica",
  description: "Wsparcie i wskazówki, gdy ciąża lub poród przebiegają trudno: strata dziecka, wcześniactwo, śmierć rodzica.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
