import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { dataDir } from "@/lib/params";
export const dynamic = "force-dynamic";
export const GET = () => NextResponse.json(JSON.parse(fs.readFileSync(path.join(dataDir(), "scenariusze.json"), "utf8")));
