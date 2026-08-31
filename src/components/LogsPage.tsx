import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import type { LogType, SysLog } from '../lib/types';
import { cityEngineerName, divById } from '../lib/types';
import { I, Seal, type IconName } from './icons';
import { Avatar, EmptyState, PageHead } from './ui';
import { dayLabel, fmtDT, timeAgo, truncate } from '../lib/util';

const KIND: Record<LogType, { label: string; icon: IconName; color: string }> = {
  login: { label: 'Sign in', icon: 'user', color: '#45d483' },
  logout: { label: 'Sign out', icon: 'out', color: '#6684a3' },
  create: { label: 'Created', icon: 'plus', color: '#56c8f0' },
  stage: { label: 'Moved', icon: 'arr', color: '#f5b924' },
  route: { label: 'Routed', icon: 'route', color: '#ff8a4c' },
  note: { label: 'Remark', icon: 'note', color: '#86a2be' },
  attachment: { label: 'Attached', icon: 'clip', color: '#2dd4bf' },
  reset: { label: 'Reset', icon: 'refresh', color: '#f4645c' },
  signup: { label: 'Sign-up', icon: 'plus', color: '#fbc94a' },
  approve: { label: 'Approved', icon: 'checkc', color: '#62e29a' },
  deny: { label: 'Denied', icon: 'x', color: '#f8837c' },
  edit: { label: 'Edited', icon: 'wrench', color: '#8adcf8' },
  delete: { label: 'Deleted', icon: 'trash', color: '#f4645c' },
  profile: { label: 'Profile', icon: 'user', color: '#45e0cd' },
  resetreq: { label: 'Reset req', icon: 'refresh', color: '#f8837c' },
};

const AUTH: LogType[] = ['login', 'logout', 'signup', 'approve', 'deny', 'edit', 'profile', 'resetreq'];

const D = 864e5;
const toDateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromInput = (s: string) => {
  const [y, m, dd] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, dd || 1, 12, 0, 0).getTime();
};
type Period = 'daily' | 'weekly' | 'monthly';
export function periodRange(p: Period, ts: number): { from: number; to: number; label: string } {
  const d = new Date(ts);
  const sod = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fmt = (x: number) => new Date(x).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  if (p === 'daily') return { from: sod, to: sod + D, label: fmt(sod) };
  if (p === 'weekly') {
    const dow = (new Date(sod).getDay() + 6) % 7;
    const start = sod - dow * D;
    return { from: start, to: start + 7 * D, label: `${fmt(start)} - ${fmt(start + 6 * D)}` };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return { from: start, to: end, label: new Date(start).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) };
}

