/**
 * OCE Flow — mobile layout.
 * A separate, touch-first experience shown on small screens (≤820px), while
 * desktops keep the full PC layout. Bottom-tab navigation, card feeds,
 * bottom-sheet paperwork view, and full messaging/alerts/profile support.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, MSG_EDIT_WINDOW } from '../lib/store';
import type { DivInfo, Kind, Paper, Priority, Stage, User } from '../lib/core';
import {
  ALL_UNITS, CROSS_UNITS, DESKS, DIVISIONS, KINDS, MOODS, PRIORITIES, STAGES,
  buildAttachments, divById, fmtCoord, fmtDT, fmtPct, mapsLink, stageMeta, timeAgo,
} from '../lib/core';
import { I, Avatar, StageChip, KindTag, PriorityTag, ProgressBar, DivChip, Seal, StaticMapImage, type IconName } from './ui';

/* ------------------------------------------------------------------
 * Android / mobile "back" handling.
 * Keeps a stack of open overlays. While anything is open we hold one extra
 * history entry, so the OS back gesture fires `popstate` (closing the top
 * overlay) instead of navigating away / exiting the browser.
 * ------------------------------------------------------------------ */
const backStack: Array<() => void> = [];
let backEntry = false;

function onMobilePop() {
  if (backStack.length === 0) {
    backEntry = false;
    return; // nothing open — let the browser handle it
  }
  const top = backStack.pop();
  if (top) top();
  if (backStack.length === 0) backEntry = false; // entry was consumed
  else window.history.pushState({ oceBack: true }, ''); // keep one for the next press
}

if (typeof window !== 'undefined') window.addEventListener('popstate', onMobilePop);

/** Register an overlay with the back stack. `open` toggles it, `onClose` fires on back. */
function useMobileBack(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const handler = () => closeRef.current();
    backStack.push(handler);
    if (!backEntry) {
      backEntry = true;
      window.history.pushState({ oceBack: true }, '');
    }
    return () => {
      const idx = backStack.indexOf(handler);
      if (idx !== -1) backStack.splice(idx, 1);
      // closed programmatically (not via back) — rebalance the history entry
      if (backStack.length === 0 && backEntry) {
        backEntry = false;
        window.history.back();
      }
    };
  }, [open]);
}



type TabId = 'home' | 'board' | 'docs' | 'chat' | 'me';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'grid' },
  { id: 'board', label: 'Board', icon: 'board' },
  { id: 'docs', label: 'Docs', icon: 'file' },
  { id: 'chat', label: 'Chat', icon: 'send' },
  { id: 'me', label: 'Me', icon: 'user' },
];

export function MobileApp() {
  const store = useStore();
  const { me, unread, msgUnreadTotal, theme, custom } = store;
  const [tab, setTab] = useState<TabId>('home');
  const [alertsOpen, setAlertsOpen] = useState(false);
  // OS back closes the alerts sheet before leaving the app
  useMobileBack(alertsOpen, () => setAlertsOpen(false));
  if (!me) return null;

  return (
    <div className="bg-blueprint flex min-h-screen flex-col" style={{ backgroundColor: theme.mood.tones[0] }}>
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-950/85 backdrop-blur">
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <Seal className="h-8 w-8" />
          <div className="min-w-0">
            <p className="font-display text-[16px] font-bold uppercase leading-none tracking-wider text-mist-50">
              OCE <span className="text-flare-400">Flow</span>
            </p>
            <p className="mt-0.5 truncate font-mono text-[8px] uppercase tracking-[0.18em] text-mist-500">
              {custom.orgName || 'Office of the City Engineer'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setAlertsOpen(true)} className="relative rounded-md border border-ink-600 bg-ink-850 p-2 text-mist-300 active:scale-95" title="Alerts">
              <I n="bell" className="h-4 w-4" />
              {unread > 0 && <span className="anim-badge absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-flare-500 px-1 font-mono text-[9px] font-bold ink-flare tabular">{unread}</span>}
            </button>
            <button onClick={() => setTab('me')} className="rounded-md active:scale-95" title="Profile">
              <Avatar name={me.name} size="sm" />
            </button>
          </div>
        </div>
      </header>

      {/* content */}
      <main className="min-w-0 flex-1" style={{ paddingBottom: 'calc(70px + env(safe-area-inset-bottom))' }}>
        {tab === 'home' && <MobileHome />}
        {tab === 'board' && <MobileBoard />}
        {tab === 'docs' && <MobileDocs />}
        {tab === 'chat' && <MobileMessages />}
        {tab === 'me' && <MobileMe />}
      </main>

      {/* alerts bottom-sheet (from header bell) */}
      {alertsOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setAlertsOpen(false)} />
          <div className="anim-slide-up absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl border-t border-ink-600 bg-ink-900 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.7)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-ink-600" />
            <div className="flex items-center justify-between border-b border-ink-700 px-4 pb-2">
              <p className="font-display text-[17px] font-bold uppercase tracking-wider text-mist-50">Signals</p>
              <button onClick={() => setAlertsOpen(false)} className="rounded-md border border-ink-600 p-1.5 text-mist-400 active:scale-95">
                <I n="x" className="h-3.5 w-3.5" sw={2.4} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <MobileAlerts />
            </div>
          </div>
        </div>
      )}

      {/* bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-900/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.id;
            const badge = t.id === 'chat' ? msgUnreadTotal : 0;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="relative flex flex-col items-center gap-0.5 py-2 active:scale-95">
                <span className={`relative rounded-lg px-3 py-1 transition-colors ${active ? 'bg-flare-500/15 text-flare-400' : 'text-mist-500'}`}>
                  <I n={t.icon} className="h-[18px] w-[18px]" sw={active ? 2.2 : 1.8} />
                  {badge > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-flare-500 px-1 font-mono text-[9px] font-bold ink-flare tabular">{badge}</span>}
                </span>
                <span className={`font-mono text-[8.5px] font-bold uppercase tracking-wider ${active ? 'text-flare-400' : 'text-mist-600'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* paperwork bottom sheet (driven by the shared drawer id) */}
      <MobilePaperSheet />
    </div>
  );
}

