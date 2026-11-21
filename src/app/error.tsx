"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Błąd aplikacji:", error);
  }, [error]);

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center" }}>
      <div className="card">
        <span className="badge no">Chwilowy problem</span>
        <h1 style={{ marginTop: 16 }}>Coś poszło nie tak</h1>
        <p className="lead" style={{ marginTop: 8 }}>
          Przepraszamy za utrudnienia. Twoje dane są bezpieczne.
        </p>
        <p className="muted">
          Możesz spróbować załadować widok ponownie lub wrócić na stronę startową.
        </p>
        <div className="row center mt" style={{ justifyContent: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={() => reset()}>
            Spróbuj ponownie
          </button>
          <Link href="/" className="btn btn-secondary">
            Wróć na stronę główną
          </Link>
        </div>
      </div>
    </div>
  );
}
