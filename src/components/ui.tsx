import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Division, Kind, Priority, Stage } from '../lib/core';
import { KINDS, PRIORITIES, initials, stageMeta } from '../lib/core';
import { useStore } from '../lib/store';

export type IconName =
  | 'grid' | 'board' | 'file' | 'sitemap' | 'pulse' | 'users' | 'history' | 'wrench' | 'bell'
  | 'x' | 'check' | 'checkc' | 'plus' | 'search' | 'alert' | 'send' | 'route' | 'cam' | 'pin'
  | 'clip' | 'dl' | 'out' | 'user' | 'lock' | 'refresh' | 'trash' | 'printer' | 'chevL' | 'chevR'
  | 'note' | 'inbox' | 'stamp' | 'shield' | 'clock';

const ICONS: Record<IconName, React.ReactNode> = {
  grid: (<><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.2" /></>),
  board: (<><rect x="3.5" y="4" width="4.6" height="16" rx="1" /><rect x="9.7" y="4" width="4.6" height="11" rx="1" /><rect x="15.9" y="4" width="4.6" height="7" rx="1" /></>),
  file: (<><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4" /><path d="M9 12h6M9 15.5h6" /></>),
  sitemap: (<><rect x="9" y="3.5" width="6" height="5" rx="1" /><rect x="3" y="15.5" width="6" height="5" rx="1" /><rect x="15" y="15.5" width="6" height="5" rx="1" /><path d="M12 8.5v3.5M6 15.5v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" /></>),
  pulse: (<path d="M3 12h4l2.5-6.5L14 18l2.5-6H21" />),
  users: (<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M15.5 14.6a4.6 4.6 0 0 1 5 4.4" /></>),
  history: (<><path d="M4 5v4h4" /><path d="M4.6 9A8 8 0 1 1 4 12" /><path d="M12 8v4.2l2.8 1.8" /></>),
  wrench: (<path d="M14.5 6.5a4 4 0 0 0-5.2 5.2L4 17a2 2 0 1 0 3 3l5.3-5.3a4 4 0 0 0 5.2-5.2l-2.6 2.6-2.5-.9-.9-2.5z" />),
  bell: (<><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z" /><path d="M10 19a2.2 2.2 0 0 0 4 0" /></>),
  x: (<path d="M6 6l12 12M18 6L6 18" />),
  check: (<path d="M4.5 12.5l5 5L19.5 7" />),
  checkc: (<><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.5 2.5 4.8-5.3" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  search: (<><circle cx="10.5" cy="10.5" r="6" /><path d="M15.2 15.2 20 20" /></>),
  alert: (<><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 16.8v.2" /></>),
  send: (<><path d="M20.5 3.5 10 14" /><path d="M20.5 3.5 14 20.5l-4-6.5-7-2.5z" /></>),
  route: (<><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8 17h6a4 4 0 0 0 0-8H9" /></>),
  cam: (<><rect x="3.5" y="7" width="17" height="12.5" rx="2" /><path d="M8.5 7 10 4.5h4L15.5 7" /><circle cx="12" cy="13" r="3.4" /></>),
  pin: (<><path d="M12 21s-6.5-5.4-6.5-10.3a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.3" /></>),
  clip: (<path d="M8 12.5 15 5.4a3.5 3.5 0 0 1 5 5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l7.8-7.8" />),
  dl: (<><path d="M12 4v11M7.5 11 12 15.5 16.5 11" /><path d="M5 19.5h14" /></>),
  out: (<><path d="M14 5H6.5v14H14" /><path d="M10.5 12H21M17 8l4 4-4 4" /></>),
  user: (<><circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /></>),
  lock: (<><rect x="5.5" y="10.5" width="13" height="9.5" rx="1.6" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>),
  refresh: (<><path d="M20 5v5h-5" /><path d="M4 19v-5h5" /><path d="M19.5 10a8 8 0 0 0-14-3.5M4.5 14a8 8 0 0 0 14 3.5" /></>),
  trash: (<><path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /><path d="M6.5 6.5 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12.5" /><path d="M10 10.5v6M14 10.5v6" /></>),
  printer: (<><path d="M7 8V3.5h10V8" /><rect x="3.5" y="8" width="17" height="8.5" rx="1.4" /><path d="M7 13.5h10V21H7z" /><path d="M17.4 10.8h.1" /></>),
  chevL: (<path d="M14.5 6 9 12l5.5 6" />),
  chevR: (<path d="M9.5 6 15 12l-5.5 6" />),
  note: (<><path d="M4.5 4.5h15v11l-4 4h-11z" /><path d="M15.5 19.5v-4h4" /></>),
  inbox: (<><path d="M4 13.5 6.5 5h11L20 13.5V19H4z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></>),
  stamp: (<><path d="M9 4h6l-1.5 6H15a3 3 0 0 1 3 3v1H6v-1a3 3 0 0 1 3-3h1.5z" /><path d="M5 18.5h14v2H5z" /></>),
  shield: (<path d="M12 3.5 5 6v6c0 4.5 3 7.6 7 8.5 4-.9 7-4 7-8.5V6z" />),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.4 2" /></>),
};

export function I({ n, className = 'w-4 h-4', sw = 1.8 }: { n: IconName; className?: string; sw?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[n]}
    </svg>
  );
}

export function Seal({ className = 'w-10 h-10' }: { className?: string }) {
  const { custom } = useStore();
  const kind = custom.logoKind ?? 'seal';
  if (kind === 'custom' && custom.logoUrl) {
    return <img src={custom.logoUrl} alt="Logo" className={`${className} rounded-full object-cover`} />;
  }
  const ring = 'var(--color-flare-500)';
  const inner = 'var(--color-cyanx-500)';
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="21" fill="none" stroke={ring} strokeWidth="2.2" />
      <circle cx="24" cy="24" r="16.5" fill="none" stroke={inner} strokeWidth="1.1" opacity="0.8" />
      {kind === 'seal' && (
        <>
          <path d="M14 30.5 24 13l10 17.5" fill="none" stroke={ring} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.5 30.5h13" stroke={inner} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {kind === 'gear' && (
        <>
          <circle cx="24" cy="24" r="7" fill="none" stroke={ring} strokeWidth="2.4" />
          <circle cx="24" cy="24" r="2.4" fill={inner} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line key={i} x1={24 + Math.cos(a) * 8.5} y1={24 + Math.sin(a) * 8.5}
                x2={24 + Math.cos(a) * 12.5} y2={24 + Math.sin(a) * 12.5}
                stroke={ring} strokeWidth="2.4" strokeLinecap="round" />
            );
          })}
        </>
      )}
      {kind === 'bridge' && (
        <>
          <path d="M12 31c3.5-9 20.5-9 24 0" fill="none" stroke={ring} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M17.5 31h13" stroke={inner} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      <circle cx="24" cy="34.5" r="1.6" fill="var(--color-amberx-400)" />
    </svg>
  );
}

const AV_COLORS = ['#2fa9d6', '#e85a10', '#2dd4bf', '#f5b924', '#8b5cf6', '#45d483', '#f4645c'];
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const idx = name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length;
  const cls = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs';
  return (
    <span className={`${cls} inline-flex shrink-0 items-center justify-center rounded-md font-display font-bold tracking-wide`}
      style={{ background: `${AV_COLORS[idx]}22`, color: AV_COLORS[idx], border: `1px solid ${AV_COLORS[idx]}55` }}>
      {initials(name)}
    </span>
  );
}

export function StageChip({ stage }: { stage: Stage }) {
  const m = stageMeta(stage);
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide"
      style={{ background: `${m.color}1f`, color: m.color, border: `1px solid ${m.color}55` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />{m.label}
    </span>
  );
}

export function PriorityTag({ p }: { p: Priority }) {
  const m = PRIORITIES[p];
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ color: m.color }}>
      <I n="alert" className="w-3 h-3" sw={2.2} />{m.label}
    </span>
  );
}

export function KindTag({ kind }: { kind: Kind }) {
  return <span className="inline-flex items-center rounded-sm bg-ink-700/70 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-mist-200">{KINDS[kind].short}</span>;
}

export function DivChip({ div, tone = 'dark' }: { div: Division; tone?: 'dark' | 'paper' }) {
  const color = div.id.startsWith('desk-') ? '#fbc94a' : div.id === 'insp-team' ? '#2dd4bf' : div.cluster === 'ops' ? '#ff8a4c' : '#56c8f0';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${tone === 'paper' ? 'bg-[#16283c0f]' : 'bg-ink-800'}`}
      style={{ color, border: `1px solid ${color}66` }} title={div.name}>
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />{div.code}
    </span>
  );
}

export function ProgressBar({ value, w = 'w-full' }: { value: number; w?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const color = pct >= 100 ? '#45d483' : pct >= 50 ? '#2dd4bf' : pct >= 25 ? '#f5b924' : '#ff8a4c';
  return (
    <div className={`${w} h-[7px] overflow-hidden rounded-full bg-[#16283c1c]`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  const meta = { ok: { color: '#45d483', icon: 'checkc' as IconName }, warn: { color: '#f5b924', icon: 'alert' as IconName }, err: { color: '#f4645c', icon: 'alert' as IconName } };
  return (
    <div className="fixed bottom-5 right-5 z-[80] flex w-[min(360px,90vw)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="anim-toast flex items-start gap-2.5 rounded-md border border-ink-600 bg-ink-850/95 px-3.5 py-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
          style={{ borderLeft: `3px solid ${meta[t.kind].color}` }}>
          <span style={{ color: meta[t.kind].color }} className="mt-0.5"><I n={meta[t.kind].icon} className="w-4 h-4" sw={2} /></span>
          <p className="text-[13px] leading-snug text-mist-100">{t.text}</p>
        </div>
      ))}
    </div>
  );
}

