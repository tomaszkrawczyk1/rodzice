import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalkulator zasiłku macierzyńskiego – Przewodnik Przyszłego Rodzica",
  description: "Policz orientacyjną wysokość zasiłku macierzyńskiego krok po kroku, na podstawie zarobków i okresu ubezpieczenia.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
