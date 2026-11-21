"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import PlanRodziny from "./PlanRodziny";
import { czySytuacja, type Sytuacja, type Tryb } from "./stale";

// Druga ścieżka (tata / drugi rodzic) ma własny kod i ładuje się osobno. Dalej renderuje się po stronie serwera,
// więc treść jest w HTML (czytniki ekranu, wyszukiwarki), a kod pobiera się dopiero, gdy jest potrzebny.
const Ojcowski = dynamic(() => import("./Ojcowski"), {
  loading: () => <p role="status">Wczytuję kalkulator…</p>,
});

/** Wybór ścieżki: plan rodziny (kilka trybów) albo „tata / drugi rodzic". Stan startowy pochodzi z adresu (?tryb=…). */
export default function Kalkulator({ tryb }: { tryb?: string }) {
  const start: Sytuacja = czySytuacja(tryb) ? tryb : "oboje";
  const [ojciec, setOjciec] = useState(start === "ojciec");
  const [plan, setPlan] = useState<Tryb>(start === "ojciec" ? "oboje" : start);

  if (ojciec) return <Ojcowski onSytuacja={(s) => { if (s !== "ojciec") { setPlan(s); setOjciec(false); } }} />;
  return <PlanRodziny poczatkowy={plan} onOjciec={() => setOjciec(true)} />;
}
