// Szkielet na czas ładowania: rezerwuje miejsce, więc treść po załadowaniu nie spycha niczego w dół.
export default function Szkielet({ etykieta, wiersze = 4 }: { etykieta: string; wiersze?: number }) {
  return (
    <div className="szkielet card" role="status" aria-busy="true">
      <span className="sr-only">{etykieta}</span>
      <div aria-hidden="true">
        <i className="szkielet__tytul" />
        {Array.from({ length: wiersze }, (_, k) => <i key={k} className="szkielet__wiersz" style={{ width: `${92 - k * 11}%` }} />)}
      </div>
      <p className="muted small" aria-hidden="true" style={{ margin: "16px 0 0" }}>{etykieta}</p>
    </div>
  );
}
