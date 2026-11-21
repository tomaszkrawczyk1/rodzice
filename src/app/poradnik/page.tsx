import baza from "../../../data/baza_regul.json";
import { PYTANIA } from "@/content/poradnik";
import Pytania from "./Pytania";

type Zrodlo = { dok: string; przepis: string };
type Regula = { id: string; zrodla?: Zrodlo[] };

const zasady = new Map(Object.values(baza.tematy).flatMap((temat) =>
  (temat.reguly as Regula[]).map((regula) => [regula.id, regula.zrodla ?? []] as const),
));

const przepisy = Object.fromEntries(PYTANIA.map((p) => {
  const opisy = p.zrodla?.flatMap((z) => z.typ === "json" ? (zasady.get(z.id) ?? []).map((r) => [r.dok, r.przepis].filter(Boolean).join(", ")) : []) ?? [];
  return [p.id, [...new Set(opisy)]];
}));

export default function Poradnik() {
  return <Pytania przepisy={przepisy} />;
}
