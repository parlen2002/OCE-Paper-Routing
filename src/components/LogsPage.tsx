import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { USERS, divById, type LogType, type SysLog } from '../lib/types';
import { I, type IconName } from './icons';
import { Avatar, EmptyState, PageHead } from './ui';
import { dayLabel, fmtDT, timeAgo } from '../lib/util';

const LOG_META: Record<LogType, { label: string; icon: IconName; color: string }> = {
  login: { label: 'Sign-in', icon: 'user', color: '#56c8f0' },
  logout: { label: 'Sign-out', icon: 'out', color: '#86a2be' },
  create: { label: 'Logged paper', icon: 'plus', color: '#6cd1f4' },
  stage: { label: 'Stage move', icon: 'arr', color: '#f5b924' },
  route: { label: 'Forwarded', icon: 'route', color: '#ff8a4c' },
  note: { label: 'Remark', icon: 'note', color: '#a9c0d6' },
  attachment: { label: 'Attachment', icon: 'clip', color: '#2dd4bf' },
  reset: { label: 'Data reset', icon: 'refresh', color: '#f4645c' },
};

const TYPE_FILTERS: { id: 'all' | 'auth' | 'workflow'; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'auth', label: 'Access only' },
  { id: 'workflow', label: 'Workflow only' },
];

