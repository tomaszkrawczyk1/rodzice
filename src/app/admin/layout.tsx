import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel administratora – Przewodnik Przyszłego Rodzica",
  description: "Panel administratora: parametry i dane testowe serwisu.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
