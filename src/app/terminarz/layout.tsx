import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terminy w urzędach – Przewodnik Przyszłego Rodzica",
  description: "Co złożyć w ZUS, u pracodawcy, w gminie i w USC po porodzie i do kiedy. Terminy liczone od daty porodu, plik do kalendarza.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
