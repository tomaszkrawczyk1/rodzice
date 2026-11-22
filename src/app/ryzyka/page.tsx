import { RYZYKA, OCHRONA } from "@/content/tresci";
import { tZSerwera } from "@/i18n/serwer";

export default async function Ryzyka() {
  const t = await tZSerwera();
  return (
    <>
      <h1>{t("Ubezpieczenie i ochrona w pracy")}</h1>
      <p className="lead">{t("Sprawdź, co może wpłynąć na Twój zasiłek i kiedy prawo chroni Twoją umowę o pracę.")}</p>
      <div className="grid g2">{RYZYKA.map((r) => <div key={r.t} className="card"><h3>{t(r.t)}</h3><p>{t(r.d)}</p></div>)}</div>
      <div className="card accent mt"><h2>{t("Ochrona przed zwolnieniem")}</h2><ul className="clean">{OCHRONA.map((o) => <li key={o}>{t(o)}</li>)}</ul></div>
    </>
  );
}
