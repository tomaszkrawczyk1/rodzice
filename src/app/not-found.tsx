import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center" }}>
      <div className="card">
        <span className="badge warn">Błąd 404</span>
        <h1 style={{ marginTop: 16 }}>Nie znaleźliśmy tej strony</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          Spokojnie, nic nie przepadło. Strona mogła zmienić adres lub wpisany link zawiera błąd.
        </p>
        <p className="muted">
          Wróć do głównych działów przewodnika, aby bezpiecznie i bez stresu załatwić swoją sprawę:
        </p>
        <div className="row center mt" style={{ justifyContent: "center", gap: 12 }}>
          <Link href="/" className="btn btn-primary">
            Wróć na stronę główną
          </Link>
          <Link href="/poradnik" className="btn btn-secondary">
            Przejdź do poradnika
          </Link>
          <Link href="/sprawy" className="btn btn-ghost">
            Zobacz listę spraw
          </Link>
        </div>
      </div>
    </div>
  );
}
