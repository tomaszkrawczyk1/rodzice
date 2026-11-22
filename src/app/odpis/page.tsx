import Link from "next/link";
import { tZSerwera } from "@/i18n/serwer";

export default async function Odpis() {
  const t = await tZSerwera();
  return (
    <>
      <h1>{t("Odpis aktu urodzenia")}</h1>
      <p className="lead">{t("Wniosek o odpis składasz w urzędzie stanu cywilnego. Informacje o usłudze online znajdziesz na gov.pl.")}</p>
      <section className="card">
        <h2>{t("Odpis do wniosku o zasiłek")}</h2>
        <p>{t("Jeśli zasiłek wypłaca ZUS, pobiera on odpis skrócony z rejestru stanu cywilnego. ZUS może poprosić Cię o dokument, gdy nie uda mu się pobrać odpisu.")}</p>
        <a className="btn btn-primary" href="https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-stanu-cywilnego-urodzenia-malzenstwa-zgonu">{t("Przejdź do usługi na gov.pl")}</a>
        <p className="mt"><Link href="/dokumenty">{t("Sprawdź dokumenty potrzebne do zasiłku")}</Link></p>
      </section>
    </>
  );
}
