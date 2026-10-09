import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "DineSafe Report Card API",
    version: "1.0.0",
    description:
      "84 Toronto restaurant and food chains ranked by conditional-pass rate, from 32,421 Toronto Public Health inspections (2025-10-07 to 2026-10-07). Rates are per inspection. A conditional pass is corrected on re-inspection within 48 hours, not an ongoing hazard. Source: City of Toronto Open Data, DineSafe, Open Government Licence - Toronto. MIT licensed.",
  },
  servers: [{ url: "https://dinesafe.canada.nshipyard.com/api/v1" }],
  paths: {
    "/summary": {
      get: {
        summary: "Snapshot metadata: window, vintage, citywide baselines, chain count",
        responses: { "200": { description: "Summary metadata" } },
      },
    },
    "/chains": {
      get: {
        summary: "The full ranked chain table",
        responses: { "200": { description: "84 ranked chains with rates" } },
      },
    },
    "/chain": {
      get: {
        summary: "One chain: stats, name variants, and locations with latest inspection statuses",
        parameters: [
          { name: "id", in: "query", required: false, schema: { type: "string" }, example: "TIM HORTONS", description: "Chain id; omit and use q for search" },
          { name: "q", in: "query", required: false, schema: { type: "string" }, example: "pizza" },
          { name: "limit", in: "query", required: false, schema: { type: "integer", default: 50, maximum: 200 } },
        ],
        responses: { "200": { description: "Chain record or search results" }, "404": { description: "No chain with that id" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
