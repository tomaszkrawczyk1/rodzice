import { NextResponse } from "next/server";
import { bad } from "@/lib/handler";
import { numerSprawy } from "@/lib/zus-mock";
/** SYMULACJA złożenia druku ZAS-53 (do ZUS) albo ZAS-26 (do płatnika zasiłku, razem z ZAM). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b.druk !== "ZAS-53" && b.druk !== "ZAS-26") return bad("Wskaż druk: ZAS-53 albo ZAS-26.");
  const adresat = b.druk === "ZAS-53" ? "ZUS" : "płatnik zasiłku (razem z ZAM)";
  return NextResponse.json({ symulacja: true, numerWniosku: numerSprawy(b.druk === "ZAS-53" ? "ZAS53" : "ZAS26"), adresat, status: `Druk ${b.druk} złożony (symulacja)`, wyslano: new Date().toISOString() });
}
