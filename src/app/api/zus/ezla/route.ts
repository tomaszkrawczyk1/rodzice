import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { znajdzPersone } from "@/lib/zus-mock";
export const dynamic = "force-dynamic";
export function GET(req: Request) {
  const pesel = new URL(req.url).searchParams.get("pesel") ?? "";
  const p = znajdzPersone(pesel); if (!p) return bad("Nie znaleziono ubezpieczonego (dane testowe)", 404);
  const dni = p.ezla.reduce((s: number, z: any) => s + (z.dni ?? 0), 0);
  return NextResponse.json({ symulacja: true, osoba: p.osoba, ezla: p.ezla, lacznieDni: dni, uwaga: "Kod literowy „B” oznacza niezdolność do pracy w związku z ciążą." });
}
