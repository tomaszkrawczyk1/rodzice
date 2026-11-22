"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/jezyk";
import PlanRodziny from "./PlanRodziny";
import { zastap } from "./adres";
import { przekazFokusWyboru } from "./WyborSytuacji";
import { czySytuacja, type Sytuacja, type Tryb } from "./stale";

// Druga ścieżka (tata / drugi rodzic) ma własny kod i ładuje się osobno. Dalej renderuje się po stronie serwera,
// więc treść jest w HTML (czytniki ekranu, wyszukiwarki), a kod pobiera się dopiero, gdy jest potrzebny.
function Wczytywanie() {
  const t = useT();
  return <p role="status">{t("Wczytuję kalkulator…")}</p>;
}
const Ojcowski = dynamic(() => import("./Ojcowski"), {
  loading: () => <Wczytywanie />,
});

/**
 * Wybór ścieżki: plan rodziny (kilka trybów) albo „tata / drugi rodzic". Ścieżka siedzi w adresie (?tryb=…),
 * więc można ją podlinkować; zmiana wyboru poprawia adres bez dokładania wpisu w historii (krok to osobna sprawa).
 */
export default function Kalkulator() {
  const surowy = useSearchParams().get("tryb");
  const tryb: Sytuacja = czySytuacja(surowy) ? surowy : "oboje";
  // Przełączenie ścieżki podmienia cały kreator, więc fokus (na wybranej opcji) przekazujemy nowemu widokowi.
  const wybierz = (s: Sytuacja) => { przekazFokusWyboru(); zastap({ tryb: s, krok: null }); };

  if (tryb === "ojciec") return <Ojcowski onSytuacja={(s) => { if (s !== "ojciec") wybierz(s); }} />;
  return <PlanRodziny poczatkowy={tryb as Tryb} onOjciec={() => wybierz("ojciec")} />;
}
