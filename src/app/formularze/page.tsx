import Link from "next/link";
import type { Metadata } from "next";
import { kanoniczny } from "@/lib/adres-serwisu";

// /formularze to strona wyboru (cztery kafelki); sama instrukcja wypełniania druków jest pod /druki, więc to nie duplikaty.
export const metadata: Metadata = {
  title: "Formularze i konto w ZUS – Przewodnik Przyszłego Rodzica",
  description: "Druki ZUS, kreator wniosków, odczyt danych ze skanu i konto w ZUS (eZUS): wybierz, co chcesz zrobić z papierami.",
  alternates: { canonical: kanoniczny("/formularze") },
};

const POZYCJE = [
  { href: "/druki", tytul: "Druki ZUS", opis: "Kto składa który formularz i jak go wypełnić." },
  { href: "/wnioski", tytul: "Kreator wniosków", opis: "Przygotuj tekst wniosku i wydrukuj go." },
  { href: "/wgraj", tytul: "Wgraj wniosek", opis: "Odczytaj dane z formularza Z-3 lub ZAM i policz zasiłek." },
  { href: "/pue", tytul: "Konto w ZUS (eZUS)", opis: "Sprawdź dane o ubezpieczeniu i zwolnieniach oraz napisz do ZUS." },
];

export default function Formularze() {
  return (
    <>
      <h1>Formularze i konto w ZUS</h1>
      <p className="lead">Wybierz, co chcesz zrobić z papierami. Jeśli nie wiesz od czego zacząć, otwórz <Link href="/sprawy">listę spraw</Link>: sama wskaże, który formularz będzie Ci potrzebny.</p>
      <div className="grid g2">
        {POZYCJE.map((p) => <Link key={p.href} href={p.href} className="tile"><b>{p.tytul}</b><span>{p.opis}</span></Link>)}
      </div>
    </>
  );
}
