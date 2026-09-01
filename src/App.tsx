import React, { useEffect, useMemo, useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import type { Paper, User } from './lib/core';
import { ALL_UNITS, STAGES, divById, stageMeta, cityEngineerName, fmtDT, fmtCoord, geobrgyKey, mapsLink, osmEmbed } from './lib/core';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { Board } from './components/Board';
import { DocDrawer } from './components/Drawer';
import { NewDocModal } from './components/NewDoc';
import { Dashboard, DocumentsPage, DivisionsPage, ActivityPage, UsersPage, PersonnelPage, LogsPage, MessagesPage, CustomizePage } from './components/Pages';
import { I, Seal, Toasts, SearchSelect, type SearchOption } from './components/ui';

/* ---------------- startup fault + error boundary ---------------- */
window.addEventListener('error', (e) => {
  if (document.querySelector('#boot-fault')) return;
  const el = document.createElement('div');
  el.id = 'boot-fault';
  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;z-index:999;background:#071120;';
  el.innerHTML = `<div style="max-width:560px;border:1px solid #274468;background:#0d1d31;border-radius:10px;padding:28px;font-family:ui-monospace,monospace;color:#e4edf6">
    <p style="letter-spacing:.2em;font-size:11px;color:#ff8a4c;text-transform:uppercase">OCE Flow — startup fault</p>
    <p style="font-size:18px;font-weight:700;margin:8px 0 4px;font-family:'Segoe UI',sans-serif">The app could not start</p>
    <p style="font-size:12px;color:#a9c0d6;margin-bottom:14px">${String(e.message ?? 'Unknown error')}</p>
    <p style="font-size:11px;color:#86a2be">${e.filename ?? ''}:${e.lineno ?? ''}</p>
    <p style="font-size:11px;color:#86a2be;margin-top:12px">Try a hard refresh (Ctrl + Shift + R). If it persists, reset the demo data below.</p>
    <button onclick="localStorage.clear();location.reload()" style="margin-top:14px;padding:8px 14px;border-radius:6px;border:1px solid #274468;background:#122540;color:#e4edf6;cursor:pointer;font-family:inherit">Clear data & reseed</button>
  </div>`;
  document.body.appendChild(el);
});

class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    // Guarantee the failure is visible even if React's own handling is silent.
    try { console.error('OCE Flow render fault:', err, info?.componentStack); } catch { /* */ }
    try {
      if (!document.getElementById('boot-fault')) {
        const el = document.createElement('div');
        el.id = 'boot-fault';
        el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;z-index:10000;background:#071120;';
        const card = document.createElement('div');
        card.style.cssText = 'max-width:580px;border:1px solid #274468;background:#0d1d31;border-radius:10px;padding:28px;font-family:ui-monospace,monospace;color:#e4edf6;';
        const k = document.createElement('p');
        k.style.cssText = 'margin:0;letter-spacing:.2em;font-size:11px;color:#ff8a4c;text-transform:uppercase;';
        k.textContent = 'OCE Flow — render fault';
        const h = document.createElement('p');
        h.style.cssText = 'font-size:18px;font-weight:700;margin:10px 0 4px;font-family:Segoe UI,sans-serif;';
        h.textContent = 'Something crashed while drawing the screen';
        const m = document.createElement('p');
        m.style.cssText = 'font-size:12px;color:#a9c0d6;margin:0 0 6px;word-break:break-word;line-height:1.5;';
        m.textContent = err?.message || String(err);
        const btn = document.createElement('button');
        btn.textContent = 'Clear data & reseed';
        btn.style.cssText = 'margin-top:14px;padding:9px 16px;border-radius:6px;border:1px solid #274468;background:#122540;color:#e4edf6;cursor:pointer;font-family:inherit;font-size:12px;';
        btn.onclick = () => { try { Object.keys(localStorage).forEach((x) => { if (x.indexOf('ceoflow') === 0) localStorage.removeItem(x); }); } catch { /* */ } location.reload(); };
        card.append(k, h, m, btn);
        el.appendChild(card);
        document.body.appendChild(el);
      }
    } catch { /* last resort failed; the React fallback below still renders */ }
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#071120' }}>
          <div style={{ maxWidth: 560, border: '1px solid #274468', background: '#0d1d31', borderRadius: 10, padding: 28, fontFamily: 'ui-monospace,monospace', color: '#e4edf6' }}>
            <p style={{ letterSpacing: '.2em', fontSize: 11, color: '#ff8a4c', textTransform: 'uppercase' }}>OCE Flow — render fault</p>
            <p style={{ fontSize: 18, fontWeight: 700, margin: '8px 0 4px', fontFamily: "'Segoe UI',sans-serif" }}>Something crashed on screen</p>
            <p style={{ fontSize: 12, color: '#a9c0d6', marginBottom: 14 }}>{String(this.state.err.message)}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => location.reload()} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #274468', background: '#122540', color: '#e4edf6', cursor: 'pointer' }}>Reload</button>
              <button onClick={() => { try { const k = Object.keys(localStorage).find((x) => x.startsWith('ceoflow')); if (k) localStorage.removeItem(k); } catch { /* */ } location.reload(); }} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #274468', background: '#122540', color: '#e4edf6', cursor: 'pointer' }}>Clear data & reseed</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------------- attachment viewer ---------------- */
