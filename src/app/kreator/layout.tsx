import type { Metadata } from "next";
import "./kreator.css";

export const metadata: Metadata = {
  title: "Co mnie dotyczy? – Przewodnik Przyszłego Rodzica",
  description: "Odpowiedz na kilka pytań, a podpowiemy, jakie sprawy z ZUS i urzędów warto załatwić.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
