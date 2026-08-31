import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { CROSS_UNITS, DESKS, DIVISIONS, KINDS, PRIORITIES, STAGES, divById } from '../lib/types';
import type { Attachment, CustodyAction, Kind, Paper, Priority, Stage } from '../lib/types';
import { I, type IconName } from './icons';
import { DivChip, KindTag, PriorityTag, StageChip } from './ui';
import { fmtCoord, fmtDT, mapsLink, osmEmbed, timeAgo } from '../lib/util';
import { buildAttachments } from '../lib/attach';

const ACT: Record<CustodyAction, { icon: IconName; label: string }> = {
  created: { icon: 'plus', label: 'Logged' },
  received: { icon: 'inbox', label: 'Received' },
  stage: { icon: 'arr', label: 'Stage' },
  routed: { icon: 'route', label: 'Routed' },
  note: { icon: 'note', label: 'Remark' },
  attachment: { icon: 'clip', label: 'Attachment' },
  completed: { icon: 'checkc', label: 'Closed' },
};

function Section({ title, icon, children, right }: { title: string; icon: IconName; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-flare-400">
          <I n={icon} className="h-3.5 w-3.5" sw={2} />
        </span>
        <h4 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-mist-300">{title}</h4>
        <span className="h-px flex-1 bg-ink-700" />
        {right}
      </div>
      {children}
    </section>
  );
}

