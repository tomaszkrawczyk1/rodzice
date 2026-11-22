import Link from "next/link";
import type { Metadata } from "next";
import { kanoniczny } from "@/lib/adres-serwisu";

// /formularze („Wnioski i druki") to strona wyboru (kafelki); sama instrukcja wypełniania druków jest pod /druki, więc to nie duplikaty.
export const metadata: Metadata = {
  title: "Wnioski i druki – Przewodnik Przyszłego Rodzica",
  description: "Napisz wniosek, sprawdź jak wypełnić druk ZUS, zobacz odczyt danych ze skanu i konto w ZUS (symulacja).",
  alternates: { canonical: kanoniczny("/formularze") },
};

const POZYCJE = [
  { href: "/wnioski", tytul: "Napisz wniosek", opis: "Odpowiesz na kilka pytań, a my przygotujemy tekst wniosku do wydruku." },
  { href: "/druki", tytul: "Jak wypełnić druk ZUS", opis: "Kto składa który formularz i jak go wypełnić, pole po polu." },
  { href: "/wgraj", tytul: "Odczyt ze skanu (przykłady)", opis: "Pokaz: odczytujemy dane z przykładowego skanu Z-3 lub ZAM i liczymy zasiłek." },
  { href: "/pue", tytul: "Konto w ZUS (symulacja)", opis: "Tak mogłyby wyglądać dane o ubezpieczeniu i zwolnieniach w eZUS. Dane są fikcyjne." },
  { href: "/dokumenty", tytul: "Kto wypłaca zasiłek", opis: "ZUS czy pracodawca? Gdzie złożyć wniosek i ile masz na to czasu." },
];

export default function Formularze() {
  return (
    <>
      <h1>Wnioski i druki</h1>
      <p className="lead">Wybierz, co chcesz zrobić z papierami. Nie wiesz, od czego zacząć? Otwórz <Link href="/sprawy">sprawy krok po kroku</Link>: podpowiemy, który formularz będzie Ci potrzebny.</p>
      <div className="grid g2">
        {POZYCJE.map((p) => <Link key={p.href} href={p.href} className="tile"><b>{p.tytul}</b><span>{p.opis}</span></Link>)}
      </div>
    </>
  );
}
