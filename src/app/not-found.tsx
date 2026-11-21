import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nie ma takiej strony – Przewodnik Przyszłego Rodzica",
};

export default function NotFound() {
  return (
    <div className="narrow">
      <h1>Nie ma takiej strony</h1>
      <p className="lead">Adres mógł się zmienić albo w linku jest błąd. Wybierz, dokąd chcesz przejść.</p>
      <nav aria-label="Dokąd dalej" className="row mt">
        <Link href="/sprawy" className="btn btn-primary">Zobacz listę spraw</Link>
        <Link href="/" className="btn btn-ghost">Wróć na stronę główną</Link>
        <Link href="/poradnik" className="btn btn-ghost">Przejdź do poradnika</Link>
      </nav>
    </div>
  );
}
