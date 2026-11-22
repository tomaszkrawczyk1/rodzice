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

export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
