import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Odczytaj dane ze skanu – Przewodnik Przyszłego Rodzica",
  description: "Wgraj skan dokumentu, a odczytamy z niego dane do wniosku. Symulacja bez zapisywania plików.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
