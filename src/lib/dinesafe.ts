import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

export interface Chain {
  id: string;
  name: string;
  locations: number;
  inspections: number;
  inspections_per_location: number;
  conditional_pass_rate: number;
  closed_rate: number;
  crucial_rate: number;
  significant_rate: number;
  conditional_count: number;
  closed_count: number;
  crucial_count: number;
  locations_with_conditional_pct: number;
  locations_with_crucial_pct: number;
}

export interface ChainLocation {
  chain: string;
  name: string;
  address: string;
  lat: string;
  lon: string;
  last_inspection: string;
  last_status: string;
}

export interface Summary {
  project: string;
  source: string;
  source_url: string;
  licence: string;
  retrieved: string;
  data_window: { start: string; end: string };
  raw_rows: number;
  inspections_window: number;
  citywide: { inspections: number; conditional_rate: number; crucial_rate: number; closed_rate: number };
  min_locations: number;
  chains_ranked: number;
  note: string;
}

let chainsCache: Chain[] | null = null;
let summaryCache: Summary | null = null;
let locationsCache: ChainLocation[] | null = null;
let matchCache: Record<string, Record<string, number>> | null = null;

function read<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8")) as T;
}

export function getChains(): Chain[] {
  if (!chainsCache) chainsCache = read<Chain[]>("chains.json");
  return chainsCache;
}

export function getSummary(): Summary {
  if (!summaryCache) summaryCache = read<Summary>("summary.json");
  return summaryCache;
}

export function getLocations(): ChainLocation[] {
  if (!locationsCache) locationsCache = read<ChainLocation[]>("chain_locations.json");
  return locationsCache;
}

export function getMatchTable(): Record<string, Record<string, number>> {
  if (!matchCache) matchCache = read<Record<string, Record<string, number>>>("match_table.json");
  return matchCache;
}

export function lookupChain(id: string): (Omit<Chain, "locations"> & { location_count: number; locations: ChainLocation[]; variants: Record<string, number> }) | null {
  const chain = getChains().find((c) => c.id === id);
  if (!chain) return null;
  const { locations: location_count, ...rest } = chain;
  return {
    ...rest,
    location_count,
    locations: getLocations().filter((l) => l.chain === id),
    variants: getMatchTable()[id] ?? {},
  };
}

export function searchChains(q: string, limit = 50): Chain[] {
  const needle = q.trim().toLowerCase();
  const all = getChains();
  if (!needle) return all.slice(0, limit);
  return all.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, limit);
}
