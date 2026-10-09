"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/i18n";

interface Chain {
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

interface ChainDetail extends Omit<Chain, "locations"> {
  location_count: number;
  locations: { chain: string; name: string; address: string; lat: string; lon: string; last_inspection: string; last_status: string }[];
  variants: Record<string, number>;
}

type SortKey = "conditional_pass_rate" | "crucial_rate" | "locations" | "inspections" | "name";

function Bar({ pct, max }: { pct: number; max: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="hidden h-2 w-24 overflow-hidden rounded-full bg-ink/10 sm:inline-block">
        <span className="block h-full rounded-full bg-canada" style={{ width: `${Math.min(100, (pct / max) * 100)}%` }} />
      </span>
      <span className="tabular-nums">{pct.toFixed(1)}%</span>
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "Pass" ? "bg-emerald-600" : status === "Conditional Pass" ? "bg-amber-500" : status === "Closed" ? "bg-canada" : "bg-ink/30";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function Ranking() {
  const { t, lang } = useLang();
  const [chains, setChains] = useState<Chain[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("conditional_pass_rate");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChainDetail | null>(null);

  useEffect(() => {
    fetch("/api/v1/chains")
      .then((r) => r.json())
      .then((d) => setChains(d.chains))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    fetch(`/api/v1/chain?id=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {});
  }, [selected]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = needle ? chains.filter((c) => c.name.toLowerCase().includes(needle)) : [...chains];
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return b[sort] - a[sort];
    });
    return rows;
  }, [chains, q, sort]);

  const maxCond = useMemo(() => Math.max(1, ...chains.map((c) => c.conditional_pass_rate)), [chains]);
  const maxCruc = useMemo(() => Math.max(1, ...chains.map((c) => c.crucial_rate)), [chains]);

  if (selected && detail) {
    const c = detail;
    return (
      <div>
        <button onClick={() => setSelected(null)} className="rounded-full border border-line px-5 py-2.5 text-[15px] font-medium hover:border-ink">
          ← {t.ranking.detail.back}
        </button>
        <h3 className="display mt-8 text-[36px] md:text-[48px]">{c.name}</h3>
        <div className="mt-6 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { v: `${c.conditional_pass_rate.toFixed(1)}%`, l: `${t.ranking.colConditional} ${t.ranking.perInspection}` },
            { v: `${c.crucial_rate.toFixed(1)}%`, l: `${t.ranking.colCrucial} ${t.ranking.perInspection}` },
            { v: String(c.location_count), l: t.ranking.colLocations },
            { v: String(c.inspections), l: t.ranking.colInspections },
          ].map((s) => (
            <div key={s.l} className="bg-paper p-6">
              <p className="display text-[36px] text-canada">{s.v}</p>
              <p className="mt-1 text-[14px] text-ink/65">{s.l}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[720px] text-[15px] leading-relaxed text-ink/70">
          {c.locations_with_conditional_pct.toFixed(1)}% {t.ranking.detail.ofLocations};{" "}
          {c.locations_with_crucial_pct.toFixed(1)}% {t.ranking.detail.ofLocationsCrucial}.
        </p>
        <h4 className="display mt-10 text-[26px]">
          {c.locations.length} {t.ranking.detail.locations}
        </h4>
        <div className="mt-4 overflow-hidden rounded-[20px] border border-line">
          <div className="max-h-[480px] overflow-y-auto">
            {c.locations
              .slice()
              .sort((a, b) => b.last_inspection.localeCompare(a.last_inspection))
              .map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">{l.name}</p>
                    <p className="truncate text-[13px] text-ink/55">{l.address}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[13px] text-ink/70">
                    <StatusDot status={l.last_status} />
                    <span>{t.status[l.last_status as keyof typeof t.status] ?? l.last_status}</span>
                    <span className="tabular-nums text-ink/45">{l.last_inspection}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
        <h4 className="display mt-10 text-[26px]">{t.ranking.detail.variants}</h4>
        <p className="mt-2 max-w-[720px] text-[14px] text-ink/60">{t.ranking.detail.variantsSub}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(c.variants)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => (
              <span key={name} className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink/70">
                {name} <span className="tabular-nums text-ink/45">· {count}</span>
              </span>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.ranking.search}
          className="w-full max-w-[420px] rounded-full border border-line bg-paper px-5 py-3 text-[15px] outline-none placeholder:text-ink/40 focus:border-ink"
        />
        <label className="flex items-center gap-2 text-[14px] text-ink/65">
          {t.ranking.sortBy}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border border-line bg-paper px-4 py-2 text-[14px] font-medium"
          >
            <option value="conditional_pass_rate">{t.ranking.colConditional}</option>
            <option value="crucial_rate">{t.ranking.colCrucial}</option>
            <option value="locations">{t.ranking.colLocations}</option>
            <option value="inspections">{t.ranking.colInspections}</option>
            <option value="name">{t.ranking.colChain}</option>
          </select>
        </label>
      </div>
      <p className="mt-4 text-[14px] text-ink/55">
        {t.ranking.showing} {filtered.length} {t.ranking.of} {chains.length}
      </p>
      <div className="mt-4 overflow-x-auto rounded-[20px] border border-line">
        <table className="w-full min-w-[760px] border-collapse bg-paper text-left">
          <thead>
            <tr className="border-b border-line text-[13px] uppercase tracking-wide text-ink/55">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">{t.ranking.colChain}</th>
              <th className="px-5 py-3 text-right font-medium">{t.ranking.colLocations}</th>
              <th className="px-5 py-3 text-right font-medium">{t.ranking.colInspections}</th>
              <th className="px-5 py-3 text-right font-medium">{t.ranking.colConditional}</th>
              <th className="px-5 py-3 text-right font-medium">{t.ranking.colCrucial}</th>
              <th className="px-5 py-3 text-right font-medium">{t.ranking.colClosed}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-paper-warm"
              >
                <td className="px-5 py-3 text-[14px] tabular-nums text-ink/45">{i + 1}</td>
                <td className="px-5 py-3 text-[15px] font-semibold">{c.name}</td>
                <td className="px-5 py-3 text-right text-[15px] tabular-nums">{c.locations}</td>
                <td className="px-5 py-3 text-right text-[15px] tabular-nums">{c.inspections}</td>
                <td className="px-5 py-3">
                  <span className="flex justify-end">
                    <Bar pct={c.conditional_pass_rate} max={maxCond} />
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="flex justify-end">
                    <Bar pct={c.crucial_rate} max={maxCruc} />
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-[15px] tabular-nums text-ink/70">{c.closed_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="mt-6 text-[15px] text-ink/60">{t.ranking.noResult}</p>}
      <p className="mt-4 text-[13px] text-ink/45">{lang === "fr" ? "Taux par inspection." : "Rates are per inspection."}</p>
    </div>
  );
}