function AttachmentViewer() {
  const { db, ui, setViewer } = useStore();
  const [zoom, setZoom] = useState(1);
  const paper = ui.viewer ? db.papers.find((p) => p.id === ui.viewer!.docId) : null;
  const idx = paper && ui.viewer ? Math.max(0, paper.attachments.findIndex((a) => a.id === ui.viewer!.attId)) : 0;
  const att = paper?.attachments[idx];

  useEffect(() => setZoom(1), [ui.viewer?.attId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!paper || !att) return;
      if (e.key === 'ArrowRight' && idx < paper.attachments.length - 1) setViewer({ docId: paper.id, attId: paper.attachments[idx + 1].id });
      if (e.key === 'ArrowLeft' && idx > 0) setViewer({ docId: paper.id, attId: paper.attachments[idx - 1].id });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paper, att, idx, setViewer]);

  if (!paper || !att) return null;
  const close = () => setViewer(null);

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-ink-950/95">
      <div className="flex items-center gap-3 border-b border-ink-700 bg-ink-900/90 px-4 py-3">
        <I n={att.kind === 'image' ? 'cam' : 'file'} className="h-4 w-4 text-cyanx-400" sw={2} />
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-bold text-mist-100">{att.name}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mist-500">
            {paper.ref} · {att.by} · {fmtDT(att.at)} {att.size ? `· ${att.size}` : ''} · {idx + 1} of {paper.attachments.length}
          </p>
        </div>
        {att.geotagged && att.lat != null && att.lng != null && (
          <a href={mapsLink(att.lat, att.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-tealx-500/50 bg-tealx-500/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-tealx-400 transition hover:bg-tealx-500/20">
            <I n="pin" className="h-3 w-3" sw={2.2} /> {fmtCoord(att.lat, att.lng)}
          </a>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {att.kind === 'image' && (
            <>
              <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.25))} className="rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[11px] font-bold text-mist-300 hover:text-mist-50">−</button>
              <span className="w-14 text-center font-mono text-[10px] text-mist-400 tabular">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[11px] font-bold text-mist-300 hover:text-mist-50">+</button>
            </>
          )}
          <a href={att.url} download={att.name} target={att.kind === 'pdf' ? '_blank' : undefined} rel="noreferrer" className="btn btn-ghost py-1.5 text-[11.5px]">
            <I n="dl" className="h-3.5 w-3.5" sw={2} /> Save
          </a>
          <button onClick={close} className="rounded-md border border-ink-600 p-2 text-mist-400 transition hover:border-redx-500/60 hover:text-redx-400" title="Close (Esc)">
            <I n="x" className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative flex-1 overflow-auto" onClick={close}>
        <div className="flex min-h-full items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
          {att.kind === 'image' ? (
            <img src={att.url} alt={att.name} style={{ transform: `scale(${zoom})`, transition: 'transform .18s ease' }} className="max-h-[82vh] max-w-full rounded-lg border border-ink-600 object-contain shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]" />
          ) : (
            <iframe title={att.name} src={att.url} className="h-[82vh] w-[min(920px,92vw)] rounded-lg border border-ink-600 bg-white" />
          )}
        </div>
        {idx > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setViewer({ docId: paper.id, attId: paper.attachments[idx - 1].id }); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md border border-ink-600 bg-ink-900/90 px-3 py-4 font-mono text-[12px] font-bold text-mist-200 hover:border-cyanx-500/60 hover:text-cyanx-400">←</button>
        )}
        {idx < paper.attachments.length - 1 && (
          <button onClick={(e) => { e.stopPropagation(); setViewer({ docId: paper.id, attId: paper.attachments[idx + 1].id }); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-ink-600 bg-ink-900/90 px-3 py-4 font-mono text-[12px] font-bold text-mist-200 hover:border-cyanx-500/60 hover:text-cyanx-400">→</button>
        )}
      </div>
    </div>
  );
}

