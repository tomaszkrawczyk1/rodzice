import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Przetestuj odczyt ze skanu (przykłady) – Przewodnik Przyszłego Rodzica",
  description: "Zobacz, jak aplikacja odczytuje dane z zaświadczenia Z-3 i wniosku ZAM, na trzech przykładach z fikcyjnymi danymi. Pliki nie są zapisywane.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
