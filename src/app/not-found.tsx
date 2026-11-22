import type { Metadata } from "next";
import Link from "next/link";
import { tZSerwera } from "@/i18n/serwer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await tZSerwera();
  return { title: t("Nie ma takiej strony – Przewodnik Przyszłego Rodzica") };
}

export default async function NotFound() {
  const t = await tZSerwera();
  return (
    <div className="narrow">
      <h1>{t("Nie ma takiej strony")}</h1>
      <p className="lead">{t("Adres mógł się zmienić albo w linku jest błąd. Wybierz, dokąd chcesz przejść.")}</p>
      <nav aria-label={t("Dokąd dalej")} className="row mt">
        <Link href="/sprawy" className="btn btn-primary">{t("Zobacz listę spraw")}</Link>
        <Link href="/" className="btn btn-ghost">{t("Wróć na stronę główną")}</Link>
        <Link href="/poradnik" className="btn btn-ghost">{t("Przejdź do poradnika")}</Link>
      </nav>
    </div>
  );
}
