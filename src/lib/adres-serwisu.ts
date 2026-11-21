// Adres publicznej wersji serwisu (demo z README). Używany do adresów kanonicznych: `<link rel="canonical">` musi być
// bezwzględny, a w projekcie nie ma jeszcze `metadataBase` w głównym layoucie. Można nadpisać zmienną NEXT_PUBLIC_SITE_URL.
const BAZA = (process.env.NEXT_PUBLIC_SITE_URL || "https://zxcvbnms.dev").replace(/\/+$/, "");

/** Bezwzględny adres kanoniczny dla ścieżki, np. kanoniczny("/trudne"). Bez parametrów zapytania i kotwic. */
export const kanoniczny = (sciezka: string) => BAZA + (sciezka.startsWith("/") ? sciezka : "/" + sciezka);
