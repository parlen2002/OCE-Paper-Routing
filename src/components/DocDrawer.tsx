import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { DIVISIONS, STAGES, divById } from '../lib/types';
import type { CustodyAction, Paper, Stage } from '../lib/types';
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

function AttachControl({ paperId }: { paperId: string }) {
  const { user, addAttachments, pushToast } = useStore();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setBusy(true);
    const { atts, skipped } = await buildAttachments(files, user.name);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
    if (atts.length > 0) addAttachments(paperId, atts);
    if (skipped.length > 0) pushToast('warn', `Skipped — ${skipped.join('; ')}`);
  };

  return (
    <>
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
        {busy ? 'Reading files…' : 'Attach JPG / PDF'}
      </button>
    </>
  );
}

export function DocDrawer() {
  const store = useStore();
  const { db, user, ui, closeDrawer, moveStage, routePaper, addNote, canEdit, setViewer } = store;
  const paper = useMemo(() => db.papers.find((p) => p.id === ui.drawerId) ?? null, [db.papers, ui.drawerId]);
  const [remark, setRemark] = useState('');
  const [note, setNote] = useState('');
  const [forwardVal, setForwardVal] = useState('');

  if (!paper || !user) return null;

  const div = divById(paper.divisionId);
  const intended = divById(paper.intendedId);
  const editable = canEdit(paper);
  const geo = paper.attachments.filter((a) => a.geotagged && a.lat != null && a.lng != null);
  const overdue = paper.dueAt != null && paper.stage !== 'completed' && paper.dueAt < Date.now();

  const path: string[] = [];
  for (const e of paper.custody) {
    if (e.toDivisionId && path[path.length - 1] !== e.toDivisionId) path.push(e.toDivisionId);
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
            <button onClick={closeDrawer} className="ml-auto rounded p-1.5 text-mist-400 transition hover:bg-ink-700 hover:text-mist-50" title="Close (Esc)">
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
                    <button className="block h-32 w-full overflow-hidden" onClick={() => setViewer(a.url)} title="View full size">
                      <img src={a.url} alt={a.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    </button>
                  ) : (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(45deg,rgba(86,200,240,0.03)_0_10px,transparent_10px_20px)]">
                      <span className="text-cyanx-400">
                        <I n="file" className="h-8 w-8" sw={1.3} />
                      </span>
                      <span className="font-mono text-[9.5px] uppercase tracking-widest text-mist-500">PDF document</span>
                    </div>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* actions */}
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
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-500">
                    {user.role === 'supervisor' ? 'Re-route to division' : 'Forward to division'}
                  </span>
                  <select className="field" value={forwardVal} disabled={!editable} onChange={(e) => doForward(e.target.value)}>
                    <option value="">— choose division —</option>
                    {DIVISIONS.filter((d) => d.id !== paper.divisionId).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} · {d.name}
                      </option>
                    ))}
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
      </aside>
    </div>
  );
}