/** Stages picked files first; a confirmation prompt must approve them before they are saved to the paper. */
function AttachControl({ paperId }: { paperId: string }) {
  const { db, user, addAttachments, pushToast } = useStore();
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState<Attachment[]>([]);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const paper = db.papers.find((p) => p.id === paperId);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setBusy(true);
    const { atts, skipped } = await buildAttachments(files, user.name);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    if (atts.length > 0) setStaged((s) => [...s, ...atts]);
    if (skipped.length > 0) pushToast('warn', `Skipped — ${skipped.join('; ')}`);
  };

  const commit = () => {
    if (staged.length === 0) return;
    addAttachments(paperId, staged);
    setStaged([]);
    setConfirmAdd(false);
  };

  return (
    <div className="flex flex-col items-stretch gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => void pick(e.target.files)}
        />
        <button className="btn btn-ghost text-[12px]" onClick={() => inputRef.current?.click()} disabled={busy}>
          <I n="clip" className="h-3.5 w-3.5" />
          {busy ? 'Reading files…' : 'Add JPG / PDF'}
        </button>
        {staged.length > 0 && (
          <button className="btn btn-primary text-[12px]" onClick={() => setConfirmAdd(true)}>
            <I n="check" className="h-3.5 w-3.5" sw={2.2} />
            Save {staged.length} file{staged.length > 1 ? 's' : ''}
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
                <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded bg-flare-500/12 text-flare-400">
                  <I n="file" className="h-4 w-4" sw={1.6} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[10.5px] font-semibold text-mist-200">{a.name}</span>
                <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-600">
                  staged — not yet saved{a.geotagged ? ' · geotagged' : ''}
                </span>
              </span>
              <button
                onClick={() => setStaged((s) => s.filter((x) => x.id !== a.id))}
                className="rounded p-1 text-mist-500 transition hover:text-redx-400"
                title="Discard this file"
              >
                <I n="x" className="h-3.5 w-3.5" sw={2.2} />
              </button>
            </li>
          ))}
          <li className="pt-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">
            Press “Save … file(s)” to attach them to the paper
          </li>
        </ul>
      )}

      {/* add-confirmation prompt */}
      {confirmAdd && staged.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={() => setConfirmAdd(false)} />
          <div className="anim-pop relative w-full max-w-md rounded-xl border border-cyanx-500/45 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-cyanx-500/50 bg-cyanx-500/12 text-cyanx-400">
                <I n="clip" className="h-5 w-5" sw={1.8} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-cyanx-400">Confirm — add attachments</p>
                <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">
                  Attach {staged.length} file{staged.length > 1 ? 's' : ''}?
                </h3>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-ink-600 bg-ink-850 p-3.5">
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
                {paper ? `${paper.ref} · holder ${divById(paper.divisionId)?.code ?? '—'}` : 'paper record'}
              </p>
              <ul className="mt-2 space-y-1">
                {staged.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-[12px] text-mist-200">
                    <I n={a.kind === 'image' ? 'cam' : 'file'} className="h-3.5 w-3.5 shrink-0 text-mist-500" sw={1.8} />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    {a.geotagged && (
                      <span className="rounded-sm bg-tealx-500/12 px-1 py-px font-mono text-[8px] font-bold uppercase text-tealx-400">gps</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
              The file{staged.length > 1 ? 's' : ''} will be stamped into the chain of custody under your name.
              {staged.some((a) => a.geotagged) ? ' Geotagged photos will be linked to the site map.' : ''}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setConfirmAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={commit}>
                <I n="check" className="h-4 w-4" sw={2.2} />
                Confirm & attach
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocDrawer() {
  const store = useStore();
  const {
    db,
    user,
    ui,
    closeDrawer,
    moveStage,
    routePaper,
    addNote,
    canEdit,
    setViewer,
    deletePaper,
    updatePaper,
    ackPaper,
    userUnitId,
    assignPaper,
    submitToHead,
    returnToEmployee,
    employeesOf,
    removeAttachment,
    setReportOpen,
  } = store;
  const paper = useMemo(() => db.papers.find((p) => p.id === ui.drawerId) ?? null, [db.papers, ui.drawerId]);
  const [remark, setRemark] = useState('');
  const [note, setNote] = useState('');
  const [forwardVal, setForwardVal] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Attachment | null>(null);

  if (!paper || !user) return null;

  // If this is the only geotagged file, removing it also drops the map link.
  const lastGeotag =
    confirmRemove != null &&
    confirmRemove.geotagged &&
    paper.attachments.filter((a) => a.geotagged).length === 1;

  const div = divById(paper.divisionId);
  const intended = divById(paper.intendedId);
  const editable = canEdit(paper);
  const geo = paper.attachments.filter((a) => a.geotagged && a.lat != null && a.lng != null);
  const overdue = paper.dueAt != null && paper.stage !== 'completed' && paper.dueAt < Date.now();

  const path: string[] = [];
  for (const e of paper.custody) {
    if ((e.action === 'created' || e.action === 'routed') && e.toDivisionId && path[path.length - 1] !== e.toDivisionId)
      path.push(e.toDivisionId);
  }
  if (path[path.length - 1] !== paper.divisionId) path.push(paper.divisionId);

  const custody = [...paper.custody].reverse();
  const trail = [...paper.custody].sort((a, b) => a.at - b.at);

  const doMove = (s: Stage) => {
    moveStage(paper.id, s, remark || undefined);
    setRemark('');
  };
  const doForward = (toId: string) => {
    if (!toId) return;
    routePaper(paper.id, toId, remark || undefined);
    setRemark('');
    setForwardVal('');
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-[2px]" onClick={closeDrawer} />
      <aside className="anim-slide-r absolute inset-y-0 right-0 flex w-[min(640px,100vw)] flex-col border-l border-ink-600 bg-ink-900 shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.8)]">
        {/* header */}
        <header className="border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-cyanx-400">{paper.ref}</span>
            <StageChip stage={paper.stage} />
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded border border-redx-500/50 bg-redx-500/12 px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-redx-400">
                <I n="alert" className="h-2.5 w-2.5" sw={2.4} /> Overdue
              </span>
            )}
            <button
              onClick={() => setReportOpen(true, { paperId: paper.id })}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-flare-500/50 bg-flare-500/10 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-flare-400 transition hover:bg-flare-500/20"
              title="Print the full paperwork record — route sheet, custody, evidence & supporting documents"
            >
              <I n="printer" className="h-3 w-3" sw={2.2} />
              Print paperwork
            </button>
            {(user.role === 'admin' || user.role === 'moderator') && (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-300 transition hover:border-cyanx-500/60 hover:text-cyanx-400"
                  title={user.role === 'admin' ? 'Administrator — edit this board entry' : 'Moderator — edit this board entry'}
                >
                  <I n="wrench" className="h-3 w-3" sw={2.2} />
                  Edit
                </button>
                {user.role === 'admin' && (
                  <button
                    onClick={() => setDelOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-300 transition hover:border-redx-500/60 hover:bg-redx-500/10 hover:text-redx-400"
                    title="Administrator — delete this board entry"
                  >
                    <I n="trash" className="h-3 w-3" sw={2.2} />
                    Delete
                  </button>
                )}
              </span>
            )}
            <button onClick={closeDrawer} className={`${user.role === 'admin' || user.role === 'moderator' ? '' : 'ml-auto'} rounded p-1.5 text-mist-400 transition hover:bg-ink-700 hover:text-mist-50`} title="Close (Esc)">
              <I n="x" className="h-4 w-4" sw={2} />
            </button>
          </div>
          <h2 className="mt-1.5 font-display text-[26px] font-bold leading-[1.05] tracking-wide text-mist-50">{paper.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            {div && <DivChip div={div} />}
            <KindTag kind={paper.kind} />
            <PriorityTag p={paper.priority} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-mist-500">
              logged {timeAgo(paper.createdAt)} by {paper.byName}
            </span>
          </div>
        </header>

        <div className="scroll-slim flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* route sheet */}
          <Section title="Route sheet — where it has gone" icon="route">
            <div className="flex flex-wrap items-center gap-1.5">
              {path.map((id, i) => {
                const d = divById(id);
                const isCurrent = i === path.length - 1;
                const isIntended = id === paper.intendedId;
                if (!d) return null;
                return (
                  <React.Fragment key={`${id}-${i}`}>
                    {i > 0 && <I n="arr" className="h-3.5 w-3.5 text-mist-500" />}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 transition ${
                        isCurrent
                          ? 'border-flare-500 bg-flare-500/12 shadow-[0_0_14px_rgba(255,107,28,0.25)]'
                          : isIntended
                            ? 'border-cyanx-500/50 bg-ink-800'
                            : 'border-ink-600 bg-ink-850'
                      }`}
                    >
                      <span className={`font-mono text-[10.5px] font-bold tracking-wider ${isCurrent ? 'text-flare-400' : 'text-mist-200'}`}>
                        {d.code}
                      </span>
                      <span className="hidden text-[10.5px] text-mist-400 sm:inline">{d.name}</span>
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-flare-500" />}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
            {paper.diverted && intended ? (
              <p className="mt-2.5 flex items-start gap-2 rounded-md border border-amberx-500/40 bg-amberx-500/10 px-3 py-2 text-[12px] leading-snug text-amberx-400">
                <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
                Off the intended route — originally filed for <b>{intended.name}</b>. Every deviation is stamped in the custody trail below.
              </p>
            ) : (
              intended && (
                <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500">
                  On route · intended recipient {intended.code} — {intended.name}
                </p>
              )
            )}
          </Section>

          {/* circulation receipts */}
          {(paper.recipientIds?.length ?? 0) > 1 && (() => {
            const recipients = paper.recipientIds!;
            const receivedBy = paper.receivedBy ?? [];
            const acks = paper.custody.filter((e) => e.action === 'received');
            const canAck = !!userUnitId && recipients.includes(userUnitId) && !receivedBy.includes(userUnitId);
            const allIn = receivedBy.length === recipients.length;
            return (
              <Section
                title={`Circulation receipts · ${receivedBy.length} of ${recipients.length}`}
                icon="users"
                right={
                  allIn ? (
                    <span className="stamp text-[9.5px] text-greenx-500">Fully received</span>
                  ) : canAck ? (
                    <button
                      onClick={() => ackPaper(paper.id)}
                      className="btn btn-primary px-3 py-1.5 text-[11px]"
                    >
                      <I n="checkc" className="h-3.5 w-3.5" sw={2.2} />
                      Confirm receipt — {divById(userUnitId!)?.code}
                    </button>
                  ) : undefined
                }
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {recipients.map((rid) => {
                    const d = divById(rid);
                    const ack = acks.find((e) => e.toDivisionId === rid);
                    const isPrimary = rid === paper.divisionId;
                    if (!d) return null;
                    return (
                      <div
                        key={rid}
                        className={`relative rounded-md border px-2.5 py-2 transition ${
                          ack
                            ? 'border-greenx-500/45 bg-greenx-500/[0.07]'
                            : 'border-dashed border-amberx-500/45 bg-amberx-500/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border ${
                              ack ? 'border-greenx-500 bg-greenx-500/20 text-greenx-500' : 'border-amberx-500/70 text-amberx-500'
                            }`}
                          >
                            {ack ? <I n="check" className="h-2.5 w-2.5" sw={3} /> : <I n="clock" className="h-2.5 w-2.5" sw={2.4} />}
                          </span>
                          <span className={`font-mono text-[10px] font-bold tracking-wider ${ack ? 'text-greenx-500' : 'text-amberx-400'}`}>
                            {d.code}
                          </span>
                          {isPrimary && (
                            <span className="ml-auto rounded-sm bg-flare-500/15 px-1 py-0.5 font-mono text-[7.5px] font-bold uppercase tracking-wider text-flare-400">
                              primary
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[10.5px] leading-tight text-mist-300" title={d.name}>
                          {d.name}
                        </p>
                        <p className={`mt-0.5 truncate font-mono text-[8.5px] uppercase tracking-wider ${ack ? 'text-mist-500' : 'text-amberx-500/80'}`}>
                          {ack ? `${ack.byName} · ${timeAgo(ack.at)}` : 'awaiting receipt'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">
                  {allIn
                    ? 'Every addressed desk has acknowledged — safe to close when work is done.'
                    : 'Each addressed desk confirms receipt from its own queue; progress is stamped into the custody trail.'}
                </p>
              </Section>
            );
          })()}

          {/* details */}
          <Section title="Particulars" icon="file">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-ink-700 bg-ink-850/70 p-4 text-[12.5px] sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Origin</dt>
                <dd className="mt-0.5 leading-snug text-mist-100">{paper.origin}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Current holder</dt>
                <dd className="mt-0.5 leading-snug text-mist-100">{div?.name}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Division head</dt>
                <dd className="mt-0.5 leading-snug text-mist-100">{div?.head}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Logged</dt>
                <dd className="mt-0.5 font-mono text-[11.5px] text-mist-100">{fmtDT(paper.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Last touch</dt>
                <dd className="mt-0.5 font-mono text-[11.5px] text-mist-100">{fmtDT(paper.updatedAt)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Due</dt>
                <dd className={`mt-0.5 font-mono text-[11.5px] ${overdue ? 'font-bold text-redx-400' : 'text-mist-100'}`}>
                  {paper.dueAt ? fmtDT(paper.dueAt) : '—'}
                </dd>
              </div>
              {paper.remarks && (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Remarks on file</dt>
                  <dd className="mt-0.5 leading-relaxed text-mist-200">{paper.remarks}</dd>
                </div>
              )}
            </dl>
          </Section>

          {/* evidence */}
          <Section title={`Evidence & files · ${paper.attachments.length}`} icon="cam" right={<AttachControl paperId={paper.id} />}>
            {geo.length > 0 && (
              <div className="mb-3 overflow-hidden rounded-lg border border-ink-600">
                <iframe
                  title="Site location map"
                  src={osmEmbed(geo[0].lat!, geo[0].lng!)}
                  className="h-52 w-full border-0"
                  loading="lazy"
                />
                <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 bg-ink-850 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded bg-tealx-500/12 px-2 py-1 font-mono text-[10px] font-semibold text-tealx-400">
                    <I n="pin" className="h-3 w-3" sw={2.2} />
                    {fmtCoord(geo[0].lat!, geo[0].lng!)}
                  </span>
                  <a
                    href={mapsLink(geo[0].lat!, geo[0].lng!)}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1.5 rounded bg-cyanx-500/12 px-2 py-1 font-mono text-[10px] font-semibold text-cyanx-400 transition hover:bg-cyanx-500/20"
                  >
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
                    <button
                      className="block h-32 w-full overflow-hidden"
                      onClick={() => setViewer({ docId: paper.id, attId: a.id })}
                      title="Open in the attachment viewer"
                    >
                      <img
                        src={a.url}
                        alt={a.name}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                      />
                    </button>
                  ) : (
                    <button
                      className="flex h-32 w-full flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(45deg,rgba(255,107,28,0.05)_0_10px,transparent_10px_20px)] transition hover:bg-[repeating-linear-gradient(45deg,rgba(255,107,28,0.1)_0_10px,transparent_10px_20px)]"
                      onClick={() => setViewer({ docId: paper.id, attId: a.id })}
                      title="Open in the attachment viewer"
                    >
                      <span className="text-flare-400">
                        <I n="file" className="h-8 w-8" sw={1.3} />
                      </span>
                      <span className="font-mono text-[9.5px] uppercase tracking-widest text-mist-400">PDF — click to view</span>
                    </button>
                  )}
                  <div className="px-2.5 py-2">
                    <p className="truncate font-mono text-[10.5px] font-semibold text-mist-200" title={a.name}>
                      {a.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-600">
                      {a.by} · {timeAgo(a.at)} {a.size ? `· ${a.size}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {a.geotagged && a.lat != null && a.lng != null ? (
                        <a
                          href={mapsLink(a.lat, a.lng)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-sm bg-tealx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-tealx-400 transition hover:bg-tealx-500/25"
                          title={`Geotagged at ${fmtCoord(a.lat, a.lng)}`}
                        >
                          <I n="pin" className="h-2.5 w-2.5" sw={2.4} />
                          {fmtCoord(a.lat, a.lng)}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-ink-700/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-500">
                          <I n="pin" className="h-2.5 w-2.5" sw={2.4} />
                          No geotag
                        </span>
                      )}
                      <a
                        href={a.url}
                        target={a.kind === 'pdf' ? '_blank' : undefined}
                        download={a.name}
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 rounded-sm bg-ink-700/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-300 transition hover:text-cyanx-400"
                      >
                        <I n="dl" className="h-2.5 w-2.5" sw={2.2} />
                        Save
                      </a>
                      <button
                        onClick={() => setConfirmRemove(a)}
                        title={`Remove ${a.name} from this paper`}
                        className="inline-flex items-center gap-1 rounded-sm bg-ink-700/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-500 transition hover:bg-redx-500/15 hover:text-redx-400"
                      >
                        <I n="trash" className="h-2.5 w-2.5" sw={2.2} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* actions */}
          {/* persons-in-charge */}
          {(user.role === 'admin' ||
            user.role === 'supervisor' ||
            user.role === 'division' ||
            user.role === 'moderator' ||
            (paper.assignees?.length ?? 0) > 0) && (
            <Section title={`Persons-in-charge · ${paper.assignees?.length ?? 0}`} icon="users">
              {(() => {
                const emps = employeesOf(paper.divisionId);
                const pics = (paper.assignees ?? []).map((id) => db.users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => !!u);
                const iAmPic = (user.role === 'employee' || user.role === 'joborder') && (paper.assignees ?? []).includes(user.id);
                const canAssignRole =
                  user.role === 'admin' || user.role === 'supervisor' || user.role === 'division' || user.role === 'moderator';
                const togglePic = (id: string) => {
                  const cur = paper.assignees ?? [];
                  assignPaper(paper.id, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
                };
                return (
                  <div className="space-y-2.5">
                    {canAssignRole ? (
                      <div>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">
                            Designate the persons-in-charge · {div?.code ?? ''} roster
                          </span>
                          <span className="ml-auto rounded-sm bg-tealx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold text-tealx-400 tabular">
                            {pics.length} designated
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {emps.map((e) => {
                            const on = (paper.assignees ?? []).includes(e.id);
                            const isJO = e.role === 'joborder';
                            return (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => togglePic(e.id)}
                                title={`${e.name} — ${e.title}`}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] ${
                                  on
                                    ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400'
                                    : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-tealx-500/40 hover:text-mist-200'
                                }`}
                              >
                                {on && <I n="check" className="h-3 w-3" sw={2.6} />}
                                {e.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                                <span className={`rounded-sm px-1 py-px text-[7.5px] ${isJO ? 'bg-amberx-500/15 text-amberx-400' : 'bg-tealx-500/12 text-tealx-400'}`}>
                                  {isJO ? 'JO' : 'EMP'}
                                </span>
                              </button>
                            );
                          })}
                          {emps.length === 0 && (
                            <p className="px-1 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
                              No active employees / job-order personnel in this division yet — verify their sign-ups in Users & Accounts
                            </p>
                          )}
                        </div>
                        <span className="mt-1.5 block font-mono text-[8.5px] uppercase tracking-[0.14em] text-mist-600">
                          Multiple persons-in-charge allowed — each tracks this work order on their personal board
                        </span>
                      </div>
                    ) : (
                      pics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {pics.map((p) => (
                            <span
                              key={p.id}
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                                p.id === user.id
                                  ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400'
                                  : 'border-ink-600 bg-ink-850 text-mist-300'
                              }`}
                              title={`${p.name} — ${p.title}`}
                            >
                              <I n="users" className="h-3 w-3" sw={2} />
                              {p.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                              {p.id === user.id && <span className="rounded-sm bg-tealx-500/20 px-1 py-px text-[7.5px]">you</span>}
                            </span>
                          ))}
                        </div>
                      )
                    )}

                    {/* head-review flow */}
                    {paper.pendingHeadReview && paper.stage !== 'completed' && (
                      <div className="rounded-md border border-amberx-500/45 bg-amberx-500/[0.07] px-3 py-2.5">
                        <p className="flex items-center gap-2 text-[12px] font-semibold text-amberx-400">
                          <I n="shield" className="h-3.5 w-3.5 shrink-0" sw={2} />
                          Submitted by {pics.map((p) => p.name).join(', ') || 'the persons-in-charge'} — awaiting division head verification
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-mist-400">
                          {iAmPic
                            ? 'Your division head reviews the work order next. You can keep adding remarks and evidence while it is under review.'
                            : 'Verify the work by moving it to Verification or Completed — or return it to the employee with instructions.'}
                        </p>
                        {!iAmPic && canAssignRole && (
                          <button onClick={() => returnToEmployee(paper.id)} className="btn btn-ghost mt-2 px-3 py-1.5 text-[11px]">
                            <I n="history" className="h-3.5 w-3.5" sw={2.2} />
                            Return to employee
                          </button>
                        )}
                      </div>
                    )}

                    {iAmPic && !paper.pendingHeadReview && paper.stage !== 'completed' && (
                      <button onClick={() => submitToHead(paper.id)} className="btn btn-primary w-full justify-center">
                        <I n="send" className="h-4 w-4" sw={2} />
                        Submit to division head for verification
                      </button>
                    )}
                  </div>
                );
              })()}
            </Section>
          )}

          <Section title="Move this paper" icon="send">
            <div className="rounded-lg border border-ink-700 bg-ink-850/70 p-3.5">
              <input
                className="field mb-2.5 font-mono text-[11.5px]"
                placeholder="Optional remark for the custody trail…"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">Move to stage</span>
                  <select
                    className="field"
                    value={paper.stage}
                    disabled={!editable}
                    onChange={(e) => doMove(e.target.value as Stage)}
                  >
                    {STAGES.filter((s) => !((user.role === 'employee' || user.role === 'joborder') && s.id === 'completed')).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                        {(user.role === 'employee' || user.role === 'joborder') && s.id === 'verification'
                          ? ' — final stage before head verification'
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">
                    Forward / re-route — division, team or executive desk
                  </span>
                  <select
                    className="field"
                    value={forwardVal}
                    disabled={!editable || user.role === 'employee' || user.role === 'joborder'}
                    onChange={(e) => doForward(e.target.value)}
                  >
                    <option value="">
                      {user.role === 'employee' || user.role === 'joborder'
                        ? '— routing is done by your division head —'
                        : '— choose recipient —'}
                    </option>
                    <optgroup label="Executive desks">
                      {DESKS.filter((d) => d.id !== paper.divisionId).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} · {d.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Divisions & teams">
                      {[...DIVISIONS, ...CROSS_UNITS].filter((d) => d.id !== paper.divisionId).map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} · {d.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              </div>
              {!editable && (
                <p className="mt-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amberx-400">
                  <I n="lock" className="h-3 w-3" sw={2} />
                  Read-only — currently held by {div?.code}; only that desk or a supervisor may act
                </p>
              )}
              {editable && paper.stage !== 'completed' && (
                <p className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-mist-600">
                  Forwarding drops the paper into the target division's Received tray and signals them
                </p>
              )}
            </div>
          </Section>

          {/* add remark */}
          <Section title="Add remark" icon="note">
            <div className="flex gap-2">
              <input
                className="field"
                placeholder="Write into the custody trail…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && note.trim()) {
                    addNote(paper.id, note);
                    setNote('');
                  }
                }}
              />
              <button
                className="btn btn-primary shrink-0"
                disabled={!note.trim()}
                onClick={() => {
                  addNote(paper.id, note);
                  setNote('');
                }}
              >
                <I n="send" className="h-3.5 w-3.5" sw={2} />
                Stamp it
              </button>
            </div>
          </Section>

          {/* chain of custody */}
          <Section title={`Chain of custody · ${trail.length}`} icon="shield">
            <ol className="relative ml-2 space-y-3.5 border-l border-ink-600 pl-5">
              {custody.map((e) => {
                const meta = ACT[e.action];
                const color =
                  e.action === 'stage' && e.stage ? STAGES.find((s) => s.id === e.stage)!.color : '#86a2be';
                const d =
                  e.action === 'routed'
                    ? `${divById(e.fromDivisionId!)?.code ?? '—'} → ${divById(e.toDivisionId!)?.code ?? '—'}`
                    : null;
                return (
                  <li key={e.id} className="relative">
                    <span
                      className="absolute -left-[27.5px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-ink-900"
                      style={{ borderColor: `${color}88`, color }}
                    >
                      <I n={meta.icon} className="h-2.5 w-2.5" sw={2.4} />
                    </span>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
                        {meta.label}
                      </span>
                      {d && <span className="font-mono text-[9.5px] tracking-wider text-mist-500">{d}</span>}
                      <span className="ml-auto font-mono text-[9.5px] text-mist-600 tabular">{fmtDT(e.at)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-mist-200">{e.text}</p>
                    <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-600">— {e.byName}</p>
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>
        {editOpen && <EditDocModal paper={paper} onClose={() => setEditOpen(false)} />}
        {delOpen && <ConfirmDeleteModal paper={paper} onClose={() => setDelOpen(false)} onDelete={() => deletePaper(paper.id)} />}
        {confirmRemove && (
          <ConfirmRemoveFileModal
            paper={paper}
            att={confirmRemove}
            lastGeotag={lastGeotag}
            onClose={() => setConfirmRemove(null)}
            onConfirm={() => {
              removeAttachment(paper.id, confirmRemove.id);
              setConfirmRemove(null);
            }}
          />
        )}
      </aside>
    </div>
  );
}

/* ------------------------------------------------ admin: edit board entry */
const toDateInputLocal = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromInputLocal = (s: string) => {
  const [y, m, dd] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, dd || 1, 12, 0, 0).getTime();
};

function EditDocModal({ paper, onClose }: { paper: Paper; onClose: () => void }) {
  const { updatePaper } = useStore();
  const [title, setTitle] = useState(paper.title);
  const [kind, setKind] = useState<Kind>(paper.kind);
  const [priority, setPriority] = useState<Priority>(paper.priority);
  const [origin, setOrigin] = useState(paper.origin);
  const [holder, setHolder] = useState(paper.divisionId);
  const [due, setDue] = useState(paper.dueAt ? toDateInputLocal(paper.dueAt) : '');
  const [remarks, setRemarks] = useState(paper.remarks ?? '');
  const [err, setErr] = useState('');

  const save = () => {
    if (title.trim().length < 4) return setErr('A descriptive title is required (min. 4 characters).');
    if (!holder) return setErr('Choose the division, team or desk currently holding the paper.');
    updatePaper(paper.id, {
      title,
      kind,
      priority,
      origin,
      divisionId: holder,
      dueAt: due ? fromInputLocal(due) : null,
      remarks,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[62] flex items-start justify-center overflow-y-auto p-4 sm:p-10">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-xl rounded-xl border border-cyanx-500/40 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cyanx-500/50 bg-cyanx-500/10 text-cyanx-400">
            <I n="wrench" className="h-5 w-5" sw={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-cyanx-400">Administrator override</p>
            <h3 className="truncate font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Edit {paper.ref}</h3>
            <p className="mt-0.5 text-[11.5px] text-mist-500">Changes are stamped into the system log. Re-assigning the holder files a custody entry and returns the paper to its Received tray.</p>
          </div>
          <button onClick={onClose} className="rounded-md border border-ink-600 p-2 text-mist-400 transition hover:border-redx-500/60 hover:text-redx-400">
            <I n="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Title</span>
            <input className="field" value={title} onChange={(e) => { setTitle(e.target.value); setErr(''); }} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Type</span>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {(Object.keys(KINDS) as Kind[]).map((k) => (
                  <option key={k} value={k}>{KINDS[k].label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Priority</span>
              <select className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {(Object.keys(PRIORITIES) as Priority[]).map((k) => (
                  <option key={k} value={k}>{PRIORITIES[k].label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Due date</span>
              <input type="date" className="field font-mono text-[12px]" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Origin / source</span>
              <input className="field" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Current holder</span>
              <select className="field" value={holder} onChange={(e) => { setHolder(e.target.value); setErr(''); }}>
                <optgroup label="Executive desks">
                  {DESKS.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Divisions & teams">
                  {[...DIVISIONS, ...CROSS_UNITS].map((d) => (
                    <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Remarks</span>
            <textarea className="field min-h-[64px] resize-y" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Instructions, context, references…" />
          </label>

          {err && (
            <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
              <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
              {err}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>
              <I n="check" className="h-4 w-4" sw={2.2} />
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ confirm: remove an attachment */
function ConfirmRemoveFileModal({
  paper,
  att,
  lastGeotag,
  onClose,
  onConfirm,
}: {
  paper: Paper;
  att: Attachment;
  lastGeotag: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-md rounded-xl border border-redx-500/45 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-redx-500/50 bg-redx-500/12 text-redx-400">
            <I n="trash" className="h-5 w-5" sw={1.8} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-redx-400">Confirm — remove attachment</p>
            <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Remove this file?</h3>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-md border border-ink-600 bg-ink-850 p-3">
          {att.kind === 'image' ? (
            <img src={att.url} alt={att.name} className="h-14 w-16 shrink-0 rounded object-cover" />
          ) : (
            <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded bg-flare-500/12 text-flare-400">
              <I n="file" className="h-6 w-6" sw={1.4} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-mist-100" title={att.name}>
              {att.name}
            </p>
            <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
              {att.kind} · {paper.ref} {att.geotagged ? '· geotagged' : ''}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
          The file will be detached from {paper.ref} and the removal recorded in the chain of custody under your name.
        </p>
        {lastGeotag && (
          <p className="mt-2 flex items-start gap-2 rounded-md border border-amberx-500/40 bg-amberx-500/10 px-3 py-2 text-[12px] leading-relaxed text-amberx-400">
            <I n="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
            This is the last geotagged photo — the site map and GPS link will be removed from the paper as well.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Keep file</button>
          <button
            className="btn border border-redx-500/60 bg-redx-500/15 text-redx-400 hover:bg-redx-500/25"
            onClick={onConfirm}
          >
            <I n="trash" className="h-4 w-4" sw={2} />
            Remove file
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ admin: delete board entry */
function ConfirmDeleteModal({ paper, onClose, onDelete }: { paper: Paper; onClose: () => void; onDelete: () => void }) {
  const div = divById(paper.divisionId);
  return (
    <div className="fixed inset-0 z-[62] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-md rounded-xl border border-redx-500/45 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-redx-500/50 bg-redx-500/12 text-redx-400">
            <I n="trash" className="h-5 w-5" sw={1.8} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-redx-400">Administrator — destructive action</p>
            <h3 className="mt-0.5 font-display text-[22px] font-bold uppercase tracking-wide text-mist-50">Delete {paper.ref}?</h3>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-ink-600 bg-ink-850 p-3.5">
          <p className="text-[13.5px] font-bold leading-snug text-mist-100">{paper.title}</p>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
            holder: {div?.code ?? '—'} · {paper.custody.length} custody entries · {paper.attachments.length} attachment(s)
          </p>
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
          This removes the entry from the tracker board, the register and every dashboard. The custody trail and
          attachments go with it. The deletion itself is recorded in the system log under your name.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Keep it</button>
          <button
            className="btn border border-redx-500/60 bg-redx-500/15 text-redx-400 hover:bg-redx-500/25"
            onClick={() => {
              onDelete();
            }}
          >
            <I n="trash" className="h-4 w-4" sw={2} />
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}
