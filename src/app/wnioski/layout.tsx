import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kreator wniosków – Przewodnik Przyszłego Rodzica",
  description: "Przygotuj dane do wniosków o zasiłek i urlop krok po kroku.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
