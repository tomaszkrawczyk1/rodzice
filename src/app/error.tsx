"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const naglowek = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error("Błąd aplikacji:", error);
  }, [error]);

  // Po awarii fokus zostawał na elemencie, którego już nie ma. Przenosimy go na nagłówek, żeby czytnik ekranu
  // od razu odczytał komunikat, a klawiatura startowała od niego.
  useEffect(() => {
    naglowek.current?.focus();
  }, []);

  return (
    <div className="narrow" style={{ margin: "40px auto", textAlign: "center" }}>
      <div className="card">
        <span className="badge no">Chwilowy problem</span>
        <h1 ref={naglowek} tabIndex={-1} style={{ marginTop: 16 }}>Coś poszło nie tak</h1>
        <p className="lead" style={{ margin: "8px auto 0" }}>
          Przepraszamy za utrudnienia. Twoje dane są bezpieczne.
        </p>
        <p className="muted">
          Możesz spróbować załadować widok ponownie lub wrócić na stronę startową.
        </p>
        <div className="row mt" style={{ justifyContent: "center", gap: 12 }}>
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
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
