import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ux.css";
import { Lato } from "next/font/google";
import { SesjaProvider } from "@/lib/sesja";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Przewodnik Przyszłego Rodzica – zasiłki i urlopy",
  description: "Sprawdź, jakie świadczenia z ZUS przysługują w ciąży i po urodzeniu dziecka: zasiłek chorobowy, macierzyński, urlopy. Kalkulator, dokumenty, terminy, ryzyka.",
};
const PRZED_MALOWANIEM = `try{var d=document.documentElement,c=d.classList,z=JSON.parse(localStorage.getItem("rodzice.dostepnosc")||"{}");c.toggle("fs-l",z.rozm===1);c.toggle("fs-xl",z.rozm===2);c.toggle("hc",!!z.hc);var n=!z.hc&&(z.noc===true);c.toggle("noc",n);if(localStorage.getItem("rodzice.sesja"))d.dataset.sesja="1"}catch(e){}`;
const lato = Lato({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-lato", display: "swap" });
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "light", themeColor: "#007834" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={lato.variable} suppressHydrationWarning>
      <head>
        {/* Zanim cokolwiek się namaluje: ustawienia dostępności i informacja o zapisanej sesji. Bez tego duży tekst
            i karta „Najbliższy termin" doskakiwały po hydratacji i przesuwały całą stronę. */}
        <script dangerouslySetInnerHTML={{ __html: PRZED_MALOWANIEM }} />
      </head>
      <body suppressHydrationWarning>
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