/* ---------------- printable activity log ---------------- */
export function PrintLogModal({
  presetUser,
  onClose,
}: {
  presetUser?: string;
  onClose: () => void;
}) {
  const { db, user } = useStore();
  const [period, setPeriod] = useState<Period>('daily');
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [uf, setUf] = useState<string>(presetUser ?? 'all');
  const [tf, setTf] = useState<'all' | 'auth' | 'workflow'>('all');

  const range = useMemo(() => periodRange(period, fromInput(date)), [period, date]);

  const rows = useMemo(() => {
    const { from, to } = range;
    return db.logs
      .filter((l) => l.at >= from && l.at < to)
      .filter((l) => (uf === 'all' ? true : l.userId === uf))
      .filter((l) => (tf === 'all' ? true : tf === 'auth' ? AUTH.includes(l.type) : !AUTH.includes(l.type)))
      .sort((a, b) => a.at - b.at)
      .slice(0, 220);
  }, [db.logs, range, uf, tf]);

  const title = period === 'daily' ? 'DAILY' : period === 'weekly' ? 'WEEKLY' : 'MONTHLY';

  return (
    <div className="print-reset fixed inset-0 z-[66] overflow-y-auto">
      <div className="no-print fixed inset-0 bg-ink-950/85 backdrop-blur-sm" onClick={onClose} />
      <div className="print-reset relative mx-auto my-6 w-[min(920px,94vw)]">
        <div className="no-print anim-fade-up mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/95 px-3 py-2.5 shadow-xl">
          <I n="printer" className="h-4 w-4 text-flare-400" sw={2} />
          <span className="mr-1 font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">History log report</span>

          <div className="flex overflow-hidden rounded-md border border-ink-600">
            {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                  period === p ? 'bg-flare-500/20 text-flare-400' : 'bg-ink-850 text-mist-500 hover:text-mist-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="field w-[150px] py-1.5 font-mono text-[11.5px]" />

          <select value={uf} onChange={(e) => setUf(e.target.value)} className="field w-[170px] py-1.5 font-mono text-[11px]">
            <option value="all">All officers</option>
            {db.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select value={tf} onChange={(e) => setTf(e.target.value as 'all' | 'auth' | 'workflow')} className="field w-[140px] py-1.5 font-mono text-[11px]">
            <option value="all">All events</option>
            <option value="auth">Access only</option>
            <option value="workflow">Workflow only</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost py-1.5" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-primary py-1.5" onClick={() => window.print()}>
              <I n="printer" className="h-4 w-4" sw={2.2} />
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="print-sheet anim-pop scroll-slim max-h-[80vh] overflow-y-auto rounded-md bg-white text-[#182a3e] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)]">
          <div className="px-9 py-8">
            <div className="flex items-center gap-4 border-b-[3px] border-[#182a3e] pb-4">
              <Seal className="h-14 w-14" />
              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b7089]">Republic of the Philippines</p>
                <p className="font-display text-[22px] font-bold uppercase leading-tight tracking-wide">City of Puerto Princesa</p>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#31506e]">Office of the City Engineer</p>
                <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.18em] text-[#8a9ab0]">CEO Flow — System Activity & User History</p>
              </div>
              <div className="w-14 text-right font-mono text-[9px] uppercase leading-relaxed text-[#8a9ab0]">
                Form
                <br />
                CEO-LOG-01
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between">
              <div>
                <h1 className="font-display text-[26px] font-bold uppercase leading-none tracking-wide">{title} Activity & History Log</h1>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b7089]">
                  Coverage · {range.label}
                  {uf !== 'all' ? ` · Officer: ${db.users.find((u) => u.id === uf)?.name ?? ''}` : ''}
                  {tf !== 'all' ? ` · ${tf === 'auth' ? 'Access events only' : 'Workflow events only'}` : ''}
                </p>
              </div>
              <span className="stamp text-[11px]" style={{ color: period === 'daily' ? '#0e7490' : period === 'weekly' ? '#b45309' : '#7c2d12' }}>
                {title}
              </span>
            </div>

            {rows.length === 0 ? (
              <p className="mt-6 border border-dashed border-[#c8d3e0] px-4 py-10 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8a9ab0]">
                No activity recorded for this period and filter
              </p>
            ) : (
              <table className="mt-5 w-full border-collapse text-[10.5px] leading-snug">
                <thead>
                  <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                    <th className="py-1.5 pr-2">Date & time</th>
                    <th className="py-1.5 pr-2">Officer</th>
                    <th className="py-1.5 pr-2">Event</th>
                    <th className="py-1.5 pr-2">Details</th>
                    <th className="py-1.5">Doc ref</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id} className="border-b border-[#dde5ee] align-top">
                      <td className="py-1.5 pr-2 font-mono text-[9.5px] whitespace-nowrap text-[#5b7089]">{fmtDT(l.at)}</td>
                      <td className="py-1.5 pr-2 font-semibold whitespace-nowrap">{l.userName}</td>
                      <td className="py-1.5 pr-2 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: KIND[l.type].color }}>
                        {KIND[l.type].label}
                      </td>
                      <td className="py-1.5 pr-2">{l.text}</td>
                      <td className="py-1.5 font-mono text-[9.5px] font-bold">{l.ref ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#8a9ab0]">
              {rows.length} event{rows.length === 1 ? '' : 's'} shown (extract limit 220 per print)
            </p>

            <div className="mt-9 grid grid-cols-2 gap-10">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b7089]">Prepared by</p>
                <div className="mt-10 border-t-2 border-[#182a3e] pt-1.5">
                  <p className="text-[12px] font-bold">{user?.name}</p>
                  <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#5b7089]">{user?.title}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b7089]">Noted by</p>
                <div className="mt-10 border-t-2 border-[#182a3e] pt-1.5">
                  <p className="text-[12px] font-bold">{cityEngineerName(db.users)}</p>
                  <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#5b7089]">CGPP Department Head II (City Engineer)</p>
                </div>
              </div>
            </div>

            <p className="mt-8 border-t border-[#dde5ee] pt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] system-fonts">
              Generated by CEO Flow · {fmtDT(Date.now())} · electronic system log — immutable & time-stamped
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- admin page ---------------- */
export function LogsPage() {
  const { db, openDrawer } = useStore();
  const [selected, setSelected] = useState<string>('all');
  const [kind, setKind] = useState<'all' | 'auth' | 'workflow'>('all');
  const [q, setQ] = useState('');
  const [printFor, setPrintFor] = useState<string | null>(null);

  const roster = useMemo(() => {
    const now = Date.now();
    const week = now - 7 * 864e5;
    return db.users.map((u) => {
      const mine = db.logs.filter((l) => l.userId === u.id);
      return {
        u,
        lastLogin: mine.find((l) => l.type === 'login'),
        lastEvent: mine[0],
        events: mine.filter((l) => l.at >= week).length,
        logins: mine.filter((l) => l.type === 'login').length,
        hist: Array.from({ length: 14 }, (_, i) => {
          const dayStart = new Date(new Date(now - (13 - i) * 864e5).setHours(0, 0, 0, 0)).getTime();
          return mine.filter((l) => l.at >= dayStart && l.at < dayStart + 864e5).length;
        }),
      };
    });
  }, [db.users, db.logs]);

  const logs = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.logs.filter((l) => {
      if (selected !== 'all' && l.userId !== selected) return false;
      if (kind === 'auth' && !AUTH.includes(l.type)) return false;
      if (kind === 'workflow' && AUTH.includes(l.type)) return false;
      if (query && !`${l.userName} ${l.text} ${l.ref ?? ''}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [db.logs, selected, kind, q]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof logs>();
    for (const l of logs) {
      const k = dayLabel(l.at);
      m.set(k, [...(m.get(k) ?? []), l]);
    }
    return [...m.entries()];
  }, [logs]);

  const signinsToday = db.logs.filter((l) => l.type === 'login' && dayLabel(l.at) === 'Today').length;
  const weekEvents = db.logs.filter((l) => l.at >= Date.now() - 7 * 864e5 && l.type !== 'login' && l.type !== 'logout').length;
  const top = [...roster].sort((a, b) => b.events - a.events)[0];

  const stats = [
    { label: 'Accounts on record', value: db.users.length, color: '#56c8f0', icon: 'users' as IconName },
    { label: 'Sign-ins today', value: signinsToday, color: '#45d483', icon: 'user' as IconName },
    { label: 'Workflow events · 7d', value: weekEvents, color: '#ff8a4c', icon: 'pulse' as IconName },
    { label: 'Most active · 7d', value: top ? top.events : 0, color: '#f5b924', icon: 'shield' as IconName, hint: top?.u.name },
  ];

  return (
    <div>
      <PageHead
        kicker="Administrator"
        title="User history & logs"
        sub="Every sign-in, approval and document action by every officer — attributable, time-stamped and exportable for audit."
        right={
          <button className="btn btn-primary" onClick={() => setPrintFor(selected)}>
            <I n="printer" className="h-4 w-4" sw={2.2} />
            Print history log
          </button>
        }
      />

      {/* stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="anim-fade-up relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="absolute right-3 top-3" style={{ color: `${s.color}66` }}>
              <I n={s.icon} className="h-5 w-5" sw={1.4} />
            </span>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-mist-500">{s.label}</p>
            <p className="mt-1 font-display text-[36px] font-bold leading-none tabular" style={{ color: s.color }}>
              {s.value}
            </p>
            {s.hint && <p className="mt-1 truncate text-[11px] text-mist-400">{s.hint}</p>}
            <span className="absolute inset-x-0 bottom-0 h-[2.5px]" style={{ background: `${s.color}55` }} />
          </div>
        ))}
      </div>

      {/* roster */}
      <section className="anim-fade-up mb-6 rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '140ms' }}>
        <div className="mb-3 flex items-center gap-2">
          <I n="users" className="h-3.5 w-3.5 text-cyanx-400" sw={2} />
          <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Officer roster — 14-day pulse</h3>
          <span className="h-px flex-1 bg-ink-700" />
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-mist-600">click to isolate history</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {roster.map(({ u, lastLogin, events, hist }) => (
            <button
              key={u.id}
              onClick={() => setSelected(selected === u.id ? 'all' : u.id)}
              className={`rounded-md border px-3 py-2.5 text-left transition ${
                selected === u.id
                  ? 'border-flare-500/70 bg-flare-500/[0.07]'
                  : 'border-ink-700 bg-ink-850/70 hover:border-cyanx-500/50 hover:bg-ink-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-mist-100">{u.name}</p>
                  <p className="truncate font-mono text-[9px] uppercase tracking-wider text-mist-500">
                    @{u.username} · {u.shortTitle ?? u.title}
                    {u.divisionId ? ` · ${divById(u.divisionId)?.code ?? ''}` : ''}
                    {u.status === 'pending' && <span className="ml-1 text-amberx-400">· pending</span>}
                    {u.status === 'disabled' && <span className="ml-1 text-redx-400">· disabled</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-[18px] font-bold leading-none text-cyanx-400 tabular">{events}</p>
                  <p className="font-mono text-[8px] uppercase tracking-wider text-mist-600">events 7d</p>
                </div>
              </div>
              <div className="mt-2 flex items-end gap-[3px]">
                {hist.map((h, i) => (
                  <span
                    key={i}
                    className="h-5 flex-1 rounded-[2px] bg-ink-700/70"
                    title={`${h} event${h === 1 ? '' : 's'}`}
                    style={{
                      background: h > 0 ? (i >= 12 ? '#ff8a4c' : '#2fa9d6') : undefined,
                      opacity: h > 0 ? Math.min(1, 0.35 + h * 0.18) : 1,
                    }}
                  />
                ))}
              </div>
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-mist-600">
                Last sign-in: {lastLogin ? timeAgo(lastLogin.at) : 'no sign-in on record'}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* log feed */}
      <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: '220ms' }}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <I n="history" className="h-3.5 w-3.5 text-flare-400" sw={2} />
          <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">System log</h3>
          <span className="rounded bg-ink-700 px-2 py-0.5 font-mono text-[10px] font-bold text-mist-200 tabular">{logs.length}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mist-500">
                <I n="search" className="h-3.5 w-3.5" />
              </span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search log…" className="field w-[170px] py-1.5 pl-8 font-mono text-[11px]" />
            </div>
            <select value={kind} onChange={(e) => setKind(e.target.value as 'all' | 'auth' | 'workflow')} className="field w-auto py-1.5 font-mono text-[11px]">
              <option value="all">All events</option>
              <option value="auth">Access only</option>
              <option value="workflow">Workflow only</option>
            </select>
          </div>
        </div>

        {logs.length === 0 ? (
          <EmptyState icon="history" title="No matching log entries" sub="Adjust the officer, event type or search query." />
        ) : (
          <div className="space-y-5">
            {groups.map(([day, list]) => (
              <div key={day}>
                <p className="mb-2 flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-mist-500">
                  <span className="h-1 w-1 rounded-full bg-flare-500" />
                  {day}
                  <span className="h-px flex-1 bg-ink-700" />
                  {list.length} events
                </p>
                <ul className="space-y-1">
                  {list.map((l: SysLog) => {
                    const k = KIND[l.type];
                    return (
                      <li key={l.id} className="flex items-start gap-3 rounded-md px-2 py-2 transition hover:bg-ink-800/70">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-600 bg-ink-850" style={{ color: k.color }}>
                          <I n={k.icon} className="h-3.5 w-3.5" sw={2.1} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-mist-200">
                            <b className="text-mist-50">{l.userName}</b>
                            <span className="mx-1.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: k.color }}>
                              {k.label}
                            </span>
                            {truncate(l.text, 150)}
                          </p>
                          <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-600">
                            {fmtDT(l.at)}
                            {l.ref && (
                              <>
                                {' · '}
                                <button onClick={() => l.docId && openDrawer(l.docId)} className="font-bold text-cyanx-400 hover:text-cyanx-300">
                                  {l.ref} →
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {printFor !== null && <PrintLogModal presetUser={printFor === 'all' ? 'all' : printFor} onClose={() => setPrintFor(null)} />}
    </div>
  );
}
