import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konto w ZUS (eZUS) – Przewodnik Przyszłego Rodzica",
  description: "Symulacja konta w ZUS (eZUS): podgląd danych o ubezpieczeniu, zwolnieniach i składkach.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
