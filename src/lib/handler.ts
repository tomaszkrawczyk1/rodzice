import { NextResponse } from "next/server";
import { getParametry } from "./params";
import type { Parametry } from "@/engine/kalkulator";

/** POST z JSON-em -> funkcja silnika (czysta) -> JSON. Błędy wejścia = 400. */
export function post<T>(fn: (body: any, p: Parametry) => T) {
  return async (req: Request) => {
    try {
      const body = await req.json();
      return NextResponse.json(fn(body, getParametry()));
    } catch (e: any) {
      return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
    }
  };
}

/**
 * Dane osoby (PESEL, data) z treści zapytania POST.
 * PESEL nie trafia do adresu URL, więc nie zostaje w logach serwera, historii przeglądarki ani nagłówku Referer.
 */
export async function zapytanieOsoby(req: Request): Promise<{ pesel: string; naDzien?: string }> {
  const b = await req.json().catch(() => ({}));
  return { pesel: typeof b?.pesel === "string" ? b.pesel.trim() : "", naDzien: typeof b?.naDzien === "string" && b.naDzien ? b.naDzien : undefined };
}
/** Odpowiedź z danymi osobowymi: bez zapisu w pamięci podręcznej. */
export const prywatne = (dane: unknown) => NextResponse.json(dane, { headers: { "Cache-Control": "no-store" } });

export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
