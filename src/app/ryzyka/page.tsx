import { RYZYKA, OCHRONA } from "@/content/tresci";
export default function Ryzyka() {
  return (
    <>
      <h1>Ubezpieczenie i ochrona w pracy</h1>
      <p className="lead">Sprawdź, co może wpłynąć na Twój zasiłek i kiedy prawo chroni Twoją umowę o pracę.</p>
      <div className="grid g2">{RYZYKA.map((r) => <div key={r.t} className="card"><h3>{r.t}</h3><p>{r.d}</p></div>)}</div>
      <div className="card accent mt"><h2>Ochrona przed zwolnieniem</h2><ul className="clean">{OCHRONA.map((o) => <li key={o}>{o}</li>)}</ul></div>
    </>
  );
}
