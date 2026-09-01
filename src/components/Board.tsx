import React, { useMemo, useState } from 'react';
import type { Paper, Stage } from '../lib/core';
import { ALL_UNITS, CROSS_UNITS, DESKS, DIVISIONS, PRIORITIES, STAGES, divById, extractBarangays, paperBarangays, timeAgo } from '../lib/core';
import { useStore } from '../lib/store';
import { I, DivChip, KindTag, PriorityTag, ProgressBar, SearchSelect } from './ui';

function Card({ paper, draggable, onOpen }: { paper: Paper; draggable: boolean; onOpen: () => void }) {
  const { db, me } = useStore();
  const div = divById(paper.divisionId);
  const geo = paper.attachments.some((a) => a.geotagged);
  const imgs = paper.attachments.filter((a) => a.kind === 'image').slice(0, 3);
  const pdfs = paper.attachments.filter((a) => a.kind === 'pdf').length;
  const done = paper.stage === 'completed';
  const recipients = paper.recipientIds ?? [paper.divisionId];
  const multi = recipients.length > 1;
  const myDesk = me?.role === 'division' ? me.divisionId : null;
  const addressedToMe = !!myDesk && recipients.includes(myDesk);
  const iAcknowledged = !!myDesk && (paper.receivedBy ?? []).includes(myDesk);
  const pics = (paper.assignees ?? []).map((id) => db.users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => !!u);
  const pct = Math.round(paper.progress ?? (done ? 100 : 0));

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', paper.id); e.dataTransfer.effectAllowed = 'move'; (e.currentTarget as HTMLElement).classList.add('opacity-40', 'rotate-2'); }}
      onDragEnd={(e) => (e.currentTarget as HTMLElement).classList.remove('opacity-40', 'rotate-2')}
      onClick={onOpen}
      className={`paper-card group relative cursor-pointer overflow-hidden rounded-md p-3 pl-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_-14px_rgba(0,0,0,0.75)] ${done ? 'opacity-75 saturate-[0.85]' : ''}`}
      title={draggable ? 'Drag across stages · click for the full trail' : 'Click for the full trail'}
    >
      <span className="absolute inset-y-0 left-0 w-[3.5px]" style={{ background: PRIORITIES[paper.priority].color }} />
      {paper.priority === 'urgent' && !done && <span className="stamp absolute right-2 top-9 text-[10px] text-redx-500">Urgent</span>}
      {done && <span className="stamp absolute right-2 top-9 text-[10px] text-[#1f9d55]">Closed</span>}
      {paper.pendingHeadReview && !done && <span className="stamp absolute right-2 top-20 text-[9px] text-[#b45309]">Head review</span>}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] font-semibold tracking-wider text-[#5b7089]">{paper.ref}</span>
        <PriorityTag p={paper.priority} />
      </div>

      <h3 className="mt-1 font-display text-[17.5px] font-bold leading-[1.08] tracking-wide text-[#132437]">{paper.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {div && <DivChip div={div} tone="paper" />}
        <KindTag kind={paper.kind} />
        {multi && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-cyanx-600/50 bg-cyanx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0e7490]"
            title={`Circulated to ${recipients.length} desks: ${recipients.map((r) => divById(r)?.code ?? r).join(', ')}`}>
            <I n="route" className="h-2.5 w-2.5" sw={2.4} /> ×{recipients.length} desks
          </span>
        )}
        {multi && addressedToMe && !done && (
          iAcknowledged ? (
            <span className="inline-flex items-center gap-1 rounded-sm border border-[#1f9d55]/50 bg-[#1f9d55]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1f9d55]">
              <I n="check" className="h-2.5 w-2.5" sw={2.6} /> Received
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-sm border border-amberx-500/60 bg-amberx-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#a16207]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d97706]" /> Receipt due
            </span>
          )
        )}
        {paper.diverted && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-amberx-500/60 bg-amberx-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#a16207]">
            <I n="alert" className="h-2.5 w-2.5" sw={2.4} /> Re-routed
          </span>
        )}
        {pics.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-[#0f9d8a]/50 bg-[#2dd4bf]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0d9488]"
            title={`Persons-in-charge: ${pics.map((p) => p.name).join(', ')}`}>
            <I n="users" className="h-2.5 w-2.5" sw={2.4} />
            {pics.slice(0, 2).map((p) => p.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]).join(' + ')}
            {pics.length > 2 && <span className="text-[#0d9488]/80">+{pics.length - 2}</span>}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <ProgressBar value={pct} />
        <span className="shrink-0 font-mono text-[9px] font-bold text-[#5b7089] tabular">{pct}%</span>
      </div>

      {(imgs.length > 0 || pdfs > 0 || geo) && (
        <div className="mt-2 flex items-center gap-1.5">
          {imgs.map((a) => (
            <img key={a.id} src={a.url} alt={a.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} className="h-11 w-[52px] rounded-[4px] border border-[#d8cfb4] object-cover" />
          ))}
          {pdfs > 0 && (
            <span className="inline-flex h-11 items-center gap-1 rounded-[4px] border border-[#d8cfb4] bg-[#e4dcc4]/60 px-2 font-mono text-[9.5px] font-semibold text-[#5b7089]">
              <I n="file" className="h-3.5 w-3.5" /> {pdfs} PDF
            </span>
          )}
          {geo && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-[4px] border border-tealx-500/50 bg-tealx-500/10 px-1.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0d9488]">
              <I n="pin" className="h-3 w-3" sw={2.2} /> GPS
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 border-t border-[#d8cfb4] pt-2 font-mono text-[9.5px] uppercase tracking-wider text-[#7b8ba0]">
        <span className="inline-flex items-center gap-1"><I n="clock" className="h-3 w-3" />{timeAgo(paper.updatedAt)}</span>
        <span className="inline-flex items-center gap-1"><I n="route" className="h-3 w-3" />{paper.custody.length} hand-offs</span>
        <span className="ml-auto text-[#a1b2c6] opacity-0 transition group-hover:opacity-100">open →</span>
      </div>
    </div>
  );
}

function AssignModal({ paperId, stage, onClose }: { paperId: string; stage: Stage; onClose: () => void }) {
  const { db, employeesOf, moveStage } = useStore();
  const paper = db.papers.find((p) => p.id === paperId);
  const [picSel, setPicSel] = useState<string>(paper?.assignees?.[0] ?? '');
  const [note, setNote] = useState('');
  if (!paper) return null;
  const emps = employeesOf(paper.divisionId);
  const meta = STAGES.find((s) => s.id === stage) ?? STAGES[0];

  return (
    <div className="fixed inset-0 z-[62] flex items-start justify-center overflow-y-auto p-4 sm:p-12">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-md rounded-xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-flare-400">Move paperwork</p>
        <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase leading-tight tracking-wide text-mist-50">
          {paper.ref} → <span style={{ color: meta.color }}>{meta.label}</span>
        </h3>
        <p className="mt-1 truncate text-[12px] text-mist-400">{paper.title}</p>

        <label className="mt-4 block">
          <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">
            Person-in-charge · {divById(paper.divisionId)?.code ?? ''} personnel
          </span>
          <SearchSelect
            value={picSel}
            onChange={setPicSel}
            allowClear
            width="w-full"
            placeholder="Keep current / unassigned"
            options={emps.map((e) => ({ value: e.id, label: e.name, sub: `${e.title}${e.role === 'joborder' ? ' · Job Order' : ''}` }))}
          />
          <span className="mt-1 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">
            {emps.length === 0 ? 'No active personnel in this division yet — the move proceeds without a PIC' : 'The employee gets the paper on their personal board and a taskbar signal'}
          </span>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Movement note (optional)</span>
          <input className="field" placeholder="e.g. Mobilize crew by Monday" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary"
            onClick={() => { moveStage(paperId, stage, note || undefined, picSel || ''); onClose(); }}>
            <I n="check" className="h-4 w-4" sw={2.2} /> Confirm move
          </button>
        </div>
      </div>
    </div>
  );
}

export function Board() {
  const { db, me, ui, visiblePapers, setDivFilter, openDrawer, moveStage, canEdit, setNewOpen, employeesOf, setReportOpen, custom } = useStore();
  const [over, setOver] = useState<Stage | null>(null);
  const [scope, setScope] = useState<'queue' | 'trail'>('queue');
  const [pendingMove, setPendingMove] = useState<{ id: string; stage: Stage } | null>(null);
  const [q, setQ] = useState('');
  const [monthF, setMonthF] = useState('');
  const [brgyF, setBrgyF] = useState('all');
  const [empF, setEmpF] = useState('all');

  const isField = me?.role === 'employee' || me?.role === 'joborder';
  const isWide = me?.role === 'admin' || me?.role === 'supervisor' || me?.role === 'moderator';
  const myDiv = me?.divisionId ? divById(me.divisionId) : undefined;

  const printBoard = () => setReportOpen(true, { presetDiv: isField ? 'all' : ui.divFilter });

  const barangays = useMemo(() => extractBarangays(visiblePapers, custom.barangays ?? [], db.geobrgy ?? {}), [visiblePapers, custom.barangays, db.geobrgy]);

  const empRoster = useMemo(
    () => db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && u.status === 'active').sort((a, b) => a.name.localeCompare(b.name)),
    [db.users]
  );

  const hasExtraFilters = monthF !== '' || brgyF !== 'all' || empF !== 'all';

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const [fy, fm] = monthF ? monthF.split('-').map(Number) : [0, 0];
    return visiblePapers.filter((p) => {
      if (!isField) {
        if (!isWide && scope === 'queue' && p.divisionId !== me?.divisionId && !(p.recipientIds ?? []).includes(me?.divisionId ?? '')) return false;
        if (isWide && ui.divFilter !== 'all' && p.divisionId !== ui.divFilter) return false;
      }
      if (monthF) {
        const d = new Date(p.createdAt);
        if (d.getFullYear() !== fy || d.getMonth() !== fm - 1) return false;
      }
      if (brgyF !== 'all') {
        const names = paperBarangays(p, db.geobrgy ?? {});
        if (!names.some((n) => n.toLowerCase() === brgyF.toLowerCase())) return false;
      }
      if (empF !== 'all' && !(p.assignees ?? []).includes(empF)) return false;
      if (!ql) return true;
      const pics = (p.assignees ?? []).map((id) => db.users.find((u) => u.id === id)?.name ?? '').join(' ');
      const hay = `${p.ref} ${p.title} ${p.origin} ${divById(p.divisionId)?.name ?? ''} ${pics}`.toLowerCase();
      return hay.includes(ql);
    });
  }, [visiblePapers, q, ui.divFilter, isWide, isField, scope, me, monthF, brgyF, empF, db]);

  const byStage = (s: Stage) => filtered.filter((p) => p.stage === s);

  const drop = (stage: Stage, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setOver(null);
    if (!id) return;
    const paper = visiblePapers.find((p) => p.id === id);
    if (!paper || paper.stage === stage) return;
    const canAssign = me && (me.role === 'admin' || me.role === 'supervisor' || me.role === 'division' || me.role === 'moderator');
    if (canAssign && employeesOf(paper.divisionId).length > 0) {
      setPendingMove({ id, stage });
      return;
    }
    moveStage(id, stage);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isField ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-md border border-tealx-500/45 bg-tealx-500/10 px-3 py-1.5 text-[12px] font-semibold text-tealx-400">
              <I n="users" className="h-4 w-4" sw={2} /> My work board · {me?.name}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
              Update your stages — completion is verified by your division head
            </span>
          </>
        ) : isWide ? (
          <>
            <button onClick={() => setDivFilter('all')}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition ${ui.divFilter === 'all' ? 'border-flare-500 bg-flare-500/15 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400 hover:text-mist-100'}`}>
              All desks
            </button>
            {DESKS.map((d) => (
              <button key={d.id} onClick={() => setDivFilter(d.id === ui.divFilter ? 'all' : d.id)} title={d.name}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition active:scale-[0.97] ${ui.divFilter === d.id ? 'border-amberx-400 bg-amberx-400/12 text-amberx-400' : 'border-ink-600 bg-ink-850 text-mist-400 hover:text-mist-100'}`}>
                {d.code}
              </button>
            ))}
            {[...DIVISIONS, ...CROSS_UNITS].map((d) => (
              <button key={d.id} onClick={() => setDivFilter(d.id === ui.divFilter ? 'all' : d.id)} title={d.name}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition active:scale-[0.97] ${ui.divFilter === d.id ? (d.id === 'insp-team' ? 'border-tealx-500 bg-tealx-500/12 text-tealx-400' : 'border-cyanx-500 bg-cyanx-500/12 text-cyanx-400') : 'border-ink-600 bg-ink-850 text-mist-400 hover:text-mist-100'}`}>
                {d.code}
              </button>
            ))}
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-md border border-ink-600 bg-ink-850 px-3 py-1.5 text-[12px] font-semibold text-mist-200">
              <span className="h-1.5 w-1.5 rounded-full bg-flare-500" /> {myDiv?.name}
            </span>
            <button onClick={() => setScope('queue')}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition ${scope === 'queue' ? 'border-flare-500 bg-flare-500/15 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400'}`}>
              In my queue
            </button>
            <button onClick={() => setScope('trail')}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition ${scope === 'trail' ? 'border-cyanx-500 bg-cyanx-500/12 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-400'}`}>
              Everything through my desk
            </button>
          </>
        )}

        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500 md:block">
          {filtered.length} paper{filtered.length === 1 ? '' : 's'} in view · drag cards across stages
        </span>
        <button className="btn btn-ghost py-1.5" onClick={printBoard}>
          <I n="printer" className="h-4 w-4" sw={2} /> Print this board
        </button>
        {!isField && (
          <button className="btn btn-primary py-1.5" onClick={() => setNewOpen(true)}>
            <I n="plus" className="h-4 w-4" sw={2.2} /> Log paperwork
          </button>
        )}
      </div>

      <div className="anim-fade-up mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-ink-700/70 bg-ink-900/55 px-3 py-2.5" style={{ animationDelay: '80ms' }}>
        <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-mist-500">
          <I n="board" className="h-3 w-3" sw={2.2} /> Filter board
        </span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500"><I n="search" className="h-3.5 w-3.5" /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ref, title, origin, PIC…"
            title="Search by: paper reference (OCE-2026-…), title, origin, division name, or person-in-charge"
            className="field w-80 py-1 pl-11 font-mono text-[11px]"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-500 transition hover:text-redx-400" title="Clear search">
              <I n="x" className="h-3 w-3" sw={2.6} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5">
          <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Month</span>
          <input type="month" className="field w-auto py-1 font-mono text-[10.5px]" value={monthF} onChange={(e) => setMonthF(e.target.value)} />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Barangay</span>
          <SearchSelect value={brgyF} onChange={setBrgyF} width="w-48"
            options={[{ value: 'all', label: 'All barangays' }, ...barangays.map((b) => ({ value: b, label: b }))]} />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Employee</span>
          <SearchSelect value={empF} onChange={setEmpF} width="w-56"
            options={[
              { value: 'all', label: 'All personnel' },
              ...empRoster.map((e) => ({ value: e.id, label: e.name, sub: divById(e.divisionId ?? '')?.code ?? '' })),
            ]} />
        </label>
        {hasExtraFilters && (
          <button className="btn btn-ghost py-1 text-[11px]" onClick={() => { setMonthF(''); setBrgyF('all'); setEmpF('all'); }}>
            <I n="x" className="h-3 w-3" sw={2.4} /> Clear
          </button>
        )}
      </div>

      <div className="scroll-slim -mx-1 overflow-x-auto px-1 pb-4">
        <div className="grid min-w-[1120px] grid-cols-5 gap-3">
          {STAGES.map((s, si) => {
            const list = byStage(s.id);
            const isOver = over === s.id;
            return (
              <section key={s.id}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(s.id); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
                onDrop={(e) => drop(s.id, e)}
                className={`anim-fade-up flex min-h-[420px] flex-col rounded-lg border transition-all duration-200 ${isOver ? 'border-cyanx-500/70 bg-cyanx-500/[0.06] shadow-[0_0_0_3px_rgba(86,200,240,0.12)]' : 'border-ink-700/70 bg-ink-900/55'}`}
                style={{ animationDelay: `${si * 60}ms` }}>
                <div className="relative rounded-t-lg border-b border-ink-700/60 px-3 pb-2.5 pt-3">
                  <span className="absolute inset-x-0 top-0 h-[2.5px] rounded-t-lg" style={{ background: s.color }} />
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}88` }} />
                    <h3 className="font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">{s.label}</h3>
                    <span className="ml-auto rounded bg-ink-700/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-mist-200 tabular">{list.length}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">{s.hint}</p>
                </div>

                <div className="scroll-slim flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5" style={{ maxHeight: 'calc(100vh - 330px)' }}>
                  {list.map((p, i) => (
                    <div key={p.id} className="anim-fade-up" style={{ animationDelay: `${i * 45}ms` }}>
                      <Card paper={p} draggable={canEdit(p)} onOpen={() => openDrawer(p.id)} />
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className={`flex flex-1 items-center justify-center rounded-md border border-dashed px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] transition ${isOver ? 'border-cyanx-500/60 text-cyanx-400' : 'border-ink-600 text-mist-600'}`}>
                      {isOver ? 'Release to file here' : 'Tray is clear'}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {pendingMove && <AssignModal paperId={pendingMove.id} stage={pendingMove.stage} onClose={() => setPendingMove(null)} />}
    </div>
  );
}
