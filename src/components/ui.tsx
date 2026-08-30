import React from 'react';
import type { Division, Kind, Priority, Stage } from '../lib/types';
import { KINDS, PRIORITIES, stageMeta } from '../lib/types';
import { useStore } from '../lib/store';
import { I } from './icons';
import { initials } from '../lib/util';

export function StageChip({ stage, size = 'sm' }: { stage: Stage; size?: 'sm' | 'md' }) {
  const m = stageMeta(stage);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-medium uppercase tracking-wide ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      }`}
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
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: m.color }}
    >
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
  const color = div.id.startsWith('desk-') ? '#fbc94a' : div.cluster === 'ops' ? '#ff8a4c' : '#56c8f0';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${
        tone === 'paper' ? 'bg-[#16283c0f]' : 'bg-ink-800'
      }`}
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
    ok: { color: '#45d483', icon: 'checkc' as const },
    warn: { color: '#f5b924', icon: 'alert' as const },
    err: { color: '#f4645c', icon: 'alert' as const },
  };
  return (
    <div className="fixed bottom-5 right-5 z-[80] flex w-[min(360px,90vw)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-toast flex items-start gap-2.5 rounded-md border border-ink-600 bg-ink-850/95 px-3.5 py-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
          style={{ borderLeft: `3px solid ${meta[t.kind].color}` }}
        >
          <span style={{ color: meta[t.kind].color }} className="mt-0.5">
            <I n={meta[t.kind].icon} className="w-4 h-4" sw={2} />
          </span>
          <p className="text-[13px] leading-snug text-mist-100">{t.text}</p>
        </div>
      ))}
    </div>
  );
}

export function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal>
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`anim-pop relative w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-xl border border-ink-600 bg-ink-900 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]`}
      >
        {children}
      </div>
    </div>
  );
}

export function PageHead({
  kicker,
  title,
  sub,
  right,
}: {
  kicker: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-flare-400">{kicker}</p>
        <h1 className="font-display text-[34px] font-bold uppercase leading-none tracking-wide text-mist-50 sm:text-[40px]">
          {title}
        </h1>
        {sub && <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-mist-400">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, sub }: { icon?: Parameters<typeof I>[0]['n']; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 py-14 text-center">
      <span className="mb-3 text-mist-500">
        <I n={icon} className="w-8 h-8" sw={1.4} />
      </span>
      <p className="font-display text-lg font-semibold uppercase tracking-wide text-mist-300">{title}</p>
      {sub && <p className="mt-1 max-w-xs text-[12.5px] text-mist-500">{sub}</p>}
    </div>
  );
}


