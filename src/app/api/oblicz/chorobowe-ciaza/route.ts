import { post } from "@/lib/handler";
import { zasilekChorobowyWCiazy } from "@/engine/kalkulator";
export const POST = post((b, p) => zasilekChorobowyWCiazy(b, p));