/* ---------------- print center: routing report + paperwork detail ---------------- */
type Period = 'daily' | 'weekly' | 'monthly';
const toDateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromInput = (s: string) => {
  const [y, m, dd] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, dd || 1, 12).getTime();
};
function periodRange(p: Period, ts: number): { from: number; to: number; label: string } {
  const D = 864e5;
  const d = new Date(ts);
  const sod = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fmt = (x: number) => new Date(x).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  if (p === 'daily') return { from: sod, to: sod + D, label: fmt(sod) };
  if (p === 'weekly') {
    const dow = (new Date(sod).getDay() + 6) % 7;
    const start = sod - dow * D;
    return { from: start, to: start + 7 * D, label: `${fmt(start)} — ${fmt(start + 6 * D)}` };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return { from: start, to: end, label: new Date(start).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) };
}

function Letterhead({ form }: { form: string }) {
  return (
    <div className="flex items-center gap-4 border-b-[3px] border-[#182a3e] pb-4">
      <Seal className="h-14 w-14" />
      <div className="flex-1 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b7089]">Republic of the Philippines</p>
        <p className="font-display text-[22px] font-bold uppercase leading-tight tracking-wide">City of Puerto Princesa</p>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#31506e]">Office of the City Engineer</p>
        <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.18em] text-[#8a9ab0]">OCE Flow — Paperwork Flow Command</p>
      </div>
      <div className="w-16 text-right font-mono text-[9px] uppercase leading-relaxed text-[#8a9ab0]">Form<br />{form}</div>
    </div>
  );
}

function Signatures({ preparedBy, preparedTitle, users }: { preparedBy: string; preparedTitle: string; users: User[] }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-10">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b7089]">Prepared by</p>
        <div className="mt-10 border-t-2 border-[#182a3e] pt-1.5">
          <p className="text-[12px] font-bold">{preparedBy}</p>
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#5b7089]">{preparedTitle}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b7089]">Noted by</p>
        <div className="mt-10 border-t-2 border-[#182a3e] pt-1.5">
          <p className="text-[12px] font-bold">{cityEngineerName(users)}</p>
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-[#5b7089]">CGPP Department Head II (City Engineer)</p>
        </div>
      </div>
    </div>
  );
}

function PrintBar({ v }: { v: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(v)));
  const color = pct >= 100 ? '#1f9d55' : pct >= 50 ? '#0d9488' : pct >= 25 ? '#b45309' : '#c24a0c';
  return (
    <div className="flex items-center gap-2">
      <div className="h-[9px] flex-1 overflow-hidden rounded-full border border-[#c8d3e0] bg-[#eef2f7]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-11 text-right font-mono text-[11px] font-bold tabular" style={{ color }}>{pct}%</span>
    </div>
  );
}

