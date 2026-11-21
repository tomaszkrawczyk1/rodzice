import Link from "next/link";
import { LINKI } from "@/content/tresci";

export default function Odpis() {
  return (
    <>
      <h1>Odpis aktu urodzenia</h1>
      <p className="lead">Wniosek o odpis składasz w urzędzie stanu cywilnego. Informacje o usłudze online znajdziesz na gov.pl.</p>
      <section className="card">
        <h2>Odpis do wniosku o zasiłek</h2>
        <p>Jeśli zasiłek wypłaca ZUS, pobiera on odpis skrócony z rejestru stanu cywilnego. ZUS może poprosić Cię o dokument, gdy nie uda mu się pobrać odpisu.</p>
        <a className="btn btn-primary" href={LINKI[3][1]}>Sprawdź usługę na gov.pl</a>
        <p className="mt"><Link href="/dokumenty">Sprawdź dokumenty potrzebne do zasiłku</Link></p>
      </section>
    </>
  );
}
