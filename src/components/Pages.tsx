import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { CLUSTERS, DESKS, DIVISIONS, INSPECTORATE, KINDS, STAGES, divById } from '../lib/types';
import type { Kind, Role, Stage, User, UserStatus } from '../lib/types';
import { I, type IconName } from './icons';
import { Avatar, DivChip, EmptyState, KindTag, PageHead, PriorityTag, StageChip } from './ui';
import { dayLabel, fmtDT, timeAgo } from '../lib/util';

/* ------------------------------------------------ documents register */
export function DocumentsPage() {
  const { user, visiblePapers, ui, openDrawer, setNewOpen, setReportOpen } = useStore();
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [divF, setDivF] = useState<'all' | string>('all');
  const [kindF, setKindF] = useState<'all' | Kind>('all');
  const isSup = user?.role !== 'division';

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
          <>
            <button className="btn btn-ghost" onClick={() => setReportOpen(true)} title="Print daily / weekly / monthly routing report">
              <I n="printer" className="h-4 w-4" sw={2} />
              Routing report
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
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        {isSup && (
          <select className="field w-auto" value={divF} onChange={(e) => setDivF(e.target.value)}>
            <option value="all">All recipients</option>
            <optgroup label="Executive desks">
              {DESKS.map((d) => (
                <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
              ))}
            </optgroup>
            <optgroup label="Divisions & teams">
              {[...DIVISIONS, INSPECTORATE].map((d) => (
                <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
              ))}
            </optgroup>
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
  const isSup = user?.role !== 'division';

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

      {/* Executive desks — the two department heads as recipients */}
      <section className="anim-fade-up mb-7">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-amberx-500" style={{ boxShadow: '0 0 10px #f5b92488' }} />
          <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Executive desks</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">paperwork can be addressed straight to either desk</span>
          <span className="h-px flex-1 bg-ink-700" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {DESKS.map((d) => {
            const open = db.papers.filter((p) => p.divisionId === d.id && p.stage !== 'completed').length;
            const done = db.papers.filter((p) => p.divisionId === d.id && p.stage === 'completed').length;
            return (
              <button
                key={d.id}
                onClick={() => {
                  setDivFilter(d.id);
                  go('board');
                }}
                className="group flex w-full items-start gap-4 rounded-lg border border-amberx-500/30 bg-ink-900/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-amberx-500/70 hover:bg-ink-800/70"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-amberx-500/50 bg-amberx-500/10 text-amberx-400">
                  <I n="shield" className="h-5 w-5" sw={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[17px] font-bold uppercase tracking-wide text-mist-50">{d.name}</span>
                    <span className="rounded-sm border border-amberx-500/50 bg-amberx-500/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-amberx-400">
                      {d.code}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] font-semibold text-mist-200">{d.head}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-mist-400">{d.desc}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[24px] font-bold leading-none text-amberx-400 tabular">{open}</span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-500">open · {done} closed</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Inspectorate Team — cross-division inspection unit */}
      <section className="anim-fade-up">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-tealx-500" style={{ boxShadow: '0 0 10px #2dd4bf88' }} />
          <h2 className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Cross-division unit</h2>
          <span className="h-px flex-1 bg-ink-700" />
        </div>
        {(() => {
          const open = db.papers.filter((p) => p.divisionId === INSPECTORATE.id && p.stage !== 'completed').length;
          const done = db.papers.filter((p) => p.divisionId === INSPECTORATE.id && p.stage === 'completed').length;
          return (
            <button
              onClick={() => {
                setDivFilter(INSPECTORATE.id);
                go('board');
              }}
              className="flex w-full items-center gap-4 rounded-lg border border-tealx-500/35 bg-ink-900/80 p-4 text-left transition hover:border-tealx-500/70 hover:bg-ink-800/70"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-tealx-500/50 bg-tealx-500/10 text-tealx-400">
                <I n="shield" className="h-5 w-5" sw={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display text-[17px] font-bold uppercase tracking-wide text-mist-50">{INSPECTORATE.name}</span>
                  <span className="rounded-sm border border-tealx-500/50 bg-tealx-500/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-tealx-400">
                    {INSPECTORATE.code}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-mist-400">{INSPECTORATE.desc}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-[24px] font-bold leading-none text-tealx-400 tabular">{open}</span>
                <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-500">open · {done} closed</span>
              </span>
            </button>
          );
        })()}
      </section>
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
  const isSup = user?.role !== 'division';

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
            <option value="all">All recipients</option>
            <optgroup label="Executive desks">
              {DESKS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} · {d.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Divisions & teams">
              {[...DIVISIONS, INSPECTORATE].map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} · {d.name}
                </option>
              ))}
            </optgroup>
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

/* ------------------------------------------------ users & accounts (admin) */
const ROLE_CHIP: Record<Role, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#fbc94a' },
  supervisor: { label: 'Dept. Head', color: '#ff8a4c' },
  division: { label: 'Division', color: '#56c8f0' },
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
  const [err, setErr] = useState('');

  const save = () => {
    if (name.trim().length < 3) return setErr('Full name is required (min. 3 characters).');
    if (role === 'division' && !divisionId) return setErr('A division assignment is required for division accounts.');
    if (password && password.length < 6) return setErr('New password must be at least 6 characters — or leave blank to keep the current one.');
    updateUser(target.id, {
      name: name.trim(),
      title: title.trim(),
      role,
      divisionId: role === 'division' ? divisionId : undefined,
      status,
      password: password || undefined,
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
                <option value="division">Division</option>
                <option value="supervisor">Dept. Head</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Division / team</span>
              <select className="field" value={divisionId} disabled={role !== 'division'} onChange={(e) => { setDivisionId(e.target.value); setErr(''); }}>
                <option value="">— none —</option>
                {DIVISIONS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                <option value={INSPECTORATE.id}>{INSPECTORATE.name}</option>
              </select>
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

          {err && (
            <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
              <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
              {err}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>
              <I n="check" className="h-4 w-4" sw={2.2} />
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UsersPage() {
  const { user, db, approveUser, denyUser, go } = useStore();
  const [editing, setEditing] = useState<User | null>(null);
  if (user?.role !== 'admin' && user?.role !== 'supervisor') return null;
  const isAdmin = user?.role === 'admin';

  const pending = db.users.filter((u) => u.status === 'pending');

  return (
    <div>
      <PageHead
        kicker={isAdmin ? 'Administrator' : 'Access control'}
        title="Users & accounts"
        sub={
          isAdmin
            ? 'Approve sign-up requests, edit accounts, reset passwords and control who holds a key to the system. Every change is written to the system log.'
            : 'Authentication is mandatory — nothing in this system is visible without an authorized account. Account verification is handled by the administrator.'
        }
        right={
          isAdmin ? (
            <button className="btn btn-ghost" onClick={() => go('userlogs')}>
              <I n="history" className="h-4 w-4" sw={2} />
              User history & logs
            </button>
          ) : undefined
        }
      />

      {isAdmin && (
        <section className="anim-fade-up mb-6 rounded-lg border border-amberx-500/35 bg-ink-900/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <I n="bell" className="h-4 w-4 text-amberx-400" sw={2} />
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Verification queue</h3>
            {pending.length > 0 && (
              <span className="rounded bg-amberx-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amberx-400 tabular">
                {pending.length} waiting
              </span>
            )}
            <span className="h-px flex-1 bg-ink-700" />
          </div>

          {pending.length === 0 ? (
            <p className="py-5 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-mist-600">
              No pending account requests — the queue is clear
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {pending.map((u) => {
                const div = divById(u.requestedDivisionId ?? u.divisionId ?? '');
                return (
                  <div key={u.id} className="anim-pop flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 p-3.5">
                    <Avatar name={u.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-mist-50">{u.name}</p>
                      <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
                        @{u.username} · requested {u.requestedTitle ?? u.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {div && <DivChip div={div} />}
                        <span className="font-mono text-[9px] uppercase tracking-wider text-mist-600">
                          {u.requestedAt ? timeAgo(u.requestedAt) : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button onClick={() => approveUser(u.id)} className="btn btn-primary px-3 py-1.5 text-[11.5px]">
                        <I n="check" className="h-3.5 w-3.5" sw={2.4} />
                        Approve
                      </button>
                      <button onClick={() => denyUser(u.id)} className="btn btn-ghost px-3 py-1.5 text-[11.5px] hover:border-redx-500/60 hover:text-redx-400">
                        <I n="x" className="h-3.5 w-3.5" sw={2.4} />
                        Deny
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                {isAdmin && <th className="px-4 py-2.5 text-right font-semibold">Actions</th>}
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
                  <tr key={u.id} className="anim-fade-up border-b border-ink-700/60 transition hover:bg-ink-800/50" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={u.name} />
                          {onDuty && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-greenx-500" title="On duty now" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-mist-100">{u.name}</p>
                          <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">@{u.username} · {u.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: rc.color, background: `${rc.color}1a`, border: `1px solid ${rc.color}55` }}>
                        {rc.label}
                      </span>
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
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {u.id === user?.id ? (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-mist-600">this is you</span>
                        ) : (
                          <button onClick={() => setEditing(u)} className="btn btn-ghost px-3 py-1.5 text-[11px]">
                            <I n="wrench" className="h-3.5 w-3.5" sw={2} />
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-ink-700 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">
          Sign-ups from the gate screen land in the verification queue · every edit is stamped into the system log
        </p>
      </div>

      {editing && isAdmin && <EditUserModal target={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