/* ------------------------------------------------ home / command view */
function MobileHome() {
  const { me, scopePapers, divOf, openDrawer } = useStore();
  if (!me) return null;

  const papers = scopePapers;
  const open = papers.filter((p) => p.stage !== 'completed');
  const inQueue = papers.filter((p) => p.stage === 'received' || p.stage === 'review').length;
  const working = papers.filter((p) => p.stage === 'progress' || p.stage === 'verification').length;
  const week = Date.now() - 7 * 864e5;
  const doneWeek = papers.filter((p) => p.stage === 'completed' && p.updatedAt >= week).length;
  const urgentOpen = open.filter((p) => p.priority === 'urgent').sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
  const overdueOpen = open.filter((p) => p.dueAt != null && p.dueAt < Date.now()).sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
  const daysOver = (dueAt: number) => Math.max(1, Math.ceil((Date.now() - dueAt) / 864e5));

  const myDiv = me.divisionId ? divOf(me.divisionId) : undefined;
  const isOver = me.role === 'admin' || me.role === 'supervisor' || me.role === 'moderator' || me.role === 'operator';
  const scopeLabel = isOver
    ? 'Whole office'
    : me.role === 'division'
      ? myDiv?.name ?? 'Your division'
      : 'Your work orders';

  const stats: { label: string; value: number; hint: string; color: string; icon: IconName }[] = [
    { label: 'In intake', value: inQueue, hint: 'Received + review', color: '#56c8f0', icon: 'inbox' },
    { label: 'Being worked', value: working, hint: 'Progress + verify', color: '#ff8a4c', icon: 'wrench' },
    { label: 'Urgent open', value: urgentOpen.length, hint: 'Needs attention', color: '#f4645c', icon: 'alert' },
    { label: 'Overdue', value: overdueOpen.length, hint: 'Past deadline', color: '#f5b924', icon: 'clock' },
    { label: 'Closed · 7d', value: doneWeek, hint: 'Completed this week', color: '#45d483', icon: 'checkc' },
    { label: 'Total open', value: open.length, hint: 'On your plate', color: '#a78bfa', icon: 'board' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="anim-fade-up space-y-4 px-4 pt-4">
      {/* greeting */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-flare-400">Command view</p>
          <h1 className="mt-0.5 font-display text-[26px] font-bold uppercase leading-none tracking-wide text-mist-50">
            {greeting}, <span className="text-flare-400">{me.name.split(' ').slice(-1)[0]}</span>
          </h1>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-500">
            {scopeLabel} · {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Avatar name={me.name} size="lg" />
      </div>

      {/* status cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {stats.map((s, i) => (
          <button
            key={s.label}
            onClick={() => openDrawer(urgentOpen[0]?.id ?? open[0]?.id ?? '')}
            disabled={!open.length}
            className="anim-fade-up relative overflow-hidden rounded-xl border border-ink-700 bg-ink-900/80 p-3.5 text-left transition active:scale-[0.97] disabled:cursor-default"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="absolute right-3 top-3" style={{ color: `${s.color}66` }}>
              <I n={s.icon} className="h-5 w-5" sw={1.5} />
            </span>
            <p className="pr-7 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-mist-500">{s.label}</p>
            <p className="mt-1 font-display text-[34px] font-bold leading-none tabular" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-1 text-[10.5px] text-mist-500">{s.hint}</p>
            <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `${s.color}55` }} />
          </button>
        ))}
      </div>

      {/* urgent */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <I n="alert" className="h-4 w-4 text-redx-400" sw={2.2} />
          <h2 className="font-display text-[17px] font-bold uppercase tracking-wider text-mist-100">Urgent — needs attention</h2>
          <span className="ml-auto rounded-md bg-redx-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-redx-400 tabular">{urgentOpen.length}</span>
        </div>
        {urgentOpen.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-600 px-3 py-5 text-center font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
            Nothing burning — all urgent papers are closed
          </p>
        ) : (
          <ul className="space-y-2">
            {urgentOpen.map((p) => (
              <PaperRow key={p.id} p={p} div={divOf(p.divisionId)} onOpen={() => openDrawer(p.id)} />
            ))}
          </ul>
        )}
      </section>

      {/* overdue */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <I n="clock" className="h-4 w-4 text-amberx-400" sw={2.2} />
          <h2 className="font-display text-[17px] font-bold uppercase tracking-wider text-mist-100">Overdue — act now</h2>
          <span className={`ml-auto rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tabular ${overdueOpen.length ? 'bg-amberx-500/20 text-amberx-400' : 'bg-ink-700 text-mist-500'}`}>
            {overdueOpen.length}
          </span>
        </div>
        {overdueOpen.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-600 px-3 py-5 text-center font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
            All deadlines are being met — nothing is overdue
          </p>
        ) : (
          <ul className="space-y-2">
            {overdueOpen.map((p) => (
              <PaperRow key={p.id} p={p} div={divOf(p.divisionId)} onOpen={() => openDrawer(p.id)} badge={`${daysOver(p.dueAt ?? Date.now())}d late`} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PaperRow({ p, div, onOpen, badge }: { p: Paper; div?: DivInfo; onOpen: () => void; badge?: string }) {
  const pct = p.progress ?? (p.stage === 'completed' ? 100 : 0);
  const pm = PRIORITIES[p.priority];
  return (
    <li>
      <button onClick={onOpen} className="w-full rounded-xl border border-ink-700 bg-ink-900/80 p-3 text-left transition active:scale-[0.98]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold tracking-wider text-cyanx-400">{p.ref}</span>
          <span className="rounded-sm px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-wider" style={{ color: pm.color, background: `${pm.color}1a`, border: `1px solid ${pm.color}40` }}>
            {p.priority}
          </span>
          {badge && <span className="rounded-sm border border-amberx-500/50 bg-amberx-500/12 px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-wider text-amberx-400">{badge}</span>}
          <StageChip stage={p.stage} />
          <I n="chevR" className="ml-auto h-3.5 w-3.5 shrink-0 text-mist-500" sw={2.4} />
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-mist-100">{p.title}</p>
        <div className="mt-2 flex items-center gap-2">
          {div && <DivChip div={div} />}
          <span className="ml-auto w-24"><ProgressBar value={pct} /></span>
          <span className="w-9 text-right font-mono text-[10px] font-bold text-mist-300 tabular">{fmtPct(pct)}%</span>
        </div>
      </button>
    </li>
  );
}

/* ------------------------------------------------ board */
function MobileBoard() {
  const { me, visiblePapers, openDrawer, ui, setDivFilter, setNewOpen } = useStore();
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [q, setQ] = useState('');
  if (!me) return null;
  const isWide = me.role === 'admin' || me.role === 'supervisor' || me.role === 'moderator' || me.role === 'operator';
  const isField = me.role === 'employee' || me.role === 'joborder';

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return visiblePapers.filter((p) => {
      if (stage !== 'all' && p.stage !== stage) return false;
      if (!isWide && !isField && ui.divFilter === 'all' && p.divisionId !== me.divisionId && !(p.recipientIds ?? []).includes(me.divisionId ?? '')) return false;
      if (isWide && ui.divFilter !== 'all' && p.divisionId !== ui.divFilter) return false;
      if (!ql) return true;
      return `${p.ref} ${p.title} ${p.origin}`.toLowerCase().includes(ql);
    });
  }, [visiblePapers, stage, q, isWide, isField, ui.divFilter, me.divisionId]);

  const count = (s: 'all' | Stage) => (s === 'all' ? list.length : list.filter((p) => p.stage === s).length);

  return (
    <div className="px-3 pt-3">
      {/* search */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500"><I n="search" className="h-4 w-4" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search paperwork…" className="field w-full py-2 pl-9 font-mono text-[12px]" />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500" title="Clear"><I n="x" className="h-3.5 w-3.5" sw={2.4} /></button>
        )}
      </div>

      {/* stage pills */}
      <div className="scroll-slim -mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 pb-1">
        <button onClick={() => setStage('all')} className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-95 ${stage === 'all' ? 'border-flare-500/70 bg-flare-500/15 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400'}`}>
          All · {count('all')}
        </button>
        {STAGES.map((s) => (
          <button key={s.id} onClick={() => setStage(s.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-95 ${stage === s.id ? 'border-cyanx-500/70 bg-cyanx-500/12 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-400'}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label} · {count(s.id)}
          </button>
        ))}
      </div>

      {/* division filter for wide roles */}
      {isWide && (
        <div className="scroll-slim -mx-3 mt-1.5 flex gap-1.5 overflow-x-auto px-3 pb-1">
          <button onClick={() => setDivFilter('all')} className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition active:scale-95 ${ui.divFilter === 'all' ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-500'}`}>
            All desks
          </button>
          {ALL_UNITS.map((d) => (
            <button key={d.id} onClick={() => setDivFilter(d.id === ui.divFilter ? 'all' : d.id)} className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition active:scale-95 ${ui.divFilter === d.id ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-500'}`}>
              {d.code}
            </button>
          ))}
        </div>
      )}

      {/* cards */}
      <div className="mt-2.5 space-y-2.5 pb-4">
        {list.length === 0 && (
          <div className="mt-10 rounded-xl border border-dashed border-ink-600 px-4 py-10 text-center">
            <I n="inbox" className="mx-auto h-7 w-7 text-mist-600" sw={1.4} />
            <p className="mt-2 font-display text-[16px] font-bold uppercase tracking-wide text-mist-400">Nothing here</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-600">Adjust the filters or log new paperwork</p>
          </div>
        )}
        {list.map((p) => (
          <MobilePaperCard key={p.id} paper={p} onOpen={() => openDrawer(p.id)} />
        ))}
      </div>

      {/* new paperwork FAB */}
      {!isField && (
        <button
          onClick={() => setNewOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-flare-500 py-3 pl-4 pr-5 font-mono text-[11px] font-bold uppercase tracking-wider ink-flare shadow-[0_12px_30px_-8px_rgba(255,107,28,0.6)] transition active:scale-95"
        >
          <I n="plus" className="h-4 w-4" sw={2.6} /> Log
        </button>
      )}
    </div>
  );
}

function MobilePaperCard({ paper, onOpen }: { paper: Paper; onOpen: () => void }) {
  const div = divById(paper.divisionId);
  const pct = paper.progress ?? (paper.stage === 'completed' ? 100 : 0);
  const done = paper.stage === 'completed';
  const overdue = paper.dueAt != null && paper.dueAt < Date.now() && !done;
  const recipients = paper.recipientIds ?? [paper.divisionId];
  const imgs = paper.attachments.filter((a) => a.kind === 'image').slice(0, 3);
  return (
    <button onClick={onOpen} className="paper-card relative block w-full overflow-hidden rounded-xl p-3.5 pl-4 text-left transition active:scale-[0.985]">
      <span className="absolute inset-y-0 left-0 w-[4px]" style={{ background: PRIORITIES[paper.priority].color }} />
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] font-bold tracking-wider text-[#5b7089]">{paper.ref}</span>
        <PriorityTag p={paper.priority} />
        {overdue && <span className="stamp ml-auto border-[#f4645c] px-1.5 py-px text-[8.5px] text-[#f4645c]">Overdue</span>}
        {done && <span className="stamp ml-auto border-[#1f9d55] px-1.5 py-px text-[8.5px] text-[#1f9d55]">Closed</span>}
      </div>
      <h3 className="mt-1 font-display text-[19px] font-bold leading-tight tracking-wide text-[#132437]">{paper.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {div && <DivChip div={div} tone="paper" />}
        <KindTag kind={paper.kind} />
        {recipients.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-[#2fa9d6]/50 bg-[#56c8f0]/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-[#0e7490]">
            <I n="route" className="h-2.5 w-2.5" sw={2.4} /> ×{recipients.length}
          </span>
        )}
        {paper.attachments.some((a) => a.geotagged) && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-[#2dd4bf]/50 bg-[#2dd4bf]/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-[#0d9488]">
            <I n="pin" className="h-2.5 w-2.5" sw={2.4} /> GPS
          </span>
        )}
        <StageChip stage={paper.stage} />
      </div>
      {imgs.length > 0 && (
        <div className="mt-2 flex gap-1.5">
          {imgs.map((a) => (<img key={a.id} src={a.url} alt={a.name} className="h-12 w-16 rounded-md border border-[#d8cfb4] object-cover" />))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2.5 border-t border-[#d8cfb4] pt-2">
        <ProgressBar value={pct} />
        <span className="shrink-0 font-mono text-[10px] font-bold text-[#5b7089] tabular">{fmtPct(pct)}%</span>
        <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#8a9ab0]">{timeAgo(paper.updatedAt)}</span>
      </div>
    </button>
  );
}

/* ------------------------------------------------ paperwork bottom sheet */
function MobilePaperSheet() {
  const store = useStore();
  const { db, me, ui, closeDrawer, moveStage, routePaperMulti, addNote, canEdit, deletePaper, updatePaper, ackPaper, myUnitId, oicUnitIds, assignPaper, submitToHead, returnToEmployee, addAttachments, removeAttachment, stampGeoAttachments, setProgress, employeesOf, pushToast, setViewer } = store;
  const paper = ui.drawerId ? db.papers.find((p) => p.id === ui.drawerId) : null;

  const [note, setNote] = useState('');
  const [stageSel, setStageSel] = useState<Stage | ''>('');
  const [fwd, setFwd] = useState<string[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [rmAtt, setRmAtt] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  /* attach-source chooser (gallery vs. files) */
  const [attachOpen, setAttachOpen] = useState(false);
  /* photos whose EXIF location was stripped — offered the device's live GPS */
  const [geoPending, setGeoPending] = useState<string[]>([]);
  const [geoBusy, setGeoBusy] = useState(false);
  /* completion slider — local draft while dragging, committed once on release (same as desktop) */
  const [pctDraft, setPctDraft] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /* "From files" path — no image/* accept, so Android returns original bytes with EXIF GPS intact */
  const origRef = useRef<HTMLInputElement>(null);

  // OS back: photo viewer closes first, then this sheet
  useMobileBack(!!ui.viewer, () => setViewer(null));
  useMobileBack(!!ui.drawerId && !ui.viewer, closeDrawer);

  useEffect(() => { setNote(''); setStageSel(''); setFwd([]); setConfirmDel(false); setRmAtt(null); setEditOpen(false); setAttachOpen(false); setBusy(false); setPctDraft(null); setGeoPending([]); setGeoBusy(false); setViewer(null); }, [ui.drawerId]);
  if (!paper || !me) return null;

  const editable = canEdit(paper);
  const isField = me.role === 'employee' || me.role === 'joborder';
  const pct = paper.progress ?? (paper.stage === 'completed' ? 100 : 0);
  const shown = pctDraft ?? pct;
  const commitPct = () => {
    if (pctDraft == null) return;
    setProgress(paper.id, pctDraft);
    setPctDraft(null);
  };
  const div = divById(paper.divisionId);
  const geo = paper.attachments.find((a) => a.geotagged && a.lat != null && a.lng != null);
  const custody = [...paper.custody].sort((a, b) => b.at - a.at);
  const stampable = Array.from(new Set([myUnitId, ...oicUnitIds].filter((u): u is string => !!u)));
  const myStampUnit = stampable.find((u) => (paper.recipientIds ?? []).includes(u) && !(paper.receivedBy ?? []).includes(u)) ?? null;
  const emps = employeesOf(paper.divisionId);
  const canAssignRole = me.role === 'admin' || me.role === 'supervisor' || me.role === 'division' || me.role === 'moderator' || me.role === 'operator';
  const pics = (paper.assignees ?? []).map((id) => db.users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => !!u);
  const iAmPic = isField && (paper.assignees ?? []).includes(me.id);

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const { atts, skipped } = await buildAttachments(files, me.name);
      if (atts.length) addAttachments(paper.id, atts);
      if (skipped.length) pushToast('warn', `Skipped — ${skipped.join('; ')}`);

      // The browser/OS usually strips EXIF GPS on upload — offer the device's live location.
      const missing = atts.filter((a) => a.kind === 'image' && !a.geotagged).map((a) => a.id);
      if (missing.length) setGeoPending((g) => [...new Set([...g, ...missing])]);
    } finally {
      setBusy(false);
      setAttachOpen(false);
      if (fileRef.current) fileRef.current.value = '';
      if (origRef.current) origRef.current.value = '';
    }
  };

  const stampGeo = () => {
    if (!paper || !geoPending.length) return;
    if (!('geolocation' in navigator)) {
      pushToast('warn', 'This browser has no geolocation support.');
      setGeoPending([]);
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        stampGeoAttachments(paper.id, geoPending, pos.coords.latitude, pos.coords.longitude);
        setGeoPending([]);
        setGeoBusy(false);
      },
      (err) => {
        pushToast('warn', err.code === err.PERMISSION_DENIED
          ? 'Location permission denied — allow it in your browser settings to stamp photos.'
          : 'Could not read device location — turn on GPS / location services and try again.');
        setGeoPending([]);
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/60">
      <div className="flex-1" onClick={closeDrawer} />
      <div className="anim-pop flex max-h-[92vh] flex-col rounded-t-2xl border-t border-ink-600 bg-ink-900 shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.9)]">
        {/* handle + header */}
        <div className="border-b border-ink-700 px-4 pb-3 pt-2">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ink-600" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-cyanx-400">{paper.ref}</span>
            <StageChip stage={paper.stage} />
            <KindTag kind={paper.kind} />
            <button onClick={closeDrawer} className="ml-auto rounded-md border border-ink-600 p-2 text-mist-400 active:scale-95" title="Close">
              <I n="x" className="h-4 w-4" />
            </button>
          </div>
          <h2 className="mt-1.5 font-display text-[22px] font-bold leading-tight tracking-wide text-mist-50">{paper.title}</h2>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mist-500">
            {KINDS[paper.kind].label} · {paper.origin}
          </p>
        </div>

        <div className="scroll-slim flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {/* receive */}
          {myStampUnit && paper.stage !== 'completed' && (
            <button onClick={() => ackPaper(paper.id, myStampUnit)} className="btn btn-primary w-full justify-center py-3">
              <I n="checkc" className="h-4 w-4" sw={2.2} /> Receive — stamp {divById(myStampUnit)?.code}
              {myStampUnit !== myUnitId && <span className="rounded-sm bg-ink-950/25 px-1.5 py-px font-mono text-[8.5px] font-bold uppercase">as OIC</span>}
            </button>
          )}

          {/* completion */}
          <section>
            <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">
              Completion · <span className={pctDraft != null ? 'text-amberx-400' : 'text-tealx-400'}>{fmtPct(shown)}%</span>
              {pctDraft != null && <span className="ml-1.5 text-amberx-400/80 normal-case tracking-normal">· release to save</span>}
            </p>
            <input type="range" min={0} max={100} step={0.5} value={shown} disabled={!editable}
              onChange={(e) => setPctDraft(Number(e.target.value))}
              onPointerUp={commitPct}
              onTouchEnd={commitPct}
              onBlur={commitPct}
              className="range-teal w-full accent-tealx-500" />
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {[0, 25, 50, 75, 100].map((v) => (
                <button key={v} disabled={!editable || (isField && v === 100)} onClick={() => { setPctDraft(null); setProgress(paper.id, v); }}
                  className={`rounded-md border px-1 py-2 font-mono text-[10.5px] font-bold tabular transition active:scale-95 ${Math.abs(shown - v) < 0.25 ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-300'} disabled:cursor-not-allowed disabled:opacity-40`}>
                  {v}%
                </button>
              ))}
            </div>
          </section>

          {/* move stage */}
          {editable && (
            <section>
              <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Move this paper</p>
              <div className="flex gap-2">
                <select value={stageSel} onChange={(e) => setStageSel(e.target.value as Stage)} className="field flex-1">
                  <option value="">Choose a stage…</option>
                  {STAGES.filter((s) => !(isField && s.id === 'completed')).map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                </select>
                <button disabled={!stageSel} onClick={() => { if (stageSel) { moveStage(paper.id, stageSel, note || undefined); setStageSel(''); setNote(''); } }} className="btn btn-primary shrink-0">
                  <I n="send" className="h-4 w-4" sw={2} /> Move
                </button>
              </div>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional remark for the trail…" className="field mt-2 font-mono text-[11.5px]" />
            </section>
          )}

          {/* forward */}
          {editable && (
            <section>
              <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Forward / re-route · {fwd.length} selected</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_UNITS.filter((d) => d.id !== paper.divisionId).map((d) => {
                  const on = fwd.includes(d.id);
                  return (
                    <button key={d.id} onClick={() => setFwd((f) => (on ? f.filter((x) => x !== d.id) : [...f, d.id]))}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider transition active:scale-95 ${on ? 'border-cyanx-500/70 bg-cyanx-500/12 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-500'}`}>
                      {on && <I n="check" className="h-2.5 w-2.5" sw={2.8} />} {d.code}
                    </button>
                  );
                })}
              </div>
              {fwd.length > 0 && (
                <button onClick={() => { routePaperMulti(paper.id, fwd, note || undefined); setFwd([]); setNote(''); }} className="btn btn-primary mt-2 w-full justify-center">
                  <I n="route" className="h-4 w-4" sw={2} /> Transmit to {fwd.length} desk{fwd.length > 1 ? 's' : ''}
                </button>
              )}
            </section>
          )}

          {/* person-in-charge */}
          {(canAssignRole || pics.length > 0) && (
            <section>
              <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Persons-in-charge · {pics.length}</p>
              {canAssignRole && emps.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {emps.map((e) => {
                    const on = (paper.assignees ?? []).includes(e.id);
                    return (
                      <button key={e.id} onClick={() => assignPaper(paper.id, on ? (paper.assignees ?? []).filter((x) => x !== e.id) : [...(paper.assignees ?? []), e.id])}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider transition active:scale-95 ${on ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-500'}`}>
                        {on && <I n="check" className="h-2.5 w-2.5" sw={2.8} />} {e.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {pics.map((p) => (
                    <span key={p.id} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider ${p.id === me.id ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-300'}`}>
                      <I n="users" className="h-3 w-3" sw={2} /> {p.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                    </span>
                  ))}
                </div>
              )}
              {iAmPic && !paper.pendingHeadReview && paper.stage !== 'completed' && (
                <button onClick={() => submitToHead(paper.id)} className="btn btn-primary mt-2 w-full justify-center">
                  <I n="send" className="h-4 w-4" sw={2} /> Submit to division head
                </button>
              )}
              {paper.pendingHeadReview && (
                <p className="mt-2 rounded-md border border-amberx-500/40 bg-amberx-500/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amberx-400">
                  Awaiting division-head verification
                </p>
              )}
              {canAssignRole && paper.pendingHeadReview && (
                <button onClick={() => returnToEmployee(paper.id)} className="btn btn-ghost mt-2 w-full justify-center">
                  <I n="history" className="h-4 w-4" sw={2} /> Return to employee
                </button>
              )}
            </section>
          )}

          {/* evidence */}
          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Evidence · {paper.attachments.length}</p>
              <button onClick={() => setAttachOpen(true)} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-md border border-ink-600 bg-ink-850 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-cyanx-400 active:scale-95 disabled:opacity-50">
                {busy ? (
                  <><span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-cyanx-400/30 border-t-cyanx-400" /> Processing…</>
                ) : (
                  <><I n="plus" className="h-3 w-3" sw={2.4} /> Add photo / PDF</>
                )}
              </button>
            </div>
            {geo && (
              <div className="mb-2 overflow-hidden rounded-lg border border-ink-700">
                <StaticMapImage lat={geo.lat!} lng={geo.lng!} className="h-36 w-full object-cover" aspect={16 / 7} />
                <div className="flex items-center gap-2 bg-ink-850 px-3 py-2">
                  <I n="pin" className="h-3.5 w-3.5 text-tealx-400" sw={2.2} />
                  <span className="font-mono text-[10px] text-mist-300">{fmtCoord(geo.lat!, geo.lng!)}</span>
                  <a href={mapsLink(geo.lat!, geo.lng!)} target="_blank" rel="noreferrer" className="ml-auto font-mono text-[9px] font-bold uppercase tracking-wider text-cyanx-400">Maps ↗</a>
                </div>
              </div>
            )}
            {geoPending.length > 0 && (
              <div className="anim-pop mb-2 rounded-lg border border-amberx-500/45 bg-amberx-500/10 p-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amberx-400">
                  <I n="pin" className="h-3 w-3" sw={2.4} /> No location in {geoPending.length} photo{geoPending.length > 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-mist-300">No GPS in the file's data or printed stamp. Stamp it with your device's current location instead.</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={stampGeo} disabled={geoBusy} className="btn btn-primary flex-1 justify-center py-2 text-[11px] disabled:opacity-60">
                    {geoBusy ? <><span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-ink-950/30 border-t-ink-950" /> Reading GPS…</> : <><I n="pin" className="h-3.5 w-3.5" sw={2.2} /> Use my location</>}
                  </button>
                  <button onClick={() => setGeoPending([])} className="btn btn-ghost px-3 py-2 text-[11px]">Skip</button>
                </div>
              </div>
            )}
            {paper.attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {paper.attachments.map((a) => (
                  <div key={a.id} className="relative overflow-hidden rounded-lg border border-ink-700">
                    {a.kind === 'image' ? (
                      <button onClick={() => setViewer({ docId: paper.id, attId: a.id })} className="block h-20 w-full overflow-hidden" title="View photo">
                        <img src={a.url} alt={a.name} className="h-20 w-full object-cover transition active:scale-105" />
                      </button>
                    ) : (
                      <a href={a.url} target="_blank" rel="noreferrer" className="flex h-20 w-full flex-col items-center justify-center gap-1 bg-flare-500/10 text-flare-400">
                        <I n="file" className="h-6 w-6" sw={1.6} />
                        <span className="font-mono text-[8px] font-bold uppercase">PDF</span>
                      </a>
                    )}
                    {a.geotagged && (
                      <span className={`absolute bottom-1 left-1 rounded-sm px-1 py-px font-mono text-[7.5px] font-bold uppercase ${a.geoSource === 'device' ? 'bg-cyanx-400/90 ink-cyanx' : 'bg-tealx-500/90 text-ink-950'}`} title={`Location via ${a.geoSource === 'device' ? 'device location' : 'photo EXIF'}`}>
                        {a.geoSource === 'device' ? 'GPS·device' : 'GPS'}
                      </span>
                    )}
                    <button
                      onClick={() => (rmAtt === a.id ? (removeAttachment(paper.id, a.id), setRmAtt(null)) : setRmAtt(a.id))}
                      className={`absolute right-1 top-1 rounded-md p-1 font-mono text-[8px] font-bold uppercase ${rmAtt === a.id ? 'bg-redx-500 text-white' : 'bg-ink-950/80 text-mist-300'}`}
                      title={rmAtt === a.id ? 'Tap again to confirm removal' : 'Remove'}
                    >
                      {rmAtt === a.id ? 'Sure?' : <I n="x" className="h-3 w-3" sw={2.6} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* add note */}
          <section>
            <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Add a remark</p>
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type a remark for the trail…" className="field flex-1 font-mono text-[11.5px]" />
              <button disabled={!note.trim()} onClick={() => { addNote(paper.id, note); setNote(''); }} className="btn btn-ghost shrink-0"><I n="plus" className="h-4 w-4" sw={2.2} /> Add</button>
            </div>
          </section>

          {/* custody trail */}
          <section>
            <p className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Chain of custody</p>
            <ol className="space-y-2">
              {custody.map((e) => (
                <li key={e.id} className="flex gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyanx-500/70" />
                  <div className="min-w-0 border-b border-ink-700/60 pb-2">
                    <p className="text-[12.5px] leading-snug text-mist-200"><b className="text-mist-100">{e.byName}</b> — {e.text}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-600">{fmtDT(e.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* admin / moderator record controls */}
          {(me.role === 'admin' || me.role === 'moderator') && (
            <section className="border-t border-ink-700 pt-4">
              <p className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Record controls</p>
              {me.role === 'admin' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditOpen(true)} className="btn btn-ghost justify-center" title="Edit paperwork fields">
                    <I n="wrench" className="h-4 w-4" sw={2} /> Edit
                  </button>
                  <button
                    onClick={() => { if (confirmDel) { deletePaper(paper.id); closeDrawer(); } else { setConfirmDel(true); window.setTimeout(() => setConfirmDel(false), 3000); } }}
                    className={`btn justify-center ${confirmDel ? 'border border-redx-500 bg-redx-500/20 text-redx-400' : 'btn-ghost'}`}>
                    <I n="trash" className="h-4 w-4" sw={2} /> {confirmDel ? 'Tap again to delete' : 'Delete'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { if (confirmDel) { deletePaper(paper.id); closeDrawer(); } else { setConfirmDel(true); window.setTimeout(() => setConfirmDel(false), 3000); } }}
                  className={`btn w-full justify-center ${confirmDel ? 'border border-redx-500 bg-redx-500/20 text-redx-400' : 'btn-ghost'}`}>
                  <I n="trash" className="h-4 w-4" sw={2} /> {confirmDel ? 'Tap again to confirm delete' : 'Delete record'}
                </button>
              )}
            </section>
          )}
        </div>
      </div>

      {/* attach-source chooser */}
      {attachOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setAttachOpen(false)} />
          <div className="anim-slide-up absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-ink-600 bg-ink-900 px-4 pb-6 pt-3" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-600" />
            <p className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-mist-500">Add evidence</p>
            <p className="mb-3 text-[11px] leading-snug text-mist-400">
              Android's <b className="text-mist-200">Photos / gallery picker strips the photo's GPS</b> for privacy.
              To keep the location, choose <b className="text-tealx-400">From files</b> instead.
            </p>

            {/* Gallery / camera path (fast, but GPS is usually stripped) */}
            <input ref={fileRef} type="file" multiple accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf,application/pdf" className="hidden" onChange={(e) => void pickFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-ink-600 bg-ink-850 px-4 py-3.5 text-left transition active:scale-[0.98] disabled:opacity-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyanx-500/15 text-cyanx-400"><I n="cam" className="h-5 w-5" sw={1.8} /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-mist-50">Camera / gallery</span>
                <span className="block font-mono text-[9px] uppercase tracking-wider text-mist-500">Quick pick · GPS usually stripped</span>
              </span>
            </button>

            {/* Files path — original bytes, EXIF GPS preserved */}
            <input ref={origRef} type="file" multiple accept="*/*" className="hidden" onChange={(e) => void pickFiles(e.target.files)} />
            <button onClick={() => origRef.current?.click()} disabled={busy} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-tealx-500/45 bg-tealx-500/[0.08] px-4 py-3.5 text-left transition active:scale-[0.98] disabled:opacity-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tealx-500/15 text-tealx-400"><I n="pin" className="h-5 w-5" sw={1.8} /></span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-mist-50">From files <span className="ml-1 rounded-sm bg-tealx-500/20 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-tealx-400">Keeps photo location</span></span>
                <span className="block font-mono text-[9px] uppercase tracking-wider text-mist-500">Browse Files / Drive · original with GPS</span>
              </span>
            </button>

            <button onClick={() => setAttachOpen(false)} className="btn btn-ghost w-full justify-center">Cancel</button>
          </div>
        </div>
      )}

      {/* edit paperwork bottom sheet */}
      {editOpen && (
        <MobileEditSheet paper={paper} onClose={() => setEditOpen(false)} onSave={(patch) => { updatePaper(paper.id, patch); setEditOpen(false); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------ mobile edit paperwork sheet */
function MobileEditSheet({ paper, onClose, onSave }: { paper: Paper; onClose: () => void; onSave: (patch: Partial<Paper>) => void }) {
  const [title, setTitle] = useState(paper.title);
  const [origin, setOrigin] = useState(paper.origin);
  const [kind, setKind] = useState<Kind>(paper.kind);
  const [priority, setPriority] = useState<Priority>(paper.priority);
  const [due, setDue] = useState(paper.dueAt ? new Date(paper.dueAt).toISOString().slice(0, 10) : '');
  const [remarks, setRemarks] = useState(paper.remarks ?? '');
  useMobileBack(true, onClose);

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      origin: origin.trim(),
      kind,
      priority,
      dueAt: due ? new Date(due + 'T17:00:00').getTime() : undefined,
      remarks: remarks.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="anim-slide-up absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-ink-600 bg-ink-900 px-4 pb-6 pt-3" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-600" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-flare-400">Edit paperwork</p>
            <p className="mt-0.5 font-mono text-[11px] text-mist-400">{paper.ref}</p>
          </div>
          <button onClick={onClose} className="rounded-md border border-ink-600 p-2 text-mist-400 active:scale-95"><I n="x" className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3.5">
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-mist-500">Title</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-mist-500">Origin</span>
            <input className="field" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-mist-500">Kind</span>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {Object.entries(KINDS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-mist-500">Priority</span>
              <select className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {Object.entries(PRIORITIES).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-mist-500">Due date</span>
            <input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-mist-500">Remarks</span>
            <textarea className="field" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn btn-ghost flex-1 justify-center">Cancel</button>
            <button onClick={save} disabled={!title.trim()} className="btn btn-primary flex-1 justify-center"><I n="check" className="h-4 w-4" sw={2.2} /> Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ documents */
function MobileDocs() {
  const { visiblePapers, openDrawer } = useStore();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<'all' | Stage>('all');
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return visiblePapers.filter((p) => {
      if (stage !== 'all' && p.stage !== stage) return false;
      if (!ql) return true;
      return `${p.ref} ${p.title} ${p.origin}`.toLowerCase().includes(ql);
    });
  }, [visiblePapers, q, stage]);

  return (
    <div className="px-3 pt-3">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500"><I n="search" className="h-4 w-4" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="field w-full py-2 pl-9 font-mono text-[12px]" />
      </div>
      <div className="scroll-slim -mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 pb-1">
        <button onClick={() => setStage('all')} className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${stage === 'all' ? 'border-flare-500/70 bg-flare-500/15 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400'}`}>All</button>
        {STAGES.map((s) => (
          <button key={s.id} onClick={() => setStage(s.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${stage === s.id ? 'border-cyanx-500/70 bg-cyanx-500/12 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-400'}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.label}
          </button>
        ))}
      </div>
      <div className="mt-2.5 space-y-2 pb-4">
        {rows.map((p) => {
          const pct = p.progress ?? (p.stage === 'completed' ? 100 : 0);
          return (
            <button key={p.id} onClick={() => openDrawer(p.id)} className="block w-full rounded-xl border border-ink-700 bg-ink-900/80 p-3 text-left transition active:scale-[0.985]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-cyanx-400">{p.ref}</span>
                <StageChip stage={p.stage} />
                <span className="ml-auto font-mono text-[10px] font-bold text-mist-300 tabular">{fmtPct(pct)}%</span>
              </div>
              <p className="mt-1 truncate text-[13.5px] font-semibold text-mist-100">{p.title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar value={pct} />
                <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-mist-600">{timeAgo(p.updatedAt)}</span>
              </div>
            </button>
          );
        })}
        {rows.length === 0 && <p className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist-600">No documents match</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------ messages */
function MobileMessages() {
  const store = useStore();
  const { visibleChannels, messagesOf, unreadFor, markChannelRead, sendMsg, canPostChannel, me, updateMessage, requestDeleteMessage, msgDeletes, approveDeleteMessage, denyDeleteMessage, visiblePapers, db } = store;
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachQ, setAttachQ] = useState('');
  const [attachIds, setAttachIds] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // OS back returns to the channel list before leaving the app
  useMobileBack(!!sel, () => setSel(null));

  const channel = visibleChannels.find((c) => c.id === sel) ?? null;
  const msgs = channel ? messagesOf(channel.id) : [];
  const filtered = search.trim() ? msgs.filter((m) => m.text.toLowerCase().includes(search.trim().toLowerCase())) : msgs;

  useEffect(() => { if (channel) markChannelRead(channel.id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sel, msgs.length]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, sel]);

  const groups = useMemo(() => {
    const g: { label: string; items: typeof visibleChannels }[] = [];
    const ex = visibleChannels.filter((c) => c.kind === 'executive');
    const fl = visibleChannels.filter((c) => c.kind === 'floor');
    const dv = visibleChannels.filter((c) => c.kind === 'unit' && c.unitId && !CROSS_UNITS.some((t) => t.id === c.unitId));
    const tm = visibleChannels.filter((c) => c.kind === 'unit' && c.unitId && CROSS_UNITS.some((t) => t.id === c.unitId));
    if (ex.length) g.push({ label: 'Executive', items: ex });
    if (fl.length) g.push({ label: 'Office', items: fl });
    if (dv.length) g.push({ label: 'Divisions', items: dv });
    if (tm.length) g.push({ label: 'Teams', items: tm });
    return g;
  }, [visibleChannels]);

  const submit = () => {
    if (!channel || !draft.trim() || !canPostChannel(channel)) return;
    sendMsg(channel.id, draft, attachIds.length ? attachIds : undefined);
    setDraft(''); setAttachIds([]); setAttachOpen(false); setAttachQ('');
  };

  /* channel list */
  if (!channel) {
    return (
      <div className="px-3 pt-3">
        <p className="font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Messages</p>
        <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Live across every open session</p>

        {me?.role === 'admin' && msgDeletes.length > 0 && (
          <div className="mt-3 rounded-xl border border-redx-500/40 bg-redx-500/[0.07] p-3">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-redx-400">Deletion requests · {msgDeletes.length}</p>
            {msgDeletes.map((r) => (
              <div key={r.id} className="mt-2 rounded-lg border border-ink-700 bg-ink-850 p-2.5">
                <p className="text-[12px] leading-snug text-mist-200">“{r.text}”</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-mist-600">{r.byName} · {timeAgo(r.at)}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approveDeleteMessage(r.id)} className="btn btn-primary flex-1 justify-center py-1.5 text-[11px]"><I n="trash" className="h-3 w-3" sw={2.2} /> Delete</button>
                  <button onClick={() => denyDeleteMessage(r.id)} className="btn btn-ghost flex-1 justify-center py-1.5 text-[11px]">Keep</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-4 pb-4">
          {groups.map((g) => (
            <section key={g.label}>
              <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-mist-600">{g.label}</p>
              <div className="space-y-1.5">
                {g.items.map((c) => {
                  const u = unreadFor(c.id);
                  return (
                    <button key={c.id} onClick={() => { setSel(c.id); setSearch(''); }} className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/80 p-3 text-left transition active:scale-[0.985]">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyanx-500/12 text-cyanx-400"><I n="send" className="h-4 w-4" sw={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-mist-100">{c.name}</span>
                        <span className="block font-mono text-[9px] uppercase tracking-wider text-mist-600">{c.kind === 'unit' ? divById(c.unitId ?? '')?.code ?? 'unit' : c.kind}</span>
                      </span>
                      {u > 0 && <span className="rounded-full bg-flare-500 px-2 py-0.5 font-mono text-[10px] font-bold ink-flare tabular">{u}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  /* conversation */
  const attachResults = visiblePapers.filter((p) => !attachQ.trim() || `${p.ref} ${p.title}`.toLowerCase().includes(attachQ.trim().toLowerCase())).slice(0, 30);
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="flex items-center gap-2 border-b border-ink-700/70 bg-ink-950/70 px-3 py-2.5">
        <button onClick={() => setSel(null)} className="rounded-md border border-ink-600 p-2 text-mist-300 active:scale-95" title="Back"><I n="history" className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-bold uppercase tracking-wide text-mist-50">{channel.name}</p>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-mist-600">{filtered.length} message{filtered.length === 1 ? '' : 's'}</p>
        </div>
        <div className="relative">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="field w-28 py-1.5 pl-7 font-mono text-[10.5px]" />
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-mist-500"><I n="search" className="h-3 w-3" /></span>
        </div>
      </div>

      <div className="scroll-slim flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {filtered.map((m) => {
          const mine = m.authorId === me?.id;
          const canEditMsg = mine && !m.system && Date.now() - m.at <= MSG_EDIT_WINDOW;
          const canDel = !m.system && (mine || me?.role === 'admin' || me?.role === 'supervisor' || me?.role === 'moderator' || me?.role === 'operator');
          const pending = msgDeletes.some((r) => r.messageId === m.id);
          const docs = m.docs ?? (m.docId && m.docRef ? [{ id: m.docId, ref: m.docRef }] : []);
          if (m.system) {
            return <p key={m.id} className="text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-mist-600">{m.text}</p>;
          }
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <Avatar name={m.authorName || 'Officer'} size="sm" />
              <div className={`max-w-[78%] rounded-xl border px-3 py-2 ${mine ? 'border-flare-500/40 bg-flare-500/[0.08]' : 'border-ink-700 bg-ink-850'}`}>
                <p className="flex items-baseline gap-2">
                  <span className={`text-[11px] font-bold ${mine ? 'text-flare-400' : 'text-cyanx-400'}`}>{mine ? 'You' : m.authorName}</span>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-mist-600">{fmtDT(m.at)}</span>
                  {m.editedAt && <span className="font-mono text-[8px] italic text-mist-500">· edited</span>}
                </p>
                {editId === m.id ? (
                  <div className="mt-1.5">
                    <textarea autoFocus rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} className="field resize-y font-mono text-[11.5px]" />
                    <div className="mt-1.5 flex gap-2">
                      <button onClick={() => { if (editText.trim()) updateMessage(m.id, editText); setEditId(null); }} className="btn btn-primary flex-1 justify-center py-1.5 text-[10.5px]">Save</button>
                      <button onClick={() => setEditId(null)} className="btn btn-ghost py-1.5 text-[10.5px]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-mist-100">{m.text}</p>
                )}
                {docs.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {docs.map((d) => (
                      <span key={d.id} className="inline-flex items-center gap-1 rounded-md border border-cyanx-500/40 bg-cyanx-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-cyanx-400">
                        <I n="file" className="h-2.5 w-2.5" sw={2.4} /> {d.ref}
                      </span>
                    ))}
                  </div>
                )}
                {pending && <p className="mt-1.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-amberx-400">Deletion pending admin verification</p>}
                {(canEditMsg || canDel) && editId !== m.id && (
                  <div className="mt-1.5 flex gap-2">
                    {canEditMsg && (
                      <button onClick={() => { setEditId(m.id); setEditText(m.text); }} className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-cyanx-400">Edit · {Math.max(0, Math.ceil((MSG_EDIT_WINDOW - (Date.now() - m.at)) / 60000))}m</button>
                    )}
                    {canDel && (
                      <button onClick={() => requestDeleteMessage(m.id)} disabled={pending} className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-redx-400 disabled:opacity-40">Delete</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* attach picker */}
      {attachOpen && (
        <div className="border-t border-ink-700 bg-ink-900 px-3 py-2">
          <div className="relative">
            <input autoFocus value={attachQ} onChange={(e) => setAttachQ(e.target.value)} placeholder="Search papers to attach…" className="field w-full py-1.5 pl-8 font-mono text-[11px]" />
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mist-500"><I n="search" className="h-3.5 w-3.5" /></span>
          </div>
          <div className="scroll-slim mt-2 max-h-36 space-y-1 overflow-y-auto">
            {attachResults.map((p) => {
              const on = attachIds.includes(p.id);
              return (
                <button key={p.id} onClick={() => setAttachIds((a) => (on ? a.filter((x) => x !== p.id) : [...a, p.id]))}
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left ${on ? 'border-cyanx-500/60 bg-cyanx-500/10' : 'border-ink-700 bg-ink-850'}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-sm border ${on ? 'border-cyanx-500 bg-cyanx-500 ink-cyanx' : 'border-ink-600'}`}>{on && <I n="check" className="h-2.5 w-2.5" sw={3} />}</span>
                  <span className="font-mono text-[9.5px] font-bold text-cyanx-400">{p.ref}</span>
                  <span className="truncate text-[11.5px] text-mist-200">{p.title}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => { setAttachOpen(false); setAttachQ(''); }} className="mt-2 w-full rounded-md border border-ink-600 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-400">Done · {attachIds.length} attached</button>
        </div>
      )}

      {/* composer */}
      {canPostChannel(channel) && (
        <div className="border-t border-ink-700 bg-ink-950/80 px-3 py-2.5" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
          {attachIds.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {attachIds.map((id) => {
                const p = db.papers.find((x) => x.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-md border border-cyanx-500/40 bg-cyanx-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase text-cyanx-400">
                    {p?.ref ?? id}
                    <button onClick={() => setAttachIds((a) => a.filter((x) => x !== id))}><I n="x" className="h-2.5 w-2.5" sw={2.6} /></button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => setAttachOpen((o) => !o)} className={`rounded-lg border p-2.5 ${attachOpen || attachIds.length ? 'border-cyanx-500/60 bg-cyanx-500/10 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-400'}`} title="Attach papers">
              <I n="clip" className="h-4 w-4" sw={2} />
            </button>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} placeholder={`Message ${channel.name}…`} className="field max-h-24 flex-1 resize-none py-2.5 font-mono text-[12px]" />
            <button onClick={submit} disabled={!draft.trim()} className="btn btn-primary shrink-0 px-4 py-2.5"><I n="send" className="h-4 w-4" sw={2.2} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------ alerts */
function MobileAlerts() {
  const { visibleNotifs, unread, markAllRead, markRead, openDrawer, me } = useStore();
  const KIND_ICON: Record<string, IconName> = { new: 'plus', route: 'route', move: 'send', complete: 'checkc', account: 'user' };
  return (
    <div className="px-3 pt-3">
      <div className="flex items-center gap-2">
        <div>
          <p className="font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Alerts</p>
          <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">{unread} unread · {visibleNotifs.length} total</p>
        </div>
        <button onClick={markAllRead} className="ml-auto rounded-md border border-ink-600 bg-ink-850 px-3 py-2 font-mono text-[9.5px] font-bold uppercase tracking-wider text-cyanx-400 active:scale-95">Mark all read</button>
      </div>
      <div className="mt-3 space-y-2 pb-4">
        {visibleNotifs.map((n) => {
          const isUnread = me ? !n.readBy.includes(me.id) : false;
          return (
            <button key={n.id} onClick={() => { markRead(n.id); if (n.docId) openDrawer(n.docId); }} className={`block w-full rounded-xl border p-3 text-left transition active:scale-[0.985] ${isUnread ? 'border-flare-500/40 bg-flare-500/[0.06]' : 'border-ink-700 bg-ink-900/80'}`}>
              <div className="flex items-center gap-2">
                <span className={isUnread ? 'text-flare-400' : 'text-mist-500'}><I n={KIND_ICON[n.kind] ?? 'bell'} className="h-4 w-4" sw={2} /></span>
                {n.ref && <span className="font-mono text-[10px] font-bold text-cyanx-400">{n.ref}</span>}
                {isUnread && <span className="ml-auto h-2 w-2 rounded-full bg-flare-500" />}
                <span className={`${n.ref ? '' : 'ml-auto '}font-mono text-[9px] uppercase tracking-wider text-mist-600`}>{timeAgo(n.at)}</span>
              </div>
              <p className={`mt-1 text-[13px] leading-snug ${isUnread ? 'font-semibold text-mist-100' : 'text-mist-300'}`}>{n.text}</p>
            </button>
          );
        })}
        {visibleNotifs.length === 0 && <p className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist-600">All clear — no alerts</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------ me (profile + settings) */
function MobileMe() {
  const store = useStore();
  const { me, db, theme, themeDraft, themeDirty, previewTheme, clearThemePreview, saveTheme, updateProfile, changePassword, requestPasswordReset, resetDemo, logout, custom, updateCustom, officeDraft, officeDirty, previewOfficeTheme, saveOfficeTheme, clearOfficeDraft, pushToast } = store;
  const [pName, setPName] = useState(me?.name ?? '');
  const [pTitle, setPTitle] = useState(me?.title ?? '');
  const [pPhone, setPPhone] = useState(me?.phone ?? '');
  const [pEmail, setPEmail] = useState(me?.email ?? '');
  const [pAddress, setPAddress] = useState(me?.address ?? '');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  /* program-admin customization */
  const [cOrg, setCOrg] = useState(custom.orgName ?? '');
  const [cTag, setCTag] = useState(custom.tagline ?? '');
  const [cDesc, setCDesc] = useState(custom.description ?? '');
  const [newBrgy, setNewBrgy] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const meUser = me ? db.users.find((u) => u.id === me.id) : null;
  if (!me) return null;

  const ACCENTS = ['#ff6b1c', '#56c8f0', '#2dd4bf', '#f5b924', '#45d483', '#f4645c', '#a78bfa'];
  const ACCENTS2 = ['#56c8f0', '#ff6b1c', '#45e0cd', '#fbc94a', '#8adcf8', '#f8837c', '#6cd1f4'];

  const readAsUrl = (f: File) => new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(f);
  });

  const pickLogo = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) { pushToast('warn', 'Logo too large — keep it under 1.5 MB.'); return; }
    updateCustom({ logoKind: 'custom', logoUrl: await readAsUrl(f) });
    if (logoRef.current) logoRef.current.value = '';
  };

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { pushToast('warn', 'Photo too large — keep it under 2 MB.'); return; }
    updateCustom({ loginImage: await readAsUrl(f) });
    if (photoRef.current) photoRef.current.value = '';
  };

  const brgyList = custom.barangays ?? [];
  const addBrgy = () => {
    const v = newBrgy.trim();
    if (!v) return;
    if (brgyList.some((b) => b.toLowerCase() === v.toLowerCase())) { pushToast('warn', 'That barangay is already on the list.'); return; }
    updateCustom({ barangays: [...brgyList, v] });
    setNewBrgy('');
  };

  const effTone = (officeDraft && 'bgTone' in officeDraft ? officeDraft.bgTone : custom.bgTone) ?? 'blueprint';

  return (
    <div className="space-y-4 px-3 pb-4 pt-3">
      {/* identity card */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900/85 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={me.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">{me.name}</p>
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-500">@{me.username} · {me.role}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {me.divisionId && divById(me.divisionId) && <DivChip div={divById(me.divisionId)!} />}
          {(me.teamIds ?? []).map((t) => divById(t) && <DivChip key={t} div={divById(t)!} />)}
        </div>
      </div>

      {/* profile */}
      <section className="rounded-2xl border border-ink-700 bg-ink-900/85 p-4">
        <p className="mb-2.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cyanx-400">Profile details</p>
        <div className="space-y-2.5">
          <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Full name" className="field" />
          <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Position / designation" className="field" />
          <input value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="Phone number" className="field font-mono text-[12px]" />
          <input value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="Email address" className="field font-mono text-[12px]" />
          <input value={pAddress} onChange={(e) => setPAddress(e.target.value)} placeholder="Home address" className="field" />
          <button
            onClick={() => {
              updateProfile({ name: pName, title: pTitle, phone: pPhone, email: pEmail, address: pAddress });
              if (themeDirty) saveTheme();
            }}
            className="btn btn-primary w-full justify-center"
          >
            <I n="check" className="h-4 w-4" sw={2.2} /> Save profile{themeDirty ? ' & theme' : ''}
          </button>
        </div>
      </section>

      {/* password */}
      <section className="rounded-2xl border border-ink-700 bg-ink-900/85 p-4">
        <p className="mb-2.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-flare-400">Password</p>
        <div className="space-y-2.5">
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Current password" className="field font-mono text-[12px]" />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" className="field font-mono text-[12px]" />
          <button disabled={!cur || !next} onClick={() => { const r = changePassword(cur, next); if (!r) { setCur(''); setNext(''); } }} className="btn btn-ghost w-full justify-center">Update password</button>
          <button onClick={requestPasswordReset} disabled={!!meUser?.passwordResetAt} className="btn btn-ghost w-full justify-center">
            <I n="refresh" className="h-3.5 w-3.5" sw={2.2} /> {meUser?.passwordResetAt ? 'Reset request pending' : 'Request admin reset (OCE@2026)'}
          </button>
        </div>
      </section>

      {/* theme — tap to preview live, saved only on Save (nothing logged until you save) */}
      <section className={`rounded-2xl border bg-ink-900/85 p-4 transition-colors ${themeDirty ? 'border-amberx-500/50' : 'border-ink-700'}`}>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-tealx-400">My theme</p>
          {themeDirty && (
            <span className="anim-pop rounded-sm border border-amberx-500/50 bg-amberx-500/12 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-amberx-400">
              previewing — not saved
            </span>
          )}
          {!themeDirty && theme.isPersonal && (
            <span className="rounded-sm bg-tealx-500/12 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-tealx-400">personal</span>
          )}
        </div>
        <p className="mb-1.5 font-mono text-[8.5px] uppercase tracking-[0.16em] text-mist-600">Primary accent</p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((c) => (
            <button key={c} onClick={() => previewTheme({ themeAccent: c })} className={`h-8 w-8 rounded-full border-2 transition active:scale-90 ${themeDraft.themeAccent === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ background: c }} />
          ))}
        </div>
        <p className="mb-1.5 mt-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-mist-600">Secondary accent</p>
        <div className="flex flex-wrap gap-2">
          {ACCENTS2.map((c) => (
            <button key={c} onClick={() => previewTheme({ themeAccent2: c })} className={`h-8 w-8 rounded-full border-2 transition active:scale-90 ${themeDraft.themeAccent2 === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ background: c }} />
          ))}
        </div>
        <p className="mb-1.5 mt-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-mist-600">Background mood</p>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(MOODS).map(([k, m]) => (
            <button key={k} onClick={() => previewTheme({ themeTone: k })} className={`rounded-lg border p-2 text-left transition active:scale-95 ${themeDraft.themeTone === k ? 'border-tealx-500/70 bg-tealx-500/10' : 'border-ink-600 bg-ink-850'}`}>
              <span className="block h-6 rounded" style={{ background: `linear-gradient(135deg, ${m.tones[0]}, ${m.tones[4] ?? m.tones[2]})` }} />
              <span className="mt-1 block truncate font-mono text-[8.5px] font-bold uppercase tracking-wider text-mist-300">{m.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => previewTheme({ autoSeason: !themeDraft.autoSeason })} className={`btn flex-1 justify-center py-2 text-[10.5px] ${themeDraft.autoSeason ? 'btn-primary' : 'btn-ghost'}`}>
            <I n="refresh" className="h-3.5 w-3.5" sw={2.2} /> Auto seasonal {themeDraft.autoSeason ? 'on' : 'off'}
          </button>
          <button onClick={() => previewTheme({ themeTone: undefined, themeAccent: undefined, themeAccent2: undefined })} className="btn btn-ghost flex-1 justify-center py-2 text-[10.5px]">Office default</button>
        </div>

        {themeDirty && (
          <div className="anim-pop mt-3 flex gap-2">
            <button onClick={saveTheme} className="btn btn-primary flex-1 justify-center py-2 text-[10.5px]">
              <I n="check" className="h-3.5 w-3.5" sw={2.4} /> Save theme
            </button>
            <button onClick={clearThemePreview} className="btn btn-ghost flex-1 justify-center py-2 text-[10.5px]">
              <I n="x" className="h-3.5 w-3.5" sw={2.4} /> Revert
            </button>
          </div>
        )}
        <p className="mt-2 font-mono text-[7.5px] uppercase leading-relaxed tracking-[0.12em] text-mist-600">
          Tap to preview the whole app instantly — press <span className="text-tealx-400">Save theme</span> (or Save profile) to keep it. Nothing is registered until you save.
        </p>
      </section>

      {/* program-admin customization */}
      {me.role === 'admin' && (
        <section className="rounded-2xl border border-ink-700 bg-ink-900/85 p-4">
          <p className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-flare-400">Customize the office</p>
          <p className="mb-3 text-[10.5px] leading-snug text-mist-500">Identity, logo, the office-wide default theme and the barangay list.</p>

          {/* identity */}
          <p className="mb-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Identity</p>
          <div className="space-y-2">
            <input value={cOrg} onChange={(e) => setCOrg(e.target.value)} placeholder="Organization name" className="field" />
            <input value={cTag} onChange={(e) => setCTag(e.target.value)} placeholder="Tagline" className="field" />
            <textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} rows={2} placeholder="Description / welcome text" className="field resize-y" />
            <button onClick={() => updateCustom({ orgName: cOrg.trim() || undefined, tagline: cTag.trim() || undefined, description: cDesc.trim() || undefined })}
              className="btn btn-ghost w-full justify-center py-2 text-[11px]">
              <I n="check" className="h-3.5 w-3.5" sw={2.2} /> Save identity
            </button>
          </div>

          {/* logo */}
          <p className="mb-1.5 mt-4 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Company logo</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {([['seal', 'Seal'], ['gear', 'Gear'], ['bridge', 'Bridge']] as const).map(([k, label]) => (
              <button key={k} onClick={() => updateCustom({ logoKind: k, logoUrl: undefined })}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider transition active:scale-95 ${
                  (custom.logoKind ?? 'seal') === k && custom.logoKind !== 'custom' ? 'border-flare-500/70 bg-flare-500/12 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400'
                }`}>
                {label}
              </button>
            ))}
            <button onClick={() => logoRef.current?.click()}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider transition active:scale-95 ${
                custom.logoKind === 'custom' && custom.logoUrl ? 'border-flare-500/70 bg-flare-500/12 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400'
              }`}>
              <I n="cam" className="h-3 w-3" sw={2.2} /> Upload
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />
            {custom.logoKind === 'custom' && custom.logoUrl && (
              <button onClick={() => updateCustom({ logoKind: 'seal', logoUrl: undefined })} className="btn btn-ghost px-2 py-1.5 text-[9.5px]">Remove</button>
            )}
          </div>

          {/* sign-in photo */}
          <p className="mb-1.5 mt-4 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Sign-in page photo</p>
          <div className="flex items-center gap-2.5">
            {custom.loginImage ? (
              <img src={custom.loginImage} alt="login" className="h-14 w-20 rounded-md border border-ink-600 object-cover" />
            ) : (
              <div className="flex h-14 w-20 items-center justify-center rounded-md border border-dashed border-ink-600 text-mist-600"><I n="cam" className="h-4 w-4" sw={1.6} /></div>
            )}
            <button onClick={() => photoRef.current?.click()} className="btn btn-ghost flex-1 justify-center py-2 text-[10.5px]">
              <I n="cam" className="h-3.5 w-3.5" sw={2} /> Choose photo
            </button>
            {custom.loginImage && (
              <button onClick={() => updateCustom({ loginImage: undefined })} className="btn btn-ghost px-2.5 py-2 text-[10.5px] hover:border-redx-500/60 hover:text-redx-400">
                <I n="x" className="h-3.5 w-3.5" sw={2.2} />
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          </div>

          {/* office-wide default theme — preview, then save */}
          <p className="mb-1.5 mt-4 flex items-center gap-2 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">
            Office default theme
            {officeDirty && (
              <span className="anim-pop inline-flex items-center gap-1 rounded-sm border border-amberx-500/50 bg-amberx-500/12 px-1.5 py-px font-mono text-[7.5px] font-bold uppercase tracking-wider text-amberx-400">
                <span className="h-1 w-1 animate-pulse rounded-full bg-amberx-400" /> preview
              </span>
            )}
          </p>
          <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.12em] text-mist-600">Tap to preview office-wide · save to apply</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((c) => (
              <button key={c} onClick={() => previewOfficeTheme({ accent: c })}
                className={`h-8 w-8 rounded-full border-2 transition active:scale-90 ${(officeDraft?.accent ?? custom.accent) === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }} title={`Primary accent ${c}`} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACCENTS2.map((c) => (
              <button key={c} onClick={() => previewOfficeTheme({ accent2: c })}
                className={`h-8 w-8 rounded-full border-2 transition active:scale-90 ${(officeDraft?.accent2 ?? custom.accent2) === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }} title={`Secondary accent ${c}`} />
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {Object.entries(MOODS).map(([k, m]) => (
              <button key={k} onClick={() => previewOfficeTheme({ bgTone: k })}
                className={`rounded-lg border p-2 text-left transition active:scale-95 ${effTone === k ? 'border-cyanx-500/70 bg-cyanx-500/10' : 'border-ink-600 bg-ink-850'}`}>
                <span className="block h-6 rounded" style={{ background: `linear-gradient(135deg, ${m.tones[0]}, ${m.tones[4] ?? m.tones[2]})` }} />
                <span className={`mt-1 block truncate font-mono text-[8px] font-bold uppercase tracking-wider ${effTone === k ? 'text-cyanx-400' : 'text-mist-400'}`}>{m.label}</span>
              </button>
            ))}
          </div>
          {officeDirty ? (
            <div className="anim-pop mt-2.5 rounded-lg border border-amberx-500/45 bg-amberx-500/10 p-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-amberx-400">Office theme preview — not saved</p>
              <div className="mt-2 flex gap-2">
                <button onClick={saveOfficeTheme} className="btn btn-primary flex-1 justify-center py-2 text-[10.5px]">
                  <I n="check" className="h-3.5 w-3.5" sw={2.4} /> Save office theme
                </button>
                <button onClick={clearOfficeDraft} className="btn btn-ghost flex-1 justify-center py-2 text-[10.5px]">Revert</button>
              </div>
            </div>
          ) : (
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-mist-600">Officers without a personal theme follow this default.</p>
          )}

          {/* barangay list */}
          <p className="mb-1.5 mt-4 font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Barangay list · {brgyList.length} custom</p>
          <div className="flex gap-1.5">
            <input value={newBrgy} onChange={(e) => setNewBrgy(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBrgy()}
              placeholder="e.g. San Jose" className="field flex-1 font-mono text-[11px]" />
            <button onClick={addBrgy} className="btn btn-ghost shrink-0 px-3 py-2 text-[10.5px]"><I n="plus" className="h-3.5 w-3.5" sw={2.4} /></button>
          </div>
          {brgyList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brgyList.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 rounded-md border border-tealx-500/40 bg-tealx-500/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-tealx-400">
                  {b}
                  <button onClick={() => updateCustom({ barangays: brgyList.filter((x) => x !== b) })} className="text-tealx-400/70 transition hover:text-redx-400" title="Remove">
                    <I n="x" className="h-2.5 w-2.5" sw={2.6} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* actions */}
      <section className="space-y-2">
        {me.role === 'admin' && <button onClick={resetDemo} className="btn btn-ghost w-full justify-center"><I n="refresh" className="h-4 w-4" sw={2} /> Reset demo data</button>}
        <button onClick={logout} className="btn w-full justify-center border border-redx-500/50 bg-redx-500/10 text-redx-400"><I n="out" className="h-4 w-4" sw={2} /> Sign out</button>
      </section>
    </div>
  );
}
