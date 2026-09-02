import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore, MSG_EDIT_WINDOW } from '../lib/store';
import type { Activity, Channel, DivInfo, Kind, Message, Paper, Role, Stage, User, UserStatus } from '../lib/core';
import { ALL_UNITS, CROSS_UNITS, DESKS, DIVISIONS, KINDS, STAGES, divById, dayLabel, fmtDT, fmtPct, stageMeta, timeAgo, extractBarangays } from '../lib/core';
import { I, Avatar, DivChip, StageChip, KindTag, PageHead, Section, EmptyState, ProgressBar, SearchSelect, type IconName, type SearchOption } from './ui';

const unitOptions = (allLabel: string): SearchOption[] => [
  { value: 'all', label: allLabel },
  ...DESKS.map((d) => ({ value: d.id, label: d.name, sub: d.code, group: 'Executive desks' })),
  ...DIVISIONS.map((d) => ({ value: d.id, label: d.name, sub: d.code, group: d.cluster === 'ops' ? 'Field operations' : 'Technical services' })),
  ...CROSS_UNITS.map((d) => ({ value: d.id, label: d.name, sub: d.code, group: 'Cross-division units' })),
];

/* ------------------------------------------------ dashboard */
export function Dashboard() {
  const { db, user, activities, go, setDivFilter, openDrawer, setNewOpen, divOf } = useStore();
  if (!user) return null;
  const papers = db.papers;
  const open = papers.filter((p) => p.stage !== 'completed');
  const inQueue = papers.filter((p) => p.stage === 'received' || p.stage === 'review').length;
  const working = papers.filter((p) => p.stage === 'progress' || p.stage === 'verification').length;
  const week = Date.now() - 7 * 864e5;
  const doneWeek = papers.filter((p) => p.stage === 'completed' && p.updatedAt >= week).length;
  const urgentOpen = open.filter((p) => p.priority === 'urgent');
  const overdueOpen = open
    .filter((p) => p.dueAt != null && p.dueAt < Date.now())
    .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
  const daysOver = (dueAt: number) => Math.max(1, Math.ceil((Date.now() - dueAt) / 864e5));
  const load = ALL_UNITS.map((d) => ({ d: divOf(d.id)!, n: open.filter((p) => p.divisionId === d.id).length }));
  const maxLoad = Math.max(1, ...load.map((l) => l.n));

  const stats: { label: string; value: number; hint: string; color: string; icon: IconName }[] = [
    { label: 'In intake trays', value: inQueue, hint: 'Received + under review', color: '#56c8f0', icon: 'inbox' },
    { label: 'Being worked', value: working, hint: 'In progress + verification', color: '#ff8a4c', icon: 'wrench' },
    { label: 'Closed this week', value: doneWeek, hint: 'Completed, last 7 days', color: '#45d483', icon: 'checkc' },
    { label: 'Urgent open', value: urgentOpen.length, hint: 'Needs a department head eye', color: '#f4645c', icon: 'alert' },
    { label: 'Overdue', value: overdueOpen.length, hint: 'Past deadline — act now', color: '#f5b924', icon: 'clock' },
  ];

  const ACT_META: Record<Activity['type'], { icon: IconName; color: string }> = {
    create: { icon: 'plus', color: '#56c8f0' }, move: { icon: 'send', color: '#f5b924' },
    route: { icon: 'route', color: '#ff8a4c' }, note: { icon: 'note', color: '#86a2be' },
    attach: { icon: 'clip', color: '#2dd4bf' }, complete: { icon: 'checkc', color: '#45d483' },
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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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
                const d = divOf(p.divisionId);
                const isOverdue = p.dueAt != null && p.dueAt < Date.now();
                return (
                  <li key={p.id}>
                    <button onClick={() => openDrawer(p.id)} className="flex w-full items-center gap-3 rounded-md border border-ink-700/70 bg-ink-850/70 px-3 py-2.5 text-left transition hover:border-redx-500/50 hover:bg-ink-800">
                      <span className="font-mono text-[10.5px] font-bold text-redx-400">{p.ref}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-mist-100">{p.title}</span>
                      {d && <DivChip div={d} />}
                      <StageChip stage={p.stage} />
                      <span className="w-10 font-mono text-[10px] font-bold text-mist-300 tabular">{fmtPct(p.progress ?? (p.stage === 'completed' ? 100 : 0))}%</span>
                      {isOverdue && <span className="font-mono text-[9.5px] font-bold uppercase text-redx-400">overdue</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* overdue — past deadline */}
          <section className="anim-fade-up relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center gap-2 border-b border-ink-700/70 px-4 py-3">
              <I n="clock" className="h-3.5 w-3.5 text-amberx-400" sw={2} />
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Overdue — past deadline</h3>
              <span
                className={`anim-badge ml-auto rounded px-2 py-0.5 font-mono text-[10px] font-bold tabular ${
                  overdueOpen.length > 0 ? 'bg-amberx-500/20 text-amberx-400' : 'bg-ink-700 text-mist-500'
                }`}
              >
                {overdueOpen.length}
              </span>
            </div>
            {overdueOpen.length === 0 ? (
              <p className="px-4 py-5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist-600">
                All deadlines are being met — nothing is overdue
              </p>
            ) : (
              <ul className="divide-y divide-ink-700/60">
                {overdueOpen.map((p) => {
                  const d = divOf(p.divisionId);
                  const n = daysOver(p.dueAt ?? Date.now());
                  return (
                    <li key={p.id} className="relative">
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-amberx-500 to-flare-600" />
                      <button onClick={() => openDrawer(p.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-ink-800/70">
                        <span className="font-mono text-[10.5px] font-bold text-amberx-400">{p.ref}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-mist-100">{p.title}</span>
                        {d && <DivChip div={d} />}
                        <StageChip stage={p.stage} />
                        <span
                          className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                            n >= 3 ? 'bg-redx-500/15 text-redx-400' : 'bg-amberx-500/15 text-amberx-400'
                          }`}
                          title={`Due ${new Date(p.dueAt ?? Date.now()).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`}
                        >
                          {n} day{n === 1 ? '' : 's'} late
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
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
  const { user, me, visiblePapers, openDrawer, setNewOpen, setReportOpen } = useStore();
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [divF, setDivF] = useState<'all' | string>('all');
  const [kindF, setKindF] = useState<'all' | Kind>('all');
  const [q, setQ] = useState('');
  const isSup = me?.role === 'admin' || me?.role === 'supervisor' || me?.role === 'moderator' || me?.role === 'operator';

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return visiblePapers.filter((p) => {
      if (stage !== 'all' && p.stage !== stage) return false;
      if (divF !== 'all' && p.divisionId !== divF) return false;
      if (kindF !== 'all' && p.kind !== kindF) return false;
      if (!ql) return true;
      return `${p.ref} ${p.title} ${p.origin} ${divById(p.divisionId)?.name ?? ''}`.toLowerCase().includes(ql);
    });
  }, [visiblePapers, stage, divF, kindF, q]);

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

      <div className="anim-fade-up scroll-slim mb-4 flex flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-ink-700/70 bg-ink-900/55 px-3 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5 pr-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-mist-500">
          <I n="file" className="h-3 w-3" sw={2.2} /> Filter
        </span>
        <div className="relative w-64 shrink-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500"><I n="search" className="h-3.5 w-3.5" /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, title, origin…"
            title="Search by: paper reference (OCE-2026-…), title, origin, or division name"
            className="field w-64 py-1.5 pl-9 font-mono text-[11.5px]" />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-mist-500 transition hover:text-redx-400" title="Clear search">
              <I n="x" className="h-3 w-3" sw={2.6} />
            </button>
          )}
        </div>
        {isSup && <SearchSelect value={divF} onChange={setDivF} options={unitOptions('All recipients')} width="w-48" placeholder="All recipients" />}
        <SearchSelect value={stage} onChange={(v) => setStage(v as 'all' | Stage)} width="w-40"
          options={[{ value: 'all', label: 'All stages' }, ...STAGES.map((s) => ({ value: s.id, label: s.label, sub: s.hint }))]} />
        <SearchSelect value={kindF} onChange={(v) => setKindF(v as 'all' | Kind)} width="w-36"
          options={[{ value: 'all', label: 'All kinds' }, ...Object.entries(KINDS).map(([k, v]) => ({ value: k, label: v.label, sub: v.short }))]} />
        {(q || stage !== 'all' || divF !== 'all' || kindF !== 'all') && (
          <button onClick={() => { setQ(''); setStage('all'); setDivF('all'); setKindF('all'); }}
            className="btn btn-ghost shrink-0 px-2.5 py-1 text-[11px]">
            <I n="x" className="h-3 w-3" sw={2.4} /> Clear
          </button>
        )}
        <span className="ml-auto shrink-0 rounded bg-ink-800 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-cyanx-400 tabular">
          {rows.length} record{rows.length === 1 ? '' : 's'}
        </span>
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
                  <th className="w-40 px-3 py-2.5 font-semibold">Completion</th>
                  <th className="px-3 py-2.5 font-semibold">Updated</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => {
                  const d = divById(p.divisionId);
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
                          <ProgressBar value={p.progress ?? (p.stage === 'completed' ? 100 : 0)} w="w-24" />
                          <span className="font-mono text-[10.5px] font-bold text-mist-200 tabular">{fmtPct(p.progress ?? (p.stage === 'completed' ? 100 : 0))}%</span>
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

/* ------------------------------------------------ divisions directory + manager */
const CU_ICON: Record<string, IconName> = { 'insp-team': 'shield', it: 'pulse', docmon: 'cam', subay: 'bell' };
const CU_TINT: Record<string, string> = { 'insp-team': '#2dd4bf', it: '#6cd1f4', docmon: '#f5b924', subay: '#ff8a4c' };

function DivisionManager({ divId, onClose }: { divId: string; onClose: () => void }) {
  const { db, user, divOf, updateDivision, setDivisionHead, removeDivisionOIC } = useStore();
  const info = divOf(divId)!;
  const [name, setName] = useState(info.name);
  const [desc, setDesc] = useState(info.desc);
  const [mode, setMode] = useState<'temporary' | 'permanent'>('temporary');
  const [headSel, setHeadSel] = useState('');
  const [note, setNote] = useState('');
  const activeUsers = db.users.filter((u) => u.status === 'active');

  return (
    <div className="fixed inset-0 z-[64] flex items-start justify-center overflow-y-auto p-4 sm:p-10">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-xl rounded-xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-flare-500/50 bg-flare-500/10 text-flare-400">
            <I n="stamp" className="h-5 w-5" sw={1.8} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-flare-400">Division management</p>
            <h3 className="truncate font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">{info.name}</h3>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mist-500">{info.code} · permanent head: {info.head}</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-md border border-ink-600 p-2 text-mist-400 transition hover:border-redx-500/60 hover:text-redx-400">
            <I n="x" className="h-4 w-4" />
          </button>
        </div>

        {info.oicId && (
          <div className="mb-4 flex items-center gap-3 rounded-md border border-amberx-500/45 bg-amberx-500/[0.07] px-3 py-2.5">
            <I n="clock" className="h-4 w-4 shrink-0 text-amberx-400" sw={2} />
            <p className="min-w-0 flex-1 text-[12px] leading-snug text-mist-200">
              <b className="text-amberx-400">{info.oicName}</b> is acting as OIC since {info.oicSince ? fmtDT(info.oicSince) : 'recently'}
              {info.oicNote ? ` — ${info.oicNote}` : ''}. The permanent head is retained for reinstatement.
            </p>
            <button onClick={() => removeDivisionOIC(divId)} className="btn btn-ghost shrink-0 px-3 py-1.5 text-[11px] hover:border-redx-500/60 hover:text-redx-400">
              <I n="history" className="h-3.5 w-3.5" sw={2.2} /> Remove OIC / reinstate head
            </button>
          </div>
        )}

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Division title</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Description</span>
            <textarea className="field" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
          <div className="flex justify-end">
            <button className="btn btn-ghost px-3 py-1.5 text-[11.5px]" onClick={() => updateDivision(divId, { name, desc })}>
              <I n="check" className="h-3.5 w-3.5" sw={2.2} /> Save title & description
            </button>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-850/60 p-3.5">
            <p className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-400">Head assignment</p>
            <div className="flex overflow-hidden rounded-md border border-ink-600">
              {([
                { v: 'temporary', label: 'Temporary / OIC', d: 'acts as head; permanent head retained' },
                { v: 'permanent', label: 'Permanent', d: 'replaces the current head' },
              ] as const).map((m) => (
                <button key={m.v} type="button" onClick={() => setMode(m.v)} title={m.d}
                  className={`flex-1 px-2 py-2 font-mono text-[9.5px] font-bold uppercase tracking-wider transition ${mode === m.v ? 'bg-flare-500/15 text-flare-400' : 'bg-ink-850 text-mist-500 hover:text-mist-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-mist-600">
              {mode === 'temporary' ? 'The OIC runs the division board; they cannot change this title/description.' : 'Appointing a permanent head replaces the current one and clears any OIC.'}
            </p>
            <div className="mt-2.5">
              <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">
                {mode === 'temporary' ? 'Officer to act as OIC' : 'Officer to appoint as permanent head'}
              </span>
              <SearchSelect value={headSel} onChange={setHeadSel} allowClear
                options={activeUsers.map((u) => ({
                  value: u.id, label: u.name,
                  sub: `${u.title}${u.divisionId ? ` · ${divById(u.divisionId)?.code ?? ''}` : ''}`,
                  group: u.role === 'supervisor' || u.role === 'admin' || u.role === 'moderator' ? 'Executive & staff' : u.role === 'division' ? 'Division heads & officers' : 'Personnel',
                }))}
                width="w-full" placeholder="Search an officer…" />
            </div>
            <label className="mt-2.5 block">
              <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">Reason / note (optional)</span>
              <input className="field" placeholder={mode === 'temporary' ? 'e.g. on official leave until Friday' : 'e.g. reassignment order No. 2026-114'} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="mt-3 flex justify-end">
              <button
                className="btn btn-primary px-4 py-1.5 text-[12px]"
                disabled={!headSel}
                onClick={() => { setDivisionHead(divId, headSel, mode === 'temporary', note); onClose(); }}
              >
                <I n="stamp" className="h-3.5 w-3.5" sw={2} />
                {mode === 'temporary' ? 'Designate OIC' : 'Appoint permanent head'}
              </button>
            </div>
          </div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">
            Signed in as {user?.name} — every change is stamped into the system log.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DivisionsPage() {
  const { db, go, setDivFilter, divOf, canManageDivision } = useStore();
  const [managing, setManaging] = useState<string | null>(null);

  const card = (base: (typeof ALL_UNITS)[number], tint?: string, icon?: IconName) => {
    const info: DivInfo = divOf(base.id)!;
    const open = db.papers.filter((p) => p.divisionId === base.id && p.stage !== 'completed').length;
    const done = db.papers.filter((p) => p.divisionId === base.id && p.stage === 'completed').length;
    const accent = tint ?? (base.cluster === 'ops' ? '#ff8a4c' : '#56c8f0');
    const manage = canManageDivision(base.id);
    return (
      <div key={base.id} className="anim-fade-up relative flex flex-col rounded-lg bg-ink-900/80 p-4 transition hover:bg-ink-800/70" style={{ border: `1px solid ${accent}40` }}>
        <button onClick={() => { setDivFilter(base.id); go('board'); }} className="flex w-full items-center gap-4 text-left">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md" style={{ border: `1px solid ${accent}80`, background: `${accent}1a`, color: accent }}>
            <I n={icon ?? (base.cluster === 'ops' ? 'wrench' : 'file')} className="h-5 w-5" sw={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-display text-[16px] font-bold uppercase tracking-wide text-mist-50">{info.name}</span>
              <span className="rounded-sm px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider" style={{ border: `1px solid ${accent}80`, background: `${accent}1a`, color: accent }}>{base.code}</span>
              {info.oicId && (
                <span className="rounded-sm border border-amberx-500/50 bg-amberx-500/12 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-amberx-400">OIC: {info.oicName}</span>
              )}
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-mist-400">{info.desc}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-mist-500">
              <I n="users" className="h-3 w-3" sw={2} /> Head: {info.head}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-display text-[24px] font-bold leading-none tabular" style={{ color: accent }}>{open}</span>
            <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-500">open · {done} closed</span>
          </span>
        </button>
        {manage && (
          <button onClick={() => setManaging(base.id)}
            className="mt-3 inline-flex w-fit items-center gap-1.5 self-end rounded-md border border-flare-500/50 bg-flare-500/10 px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-flare-400 transition hover:bg-flare-500/20">
            <I n="stamp" className="h-3 w-3" sw={2.2} /> Manage · assign OIC
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHead kicker="Organization" title="Divisions & units"
        sub="Nine divisions, four cross-division units and the two executive desks — every one a routable recipient. Heads and executives manage titles, descriptions and OIC succession from here." />
      {(['ops', 'tech'] as const).map((cl) => (
        <section key={cl} className="anim-fade-up mb-6">
          <div className="mb-3 flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${cl === 'ops' ? 'bg-flare-500' : 'bg-cyanx-500'}`} style={{ boxShadow: cl === 'ops' ? '0 0 10px #ff6b1c88' : '0 0 10px #56c8f088' }} />
            <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">{cl === 'ops' ? 'Field operations' : 'Technical services'}</h2>
            <span className="rounded-sm bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mist-400">{DIVISIONS.filter((d) => d.cluster === cl).length} divisions</span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">{DIVISIONS.filter((d) => d.cluster === cl).map((d) => card(d))}</div>
        </section>
      ))}

      <section className="anim-fade-up mb-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-tealx-500" style={{ boxShadow: '0 0 10px #2dd4bf88' }} />
          <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Cross-division units</h2>
          <span className="rounded-sm bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mist-400">{CROSS_UNITS.length}</span>
          <span className="h-px flex-1 bg-ink-700" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">{CROSS_UNITS.map((cu) => card(cu, CU_TINT[cu.id], CU_ICON[cu.id]))}</div>
      </section>

      <section className="anim-fade-up">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-amberx-400" style={{ boxShadow: '0 0 10px #fbc94a88' }} />
          <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Executive desks</h2>
          <span className="h-px flex-1 bg-ink-700" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">{DESKS.map((d) => card(d, '#fbc94a', 'stamp'))}</div>
      </section>

      {managing && <DivisionManager divId={managing} onClose={() => setManaging(null)} />}
    </div>
  );
}

/* ------------------------------------------------ activity log */
function PrintActivityModal({ rows, scopeLabel, onClose }: { rows: Activity[]; scopeLabel: string; onClose: () => void }) {
  const META: Record<Activity['type'], string> = { create: 'Logged', move: 'Moved', route: 'Routed', note: 'Remark', attach: 'Attached', complete: 'Completed' };
  // Portal to <body> so the app is removed from the print flow cleanly.
  return createPortal(
    <div className="print-reset fixed inset-0 z-[68] overflow-y-auto">
      <div className="no-print fixed inset-0 bg-ink-950/85 backdrop-blur-sm" onClick={onClose} />
      <div className="print-reset relative mx-auto my-6 w-[min(880px,94vw)]">
        <div className="no-print anim-fade-up mb-3 flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/95 px-3 py-2.5 shadow-xl">
          <I n="pulse" className="h-4 w-4 text-flare-400" sw={2} />
          <span className="mr-1 font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">Activity log · {rows.length} entries</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost py-1.5" onClick={onClose}>Close</button>
            <button className="btn btn-primary py-1.5" onClick={() => window.print()}><I n="printer" className="h-4 w-4" sw={2.2} /> Print / Save PDF</button>
          </div>
        </div>
        <div className="print-sheet print-scroll anim-pop scroll-slim max-h-[80vh] overflow-y-auto rounded-md bg-white text-[#182a3e] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)]">
          <div className="px-9 py-8">
            <div className="border-b-[3px] border-[#182a3e] pb-3 text-center">
              <p className="font-display text-[22px] font-bold uppercase tracking-wide">City of Puerto Princesa — Office of the City Engineer</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#5b7089]">OCE Flow · Activity log · {scopeLabel} · {new Date().toLocaleString('en-PH')}</p>
            </div>
            <table className="mt-4 w-full border-collapse text-[10.5px] leading-snug">
              <thead>
                <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                  <th className="py-1.5 pr-2">When</th><th className="py-1.5 pr-2">Ref</th><th className="py-1.5 pr-2">Officer</th><th className="py-1.5 pr-2">Event</th><th className="py-1.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-[#dde5ee] align-top">
                    <td className="py-1.5 pr-2 font-mono text-[9px] whitespace-nowrap">{fmtDT(a.at)}</td>
                    <td className="py-1.5 pr-2 font-mono text-[9px] font-bold">{a.ref}</td>
                    <td className="py-1.5 pr-2 font-semibold whitespace-nowrap">{a.byName}</td>
                    <td className="py-1.5 pr-2 font-mono text-[9px] uppercase">{META[a.type]}</td>
                    <td className="py-1.5">{a.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-6 border-t border-[#dde5ee] pt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#8a9ab0]">Generated by OCE Flow · official activity record</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ActivityPage() {
  const { activities, openDrawer, me, db } = useStore();
  const [divF, setDivF] = useState<'all' | string>('all');
  const [monthF, setMonthF] = useState('');
  const [printOpen, setPrintOpen] = useState(false);
  const isSup = me?.role === 'admin' || me?.role === 'supervisor' || me?.role === 'moderator' || me?.role === 'operator';

  const filtered = useMemo(() => {
    let list = activities;
    if (divF !== 'all') {
      const touched = new Set<string>();
      for (const p of db.papers) {
        const hit = p.divisionId === divF || p.intendedId === divF || (p.recipientIds ?? []).includes(divF) ||
          p.custody.some((e) => e.toDivisionId === divF || e.fromDivisionId === divF);
        if (hit) touched.add(p.id);
      }
      list = list.filter((a) => touched.has(a.docId));
    }
    if (monthF) {
      const [fy, fm] = monthF.split('-').map(Number);
      list = list.filter((a) => {
        const d = new Date(a.at);
        return d.getFullYear() === fy && d.getMonth() === fm - 1;
      });
    }
    return list;
  }, [activities, db.papers, divF, monthF]);

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

  const monthLabel = monthF
    ? new Date(monthF + '-15').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    : 'All time';

  return (
    <div>
      <PageHead kicker="Audit" title="Activity log" sub="Every movement of every paper across the office floor, newest first."
        right={
          <button className="btn btn-primary" onClick={() => setPrintOpen(true)} disabled={filtered.length === 0}>
            <I n="printer" className="h-4 w-4" sw={2.2} /> Print activity log
          </button>
        }
      />
      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-2">
        {isSup && <SearchSelect value={divF} onChange={setDivF} options={unitOptions('All desks')} width="w-72" placeholder="Filter by desk…" />}
        <label className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-mist-500">Month</span>
          <input type="month" className="field w-auto py-1.5 font-mono text-[11.5px]" value={monthF} onChange={(e) => setMonthF(e.target.value)} />
        </label>
        {(monthF || divF !== 'all') && (
          <button className="btn btn-ghost py-1.5" onClick={() => { setMonthF(''); setDivF('all'); }}>Clear filters</button>
        )}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500">
          {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'} · {monthLabel}
        </span>
      </div>
      {groups.length === 0 && <EmptyState icon="pulse" title="No activity in scope" sub="Loosen the month or desk filter — or log some paperwork." />}
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
      {printOpen && (
        <PrintActivityModal rows={filtered} scopeLabel={`${divF === 'all' ? 'All desks' : divById(divF)?.name ?? divF} · ${monthLabel}`} onClose={() => setPrintOpen(false)} />
      )}
    </div>
  );
}

/* ------------------------------------------------ users & accounts (admin) */
const ROLE_CHIP: Record<Role, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#fbc94a' }, supervisor: { label: 'Dept. Head', color: '#ff8a4c' },
  moderator: { label: 'Moderator', color: '#a78bfa' }, operator: { label: 'Operator', color: '#8adcf8' },
  division: { label: 'Div. Head', color: '#56c8f0' },
  employee: { label: 'Employee', color: '#45e0cd' }, joborder: { label: 'Job-Order', color: '#f5b924' },
};
const STATUS_CHIP: Record<UserStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#45d483' }, pending: { label: 'Pending', color: '#f5b924' }, disabled: { label: 'Disabled', color: '#f4645c' },
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
    const divPatch = needsDivision ? divisionId : divisionId === '' ? (target.divisionId ? '' : undefined) : divisionId;
    updateUser(target.id, {
      name: name.trim(), title: title.trim(), role,
      ...(divPatch === undefined ? {} : { divisionId: divPatch }),
      status, password: password || undefined,
      phone: phone.trim() || undefined, address: address.trim() || undefined, email: email.trim() || undefined,
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
              <SearchSelect value={role} onChange={(v) => { setRole(v as Role); setErr(''); }} width="w-full"
                options={[
                  { value: 'division', label: 'Division Head', sub: 'runs the division queue' },
                  { value: 'employee', label: 'Employee', sub: 'personal work board' },
                  { value: 'joborder', label: 'Job-Order', sub: 'personal work board' },
                  { value: 'moderator', label: 'Moderator', sub: 'oversight & boards' },
                  { value: 'operator', label: 'Operator', sub: 'read-only oversight' },
                  { value: 'supervisor', label: 'Dept. Head', sub: 'executive' },
                  { value: 'admin', label: 'Admin', sub: 'full control' },
                ]} />
            </label>
            <div>
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Division / team</span>
              <SearchSelect value={divisionId} onChange={(v) => { setDivisionId(v); setErr(''); }} disabled={!divEditable}
                options={unitOptions('— none —').filter((o) => o.value !== 'all').map((o) => ({ ...o }))}
                width="w-full" placeholder="Search division / team…" allowClear />
              {!needsDivision && role === 'moderator' && (
                <span className="mt-1 block font-mono text-[8.5px] uppercase tracking-[0.12em] text-mist-600">Optional — anchors the moderator to a home desk</span>
              )}
            </div>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Status</span>
              <SearchSelect value={status} onChange={(v) => setStatus(v as UserStatus)} width="w-full"
                options={[
                  { value: 'active', label: 'Active', sub: 'can sign in' },
                  { value: 'pending', label: 'Pending', sub: 'awaiting verification' },
                  { value: 'disabled', label: 'Disabled', sub: 'sign-in blocked' },
                ]} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Reset password (optional)</span>
            <input className="field font-mono" type="text" placeholder="Leave blank to keep current password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(''); }} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Phone</span>
              <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Email</span>
              <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Home address</span>
              <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} />
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
  const [uDivF, setUDivF] = useState<'all' | string>('all');
  const [uRoleF, setURoleF] = useState<'all' | Role>('all');
  const [uQ, setUQ] = useState('');
  if (user?.role !== 'admin') return null;

  const pending = db.users.filter((u) => u.status === 'pending');
  const resets = db.users.filter((u) => u.passwordResetAt);

  const filteredUsers = useMemo(() => {
    const ql = uQ.trim().toLowerCase();
    return db.users.filter((u) => {
      if (uDivF !== 'all' && u.divisionId !== uDivF) return false;
      if (uRoleF !== 'all' && u.role !== uRoleF) return false;
      if (!ql) return true;
      return `${u.name} ${u.username} ${u.title} ${u.email ?? ''} ${u.phone ?? ''}`.toLowerCase().includes(ql);
    });
  }, [db.users, uDivF, uRoleF, uQ]);

  return (
    <div>
      <PageHead kicker="Administrator" title="Users & accounts"
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
                  <p className="mt-0.5 text-[11px] text-mist-400">Approving resets the password to <b className="font-mono text-mist-200">OCE@2026</b>.</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button onClick={() => approvePasswordReset(u.id)} className="btn btn-primary px-3 py-1.5 text-[11.5px]"><I n="check" className="h-3.5 w-3.5" sw={2.4} /> Reset to OCE@2026</button>
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
          <span className="rounded bg-ink-700 px-2 py-0.5 font-mono text-[10px] font-bold text-mist-200 tabular">
            {filteredUsers.length} of {db.users.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 bg-ink-950/30 px-4 py-2.5">
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500"><I n="search" className="h-3.5 w-3.5" /></span>
            <input value={uQ} onChange={(e) => setUQ(e.target.value)} placeholder="Search name, username, title, contact…"
              title="Search by full name, @username, title, email or phone"
              className="field w-full py-1.5 pl-11 font-mono text-[11.5px]" />
            {uQ && (
              <button onClick={() => setUQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-500 transition hover:text-redx-400" title="Clear search">
                <I n="x" className="h-3 w-3" sw={2.6} />
              </button>
            )}
          </div>
          <SearchSelect
            value={uRoleF}
            onChange={(v) => setURoleF(v as 'all' | Role)}
            width="w-40"
            options={[
              { value: 'all', label: 'All roles' },
              ...Object.entries(ROLE_CHIP).map(([k, v]) => ({ value: k, label: v.label })),
            ]}
          />
          <SearchSelect value={uDivF} onChange={setUDivF} options={unitOptions('All departments / teams')} width="w-56" placeholder="Department…" />
          {(uQ || uDivF !== 'all' || uRoleF !== 'all') && (
            <button onClick={() => { setUQ(''); setUDivF('all'); setURoleF('all'); }} className="btn btn-ghost px-2.5 py-1 text-[11px]">
              <I n="x" className="h-3 w-3" sw={2.4} /> Clear
            </button>
          )}
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
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="font-display text-[16px] font-bold uppercase tracking-wide text-mist-400">No accounts match</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-600">Loosen the search or filters to see more officers</p>
                  </td>
                </tr>
              )}
              {filteredUsers.map((u, i) => {
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

/* ------------------------------------------------ personnel boards */
export function PersonnelPage() {
  const { db, user, openDrawer, returnToEmployee } = useStore();
  const employees = useMemo(
    () => db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && u.status !== 'disabled').sort((a, b) => a.name.localeCompare(b.name)),
    [db.users]
  );
  const [sel, setSel] = useState<string | null>(employees[0]?.id ?? null);
  if (user?.role !== 'admin' && user?.role !== 'supervisor' && user?.role !== 'moderator' && user?.role !== 'operator') return null;

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
              const avg = ps.length ? Math.round((ps.reduce((a, p) => a + (p.progress ?? (p.stage === 'completed' ? 100 : 0)), 0) / ps.length) * 2) / 2 : 0;
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
                    <ProgressBar value={avg} />
                    <span className="font-mono text-[9px] font-bold text-mist-400 tabular">{fmtPct(avg)}%</span>
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
                              const pct = p.progress ?? (p.stage === 'completed' ? 100 : 0);
                              return (
                                <button key={p.id} onClick={() => openDrawer(p.id)} className="paper-card group relative w-full cursor-pointer overflow-hidden rounded-md p-2.5 pl-3 text-left transition hover:-translate-y-0.5">
                                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: p.priority === 'urgent' ? '#f4645c' : p.priority === 'priority' ? '#f5b924' : '#6684a3' }} />
                                  <p className="font-mono text-[9px] font-bold tracking-wider text-[#5b7089]">{p.ref}</p>
                                  <p className="mt-0.5 line-clamp-2 font-display text-[13.5px] font-bold leading-tight tracking-wide text-[#132437]">{p.title}</p>
                                  <span className="mt-1.5 flex items-center gap-2">
                                    <ProgressBar value={pct} />
                                    <span className="shrink-0 font-mono text-[9px] font-bold text-[#5b7089] tabular">{fmtPct(pct)}%</span>
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

/* ------------------------------------------------ user history & logs (admin) */
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

function PrintLogsModal({ rows, onClose }: { rows: { id: string; at: number; userName: string; type: string; text: string; ref?: string }[]; onClose: () => void }) {
  // Portal to <body> so the app is removed from the print flow cleanly.
  return createPortal(
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
        <div className="print-sheet print-scroll anim-pop scroll-slim max-h-[80vh] overflow-y-auto rounded-md bg-white text-[#182a3e] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)]">
          <div className="px-9 py-8">
            <div className="border-b-[3px] border-[#182a3e] pb-3 text-center">
              <p className="font-display text-[22px] font-bold uppercase tracking-wide">City of Puerto Princesa — Office of the City Engineer</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#5b7089]">OCE Flow · System activity & user history log · {new Date().toLocaleString('en-PH')}</p>
            </div>
            <table className="mt-4 w-full border-collapse text-[10.5px] leading-snug">
              <thead>
                <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                  <th className="py-1.5 pr-2">When</th><th className="py-1.5 pr-2">Officer</th><th className="py-1.5 pr-2">Event</th><th className="py-1.5 pr-2">Detail</th><th className="py-1.5">Ref</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const m = LOG_META[r.type] ?? LOG_META.note;
                  return (
                    <tr key={r.id} className="border-b border-[#dde5ee] align-top">
                      <td className="py-1.5 pr-2 font-mono text-[9px] whitespace-nowrap">{fmtDT(r.at)}</td>
                      <td className="py-1.5 pr-2 font-semibold whitespace-nowrap">{r.userName}</td>
                      <td className="py-1.5 pr-2 font-mono text-[9px] uppercase" style={{ color: m.color }}>{m.label}</td>
                      <td className="py-1.5 pr-2">{r.text}</td>
                      <td className="py-1.5 font-mono text-[9px]">{r.ref ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-6 border-t border-[#dde5ee] pt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#8a9ab0]">Generated by OCE Flow · confidential system record</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function LogsPage() {
  const { db, user, openDrawer } = useStore();
  const [userF, setUserF] = useState<'all' | string>('all');
  const [scope, setScope] = useState<'all' | 'access' | 'workflow'>('all');
  const [printOpen, setPrintOpen] = useState(false);
  if (user?.role !== 'admin') return null;

  const ACCESS = ['login', 'logout', 'signup', 'approve', 'deny', 'edit', 'profile', 'resetreq', 'reset'];

  const filtered = useMemo(
    () =>
      db.logs.filter((l) => {
        if (userF !== 'all' && l.userId !== userF) return false;
        if (scope === 'access' && !ACCESS.includes(l.type)) return false;
        if (scope === 'workflow' && ACCESS.includes(l.type)) return false;
        return true;
      }),
    [db.logs, userF, scope]
  );

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
        <SearchSelect value={userF} onChange={setUserF}
          options={[{ value: 'all', label: 'All officers' }, ...db.users.map((u) => ({ value: u.id, label: u.name, sub: `@${u.username} · ${u.title}` }))]}
          width="w-72" placeholder="Search an officer…" />
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

/* ------------------------------------------------ messages */
const CH_ICON: Record<Channel['kind'], IconName> = { executive: 'shield', unit: 'sitemap', floor: 'pulse' };
const CH_TINT: Record<Channel['kind'], string> = { executive: '#fbc94a', unit: '#56c8f0', floor: '#2dd4bf' };

export function MessagesPage() {
  const {
    db, me, visibleChannels, messagesOf, unreadFor, canPostChannel, sendMsg,
    markChannelRead, manageChannelMember, openDrawer, visiblePapers,
    updateMessage, requestDeleteMessage, approveDeleteMessage, denyDeleteMessage, msgDeletes,
  } = useStore();
  const [selCh, setSelCh] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [attachIds, setAttachIds] = useState<string[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachQ, setAttachQ] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [addSel, setAddSel] = useState('');
  /* conversation search — lives inside the chat window of each channel */
  const [searchQ, setSearchQ] = useState('');
  /* inline message editing (author, 10-min window) */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  /* re-render every 30s so the edit button disappears once the window closes */
  const [, setTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const channel = visibleChannels.find((c) => c.id === selCh) ?? visibleChannels[0] ?? null;
  const msgs: Message[] = channel ? messagesOf(channel.id) : [];
  const canPost = channel ? canPostChannel(channel) : false;
  const canManage = (me?.role === 'admin' || me?.role === 'moderator') && channel?.kind === 'executive';
  const protectedIds = ['u-admin', 'u-sup1', 'u-sup2', 'u-mod'];

  useEffect(() => {
    if (channel) markChannelRead(channel.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id, msgs.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs.length]);

  if (!me) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel || !draft.trim() || !canPost) return;
    sendMsg(channel.id, draft, attachIds.length ? attachIds : undefined);
    setDraft('');
    setAttachIds([]);
    setAttachOpen(false);
    setAttachQ('');
  };

  const toggleAttach = (id: string) =>
    setAttachIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const attachResults = useMemo(() => {
    const t = attachQ.trim().toLowerCase();
    return visiblePapers.filter((p) => !t || `${p.ref} ${p.title} ${p.origin}`.toLowerCase().includes(t)).slice(0, 40);
  }, [visiblePapers, attachQ]);

  const members = channel?.memberIds?.map((id) => db.users.find((u) => u.id === id)).filter((u): u is User => !!u) ?? [];
  const addable = db.users.filter((u) => u.status === 'active' && !(channel?.memberIds ?? []).includes(u.id));

  /* ---- message edit / delete rules ---- */
  const isOverseer = me?.role === 'admin' || me?.role === 'supervisor' || me?.role === 'moderator' || me?.role === 'operator';
  const canEditMsg = (m: Message) => !!me && !m.system && m.authorId === me.id && Date.now() - m.at < MSG_EDIT_WINDOW;
  const canDeleteMsg = (m: Message) => !!me && !m.system && (m.authorId === me.id || isOverseer);

  /* ---- conversation search (active while the query is non-empty) ---- */
  const searching = searchQ.trim().length > 0;
  const shownMsgs = useMemo(() => {
    if (!searching) return msgs;
    const q = searchQ.trim().toLowerCase();
    return msgs.filter((m) => m.text.toLowerCase().includes(q));
  }, [msgs, searching, searchQ]);

  /** Wrap query matches in a highlighted span. */
  const highlight = (text: string) => {
    if (!searching) return text;
    const q = searchQ.trim();
    if (!q) return text;
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${esc})`, 'ig'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="rounded-sm bg-amberx-400/90 px-0.5 font-semibold text-ink-950">{part}</mark>
      ) : (
        part
      )
    );
  };

  /* ---- pending deletion requests (program admin verifies) ---- */
  const pendingDeletes = me?.role === 'admin' ? msgDeletes : [];

  /* ---- grouped, ordered channel list (executives / floor / divisions / teams) ---- */
  const execChans = visibleChannels.filter((c) => c.kind === 'executive');
  const floorChans = visibleChannels.filter((c) => c.kind === 'floor');
  // Unit channels, excluding the two executive-desk channels (City Engineer / Asst. City Engineer).
  const unitChans = visibleChannels.filter((c) => c.kind === 'unit' && !(c.unitId ?? '').startsWith('desk-'));
  const divChans = unitChans.filter((c) => DIVISIONS.some((d) => d.id === c.unitId));
  const teamChans = unitChans.filter((c) => CROSS_UNITS.some((d) => d.id === c.unitId));

  const chanRow = (c: Channel) => {
    const un = unreadFor(c.id);
    const active = channel?.id === c.id;
    const tint = c.unitId ? (c.kind === 'unit' ? CU_TINT[c.unitId] ?? CH_TINT.unit : CH_TINT[c.kind]) : CH_TINT[c.kind];
    return (
      <button key={c.id} onClick={() => setSelCh(c.id)}
        className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2.5 text-left transition ${active ? 'bg-ink-800' : 'border-ink-700 bg-ink-850/60 hover:border-ink-500 hover:bg-ink-800/70'}`}
        style={active ? { borderColor: `${tint}90` } : undefined}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ border: `1px solid ${tint}70`, background: `${tint}14`, color: tint }}>
          <I n={CH_ICON[c.kind]} className="h-4 w-4" sw={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[12.5px] font-bold ${active ? 'text-mist-50' : 'text-mist-200'}`}>{c.name}</span>
          <span className="block font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">
            {c.kind === 'executive' ? 'council · overseen' : c.kind === 'floor' ? 'all personnel' : `unit channel${c.unitId ? ` · ${divById(c.unitId)?.code}` : ''}`}
          </span>
        </span>
        {un > 0 && (
          <span className="anim-badge flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-flare-500 px-1 font-mono text-[10px] font-bold text-ink-950 tabular">{un}</span>
        )}
      </button>
    );
  };

  const groupLabel = (text: string) => (
    <div className="flex items-center gap-2 px-1.5 pt-3.5 first:pt-0">
      <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.24em] text-mist-600">{text}</span>
      <span className="h-px flex-1 bg-ink-700/70" />
    </div>
  );

  return (
    <div>
      <PageHead kicker="Live coordination" title="Messages"
        sub="Channels per division and team, an office floor for everyone, and an Executive Council — overseen by the executives, admin and moderator." />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* channel list */}
        <section className="anim-fade-up self-start rounded-lg border border-ink-700 bg-ink-900/80 p-3">
          <p className="px-1.5 pb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.22em] text-mist-500">Channels · {visibleChannels.length}</p>
          <div className="scroll-slim max-h-[64vh] space-y-1.5 overflow-y-auto pr-1">
            {execChans.length > 0 && (
              <>
                {groupLabel('Executive')}
                {execChans.map(chanRow)}
              </>
            )}
            {floorChans.length > 0 && (
              <>
                {groupLabel('Office')}
                {floorChans.map(chanRow)}
              </>
            )}
            {divChans.length > 0 && (
              <>
                {groupLabel('Divisions')}
                {divChans.map(chanRow)}
              </>
            )}
            {teamChans.length > 0 && (
              <>
                {groupLabel('Teams')}
                {teamChans.map(chanRow)}
              </>
            )}
          </div>
        </section>

        {/* conversation */}
        <section className="anim-fade-up flex min-h-[560px] flex-col rounded-lg border border-ink-700 bg-ink-900/80" style={{ animationDelay: '80ms' }}>
          {channel ? (
            <>
              <div className="flex items-center gap-3 border-b border-ink-700 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md" style={{ border: `1px solid ${CH_TINT[channel.kind]}70`, background: `${CH_TINT[channel.kind]}14`, color: CH_TINT[channel.kind] }}>
                  <I n={CH_ICON[channel.kind]} className="h-4.5 w-4.5" sw={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-[17px] font-bold uppercase tracking-wide text-mist-50">{channel.name}</p>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-mist-600">
                    {channel.kind === 'executive' ? `${members.length} seats · admin & moderator manage membership` : channel.kind === 'floor' ? 'visible to the whole office' : 'private to the unit — overseen by executives & admin'}
                  </p>
                </div>
                {canManage && (
                  <button onClick={() => setManageOpen((o) => !o)} className={`btn btn-ghost ml-auto px-3 py-1.5 text-[11px] ${manageOpen ? 'border-amberx-500/60 text-amberx-400' : ''}`}>
                    <I n="users" className="h-3.5 w-3.5" sw={2} /> Manage members
                  </button>
                )}
              </div>

              {manageOpen && canManage && (
                <div className="border-b border-ink-700 bg-ink-950/40 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {members.map((m0) => {
                      const isProtected = protectedIds.includes(m0.id);
                      return (
                        <span key={m0.id} className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-850 px-2 py-1">
                          <span className="truncate font-mono text-[10px] font-bold text-mist-200">{m0.name}</span>
                          {isProtected ? (
                            <span className="rounded-sm bg-amberx-500/15 px-1 py-px font-mono text-[7.5px] font-bold uppercase text-amberx-400">seat</span>
                          ) : (
                            <button onClick={() => manageChannelMember(channel.id, m0.id, false)} className="text-mist-500 transition hover:text-redx-400" title="Remove from council">
                              <I n="x" className="h-2.5 w-2.5" sw={2.8} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex max-w-md items-center gap-2">
                    <SearchSelect value={addSel} onChange={setAddSel} width="w-full" placeholder="Search personnel to join…"
                      options={addable.map((u0) => ({ value: u0.id, label: u0.name, sub: `${u0.title}${u0.divisionId ? ` · ${divById(u0.divisionId)?.code ?? ''}` : ''}` }))} />
                    <button className="btn btn-primary shrink-0 px-3 py-1.5 text-[11.5px]" disabled={!addSel}
                      onClick={() => { manageChannelMember(channel.id, addSel, true); setAddSel(''); }}>
                      <I n="plus" className="h-3.5 w-3.5" sw={2.4} /> Join
                    </button>
                  </div>
                </div>
              )}

              {/* program admin — pending message-deletion requests */}
              {pendingDeletes.length > 0 && (
                <div className="border-b border-redx-500/30 bg-redx-500/[0.06] px-4 py-2.5">
                  <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-redx-400">
                    <I n="trash" className="h-3 w-3" sw={2.2} /> Deletion requests · verify to remove
                  </p>
                  <div className="space-y-1.5">
                    {pendingDeletes.map((r) => {
                      const ch = (db.channels ?? []).find((c) => c.id === r.channelId);
                      return (
                        <div key={r.id} className="flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold text-mist-100" title={r.text}>“{r.text}”</p>
                            <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-500">
                              requested by {r.byName} · {ch?.name ?? 'channel'} · {timeAgo(r.at)}
                            </p>
                          </div>
                          <button onClick={() => approveDeleteMessage(r.id)} className="btn btn-primary shrink-0 px-2.5 py-1 text-[10.5px]">
                            <I n="check" className="h-3 w-3" sw={2.6} /> Delete
                          </button>
                          <button onClick={() => denyDeleteMessage(r.id)} className="btn btn-ghost shrink-0 px-2.5 py-1 text-[10.5px] hover:border-redx-500/60 hover:text-redx-400">
                            Keep
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* in-window conversation search — always available, filters as you type */}
              {channel && (
                <div className={`flex items-center gap-2.5 border-b px-4 py-2 transition-colors ${searching ? 'border-amberx-500/40 bg-amberx-500/[0.06]' : 'border-ink-700 bg-ink-900/40'}`}>
                  <I n="search" className={`h-3.5 w-3.5 shrink-0 transition-colors ${searching ? 'text-amberx-400' : 'text-mist-500'}`} sw={2.2} />
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setSearchQ(''); }}
                    placeholder={`Search the ${channel.name} conversation…`}
                    className="w-full bg-transparent font-mono text-[12px] text-mist-100 outline-none placeholder:text-mist-600"
                  />
                  {searching ? (
                    <>
                      <span className="shrink-0 font-mono text-[9.5px] font-bold uppercase tracking-wider text-amberx-400 tabular">
                        {shownMsgs.length} of {msgs.length} match{shownMsgs.length === 1 ? '' : 'es'}
                      </span>
                      <button
                        onClick={() => setSearchQ('')}
                        className="shrink-0 rounded p-1 text-mist-400 transition hover:bg-ink-700 hover:text-redx-400"
                        title="Clear search (Esc)">
                        <I n="x" className="h-3.5 w-3.5" sw={2.4} />
                      </button>
                    </>
                  ) : (
                    <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">{msgs.length} message{msgs.length === 1 ? '' : 's'}</span>
                  )}
                </div>
              )}

              <div className="scroll-slim flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {shownMsgs.length === 0 && (
                  <p className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist-600">
                    {searching ? 'No messages match your search.' : 'No messages yet — start the thread.'}
                  </p>
                )}
                {shownMsgs.map((m) => {
                  const mine = m.authorId === me.id;
                  if (m.system) {
                    return (
                      <p key={m.id} className="mx-auto max-w-md rounded-full border border-ink-700 bg-ink-850 px-3 py-1.5 text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-mist-500">
                        {m.text} · {fmtDT(m.at)}
                      </p>
                    );
                  }
                  const docs = m.docs ?? (m.docId && m.docRef ? [{ id: m.docId, ref: m.docRef }] : []);
                  const editable = canEditMsg(m);
                  const deletable = canDeleteMsg(m);
                  const editLeft = editable ? Math.max(0, Math.ceil((MSG_EDIT_WINDOW - (Date.now() - m.at)) / 60000)) : 0;
                  const pendingDel = msgDeletes.some((r) => r.messageId === m.id);
                  const isEditing = editingId === m.id;
                  return (
                    <div key={m.id} className={`anim-fade-up flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                      <Avatar name={m.authorName || 'Officer'} size="sm" />
                      <div className={`group/msg relative max-w-[72%] rounded-lg border px-3 py-2.5 transition ${mine ? 'border-flare-500/40 bg-flare-500/[0.08]' : 'border-ink-700 bg-ink-850'} ${deletable ? 'hover:border-ink-500' : ''}`}>
                        <p className="flex items-baseline gap-2">
                          <span className={`text-[11.5px] font-bold ${mine ? 'text-flare-400' : 'text-cyanx-400'}`}>{mine ? 'You' : m.authorName}</span>
                          <span className="font-mono text-[8.5px] uppercase tracking-wider text-mist-600">{fmtDT(m.at)}</span>
                          {m.editedAt && (
                            <span className="font-mono text-[8px] italic tracking-wider text-mist-500" title={`Edited ${fmtDT(m.editedAt)}`}>· edited</span>
                          )}
                        </p>

                        {isEditing ? (
                          <div className="mt-1.5">
                            <textarea
                              autoFocus
                              rows={2}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null); }}
                              className="field resize-y font-mono text-[12px]"
                              placeholder="Rewrite your message…"
                            />
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                onClick={() => { if (editText.trim()) { updateMessage(m.id, editText); } setEditingId(null); }}
                                className="btn btn-primary px-2.5 py-1 text-[10.5px]">
                                <I n="check" className="h-3 w-3" sw={2.6} /> Save edit
                              </button>
                              <button onClick={() => setEditingId(null)} className="btn btn-ghost px-2.5 py-1 text-[10.5px]">Cancel</button>
                              <span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-mist-600">Esc to cancel</span>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-mist-100">{highlight(m.text)}</p>
                        )}

                        {pendingDel && (
                          <p className="mt-1.5 flex items-center gap-1.5 rounded-sm border border-amberx-500/40 bg-amberx-500/10 px-2 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-amberx-400">
                            <I n="clock" className="h-2.5 w-2.5" sw={2.4} /> Deletion pending program-admin verification
                          </p>
                        )}

                        {/* edit / delete — appear on hover, edit only within the 10-min window */}
                        {(editable || deletable) && !isEditing && (
                          <span className={`absolute -top-2.5 flex items-center gap-1 rounded-md border border-ink-600 bg-ink-800 px-1 py-0.5 opacity-0 shadow-lg transition-opacity duration-150 group-hover/msg:opacity-100 focus-within:opacity-100 ${mine ? 'right-2' : 'left-2'}`}>
                            {editable && (
                              <button
                                onClick={() => { setEditingId(m.id); setEditText(m.text); }}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-cyanx-400 transition hover:bg-cyanx-500/15"
                                title={`Edit — ${editLeft} min left in the window`}>
                                <I n="wrench" className="h-2.5 w-2.5" sw={2.4} /> Edit · {editLeft}m
                              </button>
                            )}
                            {deletable && (
                              <button
                                onClick={() => requestDeleteMessage(m.id)}
                                disabled={pendingDel}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-redx-400 transition hover:bg-redx-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Send deletion request to the program admin">
                                <I n="trash" className="h-2.5 w-2.5" sw={2.4} /> Delete
                              </button>
                            )}
                          </span>
                        )}
                        {docs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {docs.map((d) => (
                              <button key={d.id} onClick={() => openDrawer(d.id)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-cyanx-500/40 bg-cyanx-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-cyanx-400 transition hover:bg-cyanx-500/20"
                                title="Open the attached paper">
                                <I n="file" className="h-3 w-3" sw={2.2} /> {d.ref}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <form onSubmit={submit} className="border-t border-ink-700 px-4 py-3">
                <div className="relative">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={canPost ? `Message ${channel.name}…` : 'This channel is read-only for you'}
                    disabled={!canPost}
                    className="field pr-24"
                  />
                  <button type="submit" disabled={!canPost || !draft.trim()} className="btn btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-[11.5px]">
                    <I n="send" className="h-3.5 w-3.5" sw={2.2} /> Send
                  </button>
                </div>

                {canPost && (
                  <div className="relative mt-2">
                    {attachIds.length > 0 && (
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {attachIds.map((id) => {
                          const p = visiblePapers.find((x) => x.id === id) ?? db.papers.find((x) => x.id === id);
                          if (!p) return null;
                          return (
                            <span key={id} className="anim-pop inline-flex max-w-full items-center gap-1.5 rounded-md border border-cyanx-500/45 bg-cyanx-500/10 py-1 pl-2 pr-1.5">
                              <I n="file" className="h-3 w-3 shrink-0 text-cyanx-400" sw={2.2} />
                              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-cyanx-400">{p.ref}</span>
                              <span className="max-w-[180px] truncate text-[11px] font-semibold text-mist-200" title={p.title}>{p.title}</span>
                              <button type="button" onClick={() => toggleAttach(id)} className="rounded p-0.5 text-cyanx-400/70 transition hover:bg-redx-500/15 hover:text-redx-400" title="Remove">
                                <I n="x" className="h-2.5 w-2.5" sw={2.8} />
                              </button>
                            </span>
                          );
                        })}
                        {attachIds.length > 1 && (
                          <button type="button" onClick={() => setAttachIds([])} className="rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-mist-500 transition hover:text-redx-400">
                            Clear all
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setAttachOpen((o) => !o)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${attachOpen || attachIds.length > 0 ? 'border-cyanx-500/60 bg-cyanx-500/12 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-400 hover:border-cyanx-500/50 hover:text-mist-200'}`}>
                        <I n="clip" className="h-3.5 w-3.5" sw={2.2} />
                        Attach papers
                        {attachIds.length > 0 && <span className="rounded-full bg-cyanx-500 px-1.5 py-px text-[9px] font-bold text-ink-950 tabular">{attachIds.length}</span>}
                      </button>
                      <span className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">Delivered live to every open session</span>
                    </div>

                    {attachOpen && (
                      <div className="anim-pop absolute bottom-full left-0 z-30 mb-2 w-full max-w-lg overflow-hidden rounded-lg border border-ink-600 bg-ink-850 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]">
                        <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2">
                          <I n="search" className="h-3.5 w-3.5 shrink-0 text-mist-500" />
                          <input autoFocus value={attachQ} onChange={(e) => setAttachQ(e.target.value)}
                            placeholder="Search by ref, title or origin…"
                            className="w-full bg-transparent font-mono text-[11px] text-mist-100 outline-none placeholder:text-mist-600" />
                          <span className="shrink-0 font-mono text-[9px] text-mist-600 tabular">{attachResults.length}</span>
                          <button type="button" onClick={() => setAttachOpen(false)} className="shrink-0 rounded p-0.5 text-mist-500 transition hover:text-redx-400">
                            <I n="x" className="h-3 w-3" sw={2.6} />
                          </button>
                        </div>
                        <div className="scroll-slim max-h-64 overflow-y-auto py-1">
                          {attachResults.length === 0 && (
                            <p className="px-3 py-6 text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-600">No papers match</p>
                          )}
                          {attachResults.map((p) => {
                            const on = attachIds.includes(p.id);
                            const done = p.stage === 'completed';
                            return (
                              <button key={p.id} type="button" onClick={() => toggleAttach(p.id)}
                                className={`flex w-full items-center gap-2.5 border-l-2 px-3 py-2 text-left transition ${on ? 'border-cyanx-500 bg-cyanx-500/12' : 'border-transparent hover:bg-ink-800/70'}`}>
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${on ? 'border-cyanx-500 bg-cyanx-500 text-ink-950' : 'border-ink-600'}`}>
                                  {on && <I n="check" className="h-2.5 w-2.5" sw={3} />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-bold leading-tight text-mist-100">{p.title}</span>
                                  <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-mist-500">
                                    <span className="font-bold text-cyanx-400/90">{p.ref}</span>
                                    {divById(p.divisionId)?.code}
                                    <span className={done ? 'text-greenx-500' : 'text-amberx-400'}>{done ? 'completed' : stageMeta(p.stage).label}</span>
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between border-t border-ink-700 px-3 py-1.5">
                          <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">Tick every paper to attach</span>
                          <button type="button" onClick={() => setAttachOpen(false)} className="font-mono text-[9px] font-bold uppercase tracking-wider text-cyanx-400 transition hover:text-cyanx-300">
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </>
          ) : (
            <EmptyState icon="send" title="No channels available" sub="You have no visible channels." />
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------ customize (admin) */
const ACCENTS = ['#ff6b1c', '#56c8f0', '#2dd4bf', '#f5b924', '#45d483', '#f4645c', '#a78bfa'];
const ACCENTS2 = ['#56c8f0', '#ff6b1c', '#45e0cd', '#fbc94a', '#8adcf8', '#f8837c', '#6cd1f4'];

function readFileAsUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(f);
  });
}

export function CustomizePage() {
  const { user, db, custom, updateCustom, pushToast, geotagBrgys } = useStore();
  const [newBrgy, setNewBrgy] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  if (user?.role !== 'admin') return null;

  const brgyList = custom.barangays ?? [];
  const derivedBrgys = useMemo(() => extractBarangays(db.papers), [db.papers]);

  const addBrgy = () => {
    const v = newBrgy.trim().replace(/^Brgy\.?\s+/i, '');
    if (!v) return;
    if (brgyList.some((b) => b.toLowerCase() === v.toLowerCase())) {
      pushToast('warn', 'That barangay is already on the list.');
      return;
    }
    updateCustom({ barangays: [...brgyList, v] });
    setNewBrgy('');
  };

  const pickImage = async (f: File | undefined, key: 'logoUrl' | 'loginImage', max = 2 * 1024 * 1024) => {
    if (!f) return;
    if (f.size > max) {
      pushToast('warn', 'Image is too large — keep it under 2 MB.');
      return;
    }
    const url = await readFileAsUrl(f);
    updateCustom({ [key]: url } as never);
  };

  return (
    <div>
      <PageHead kicker="Program administrator" title="Customize the program"
        sub="Rebrand the identity, pick a logo, restyle the theme, and manage the barangay list used by the board filter. Changes apply live across the whole program." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Identity & branding" icon="stamp">
          <div className="space-y-3.5">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Organization name</span>
              <input className="field" placeholder="Office of the City Engineer" value={custom.orgName ?? ''} onChange={(e) => updateCustom({ orgName: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Tagline</span>
              <input className="field" placeholder="Paperwork Flow Command" value={custom.tagline ?? ''} onChange={(e) => updateCustom({ tagline: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Description / welcome text</span>
              <textarea className="field" rows={3} placeholder="Describe the office or the program…" value={custom.description ?? ''} onChange={(e) => updateCustom({ description: e.target.value })} />
            </label>

            <div>
              <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Company logo</span>
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { k: 'seal', label: 'Seal' }, { k: 'gear', label: 'Gear' }, { k: 'bridge', label: 'Bridge' },
                ] as const).map((o) => (
                  <button key={o.k} onClick={() => updateCustom({ logoKind: o.k, logoUrl: undefined })}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 transition ${(custom.logoKind ?? 'seal') === o.k ? 'border-flare-500/70 bg-flare-500/12 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400 hover:border-ink-500 hover:text-mist-200'}`}>
                    <I n="stamp" className="h-4 w-4" sw={2} />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{o.label}</span>
                  </button>
                ))}
                <button onClick={() => logoRef.current?.click()}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 transition ${custom.logoKind === 'custom' && custom.logoUrl ? 'border-flare-500/70 bg-flare-500/12 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400 hover:border-ink-500 hover:text-mist-200'}`}>
                  {custom.logoKind === 'custom' && custom.logoUrl ? (
                    <img src={custom.logoUrl} alt="logo" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <I n="cam" className="h-4 w-4" sw={2} />
                  )}
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Upload</span>
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { void pickImage(e.target.files?.[0], 'logoUrl', 1024 * 1024); updateCustom({ logoKind: 'custom' }); e.target.value = ''; }} />
              </div>
            </div>

            <div>
              <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Sign-in page photo</span>
              <div className="flex items-center gap-3">
                {custom.loginImage ? (
                  <img src={custom.loginImage} alt="login" className="h-16 w-24 rounded-md border border-ink-600 object-cover" />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-ink-600 text-mist-600">
                    <I n="cam" className="h-5 w-5" sw={1.6} />
                  </div>
                )}
                <button className="btn btn-ghost px-3 py-1.5 text-[11.5px]" onClick={() => imgRef.current?.click()}>
                  <I n="cam" className="h-3.5 w-3.5" sw={2} /> Choose photo
                </button>
                {custom.loginImage && (
                  <button className="btn btn-ghost px-3 py-1.5 text-[11.5px] hover:border-redx-500/60 hover:text-redx-400" onClick={() => updateCustom({ loginImage: undefined })}>
                    <I n="x" className="h-3.5 w-3.5" sw={2.2} /> Remove
                  </button>
                )}
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0], 'loginImage'); e.target.value = ''; }} />
              </div>
            </div>
          </div>
        </Section>

        <div className="space-y-4">
          <Section title="Theme & colors" icon="pulse">
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Primary accent</span>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENTS.map((c) => (
                    <button key={c} onClick={() => updateCustom({ accent: c })} title={c}
                      className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${custom.accent === c ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                  <label className="flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-850 px-2 py-1.5">
                    <input type="color" value={custom.accent ?? '#ff6b1c'} onChange={(e) => updateCustom({ accent: e.target.value })} className="h-5 w-7 cursor-pointer bg-transparent" />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-mist-400">Custom</span>
                  </label>
                  <button className="btn btn-ghost px-2.5 py-1.5 text-[10.5px]" onClick={() => updateCustom({ accent: undefined })}>Reset</button>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Secondary accent</span>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENTS2.map((c) => (
                    <button key={c} onClick={() => updateCustom({ accent2: c })} title={c}
                      className={`h-8 w-8 rounded-full border-2 transition hover:scale-110 ${custom.accent2 === c ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                  <label className="flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-850 px-2 py-1.5">
                    <input type="color" value={custom.accent2 ?? '#56c8f0'} onChange={(e) => updateCustom({ accent2: e.target.value })} className="h-5 w-7 cursor-pointer bg-transparent" />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-mist-400">Custom</span>
                  </label>
                  <button className="btn btn-ghost px-2.5 py-1.5 text-[10.5px]" onClick={() => updateCustom({ accent2: undefined })}>Reset</button>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Background mood</span>
                <div className="flex flex-wrap gap-2">
                  {([
                    { k: 'blueprint', label: 'Blueprint', c1: '#0a1728', c2: '#122540' },
                    { k: 'midnight', label: 'Midnight', c1: '#0b0b16', c2: '#161628' },
                    { k: 'slate', label: 'Slate', c1: '#131920', c2: '#1f2933' },
                  ] as const).map((t) => (
                    <button key={t.k} onClick={() => updateCustom({ bgTone: t.k })}
                      className={`flex items-center gap-2.5 rounded-md border px-3 py-2 transition ${(custom.bgTone ?? 'blueprint') === t.k ? 'border-cyanx-500/70 bg-cyanx-500/12' : 'border-ink-600 bg-ink-850 hover:border-ink-500'}`}>
                      <span className="h-7 w-10 rounded" style={{ background: `linear-gradient(135deg, ${t.c1}, ${t.c2})` }} />
                      <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${(custom.bgTone ?? 'blueprint') === t.k ? 'text-cyanx-400' : 'text-mist-400'}`}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Barangay list (board filter)" icon="pin">
            <div className="mb-4">
              <span className="mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-mist-600">Detected from paperwork · {derivedBrgys.length}</span>
              {derivedBrgys.length === 0 ? (
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
                  Nothing detected yet — mention "Brgy. …" in a paper's title, origin or remarks.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {derivedBrgys.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-850 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-mist-300">
                      <I n="pin" className="h-2.5 w-2.5 text-mist-500" sw={2.2} />
                      {b}
                      <span className="rounded-sm bg-ink-700 px-1 py-px text-[7.5px] font-bold text-mist-500">auto</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <span className="mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-mist-600">From photo geotags · {geotagBrgys.length}</span>
              {geotagBrgys.length === 0 ? (
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
                  Attach a geotagged photo — its barangay is resolved via OpenStreetMap automatically.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {geotagBrgys.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 rounded-md border border-amberx-500/35 bg-amberx-500/[0.07] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amberx-400">
                      <I n="pin" className="h-2.5 w-2.5" sw={2.2} />
                      {b}
                      <span className="rounded-sm bg-amberx-500/15 px-1 py-px text-[7.5px] font-bold">GPS</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-mist-600">Custom names · {brgyList.length}</span>
              <div className="mb-3 flex gap-2">
                <input className="field" placeholder="e.g. San Jose" value={newBrgy}
                  onChange={(e) => setNewBrgy(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBrgy()} />
                <button className="btn btn-primary shrink-0 px-4" onClick={addBrgy}>
                  <I n="plus" className="h-4 w-4" sw={2.2} /> Add
                </button>
              </div>
              {brgyList.length === 0 ? (
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
                  No custom names — add barangays that paperwork never mentions by name.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {brgyList.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 rounded-md border border-tealx-500/40 bg-tealx-500/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-tealx-400">
                      {b}
                      <button onClick={() => updateCustom({ barangays: brgyList.filter((x) => x !== b) })} className="text-tealx-400/70 transition hover:text-redx-400" title="Remove">
                        <I n="x" className="h-2.5 w-2.5" sw={2.6} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">
              Detected = found in paper text · GPS = resolved from photo coordinates · custom = always listed.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