export function LogsPage() {
  const { db, openDrawer } = useStore();
  const [selected, setSelected] = useState<string>('all');
  const [kind, setKind] = useState<'all' | 'auth' | 'workflow'>('all');
  const [q, setQ] = useState('');

  const logs = db.logs;

  const stats = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 864e5;
    const loginsToday = logs.filter((l) => l.type === 'login' && l.at >= dayStart.getTime()).length;
    const eventsWeek = logs.filter((l) => l.at >= weekAgo && l.type !== 'login' && l.type !== 'logout').length;
    const perUser = new Map<string, number>();
    for (const l of logs) perUser.set(l.userId, (perUser.get(l.userId) ?? 0) + 1);
    const top = [...perUser.entries()].sort((a, b) => b[1] - a[1])[0];
    const topUser = top ? USERS.find((u) => u.id === top[0]) : undefined;
    return { loginsToday, eventsWeek, topUser, topCount: top?.[1] ?? 0 };
  }, [logs]);

  const perUser = useMemo(() => {
    return USERS.map((u) => {
      const mine = logs.filter((l) => l.userId === u.id);
      const lastLogin = mine.find((l) => l.type === 'login');
      const lastEvent = mine[0];
      const events = mine.filter((l) => l.type !== 'login' && l.type !== 'logout').length;
      // 14-day mini histogram
      const hist = new Array(14).fill(0) as number[];
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      for (const l of mine) {
        const diff = Math.floor((dayStart.getTime() - new Date(new Date(l.at).setHours(0, 0, 0, 0)).getTime()) / 864e5);
        if (diff >= 0 && diff < 14) hist[13 - diff]++;
      }
      return { u, lastLogin, lastEvent, events, logins: mine.filter((l) => l.type === 'login').length, hist };
    }).sort((a, b) => (b.lastEvent?.at ?? 0) - (a.lastEvent?.at ?? 0));
  }, [logs]);

  const feed = useMemo(() => {
    return logs.filter((l) => {
      if (selected !== 'all' && l.userId !== selected) return false;
      if (kind === 'auth' && l.type !== 'login' && l.type !== 'logout') return false;
      if (kind === 'workflow' && (l.type === 'login' || l.type === 'logout')) return false;
      if (q.trim()) {
        const hay = `${l.userName} ${l.text} ${l.ref ?? ''}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, selected, kind, q]);

  const groups = useMemo(() => {
    const m = new Map<string, SysLog[]>();
    for (const l of feed) {
      const k = dayLabel(l.at);
      m.set(k, [...(m.get(k) ?? []), l]);
    }
    return [...m.entries()];
  }, [feed]);

  const selectedUser = USERS.find((u) => u.id === selected);
  const maxHist = Math.max(1, ...perUser.flatMap((p) => p.hist));

  return (
    <div>
      <PageHead
        kicker="System audit · admin only"
        title="User history & logs"
        sub="Every sign-in, sign-out and action each officer performs in CEO Flow — attributable, time-stamped, and retained for audit."
      />

      {/* stats */}
      <div className="anim-fade-up mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Accounts on record', value: String(USERS.length), sub: '2 supervisors · 9 divisions · 1 admin', color: '#56c8f0', icon: 'users' as IconName },
          { label: 'Sign-ins today', value: String(stats.loginsToday), sub: 'Since midnight, local time', color: '#2dd4bf', icon: 'user' as IconName },
          { label: 'Workflow events · 7d', value: String(stats.eventsWeek), sub: 'Creates, moves, forwards, remarks', color: '#ff8a4c', icon: 'pulse' as IconName },
          { label: 'Most active officer', value: stats.topUser?.name.replace('Engr. ', '').split(' ')[0] ?? '—', sub: stats.topUser ? `${stats.topCount} recorded events` : 'No activity yet', color: '#f5b924', icon: 'shield' as IconName },
        ].map((s, i) => (
          <div key={s.label} className="relative overflow-hidden rounded-lg border border-ink-700 bg-ink-900/80 p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="absolute right-3 top-3" style={{ color: `${s.color}66` }}>
              <I n={s.icon} className="h-6 w-6" sw={1.4} />
            </span>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-mist-500">{s.label}</p>
            <p className="mt-1 truncate font-display text-[30px] font-bold leading-none tabular" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] text-mist-500">{s.sub}</p>
            <span className="absolute inset-x-0 bottom-0 h-[2.5px]" style={{ background: `${s.color}55` }} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* ------- roster ------- */}
        <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 xl:col-span-2" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-3">
            <I n="users" className="h-3.5 w-3.5 text-flare-400" sw={2} />
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">Officer roster</h3>
            <span className="ml-auto font-mono text-[10px] text-mist-600">14-day pulse →</span>
          </div>
          <div className="scroll-slim max-h-[640px] overflow-y-auto">
            <button
              onClick={() => setSelected('all')}
              className={`flex w-full items-center gap-3 border-b border-ink-700/60 px-4 py-2.5 text-left transition ${
                selected === 'all' ? 'bg-flare-500/10' : 'hover:bg-ink-850'
              }`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-md border ${selected === 'all' ? 'border-flare-500 text-flare-400' : 'border-ink-600 text-mist-400'}`}>
                <I n="pulse" className="h-4 w-4" />
              </span>
              <span className="flex-1 text-[13px] font-bold text-mist-100">All officers</span>
              <span className="font-mono text-[10.5px] text-mist-500 tabular">{logs.length} events</span>
            </button>

            {perUser.map(({ u, lastLogin, lastEvent, events, logins, hist }) => {
              const active = selected === u.id;
              const div = u.divisionId ? divById(u.divisionId) : undefined;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelected(u.id === selected ? 'all' : u.id)}
                  className={`flex w-full items-center gap-3 border-b border-ink-700/60 px-4 py-2.5 text-left transition ${
                    active ? 'bg-cyanx-500/[0.08]' : 'hover:bg-ink-850'
                  }`}
                >
                  <Avatar name={u.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-mist-100">{u.name}</span>
                    <span className="block truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
                      @{u.username} · {u.role === 'admin' ? 'Administrator' : u.role === 'supervisor' ? 'Supervisor' : div?.code}
                    </span>
                  </span>
                  <span className="hidden h-7 items-end gap-[2px] sm:flex" title="Last 14 days of activity">
                    {hist.map((h, i) => (
                      <span
                        key={i}
                        className="w-[4px] rounded-t-sm transition-all"
                        style={{ height: `${Math.max(8, (h / maxHist) * 100)}%`, background: h > 0 ? (active ? '#56c8f0' : '#35557e') : '#1b3354' }}
                      />
                    ))}
                  </span>
                  <span className="w-[92px] text-right">
                    <span className="block font-mono text-[10px] text-mist-300 tabular">{events} events</span>
                    <span className="block font-mono text-[9px] text-mist-600">
                      {lastLogin ? `in ${timeAgo(lastLogin.at)}` : 'never signed in'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ------- history feed ------- */}
        <section className="anim-fade-up rounded-lg border border-ink-700 bg-ink-900/80 xl:col-span-3" style={{ animationDelay: '180ms' }}>
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 px-4 py-3">
            <I n="history" className="h-3.5 w-3.5 text-cyanx-400" sw={2} />
            <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">
              {selectedUser ? `History — ${selectedUser.name}` : 'Full system log'}
            </h3>
            <span className="rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] text-mist-300 tabular">{feed.length}</span>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <div className="flex overflow-hidden rounded-md border border-ink-600">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setKind(f.id)}
                    className={`px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-wider transition ${
                      kind === f.id ? 'bg-cyanx-500/20 text-cyanx-300' : 'bg-ink-850 text-mist-500 hover:text-mist-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <I n="search" className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-mist-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter log…" className="field w-[150px] py-1 pl-7 text-[11.5px]" />
              </div>
            </div>
          </div>

          {selectedUser && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-ink-700/70 bg-ink-850/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-mist-400">
              <span>role · <b className="text-mist-100">{selectedUser.role}</b></span>
              {selectedUser.divisionId && (
                <span>division · <b className="text-mist-100">{divById(selectedUser.divisionId)?.name}</b></span>
              )}
              <span>sign-ins · <b className="text-mist-100">{perUser.find((p) => p.u.id === selectedUser.id)?.logins ?? 0}</b></span>
              <span>last seen · <b className="text-mist-100">{perUser.find((p) => p.u.id === selectedUser.id)?.lastEvent ? timeAgo(perUser.find((p) => p.u.id === selectedUser.id)!.lastEvent!.at) : '—'}</b></span>
            </div>
          )}

          <div className="scroll-slim max-h-[560px] overflow-y-auto px-4 py-4">
            {feed.length === 0 && (
              <EmptyState icon="history" title="No matching events" sub="Adjust the officer, event type or filter text to widen the audit window." />
            )}
            <div className="space-y-5">
              {groups.map(([day, items]) => (
                <div key={day}>
                  <p className="mb-2 flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.24em] text-mist-500">
                    <span className="h-px w-4 bg-ink-600" />
                    {day}
                    <span className="h-px flex-1 bg-ink-700" />
                  </p>
                  <ol className="relative ml-2.5 space-y-2.5 border-l border-ink-700 pl-4">
                    {items.map((l) => {
                      const m = LOG_META[l.type];
                      return (
                        <li key={l.id} className="anim-fade-up relative">
                          <span
                            className="absolute -left-[23px] top-1 h-[9px] w-[9px] rounded-full border-2 border-ink-900"
                            style={{ background: m.color }}
                          />
                          <div className="rounded-md border border-ink-700/70 bg-ink-850/70 px-3 py-2 transition hover:border-ink-600 hover:bg-ink-850">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ background: `${m.color}1c`, color: m.color }}>
                                <I n={m.icon} className="h-2.5 w-2.5" sw={2.4} />
                                {m.label}
                              </span>
                              <b className="text-[12px] text-mist-100">{l.userName}</b>
                              {l.ref && (
                                <button
                                  onClick={() => l.docId && openDrawer(l.docId)}
                                  className="font-mono text-[10px] font-bold tracking-wider text-cyanx-400 hover:text-cyanx-300"
                                >
                                  {l.ref} ↗
                                </button>
                              )}
                              <span className="ml-auto font-mono text-[9.5px] text-mist-600 tabular">{fmtDT(l.at)}</span>
                            </div>
                            <p className="mt-1 text-[12px] leading-snug text-mist-300">{l.text}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          <p className="border-t border-ink-700 px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-mist-600">
            Retention · latest {logs.length} system events kept on device · export via the routing report (printer, top bar)
          </p>
        </section>
      </div>
    </div>
  );
}
