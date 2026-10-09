import { NextResponse } from "next/server";
import { getChains } from "@/lib/dinesafe";

export async function GET() {
  const chains = getChains();
  return NextResponse.json({ chains, count: chains.length });
}
