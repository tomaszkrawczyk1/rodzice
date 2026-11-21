import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminarz – Przewodnik Przyszłego Rodzica",
  description: "Terminarz ważnych dat i terminów w sprawach rodzicielskich.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