export function PageHead({ kicker, title, sub, right }: { kicker: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-flare-400">{kicker}</p>
        <h1 className="font-display text-[34px] font-bold uppercase leading-none tracking-wide text-mist-50 sm:text-[40px]">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-mist-400">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Section({ title, icon, right, children }: { title: string; icon?: IconName; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="anim-fade-up">
      <div className="mb-2.5 flex items-center gap-2">
        {icon && <I n={icon} className="h-3.5 w-3.5 text-flare-400" sw={2} />}
        <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">{title}</h3>
        <span className="h-px flex-1 bg-ink-700" />
        {right}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon = 'inbox', title, sub }: { icon?: IconName; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 py-14 text-center">
      <span className="mb-3 text-mist-500"><I n={icon} className="w-8 h-8" sw={1.4} /></span>
      <p className="font-display text-lg font-semibold uppercase tracking-wide text-mist-300">{title}</p>
      {sub && <p className="mt-1 max-w-xs text-[12.5px] text-mist-500">{sub}</p>}
    </div>
  );
}

/* ---------------- searchable dropdown ---------------- */

export interface SearchOption {
  value: string;
  label: string;
  sub?: string;
  hint?: string;
  group?: string;
}

export function SearchSelect({
  value, onChange, options, placeholder = 'Select…', disabled, width = 'w-56', emptyLabel = 'No matches', searchableThreshold = 10, allowClear,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SearchOption[];
  placeholder?: string;
  disabled?: boolean;
  width?: string;
  emptyLabel?: string;
  searchableThreshold?: number;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; w: number; up: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const searchable = options.length > searchableThreshold;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => `${o.label} ${o.sub ?? ''} ${o.group ?? ''} ${o.hint ?? ''}`.toLowerCase().includes(t));
  }, [options, q]);

  const groups = useMemo(() => {
    const m = new Map<string, SearchOption[]>();
    for (const o of filtered) {
      const g = o.group ?? '';
      m.set(g, [...(m.get(g) ?? []), o]);
    }
    return [...m.entries()];
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      // The layout is magnified via CSS `zoom` on the root element; getBoundingClientRect
      // reports visual px while the portaled panel's own px are pre-zoom — divide by the factor.
      const zf =
        parseFloat(getComputedStyle(document.documentElement).zoom) ||
        parseFloat(getComputedStyle(document.body).zoom) ||
        1;
      const panelH = 300;
      const up = r.bottom + panelH + 16 > window.innerHeight && r.top > panelH;
      const w = Math.min(Math.max(r.width, 340), Math.min(480, window.innerWidth - 24));
      const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
      setPos({ top: (up ? r.top - 8 : r.bottom + 8) / zf, left: left / zf, w: w / zf, up });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => { if (open) { setQ(''); setActive(0); window.setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  const onKey = (e: React.KeyboardEvent) => {
    const flat = groups.flatMap(([, os]) => os);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = flat[active]; if (o) pick(o.value); }
    else if (e.key === 'Escape') setOpen(false);
  };

  // Native select for short lists.
  if (!searchable) {
    return (
      <select className={`field ${width}`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    );
  }

  let idx = -1;
  return (
    <div ref={rootRef} className={`relative inline-block ${width}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="field flex w-full cursor-pointer items-center gap-2 text-left"
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-mist-100' : 'text-mist-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && selected.sub && (
          <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-wider text-mist-500 sm:inline">{selected.sub}</span>
        )}
        {allowClear && selected && !disabled && (
          <span
            role="button" tabIndex={0} title="Clear selection"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="shrink-0 rounded p-0.5 text-mist-500 transition hover:bg-redx-500/15 hover:text-redx-400"
          >
            <I n="x" className="h-3 w-3" sw={2.6} />
          </span>
        )}
        <I n="chevR" className={`h-3.5 w-3.5 shrink-0 text-mist-400 transition-transform duration-200 ${open ? 'rotate-90 text-cyanx-400' : ''}`} sw={2.4} />
      </button>

      {open && pos && createPortal(
        <div ref={panelRef} className="anim-pop fixed z-[95] overflow-hidden rounded-lg border border-ink-600 bg-ink-850 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]"
          style={{ left: pos.left, width: pos.w, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}>
          <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2">
            <I n="search" className="h-3.5 w-3.5 shrink-0 text-mist-500" />
            <input
              ref={inputRef} value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={onKey}
              placeholder="Type to filter…"
              className="w-full bg-transparent font-mono text-[11.5px] text-mist-100 outline-none placeholder:text-mist-600"
            />
            <span className="shrink-0 font-mono text-[9px] text-mist-600 tabular">{filtered.length}/{options.length}</span>
          </div>
          <div ref={listRef} className="scroll-slim max-h-[264px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist-600">{emptyLabel}</p>
            )}
            {groups.map(([g, os]) => (
              <div key={g || '__none'}>
                {g && <p className="px-3 pb-1 pt-2 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-mist-600">{g}</p>}
                {os.map((o) => {
                  idx += 1;
                  const isActive = idx === active;
                  const isSel = o.value === value;
                  return (
                    <button key={o.value} type="button" onClick={() => pick(o.value)}
                      onMouseEnter={() => setActive(idx)}
                      className={`flex w-full items-center gap-2.5 border-l-2 px-3 py-2 text-left transition ${isActive ? 'bg-ink-800' : ''} ${isSel ? 'border-cyanx-500' : 'border-transparent'}`}>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[12.5px] font-semibold ${isSel ? 'text-cyanx-400' : 'text-mist-100'}`}>{o.label}</span>
                        {(o.sub || o.hint) && <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-mist-500">{o.sub ?? o.hint}</span>}
                      </span>
                      {isSel && <I n="check" className="h-3.5 w-3.5 shrink-0 text-cyanx-400" sw={2.6} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
