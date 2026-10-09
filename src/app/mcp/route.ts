import { NextResponse } from "next/server";
import { getSummary, searchChains, lookupChain } from "@/lib/dinesafe";

// Minimal MCP server over streamable HTTP (JSON-RPC 2.0 via POST).
// Supports: initialize, tools/list, tools/call. Stateless.

const SERVER = { name: "canada-dinesafe-report-card", version: "1.0.0" };

const TOOLS = [
  {
    name: "chain_search",
    description:
      "Search the 84 Toronto restaurant and food chains ranked by conditional-pass rate (32,421 Toronto Public Health inspections, Oct 2025-Oct 2026).",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Chain name fragment" },
        limit: { type: "integer", description: "Max results, default 50, max 200" },
      },
    },
  },
  {
    name: "chain_lookup",
    description:
      "Full record for one chain: locations, inspections, conditional-pass / crucial / closed rates, the raw name variants merged by entity resolution, and every location with its latest inspection status.",
    inputSchema: {
      type: "object",
      properties: {
        chain_id: { type: "string", description: "Chain id, e.g. TIM HORTONS from the search tool" },
      },
      required: ["chain_id"],
    },
  },
  {
    name: "ranking_summary",
    description:
      "Snapshot metadata for the DineSafe Report Card: data window, vintage, citywide conditional-pass / crucial / closed baselines, and chain count.",
    inputSchema: { type: "object", properties: {} },
  },
];

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function err(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function textResult(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function handle(msg: any) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg?.id ?? null, -32600, "Invalid Request");
  }
  const id = msg.id ?? null;
  switch (msg.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
    case "notifications/initialized":
      return null;
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const { name, arguments: args } = msg.params ?? {};
      try {
        if (name === "chain_lookup") {
          const hit = lookupChain(String(args.chain_id ?? ""));
          if (!hit) return err(id, -32001, `No chain ${args.chain_id}`);
          return ok(id, textResult(hit));
        }
        if (name === "chain_search") {
          const q = String(args.q ?? "");
          const limit = Math.min(Math.max(parseInt(String(args.limit ?? "50"), 10) || 50, 1), 200);
          return ok(id, textResult({ q, limit, chains: searchChains(q, limit) }));
        }
        if (name === "ranking_summary") {
          return ok(id, textResult(getSummary()));
        }
        return err(id, -32602, `Unknown tool ${name}`);
      } catch (e) {
        return err(id, -32000, `Tool error: ${(e as Error).message}`);
      }
    }
    default:
      return err(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 });
  }
  if (Array.isArray(body)) {
    const out = body.map(handle).filter((r) => r !== null);
    return NextResponse.json(out);
  }
  const out = handle(body);
  if (out === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(out);
}

export async function GET() {
  return NextResponse.json(
    { error: "This MCP server accepts JSON-RPC 2.0 via POST only." },
    { status: 405 }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}
