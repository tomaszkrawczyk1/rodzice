import { post } from "@/lib/handler";
import { planZasilku } from "@/engine/kalkulator";
export const POST = post((b, p) => planZasilku(b, p));
