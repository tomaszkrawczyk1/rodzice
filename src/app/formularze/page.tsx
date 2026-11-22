import Link from "next/link";
import type { Metadata } from "next";
import { kanoniczny } from "@/lib/adres-serwisu";
import { tZSerwera } from "@/i18n/serwer";

// /formularze („Wnioski i druki") to strona wyboru (kafelki); sama instrukcja wypełniania druków jest pod /druki, więc to nie duplikaty.
export const metadata: Metadata = {
  title: "Wnioski i druki – Przewodnik Przyszłego Rodzica",
  description: "Sprawdź, jak wypełnić druk ZUS, zobacz odczyt danych ze skanu i konto w ZUS (symulacja).",
  alternates: { canonical: kanoniczny("/formularze") },
};

const POZYCJE = [
  { href: "/druki", tytul: "Jak wypełnić druk ZUS", opis: "Kto składa który formularz i jak go wypełnić, pole po polu." },
  { href: "/wgraj", tytul: "Odczyt ze skanu (przykłady)", opis: "Pokaz: odczytujemy dane z przykładowego skanu Z-3 lub ZAM i liczymy zasiłek." },
  { href: "/pue", tytul: "Konto w ZUS (symulacja)", opis: "Tak mogłyby wyglądać dane o ubezpieczeniu i zwolnieniach w eZUS. Dane są fikcyjne." },
  { href: "/dokumenty", tytul: "Kto wypłaca zasiłek", opis: "ZUS czy pracodawca? Gdzie złożyć wniosek i ile masz na to czasu." },
];

export default async function Formularze() {
  const t = await tZSerwera();
  return (
    <>
      <h1>{t("Wnioski i druki")}</h1>
      <p className="lead">{t("Wybierz, co chcesz zrobić z papierami. Nie wiesz, od czego zacząć? Otwórz")} <Link href="/sprawy">{t("sprawy krok po kroku")}</Link>{t(": podpowiemy, który formularz będzie Ci potrzebny.")}</p>
      <div className="grid g2">
        {POZYCJE.map((p) => <Link key={p.href} href={p.href} className="tile"><b>{t(p.tytul)}</b><span>{t(p.opis)}</span></Link>)}
      </div>
    </>
  );
}
