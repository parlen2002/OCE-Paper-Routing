import React from 'react';
import { useStore } from '../lib/store';
import { ALL_UNITS, DIVISIONS, INSPECTORATE, divById } from '../lib/types';
import type { Activity } from '../lib/types';
import { I, type IconName } from './icons';
import { Avatar, DivChip, StageChip } from './ui';
import { fmtDate, timeAgo } from '../lib/util';

const ACT_META: Record<Activity['type'], { icon: IconName; color: string }> = {
  create: { icon: 'plus', color: '#56c8f0' },
  move: { icon: 'arr', color: '#f5b924' },
  route: { icon: 'route', color: '#ff8a4c' },
  note: { icon: 'note', color: '#86a2be' },
  attach: { icon: 'clip', color: '#2dd4bf' },
  complete: { icon: 'checkc', color: '#45d483' },
};

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
    { label: 'Urgent open', value: urgentOpen.length, hint: 'Needs a supervisor eye', color: '#f4645c', icon: 'alert' },
  ];

  return (
    <div>
      <div className="anim-fade-up mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-flare-400">
            Office of the City Engineer · {fmtDate(Date.now())}
          </p>
          <h1 className="font-display text-[38px] font-bold uppercase leading-none tracking-wide text-mist-50 sm:text-[44px]">
            Command <span className="text-cyanx-500">view</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-mist-400">
            On duty: <b className="text-mist-200">{user.name}</b> — {user.title}. Nine divisions reporting;
            every hand-off below is stamped into the custody trail.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <I n="plus" className="h-4 w-4" sw={2.2} />
          Log paperwork
        </button>
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="anim-fade-up relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80 p-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="absolute right-3 top-3" style={{ color: `${s.color}66` }}>
              <I n={s.icon} className="h-6 w-6" sw={1.4} />
            </span>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-mist-500">{s.label}</p>
            <p className="mt-1 font-display text-[44px] font-bold leading-none tabular" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] text-mist-500">{s.hint}</p>
            <span className="absolute inset-x-0 bottom-0 h-[2.5px]" style={{ background: `${s.color}55` }} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* left: division load + urgent */}
        <div className="space-y-4 xl:col-span-2">
          <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '120ms' }}>
            <div className="mb-3 flex items-center gap-2">
              <I n="sitemap" className="h-3.5 w-3.5 text-flare-400" sw={2} />
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">
                Division load — open papers
              </h3>
              <span className="h-px flex-1 bg-ink-700" />
              <button onClick={() => go('board')} className="font-mono text-[10px] uppercase tracking-wider text-cyanx-400 hover:text-cyanx-300">
                Open board →
              </button>
            </div>
            <ul className="space-y-1">
              {load.map(({ d, n }) => (
                <li key={d.id}>
                  <button
                    onClick={() => {
                      setDivFilter(d.id);
                      go('board');
                    }}
                    className="group flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-ink-800/80"
                  >
                    <DivChip div={d} />
                    <span className="w-44 truncate text-[12.5px] font-semibold text-mist-200 group-hover:text-mist-50">
                      {d.name}
                    </span>
                    <span className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-ink-800">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${(n / maxLoad) * 100}%`,
                          background: d.id.startsWith('desk-')
                            ? 'linear-gradient(90deg,#b98a12,#fbc94a)'
                            : d.id === INSPECTORATE.id
                              ? 'linear-gradient(90deg,#0f9d8a,#45e0cd)'
                              : d.cluster === 'ops'
                                ? 'linear-gradient(90deg,#c24a0c,#ff8a4c)'
                                : 'linear-gradient(90deg,#2fa9d6,#6cd1f4)',
                        }}
                      />
                    </span>
                    <span className="w-6 text-right font-mono text-[12px] font-bold text-mist-100 tabular">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.18em] text-mist-600">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-flare-500" /> Field operations · {DIVISIONS.filter((x) => x.cluster === 'ops').length} divisions</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-cyanx-500" /> Technical services · {DIVISIONS.filter((x) => x.cluster === 'tech').length} divisions</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-tealx-500" /> Inspectorate team</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-amberx-400" /> Executive desks</span>
            </p>
          </section>

          <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '200ms' }}>
            <div className="mb-3 flex items-center gap-2">
              <I n="alert" className="h-3.5 w-3.5 text-redx-400" sw={2} />
              <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">
                Urgent — needs attention
              </h3>
              <span className="ml-auto rounded bg-redx-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-redx-400 tabular">
                {urgentOpen.length}
              </span>
            </div>
            {urgentOpen.length === 0 && (
              <p className="py-6 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-mist-600">
                Nothing burning — all urgent papers are closed
              </p>
            )}
            <ul className="space-y-1.5">
              {urgentOpen.map((p) => {
                const d = divById(p.divisionId);
                const isOverdue = p.dueAt != null && p.dueAt < Date.now();
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => openDrawer(p.id)}
                      className="flex w-full items-center gap-3 rounded-md border border-ink-700/70 bg-ink-850/70 px-3 py-2.5 text-left transition hover:border-redx-500/50 hover:bg-ink-800"
                    >
                      <span className="font-mono text-[10.5px] font-bold text-redx-400">{p.ref}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-mist-100">{p.title}</span>
                      {d && <DivChip div={d} />}
                      <StageChip stage={p.stage} />
                      {isOverdue && (
                        <span className="font-mono text-[9.5px] font-bold uppercase text-redx-400">overdue</span>
                      )}
                      <I n="chevR" className="h-3.5 w-3.5 text-mist-500" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* right: live feed */}
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
                    <button
                      onClick={() => openDrawer(a.docId)}
                      className="block max-w-full truncate text-left font-mono text-[10px] font-bold tracking-wider text-cyanx-400 hover:text-cyanx-300"
                    >
                      {a.ref}
                    </button>
                    <p className="text-[12.5px] leading-snug text-mist-200">
                      <b className="text-mist-100">{a.byName}</b> — {a.text}
                    </p>
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-600">{timeAgo(a.at)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <button
            onClick={() => go('activity')}
            className="mt-3 w-full rounded-md border border-ink-600 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400 transition hover:border-cyanx-500/60 hover:text-cyanx-400"
          >
            Full activity log →
          </button>
        </section>
      </div>

      {/* department heads strip */}
      <div className="anim-fade-up mt-4 grid gap-3 sm:grid-cols-2" style={{ animationDelay: '260ms' }}>
        {(['ops', 'tech'] as const).map((cl) => {
          const supId = cl === 'ops' ? 'u-sup1' : 'u-sup2';
          const su = db.users.find((x) => x.id === supId);
          const name = su?.name ?? (cl === 'ops' ? 'Engr. Aries S. Grande' : 'Engr. Julio B. Sergio');
          const divs = DIVISIONS.filter((d) => d.cluster === cl);
          return (
            <div key={cl} className="flex items-center gap-4 rounded-lg border border-ink-700 bg-ink-900/80 p-4">
              <Avatar name={name} size="lg" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-mist-100">
                  {name}
                  {user.id === supId && <span className="ml-2 rounded bg-greenx-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-greenx-500">you · on duty</span>}
                </p>
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-mist-500">{su?.title ?? 'CGPP Department Head II'}</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {divs.map((d) => (
                    <span key={d.id} className="rounded-sm bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-mist-400">
                      {d.code}
                    </span>
                  ))}
                  {cl === 'tech' && (
                    <span className="rounded-sm border border-tealx-500/40 bg-tealx-500/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-tealx-400">
                      INSP-TEAM
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
