import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { CLUSTERS, DIVISIONS, KINDS, STAGES, USERS, divById } from '../lib/types';
import type { Kind, Stage } from '../lib/types';
import { I, type IconName } from './icons';
import { Avatar, DivChip, EmptyState, KindTag, PageHead, PriorityTag, StageChip } from './ui';
import { dayLabel, fmtDT, timeAgo } from '../lib/util';

/* ------------------------------------------------ documents register */
export function DocumentsPage() {
  const { user, visiblePapers, ui, openDrawer, setNewOpen } = useStore();
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [divF, setDivF] = useState<'all' | string>('all');
  const [kindF, setKindF] = useState<'all' | Kind>('all');
  const isSup = user?.role === 'supervisor';

  const rows = useMemo(() => {
    const q = ui.search.trim().toLowerCase();
    return visiblePapers.filter((p) => {
      if (stage !== 'all' && p.stage !== stage) return false;
      if (divF !== 'all' && p.divisionId !== divF) return false;
      if (kindF !== 'all' && p.kind !== kindF) return false;
      if (q && !`${p.ref} ${p.title} ${p.origin}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [visiblePapers, stage, divF, kindF, ui.search]);

  return (
    <div>
      <PageHead
        kicker="Registry"
        title="Documents"
        sub={
          isSup
            ? 'Every paper logged in the office, filterable by stage, holder and type.'
            : 'Papers that passed through your desk — the full registry stays with Records & Administration.'
        }
        right={
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <I n="plus" className="h-4 w-4" sw={2.2} /> Log paperwork
          </button>
        }
      />

      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-2">
        <select className="field w-auto" value={stage} onChange={(e) => setStage(e.target.value as 'all' | Stage)}>
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        {isSup && (
          <select className="field w-auto" value={divF} onChange={(e) => setDivF(e.target.value)}>
            <option value="all">All divisions</option>
            {DIVISIONS.map((d) => (
              <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
            ))}
          </select>
        )}
        <select className="field w-auto" value={kindF} onChange={(e) => setKindF(e.target.value as 'all' | Kind)}>
          <option value="all">All types</option>
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <option key={k} value={k}>{KINDS[k].label}</option>
          ))}
        </select>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500">
          {rows.length} record{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="anim-fade-up overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80" style={{ animationDelay: '80ms' }}>
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-ink-700 font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-3 py-3 font-semibold">Subject</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Holder</th>
                <th className="px-3 py-3 font-semibold">Stage</th>
                <th className="px-3 py-3 font-semibold">Priority</th>
                <th className="px-3 py-3 text-center font-semibold">Files</th>
                <th className="px-3 py-3 font-semibold">Touched</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const d = divById(p.divisionId);
                return (
                  <tr
                    key={p.id}
                    onClick={() => openDrawer(p.id)}
                    className="cursor-pointer border-b border-ink-700/60 transition-colors last:border-0 hover:bg-ink-800/70"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] font-bold tracking-wider text-cyanx-400">{p.ref}</td>
                    <td className="max-w-[300px] px-3 py-3">
                      <span className="block truncate text-[13px] font-semibold text-mist-100">{p.title}</span>
                      {p.diverted && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-amberx-400">re-routed in transit</span>
                      )}
                    </td>
                    <td className="px-3 py-3"><KindTag kind={p.kind} /></td>
                    <td className="px-3 py-3">{d && <DivChip div={d} />}</td>
                    <td className="px-3 py-3"><StageChip stage={p.stage} /></td>
                    <td className="px-3 py-3"><PriorityTag p={p.priority} /></td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-mist-300 tabular">
                        <I n="clip" className="h-3 w-3" />{p.attachments.length}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[10.5px] text-mist-500">{timeAgo(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="p-6">
            <EmptyState title="No papers match" sub="Loosen the filters or log a new piece of paperwork." icon="file" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------ divisions directory */
export function DivisionsPage() {
  const { db, user, go, setDivFilter } = useStore();
  const isSup = user?.role === 'supervisor';

  return (
    <div>
      <PageHead
        kicker="Organization"
        title="Nine divisions"
        sub="Two supervising clusters carry the office: Field Operations runs the crews, Technical Services runs the paperwork. Click a division to open its board."
      />
      {(['ops', 'tech'] as const).map((cl) => (
        <section key={cl} className="anim-fade-up mb-7">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: cl === 'ops' ? '#ff6b1c' : '#56c8f0', boxShadow: `0 0 10px ${cl === 'ops' ? '#ff6b1c88' : '#56c8f088'}` }} />
            <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">{CLUSTERS[cl].label}</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
              supervised by {CLUSTERS[cl].supervisor}
            </span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {DIVISIONS.filter((d) => d.cluster === cl).map((d, i) => {
              const open = db.papers.filter((p) => p.divisionId === d.id && p.stage !== 'completed').length;
              const done = db.papers.filter((p) => p.divisionId === d.id && p.stage === 'completed').length;
              const mine = user?.divisionId === d.id;
              return (
                <div
                  key={d.id}
                  className={`anim-fade-up group relative overflow-hidden rounded-lg border bg-ink-900/80 p-4 transition-all duration-200 hover:-translate-y-0.5 ${
                    mine ? 'border-flare-500/60' : 'border-ink-700 hover:border-ink-500'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="absolute right-0 top-0 h-0 w-0 border-l-[36px] border-t-[36px] border-l-transparent" style={{ borderTopColor: cl === 'ops' ? '#ff6b1c33' : '#56c8f033' }} />
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-[30px] font-bold leading-none tracking-wide" style={{ color: cl === 'ops' ? '#ff8a4c' : '#6cd1f4' }}>
                      {d.code}
                    </p>
                    {mine && (
                      <span className="rounded bg-flare-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-flare-400">
                        your desk
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-[15px] font-bold text-mist-50">{d.name}</h3>
                  <p className="mt-1 min-h-[36px] text-[12px] leading-relaxed text-mist-400">{d.desc}</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mist-500">
                    Head · <span className="text-mist-300">{d.head}</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2 border-t border-ink-700 pt-3">
                    <span className="rounded bg-ink-800 px-2 py-1 font-mono text-[10px] font-bold text-amberx-400 tabular">{open} open</span>
                    <span className="rounded bg-ink-800 px-2 py-1 font-mono text-[10px] font-bold text-greenx-500 tabular">{done} closed</span>
                    {(isSup || mine) && (
                      <button
                        onClick={() => {
                          setDivFilter(d.id);
                          go('board');
                        }}
                        className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyanx-400 transition hover:bg-ink-800"
                      >
                        Board <I n="arr" className="h-3 w-3" sw={2} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------ activity log */
const ACT_META: Record<string, { icon: IconName; color: string; label: string }> = {
  create: { icon: 'plus', color: '#56c8f0', label: 'Logged' },
  move: { icon: 'arr', color: '#f5b924', label: 'Moved' },
  route: { icon: 'route', color: '#ff8a4c', label: 'Routed' },
  note: { icon: 'note', color: '#86a2be', label: 'Remark' },
  attach: { icon: 'clip', color: '#2dd4bf', label: 'Attached' },
  complete: { icon: 'checkc', color: '#45d483', label: 'Closed' },
};

export function ActivityPage() {
  const { db, activities, openDrawer, user } = useStore();
  const [divF, setDivF] = useState<'all' | string>('all');
  const isSup = user?.role === 'supervisor';

  const filtered = useMemo(() => {
    if (divF === 'all') return activities;
    const touched = new Set<string>();
    for (const p of db.papers) {
      const hit =
        p.divisionId === divF ||
        p.intendedId === divF ||
        p.custody.some((e) => e.toDivisionId === divF || e.fromDivisionId === divF);
      if (hit) touched.add(p.id);
    }
    return activities.filter((a) => touched.has(a.docId));
  }, [activities, db.papers, divF]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof activities>();
    for (const a of filtered) {
      const k = dayLabel(a.at);
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div>
      <PageHead
        kicker="Audit trail"
        title="Activity log"
        sub="Every hand-off, remark and attachment across the office — immutable, time-stamped, and attributable to a named officer."
      />
      {isSup && (
        <div className="anim-fade-up mx-auto mb-5 max-w-3xl">
          <select className="field w-auto" value={divF} onChange={(e) => setDivF(e.target.value)}>
            <option value="all">All divisions</option>
            {DIVISIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} · {d.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="anim-fade-up mx-auto max-w-3xl">
        {groups.length === 0 && (
          <EmptyState title="No events for this division" sub="Nothing has touched this desk yet." icon="pulse" />
        )}
        {groups.map(([day, items]) => (
          <section key={day} className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-flare-400">{day}</span>
              <span className="h-px flex-1 bg-ink-700" />
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-mist-600 tabular">{items.length} events</span>
            </div>
            <ol className="space-y-1.5">
              {items.map((a) => {
                const m = ACT_META[a.type];
                return (
                  <li
                    key={a.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-ink-700/70 bg-ink-900/70 px-3.5 py-2.5 transition hover:border-ink-500 hover:bg-ink-850"
                    onClick={() => openDrawer(a.docId)}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-600 bg-ink-850" style={{ color: m.color }}>
                      <I n={m.icon} className="h-3.5 w-3.5" sw={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-[10px] font-bold tracking-wider text-cyanx-400">{a.ref}</span>
                        <span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: m.color }}>{m.label}</span>
                        <span className="ml-auto font-mono text-[9.5px] text-mist-600 tabular">{fmtDT(a.at)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] leading-snug text-mist-200">
                        <b className="text-mist-100">{a.byName}</b> — {a.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        {activities.length === 0 && <EmptyState title="No activity yet" sub="Logged actions will appear here." icon="pulse" />}
      </div>
      {!isSup && (
        <p className="mt-4 text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-600">
          Showing the full office trail — actions on papers you do not hold remain read-only
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------ users & access */
export function UsersPage() {
  const { user, db } = useStore();
  if (user?.role !== 'supervisor') return null;

  return (
    <div>
      <PageHead
        kicker="Access control"
        title="Users & access"
        sub="Authentication is mandatory — nothing in this system is visible without an authorized account. Supervisors hold the whole office; division accounts hold their queue."
      />

      <div className="anim-fade-up mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: 'shield' as IconName, color: '#56c8f0', t: 'Supervisor scope', d: 'Full visibility across all nine divisions, re-routing authority, and every signal on the bell.' },
          { icon: 'lock' as IconName, color: '#ff8a4c', t: 'Division scope', d: 'Own queue plus the custody trail of everything that ever passed through the desk. Other desks stay read-only.' },
          { icon: 'bell' as IconName, color: '#45d483', t: 'Signals & taskbar', d: 'New postings, forwards and completions raise in-app signals and OS taskbar notifications when permitted.' },
        ].map((c, i) => (
          <div key={c.t} className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: `${i * 70}ms` }}>
            <span style={{ color: c.color }}><I n={c.icon} className="h-5 w-5" sw={1.8} /></span>
            <h3 className="mt-2 font-display text-[17px] font-bold uppercase tracking-wider text-mist-50">{c.t}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-mist-400">{c.d}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {USERS.map((u, i) => {
          const div = u.divisionId ? divById(u.divisionId) : undefined;
          const onDuty = db.session === u.id;
          const queue = div ? db.papers.filter((p) => p.divisionId === div.id && p.stage !== 'completed').length : db.papers.filter((p) => p.stage !== 'completed').length;
          return (
            <div key={u.id} className="anim-fade-up flex items-center gap-3.5 rounded-lg border border-ink-700 bg-ink-900/80 p-4 transition hover:border-ink-500" style={{ animationDelay: `${i * 45}ms` }}>
              <div className="relative">
                <Avatar name={u.name} size="lg" />
                {onDuty && (
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-greenx-500" title="On duty now" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-mist-50">
                  {u.name}
                  {onDuty && <span className="ml-2 rounded bg-greenx-500/15 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-greenx-500">on duty</span>}
                </p>
                <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-mist-500">@{u.username} · {u.title}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {u.role === 'supervisor' ? (
                    <span className="rounded-sm border border-flare-500/60 bg-flare-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-flare-400">
                      Supervisor
                    </span>
                  ) : (
                    div && <DivChip div={div} />
                  )}
                  <span className="font-mono text-[9px] uppercase tracking-wider text-mist-600 tabular">{queue} in scope</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
