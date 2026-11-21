import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logowanie testowe na fikcyjnym profilu – Przewodnik Przyszłego Rodzica",
  description: "Wypróbuj logowanie przez mObywatela na fikcyjnym profilu testowym. Wszystkie dane są wymyślone.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
