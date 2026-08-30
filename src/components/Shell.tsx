import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, type Page } from '../lib/store';
import type { Role } from '../lib/types';
import { I, Seal, type IconName } from './icons';
import { Avatar } from './ui';
import { timeAgo } from '../lib/util';

const NAV: { page: Page; label: string; icon: IconName; roles?: Role[] }[] = [
  { page: 'dashboard', label: 'Command View', icon: 'grid', roles: ['supervisor', 'admin'] },
  { page: 'board', label: 'Tracker Board', icon: 'board' },
  { page: 'documents', label: 'Documents', icon: 'file' },
  { page: 'divisions', label: 'Divisions', icon: 'sitemap' },
  { page: 'activity', label: 'Activity Log', icon: 'pulse', roles: ['supervisor', 'admin'] },
  { page: 'users', label: 'Users & Accounts', icon: 'users', roles: ['supervisor', 'admin'] },
  { page: 'userlogs', label: 'User History & Logs', icon: 'history', roles: ['admin', 'supervisor'] },
];

const NOTIF_META: Record<string, { icon: IconName; color: string }> = {
  new: { icon: 'plus', color: '#56c8f0' },
  route: { icon: 'route', color: '#ff8a4c' },
  move: { icon: 'arr', color: '#f5b924' },
  complete: { icon: 'checkc', color: '#45d483' },
  account: { icon: 'user', color: '#fbc94a' },
};

