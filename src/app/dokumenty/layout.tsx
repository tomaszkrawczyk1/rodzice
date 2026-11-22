import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kto wypłaca zasiłek – Przewodnik Przyszłego Rodzica",
  description: "Sprawdź, czy zasiłek wypłaca ZUS, czy pracodawca, gdzie złożyć wniosek i ile masz na to czasu.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
