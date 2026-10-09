import { NextResponse } from "next/server";
import { lookupChain, searchChains } from "@/lib/dinesafe";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const hit = lookupChain(id);
    if (!hit) return NextResponse.json({ error: `No chain ${id}` }, { status: 404 });
    return NextResponse.json(hit);
  }
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);
  return NextResponse.json({ q, limit, chains: searchChains(q, limit) });
}
