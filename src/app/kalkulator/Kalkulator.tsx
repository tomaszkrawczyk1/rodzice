"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/jezyk";
import PlanRodziny from "./PlanRodziny";
import SzybkiePorownanie, { type DaneWstepne } from "./SzybkiePorownanie";
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
 * Na pierwszym kroku nad kreatorem jest szybkie porównanie wariantów (sama pensja, bez dat).
 */
export default function Kalkulator() {
  const t = useT();
  const params = useSearchParams();
  const surowy = params.get("tryb");
  const tryb: Sytuacja = czySytuacja(surowy) ? surowy : "oboje";
  const pierwszyKrok = !params.get("krok");
  const [wstepne, setWstepne] = useState<(DaneWstepne & { nr: number }) | null>(null);
  // Przełączenie ścieżki podmienia cały kreator, więc fokus (na wybranej opcji) przekazujemy nowemu widokowi.
  const wybierz = (s: Sytuacja) => { przekazFokusWyboru(); zastap({ tryb: s, krok: null }); };
  const szybkie = pierwszyKrok && tryb !== "ojciec";

  // Dane z szybkiego porównania trafiają do pełnego kalkulatora; przewijamy do jego pierwszego kroku.
  function doPelnego(d: DaneWstepne) {
    setWstepne((x) => ({ ...d, nr: (x?.nr ?? 0) + 1 }));
    const cel = document.getElementById("pelny-kalkulator");
    cel?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    cel?.querySelector<HTMLElement>("h2[tabindex], h3[tabindex]")?.focus({ preventScroll: true });
  }

  return (
    <>
      {szybkie && <SzybkiePorownanie onPelny={doPelnego} />}
      <div id="pelny-kalkulator">
        {szybkie && <p className={`section-h`}><b>{t("Albo policz wszystko dokładnie, krok po kroku")}</b> {t("(daty, podział urlopu między rodziców, łączenie z pracą):")}</p>}
        {tryb === "ojciec"
          ? <Ojcowski onSytuacja={(s) => { if (s !== "ojciec") wybierz(s); }} />
          : <PlanRodziny poczatkowy={tryb as Tryb} onOjciec={() => wybierz("ojciec")} wstepne={wstepne} />}
      </div>
    </>
  );
}
