import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Division, Kind, Priority, Stage } from '../lib/core';
import { KINDS, PRIORITIES, stageMeta } from '../lib/core';
import { useStore } from '../lib/store';
import { initials } from '../lib/core';

export type IconName =
  | 'plus' | 'search' | 'x' | 'check' | 'chevR' | 'chevL' | 'bell' | 'out' | 'refresh'
  | 'file' | 'pin' | 'route' | 'cam' | 'clock' | 'board' | 'grid' | 'pulse' | 'users'
  | 'note' | 'shield' | 'alert' | 'flag' | 'wrench' | 'ext' | 'arr' | 'dl' | 'lock'
  | 'inbox' | 'sitemap' | 'stamp' | 'checkc' | 'trash' | 'printer' | 'history' | 'send' | 'clip' | 'user';

const PATHS: Record<IconName, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m20.5 20.5-4.9-4.9" /></>),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  chevR: <path d="m9 5 7 7-7 7" />,
  chevL: <path d="m15 5-7 7 7 7" />,
  bell: (<><path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13.5 6 9.5Z" /><path d="M10 18.5a2.2 2.2 0 0 0 4 0" /></>),
  out: (<><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" /><path d="M15 8.5 18.5 12 15 15.5M18.5 12H9.5" /></>),
  refresh: (<><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 3v5h-5" /></>),
  file: (<><path d="M7 3.5h7l4 4V20a.9.9 0 0 1-.9.9H7A.9.9 0 0 1 6.1 20V4.4A.9.9 0 0 1 7 3.5Z" /><path d="M14 3.5V8h4.5M9 12h6M9 15.5h6" /></>),
  pin: (<><path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>),
  route: (<><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8 18h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8" opacity="0" /><path d="M8.2 18H14a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8" opacity="0" /><path d="M8 18h5.5a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7H16" /></>),
  cam: (<><rect x="3.5" y="7" width="17" height="12.5" rx="1.6" /><path d="m8.5 7 1.5-2.5h4L15.5 7" /><circle cx="12" cy="13" r="3.4" /></>),
  clock: (<><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>),
  board: (<><rect x="3.5" y="4" width="5" height="16" rx="1" /><rect x="9.8" y="4" width="5" height="10" rx="1" /><rect x="16" y="4" width="5" height="13" rx="1" /></>),
  grid: (<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>),
  pulse: <path d="M3 12h4l2.5-6.5L14 18l2.5-6H21" />,
  users: (<><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><circle cx="16.8" cy="9.5" r="2.4" /><path d="M14.8 20a5.5 5.5 0 0 1 5.7-4.6" /></>),
  note: (<><path d="M5 4.5h14V16l-4 4H5Z" /><path d="M15 20v-4h4M8.5 9.5h7M8.5 12.5h4" /></>),
  shield: (<><path d="M12 3.5 5 6v6c0 4.4 3 7.6 7 8.5 4-.9 7-4.1 7-8.5V6Z" /><path d="m9 11.5 2.2 2.2L15.5 9" /></>),
  alert: (<><path d="M12 4 2.8 19.5h18.4Z" /><path d="M12 10v4M12 16.8v.2" /></>),
  flag: <path d="M6 21V4.5M6 5c4-2.2 8 2 12 0v9c-4 2-8-2.2-12 0" />,
  wrench: (<><path d="M14.5 6.5a4 4 0 0 0-5.3 5.1L4 16.8a1.9 1.9 0 0 0 2.7 2.7l5.2-5.2a4 4 0 0 0 5.1-5.3L14 12l-2.5-2.5Z" /></>),
  ext: (<><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V6.5A1.5 1.5 0 0 1 5.5 5H10" /></>),
  arr: (<><path d="M4 12h15" /><path d="m14 6 6 6-6 6" /></>),
  dl: (<><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M4.5 20h15" /></>),
  lock: (<><rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>),
  inbox: (<><path d="M4 13.5 6.5 5h11L20 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></>),
  sitemap: (<><rect x="9.5" y="3.5" width="5" height="4.5" rx="0.8" /><rect x="3.5" y="16" width="5" height="4.5" rx="0.8" /><rect x="15.5" y="16" width="5" height="4.5" rx="0.8" /><path d="M12 8v4M6 16v-2.5h12V16M12 12v1.5" /></>),
  stamp: (<><path d="M10 10.5c1.2-1.3 1-3.6 1-5.5a2.5 2.5 0 0 1 5 0c0 1.9-.2 4.2 1 5.5" /><path d="M6 14h12a1 1 0 0 1 1 1v2H5v-2a1 1 0 0 1 1-1ZM4.5 20h15" /></>),
  checkc: (<><circle cx="12" cy="12" r="8.5" /><path d="m8 12.3 2.7 2.7L16.5 9" /></>),
  trash: (<><path d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /><path d="M6.5 6.5 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12.5" /><path d="M10 10.5v6M14 10.5v6" /></>),
  printer: (<><path d="M7 8V3.5h10V8" /><rect x="3.5" y="8" width="17" height="8.5" rx="1.4" /><path d="M7 13.5h10V21H7z" /><path d="M17.4 10.8h.1" /></>),
  history: (<><path d="M4 5v4h4" /><path d="M4.6 9A8 8 0 1 1 4 12" /><path d="M12 8v4.2l2.8 1.8" /></>),
  send: (<><path d="M20.5 3.5 10 14" /><path d="M20.5 3.5 14 20.5l-4-6.5-6.5-4Z" /></>),
  clip: (<><path d="m8.5 12 6-6a3 3 0 0 1 4.2 4.2l-7.8 7.8a5 5 0 0 1-7-7L11.5 3.4" /></>),
  user: (<><circle cx="12" cy="8" r="3.6" /><path d="M5 20.5a7 7 0 0 1 14 0" /></>),
};

export function I({ n, className = 'w-4 h-4', sw = 1.8 }: { n: IconName; className?: string; sw?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[n]}
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
  const dot = 'var(--color-amberx-400)';
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
              <line
                key={i}
                x1={24 + Math.cos(a) * 8.5}
                y1={24 + Math.sin(a) * 8.5}
                x2={24 + Math.cos(a) * 12.5}
                y2={24 + Math.sin(a) * 12.5}
                stroke={ring}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            );
          })}
        </>
      )}
      {kind === 'bridge' && (
        <>
          <path d="M12 31c3.5-9 20.5-9 24 0" fill="none" stroke={ring} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 31h24" stroke={inner} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 31v-4.2M21 31v-6.2M24 31v-6.8M27 31v-6.2M32 31v-4.2" stroke={inner} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      <circle cx="24" cy="34.5" r="1.6" fill={dot} />
    </svg>
  );
}

export function StageChip({ stage, size = 'sm' }: { stage: Stage; size?: 'sm' | 'md' }) {
  const m = stageMeta(stage);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-medium uppercase tracking-wide ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
      style={{ background: `${m.color}1f`, color: m.color, border: `1px solid ${m.color}55` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function PriorityTag({ p }: { p: Priority }) {
  const m = PRIORITIES[p];
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest" style={{ color: m.color }}>
      <I n="flag" className="w-3 h-3" sw={2.2} />
      {m.label}
    </span>
  );
}

export function KindTag({ kind }: { kind: Kind }) {
  return (
    <span className="inline-flex items-center rounded-sm bg-ink-700/70 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-mist-200">
      {KINDS[kind].short}
    </span>
  );
}

export function DivChip({ div, tone = 'dark' }: { div: Division; tone?: 'dark' | 'paper' }) {
  const isDesk = div.id.startsWith('desk-');
  const color = isDesk ? '#fbc94a' : div.cluster === 'ops' ? '#ff8a4c' : '#56c8f0';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${tone === 'paper' ? 'bg-[#16283c0f]' : 'bg-ink-800'}`}
      style={{ color, border: `1px solid ${color}66` }}
      title={div.name}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />
      {div.code}
    </span>
  );
}

const AV_COLORS = ['#2fa9d6', '#e85a10', '#2dd4bf', '#f5b924', '#8b5cf6', '#45d483', '#f4645c'];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const idx = name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length;
  const cls = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs';
  return (
    <span
      className={`${cls} inline-flex shrink-0 items-center justify-center rounded-md font-display font-bold tracking-wide`}
      style={{ background: `${AV_COLORS[idx]}22`, color: AV_COLORS[idx], border: `1px solid ${AV_COLORS[idx]}55` }}
    >
      {initials(name)}
    </span>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  const meta = {
    ok: { color: '#45d483', icon: 'checkc' as IconName },
    warn: { color: '#f5b924', icon: 'alert' as IconName },
    err: { color: '#f4645c', icon: 'alert' as IconName },
  };
  return (
    <div className="fixed bottom-5 right-5 z-[80] flex w-[min(360px,90vw)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="anim-toast flex items-start gap-2.5 rounded-md border border-ink-600 bg-ink-850/95 px-3.5 py-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur" style={{ borderLeft: `3px solid ${meta[t.kind].color}` }}>
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

export function EmptyState({ icon = 'inbox', title, sub }: { icon?: IconName; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 py-14 text-center">
      <span className="mb-3 text-mist-500"><I n={icon} className="w-8 h-8" sw={1.4} /></span>
      <p className="font-display text-lg font-semibold uppercase tracking-wide text-mist-300">{title}</p>
      {sub && <p className="mt-1 max-w-xs text-[12.5px] text-mist-500">{sub}</p>}
    </div>
  );
}

export function Section({ title, icon, right, children }: { title: string; icon?: IconName; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="anim-fade-up">
      <div className="mb-2.5 flex items-center gap-2">
        {icon && <I n={icon} className="h-3.5 w-3.5 text-cyanx-400" sw={2} />}
        <h4 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">{title}</h4>
        <span className="h-px flex-1 bg-ink-700" />
        {right}
      </div>
      {children}
    </section>
  );
}

/** Progress bar — teal→green, glowing when live, solid green at 100%. */
export function ProgressBar({ pct, tone = 'paper', h = 6 }: { pct: number; tone?: 'paper' | 'dark' | 'print'; h?: number }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  const done = v >= 100;
  const fill = done ? '#45d483' : 'linear-gradient(90deg,#2fa9d6,#2dd4bf 55%,#45d483)';
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${tone === 'paper' ? 'bg-[#d8cfb4]' : tone === 'print' ? 'bg-[#dde5ee]' : 'bg-ink-700'}`}
      style={{ height: h }}
      title={`Completion ${v}%`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${!done && v > 0 && tone !== 'print' ? 'anim-barlive' : ''}`}
        style={{ width: `${v}%`, background: fill }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SearchSelect — a searchable, keyboard-navigable dropdown           */
/* ------------------------------------------------------------------ */

export interface SearchOption {
  value: string;
  label: string;
  sub?: string;
  group?: string;
  hint?: string;
}

/**
 * Renders like the standard `.field` control but opens a type-to-filter list.
 * Supports option groups, arrow-key navigation, Enter to select, Esc to close.
 * The panel is viewport-fixed so it never clips inside scrollable ancestors.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  width = 'w-60',
  emptyLabel = 'No matches',
  /** Below this many options, fall back to a plain native <select>. */
  searchableThreshold = 10,
  /** Show an ✕ on the trigger to clear the current selection. */
  allowClear = false,
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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => `${o.label} ${o.sub ?? ''} ${o.group ?? ''} ${o.hint ?? ''}`.toLowerCase().includes(t));
  }, [options, q]);

  const grouped = useMemo(() => {
    const m = new Map<string, SearchOption[]>();
    for (const o of filtered) {
      const g = o.group ?? '';
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(o);
    }
    return [...m.entries()];
  }, [filtered]);

  // Position the panel relative to the button; flip up if near the bottom edge.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      const panelH = 300;
      const up = r.bottom + panelH + 16 > window.innerHeight && r.top > panelH;
      // Widen for long labels but never beyond the viewport, and never past the right edge.
      const w = Math.min(Math.max(r.width, 340), Math.min(480, window.innerWidth - 24));
      const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
      setPos({ top: up ? r.top - 8 : r.bottom + 8, left, w, up });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[active];
      if (o) pick(o.value);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    }
  };

  let runningIdx = -1;

  // Few options → a plain native select is the better control.
  if (options.length <= searchableThreshold) {
    const groups = new Map<string, SearchOption[]>();
    for (const o of options) {
      const g = o.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(o);
    }
    return (
      <select
        className={`field ${width === 'w-full' ? '' : width}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {[...groups.entries()].map(([g, opts]) =>
          g ? (
            <optgroup key={g} label={g}>
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                  {o.sub ? ` · ${o.sub}` : ''}
                </option>
              ))}
            </optgroup>
          ) : (
            opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.sub ? ` · ${o.sub}` : ''}
              </option>
            ))
          )
        )}
      </select>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${width}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`field flex w-full cursor-pointer items-center justify-between gap-2 text-left transition ${
          open ? 'border-cyanx-500' : ''
        } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'font-semibold text-mist-100' : 'text-mist-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && selected.sub && (
          <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-wider text-mist-500 sm:inline">{selected.sub}</span>
        )}
        {allowClear && selected && !disabled && (
          <span
            role="button"
            tabIndex={0}
            title="Clear selection"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="shrink-0 rounded p-0.5 text-mist-500 transition hover:bg-redx-500/15 hover:text-redx-400"
          >
            <I n="x" className="h-3 w-3" sw={2.6} />
          </span>
        )}
        <I
          n="chevR"
          className={`h-3.5 w-3.5 shrink-0 text-mist-400 transition-transform duration-200 ${open ? 'rotate-90 text-cyanx-400' : ''}`}
          sw={2.4}
        />
      </button>

      {open && pos &&
        createPortal(
        <div
          ref={panelRef}
          className="anim-pop fixed z-[95] overflow-hidden rounded-lg border border-ink-600 bg-ink-850 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]"
          style={{
            left: pos.left,
            width: pos.w,
            ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
          }}
        >
          <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2">
            <I n="search" className="h-3.5 w-3.5 shrink-0 text-mist-500" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type to filter…"
              className="w-full bg-transparent font-mono text-[12px] text-mist-100 outline-none placeholder:text-mist-600"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} className="text-mist-500 transition hover:text-mist-200" title="Clear search">
                <I n="x" className="h-3 w-3" sw={2.4} />
              </button>
            )}
          </div>

          <div ref={listRef} className="scroll-slim max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mist-600">
                {emptyLabel}{q ? ` — “${q}”` : ''}
              </p>
            )}
            {grouped.map(([g, opts]) => (
              <div key={g || '__none'}>
                {g && (
                  <p className="px-3 pb-1 pt-2.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-mist-600">{g}</p>
                )}
                {opts.map((o) => {
                  runningIdx += 1;
                  const idx = runningIdx;
                  const isActive = idx === active;
                  const isSel = o.value === value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      data-idx={idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => pick(o.value)}
                      className={`flex w-full items-center gap-2.5 border-l-2 px-3 py-2 text-left transition-colors ${
                        isActive ? 'border-cyanx-500 bg-cyanx-500/12' : 'border-transparent hover:bg-ink-800/70'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[12.5px] font-semibold ${isActive ? 'text-mist-50' : 'text-mist-200'}`}>
                          {o.label}
                        </span>
                        {o.sub && (
                          <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-mist-500">{o.sub}</span>
                        )}
                      </span>
                      {isSel && <I n="checkc" className="h-3.5 w-3.5 shrink-0 text-cyanx-400" sw={2.2} />}
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
