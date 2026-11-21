import { post } from "@/lib/handler";
import { wymiarUzupelniajacy } from "@/engine/kalkulator";
export const POST = post((b, p) => wymiarUzupelniajacy(b, p));
