import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ux.css";
import { Lato, Noto_Sans } from "next/font/google";
import { SesjaProvider } from "@/lib/sesja";
import { JezykProvider } from "@/lib/jezyk";
import { jezykZSerwera } from "@/i18n/serwer";
import { tlumaczDla } from "@/i18n/jezyki";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export async function generateMetadata(): Promise<Metadata> {
  const t = tlumaczDla(await jezykZSerwera());
  return {
    title: t("Przewodnik Przyszłego Rodzica – zasiłki i urlopy"),
    description: t("Sprawdź, jakie świadczenia z ZUS przysługują w ciąży i po urodzeniu dziecka: zasiłek chorobowy, macierzyński, urlopy. Kalkulator, dokumenty, terminy, ryzyka."),
  };
}
const PRZED_MALOWANIEM = `try{var d=document.documentElement,c=d.classList,z=JSON.parse(localStorage.getItem("rodzice.dostepnosc")||"{}");c.toggle("fs-l",z.rozm===1);c.toggle("fs-xl",z.rozm===2);c.toggle("hc",!!z.hc);if(localStorage.getItem("rodzice.sesja"))d.dataset.sesja="1"}catch(e){}`;
const lato = Lato({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-lato", display: "swap" });
// Lato nie ma cyrylicy (ukraiński). Noto Sans z podzbiorem cyrylicy jest zapasową czcionką: przeglądarka pobiera ją tylko wtedy, gdy na stronie są cyrylickie litery.
const noto = Noto_Sans({ subsets: ["cyrillic", "cyrillic-ext"], weight: ["400", "700"], variable: "--font-noto", display: "swap", preload: false });
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#007834" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jezyk = await jezykZSerwera();
  const t = tlumaczDla(jezyk);
  return (
    <html lang={jezyk} className={`${lato.variable} ${noto.variable}`} suppressHydrationWarning>
      <head>
        {/* Zanim cokolwiek się namaluje: ustawienia dostępności i informacja o zapisanej sesji. Bez tego duży tekst
            i karta „Najbliższy termin" doskakiwały po hydratacji i przesuwały całą stronę. */}
        <script dangerouslySetInnerHTML={{ __html: PRZED_MALOWANIEM }} />
      </head>
      <body>
        <a className="skip" href="#tresc">{t("Przejdź do treści")}</a>
        <JezykProvider poczatkowy={jezyk}>
          <SesjaProvider>
            <Header />
            <main id="tresc" className="container site-main">{children}</main>
            <Footer />
          </SesjaProvider>
        </JezykProvider>
      </body>
    </html>
  );
}
