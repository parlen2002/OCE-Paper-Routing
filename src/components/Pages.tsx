import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import type { Activity, Kind, Paper, Role, Stage, User, UserStatus } from '../lib/core';
import { ALL_UNITS, CROSS_UNITS, DESKS, DIVISIONS, KINDS, STAGES, divById, dayLabel, timeAgo } from '../lib/core';
import { I, Avatar, DivChip, StageChip, KindTag, PageHead, EmptyState, type IconName } from './ui';

function MiniBar({ v, w = 'w-full' }: { v: number; w?: string }) {
  const pct = Math.max(0, Math.min(100, v));
  const color = pct >= 100 ? '#45d483' : pct >= 50 ? '#2dd4bf' : pct >= 25 ? '#f5b924' : '#ff8a4c';
  return (
    <div className={`${w} h-[6px] overflow-hidden rounded-full bg-[#16283c1a]`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ------------------------------------------------ dashboard */
export function Dashboard() {
  const { db, user, activities, go, setDivFilter, openDrawer, setNewOpen } = useStore();
  if (!user) return null;
  const papers = db.papers;
  const open = papers.filter((p) => p.stage !== 'completed');
  const inQueue = papers.filter((p) => p.stage === 'received' || p.stage === 'review').length;
  const working = papers.filter((p) => p.stage === 'progress' || p.stage === 'verification').length;
  const week = Date.now() - 7 * 864e5;
  const doneWeek = papers.filter((p) => p.stage === 'completed' && p.updatedAt >= week).length;
  const urgentOpen = open.filter((p) => p.priority === 'urgent');
  const load = ALL_UNITS.map((d) => ({ d, n: open.filter((p) => p.divisionId === d.id).length }));
  const maxLoad = Math.max(1, ...load.map((l) => l.n));

  const stats: { label: string; value: number; hint: string; color: string; icon: IconName }[] = [
    { label: 'In intake trays', value: inQueue, hint: 'Received + under review', color: '#56c8f0', icon: 'inbox' },
    { label: 'Being worked', value: working, hint: 'In progress + verification', color: '#ff8a4c', icon: 'wrench' },
    { label: 'Closed this week', value: doneWeek, hint: 'Completed, last 7 days', color: '#45d483', icon: 'checkc' },
    { label: 'Urgent open', value: urgentOpen.length, hint: 'Needs a department head eye', color: '#f4645c', icon: 'alert' },
  ];

  const ACT_META: Record<Activity['type'], { icon: IconName; color: string }> = {
    create: { icon: 'plus', color: '#56c8f0' },
    move: { icon: 'send', color: '#f5b924' },
    route: { icon: 'route', color: '#ff8a4c' },
    note: { icon: 'note', color: '#86a2be' },
    attach: { icon: 'clip', color: '#2dd4bf' },
    complete: { icon: 'checkc', color: '#45d483' },
  };

  return (
    <div>
      <div className="anim-fade-up mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-flare-400">
            Office of the City Engineer · {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h1 className="font-display text-[38px] font-bold uppercase leading-none tracking-wide text-mist-50 sm:text-[44px]">
            Command <span className="text-cyanx-500">view</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-mist-400">
            On duty: <b className="text-mist-200">{user.name}</b> — {user.title}. Every hand-off below is stamped into the custody trail.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <I n="plus" className="h-4 w-4" sw={2.2} /> Log paperwork
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="anim-fade-up relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="absolute right-3 top-3" style={{ color: `${s.color}66` }}><I n={s.icon} className="h-6 w-6" sw={1.4} /></span>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-mist-500">{s.label}</p>
            <p className="mt-1 font-display text-[44px] font-bold leading-none tabular" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1.5 text-[11px] text-mist-500">{s.hint}</p>
            <span className="absolute inset-x-0 bottom-0 h-[2.5px]" style={{ background: `${s.color}55` }} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '120ms' }}>
            <div className="mb-3 flex items-center gap-2">
              <I n="sitemap" className="h-3.5 w-3.5 text-flare-400" sw={2} />
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Desk load — open papers</h3>
              <span className="h-px flex-1 bg-ink-700" />
              <button onClick={() => go('board')} className="font-mono text-[10px] uppercase tracking-wider text-cyanx-400 hover:text-cyanx-300">Open board →</button>
            </div>
            <ul className="space-y-1">
              {load.map(({ d, n }) => (
                <li key={d.id}>
                  <button onClick={() => { setDivFilter(d.id); go('board'); }} className="group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-ink-800/80">
                    <DivChip div={d} />
                    <span className="w-48 truncate text-[12.5px] font-semibold text-mist-200 group-hover:text-mist-50">{d.name}</span>
                    <span className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-ink-800">
                      <span className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${(n / maxLoad) * 100}%`,
                          background: d.id.startsWith('desk-') ? 'linear-gradient(90deg,#b98a12,#fbc94a)'
                            : d.id === 'insp-team' ? 'linear-gradient(90deg,#0f9d8a,#45e0cd)'
                            : d.cluster === 'ops' ? 'linear-gradient(90deg,#c24a0c,#ff8a4c)' : 'linear-gradient(90deg,#2fa9d6,#6cd1f4)',
                        }} />
                    </span>
                    <span className="w-6 text-right font-mono text-[12px] font-bold text-mist-100 tabular">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '200ms' }}>
            <div className="mb-3 flex items-center gap-2">
              <I n="alert" className="h-3.5 w-3.5 text-redx-400" sw={2} />
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Urgent — needs attention</h3>
              <span className="ml-auto rounded bg-redx-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-redx-400 tabular">{urgentOpen.length}</span>
            </div>
            {urgentOpen.length === 0 && (
              <p className="py-6 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-mist-600">Nothing burning — all urgent papers are closed</p>
            )}
            <ul className="space-y-1.5">
              {urgentOpen.map((p) => {
                const d = divById(p.divisionId);
                const isOverdue = p.dueAt != null && p.dueAt < Date.now();
                return (
                  <li key={p.id}>
                    <button onClick={() => openDrawer(p.id)} className="flex w-full items-center gap-3 rounded-md border border-ink-700/70 bg-ink-850/70 px-3 py-2.5 text-left transition hover:border-redx-500/50 hover:bg-ink-800">
                      <span className="font-mono text-[10.5px] font-bold text-redx-400">{p.ref}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-mist-100">{p.title}</span>
                      {d && <DivChip div={d} />}
                      <StageChip stage={p.stage} />
                      <span className="w-10 font-mono text-[10px] font-bold text-mist-300 tabular">{Math.round(p.progress ?? (p.stage === 'completed' ? 100 : 0))}%</span>
                      {isOverdue && <span className="font-mono text-[9.5px] font-bold uppercase text-redx-400">overdue</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '160ms' }}>
          <div className="mb-3 flex items-center gap-2">
            <I n="pulse" className="h-3.5 w-3.5 text-tealx-400" sw={2} />
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Live floor activity</h3>
            <span className="relative ml-auto flex h-2 w-2">
              <span className="absolute h-2 w-2 rounded-full bg-greenx-500" style={{ animation: 'softPing 1.8s ease-out infinite' }} />
              <span className="h-2 w-2 rounded-full bg-greenx-500" />
            </span>
          </div>
          <ol className="scroll-slim max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {activities.slice(0, 14).map((a) => {
              const m = ACT_META[a.type];
              return (
                <li key={a.id} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ink-600 bg-ink-850" style={{ color: m.color }}>
                    <I n={m.icon} className="h-3 w-3" sw={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => openDrawer(a.docId)} className="block max-w-full truncate text-left font-mono text-[10px] font-bold tracking-wider text-cyanx-400 hover:text-cyanx-300">{a.ref}</button>
                    <p className="text-[12.5px] leading-snug text-mist-200"><b className="text-mist-100">{a.byName}</b> — {a.text}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-600">{timeAgo(a.at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <button onClick={() => go('activity')} className="mt-3 w-full rounded-md border border-ink-600 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400 transition hover:border-cyanx-500/60 hover:text-cyanx-400">
            Full activity log →
          </button>
        </section>
      </div>

      <div className="anim-fade-up mt-4 grid gap-3 sm:grid-cols-2" style={{ animationDelay: '260ms' }}>
        {(['u-sup1', 'u-sup2'] as const).map((supId) => {
          const su = db.users.find((x) => x.id === supId);
          return (
            <div key={supId} className="flex items-center gap-4 rounded-lg border border-ink-700 bg-ink-900/80 p-4">
              <Avatar name={su?.name ?? 'Officer'} size="lg" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-mist-100">
                  {su?.name}
                  {user.id === supId && <span className="ml-2 rounded bg-greenx-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-greenx-500">you · on duty</span>}
                </p>
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-mist-500">{su?.title ?? 'CGPP Department Head II'}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------ documents register */
export function DocumentsPage() {
  const { user, visiblePapers, ui, openDrawer, setNewOpen, setReportOpen } = useStore();
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [divF, setDivF] = useState<'all' | string>('all');
  const [kindF, setKindF] = useState<'all' | Kind>('all');
  const isSup = user?.role !== 'division' && user?.role !== 'employee' && user?.role !== 'joborder';

  const rows = useMemo(() => {
    const q = ui.search.trim().toLowerCase();
    return visiblePapers.filter((p) => {
      if (stage !== 'all' && p.stage !== stage) return false;
      if (divF !== 'all' && p.divisionId !== divF) return false;
      if (kindF !== 'all' && p.kind !== kindF) return false;
      if (!q) return true;
      return `${p.ref} ${p.title} ${p.origin} ${divById(p.divisionId)?.name ?? ''}`.toLowerCase().includes(q);
    });
  }, [visiblePapers, stage, divF, kindF, ui.search]);

  return (
    <div>
      <PageHead
        kicker="Register"
        title="Documents"
        sub={`Every paper ${isSup ? 'on record' : 'within your scope'} — filter, open, print.`}
        right={
          <>
            <button className="btn btn-ghost" onClick={() => setReportOpen(true, { presetDiv: divF })}>
              <I n="printer" className="h-4 w-4" sw={2} /> Routing report
            </button>
            <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
              <I n="plus" className="h-4 w-4" sw={2.2} /> Log paperwork
            </button>
          </>
        }
      />

      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-2">
        <select className="field w-auto" value={stage} onChange={(e) => setStage(e.target.value as 'all' | Stage)}>
          <option value="all">All stages</option>
          {STAGES.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
        </select>
        {isSup && (
          <select className="field w-auto" value={divF} onChange={(e) => setDivF(e.target.value)}>
            <option value="all">All recipients</option>
            {ALL_UNITS.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        )}
        <select className="field w-auto" value={kindF} onChange={(e) => setKindF(e.target.value as 'all' | Kind)}>
          <option value="all">All kinds</option>
          {Object.entries(KINDS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500">{rows.length} record{rows.length === 1 ? '' : 's'}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="inbox" title="No documents match" sub="Loosen the filters or log new paperwork." />
      ) : (
        <div className="anim-fade-up overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-ink-700 font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">
                  <th className="px-4 py-2.5 font-semibold">Ref</th>
                  <th className="px-3 py-2.5 font-semibold">Document</th>
                  <th className="px-3 py-2.5 font-semibold">Holder</th>
                  <th className="px-3 py-2.5 font-semibold">Stage</th>
                  <th className="px-3 py-2.5 font-semibold w-40">Completion</th>
                  <th className="px-3 py-2.5 font-semibold">Updated</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => {
                  const d = divById(p.divisionId);
                  const pct = Math.round(p.progress ?? (p.stage === 'completed' ? 100 : 0));
                  return (
                    <tr key={p.id} className="anim-fade-up cursor-pointer border-b border-ink-700/60 transition hover:bg-ink-800/50" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} onClick={() => openDrawer(p.id)}>
                      <td className="px-4 py-3 font-mono text-[10.5px] font-bold text-cyanx-400">{p.ref}</td>
                      <td className="px-3 py-3">
                        <p className="truncate text-[13px] font-semibold text-mist-100">{p.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-mist-500">
                          <KindTag kind={p.kind} /> {p.origin}
                        </p>
                      </td>
                      <td className="px-3 py-3">{d && <DivChip div={d} />}</td>
                      <td className="px-3 py-3"><StageChip stage={p.stage} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <MiniBar v={pct} w="w-24" />
                          <span className="font-mono text-[10.5px] font-bold text-mist-200 tabular">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[9.5px] uppercase tracking-wider text-mist-500">{timeAgo(p.updatedAt)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider text-mist-400">→</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------ divisions directory */
const CU_ICON: Record<string, IconName> = { 'insp-team': 'shield', it: 'pulse', docmon: 'cam', subay: 'bell' };
const CU_TINT: Record<string, string> = { 'insp-team': '#2dd4bf', it: '#6cd1f4', docmon: '#f5b924', subay: '#ff8a4c' };

export function DivisionsPage() {
  const { db, go, setDivFilter } = useStore();
  const card = (d: (typeof DIVISIONS)[number]) => {
    const open = db.papers.filter((p) => p.divisionId === d.id && p.stage !== 'completed').length;
    const done = db.papers.filter((p) => p.divisionId === d.id && p.stage === 'completed').length;
    return (
      <button key={d.id} onClick={() => { setDivFilter(d.id); go('board'); }}
        className="flex w-full items-center gap-4 rounded-lg border border-ink-700 bg-ink-900/80 p-4 text-left transition hover:border-cyanx-500/50 hover:bg-ink-800/70">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-ink-600 bg-ink-850 text-cyanx-400">
          <I n={d.cluster === 'ops' ? 'wrench' : 'file'} className="h-5 w-5" sw={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-[16px] font-bold uppercase tracking-wide text-mist-50">{d.name}</span>
            <DivChip div={d} />
          </span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-mist-400">{d.desc}</span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-mist-500">Head: {d.head}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-display text-[24px] font-bold leading-none text-cyanx-400 tabular">{open}</span>
          <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-500">open · {done} closed</span>
        </span>
      </button>
    );
  };

  return (
    <div>
      <PageHead kicker="Organization" title="Divisions & units" sub="Nine divisions, four cross-division units and the two executive desks — every one a routable recipient. Click any card to open its board." />
      {(['ops', 'tech'] as const).map((cl) => (
        <section key={cl} className="anim-fade-up mb-6">
          <div className="mb-3 flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${cl === 'ops' ? 'bg-flare-500' : 'bg-cyanx-500'}`} style={{ boxShadow: cl === 'ops' ? '0 0 10px #ff6b1c88' : '0 0 10px #56c8f088' }} />
            <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">
              {cl === 'ops' ? 'Field operations' : 'Technical services'}
            </h2>
            <span className="rounded-sm bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mist-400">
              {DIVISIONS.filter((d) => d.cluster === cl).length} divisions
            </span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">{DIVISIONS.filter((d) => d.cluster === cl).map(card)}</div>
        </section>
      ))}

      <section className="anim-fade-up mb-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-tealx-500" style={{ boxShadow: '0 0 10px #2dd4bf88' }} />
          <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Cross-division units</h2>
          <span className="rounded-sm bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mist-400">{CROSS_UNITS.length}</span>
          <span className="h-px flex-1 bg-ink-700" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {CROSS_UNITS.map((cu) => {
            const tint = CU_TINT[cu.id] ?? '#2dd4bf';
            const open = db.papers.filter((p) => p.divisionId === cu.id && p.stage !== 'completed').length;
            const done = db.papers.filter((p) => p.divisionId === cu.id && p.stage === 'completed').length;
            return (
              <button key={cu.id} onClick={() => { setDivFilter(cu.id); go('board'); }}
                className="flex w-full items-center gap-4 rounded-lg bg-ink-900/80 p-4 text-left transition hover:bg-ink-800/70"
                style={{ border: `1px solid ${tint}59` }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md" style={{ border: `1px solid ${tint}80`, background: `${tint}1a`, color: tint }}>
                  <I n={CU_ICON[cu.id] ?? 'shield'} className="h-5 w-5" sw={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-[16px] font-bold uppercase tracking-wide text-mist-50">{cu.name}</span>
                    <span className="rounded-sm px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider" style={{ border: `1px solid ${tint}80`, background: `${tint}1a`, color: tint }}>{cu.code}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-mist-400">{cu.desc}</span>
                  <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-mist-500">
                    <I n="users" className="h-3 w-3" sw={2} /> Headed by {cu.head || 'the Office of the City Engineer'}
                    {cu.headUser === 'u-sup2' && (
                      <span className="rounded-sm border border-amberx-500/50 bg-amberx-500/12 px-1 py-px font-mono text-[7.5px] font-bold uppercase tracking-wider text-amberx-400">Asst. City Engineer</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[24px] font-bold leading-none tabular" style={{ color: tint }}>{open}</span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-500">open · {done} closed</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="anim-fade-up">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-amberx-400" style={{ boxShadow: '0 0 10px #fbc94a88' }} />
          <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Executive desks</h2>
          <span className="h-px flex-1 bg-ink-700" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">{DESKS.map(card)}</div>
      </section>
    </div>
  );
}

/* ------------------------------------------------ activity log */
export function ActivityPage() {
  const { activities, openDrawer, user, db } = useStore();
  const [divF, setDivF] = useState<'all' | string>('all');
  const isSup = user?.role === 'admin' || user?.role === 'supervisor';

  const filtered = useMemo(() => {
    if (divF === 'all') return activities;
    const touched = new Set<string>();
    for (const p of db.papers) {
      const hit = p.divisionId === divF || p.intendedId === divF || (p.recipientIds ?? []).includes(divF) ||
        p.custody.some((e) => e.toDivisionId === divF || e.fromDivisionId === divF);
      if (hit) touched.add(p.id);
    }
    return activities.filter((a) => touched.has(a.docId));
  }, [activities, db.papers, divF]);

  const groups = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of filtered) {
      const k = dayLabel(a.at);
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.entries()];
  }, [filtered]);

  const META: Record<Activity['type'], { icon: IconName; color: string; label: string }> = {
    create: { icon: 'plus', color: '#56c8f0', label: 'Logged' },
    move: { icon: 'send', color: '#f5b924', label: 'Moved' },
    route: { icon: 'route', color: '#ff8a4c', label: 'Routed' },
    note: { icon: 'note', color: '#86a2be', label: 'Remark' },
    attach: { icon: 'clip', color: '#2dd4bf', label: 'Attached' },
    complete: { icon: 'checkc', color: '#45d483', label: 'Completed' },
  };

  return (
    <div>
      <PageHead kicker="Audit" title="Activity log" sub="Every movement of every paper across the office floor, newest first." />
      {isSup && (
        <div className="anim-fade-up mb-4">
          <select className="field w-auto" value={divF} onChange={(e) => setDivF(e.target.value)}>
            <option value="all">All desks</option>
            {ALL_UNITS.map((d) => (<option key={d.id} value={d.id}>{d.code} · {d.name}</option>))}
          </select>
        </div>
      )}
      {groups.length === 0 && <EmptyState icon="pulse" title="No activity in scope" />}
      <div className="space-y-6">
        {groups.map(([day, list]) => (
          <section key={day} className="anim-fade-up">
            <div className="mb-2.5 flex items-center gap-3">
              <h3 className="font-display text-[17px] font-bold uppercase tracking-wider text-mist-200">{day}</h3>
              <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] font-bold text-mist-400 tabular">{list.length}</span>
              <span className="h-px flex-1 bg-ink-700" />
            </div>
            <ol className="space-y-1.5">
              {list.map((a) => {
                const m = META[a.type];
                return (
                  <li key={a.id}>
                    <button onClick={() => openDrawer(a.docId)} className="flex w-full items-center gap-3 rounded-md border border-ink-700/70 bg-ink-900/70 px-3 py-2.5 text-left transition hover:border-ink-500 hover:bg-ink-800/70">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-600 bg-ink-850" style={{ color: m.color }}>
                        <I n={m.icon} className="h-3.5 w-3.5" sw={2.2} />
                      </span>
                      <span className="w-24 shrink-0 font-mono text-[10px] font-bold tracking-wider text-cyanx-400">{a.ref}</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-mist-200"><b className="text-mist-100">{a.byName}</b> — {a.text}</span>
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-mist-600">{m.label} · {new Date(a.at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------ users & accounts (admin) */
const ROLE_CHIP: Record<Role, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#fbc94a' },
  supervisor: { label: 'Dept. Head', color: '#ff8a4c' },
  moderator: { label: 'Moderator', color: '#a78bfa' },
  division: { label: 'Div. Head', color: '#56c8f0' },
  employee: { label: 'Employee', color: '#45e0cd' },
  joborder: { label: 'Job-Order', color: '#f5b924' },
};
const STATUS_CHIP: Record<UserStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#45d483' },
  pending: { label: 'Pending', color: '#f5b924' },
  disabled: { label: 'Disabled', color: '#f4645c' },
};

function EditUserModal({ target, onClose }: { target: User; onClose: () => void }) {
  const { updateUser } = useStore();
  const [name, setName] = useState(target.name);
  const [title, setTitle] = useState(target.title);
  const [role, setRole] = useState<Role>(target.role);
  const [divisionId, setDivisionId] = useState(target.divisionId ?? '');
  const [status, setStatus] = useState<UserStatus>(target.status);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(target.phone ?? '');
  const [address, setAddress] = useState(target.address ?? '');
  const [email, setEmail] = useState(target.email ?? '');
  const [err, setErr] = useState('');

  const needsDivision = role === 'division' || role === 'employee' || role === 'joborder';
  const divEditable = needsDivision || role === 'moderator';

  const save = () => {
    if (name.trim().length < 3) return setErr('Full name is required (min. 3 characters).');
    if (needsDivision && !divisionId) return setErr('A division / team assignment is required for this role.');
    if (password && password.length < 6) return setErr('New password must be at least 6 characters — or leave blank to keep the current one.');
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('That email address does not look valid.');
    const divPatch = needsDivision ? divisionId : divisionId === '' ? (target.divisionId ? '' : undefined) : divisionId;
    updateUser(target.id, {
      name: name.trim(),
      title: title.trim(),
      role,
      ...(divPatch === undefined ? {} : { divisionId: divPatch }),
      status,
      password: password || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      email: email.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[62] flex items-start justify-center overflow-y-auto p-4 sm:p-10">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-lg rounded-xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={target.name} size="lg" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-flare-400">Edit account</p>
            <h3 className="truncate font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">@{target.username}</h3>
          </div>
          <button onClick={onClose} className="ml-auto rounded-md border border-ink-600 p-2 text-mist-400 transition hover:border-redx-500/60 hover:text-redx-400">
            <I n="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Full name</span>
              <input className="field" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Title / designation</span>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Role</span>
              <select className="field" value={role} onChange={(e) => { setRole(e.target.value as Role); setErr(''); }}>
                <option value="division">Division Head</option>
                <option value="employee">Employee</option>
                <option value="joborder">Job-Order</option>
                <option value="moderator">Moderator</option>
                <option value="supervisor">Dept. Head</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Division / team</span>
              <select className="field" value={divisionId} disabled={!divEditable} onChange={(e) => { setDivisionId(e.target.value); setErr(''); }}>
                <option value="">— none —</option>
                {[...DIVISIONS, ...CROSS_UNITS].map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              {!needsDivision && role === 'moderator' && (
                <span className="mt-1 block font-mono text-[8.5px] uppercase tracking-[0.12em] text-mist-600">
                  Optional — anchors the moderator to a home desk for board filters
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Status</span>
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Reset password (optional)</span>
            <input className="field font-mono" type="text" placeholder="Leave blank to keep current password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(''); }} />
          </label>
          <div>
            <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Contact details — captured at account request</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Phone number</span>
                <input className="field font-mono" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(''); }} placeholder="e.g. 0917 000 0000" />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Email address</span>
                <input className="field font-mono" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="e.g. name@ppc.gov.ph" />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Home address</span>
              <input className="field" value={address} onChange={(e) => { setAddress(e.target.value); setErr(''); }} placeholder="e.g. Purok 3, Brgy. San Pedro, Puerto Princesa City" />
            </label>
          </div>
          {err && (
            <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
              <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} /> {err}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}><I n="check" className="h-4 w-4" sw={2.2} /> Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsersPage() {
  const { user, db, approveUser, denyUser, go, approvePasswordReset, updateUser } = useStore();
  const [editing, setEditing] = useState<User | null>(null);
  if (user?.role !== 'admin') return null;

  const pending = db.users.filter((u) => u.status === 'pending');
  const resets = db.users.filter((u) => u.passwordResetAt);

  return (
    <div>
      <PageHead
        kicker="Administrator"
        title="Users & accounts"
        sub="Approve sign-up requests, edit accounts, reset passwords and control who holds a key to the system. Every change is written to the system log."
        right={
          <button className="btn btn-ghost" onClick={() => go('userlogs')}>
            <I n="history" className="h-4 w-4" sw={2} /> User history & logs
          </button>
        }
      />

      {pending.length > 0 && (
        <section className="anim-fade-up mb-5 rounded-lg border border-amberx-500/35 bg-ink-900/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <I n="bell" className="h-4 w-4 text-amberx-400" sw={2} />
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Verification queue</h3>
            <span className="rounded bg-amberx-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amberx-400 tabular">{pending.length} waiting</span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((u) => {
              const div = divById(u.requestedDivisionId ?? u.divisionId ?? '');
              return (
                <div key={u.id} className="anim-pop flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 p-3.5">
                  <Avatar name={u.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-mist-50">{u.name}</p>
                    <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">@{u.username} · requested {u.requestedTitle ?? u.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {div && <DivChip div={div} />}
                      <span className="font-mono text-[9px] uppercase tracking-wider text-mist-600">{u.requestedAt ? timeAgo(u.requestedAt) : ''}</span>
                    </div>
                    {(u.phone || u.email || u.address) && (
                      <p className="mt-1.5 space-y-0.5 border-t border-ink-700/60 pt-1.5 text-[10.5px] leading-snug text-mist-400">
                        {u.phone && <span className="block font-mono">{u.phone}</span>}
                        {u.email && <span className="block truncate font-mono text-cyanx-400/90">{u.email}</span>}
                        {u.address && <span className="block truncate text-mist-500">{u.address}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button onClick={() => approveUser(u.id)} className="btn btn-primary px-3 py-1.5 text-[11.5px]"><I n="check" className="h-3.5 w-3.5" sw={2.4} /> Approve</button>
                    <button onClick={() => denyUser(u.id)} className="btn btn-ghost px-3 py-1.5 text-[11.5px] hover:border-redx-500/60 hover:text-redx-400"><I n="x" className="h-3.5 w-3.5" sw={2.4} /> Deny</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {resets.length > 0 && (
        <section className="anim-fade-up mb-5 rounded-lg border border-redx-500/35 bg-ink-900/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <I n="lock" className="h-4 w-4 text-redx-400" sw={2} />
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Password reset requests</h3>
            <span className="rounded bg-redx-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-redx-400 tabular">{resets.length}</span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {resets.map((u) => (
              <div key={u.id} className="anim-pop flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 p-3.5">
                <Avatar name={u.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-mist-50">{u.name}</p>
                  <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">@{u.username} · asked {u.passwordResetAt ? timeAgo(u.passwordResetAt) : ''}</p>
                  <p className="mt-0.5 text-[11px] text-mist-400">Approving resets the password to <b className="font-mono text-mist-200">123456</b>.</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button onClick={() => approvePasswordReset(u.id)} className="btn btn-primary px-3 py-1.5 text-[11.5px]"><I n="check" className="h-3.5 w-3.5" sw={2.4} /> Reset to 123456</button>
                  <button onClick={() => updateUser(u.id, { passwordResetAt: undefined })} className="btn btn-ghost px-3 py-1.5 text-[11.5px]">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="anim-fade-up overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-3">
          <I n="users" className="h-3.5 w-3.5 text-cyanx-400" sw={2} />
          <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Account register</h3>
          <span className="rounded bg-ink-700 px-2 py-0.5 font-mono text-[10px] font-bold text-mist-200 tabular">{db.users.length}</span>
        </div>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-ink-700 font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">
                <th className="px-4 py-2.5 font-semibold">Officer</th>
                <th className="px-3 py-2.5 font-semibold">Role</th>
                <th className="px-3 py-2.5 font-semibold">Division / team</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Last event</th>
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {db.users.map((u, i) => {
                const div = u.divisionId ? divById(u.divisionId) : undefined;
                const onDuty = db.session === u.id;
                const lastEvent = db.logs.find((l) => l.userId === u.id);
                const rc = ROLE_CHIP[u.role];
                const sc = STATUS_CHIP[u.status];
                return (
                  <tr key={u.id} className="anim-fade-up border-b border-ink-700/60 transition hover:bg-ink-800/50" style={{ animationDelay: `${Math.min(i, 14) * 30}ms` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={u.name} />
                          {onDuty && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-greenx-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-mist-100">{u.name}</p>
                          <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">@{u.username} · {u.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: rc.color, background: `${rc.color}1a`, border: `1px solid ${rc.color}55` }}>{rc.label}</span>
                    </td>
                    <td className="px-3 py-3">{div ? <DivChip div={div} /> : <span className="font-mono text-[9.5px] uppercase tracking-wider text-mist-600">—</span>}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: sc.color, background: `${sc.color}14`, border: `1px solid ${sc.color}50` }}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-greenx-500' : u.status === 'pending' ? 'bg-amberx-500' : 'bg-redx-500'}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
                      {lastEvent ? `${lastEvent.type} · ${timeAgo(lastEvent.at)}` : 'no activity yet'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id === user.id ? (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-mist-600">this is you</span>
                      ) : (
                        <button onClick={() => setEditing(u)} className="btn btn-ghost px-3 py-1.5 text-[11px]"><I n="wrench" className="h-3.5 w-3.5" sw={2} /> Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <EditUserModal target={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ------------------------------------------------ personnel boards (admin / execs / moderator) */
export function PersonnelPage() {
  const { db, user, openDrawer, returnToEmployee } = useStore();
  const employees = useMemo(
    () => db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && u.status !== 'disabled').sort((a, b) => a.name.localeCompare(b.name)),
    [db.users]
  );
  const [sel, setSel] = useState<string | null>(employees[0]?.id ?? null);
  if (user?.role !== 'admin' && user?.role !== 'supervisor' && user?.role !== 'moderator') return null;

  const papersOf = (id: string) => db.papers.filter((p) => (p.assignees ?? []).includes(id));
  const selected = employees.find((e) => e.id === sel) ?? employees[0] ?? null;
  const selPapers = selected ? papersOf(selected.id) : [];
  const selDiv = selected?.divisionId ? divById(selected.divisionId) : undefined;

  const totalOpen = employees.reduce((a, e) => a + papersOf(e.id).filter((p) => p.stage !== 'completed').length, 0);
  const totalReview = employees.reduce((a, e) => a + papersOf(e.id).filter((p) => p.pendingHeadReview && p.stage !== 'completed').length, 0);
  const week = Date.now() - 7 * 864e5;
  const totalDone = employees.reduce((a, e) => a + papersOf(e.id).filter((p) => p.stage === 'completed' && p.updatedAt >= week).length, 0);

  const stats = [
    { label: 'Personnel on record', value: employees.length, color: '#45e0cd' },
    { label: 'Open work orders', value: totalOpen, color: '#56c8f0' },
    { label: 'Awaiting head verification', value: totalReview, color: '#f5b924' },
    { label: 'Closed this week', value: totalDone, color: '#45d483' },
  ];

  return (
    <div>
      <PageHead kicker="Admin & executive oversight" title="Personnel boards"
        sub="Every work order designated to an individual, in one place — on top of the division boards. Completion is verified by the division head before a paper can close." />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-mist-500">{s.label}</p>
            <p className="mt-1 font-display text-[40px] font-bold leading-none tabular" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <section className="anim-fade-up self-start rounded-lg border border-ink-700 bg-ink-900/80 p-3" style={{ animationDelay: '120ms' }}>
          <p className="px-1.5 pb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.22em] text-mist-500">Personnel roster · {employees.length}</p>
          <div className="scroll-slim max-h-[62vh] space-y-1.5 overflow-y-auto pr-1">
            {employees.map((e) => {
              const ps = papersOf(e.id);
              const open = ps.filter((p) => p.stage !== 'completed').length;
              const review = ps.filter((p) => p.pendingHeadReview && p.stage !== 'completed').length;
              const avg = ps.length ? Math.round(ps.reduce((a, p) => a + (p.progress ?? (p.stage === 'completed' ? 100 : 0)), 0) / ps.length) : 0;
              const d = e.divisionId ? divById(e.divisionId) : undefined;
              const active = selected?.id === e.id;
              return (
                <button key={e.id} onClick={() => setSel(e.id)}
                  className={`w-full rounded-md border px-2.5 py-2.5 text-left transition ${active ? 'border-tealx-500/60 bg-tealx-500/[0.07]' : 'border-ink-700 bg-ink-850/60 hover:border-ink-500 hover:bg-ink-800/70'}`}>
                  <span className="flex items-center gap-3">
                    <Avatar name={e.name} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-bold ${active ? 'text-tealx-400' : 'text-mist-100'}`}>{e.name}</span>
                      <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-mist-500">{e.title} {d ? `· ${d.code}` : ''}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-[20px] font-bold leading-none text-mist-100 tabular">{open}</span>
                      <span className="block font-mono text-[8px] uppercase tracking-wider text-mist-600">open</span>
                    </span>
                    {review > 0 && <span className="shrink-0 rounded-sm border border-amberx-500/50 bg-amberx-500/12 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-amberx-400">{review} review</span>}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <MiniBar v={avg} />
                    <span className="font-mono text-[9px] font-bold text-mist-400 tabular">{avg}%</span>
                  </span>
                </button>
              );
            })}
            {employees.length === 0 && (
              <p className="px-2 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist-600">No personnel yet — approve sign-ups in Users & Accounts</p>
            )}
          </div>
        </section>

        <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '180ms' }}>
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Avatar name={selected.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">{selected.name}</p>
                  <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-500">{selected.title} · @{selected.username} {selDiv ? `· ${selDiv.name}` : ''}</p>
                </div>
                {selDiv && <DivChip div={selDiv} />}
                <span className="rounded bg-ink-700 px-2 py-1 font-mono text-[10px] font-bold text-mist-200 tabular">{selPapers.length} paper{selPapers.length === 1 ? '' : 's'}</span>
              </div>

              {selPapers.length === 0 ? (
                <EmptyState icon="users" title="No work orders designated" sub="Assign papers to this person from the Tracker Board or any document drawer." />
              ) : (
                <div className="scroll-slim -mx-1 overflow-x-auto px-1 pb-2">
                  <div className="grid min-w-[900px] grid-cols-5 gap-2.5">
                    {STAGES.map((s) => {
                      const list = selPapers.filter((p) => p.stage === s.id);
                      return (
                        <div key={s.id} className="rounded-md border border-ink-700/70 bg-ink-950/40 p-2">
                          <div className="mb-2 flex items-center gap-1.5 px-0.5">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                            <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-mist-400">{s.label}</p>
                            <span className="ml-auto font-mono text-[9px] font-bold text-mist-500 tabular">{list.length}</span>
                          </div>
                          <div className="space-y-2">
                            {list.map((p) => {
                              const pct = Math.round(p.progress ?? (p.stage === 'completed' ? 100 : 0));
                              return (
                                <button key={p.id} onClick={() => openDrawer(p.id)} className="paper-card group relative w-full cursor-pointer overflow-hidden rounded-md p-2.5 pl-3 text-left transition hover:-translate-y-0.5">
                                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: p.priority === 'urgent' ? '#f4645c' : p.priority === 'priority' ? '#f5b924' : '#6684a3' }} />
                                  <p className="font-mono text-[9px] font-bold tracking-wider text-[#5b7089]">{p.ref}</p>
                                  <p className="mt-0.5 line-clamp-2 font-display text-[13.5px] font-bold leading-tight tracking-wide text-[#132437]">{p.title}</p>
                                  <span className="mt-1.5 flex items-center gap-2">
                                    <MiniBar v={pct} />
                                    <span className="shrink-0 font-mono text-[9px] font-bold text-[#5b7089] tabular">{pct}%</span>
                                  </span>
                                </button>
                              );
                            })}
                            {list.length === 0 && (
                              <p className="rounded border border-dashed border-ink-700 px-2 py-3 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-mist-600">clear</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selPapers.filter((p) => p.pendingHeadReview && p.stage !== 'completed').length > 0 && (
                <div className="mt-4 rounded-md border border-amberx-500/40 bg-amberx-500/[0.06] p-3.5">
                  <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amberx-400">
                    <I n="shield" className="h-3.5 w-3.5" sw={2} /> Submitted for verification
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {selPapers.filter((p) => p.pendingHeadReview && p.stage !== 'completed').map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 px-3 py-2.5">
                        <button onClick={() => openDrawer(p.id)} className="min-w-0 flex-1 text-left">
                          <span className="font-mono text-[9.5px] font-bold tracking-wider text-cyanx-400">{p.ref}</span>
                          <span className="block truncate text-[12.5px] font-semibold text-mist-100">{p.title}</span>
                        </button>
                        <button onClick={() => returnToEmployee(p.id)} className="btn btn-ghost px-3 py-1.5 text-[11px]"><I n="history" className="h-3.5 w-3.5" sw={2.2} /> Return</button>
                        <button onClick={() => openDrawer(p.id)} className="btn btn-primary px-3 py-1.5 text-[11px]"><I n="check" className="h-3.5 w-3.5" sw={2.4} /> Verify</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState icon="users" title="No personnel selected" />
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------ user history & system logs (admin) */
const LOG_META: Record<string, { icon: IconName; color: string; label: string }> = {
  login: { icon: 'user', color: '#56c8f0', label: 'Sign-in' },
  logout: { icon: 'out', color: '#6684a3', label: 'Sign-out' },
  create: { icon: 'plus', color: '#2dd4bf', label: 'Created' },
  stage: { icon: 'send', color: '#f5b924', label: 'Stage' },
  route: { icon: 'route', color: '#ff8a4c', label: 'Routed' },
  note: { icon: 'note', color: '#86a2be', label: 'Remark' },
  attachment: { icon: 'clip', color: '#45e0cd', label: 'Attached' },
  signup: { icon: 'user', color: '#a78bfa', label: 'Sign-up' },
  approve: { icon: 'checkc', color: '#45d483', label: 'Approved' },
  deny: { icon: 'x', color: '#f4645c', label: 'Denied' },
  edit: { icon: 'wrench', color: '#fbc94a', label: 'Edited' },
  profile: { icon: 'lock', color: '#6cd1f4', label: 'Profile' },
  resetreq: { icon: 'lock', color: '#f5b924', label: 'Reset req.' },
  reset: { icon: 'refresh', color: '#ff8a4c', label: 'Reset' },
  delete: { icon: 'trash', color: '#f4645c', label: 'Deleted' },
};

function PrintLogsModal({ rows, onClose }: { rows: { at: number; userName: string; type: string; text: string; ref?: string }[]; onClose: () => void }) {
  return (
    <div className="print-reset fixed inset-0 z-[68] overflow-y-auto">
      <div className="no-print fixed inset-0 bg-ink-950/85 backdrop-blur-sm" onClick={onClose} />
      <div className="print-reset relative mx-auto my-6 w-[min(860px,94vw)]">
        <div className="no-print anim-fade-up mb-3 flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/95 px-3 py-2.5 shadow-xl">
          <I n="history" className="h-4 w-4 text-flare-400" sw={2} />
          <span className="mr-1 font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">History log · {rows.length} entries</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost py-1.5" onClick={onClose}>Close</button>
            <button className="btn btn-primary py-1.5" onClick={() => window.print()}><I n="printer" className="h-4 w-4" sw={2.2} /> Print / Save PDF</button>
          </div>
        </div>
        <div className="print-sheet anim-pop scroll-slim max-h-[80vh] overflow-y-auto rounded-md bg-white text-[#182a3e] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)]">
          <div className="px-9 py-8">
            <div className="border-b-[3px] border-[#182a3e] pb-3 text-center">
              <p className="font-display text-[22px] font-bold uppercase tracking-wide">City of Puerto Princesa — Office of the City Engineer</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#5b7089]">CEO Flow · System activity & user history log · {new Date().toLocaleString('en-PH')}</p>
            </div>
            <table className="mt-4 w-full border-collapse text-[10.5px] leading-snug">
              <thead>
                <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                  <th className="py-1.5 pr-2">When</th>
                  <th className="py-1.5 pr-2">Officer</th>
                  <th className="py-1.5 pr-2">Event</th>
                  <th className="py-1.5 pr-2">Detail</th>
                  <th className="py-1.5">Ref</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const m = LOG_META[r.type] ?? LOG_META.note;
                  return (
                    <tr key={i} className="border-b border-[#dde5ee] align-top">
                      <td className="py-1.5 pr-2 font-mono text-[9px] whitespace-nowrap">{new Date(r.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                      <td className="py-1.5 pr-2 font-semibold whitespace-nowrap">{r.userName}</td>
                      <td className="py-1.5 pr-2 font-mono text-[9px] uppercase" style={{ color: m.color }}>{m.label}</td>
                      <td className="py-1.5 pr-2">{r.text}</td>
                      <td className="py-1.5 font-mono text-[9px]">{r.ref ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-6 border-t border-[#dde5ee] pt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#8a9ab0]">Generated by CEO Flow · confidential system record</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogsPage() {
  const { db, user, openDrawer } = useStore();
  const [userF, setUserF] = useState<'all' | string>('all');
  const [scope, setScope] = useState<'all' | 'access' | 'workflow'>('all');
  const [printOpen, setPrintOpen] = useState(false);
  if (user?.role !== 'admin') return null;

  const ACCESS: string[] = ['login', 'logout', 'signup', 'approve', 'deny', 'edit', 'profile', 'resetreq', 'reset'];

  const filtered = useMemo(() => {
    return db.logs.filter((l) => {
      if (userF !== 'all' && l.userId !== userF) return false;
      if (scope === 'access' && !ACCESS.includes(l.type)) return false;
      if (scope === 'workflow' && ACCESS.includes(l.type)) return false;
      return true;
    });
  }, [db.logs, userF, scope]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const l of filtered) {
      const k = dayLabel(l.at);
      m.set(k, [...(m.get(k) ?? []), l]);
    }
    return [...m.entries()];
  }, [filtered]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const stats = [
    { label: 'Accounts on record', value: db.users.length, color: '#56c8f0' },
    { label: 'Sign-ins today', value: db.logs.filter((l) => l.type === 'login' && l.at >= today.getTime()).length, color: '#45d483' },
    { label: 'Events · last 7 days', value: db.logs.filter((l) => l.at >= Date.now() - 7 * 864e5).length, color: '#ff8a4c' },
    { label: 'Pending requests', value: db.users.filter((u) => u.status === 'pending' || u.passwordResetAt).length, color: '#f5b924' },
  ];

  return (
    <div>
      <PageHead kicker="Administrator" title="User history & logs" sub="The full system ledger — every sign-in, every movement, every account change, attributed and timestamped."
        right={
          <button className="btn btn-primary" onClick={() => setPrintOpen(true)} disabled={filtered.length === 0}>
            <I n="printer" className="h-4 w-4" sw={2.2} /> Print history log
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-mist-500">{s.label}</p>
            <p className="mt-1 font-display text-[40px] font-bold leading-none tabular" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-2">
        <select className="field w-auto" value={userF} onChange={(e) => setUserF(e.target.value)}>
          <option value="all">All officers</option>
          {db.users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
        </select>
        <div className="flex overflow-hidden rounded-md border border-ink-600">
          {(['all', 'access', 'workflow'] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)}
              className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${scope === s ? 'bg-cyanx-500/15 text-cyanx-400' : 'bg-ink-850 text-mist-500 hover:text-mist-200'}`}>
              {s === 'all' ? 'Everything' : s === 'access' ? 'Access only' : 'Workflow only'}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500">{filtered.length} entries</span>
      </div>

      {groups.length === 0 && <EmptyState icon="history" title="No log entries match" sub="Adjust the officer or event-scope filters." />}
      <div className="space-y-6">
        {groups.map(([day, list]) => (
          <section key={day} className="anim-fade-up">
            <div className="mb-2.5 flex items-center gap-3">
              <h3 className="font-display text-[17px] font-bold uppercase tracking-wider text-mist-200">{day}</h3>
              <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] font-bold text-mist-400 tabular">{list.length}</span>
              <span className="h-px flex-1 bg-ink-700" />
            </div>
            <ol className="space-y-1.5">
              {list.map((l) => {
                const m = LOG_META[l.type] ?? LOG_META.note;
                return (
                  <li key={l.id} className={`flex items-center gap-3 rounded-md border border-ink-700/70 bg-ink-900/70 px-3 py-2.5 ${l.docId ? 'cursor-pointer transition hover:border-ink-500 hover:bg-ink-800/70' : ''}`}
                    onClick={() => l.docId && openDrawer(l.docId)}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-600 bg-ink-850" style={{ color: m.color }}>
                      <I n={m.icon} className="h-3.5 w-3.5" sw={2.2} />
                    </span>
                    <span className="w-40 shrink-0 truncate text-[12.5px] font-bold text-mist-100">{l.userName}</span>
                    <span className="w-20 shrink-0 rounded-sm px-1.5 py-0.5 text-center font-mono text-[8.5px] font-bold uppercase tracking-wider" style={{ color: m.color, background: `${m.color}14`, border: `1px solid ${m.color}40` }}>{m.label}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-mist-300">{l.text}</span>
                    {l.ref && <span className="shrink-0 font-mono text-[9.5px] font-bold text-cyanx-400">{l.ref}</span>}
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-mist-600">{new Date(l.at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {printOpen && <PrintLogsModal rows={filtered} onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
