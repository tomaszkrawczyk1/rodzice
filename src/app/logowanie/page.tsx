import Logowanie from "./Logowanie";

// Logowanie jednym kliknięciem: nie ma już kroku „potwierdź wybór" (`?profil=…`). Stare linki z tym parametrem
// po prostu pokazują listę profili. Parametr `?powrot=pue` jest czytany w przeglądarce w chwili logowania.
export default function Page() {
  return <Logowanie />;
}
