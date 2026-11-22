import Link from "next/link";
import { useT } from "@/lib/jezyk";
import s from "./PasekDemo.module.css";

/**
 * Wyraźny pasek „to nie ZUS” nad nagłówkiem. Klasa sim-banner zostaje, bo globals.css ukrywa ją przy druku
 * i przemalowuje w trybie wysokiego kontrastu.
 */
export default function PasekDemo() {
  const t = useT();
  return (
    <div className={`sim-banner ${s.pasek}`} role="note">
      <span className={s.etykieta}>{t("Wersja demonstracyjna.")}</span>
      {t("Bezpłatny, niezależny projekt z hackathonu HackNation 2026 dla osób w ciąży i rodziców po porodzie.")}
      {" "}<b>{t("To nie jest oficjalna usługa ZUS")}</b> {t("– dane są fikcyjne.")} <Link href="/o-projekcie">{t("Więcej o projekcie")}</Link>
    </div>
  );
}
