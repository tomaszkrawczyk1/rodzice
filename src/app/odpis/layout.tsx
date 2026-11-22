import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Odpis aktu urodzenia – Przewodnik Przyszłego Rodzica",
  description: "Jak zamówić odpis aktu urodzenia dziecka i do czego jest potrzebny w sprawach z ZUS.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
