import { post } from "@/lib/handler";
import { uprawnienia } from "@/engine/kalkulator";
export const POST = post((b, p) => uprawnienia(b, p));
