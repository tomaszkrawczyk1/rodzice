import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { wszystkiePersony } from "@/lib/zus-mock";
import { randomBytes } from "node:crypto";
/** SYMULACJA logowania mObywatelem: wybór profilu testowego, bez prawdziwego uwierzytelniania. */
export async function POST(req: Request) {
  const { personaId } = await req.json().catch(() => ({}));
  const p = wszystkiePersony().find((x) => x.id === personaId);
  if (!p) return bad("Nieznany profil testowy", 404);
  return NextResponse.json({ token: "sym-" + randomBytes(12).toString("hex"), symulacja: true, osoba: p.osoba, pesel: p.pesel, personaId: p.id });
}
