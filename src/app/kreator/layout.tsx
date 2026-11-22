import "./kreator.css";
import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Kreator spraw",
  "Odpowiedz na kilka pytań, a podpowiemy, jakie sprawy z ZUS i urzędów warto załatwić."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
