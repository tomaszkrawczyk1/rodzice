import { post } from "@/lib/handler";
import { swiadczenieRodzicielskie } from "@/engine/kalkulator";
export const POST = post((b, p) => swiadczenieRodzicielskie(b, p));
