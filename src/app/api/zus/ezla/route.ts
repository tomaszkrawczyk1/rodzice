import { bad, prywatne, zapytanieOsoby } from "@/lib/handler";
import { znajdzPersone } from "@/lib/zus-mock";
export const dynamic = "force-dynamic";
/** POST { pesel } — SYMULACJA listy e-ZLA (dane fikcyjne). */
export async function POST(req: Request) {
  const { pesel } = await zapytanieOsoby(req);
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  const dni = p.ezla.reduce((s: number, z: any) => s + (z.dni ?? 0), 0);
  return prywatne({ symulacja: true, osoba: p.osoba, ezla: p.ezla, lacznieDni: dni, uwaga: "Kod literowy „B” oznacza niezdolność do pracy w związku z ciążą." });
}