export function Shell({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const { user, ui, go, visibleNotifs, unread, markAllRead, markRead, openDrawer, logout, resetDemo, setSearch, setNewOpen, setReportOpen } = store;
  const [bellOpen, setBellOpen] = useState(false);
  const prevUnread = useRef(unread);

  // taskbar-style unread badge in the browser tab title
  useEffect(() => {
    document.title =
      unread > 0
        ? `(${unread}) CEO Flow — City Engineering, Puerto Princesa`
        : 'CEO Flow — City Engineering, Puerto Princesa';
  }, [unread]);

  // gentle bell nudge when unread grows
  useEffect(() => {
    if (unread > prevUnread.current) setBellOpen((o) => o); // keep state; badge pops via key
    prevUnread.current = unread;
  }, [unread]);

  const openPapers = useMemo(
    () => store.visiblePapers.filter((p) => p.stage !== 'completed').length,
    [store.visiblePapers]
  );

  if (!user) return null;
  const isSup = user.role === 'supervisor';

  return (
    <div className="bg-blueprint min-h-screen">
      {/* ---------- sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-ink-700/70 bg-ink-900/95 backdrop-blur">
        <div className="flex items-center gap-2.5 border-b border-ink-700/70 px-4 py-4">
          <Seal className="h-9 w-9" />
          <div>
            <p className="font-display text-[15px] font-bold uppercase leading-tight tracking-wider text-mist-50">
              CEO <span className="text-flare-500">Flow</span>
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">City Engineering · PPC</p>
          </div>
        </div>

        <div className="px-3.5 pt-4">
          <button className="btn btn-primary w-full justify-center" onClick={() => setNewOpen(true)}>
            <I n="plus" className="h-4 w-4" sw={2.2} />
            New paperwork
          </button>
        </div>

        <nav className="scroll-slim mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          <p className="px-2 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-mist-600">Command</p>
          {NAV.filter((n) => !n.roles || n.roles.includes(user.role)).map((n) => {
            const active = ui.page === n.page;
            return (
              <button
                key={n.page}
                onClick={() => go(n.page)}
                className={`group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${
                  active ? 'bg-ink-800 text-mist-50' : 'text-mist-400 hover:bg-ink-850 hover:text-mist-100'
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-flare-500 transition-opacity ${
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                  }`}
                />
                <I n={n.icon} className={`h-[17px] w-[17px] ${active ? 'text-flare-400' : 'text-mist-500 group-hover:text-mist-300'}`} />
                {n.label}
                {n.page === 'board' && (
                  <span className="ml-auto rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyanx-400 tabular">
                    {openPapers}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-ink-700/70 p-3">
          <div className="flex items-center gap-2.5 rounded-md bg-ink-850 px-2.5 py-2.5">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-mist-100">{user.name}</p>
              <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
                {user.shortTitle ?? (isSup ? 'Supervisor' : 'Division Head')}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="rounded p-1.5 text-mist-500 transition hover:bg-ink-700 hover:text-redx-400"
            >
              <I n="out" className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={resetDemo}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-600 transition hover:text-cyanx-400"
          >
            <I n="refresh" className="h-3 w-3" />
            Reset demo data
          </button>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <div className="pl-[228px]">
        <header className="sticky top-0 z-30 flex h-[58px] items-center gap-4 border-b border-ink-700/70 bg-ink-950/85 px-5 backdrop-blur">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-mist-600">
              Office of the City Engineer / {ui.page}
            </p>
            <h2 className="truncate font-display text-[19px] font-bold uppercase leading-none tracking-wider text-mist-50">
              {NAV.find((n) => n.page === ui.page)?.label}
            </h2>
          </div>

          <div className="relative ml-2 hidden md:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500">
              <I n="search" className="h-4 w-4" />
            </span>
            <input
              value={ui.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, title, origin…"
              className="field w-[260px] pl-9 font-mono text-[12px]"
            />
            {ui.search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-500 hover:text-mist-200"
              >
                <I n="x" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* print routing report */}
            <button
              onClick={() => setReportOpen(true)}
              className="rounded-md border border-ink-600 bg-ink-850 p-2.5 text-mist-300 transition hover:border-flare-500/70 hover:text-flare-400"
              title="Print paper routing report — daily / weekly / monthly"
            >
              <I n="printer" className="h-[18px] w-[18px]" />
            </button>

            {/* notifications */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className={`relative rounded-md border p-2.5 transition ${
                  bellOpen ? 'border-cyanx-500/60 bg-ink-800 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-300 hover:text-cyanx-400'
                }`}
                title="Notifications"
              >
                <I n="bell" className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span
                    key={unread}
                    className="anim-badge absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-flare-500 px-1 font-mono text-[10px] font-bold text-ink-950"
                  >
                    {unread}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  <div className="anim-pop absolute right-0 top-[calc(100%+10px)] z-50 w-[min(400px,90vw)] overflow-hidden rounded-lg border border-ink-600 bg-ink-850 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)]">
                    <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                      <p className="font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">
                        Signals <span className="ml-1 font-mono text-[10px] font-normal text-mist-500">{visibleNotifs.length}</span>
                      </p>
                      <button
                        onClick={markAllRead}
                        className="rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyanx-400 transition hover:bg-ink-800"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="scroll-slim max-h-[380px] overflow-y-auto">
                      {visibleNotifs.length === 0 && (
                        <div className="px-4 py-10 text-center">
                          <p className="font-display text-base font-semibold uppercase tracking-wide text-mist-400">All clear</p>
                          <p className="mt-1 text-[12px] text-mist-600">No signals for your scope yet.</p>
                        </div>
                      )}
                      {visibleNotifs.map((n) => {
                        const isUnread = !n.readBy.includes(user.id);
                        const meta = NOTIF_META[n.kind] ?? NOTIF_META.move;
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              markRead(n.id);
                              setBellOpen(false);
                              if (n.docId) openDrawer(n.docId);
                            }}
                            className={`flex w-full items-start gap-3 border-b border-ink-700/60 px-4 py-3 text-left transition hover:bg-ink-800/70 ${
                              isUnread ? 'bg-ink-800/40' : ''
                            }`}
                          >
                            <span className="mt-0.5" style={{ color: meta.color }}>
                              <I n={meta.icon} className="h-4 w-4" sw={2} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[12.5px] leading-snug ${isUnread ? 'font-semibold text-mist-100' : 'text-mist-300'}`}>
                                {n.text}
                              </span>
                              <span className="mt-0.5 block font-mono text-[10px] text-mist-500">
                                {n.ref ? `${n.ref} · ` : ''}{timeAgo(n.at)}
                              </span>
                            </span>
                            {isUnread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flare-500" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="border-t border-ink-700 px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
                      Taskbar alerts follow your permission grant
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="hidden items-center gap-2 rounded-md border border-ink-600 bg-ink-850 py-1 pl-1 pr-3 sm:flex">
              <Avatar name={user.name} size="sm" />
              <div className="leading-tight">
                <p className="text-[12px] font-bold text-mist-100">{user.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-mist-500">{user.title}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
