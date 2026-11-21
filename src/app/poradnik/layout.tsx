import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poradnik: pytania i odpowiedzi – Przewodnik Przyszłego Rodzica",
  description: "Odpowiedzi na najczęstsze pytania o zasiłki, urlopy i zwolnienia w związku z rodzicielstwem.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
