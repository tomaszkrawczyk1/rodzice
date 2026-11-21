import { NextResponse } from "next/server";
import { wszystkiePersony } from "@/lib/zus-mock";
export const dynamic = "force-dynamic";
export const GET = () => NextResponse.json(wszystkiePersony().map((p) => ({ id: p.id, osoba: p.osoba, pesel: p.pesel, tytul: p.ubezpieczenie[0]?.tytul })));
