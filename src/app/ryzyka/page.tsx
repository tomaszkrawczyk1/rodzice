import { RYZYKA, OCHRONA } from "@/content/tresci";
export default function Ryzyka() {
  return (
    <>
      <h1>Na co uważać</h1>
      <p className="lead">Te sytuacje najczęściej prowadzą do utraty prawa do zasiłku albo do niższych świadczeń. Poznaj je z wyprzedzeniem.</p>
      <div className="grid g2">{RYZYKA.map((r) => <div key={r.t} className={"card " + (r.sev === "danger" ? "danger" : r.sev === "warn" ? "warn" : "navy")}><h3>{r.t}</h3><p>{r.d}</p></div>)}</div>
      <div className="card accent mt"><h2>Ochrona przed zwolnieniem</h2><ul className="clean">{OCHRONA.map((o) => <li key={o}>{o}</li>)}</ul></div>
    </>
  );
}
