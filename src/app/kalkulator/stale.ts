import parametry from "../../../data/parametry.json";
import { liczba } from "@/lib/format";

export const P = parametry.procenty;
export const L = parametry.limity_dni;
export const W = parametry.wymiary_tygodnie;
export const T = parametry.terminy_dni;
export const niezbywalne = W.niezbywalne_prawo_kazdego_rodzica_rodzicielski;
export const standard = `${liczba(P.zasilek_za_urlop_macierzynski)}% / ${liczba(P.zasilek_za_urlop_rodzicielski)}%`;
export const usredniony = `${liczba(P.wariant_pelny_wymiar_81_5)}%`;

/** Tryby planu rodziny. „ojciec" to osobna, krótsza ścieżka (sam urlop ojcowski i rodzicielski jednego rodzica). */
export type Tryb = "matka" | "oboje" | "laczenie" | "adopcja" | "wlasne";
export type Sytuacja = Tryb | "ojciec";
export const TRYBY: Sytuacja[] = ["matka", "oboje", "laczenie", "adopcja", "ojciec", "wlasne"];
export const czySytuacja = (s: unknown): s is Sytuacja => typeof s === "string" && (TRYBY as string[]).includes(s);

export const num = (s: string) => (s === "" || s == null ? NaN : Number(String(s).replace(",", ".")));