function PaperSheet({ paper, userName, userTitle, users, geobrgy = {} }: { paper: Paper; userName: string; userTitle: string; users: User[]; geobrgy?: Record<string, string> }) {
  const div = divById(paper.divisionId);
  const intended = divById(paper.intendedId);
  const pics = (paper.assignees ?? []).map((id) => users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => !!u);
  const chrono = [...paper.custody].sort((a, b) => a.at - b.at);
  const path: string[] = [];
  for (const e of chrono) {
    if ((e.action === 'created' || e.action === 'routed') && e.toDivisionId) {
      if (e.fromDivisionId && e.fromDivisionId !== e.toDivisionId && path[path.length - 1] !== e.fromDivisionId) path.push(e.fromDivisionId);
      if (path[path.length - 1] !== e.toDivisionId) path.push(e.toDivisionId);
    }
  }
  if (path[path.length - 1] !== paper.divisionId) path.push(paper.divisionId);
  const receipts = chrono.filter((e) => e.action === 'received' && e.toDivisionId);
  const pendingDesks = (paper.recipientIds ?? []).filter((rid) => !(paper.receivedBy ?? []).includes(rid));
  const trail = chrono;
  const geo = paper.attachments.filter((a) => a.geotagged && a.lat != null && a.lng != null);
  const imgs = paper.attachments.filter((a) => a.kind === 'image');
  const pdfs = paper.attachments.filter((a) => a.kind === 'pdf');
  const pct = Math.round(paper.progress ?? (paper.stage === 'completed' ? 100 : 0));
  const sm = stageMeta(paper.stage);

  return (
    <div className="px-9 py-8">
      <Letterhead form="OCE-DOC-01" />

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#5b7089]">{paper.ref} · {paper.kind === 'work-order' ? 'Work Order' : paper.kind === 'memo' ? 'Memorandum' : paper.kind === 'permit' ? 'Permit' : paper.kind === 'complaint' ? 'Complaint' : 'Inspection'}</p>
          <h1 className="mt-1 font-display text-[26px] font-bold uppercase leading-tight tracking-wide">{paper.title}</h1>
        </div>
        <span className="stamp shrink-0 text-[11px]" style={{ color: sm.color }}>{sm.label}</span>
      </div>

      {/* particulars + completion */}
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 border-y-2 border-[#182a3e] py-3 text-[10.5px]">
        {[
          ['Origin', paper.origin],
          ['Logged by', `${paper.byName} · ${fmtDT(paper.createdAt)}`],
          ['Current holder', div ? `${div.name} (${div.code})` : '—'],
          ['Intended recipient', intended ? `${intended.name} (${intended.code})` : '—'],
          ['Persons-in-charge', pics.length ? pics.map((p) => p.name).join(', ') : 'Unassigned (division pool)'],
          ['Due date', paper.dueAt ? new Date(paper.dueAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'],
          ['Priority', paper.priority.toUpperCase()],
          ['Circulation', (paper.recipientIds?.length ?? 0) > 1 ? `${paper.recipientIds!.length} desks addressed · ${(paper.receivedBy ?? []).length} acknowledged` : 'Single recipient'],
        ].map(([k, v]) => (
          <p key={k} className="flex gap-2"><span className="w-32 shrink-0 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#8a9ab0]">{k}</span><span className="font-semibold">{v}</span></p>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#5b7089]">Completion rate {paper.kind === 'work-order' ? '(work order)' : '(optional tracking)'}</p>
        </div>
        <PrintBar v={pct} />
      </div>

      {paper.remarks && (
        <p className="mt-4 border-l-[3px] border-[#c24a0c] bg-[#f6f2e7] px-3 py-2 text-[10.5px] italic leading-relaxed text-[#31506e]">“{paper.remarks}”</p>
      )}

      {/* route sheet */}
      <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">1 · Route sheet — where it has gone</h2>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {path.map((id, i) => {
          const d = divById(id);
          const here = i === path.length - 1;
          return (
            <span key={`${id}-${i}`} className="flex items-center gap-1.5">
              <span className="rounded-sm border px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider"
                style={here ? { borderColor: '#c24a0c', background: '#c24a0c14', color: '#c24a0c' } : { borderColor: '#c8d3e0', background: '#eef2f7', color: '#31506e' }}>
                {d?.code ?? id}{here ? ' · NOW HERE' : ''}
              </span>
              {i < path.length - 1 && <span className="font-mono text-[11px] text-[#8a9ab0]">→</span>}
            </span>
          );
        })}
      </div>

      {(receipts.length > 0 || pendingDesks.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#5b7089]">Receipt stamps</span>
          {receipts.map((r) => (
            <span key={r.id} className="stamp border-[#1f9d55] px-2 py-0.5 text-[9.5px] text-[#1f9d55]">
              {divById(r.toDivisionId!)?.code ?? r.toDivisionId} · {r.byName.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]} · {fmtDT(r.at)}
            </span>
          ))}
          {pendingDesks.map((rid) => (
            <span key={rid} className="rounded-sm border border-dashed border-[#b45309] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#b45309]">
              {divById(rid)?.code ?? rid} pending
            </span>
          ))}
        </div>
      )}

      {paper.diverted && <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#b45309]">Paper was re-routed — now outside its originally intended desk.</p>}

      {(paper.recipientIds?.length ?? 0) > 1 && (
        <table className="mt-4 w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-y border-[#c8d3e0] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
              <th className="py-1 pr-2">Desk</th><th className="py-1 pr-2">Receipt</th><th className="py-1">Acknowledged by</th>
            </tr>
          </thead>
          <tbody>
            {paper.recipientIds!.map((rid) => {
              const d = divById(rid);
              const ack = paper.custody.find((e) => e.action === 'received' && e.toDivisionId === rid);
              return (
                <tr key={rid} className="border-b border-[#dde5ee]">
                  <td className="py-1 pr-2 font-mono text-[9px] font-bold">{d?.code ?? rid} <span className="font-normal text-[#5b7089]">— {d?.name}</span></td>
                  <td className="py-1 pr-2 font-mono text-[9px] font-bold" style={{ color: ack ? '#1f9d55' : '#b45309' }}>{ack ? 'RECEIVED' : 'PENDING'}</td>
                  <td className="py-1 text-[#5b7089]">{ack ? `${ack.byName} · ${fmtDT(ack.at)}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* chain of custody */}
      <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">2 · Chain of custody</h2>
      <table className="mt-3 w-full border-collapse text-[10.5px] leading-snug">
        <thead>
          <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
            <th className="py-1.5 pr-2">When</th><th className="py-1.5 pr-2">Officer</th><th className="py-1.5">Event</th>
          </tr>
        </thead>
        <tbody>
          {trail.map((e) => (
            <tr key={e.id} className="border-b border-[#dde5ee] align-top">
              <td className="py-1.5 pr-2 font-mono text-[9px] whitespace-nowrap">{fmtDT(e.at)}</td>
              <td className="py-1.5 pr-2 font-semibold whitespace-nowrap">{e.byName}</td>
              <td className="py-1.5">{e.text}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* evidence */}
      <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">
        3 · Evidence & site location · {paper.attachments.length} file{paper.attachments.length === 1 ? '' : 's'}
      </h2>
      {paper.attachments.length === 0 && (
        <p className="mt-3 border border-dashed border-[#c8d3e0] px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a9ab0]">No attachments on record</p>
      )}
      {geo.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <iframe title="Site location" src={osmEmbed(geo[0].lat!, geo[0].lng!)} className="h-56 w-full border border-[#c8d3e0]" loading="lazy" />
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b7089]">Site map · {fmtCoord(geo[0].lat!, geo[0].lng!)}</p>
          </div>
          <div>
            <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#5b7089]">Geotagged coordinates · site via OpenStreetMap</p>
            <table className="mt-2 w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b border-[#c8d3e0] text-left font-mono text-[7.5px] uppercase tracking-[0.14em] text-[#8a9ab0]">
                  <th className="py-1 pr-2">Photo</th>
                  <th className="py-1 pr-2">Coordinates</th>
                  <th className="py-1 pr-2">Site barangay</th>
                  <th className="py-1 text-right">Link</th>
                </tr>
              </thead>
              <tbody>
                {geo.map((g) => {
                  const site = geobrgy[geobrgyKey(g.lat!, g.lng!)];
                  return (
                    <tr key={g.id} className="border-b border-[#dde5ee]">
                      <td className="py-1.5 pr-2 font-semibold">{g.name}</td>
                      <td className="py-1.5 pr-2 font-mono text-[9px]">{fmtCoord(g.lat!, g.lng!)}</td>
                      <td className="py-1.5 pr-2 font-mono text-[9px] font-bold text-[#b45309]">{site ?? '—'}</td>
                      <td className="py-1.5 text-right"><a className="font-mono text-[9px] font-bold text-[#0e7490]" href={mapsLink(g.lat!, g.lng!)}>Maps ↗</a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {imgs.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {imgs.map((a) => (
            <figure key={a.id} className="break-inside-avoid">
              <img src={a.url} alt={a.name} className="h-36 w-full border border-[#c8d3e0] object-cover" />
              <figcaption className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#5b7089]">
                {a.name}{a.geotagged && a.lat != null && a.lng != null ? ` · ${fmtCoord(a.lat, a.lng)}` : ''} · {a.by}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* supporting PDFs */}
      {pdfs.length > 0 && (
        <>
          <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">4 · Supporting documents</h2>
          {pdfs.map((a, i) => (
            <div key={a.id} className="mt-3 break-inside-avoid">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#5b7089]">
                Annex {String.fromCharCode(65 + i)} — {a.name} · attached by {a.by} · {fmtDT(a.at)}
              </p>
              <iframe title={a.name} src={a.url} className="mt-1.5 h-[540px] w-full border border-[#c8d3e0]" />
            </div>
          ))}
        </>
      )}

      <Signatures preparedBy={userName} preparedTitle={userTitle} users={users} />
      <p className="mt-8 border-t border-[#dde5ee] pt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#8a9ab0]">
        Generated by OCE Flow · {fmtDT(Date.now())} · official excerpt of the electronic chain of custody
      </p>
    </div>
  );
}

export function ReportModal() {
  const { ui, setReportOpen, db, user, visiblePapers } = useStore();
  const [period, setPeriod] = useState<Period>('daily');
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [divSel, setDivSel] = useState<string>('all');

  useEffect(() => {
    if (ui.reportOpen) setDivSel(ui.reportPreset?.presetDiv ?? 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.reportOpen]);

  const paper = ui.reportPreset?.paperId ? db.papers.find((p) => p.id === ui.reportPreset!.paperId) ?? null : null;
  const mode: 'routing' | 'paper' = paper ? 'paper' : 'routing';

  const range = useMemo(() => periodRange(period, fromInput(date)), [period, date]);
  const isField = user?.role === 'employee' || user?.role === 'joborder';
  const canSelectAll = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'moderator';

  const reportPapers = useMemo(() => {
    if (canSelectAll && divSel !== 'all') return visiblePapers.filter((p) => p.divisionId === divSel);
    return visiblePapers;
  }, [visiblePapers, divSel, canSelectAll]);

  const scopeLabel = canSelectAll
    ? divSel === 'all' ? 'All divisions & offices' : (divById(divSel)?.name ?? divSel)
    : isField
      ? `Personal scope — ${user?.name ?? ''}`
      : `Division scope — ${divById(user?.divisionId ?? '')?.name ?? ''} only`;

  const report = useMemo(() => {
    const { from, to } = range;
    const rows: { paper: Paper; moves: typeof reportPapers[number]['custody']; lastAt: number; lastBy: string }[] = [];
    let logged = 0, forwarded = 0, completed = 0;
    for (const p of reportPapers) {
      const moves = p.custody.filter((e) => e.at >= from && e.at < to && (e.action === 'created' || e.action === 'routed'));
      for (const e of p.custody) {
        if (e.at >= from && e.at < to) {
          if (e.action === 'created') logged++;
          if (e.action === 'routed') forwarded++;
          if (e.action === 'stage' && e.stage === 'completed') completed++;
        }
      }
      if (moves.length > 0) rows.push({ paper: p, moves, lastAt: moves[moves.length - 1].at, lastBy: moves[moves.length - 1].byName });
    }
    rows.sort((a, b) => b.lastAt - a.lastAt);
    const trail = (p: Paper) => {
      const codes: string[] = [];
      for (const e of p.custody) {
        if ((e.action === 'created' || e.action === 'routed') && e.toDivisionId) {
          const code = divById(e.toDivisionId)?.code ?? e.toDivisionId;
          if (codes[codes.length - 1] !== code) codes.push(code);
        }
      }
      const multi = (p.recipientIds?.length ?? 0) > 1;
      return codes.join(' → ') + (multi ? ` · circulated ×${p.recipientIds!.length} (${(p.receivedBy ?? []).length} ack.)` : '');
    };
    const units = canSelectAll ? ALL_UNITS : ALL_UNITS.filter((d) => d.id === user?.divisionId);
    const divSummary = units.map((d) => {
      let inbound = 0, outbound = 0;
      for (const p of reportPapers) {
        for (const e of p.custody) {
          if (e.at < from || e.at >= to) continue;
          if ((e.action === 'created' || e.action === 'routed') && e.toDivisionId === d.id) inbound++;
          if (e.action === 'routed' && e.fromDivisionId === d.id) outbound++;
        }
      }
      const holding = reportPapers.filter((p) => p.divisionId === d.id && p.stage !== 'completed').length;
      return { d, inbound, outbound, holding };
    });
    return { rows, logged, forwarded, completed, trail, divSummary };
  }, [reportPapers, range, canSelectAll, user]);

  if (!ui.reportOpen || !user) return null;
  const close = () => setReportOpen(false);
  const title = period === 'daily' ? 'DAILY' : period === 'weekly' ? 'WEEKLY' : 'MONTHLY';

  return (
    <div className="print-reset fixed inset-0 z-[65] overflow-y-auto">
      <div className="no-print fixed inset-0 bg-ink-950/85 backdrop-blur-sm" onClick={close} />
      <div className="print-reset relative mx-auto my-6 w-[min(920px,94vw)]">
        <div className="no-print anim-fade-up mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/95 px-3 py-2.5 shadow-xl">
          <I n="printer" className="h-4 w-4 text-flare-400" sw={2} />
          <span className="mr-1 font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">
            Print center · {mode === 'paper' ? 'Paperwork detail' : 'Routing report'}
          </span>

          {mode === 'routing' && (
            <>
              <div className="flex overflow-hidden rounded-md border border-ink-600">
                {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${period === p ? 'bg-flare-500/20 text-flare-400' : 'bg-ink-850 text-mist-500 hover:text-mist-200'}`}>
                    {p}
                  </button>
                ))}
              </div>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="field w-[150px] py-1.5 font-mono text-[11.5px]" />
              <span className="hidden font-mono text-[10px] uppercase tracking-wider text-mist-500 md:inline">{range.label}</span>
              {canSelectAll ? (
                <SearchSelect
                  value={divSel}
                  onChange={setDivSel}
                  options={[
                    { value: 'all', label: 'All divisions & offices' },
                    ...ALL_UNITS.map((d): SearchOption => ({
                      value: d.id,
                      label: d.name,
                      sub: d.code,
                      group: d.id.startsWith('desk-') ? 'Executive desks' : d.cluster === 'ops' ? 'Field operations' : 'Technical services',
                    })),
                  ]}
                  width="w-72"
                  placeholder="Search a division / office…"
                />
              ) : (
                <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${isField ? 'border-tealx-500/50 bg-tealx-500/10 text-tealx-400' : 'border-cyanx-500/50 bg-cyanx-500/10 text-cyanx-400'}`}
                  title="The report is limited to the papers on your own tracker board">
                  <I n={isField ? 'users' : 'sitemap'} className="h-3 w-3" sw={2.2} /> {scopeLabel}
                </span>
              )}
            </>
          )}

          {mode === 'paper' && paper && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-flare-500/50 bg-flare-500/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-flare-400">
              <I n="file" className="h-3 w-3" sw={2.2} /> {paper.ref} · full record
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost py-1.5" onClick={close}>Close</button>
            <button className="btn btn-primary py-1.5" onClick={() => window.print()}>
              <I n="printer" className="h-4 w-4" sw={2.2} /> Print / Save PDF
            </button>
          </div>
        </div>

        <p className="no-print mb-3 flex items-center gap-2 px-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
          <I n="lock" className="h-3 w-3" sw={2} />
          Report scope matches your tracker board — other divisions' routing stays private to them and to the administrators
        </p>

        <div className="print-sheet anim-pop print-scroll scroll-slim max-h-[80vh] overflow-y-auto rounded-md bg-white text-[#182a3e] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)]">
          {mode === 'paper' && paper ? (
            <PaperSheet paper={paper} userName={user.name} userTitle={user.title} users={db.users} geobrgy={db.geobrgy} />
          ) : (
            <div className="px-9 py-8">
              <Letterhead form="OCE-RPT-01" />
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <h1 className="font-display text-[26px] font-bold uppercase leading-none tracking-wide">{title} Paper Routing Report</h1>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b7089]">Coverage · {range.label} · Scope · {scopeLabel}</p>
                </div>
                <span className="stamp text-[11px]" style={{ color: period === 'daily' ? '#0e7490' : period === 'weekly' ? '#b45309' : '#7c2d12' }}>{title}</span>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2.5">
                {[
                  { l: 'Papers logged', v: report.logged },
                  { l: 'Forwarded / re-routed', v: report.forwarded },
                  { l: 'Completed in period', v: report.completed },
                  { l: 'Open in scope', v: reportPapers.filter((p) => p.stage !== 'completed').length },
                ].map((s) => (
                  <div key={s.l} className="border border-[#c8d3e0] px-3 py-2.5">
                    <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#8a9ab0]">{s.l}</p>
                    <p className="font-display text-[30px] font-bold leading-none tabular">{s.v}</p>
                  </div>
                ))}
              </div>

              <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">1 · Papers routed during the period</h2>
              {report.rows.length === 0 ? (
                <p className="mt-4 border border-dashed border-[#c8d3e0] px-4 py-8 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8a9ab0]">No paper routing recorded for this period</p>
              ) : (
                <table className="mt-3 w-full border-collapse text-[10.5px] leading-snug">
                  <thead>
                    <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                      <th className="py-1.5 pr-2">Ref</th><th className="py-1.5 pr-2">Document</th><th className="py-1.5 pr-2">Origin</th>
                      <th className="py-1.5 pr-2">Now at</th><th className="py-1.5 pr-2">Route trail</th><th className="py-1.5 pr-2">Completion</th><th className="py-1.5">Last movement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => {
                      const p = r.paper;
                      const pct = Math.round(p.progress ?? (p.stage === 'completed' ? 100 : 0));
                      return (
                        <tr key={p.id} className="border-b border-[#dde5ee] align-top">
                          <td className="py-2 pr-2 font-mono text-[9.5px] font-bold">{p.ref}</td>
                          <td className="py-2 pr-2 font-semibold">{p.title}</td>
                          <td className="py-2 pr-2 text-[#5b7089]">{p.origin}</td>
                          <td className="py-2 pr-2 font-mono text-[9.5px] font-bold">
                            {divById(p.divisionId)?.code}
                            {p.divisionId !== p.intendedId && <span className="ml-1 text-[#b45309]">(re-routed)</span>}
                          </td>
                          <td className="py-2 pr-2 font-mono text-[9.5px] text-[#31506e]">{report.trail(p)}</td>
                          <td className="py-2 pr-2"><div className="w-24"><PrintBar v={pct} /></div></td>
                          <td className="py-2 font-mono text-[9.5px] text-[#5b7089]">{fmtDT(r.lastAt)}<br />{r.lastBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {!isField && report.divSummary.length > 0 && (
                <>
                  <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">2 · Division movement summary</h2>
                  <table className="mt-3 w-full border-collapse text-[10.5px]">
                    <thead>
                      <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                        <th className="py-1.5 pr-2">Division / office</th>
                        <th className="py-1.5 pr-2 text-right">Received in</th>
                        <th className="py-1.5 pr-2 text-right">Forwarded out</th>
                        <th className="py-1.5 text-right">Holding (open)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.divSummary.map(({ d, inbound, outbound, holding }) => (
                        <tr key={d.id} className="border-b border-[#dde5ee]">
                          <td className="py-1.5 pr-2"><span className="font-mono text-[9.5px] font-bold">{d.code}</span><span className="ml-2 text-[#5b7089]">{d.name}</span></td>
                          <td className="py-1.5 pr-2 text-right font-mono tabular">{inbound}</td>
                          <td className="py-1.5 pr-2 text-right font-mono tabular">{outbound}</td>
                          <td className="py-1.5 text-right font-mono tabular">{holding}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <Signatures preparedBy={user.name} preparedTitle={user.title} users={db.users} />
              <p className="mt-8 border-t border-[#dde5ee] pt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#8a9ab0]">
                Generated by OCE Flow · {fmtDT(Date.now())} · excerpt of the electronic chain of custody · {reportPapers.length} documents in scope
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- app ---------------- */
function AppInner() {
  const { user, ui, closeDrawer, setNewOpen, setViewer, setReportOpen, setProfileOpen } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (ui.viewer) setViewer(null);
      else if (ui.reportOpen) setReportOpen(false);
      else if (ui.profileOpen) setProfileOpen(false);
      else if (ui.newOpen) setNewOpen(false);
      else if (ui.drawerId) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui.viewer, ui.reportOpen, ui.profileOpen, ui.newOpen, ui.drawerId, closeDrawer, setNewOpen, setViewer, setReportOpen, setProfileOpen]);

  if (!user) {
    return (<><Login /><Toasts /></>);
  }

  const RESTRICTED = ['dashboard', 'users', 'userlogs', 'activity', 'personnel'];
  const page =
    user.role === 'employee' || user.role === 'joborder'
      ? RESTRICTED.includes(ui.page) ? 'myboard' : ui.page
      : user.role === 'division' && RESTRICTED.includes(ui.page)
        ? 'board'
        : ui.page;

  return (
    <>
      <Shell>
        {page === 'dashboard' && <Dashboard />}
        {page === 'board' && <Board />}
        {page === 'myboard' && (user.role === 'employee' || user.role === 'joborder') && <Board />}
        {page === 'documents' && <DocumentsPage />}
        {page === 'divisions' && <DivisionsPage />}
        {page === 'activity' && (user.role === 'admin' || user.role === 'supervisor' || user.role === 'moderator') && <ActivityPage />}
        {page === 'users' && user.role === 'admin' && <UsersPage />}
        {page === 'userlogs' && user.role === 'admin' && <LogsPage />}
        {page === 'personnel' && (user.role === 'admin' || user.role === 'supervisor' || user.role === 'moderator') && <PersonnelPage />}
        {page === 'messages' && <MessagesPage />}
        {page === 'customize' && user.role === 'admin' && <CustomizePage />}
      </Shell>
      <DocDrawer />
      <NewDocModal />
      <ReportModal />
      <AttachmentViewer />
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <Boundary>
      <StoreProvider>
        <AppInner />
      </StoreProvider>
    </Boundary>
  );
}
