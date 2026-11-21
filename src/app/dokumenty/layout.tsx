import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumenty i terminy – Przewodnik Przyszłego Rodzica",
  description: "Lista dokumentów i terminów, o których warto pamiętać przed urodzeniem dziecka i po nim.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
