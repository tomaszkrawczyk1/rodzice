import { post } from "@/lib/handler";
import { porownajWarianty } from "@/engine/kalkulator";
export const POST = post((b, p) => porownajWarianty(b, p));
