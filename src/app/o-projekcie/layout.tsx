import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O projekcie – Przewodnik Przyszłego Rodzica",
  description: "Czym jest Przewodnik Przyszłego Rodzica, na jakich zasadach działa i skąd pochodzą dane.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
