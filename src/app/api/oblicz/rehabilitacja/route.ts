import { post } from "@/lib/handler";
import { swiadczenieRehabilitacyjne } from "@/engine/kalkulator";
export const POST = post((b, p) => swiadczenieRehabilitacyjne(b, p));
