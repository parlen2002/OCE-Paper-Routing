import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import type { Attachment, Kind, Paper, Priority, Stage } from '../lib/core';
import { CROSS_UNITS, DESKS, DIVISIONS, KINDS, PRIORITIES, STAGES, buildAttachments, divById, fmtCoord, mapsLink, osmEmbed, timeAgo, fmtDT } from '../lib/core';
import { I, DivChip, KindTag, PriorityTag, StageChip, Section, ProgressBar } from './ui';

function ConfirmDialog({
  title, kicker, body, confirmLabel, danger, icon, onConfirm, onClose,
}: {
  title: string; kicker: string; body: React.ReactNode; confirmLabel: string; danger?: boolean; icon?: React.ReactNode;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-md rounded-xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]" style={{ borderColor: danger ? 'rgba(244,100,92,0.45)' : undefined }}>
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${danger ? 'border-redx-500/50 bg-redx-500/12 text-redx-400' : 'border-cyanx-500/50 bg-cyanx-500/12 text-cyanx-400'}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className={`font-mono text-[10px] font-medium uppercase tracking-[0.22em] ${danger ? 'text-redx-400' : 'text-cyanx-400'}`}>{kicker}</p>
            <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">{title}</h3>
          </div>
        </div>
        <div className="mt-4 text-[12.5px] leading-relaxed text-mist-400">{body}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'border border-redx-500/60 bg-redx-500/15 text-redx-400 hover:bg-redx-500/25' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Stages files first; commits only after an explicit confirmation dialog. */
function AttachControl({ paperId }: { paperId: string }) {
  const { user, addAttachments, pushToast } = useStore();
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState<Attachment[]>([]);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setBusy(true);
    const { atts, skipped } = await buildAttachments(files, user.name);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    if (atts.length > 0) setStaged((s) => [...s, ...atts]);
    if (skipped.length > 0) pushToast('warn', `Skipped — ${skipped.join('; ')}`);
  };

  const geos = staged.filter((a) => a.geotagged).length;

  return (
    <div className="flex flex-col items-stretch gap-2">
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => void pick(e.target.files)} />
        <button className="btn btn-ghost text-[12px]" onClick={() => inputRef.current?.click()} disabled={busy}>
          <I n="clip" className="h-3.5 w-3.5" /> {busy ? 'Reading files…' : 'Add JPG / PDF'}
        </button>
        {staged.length > 0 && (
          <button className="btn btn-primary text-[12px]" onClick={() => setConfirmAdd(true)}>
            <I n="check" className="h-3.5 w-3.5" sw={2.2} /> Save {staged.length} file{staged.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {staged.length > 0 && (
        <ul className="space-y-1.5 rounded-md border border-cyanx-500/40 bg-cyanx-500/[0.05] p-2">
          {staged.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              {a.kind === 'image' ? (
                <img src={a.url} alt={a.name} className="h-8 w-10 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded bg-flare-500/12 text-flare-400"><I n="file" className="h-4 w-4" sw={1.6} /></span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[10.5px] font-semibold text-mist-200">{a.name}</span>
                <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-600">staged — not yet saved{a.geotagged ? ' · geotagged' : ''}</span>
              </span>
              <button onClick={() => setStaged((s) => s.filter((x) => x.id !== a.id))} className="rounded p-1 text-mist-500 transition hover:text-redx-400" title="Discard this file">
                <I n="x" className="h-3.5 w-3.5" sw={2.2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {confirmAdd && (
        <ConfirmDialog
          kicker="Confirm — add attachments"
          title={`Attach ${staged.length} file${staged.length > 1 ? 's' : ''}?`}
          icon={<I n="clip" className="h-5 w-5" sw={1.8} />}
          confirmLabel="Confirm & attach"
          body={
            <>
              <ul className="space-y-1">
                {staged.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 font-mono text-[11px] text-mist-300">
                    <I n={a.kind === 'image' ? 'cam' : 'file'} className="h-3.5 w-3.5 shrink-0 text-cyanx-400" sw={2} />
                    <span className="truncate">{a.name}</span>
                    {a.geotagged && <span className="ml-auto shrink-0 rounded-sm bg-tealx-500/15 px-1 py-px text-[8.5px] font-bold uppercase text-tealx-400">geotagged</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                The files will be stamped into the chain of custody{geos > 0 ? ` and ${geos} geotagged photo${geos > 1 ? 's' : ''} will be linked to the site map` : ''}.
              </p>
            </>
          }
          onClose={() => setConfirmAdd(false)}
          onConfirm={() => { addAttachments(paperId, staged); setStaged([]); setConfirmAdd(false); }}
        />
      )}
    </div>
  );
}

function EditDocModal({ paper, onClose }: { paper: Paper; onClose: () => void }) {
  const { updatePaper } = useStore();
  const [title, setTitle] = useState(paper.title);
  const [kind, setKind] = useState<Kind>(paper.kind);
  const [priority, setPriority] = useState<Priority>(paper.priority);
  const [origin, setOrigin] = useState(paper.origin);
  const [remarks, setRemarks] = useState(paper.remarks ?? '');
  const [err, setErr] = useState('');

  const save = () => {
    if (title.trim().length < 6) return setErr('Subject must be at least 6 characters.');
    updatePaper(paper.id, { title: title.trim(), kind, priority, origin: origin.trim(), remarks: remarks.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[62] flex items-start justify-center overflow-y-auto p-4 sm:p-10">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-lg rounded-xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-flare-400">Edit board entry · {paper.ref}</p>
        <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Update the record</h3>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Subject *</span>
            <input className="field" value={title} onChange={(e) => { setTitle(e.target.value); setErr(''); }} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Kind</span>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {Object.entries(KINDS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Priority</span>
              <select className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {Object.entries(PRIORITIES).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Origin</span>
            <input className="field" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Remarks</span>
            <textarea className="field" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </label>
          {err && <p className="rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}><I n="check" className="h-4 w-4" sw={2.2} /> Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocDrawer() {
  const store = useStore();
  const {
    db, user, ui, closeDrawer, moveStage, routePaperMulti, addNote, canEdit, setViewer, deletePaper,
    ackPaper, userUnitId, assignPaper, submitToHead, returnToEmployee, employeesOf, removeAttachment,
    setReportOpen, setProgress,
  } = store;

  const paper = useMemo(() => db.papers.find((p) => p.id === ui.drawerId) ?? null, [db.papers, ui.drawerId]);
  const [remark, setRemark] = useState('');
  const [note, setNote] = useState('');
  const [routeSel, setRouteSel] = useState<string[]>([]);
  const [routeConfirm, setRouteConfirm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Attachment | null>(null);
  const [draftPct, setDraftPct] = useState<number | null>(null);

  useEffect(() => {
    setRemark(''); setNote(''); setRouteSel([]); setRouteConfirm(false); setEditOpen(false); setDelOpen(false); setConfirmRemove(null); setDraftPct(null);
  }, [ui.drawerId]);

  if (!paper || !user) return null;

  const div = divById(paper.divisionId);
  const intended = divById(paper.intendedId);
  const editable = canEdit(paper);
  const overdue = paper.dueAt != null && paper.stage !== 'completed' && paper.dueAt < Date.now();
  const geo = paper.attachments.filter((a) => a.geotagged && a.lat != null && a.lng != null);
  const pct = paper.stage === 'completed' ? 100 : paper.progress ?? 0;
  const shownPct = draftPct ?? pct;

  const chrono = [...paper.custody].sort((a, b) => a.at - b.at);
  const path: { id: string; by?: string; at?: number }[] = [];
  for (const e of chrono) {
    if ((e.action === 'created' || e.action === 'routed') && e.toDivisionId) {
      // show the desk it came FROM, then the desk it landed on
      if (e.fromDivisionId && e.fromDivisionId !== e.toDivisionId) {
        const l = path[path.length - 1];
        if (!l || l.id !== e.fromDivisionId) path.push({ id: e.fromDivisionId, by: e.byName, at: e.at });
      }
      const l2 = path[path.length - 1];
      if (!l2 || l2.id !== e.toDivisionId) path.push({ id: e.toDivisionId, by: e.byName, at: e.at });
    }
  }
  if (!path.length || path[path.length - 1].id !== paper.divisionId) path.push({ id: paper.divisionId });

  /** Receipt stamps — desks that pressed Receive, newest information first. */
  const receipts = chrono.filter((e) => e.action === 'received' && e.toDivisionId);
  const recipients = paper.recipientIds ?? [];
  const myDesk = userUnitId;
  const iCanReceive =
    !!myDesk && recipients.includes(myDesk) && !(paper.receivedBy ?? []).includes(myDesk) && paper.stage !== 'completed';

  const trail = [...paper.custody].sort((a, b) => b.at - a.at);
  const pics = (paper.assignees ?? []).map((id) => db.users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => !!u);
  const iAmPic = (user.role === 'employee' || user.role === 'joborder') && (paper.assignees ?? []).includes(user.id);
  const isField = user.role === 'employee' || user.role === 'joborder';
  const lastGeotag = confirmRemove != null && confirmRemove.geotagged && paper.attachments.filter((a) => a.geotagged).length === 1;

  const doMove = (s: Stage) => { moveStage(paper.id, s, remark || undefined); setRemark(''); };
  const toggleRoute = (id: string) => setRouteSel((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  const confirmRoute = () => {
    if (!routeSel.length) return;
    routePaperMulti(paper.id, routeSel, remark || undefined);
    setRemark(''); setRouteSel([]); setRouteConfirm(false);
  };
  const addRemark = () => { if (!note.trim()) return; addNote(paper.id, note); setNote(''); };
  const togglePic = (id: string) => {
    const cur = paper.assignees ?? [];
    assignPaper(paper.id, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]" onClick={closeDrawer} />
      <aside className="anim-pop absolute inset-y-0 right-0 flex w-full max-w-[600px] flex-col border-l border-ink-600 bg-ink-900 shadow-[-40px_0_90px_-30px_rgba(0,0,0,0.9)]">
        <header className="border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-cyanx-400">{paper.ref}</span>
            <StageChip stage={paper.stage} />
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded border border-redx-500/50 bg-redx-500/12 px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-redx-400">
                <I n="alert" className="h-2.5 w-2.5" sw={2.4} /> Overdue
              </span>
            )}
            <button onClick={() => setReportOpen(true, { paperId: paper.id })}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-flare-500/50 bg-flare-500/10 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-flare-400 transition hover:bg-flare-500/20"
              title="Print the full paperwork record — route sheet, custody, evidence & supporting documents">
              <I n="printer" className="h-3 w-3" sw={2.2} /> Print paperwork
            </button>
            {(user.role === 'admin' || user.role === 'moderator') && (
              <span className="flex items-center gap-1.5">
                <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-300 transition hover:border-cyanx-500/60 hover:text-cyanx-400" title="Edit this board entry">
                  <I n="wrench" className="h-3 w-3" sw={2.2} /> Edit
                </button>
                {(user.role === 'admin' || user.role === 'moderator') && (
                  <button onClick={() => setDelOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-300 transition hover:border-redx-500/60 hover:bg-redx-500/10 hover:text-redx-400" title="Administrator / Moderator — delete this board entry">
                    <I n="trash" className="h-3 w-3" sw={2.2} /> Delete
                  </button>
                )}
              </span>
            )}
            <button onClick={closeDrawer} className="rounded p-1.5 text-mist-400 transition hover:bg-ink-700 hover:text-mist-50" title="Close (Esc)">
              <I n="x" className="h-4 w-4" sw={2} />
            </button>
          </div>
          <h2 className="mt-1.5 font-display text-[26px] font-bold leading-[1.05] tracking-wide text-mist-50">{paper.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            {div && <DivChip div={div} />}
            <KindTag kind={paper.kind} />
            <PriorityTag p={paper.priority} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-mist-500">logged {timeAgo(paper.createdAt)} by {paper.byName}</span>
          </div>
        </header>

        <div className="scroll-slim flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* route sheet */}
          <Section title="Route sheet — where it has gone" icon="route">
            <div className="flex flex-wrap items-center gap-1.5">
              {path.map((hop, i) => {
                const d = divById(hop.id);
                const here = i === path.length - 1;
                const tip = here
                  ? `${d?.name ?? hop.id} — current holder${hop.by ? ` · received via ${hop.by}${hop.at ? ' · ' + fmtDT(hop.at) : ''}` : ''}`
                  : `${d?.name ?? hop.id}${hop.by ? ` — transmitted by ${hop.by}${hop.at ? ' · ' + fmtDT(hop.at) : ''}` : ''}`;
                return (
                  <React.Fragment key={`${hop.id}-${i}`}>
                    {i > 0 && <I n="arr" className="h-3 w-3 text-mist-600" sw={2.2} />}
                    <span
                      title={tip}
                      className={`inline-flex cursor-help items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider transition ${here ? 'border-flare-500/70 bg-flare-500/12 text-flare-400' : 'border-ink-600 bg-ink-850 text-mist-300'}`}
                    >
                      {d?.code ?? hop.id}
                      {here && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flare-500" />}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            {/* receipt stamps — updates the moment a desk presses Receive */}
            {recipients.length > 0 && (
              <div className="mt-3 rounded-lg border border-ink-700 bg-ink-950/40 p-3">
                <p className="mb-2 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-mist-500">
                  Receipt stamps {recipients.length > 1 ? `· ${(paper.receivedBy ?? []).length} of ${recipients.length} desks acknowledged` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {recipients.map((rid) => {
                    const d = divById(rid);
                    const ack = receipts.find((e) => e.toDivisionId === rid);
                    if (ack) {
                      return (
                        <span key={rid} title={`${d?.name ?? rid} — received by ${ack.byName} · ${fmtDT(ack.at)}`}
                          className="stamp cursor-help border-greenx-500/60 px-2 py-0.5 text-[9.5px] text-greenx-500">
                          {d?.code ?? rid} · {ack.byName.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]} · {timeAgo(ack.at)}
                        </span>
                      );
                    }
                    if (recipients.length > 1) {
                      return (
                        <span key={rid} className="rounded-sm border border-dashed border-amberx-500/50 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-amberx-400/80">
                          {d?.code ?? rid} pending
                        </span>
                      );
                    }
                    return null;
                  })}
                  {iCanReceive && (
                    <button onClick={() => ackPaper(paper.id)} className="btn btn-primary px-3 py-1.5 text-[11.5px]">
                      <I n="checkc" className="h-3.5 w-3.5" sw={2.2} />
                      Receive — stamp {divById(myDesk!)?.code}
                    </button>
                  )}
                </div>
                {receipts.length === 0 && !iCanReceive && recipients.length === 1 && (
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
                    Awaiting the first receipt stamp from {divById(recipients[0])?.code ?? recipients[0]}
                  </p>
                )}
              </div>
            )}

            {paper.diverted ? (
              <p className="mt-2.5 flex items-start gap-2 rounded-md border border-amberx-500/40 bg-amberx-500/[0.07] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amberx-400">
                <I n="alert" className="mt-0.5 h-3 w-3 shrink-0" sw={2.2} />
                Off intended route — addressed to {intended?.code ?? paper.intendedId}, now held by {div?.code}
              </p>
            ) : (
              intended && (
                <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
                  On route · intended recipient {intended.code} — {intended.name}
                </p>
              )
            )}
          </Section>

          {/* completion progress */}
          <Section title="Completion progress" icon="pulse" right={
            <span className={`font-display text-[24px] font-bold leading-none tabular ${shownPct >= 100 ? 'text-greenx-500' : 'text-tealx-400'}`}>{shownPct}%</span>
          }>
            <div className="rounded-lg border border-ink-700 bg-ink-850/70 p-3.5">
              <ProgressBar pct={shownPct} tone="dark" h={10} />
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range" min={0} max={100} step={1}
                  value={shownPct}
                  disabled={!editable || paper.stage === 'completed'}
                  onChange={(e) => setDraftPct(Number(e.target.value))}
                  onMouseUp={() => { if (draftPct != null) { setProgress(paper.id, draftPct); setDraftPct(null); } }}
                  onTouchEnd={() => { if (draftPct != null) { setProgress(paper.id, draftPct); setDraftPct(null); } }}
                  onBlur={() => { if (draftPct != null) { setProgress(paper.id, draftPct); setDraftPct(null); } }}
                  onKeyUp={(e) => { if (draftPct != null && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { setProgress(paper.id, draftPct); setDraftPct(null); } }}
                  className="range-teal w-full"
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {[0, 25, 50, 75, 100].map((v) => (
                  <button key={v} disabled={!editable || paper.stage === 'completed'}
                    onClick={() => setProgress(paper.id, v)}
                    className={`rounded-sm border px-2 py-1 font-mono text-[9.5px] font-bold tabular transition active:scale-95 ${shownPct === v ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-tealx-500/40 hover:text-mist-200'}`}>
                    {v}%
                  </button>
                ))}
                <span className="ml-auto font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">
                  {paper.stage === 'completed' ? 'Completed — locked at 100%' : paper.kind === 'work-order' ? 'Work order — update as work advances' : 'Optional for memos & others'}
                </span>
              </div>
            </div>
          </Section>

          {/* particulars */}
          <Section title="Particulars" icon="file">
            <dl className="grid gap-x-4 gap-y-2.5 rounded-lg border border-ink-700 bg-ink-850/70 p-3.5 sm:grid-cols-2">
              <div><dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">Origin</dt><dd className="mt-0.5 text-[12.5px] font-semibold text-mist-100">{paper.origin}</dd></div>
              <div><dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">Current holder</dt><dd className="mt-0.5 text-[12.5px] font-semibold text-mist-100">{div?.name ?? '—'}</dd></div>
              <div><dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">Due date</dt><dd className={`mt-0.5 text-[12.5px] font-semibold ${overdue ? 'text-redx-400' : 'text-mist-100'}`}>{paper.dueAt ? fmtDT(paper.dueAt) : 'No deadline set'}</dd></div>
              <div><dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">Addressed to</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1">
                  {(paper.recipientIds ?? [paper.divisionId]).map((rid) => {
                    const d = divById(rid);
                    const acked = (paper.receivedBy ?? []).includes(rid);
                    return d ? (
                      <span key={rid} className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${acked ? 'bg-greenx-500/12 text-greenx-500' : 'bg-ink-700 text-mist-300'}`}>{d.code}{acked ? ' ✓' : ''}</span>
                    ) : null;
                  })}
                </dd>
              </div>
              {paper.remarks && (
                <div className="sm:col-span-2"><dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">Remarks</dt><dd className="mt-0.5 leading-relaxed text-mist-200">{paper.remarks}</dd></div>
              )}
            </dl>
          </Section>

          {/* evidence */}
          <Section title={`Evidence & files · ${paper.attachments.length}`} icon="cam" right={editable ? <AttachControl paperId={paper.id} /> : undefined}>
            {geo.length > 0 && (
              <div className="mb-3 overflow-hidden rounded-lg border border-ink-600">
                <iframe title="Site location map" src={osmEmbed(geo[0].lat!, geo[0].lng!)} className="h-52 w-full border-0" loading="lazy" />
                <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 bg-ink-850 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded bg-tealx-500/12 px-2 py-1 font-mono text-[10px] font-semibold text-tealx-400">
                    <I n="pin" className="h-3 w-3" sw={2.2} /> {fmtCoord(geo[0].lat!, geo[0].lng!)}
                  </span>
                  <a href={mapsLink(geo[0].lat!, geo[0].lng!)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded bg-cyanx-500/12 px-2 py-1 font-mono text-[10px] font-semibold text-cyanx-400 transition hover:bg-cyanx-500/20">
                    Open in Google Maps <I n="ext" className="h-3 w-3" sw={2} />
                  </a>
                </div>
              </div>
            )}

            {paper.attachments.length === 0 && geo.length === 0 && (
              <p className="rounded-md border border-dashed border-ink-600 px-3 py-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-mist-600">
                No files on record — JPG and PDF accepted; geotagged photos get a map link
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {paper.attachments.map((a) => (
                <div key={a.id} className="group overflow-hidden rounded-md border border-ink-700 bg-ink-850">
                  {a.kind === 'image' ? (
                    <button className="block h-32 w-full overflow-hidden" onClick={() => setViewer({ docId: paper.id, attId: a.id })} title="Open in the attachment viewer">
                      <img src={a.url} alt={a.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    </button>
                  ) : (
                    <button className="flex h-32 w-full flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(45deg,rgba(255,107,28,0.05)_0_10px,transparent_10px_20px)] transition hover:bg-[repeating-linear-gradient(45deg,rgba(255,107,28,0.1)_0_10px,transparent_10px_20px)]" onClick={() => setViewer({ docId: paper.id, attId: a.id })} title="Open in the attachment viewer">
                      <span className="text-flare-400"><I n="file" className="h-8 w-8" sw={1.3} /></span>
                      <span className="font-mono text-[9.5px] uppercase tracking-widest text-mist-400">PDF — click to view</span>
                    </button>
                  )}
                  <div className="px-2.5 py-2">
                    <p className="truncate font-mono text-[10.5px] font-semibold text-mist-200" title={a.name}>{a.name}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-600">{a.by} · {timeAgo(a.at)} {a.size ? `· ${a.size}` : ''}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {a.geotagged && a.lat != null && a.lng != null ? (
                        <a href={mapsLink(a.lat, a.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-sm bg-tealx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-tealx-400 transition hover:bg-tealx-500/25" title={`Geotagged at ${fmtCoord(a.lat, a.lng)}`}>
                          <I n="pin" className="h-2.5 w-2.5" sw={2.4} /> {fmtCoord(a.lat, a.lng)}
                        </a>
                      ) : (
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
          </Section>

          {/* persons-in-charge */}
          {(user.role !== 'employee' && user.role !== 'joborder' ? true : pics.length > 0) && (
            <Section title={`Persons-in-charge · ${pics.length}`} icon="users">
              {!isField && user.role !== 'moderator' ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Designate the persons-in-charge · {div?.code ?? ''} roster</span>
                    <span className="ml-auto rounded-sm bg-tealx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold text-tealx-400 tabular">{pics.length} designated</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {employeesOf(paper.divisionId).map((e) => {
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
                    {employeesOf(paper.divisionId).length === 0 && (
                      <p className="px-1 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">No active employees / job-order personnel in this division yet</p>
                    )}
                  </div>
                </div>
              ) : (
                pics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pics.map((p) => (
                      <span key={p.id} title={`${p.name} — ${p.title}`} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${p.id === user.id ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-300'}`}>
                        <I n="users" className="h-3 w-3" sw={2} />
                        {p.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                        {p.id === user.id && <span className="rounded-sm bg-tealx-500/20 px-1 py-px text-[7.5px]">you</span>}
                      </span>
                    ))}
                  </div>
                )
              )}

              {paper.pendingHeadReview && paper.stage !== 'completed' && (
                <div className="mt-2.5 rounded-md border border-amberx-500/45 bg-amberx-500/[0.07] px-3 py-2.5">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-amberx-400">
                    <I n="shield" className="h-3.5 w-3.5 shrink-0" sw={2} />
                    Submitted by {pics.map((p) => p.name).join(', ') || 'the persons-in-charge'} — awaiting division head verification
                  </p>
                  {!isField && !paper.pendingHeadReview ? null : null}
                  {!isField && (
                    <button onClick={() => returnToEmployee(paper.id)} className="btn btn-ghost mt-2 px-3 py-1.5 text-[11px]">
                      <I n="history" className="h-3.5 w-3.5" sw={2.2} /> Return to employee
                    </button>
                  )}
                </div>
              )}

              {iAmPic && !paper.pendingHeadReview && paper.stage !== 'completed' && (
                <button onClick={() => submitToHead(paper.id)} className="btn btn-primary mt-2.5 w-full justify-center">
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
                  <select className="field" value={paper.stage} disabled={!editable} onChange={(e) => doMove(e.target.value as Stage)}>
                    {STAGES.filter((s) => !(isField && s.id === 'completed')).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}{isField && s.id === 'verification' ? ' — final stage before head verification' : ''}</option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">
                      Forward / re-route — tick every desk that should receive it
                    </span>
                    {!isField && (
                      <button
                        type="button"
                        onClick={() => {
                          const others = [...DESKS, ...DIVISIONS, ...CROSS_UNITS].filter((d) => d.id !== paper.divisionId).map((d) => d.id);
                          setRouteSel((r) => (r.length === others.length ? [] : others));
                        }}
                        className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider transition ${
                          routeSel.length > 0
                            ? 'border-flare-500/60 bg-flare-500/12 text-flare-400'
                            : 'border-ink-600 bg-ink-800 text-mist-400 hover:border-flare-500/50 hover:text-flare-400'
                        }`}
                      >
                        <I n="sitemap" className="h-2.5 w-2.5" sw={2.4} /> All desks
                      </button>
                    )}
                    <span className={`ml-auto rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold tabular ${routeSel.length ? 'bg-cyanx-500/12 text-cyanx-400' : 'bg-ink-800 text-mist-600'}`}>
                      {routeSel.length} selected
                    </span>
                  </div>

                  {isField ? (
                    <p className="rounded-md border border-dashed border-ink-600 px-3 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mist-600">
                      — routing is done by your division head —
                    </p>
                  ) : (
                    <>
                      <div className={`rounded-lg border bg-ink-950/40 p-2.5 ${routeConfirm ? 'border-cyanx-500/60' : 'border-ink-600'}`}>
                        <p className="mb-1.5 px-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] text-amberx-400/90">Executive desks</p>
                        <div className="mb-2.5 flex flex-wrap gap-1.5">
                          {DESKS.filter((d) => d.id !== paper.divisionId).map((d) => {
                            const on = routeSel.includes(d.id);
                            return (
                              <button key={d.id} type="button" disabled={!editable} onClick={() => toggleRoute(d.id)} title={`${d.name} — ${d.head}`}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                                  on ? 'border-amberx-500/70 bg-amberx-500/15 text-amberx-400' : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-amberx-500/40 hover:text-mist-200'
                                }`}>
                                {on && <I n="check" className="h-3 w-3" sw={2.6} />} {d.code}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mb-1.5 px-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] text-cyanx-400/90">Divisions & teams</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[...DIVISIONS, ...CROSS_UNITS].filter((d) => d.id !== paper.divisionId).map((d) => {
                            const on = routeSel.includes(d.id);
                            return (
                              <button key={d.id} type="button" disabled={!editable} onClick={() => toggleRoute(d.id)} title={d.name}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                                  on ? 'border-cyanx-500/70 bg-cyanx-500/12 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-cyanx-500/40 hover:text-mist-200'
                                }`}>
                                {on && <I n="check" className="h-3 w-3" sw={2.6} />} {d.code}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
                          {routeSel.length > 1
                            ? `Circulates to ${routeSel.length} desks · first pick holds the paper`
                            : routeSel.length === 1
                              ? 'Single forward · the desk takes over the paper'
                              : 'Pick one or more desks, then transmit'}
                        </p>
                        <button className="btn btn-primary shrink-0" disabled={!routeSel.length || !editable} onClick={() => setRouteConfirm(true)}>
                          <I n="send" className="h-4 w-4" sw={2} />
                          Transmit to {routeSel.length || '—'} desk{routeSel.length === 1 ? '' : 's'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* add remark */}
          <Section title="Add remark" icon="note">
            <div className="flex gap-2">
              <input className="field flex-1" placeholder="Stamp a remark into the chain of custody…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addRemark(); }} />
              <button className="btn btn-ghost" onClick={addRemark} disabled={!note.trim()}><I n="stamp" className="h-4 w-4" sw={1.8} /> Stamp</button>
            </div>
          </Section>

          {/* custody trail */}
          <Section title={`Chain of custody · ${trail.length}`} icon="shield">
            <ol className="scroll-slim max-h-72 space-y-0 overflow-y-auto pr-1">
              {trail.map((e, i) => (
                <li key={e.id} className="relative flex gap-3 pb-4">
                  {i < trail.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-ink-700" />}
                  <span className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${e.action === 'completed' ? 'border-greenx-500 bg-greenx-500/25' : e.action === 'routed' ? 'border-flare-500 bg-flare-500/25' : 'border-cyanx-500 bg-cyanx-500/20'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-mist-200">{e.text}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-600">{e.byName} · {fmtDT(e.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        {editOpen && <EditDocModal paper={paper} onClose={() => setEditOpen(false)} />}
        {delOpen && (
          <ConfirmDialog
            danger kicker="Administrator — destructive action" title={`Delete ${paper.ref}?`}
            icon={<I n="trash" className="h-5 w-5" sw={1.8} />} confirmLabel="Delete permanently"
            body={
              <>
                <p className="font-semibold text-mist-200">{paper.title}</p>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
                  holder: {div?.code ?? '—'} · {paper.custody.length} custody entries · {paper.attachments.length} attachment(s)
                </p>
                <p className="mt-2">This removes the entry from the tracker board, the register and every dashboard. The deletion is recorded in the system log under your name.</p>
              </>
            }
            onClose={() => setDelOpen(false)}
            onConfirm={() => deletePaper(paper.id)}
          />
        )}
        {routeConfirm && routeSel.length > 0 && (
          <ConfirmDialog
            kicker="Confirm transmission"
            title={`Re-route this paper${routeSel.length > 1 ? ` to ${routeSel.length} desks` : ''}?`}
            icon={<I n="send" className="h-5 w-5" sw={1.8} />}
            confirmLabel={`Transmit to ${routeSel.length} desk${routeSel.length === 1 ? '' : 's'}`}
            onConfirm={confirmRoute}
            onClose={() => setRouteConfirm(false)}
            body={
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-ink-600 bg-ink-850 p-3">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-mist-300">
                    {div?.code ?? paper.divisionId}
                  </span>
                  <I n="arr" className="h-3.5 w-3.5 shrink-0 text-flare-400" sw={2.4} />
                  <span className="flex flex-wrap gap-1.5">
                    {routeSel.map((rid) => {
                      const d = divById(rid);
                      const isDesk = rid.startsWith('desk-');
                      return (
                        <span key={rid}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                            isDesk ? 'border-amberx-500/70 bg-amberx-500/15 text-amberx-400' : 'border-cyanx-500/70 bg-cyanx-500/12 text-cyanx-400'
                          }`}>
                          <I n="check" className="h-3 w-3" sw={2.6} /> {d?.code ?? rid}
                        </span>
                      );
                    })}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-mist-400">
                  {routeSel.length > 1
                    ? `The paper will circulate to ${routeSel.length} desks. ${divById(routeSel[0])?.code} becomes the primary holder and the rest acknowledge receipt.`
                    : `${divById(routeSel[0])?.name} takes over the paper and it lands in their Received tray.`}
                  {remark.trim() ? ' Your remark is stamped into the chain of custody.' : ''}
                </p>
              </div>
            }
          />
        )}
        {confirmRemove && (
          <ConfirmDialog
            danger kicker="Confirm — remove attachment" title="Remove this file?"
            icon={<I n="trash" className="h-5 w-5" sw={1.8} />} confirmLabel="Remove file"
            body={
              <>
                <div className="flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 p-3">
                  {confirmRemove.kind === 'image' ? (
                    <img src={confirmRemove.url} alt={confirmRemove.name} className="h-14 w-16 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded bg-flare-500/12 text-flare-400"><I n="file" className="h-6 w-6" sw={1.4} /></span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-mist-100" title={confirmRemove.name}>{confirmRemove.name}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-500">{confirmRemove.kind} · {paper.ref} {confirmRemove.geotagged ? '· geotagged' : ''}</p>
                  </div>
                </div>
                <p className="mt-2">The file will be detached from {paper.ref} and the removal recorded in the chain of custody under your name.</p>
                {lastGeotag && (
                  <p className="mt-2 flex items-start gap-2 rounded-md border border-amberx-500/40 bg-amberx-500/10 px-3 py-2 text-[12px] leading-relaxed text-amberx-400">
                    <I n="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
                    This is the last geotagged photo — the site map and GPS link will be removed from the paper as well.
                  </p>
                )}
              </>
            }
            onClose={() => setConfirmRemove(null)}
            onConfirm={() => { removeAttachment(paper.id, confirmRemove.id); setConfirmRemove(null); }}
          />
        )}
      </aside>
    </div>
  );
}
