"use client";

import { useLang } from "@/i18n";
import { Banner, Nav, Footer } from "@/components/chrome";
import Ranking from "@/components/Ranking";

function Hero() {
  const { t } = useLang();
  return (
    <section id="top" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 pb-16 pt-16 md:pb-24 md:pt-24">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.hero.kicker}</p>
        <h1 className="display mt-5 max-w-[880px] text-[52px] md:text-[84px]">{t.hero.title}</h1>
        <p className="mt-6 max-w-[680px] text-[19px] leading-relaxed text-ink/70 md:text-[21px]">{t.hero.sub}</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a href="#ranking" className="rounded-full bg-canada px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-canada-dark">
            {t.hero.cta1}
          </a>
          <a href="#methodology" className="rounded-full border border-line px-7 py-3.5 text-[16px] font-semibold hover:border-ink">
            {t.hero.cta2}
          </a>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[24px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {t.stats.map((s) => (
            <div key={s.value} className="bg-paper p-7">
              <p className="display text-[44px] text-canada">{s.value}</p>
              <p className="mt-2 text-[15px] leading-snug text-ink/65">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RankingSection() {
  const { t } = useLang();
  return (
    <section id="ranking" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.ranking.kicker}</p>
        <h2 className="display mt-4 max-w-[760px] text-[40px] md:text-[52px]">{t.ranking.title}</h2>
        <p className="mt-5 max-w-[760px] text-[16px] leading-relaxed text-ink/70">{t.ranking.body}</p>
        <div className="mt-10">
          <Ranking />
        </div>
      </div>
    </section>
  );
}

function Caveats() {
  const { t } = useLang();
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-24">
        <div className="rounded-[24px] border-2 border-canada/25 bg-canada/[0.04] p-8 md:p-12">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.caveats.kicker}</p>
          <h2 className="display mt-4 text-[32px] md:text-[44px]">{t.caveats.title}</h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {t.caveats.items.map((item, i) => (
              <li key={i} className="flex gap-4">
                <span className="display mt-0.5 shrink-0 text-[22px] text-canada">{i + 1}</span>
                <p className="text-[16px] leading-relaxed text-ink/80">{item}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Methodology() {
  const { t } = useLang();
  return (
    <section id="methodology" className="bg-paper-warm">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.methodology.kicker}</p>
        <h2 className="display mt-4 max-w-[760px] text-[40px] md:text-[52px]">{t.methodology.title}</h2>
        <ol className="mt-10 grid gap-6 lg:grid-cols-2">
          {t.methodology.items.map((item, i) => (
            <li key={i} className="rounded-[20px] border border-line bg-paper p-7">
              <p className="display text-[20px] text-canada">{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{item}</p>
            </li>
          ))}
        </ol>
        <a
          href="/data/match_table.csv"
          className="mt-8 inline-block rounded-full bg-ink px-7 py-3.5 text-[16px] font-semibold text-white hover:bg-canada"
        >
          {t.methodology.matchTable}
        </a>
      </div>
    </section>
  );
}

function Developers() {
  const { t } = useLang();
  return (
    <section id="data" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{t.developers.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.developers.title}</h2>
        <p className="mt-5 max-w-[680px] text-[16px] leading-relaxed text-ink/70">{t.developers.body}</p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line md:grid-cols-2">
          {t.developers.downloads.map((d) => (
            <a key={d.name} href={`/data/${d.name}`} className="group bg-paper p-7 hover:bg-paper-warm">
              <p className="font-mono text-[16px] font-semibold text-canada group-hover:underline">{d.name}</p>
              <p className="mt-2 text-[15px] text-ink/65">{d.desc}</p>
            </a>
          ))}
        </div>
        <h3 className="display mt-14 text-[30px]">{t.developers.apiTitle}</h3>
        <p className="mt-2 text-[15px] text-ink/65">{t.developers.apiBody}</p>
        <div className="mt-6 overflow-hidden rounded-[20px] border border-line">
          {t.developers.endpoints.map((e) => (
            <a key={e.path} href={e.path} className="flex flex-col gap-1 border-b border-line px-6 py-4 last:border-0 hover:bg-paper-warm md:flex-row md:items-center md:gap-6">
              <code className="shrink-0 font-mono text-[14px] font-semibold text-canada">{e.path}</code>
              <span className="text-[14px] text-ink/60">{e.desc}</span>
            </a>
          ))}
        </div>
        <h3 className="display mt-14 text-[30px]">{t.developers.mcpTitle}</h3>
        <p className="mt-2 max-w-[680px] text-[15px] text-ink/65">{t.developers.mcpBody}</p>
        <code className="mt-4 block max-w-[680px] overflow-x-auto rounded-[16px] border border-line bg-muted px-5 py-4 font-mono text-[14px]">
          curl -X POST https://dinesafe.canada.nshipyard.com/mcp -H &quot;Content-Type: application/json&quot; -d
          &apos;{"{"}"jsonrpc":"2.0","id":1,"method":"tools/list"{"}"}&apos;
        </code>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <>
      <Banner />
      <Nav />
      <main>
        <Hero />
        <RankingSection />
        <Caveats />
        <Methodology />
        <Developers />
      </main>
      <Footer />
    </>
  );
}
