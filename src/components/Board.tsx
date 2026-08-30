import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { DIVISIONS, INSPECTORATE, PRIORITIES, STAGES, divById } from '../lib/types';
import type { Paper, Stage } from '../lib/types';
import { I } from './icons';
import { DivChip, KindTag, PriorityTag } from './ui';
import { timeAgo } from '../lib/util';

function Card({ paper, draggable, onOpen }: { paper: Paper; draggable: boolean; onOpen: () => void }) {
  const div = divById(paper.divisionId);
  const geo = paper.attachments.some((a) => a.geotagged);
  const imgs = paper.attachments.filter((a) => a.kind === 'image').slice(0, 3);
  const pdfs = paper.attachments.filter((a) => a.kind === 'pdf').length;
  const done = paper.stage === 'completed';

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', paper.id);
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).classList.add('opacity-40', 'rotate-2');
      }}
      onDragEnd={(e) => (e.currentTarget as HTMLElement).classList.remove('opacity-40', 'rotate-2')}
      onClick={onOpen}
      className={`paper-card group relative cursor-pointer overflow-hidden rounded-md p-3 pl-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_-14px_rgba(0,0,0,0.75)] ${
        draggable ? 'active:cursor-grabbing' : ''
      } ${done ? 'opacity-75 saturate-[0.85]' : ''}`}
      title={draggable ? 'Drag across stages · click for the full trail' : 'Click for the full trail'}
    >
      <span className="absolute inset-y-0 left-0 w-[3.5px]" style={{ background: PRIORITIES[paper.priority].color }} />

      {paper.priority === 'urgent' && !done && (
        <span className="stamp absolute right-2 top-9 text-[10px] text-redx-500">Urgent</span>
      )}
      {done && <span className="stamp absolute right-2 top-9 text-[10px] text-[#1f9d55]">Closed</span>}

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] font-semibold tracking-wider text-[#5b7089]">{paper.ref}</span>
        <PriorityTag p={paper.priority} />
      </div>

      <h3 className="mt-1 font-display text-[17.5px] font-bold leading-[1.08] tracking-wide text-[#132437]">
        {paper.title}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {div && <DivChip div={div} tone="paper" />}
        <KindTag kind={paper.kind} />
        {paper.diverted && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-amberx-500/60 bg-amberx-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#a16207]">
            <I n="alert" className="h-2.5 w-2.5" sw={2.4} />
            Re-routed
          </span>
        )}
      </div>

      {(imgs.length > 0 || pdfs > 0 || geo) && (
        <div className="mt-2.5 flex items-center gap-1.5">
          {imgs.map((a) => (
            <img
              key={a.id}
              src={a.url}
              alt={a.name}
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              className="h-11 w-[52px] rounded-[4px] border border-[#d8cfb4] object-cover bg-[#e4dcc4]"
            />
          ))}
          {pdfs > 0 && (
            <span className="inline-flex h-11 items-center gap-1 rounded-[4px] border border-[#d8cfb4] bg-[#e4dcc4]/60 px-2 font-mono text-[9.5px] font-semibold text-[#5b7089]">
              <I n="file" className="h-3.5 w-3.5" />
              {pdfs} PDF
            </span>
          )}
          {geo && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-[4px] border border-tealx-500/50 bg-tealx-500/10 px-1.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0d9488]">
              <I n="pin" className="h-3 w-3" sw={2.2} />
              GPS
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-3 border-t border-[#d8cfb4] pt-2 font-mono text-[9.5px] uppercase tracking-wider text-[#7b8ba0]">
        <span className="inline-flex items-center gap-1">
          <I n="clock" className="h-3 w-3" />
          {timeAgo(paper.updatedAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <I n="route" className="h-3 w-3" />
          {paper.custody.length} hand-offs
        </span>
        <span className="ml-auto text-[#a1b2c6] opacity-0 transition group-hover:opacity-100">open →</span>
      </div>
    </div>
  );
}

export function Board() {
  const { user, ui, visiblePapers, setDivFilter, openDrawer, moveStage, canEdit, setNewOpen } = useStore();
  const [over, setOver] = useState<Stage | null>(null);
  const [scope, setScope] = useState<'queue' | 'trail'>('queue');

  const isSup = user?.role !== 'division';
  const myDiv = user?.divisionId ? divById(user.divisionId) : undefined;

  const filtered = useMemo(() => {
    const q = ui.search.trim().toLowerCase();
    return visiblePapers.filter((p) => {
      if (!isSup && scope === 'queue' && p.divisionId !== user?.divisionId) return false;
      if (isSup && ui.divFilter !== 'all' && p.divisionId !== ui.divFilter) return false;
      if (!q) return true;
      const hay = `${p.ref} ${p.title} ${p.origin} ${divById(p.divisionId)?.name ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [visiblePapers, ui.search, ui.divFilter, isSup, scope, user]);

  const byStage = (s: Stage) => filtered.filter((p) => p.stage === s);

  const drop = (stage: Stage, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setOver(null);
    if (id) moveStage(id, stage);
  };

  return (
    <div>
      {/* control strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isSup ? (
          <>
            <button
              onClick={() => setDivFilter('all')}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition ${
                ui.divFilter === 'all'
                  ? 'border-flare-500 bg-flare-500/15 text-flare-400'
                  : 'border-ink-600 bg-ink-850 text-mist-400 hover:text-mist-100'
              }`}
            >
              All divisions
            </button>
            {[...DIVISIONS, INSPECTORATE].map((d) => (
              <button
                key={d.id}
                onClick={() => setDivFilter(d.id === ui.divFilter ? 'all' : d.id)}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition ${
                  ui.divFilter === d.id
                    ? d.id === INSPECTORATE.id
                      ? 'border-tealx-500 bg-tealx-500/12 text-tealx-400'
                      : 'border-cyanx-500 bg-cyanx-500/12 text-cyanx-400'
                    : 'border-ink-600 bg-ink-850 text-mist-400 hover:text-mist-100'
                }`}
                title={d.name}
              >
                {d.code}
              </button>
            ))}
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-md border border-ink-600 bg-ink-850 px-3 py-1.5 text-[12px] font-semibold text-mist-200">
              <span className="h-1.5 w-1.5 rounded-full bg-flare-500" />
              {myDiv?.name}
            </span>
            <button
              onClick={() => setScope('queue')}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition ${
                scope === 'queue' ? 'border-flare-500 bg-flare-500/15 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-400'
              }`}
            >
              In my queue
            </button>
            <button
              onClick={() => setScope('trail')}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition ${
                scope === 'trail' ? 'border-cyanx-500 bg-cyanx-500/12 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-400'
              }`}
            >
              Everything through my desk
            </button>
          </>
        )}

        <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500 md:block">
          {filtered.length} paper{filtered.length === 1 ? '' : 's'} in view · drag cards across stages
        </span>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <I n="plus" className="h-4 w-4" sw={2.2} />
          Log paperwork
        </button>
      </div>

      {/* columns */}
      <div className="scroll-slim -mx-1 overflow-x-auto px-1 pb-4">
        <div className="grid min-w-[1120px] grid-cols-5 gap-3">
          {STAGES.map((s, si) => {
            const list = byStage(s.id);
            const isOver = over === s.id;
            return (
              <section
                key={s.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setOver(s.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
                }}
                onDrop={(e) => drop(s.id, e)}
                className={`anim-fade-up flex min-h-[420px] flex-col rounded-lg border transition-all duration-200 ${
                  isOver ? 'border-cyanx-500/70 bg-cyanx-500/[0.06] shadow-[0_0_0_3px_rgba(86,200,240,0.12)]' : 'border-ink-700/70 bg-ink-900/55'
                }`}
                style={{ animationDelay: `${si * 60}ms` }}
              >
                <div className="relative rounded-t-lg border-b border-ink-700/60 px-3 pb-2.5 pt-3">
                  <span className="absolute inset-x-0 top-0 h-[2.5px] rounded-t-lg" style={{ background: s.color }} />
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}88` }} />
                    <h3 className="font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">{s.label}</h3>
                    <span className="ml-auto rounded bg-ink-700/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-mist-200 tabular">
                      {list.length}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">{s.hint}</p>
                </div>

                <div className="scroll-slim flex flex-1 flex-col gap-2.5 overflow-y-auto p-2.5" style={{ maxHeight: 'calc(100vh - 290px)' }}>
                  {list.map((p, i) => (
                    <div key={p.id} className="anim-fade-up" style={{ animationDelay: `${i * 45}ms` }}>
                      <Card paper={p} draggable={canEdit(p)} onOpen={() => openDrawer(p.id)} />
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div
                      className={`flex flex-1 items-center justify-center rounded-md border border-dashed px-3 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                        isOver ? 'border-cyanx-500/60 text-cyanx-400' : 'border-ink-600 text-mist-600'
                      }`}
                    >
                      {isOver ? 'Release to file here' : 'Tray is clear'}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
