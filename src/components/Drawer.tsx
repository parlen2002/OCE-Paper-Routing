import React, { useEffect, useRef, useState } from 'react';
import type { Attachment, Custody, Kind, Paper, Priority, Stage } from '../lib/core';
import { CROSS_UNITS, DESKS, DIVISIONS, KINDS, PRIORITIES, STAGES, buildAttachments, divById, fmtCoord, fmtDT, fmtPct, geobrgyKey, mapsLink, osmEmbed, timeAgo } from '../lib/core';
import { useStore } from '../lib/store';
import { I, DivChip, KindTag, PriorityTag, ProgressBar, SearchSelect, Section, StageChip } from './ui';

export function DocDrawer() {
  const store = useStore();
  const { db, me, ui, closeDrawer, moveStage, routePaperMulti, addNote, canEdit, setViewer, deletePaper, updatePaper, ackPaper, myUnitId, assignPaper, submitToHead, returnToEmployee, addAttachments, removeAttachment, setProgress, setReportOpen } = store;
  const paper = ui.drawerId ? db.papers.find((p) => p.id === ui.drawerId) : null;

  const [remark, setRemark] = useState('');
  const [noteText, setNoteText] = useState('');
  const [forwardSel, setForwardSel] = useState<string[]>([]);
  const [confirmRoute, setConfirmRoute] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Attachment | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRemark(''); setNoteText(''); setForwardSel([]); setConfirmRoute(false); setConfirmRemove(null); setEditOpen(false); setDelOpen(false); }, [ui.drawerId]);

  if (!paper || !me) return null;

  const editable = canEdit(paper);
  const isField = me.role === 'employee' || me.role === 'joborder';
  const div = divById(paper.divisionId);
  const intended = divById(paper.intendedId);
  const pct = paper.progress ?? (paper.stage === 'completed' ? 100 : 0);

  /* overdue — unfinished paper whose deadline has passed */
  const isOverdue = paper.dueAt != null && paper.dueAt < Date.now() && paper.stage !== 'completed';
  const daysOverdue = isOverdue ? Math.max(1, Math.ceil((Date.now() - (paper.dueAt ?? Date.now())) / 864e5)) : 0;
  const hoursOverdue = isOverdue ? Math.max(1, Math.floor((Date.now() - (paper.dueAt ?? Date.now())) / 36e5)) : 0;

  /* route path — every desk the paper physically touched */
  const path: { id: string; at: number; by: string }[] = [];
  const custodySorted = [...paper.custody].sort((a, b) => a.at - b.at);
  for (const e of custodySorted) {
    if ((e.action === 'created' || e.action === 'routed') && e.toDivisionId) {
      if (e.fromDivisionId && (path.length === 0 || path[path.length - 1].id !== e.fromDivisionId)) {
        path.push({ id: e.fromDivisionId, at: e.at, by: e.byName });
      }
      if (path[path.length - 1]?.id !== e.toDivisionId) path.push({ id: e.toDivisionId, at: e.at, by: e.byName });
    }
  }
  if (path[path.length - 1]?.id !== paper.divisionId) path.push({ id: paper.divisionId, at: paper.updatedAt, by: '' });

  /* desks the paper passed through (everything except the current holder) + where it was logged */
  const hops = path.slice(0, -1);
  const createdEntry = custodySorted.find((e) => e.action === 'created');
  const originDivId = createdEntry?.fromDivisionId ?? createdEntry?.toDivisionId ?? paper.divisionId;
  const originDiv = divById(originDivId);

  const receipts = custodySorted.filter((e) => e.action === 'received');
  const pendingDesks = ((paper.recipientIds ?? []).filter((r) => !(paper.receivedBy ?? []).includes(r)));
  const iAmAddressee = !!myUnitId && (paper.recipientIds ?? []).includes(myUnitId) && !(paper.receivedBy ?? []).includes(myUnitId);

  const doMove = (s: Stage) => { if (editable) moveStage(paper.id, s, remark || undefined); setRemark(''); };
  const doForward = () => {
    if (!editable || forwardSel.length === 0) return;
    setConfirmRoute(true);
  };
  const confirmForward = () => {
    routePaperMulti(paper.id, forwardSel, remark || undefined);
    setForwardSel([]); setConfirmRoute(false); setRemark('');
  };
  const toggleForward = (id: string) => setForwardSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const pics = (paper.assignees ?? []).map((id) => db.users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => !!u);
  const iAmPic = isField && (paper.assignees ?? []).includes(me.id);
  const roster = db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && u.divisionId === paper.divisionId && u.status === 'active');
  const canAssignRole = me.role === 'admin' || me.role === 'supervisor' || me.role === 'division' || me.role === 'moderator' || me.role === 'operator';
  const togglePic = (id: string) => {
    const cur = paper.assignees ?? [];
    assignPaper(paper.id, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const geo = paper.attachments.find((a) => a.geotagged && a.lat != null && a.lng != null);

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-ink-950/70 backdrop-blur-[2px]" onClick={closeDrawer} />
      {/* Width adapts to the viewport: the full 1100px when maximized, and it never
          encroaches on the 228px side navigation on smaller windows. */}
      <aside className="anim-pop fixed inset-y-0 right-0 flex w-[max(320px,min(1100px,calc(100vw-252px)))] flex-col border-l border-ink-600 bg-ink-900 shadow-[-40px_0_90px_-30px_rgba(0,0,0,0.9)]">
        {/* header */}
        <div className="border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-cyanx-400">{paper.ref}</span>
            <StageChip stage={paper.stage} />
            <KindTag kind={paper.kind} />
            {(me.role === 'admin' || me.role === 'moderator') && (
              <span className="ml-auto flex items-center gap-1.5">
                <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-300 transition hover:border-cyanx-500/60 hover:text-cyanx-400" title="Edit this board entry">
                  <I n="wrench" className="h-3 w-3" sw={2.2} /> Edit
                </button>
                <button onClick={() => setDelOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-300 transition hover:border-redx-500/60 hover:bg-redx-500/10 hover:text-redx-400" title="Delete this board entry">
                  <I n="trash" className="h-3 w-3" sw={2.2} /> Delete
                </button>
              </span>
            )}
            <button onClick={() => setReportOpen(true, { paperId: paper.id })} className={`${me.role === 'admin' || me.role === 'moderator' ? '' : 'ml-auto '}inline-flex items-center gap-1.5 rounded-md border border-flare-500/50 bg-flare-500/10 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-flare-400 transition hover:bg-flare-500/20`} title="Print the full paperwork record">
              <I n="printer" className="h-3 w-3" sw={2.2} /> Print paperwork
            </button>
            <button onClick={closeDrawer} className={`${me.role === 'admin' || me.role === 'moderator' ? 'ml-1.5' : 'ml-auto'} rounded p-1.5 text-mist-400 transition hover:bg-ink-700 hover:text-mist-50`} title="Close (Esc)">
              <I n="x" className="h-4 w-4" />
            </button>
          </div>
          <h2 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-wide text-mist-50">{paper.title}</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
            {KINDS[paper.kind].label} · {paper.origin} · logged by {paper.byName} · {fmtDT(paper.createdAt)}
            {paper.dueAt ? ` · due ${fmtDT(paper.dueAt)}` : ''}
          </p>
        </div>

        <div className="scroll-slim flex-1 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="space-y-5">
          {/* route sheet */}
          <Section title="Route sheet — where it has gone" icon="route">
            <div className="flex flex-wrap items-center gap-1.5">
              {path.map((h, i) => {
                const d = divById(h.id);
                const here = i === path.length - 1;
                return (
                  <span key={`${h.id}-${i}`} className="flex items-center gap-1.5">
                    <span
                      title={here ? `Current holder · received via ${h.by || 'transmission'}` : `${d?.name ?? h.id} · transmitted by ${h.by || '—'} · ${fmtDT(h.at)}`}
                      className={`rounded-sm border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${here ? 'anim-barlive border-flare-500 bg-flare-500/15 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-300 hover:border-cyanx-500/60'}`}>
                      {d?.code ?? h.id}{here ? ' · NOW HERE' : ''}
                    </span>
                    {i < path.length - 1 && <I n="chevR" className="h-3 w-3 text-mist-600" sw={2.6} />}
                  </span>
                );
              })}
            </div>
            {/* routing stamps — always complete, always printable */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-mist-600">Routing stamps</span>
              <span className="stamp border-cyanx-500/80 px-2 py-0.5 text-[9.5px] text-cyanx-400" title={`Logged by ${paper.byName} · ${fmtDT(paper.createdAt)}`}>
                {originDiv?.code ?? 'OCE'} · logged
              </span>
              {hops.slice(0, -1).map((h, i) => (
                <span key={`hop-${h.id}-${i}`} className="stamp border-mist-400/60 px-2 py-0.5 text-[9.5px] text-mist-300" title={h.by ? `Transmitted by ${h.by}${h.at ? ` · ${fmtDT(h.at)}` : ''}` : undefined}>
                  {divById(h.id)?.code ?? h.id} · passed
                </span>
              ))}
              {receipts.map((r) => (
                <span key={r.id} className="anim-pop stamp border-greenx-500 px-2 py-0.5 text-[9.5px] text-greenx-500" title={`Received · ${r.byName} · ${fmtDT(r.at)}`}>
                  {divById(r.toDivisionId!)?.code ?? r.toDivisionId} · received
                </span>
              ))}
              {pendingDesks.map((rid) => (
                <span key={rid} className="stamp border-dashed border-amberx-500/70 px-2 py-0.5 text-[9.5px] text-amberx-400" title="Awaiting this desk's receipt stamp">
                  {divById(rid)?.code ?? rid} · pending
                </span>
              ))}
              <span className="stamp border-flare-500/80 px-2 py-0.5 text-[9.5px] text-flare-400" title={`Current holder${paper.diverted ? ' · re-routed from ' + (intended?.code ?? '') : ''}`}>
                {div?.code ?? paper.divisionId} · now here
              </span>
            </div>
            {iAmAddressee && paper.stage !== 'completed' && (
              <button onClick={() => ackPaper(paper.id)} className="btn btn-primary mt-3 w-full justify-center">
                <I n="checkc" className="h-4 w-4" sw={2} /> Receive — stamp {divById(myUnitId!)?.code}
              </button>
            )}
            {paper.diverted && (
              <p className="mt-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amberx-400">
                <I n="alert" className="h-3.5 w-3.5" sw={2} /> Re-routed — intended recipient was {intended?.code}
              </p>
            )}
          </Section>

          {/* completion progress */}
          <Section title={`Completion rate · ${fmtPct(pct)}%`} icon="pulse">
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} step={0.5} value={pct}
                disabled={!editable}
                onChange={(e) => setProgress(paper.id, Number(e.target.value))}
                onPointerUp={(e) => setProgress(paper.id, Number((e.target as HTMLInputElement).value))}
                className="range-teal flex-1 accent-tealx-500"
                title="Drag in half-percent steps"
              />
              <span className="w-16 text-right font-display text-[24px] font-bold tabular" style={{ color: pct >= 100 ? '#45d483' : pct >= 50 ? '#2dd4bf' : pct >= 25 ? '#f5b924' : '#ff8a4c' }}>{fmtPct(pct)}%</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              {[0, 25, 50, 75, 100].map((v) => {
                const blocked = isField && v === 100;
                const on = Math.abs(pct - v) < 0.25;
                return (
                  <button
                    key={v}
                    disabled={!editable || blocked}
                    onClick={() => setProgress(paper.id, v)}
                    title={blocked ? 'Completion is verified by the division head — submit for verification instead' : `Set to ${v}%`}
                    className={`flex-1 rounded-md border px-2 py-1.5 font-mono text-[10.5px] font-bold tabular transition active:scale-[0.96] ${
                      on
                        ? v >= 100 ? 'border-greenx-500/70 bg-greenx-500/15 text-greenx-500' : 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400'
                        : blocked
                          ? 'cursor-not-allowed border-ink-700 bg-ink-850 text-mist-600'
                          : 'border-ink-600 bg-ink-850 text-mist-300 hover:border-tealx-500/50 hover:text-tealx-400'
                    }`}
                  >
                    {v}%
                  </button>
                );
              })}
            </div>
            <div className="mt-2"><ProgressBar value={pct} /></div>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">
              {paper.kind === 'work-order' ? 'Work order — tracked completion for the field report' : 'Optional tracking for this document kind'}
              {' · half-percent steps'}
              {isField && ' · completion (100%) is verified by the division head'}
            </p>
          </Section>

          {/* persons-in-charge */}
          {(canAssignRole || pics.length > 0) && (
            <Section title={`Persons-in-charge · ${pics.length}`} icon="users">
              {canAssignRole ? (
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {roster.map((e) => {
                      const on = (paper.assignees ?? []).includes(e.id);
                      return (
                        <button key={e.id} type="button" onClick={() => togglePic(e.id)} title={`${e.name} — ${e.title}`}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] ${on ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-tealx-500/40 hover:text-mist-200'}`}>
                          {on && <I n="check" className="h-3 w-3" sw={2.6} />}
                          {e.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                          <span className={`rounded-sm px-1 py-px text-[7.5px] ${e.role === 'joborder' ? 'bg-amberx-500/15 text-amberx-400' : 'bg-tealx-500/12 text-tealx-400'}`}>{e.role === 'joborder' ? 'JO' : 'EMP'}</span>
                        </button>
                      );
                    })}
                    {roster.length === 0 && (
                      <p className="px-1 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">No active personnel in {div?.code ?? 'this desk'}</p>
                    )}
                  </div>
                  <span className="mt-1.5 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">Multiple persons-in-charge allowed — each tracks this work order on their personal board</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {pics.map((p) => (
                    <span key={p.id} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${p.id === me.id ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-300'}`}>
                      <I n="users" className="h-3 w-3" sw={2} />
                      {p.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                      {p.id === me.id && <span className="rounded-sm bg-tealx-500/20 px-1 py-px text-[7.5px]">you</span>}
                    </span>
                  ))}
                </div>
              )}

              {paper.pendingHeadReview && paper.stage !== 'completed' && (
                <div className="mt-3 rounded-md border border-amberx-500/45 bg-amberx-500/[0.07] px-3 py-2.5">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-amberx-400">
                    <I n="shield" className="h-3.5 w-3.5 shrink-0" sw={2} /> Submitted by {pics.map((p) => p.name).join(', ') || 'the persons-in-charge'} — awaiting division head verification
                  </p>
                  {canAssignRole && !isField && (
                    <button onClick={() => returnToEmployee(paper.id)} className="btn btn-ghost mt-2 px-3 py-1.5 text-[11px]">
                      <I n="history" className="h-3.5 w-3.5" sw={2.2} /> Return to employee
                    </button>
                  )}
                </div>
              )}

              {iAmPic && !paper.pendingHeadReview && paper.stage !== 'completed' && (
                <button onClick={() => submitToHead(paper.id)} className="btn btn-primary mt-3 w-full justify-center">
                  <I n="send" className="h-4 w-4" sw={2} /> Submit to division head for verification
                </button>
              )}
            </Section>
          )}

          {/* move / forward */}
          <Section title="Move this paper" icon="send">
            <div className="rounded-lg border border-ink-700 bg-ink-850/70 p-3.5">
              <input className="field mb-2.5 font-mono text-[11.5px]" placeholder="Optional remark for the custody trail…" value={remark} onChange={(e) => setRemark(e.target.value)} />
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Move to stage</span>
                  <SearchSelect
                    value={paper.stage}
                    onChange={(v) => doMove(v as Stage)}
                    disabled={!editable}
                    width="w-full"
                    options={STAGES.filter((s) => !(isField && s.id === 'completed')).map((s) => ({
                      value: s.id, label: s.label, sub: isField && s.id === 'verification' ? 'final stage before head verification' : s.hint,
                    }))}
                  />
                </label>
                <div>
                  <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Forward / re-route — desks</span>
                  <div className={`max-h-28 overflow-y-auto rounded-md border border-ink-700 bg-ink-950/40 p-1.5 ${!editable || isField ? 'opacity-50' : ''}`}>
                    {isField ? (
                      <p className="px-1.5 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">Routing is done by your division head</p>
                    ) : (
                      [...DESKS, ...DIVISIONS, ...CROSS_UNITS].filter((d) => d.id !== paper.divisionId).map((d) => {
                        const on = forwardSel.includes(d.id);
                        return (
                          <button key={d.id} type="button" disabled={!editable} onClick={() => toggleForward(d.id)}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-[10px] font-bold uppercase tracking-wider transition ${on ? 'bg-cyanx-500/15 text-cyanx-400' : 'text-mist-400 hover:bg-ink-800 hover:text-mist-200'}`}>
                            <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${on ? 'border-cyanx-500 bg-cyanx-500 text-ink-950' : 'border-ink-600'}`}>
                              {on && <I n="check" className="h-2 w-2" sw={3.4} />}
                            </span>
                            {d.code} <span className="truncate font-body text-[10px] font-medium normal-case tracking-normal text-mist-500">{d.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button className="btn btn-primary" disabled={!editable || isField || forwardSel.length === 0} onClick={doForward}>
                  <I n="send" className="h-4 w-4" sw={2} /> Transmit to {forwardSel.length > 0 ? `${forwardSel.length} desk${forwardSel.length > 1 ? 's' : ''}` : '…'}
                </button>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
                  {forwardSel.length > 1 ? 'Becomes a circulation — each desk acknowledges receipt' : forwardSel.length === 1 ? 'That desk takes over the paper' : 'Tick one or many desks'}
                </span>
              </div>
            </div>
          </Section>

          </div>
          <div className="space-y-5">
          {/* evidence */}
          <Section title={`Evidence & location · ${paper.attachments.length}`} icon="cam">
            {geo && (
              <div className="mb-3 overflow-hidden rounded-lg border border-ink-700">
                <iframe title="Site location" src={osmEmbed(geo.lat!, geo.lng!)} className="h-44 w-full" loading="lazy" />
                <div className="flex items-center gap-2 bg-ink-850 px-3 py-2">
                  <I n="pin" className="h-3.5 w-3.5 text-tealx-400" sw={2.2} />
                  <span className="font-mono text-[10px] text-mist-300">{fmtCoord(geo.lat!, geo.lng!)}</span>
                  {db.geobrgy?.[geobrgyKey(geo.lat!, geo.lng!)] && (
                    <span className="rounded-sm border border-amberx-500/40 bg-amberx-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amberx-400">
                      {db.geobrgy[geobrgyKey(geo.lat!, geo.lng!)]}
                    </span>
                  )}
                  <a href={mapsLink(geo.lat!, geo.lng!)} target="_blank" rel="noreferrer" className="ml-auto font-mono text-[10px] font-bold uppercase tracking-wider text-cyanx-400 hover:text-cyanx-300">Open in Maps ↗</a>
                </div>
              </div>
            )}

            {paper.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {paper.attachments.map((a) => (
                  <div key={a.id} className="overflow-hidden rounded-lg border border-ink-700 bg-ink-850/70">
                    {a.kind === 'image' ? (
                      <button className="group relative block h-28 w-full" onClick={() => setViewer({ docId: paper.id, attId: a.id })} title="Open viewer">
                        <img src={a.url} alt={a.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                      </button>
                    ) : (
                      <button className="flex h-28 w-full items-center justify-center bg-flare-500/[0.06]" onClick={() => setViewer({ docId: paper.id, attId: a.id })} title="Open PDF">
                        <span className="flex flex-col items-center gap-1 text-flare-400"><I n="file" className="h-7 w-7" sw={1.4} /><span className="font-mono text-[9.5px] uppercase tracking-widest text-mist-400">PDF — click to view</span></span>
                      </button>
                    )}
                    <div className="px-2.5 py-2">
                      <p className="truncate font-mono text-[10.5px] font-semibold text-mist-200" title={a.name}>{a.name}</p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-600">{a.by} · {timeAgo(a.at)}{a.size ? ` · ${a.size}` : ''}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {a.geotagged && a.lat != null && a.lng != null && (
                          <a href={mapsLink(a.lat, a.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-sm bg-tealx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-tealx-400 transition hover:bg-tealx-500/25" title={`Geotagged at ${fmtCoord(a.lat, a.lng)}`}>
                            <I n="pin" className="h-2.5 w-2.5" sw={2.4} /> {fmtCoord(a.lat, a.lng)}
                          </a>
                        )}
                        {!(a.geotagged && a.lat != null && a.lng != null) && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-ink-700/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-500">
                            <I n="pin" className="h-2.5 w-2.5" sw={2.4} /> No geotag
                          </span>
                        )}
                        <a href={a.url} target={a.kind === 'pdf' ? '_blank' : undefined} download={a.name} rel="noreferrer" className="ml-auto inline-flex items-center gap-1 rounded-sm bg-ink-700/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-300 transition hover:text-cyanx-400">
                          <I n="dl" className="h-2.5 w-2.5" sw={2.2} /> Save
                        </a>
                        {editable && (
                          <button onClick={() => setConfirmRemove(a)} title={`Remove ${a.name} from this paper`} className="inline-flex items-center gap-1 rounded-sm bg-ink-700/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-500 transition hover:bg-redx-500/15 hover:text-redx-400">
                            <I n="trash" className="h-2.5 w-2.5" sw={2.2} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editable && <AttachControl paper={paper} fileRef={fileRef} onAdd={(atts) => addAttachments(paper.id, atts)} />}
          </Section>

          {/* chain of custody */}
          <Section title="Chain of custody" icon="history">
            <ol className="relative space-y-3 border-l border-ink-700 pl-4">
              {custodySorted.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-ink-900" style={{ background: e.action === 'routed' ? '#ff8a4c' : e.action === 'stage' ? '#f5b924' : e.action === 'received' ? '#45d483' : e.action === 'attachment' ? '#2dd4bf' : '#56c8f0' }} />
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">{fmtDT(e.at)}</p>
                  <p className="text-[12.5px] leading-snug text-mist-200"><b className="text-mist-100">{e.byName}</b> — {e.text}</p>
                </li>
              ))}
            </ol>
            {editable && (
              <div className="mt-4 flex gap-2">
                <input className="field font-mono text-[11.5px]" placeholder="Add a remark to the custody trail…" value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && noteText.trim()) { addNote(paper.id, noteText); setNoteText(''); } }} />
                <button className="btn btn-ghost shrink-0" disabled={!noteText.trim()} onClick={() => { addNote(paper.id, noteText); setNoteText(''); }}>
                  <I n="note" className="h-4 w-4" sw={2} /> Add
                </button>
              </div>
            )}
          </Section>
          </div>
          </div>
        </div>
      </aside>

      {/* confirm route */}
      {confirmRoute && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={() => setConfirmRoute(false)} />
          <div className="anim-pop relative w-full max-w-md rounded-xl border border-cyanx-500/40 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-cyanx-400">Confirm transmission</p>
            <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase leading-tight tracking-wide text-mist-50">Route {paper.ref}?</h3>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="rounded-sm border border-ink-600 bg-ink-850 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-mist-300">{div?.code}</span>
              <I n="chevR" className="h-3.5 w-3.5 text-mist-500" sw={2.4} />
              {forwardSel.map((t) => (
                <span key={t} className="rounded-sm border border-cyanx-500/60 bg-cyanx-500/12 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyanx-400">{divById(t)?.code ?? t}</span>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
              {forwardSel.length === 1
                ? `${divById(forwardSel[0])?.name ?? forwardSel[0]} takes over the paper and it lands in their Received tray.`
                : `The paper becomes a circulation: ${divById(forwardSel[0])?.code} is the primary holder and every other desk acknowledges receipt.`}
              {remark.trim() && ' Your remark will be stamped into the custody trail.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setConfirmRoute(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmForward}><I n="send" className="h-4 w-4" sw={2} /> Confirm & transmit</button>
            </div>
          </div>
        </div>
      )}

      {/* confirm remove attachment */}
      {confirmRemove && (
        <ConfirmRemoveFileModal paper={paper} att={confirmRemove} lastGeotag={confirmRemove.geotagged && paper.attachments.filter((a) => a.geotagged).length === 1}
          onClose={() => setConfirmRemove(null)}
          onConfirm={() => { removeAttachment(paper.id, confirmRemove.id); setConfirmRemove(null); }} />
      )}

      {editOpen && <EditPaperModal paper={paper} onClose={() => setEditOpen(false)} onSave={(patch) => { updatePaper(paper.id, patch); setEditOpen(false); }} />}

      {delOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={() => setDelOpen(false)} />
          <div className="anim-pop relative w-full max-w-md rounded-xl border border-redx-500/45 bg-ink-900 p-6">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-redx-400">Confirm — delete board entry</p>
            <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Delete {paper.ref}?</h3>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
              “{paper.title}” and its entire custody trail will be removed from the board. The deletion is recorded in the system log under your name.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setDelOpen(false)}>Keep paper</button>
              <button className="btn border border-redx-500/60 bg-redx-500/15 text-redx-400 hover:bg-redx-500/25" onClick={() => deletePaper(paper.id)}>
                <I n="trash" className="h-4 w-4" sw={2} /> Delete entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function AttachControl({ paper, fileRef, onAdd }: { paper: Paper; fileRef: React.RefObject<HTMLInputElement>; onAdd: (atts: Attachment[]) => void }) {
  const { me, pushToast } = useStore();
  const [staged, setStaged] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0 || !me) return;
    setBusy(true);
    const { atts, skipped } = await buildAttachments(files, me.name);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    setStaged((s) => [...s, ...atts]);
    if (skipped.length > 0) pushToast('warn', `Skipped — ${skipped.join('; ')}`);
  };

  return (
    <div className="mt-3">
      <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => void pick(e.target.files)} />
      <button onClick={() => fileRef.current?.click()} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-600 bg-ink-950/40 px-3 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-mist-500 transition hover:border-cyanx-500/60 hover:text-cyanx-400">
        <I n="cam" className="h-4 w-4" /> {busy ? 'Reading EXIF geotags…' : 'Add JPG / PDF evidence (geotagged photos are mapped)'}
      </button>

      {staged.length > 0 && (
        <div className="anim-pop mt-2.5 rounded-lg border border-ink-600 bg-ink-850/70 p-2.5">
          <ul className="space-y-1.5">
            {staged.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 rounded-md border border-ink-700 bg-ink-900 px-2.5 py-2">
                {a.kind === 'image' ? (
                  <img src={a.url} alt={a.name} className="h-9 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded bg-flare-500/12 text-flare-400"><I n="file" className="h-4 w-4" sw={1.6} /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px] font-semibold text-mist-200">{a.name}</span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-600">{a.kind}{a.size ? ` · ${a.size}` : ''}{a.geotagged ? ' · geotagged' : ''}</span>
                </span>
                <button onClick={() => setStaged((s) => s.filter((x) => x.id !== a.id))} className="rounded p-1 text-mist-500 transition hover:bg-ink-700 hover:text-redx-400" title="Discard file">
                  <I n="x" className="h-3.5 w-3.5" sw={2.2} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 flex justify-end gap-2">
            <button className="btn btn-ghost py-1.5 text-[11.5px]" onClick={() => setStaged([])}>Discard all</button>
            <button className="btn btn-primary py-1.5 text-[11.5px]" onClick={() => setConfirming(true)}>
              <I n="check" className="h-3.5 w-3.5" sw={2.4} /> Save {staged.length} file{staged.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={() => setConfirming(false)} />
          <div className="anim-pop relative w-full max-w-md rounded-xl border border-tealx-500/40 bg-ink-900 p-6">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-tealx-400">Confirm & attach</p>
            <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase leading-tight tracking-wide text-mist-50">Attach {staged.length} file{staged.length > 1 ? 's' : ''}?</h3>
            <ul className="mt-3 space-y-1">
              {staged.map((a) => (
                <li key={a.id} className="flex items-center gap-2 font-mono text-[11px] text-mist-300">
                  <I n={a.kind === 'image' ? 'cam' : 'file'} className="h-3.5 w-3.5 shrink-0 text-cyanx-400" sw={2} />
                  <span className="truncate">{a.name}</span>
                  {a.geotagged && <span className="shrink-0 rounded-sm bg-tealx-500/12 px-1 py-px text-[8.5px] font-bold uppercase text-tealx-400">geotagged</span>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-mist-400">The files will be added to {paper.ref} and stamped into the chain of custody.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { onAdd(staged); setStaged([]); setConfirming(false); }}>
                <I n="check" className="h-4 w-4" sw={2.2} /> Attach files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmRemoveFileModal({ paper, att, lastGeotag, onClose, onConfirm }: { paper: Paper; att: Attachment; lastGeotag: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-md rounded-xl border border-redx-500/45 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-redx-500/50 bg-redx-500/12 text-redx-400"><I n="trash" className="h-5 w-5" sw={1.8} /></span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-redx-400">Confirm — remove attachment</p>
            <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Remove this file?</h3>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 p-3">
          {att.kind === 'image' ? (
            <img src={att.url} alt={att.name} className="h-14 w-16 shrink-0 rounded object-cover" />
          ) : (
            <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded bg-flare-500/12 text-flare-400"><I n="file" className="h-6 w-6" sw={1.4} /></span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-mist-100" title={att.name}>{att.name}</p>
            <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-500">{att.kind} · {paper.ref}{att.geotagged ? ' · geotagged' : ''}</p>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">The file will be detached from {paper.ref} and the removal recorded in the chain of custody under your name.</p>
        {lastGeotag && (
          <p className="mt-2 flex items-start gap-2 rounded-md border border-amberx-500/40 bg-amberx-500/10 px-3 py-2 text-[12px] leading-relaxed text-amberx-400">
            <I n="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} /> This is the last geotagged photo — the site map and GPS link will be removed from the paper as well.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Keep file</button>
          <button className="btn border border-redx-500/60 bg-redx-500/15 text-redx-400 hover:bg-redx-500/25" onClick={onConfirm}>
            <I n="trash" className="h-4 w-4" sw={2} /> Remove file
          </button>
        </div>
      </div>
    </div>
  );
}

function EditPaperModal({ paper, onClose, onSave }: { paper: Paper; onClose: () => void; onSave: (patch: Partial<Paper>) => void }) {
  const [title, setTitle] = useState(paper.title);
  const [origin, setOrigin] = useState(paper.origin);
  const [kind, setKind] = useState<Kind>(paper.kind);
  const [priority, setPriority] = useState<Priority>(paper.priority);
  const [due, setDue] = useState(paper.dueAt ? new Date(paper.dueAt).toISOString().slice(0, 10) : '');
  const [remarks, setRemarks] = useState(paper.remarks ?? '');

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-10">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-lg rounded-xl border border-ink-600 bg-ink-900 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cyanx-500/50 bg-cyanx-500/12 text-cyanx-400"><I n="wrench" className="h-5 w-5" sw={1.8} /></span>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-cyanx-400">Edit board entry</p>
            <h3 className="font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">{paper.ref}</h3>
          </div>
          <button onClick={onClose} className="ml-auto rounded-md border border-ink-600 p-2 text-mist-400 transition hover:border-redx-500/60 hover:text-redx-400"><I n="x" className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Title</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Origin</span>
            <input className="field" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Kind</span>
              <SearchSelect value={kind} onChange={(v) => setKind(v as Kind)} width="w-full"
                options={Object.entries(KINDS).map(([k, v]) => ({ value: k, label: v.label, sub: v.short }))} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Priority</span>
              <SearchSelect value={priority} onChange={(v) => setPriority(v as Priority)} width="w-full"
                options={Object.entries(PRIORITIES).map(([k, v]) => ({ value: k, label: v.label }))} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Due date</span>
              <input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Remarks</span>
              <input className="field" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={title.trim().length < 6}
            onClick={() => onSave({ title: title.trim(), origin: origin.trim(), kind, priority, dueAt: due ? new Date(due + 'T17:00:00').getTime() : undefined, remarks: remarks.trim() || undefined })}>
            <I n="check" className="h-4 w-4" sw={2.2} /> Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
