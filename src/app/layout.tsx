import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Lato } from "next/font/google";
import { SesjaProvider } from "@/lib/sesja";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Przewodnik Przyszłego Rodzica – zasiłki i urlopy",
  description: "Sprawdź, jakie świadczenia z ZUS przysługują w ciąży i po urodzeniu dziecka: zasiłek chorobowy, macierzyński, urlopy. Kalkulator, dokumenty, terminy, ryzyka.",
};
const lato = Lato({ subsets: ["latin", "latin-ext"], weight: ["400", "700", "900"], variable: "--font-lato", display: "swap" });
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#007834" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={lato.variable}>
      <body>
        <a className="skip" href="#tresc">Przejdź do treści</a>
        <SesjaProvider>
          <Header />
          <main id="tresc" className="container site-main">{children}</main>
          <Footer />
        </SesjaProvider>
      </body>
    </html>
  );
}
