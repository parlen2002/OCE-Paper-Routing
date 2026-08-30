import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { ALL_UNITS, CROSS_UNITS, DESKS, DIVISIONS, KINDS, PRIORITIES } from '../lib/types';
import type { Attachment, Kind, Priority } from '../lib/types';
import { I } from './icons';
import { Modal } from './ui';
import { buildAttachments } from '../lib/attach';
import { fmtCoord } from '../lib/util';

export function NewDocModal() {
  const { user, ui, setNewOpen, createPaper, pushToast } = useStore();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>('work-order');
  const [priority, setPriority] = useState<Priority>('routine');
  const [origin, setOrigin] = useState('');
  const [recipients, setRecipients] = useState<string[]>(['admin']);
  const [due, setDue] = useState('');

  const allIds = ALL_UNITS.map((d) => d.id);
  const allSelected = recipients.length === allIds.length;
  const toggle = (id: string) =>
    setRecipients((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  const primary = recipients[0] ? ALL_UNITS.find((d) => d.id === recipients[0]) : undefined;
  const [remarks, setRemarks] = useState('');
  const [pending, setPending] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!ui.newOpen || !user) return null;
  const close = () => setNewOpen(false);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const { atts, skipped } = await buildAttachments(files, user.name);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    setPending((p) => [...p, ...atts]);
    if (skipped.length > 0) pushToast('warn', `Skipped — ${skipped.join('; ')}`);
  };

  const valid = title.trim().length >= 6 && origin.trim().length > 1 && recipients.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    createPaper({
      title,
      kind,
      priority,
      origin,
      recipientIds: recipients,
      dueAt: due ? new Date(due + 'T17:00:00').getTime() : undefined,
      remarks: remarks || undefined,
      attachments: pending,
    });
  };

  const err = (cond: boolean) => (touched && cond ? 'border-redx-500/70' : '');

  return (
    <Modal onClose={close} wide>
      <form onSubmit={submit}>
        <div className="flex items-start justify-between border-b border-ink-700 px-6 py-4">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.26em] text-flare-400">New entry · intake desk</p>
            <h2 className="mt-1 font-display text-[26px] font-bold uppercase leading-none tracking-wide text-mist-50">
              Log paperwork
            </h2>
          </div>
          <button type="button" onClick={close} className="rounded p-1.5 text-mist-400 transition hover:bg-ink-700 hover:text-mist-50">
            <I n="x" className="h-4 w-4" sw={2} />
          </button>
        </div>

        <div className="scroll-slim max-h-[62vh] space-y-4 overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">
              Subject / title of the paper *
            </span>
            <input
              className={`field ${err(title.trim().length < 6)}`}
              placeholder="e.g. Road shoulder repair — Brgy. Santa Monica stretch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Type</span>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                {(Object.keys(KINDS) as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {KINDS[k].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Priority</span>
              <select className="field" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {(Object.keys(PRIORITIES) as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITIES[p].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Due date</span>
              <input type="date" className="field font-mono text-[12px]" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">
              Origin — requesting office / party *
            </span>
            <input
              className={`field ${err(origin.trim().length <= 1)}`}
              placeholder="e.g. City Administrator's Office"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </label>

          {/* recipients — multi-select */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">
                Recipient division / office * <span className="text-mist-600">— tick every desk that must receive it</span>
              </span>
              <button
                type="button"
                onClick={() => setRecipients(allSelected ? [] : [...allIds])}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider transition ${
                  allSelected
                    ? 'border-flare-500/70 bg-flare-500/15 text-flare-400'
                    : 'border-ink-600 bg-ink-800 text-mist-300 hover:border-flare-500/60 hover:text-flare-400'
                }`}
              >
                <I n={allSelected ? 'checkc' : 'sitemap'} className="h-3 w-3" sw={2.4} />
                All Divisions / Offices
              </button>
              <span
                className={`ml-auto rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold tabular ${
                  recipients.length > 0 ? 'bg-cyanx-500/12 text-cyanx-400' : 'bg-redx-500/12 text-redx-400'
                }`}
              >
                {recipients.length} of {allIds.length} selected
              </span>
            </div>

            <div className={`rounded-lg border bg-ink-950/40 p-2.5 ${err(recipients.length === 0) ? 'border-redx-500/70' : 'border-ink-600'}`}>
              <p className="mb-1.5 px-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] text-amberx-400/90">
                Executive desks
              </p>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {DESKS.map((d) => {
                  const on = recipients.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => toggle(d.id)}
                      title={`${d.name} — ${d.head}`}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] ${
                        on
                          ? 'border-amberx-500/70 bg-amberx-500/15 text-amberx-400'
                          : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-amberx-500/40 hover:text-mist-200'
                      }`}
                    >
                      {on && <I n="check" className="h-3 w-3" sw={2.6} />}
                      {d.code}
                    </button>
                  );
                })}
              </div>
              <p className="mb-1.5 px-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] text-cyanx-400/90">
                Divisions & teams
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...DIVISIONS, ...CROSS_UNITS].map((d) => {
                  const on = recipients.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => toggle(d.id)}
                      title={d.name}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] ${
                        on
                          ? 'border-cyanx-500/70 bg-cyanx-500/12 text-cyanx-400'
                          : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-cyanx-500/40 hover:text-mist-200'
                      }`}
                    >
                      {on && <I n="check" className="h-3 w-3" sw={2.6} />}
                      {d.code}
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
              {recipients.length > 1 ? (
                <>
                  Circulation paper — addressed to <b className="text-cyanx-400">{recipients.length} desks</b>; each desk acknowledges receipt.
                  {primary ? ` Primary holder: ${primary.code}.` : ''}
                </>
              ) : primary ? (
                <>Single recipient — paper is transmitted to {primary.name} ({primary.code}).</>
              ) : (
                <span className="text-redx-400">Select at least one recipient desk.</span>
              )}
            </span>
          </div>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Remarks</span>
            <textarea
              className="field min-h-[64px] resize-y"
              placeholder="Context, instructions, references…"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </label>

          {/* attachments */}
          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">
              Attachments — JPG / PNG photos & PDF · geotagged photos get a map link
            </span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => void pick(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-500 bg-ink-850/60 px-4 py-5 text-[12.5px] font-semibold text-mist-300 transition hover:border-cyanx-500/70 hover:bg-cyanx-500/[0.05] hover:text-mist-100"
            >
              <I n="cam" className="h-4 w-4" />
              {busy ? 'Reading EXIF geotags…' : 'Drop in files or click to browse'}
            </button>

            {pending.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {pending.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-2">
                    {a.kind === 'image' ? (
                      <img src={a.url} alt="" className="h-9 w-11 rounded object-cover" />
                    ) : (
                      <span className="flex h-9 w-11 items-center justify-center rounded bg-ink-700 text-cyanx-400">
                        <I n="file" className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11px] font-semibold text-mist-200">{a.name}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-mist-500">
                        {a.kind} {a.size ? `· ${a.size}` : ''}
                      </p>
                    </div>
                    {a.geotagged && a.lat != null && a.lng != null ? (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-tealx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-tealx-400">
                        <I n="pin" className="h-2.5 w-2.5" sw={2.4} />
                        {fmtCoord(a.lat, a.lng)}
                      </span>
                    ) : (
                      <span className="rounded-sm bg-ink-700 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist-500">
                        no geotag
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))}
                      className="rounded p-1 text-mist-500 transition hover:bg-ink-700 hover:text-redx-400"
                    >
                      <I n="trash" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {touched && !valid && (
            <p className="flex items-center gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
              <I n="alert" className="h-3.5 w-3.5" sw={2} />
              Give the paper a proper subject (6+ characters), an origin, and at least one recipient desk before transmitting.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ink-700 px-6 py-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
            {recipients.length > 1
              ? `Circulates to ${recipients.length} desks · each desk's Received tray`
              : `Transmits to ${primary?.code ?? '—'} · Received tray`}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <I n="send" className="h-4 w-4" sw={2} />
              Transmit paperwork
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
