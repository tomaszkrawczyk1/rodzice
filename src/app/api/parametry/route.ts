import { NextResponse } from "next/server";
import { getParametry } from "@/lib/params";
export const dynamic = "force-dynamic";
export const GET = () => NextResponse.json(getParametry());
