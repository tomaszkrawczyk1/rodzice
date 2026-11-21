import type { Metadata } from "next";
import { kanoniczny } from "@/lib/adres-serwisu";

export const metadata: Metadata = {
  title: "Pomoc w trudnej sytuacji – Przewodnik Przyszłego Rodzica",
  description: "Wsparcie i wskazówki, gdy ciąża lub poród przebiegają trudno: strata dziecka, wcześniactwo, śmierć rodzica.",
  // Kanoniczny adres tej treści: warianty z parametrem (?sytuacja=…) wskazują na /trudne.
  alternates: { canonical: kanoniczny("/trudne") },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
