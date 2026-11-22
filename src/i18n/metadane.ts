import type { Metadata } from "next";
import { tZSerwera } from "./serwer";

/**
 * Tytuł karty i opis w języku użytkownika (ciasteczko). Użycie w layout.tsx:
 *   export const generateMetadata = () => metadane("Polski tytuł", "Polski opis");
 * Do słownika trafia sam polski tytuł (bez dopiska „– Przewodnik Przyszłego Rodzica", dodajemy go tu) i polski opis.
 */
export async function metadane(tytul: string, opis: string, reszta: Metadata = {}): Promise<Metadata> {
  const t = await tZSerwera();
  return { title: `${t(tytul)} – ${t("Przewodnik Przyszłego Rodzica")}`, description: t(opis), ...reszta };
}
