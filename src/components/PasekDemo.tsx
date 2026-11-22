import Link from "next/link";
import s from "./PasekDemo.module.css";

/**
 * Wyraźny pasek „to nie ZUS” nad nagłówkiem. Klasa sim-banner zostaje, bo globals.css ukrywa ją przy druku
 * i przemalowuje w trybie wysokiego kontrastu.
 */
export default function PasekDemo() {
  return (
    <div className={`sim-banner ${s.pasek}`} role="note">
      <span className={s.etykieta}>Wersja demonstracyjna.</span>
      Bezpłatny, niezależny projekt z hackathonu HackNation 2026 dla osób w ciąży i rodziców po porodzie.
      {" "}<b>To nie jest oficjalna usługa ZUS</b> – dane są fikcyjne. <Link href="/o-projekcie">Więcej o projekcie</Link>
    </div>
  );
}
