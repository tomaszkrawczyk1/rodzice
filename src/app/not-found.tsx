import Link from "next/link";

export default function NotFound() {
  return (
    <div className="narrow">
      <h1>Nie ma takiej strony</h1>
      <p className="lead">Adres mógł się zmienić albo w linku jest błąd. Wybierz, dokąd chcesz przejść.</p>
      <div className="row mt">
        <Link href="/sprawy" className="btn btn-primary">Zobacz listę spraw</Link>
        <Link href="/" className="btn btn-ghost">Wróć na stronę główną</Link>
        <Link href="/poradnik" className="btn btn-ghost">Przejdź do poradnika</Link>
      </div>
    </div>
  );
}
