import { NextResponse } from "next/server";
import { getSummary } from "@/lib/dinesafe";

export async function GET() {
  return NextResponse.json(getSummary());
}
