import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SesjaProvider } from "@/lib/sesja";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Przewodnik Przyszłego Rodzica – zasiłki i urlopy",
  description: "Sprawdź, jakie świadczenia z ZUS przysługują w ciąży i po urodzeniu dziecka: zasiłek chorobowy, macierzyński, urlopy. Kalkulator, dokumenty, terminy, ryzyka.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00993f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <SesjaProvider>
          <Header />
          <main className="container">{children}</main>
          <Footer />
        </SesjaProvider>
      </body>
    </html>
  );
}
