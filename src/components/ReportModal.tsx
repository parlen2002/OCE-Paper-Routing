import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { ALL_UNITS, cityEngineerName, divById, stageMeta, type Custody, type Paper } from '../lib/types';
import { I, Seal } from './icons';
import { fmtDT } from '../lib/util';

const D = 864e5;

type Period = 'daily' | 'weekly' | 'monthly';

const toDateInput = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fromInput = (s: string) => {
  const [y, m, dd] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, dd || 1, 12, 0, 0).getTime();
};

function periodRange(p: Period, ts: number): { from: number; to: number; label: string } {
  const d = new Date(ts);
  const sod = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const fmt = (x: number) =>
    new Date(x).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  if (p === 'daily') return { from: sod, to: sod + D, label: fmt(sod) };
  if (p === 'weekly') {
    const dow = (new Date(sod).getDay() + 6) % 7; // Monday = 0
    const start = sod - dow * D;
    return { from: start, to: start + 7 * D, label: `${fmt(start)} — ${fmt(start + 6 * D)}` };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return {
    from: start,
    to: end,
    label: new Date(start).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
  };
}

interface Row {
  paper: Paper;
  moves: Custody[]; // created/routed within period
  lastAt: number;
  lastBy: string;
}

export function ReportModal() {
  const { ui, setReportOpen, db, user } = useStore();
  const [period, setPeriod] = useState<Period>('daily');
  const [date, setDate] = useState(toDateInput(Date.now()));

  const range = useMemo(() => periodRange(period, fromInput(date)), [period, date]);

  const report = useMemo(() => {
    const { from, to } = range;
    const rows: Row[] = [];
    let logged = 0;
    let forwarded = 0;
    let completed = 0;

    for (const p of db.papers) {
      const moves = p.custody.filter((e) => e.at >= from && e.at < to && (e.action === 'created' || e.action === 'routed'));
      for (const e of p.custody) {
        if (e.at >= from && e.at < to) {
          if (e.action === 'created') logged++;
          if (e.action === 'routed') forwarded++;
          if (e.action === 'stage' && e.stage === 'completed') completed++;
        }
      }
      if (moves.length > 0) {
        rows.push({ paper: p, moves, lastAt: moves[moves.length - 1].at, lastBy: moves[moves.length - 1].byName });
      }
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

    const divSummary = ALL_UNITS.map((d) => {
      let inbound = 0;
      let outbound = 0;
      for (const p of db.papers) {
        for (const e of p.custody) {
          if (e.at < from || e.at >= to) continue;
          if ((e.action === 'created' || e.action === 'routed') && e.toDivisionId === d.id) inbound++;
          if (e.action === 'routed' && e.fromDivisionId === d.id) outbound++;
        }
      }
      const holding = db.papers.filter((p) => p.divisionId === d.id && p.stage !== 'completed').length;
      const done = db.papers.filter(
        (p) => p.divisionId === d.id && p.custody.some((e) => e.action === 'stage' && e.stage === 'completed' && e.at >= from && e.at < to)
      ).length;
      return { d, inbound, outbound, holding, done };
    });

    const pending = db.papers.filter((p) => p.stage !== 'completed').length;
    return { rows, logged, forwarded, completed, pending, trail, divSummary };
  }, [db.papers, range]);

  if (!ui.reportOpen) return null;
  const close = () => setReportOpen(false);
  const title = period === 'daily' ? 'DAILY' : period === 'weekly' ? 'WEEKLY' : 'MONTHLY';

  return (
    <div className="print-reset fixed inset-0 z-[65] overflow-y-auto">
      <div className="no-print fixed inset-0 bg-ink-950/85 backdrop-blur-sm" onClick={close} />

      <div className="print-reset relative mx-auto my-6 w-[min(920px,94vw)]">
        {/* controls */}
        <div className="no-print anim-fade-up mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/95 px-3 py-2.5 shadow-xl">
          <I n="printer" className="h-4 w-4 text-flare-400" sw={2} />
          <span className="mr-1 font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">Routing report</span>

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

          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="field w-[150px] py-1.5 font-mono text-[11.5px]"
          />
          <span className="hidden font-mono text-[10px] uppercase tracking-wider text-mist-500 md:inline">{range.label}</span>

          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost py-1.5" onClick={close}>
              Close
            </button>
            <button className="btn btn-primary py-1.5" onClick={() => window.print()}>
              <I n="printer" className="h-4 w-4" sw={2.2} />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* ------- the sheet ------- */}
        <div className="print-sheet anim-pop scroll-slim max-h-[80vh] overflow-y-auto rounded-md bg-white text-[#182a3e] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)]">
          <div className="px-9 py-8">
            {/* letterhead */}
            <div className="flex items-center gap-4 border-b-[3px] border-[#182a3e] pb-4">
              <Seal className="h-14 w-14" />
              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b7089]">Republic of the Philippines</p>
                <p className="font-display text-[22px] font-bold uppercase leading-tight tracking-wide">City of Puerto Princesa</p>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#31506e]">Office of the City Engineer</p>
                <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.18em] text-[#8a9ab0]">CEO Flow — Paperwork Flow Command</p>
              </div>
              <div className="w-14 text-right font-mono text-[9px] uppercase leading-relaxed text-[#8a9ab0]">
                Form
                <br />
                CEO-RPT-01
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between">
              <div>
                <h1 className="font-display text-[26px] font-bold uppercase leading-none tracking-wide">
                  {title} Paper Routing Report
                </h1>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b7089]">
                  Coverage · {range.label}
                </p>
              </div>
              <span
                className="stamp text-[11px]"
                style={{ color: period === 'daily' ? '#0e7490' : period === 'weekly' ? '#b45309' : '#7c2d12' }}
              >
                {title}
              </span>
            </div>

            {/* summary */}
            <div className="mt-5 grid grid-cols-4 gap-2.5">
              {[
                { l: 'Papers logged', v: report.logged },
                { l: 'Forwarded / re-routed', v: report.forwarded },
                { l: 'Completed in period', v: report.completed },
                { l: 'Still open (all time)', v: report.pending },
              ].map((s) => (
                <div key={s.l} className="border border-[#c8d3e0] px-3 py-2.5">
                  <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#8a9ab0]">{s.l}</p>
                  <p className="font-display text-[30px] font-bold leading-none tabular">{s.v}</p>
                </div>
              ))}
            </div>

            {/* routing table */}
            <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">
              1 · Papers routed during the period
            </h2>
            {report.rows.length === 0 ? (
              <p className="mt-4 border border-dashed border-[#c8d3e0] px-4 py-8 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8a9ab0]">
                No paper routing recorded for this period
              </p>
            ) : (
              <table className="mt-3 w-full border-collapse text-[10.5px] leading-snug">
                <thead>
                  <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                    <th className="py-1.5 pr-2">Ref</th>
                    <th className="py-1.5 pr-2">Document</th>
                    <th className="py-1.5 pr-2">Origin</th>
                    <th className="py-1.5 pr-2">Intended</th>
                    <th className="py-1.5 pr-2">Now at</th>
                    <th className="py-1.5 pr-2">Route trail</th>
                    <th className="py-1.5 pr-2">Stage</th>
                    <th className="py-1.5">Last movement</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => {
                    const p = r.paper;
                    const off = p.divisionId !== p.intendedId;
                    return (
                      <tr key={p.id} className="border-b border-[#dde5ee] align-top">
                        <td className="py-2 pr-2 font-mono text-[9.5px] font-bold">{p.ref}</td>
                        <td className="py-2 pr-2 font-semibold">{p.title}</td>
                        <td className="py-2 pr-2 text-[#5b7089]">{p.origin}</td>
                        <td className="py-2 pr-2 font-mono text-[9.5px]">{divById(p.intendedId)?.code}</td>
                        <td className="py-2 pr-2 font-mono text-[9.5px] font-bold">
                          {divById(p.divisionId)?.code}
                          {off && <span className="ml-1 font-bold text-[#b45309]">(re-routed)</span>}
                        </td>
                        <td className="py-2 pr-2 font-mono text-[9.5px] text-[#31506e]">{report.trail(p)}</td>
                        <td className="py-2 pr-2">{stageMeta(p.stage).label}</td>
                        <td className="py-2 font-mono text-[9.5px] text-[#5b7089]">
                          {fmtDT(r.lastAt)}
                          <br />
                          {r.lastBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* division summary */}
            <h2 className="mt-7 border-b-2 border-[#182a3e] pb-1 font-display text-[15px] font-bold uppercase tracking-[0.14em]">
              2 · Division movement summary
            </h2>
            <table className="mt-3 w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="border-y-2 border-[#182a3e] text-left font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5b7089]">
                  <th className="py-1.5 pr-2">Division</th>
                  <th className="py-1.5 pr-2 text-right">Received in</th>
                  <th className="py-1.5 pr-2 text-right">Forwarded out</th>
                  <th className="py-1.5 pr-2 text-right">Holding (open)</th>
                  <th className="py-1.5 text-right">Completed</th>
                </tr>
              </thead>
              <tbody>
                {report.divSummary.map(({ d, inbound, outbound, holding, done }) => (
                  <tr key={d.id} className="border-b border-[#dde5ee]">
                    <td className="py-1.5 pr-2">
                      <span className="font-mono text-[9.5px] font-bold">{d.code}</span>
                      <span className="ml-2 text-[#5b7089]">{d.name}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular">{inbound}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular">{outbound}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular">{holding}</td>
                    <td className="py-1.5 text-right font-mono tabular">{done}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* certification */}
            <div className="mt-10 grid grid-cols-2 gap-10">
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

            <p className="mt-8 border-t border-[#dde5ee] pt-2 text-center font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#8a9ab0]">
              Generated by CEO Flow · {fmtDT(Date.now())} · excerpt of the electronic chain of custody · {db.papers.length} documents on record
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
