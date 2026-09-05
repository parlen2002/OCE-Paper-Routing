import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import type { Attachment, Kind, Priority } from '../lib/core';
import { ALL_UNITS, CROSS_UNITS, DESKS, DIVISIONS, KINDS, PRIORITIES, buildAttachments, divById } from '../lib/core';
import { I, SearchSelect } from './ui';

export function NewDocModal() {
  const { user, ui, setNewOpen, createPaper, pushToast, employeesOf } = useStore();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>('work-order');
  const [priority, setPriority] = useState<Priority>('routine');
  const [origin, setOrigin] = useState('');
  const [recipients, setRecipients] = useState<string[]>(['admin']);
  const [pics, setPics] = useState<string[]>([]);
  const [due, setDue] = useState('');
  const [remarks, setRemarks] = useState('');
  const [pending, setPending] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!ui.newOpen || !user) return null;
  const close = () => setNewOpen(false);

  const allIds = ALL_UNITS.map((d) => d.id);
  const allSelected = recipients.length === allIds.length;
  const toggle = (id: string) => setRecipients((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  const primary = recipients[0] ? ALL_UNITS.find((d) => d.id === recipients[0]) : undefined;
  const roster = recipients.length > 0 ? employeesOf(recipients[0]) : [];
  const validPics = pics.filter((id) => roster.some((r) => r.id === id));

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
  const err = (bad: boolean) => (touched && bad ? 'border-redx-500/70' : '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    createPaper({
      title, kind, priority, origin,
      recipientIds: recipients,
      dueAt: due ? new Date(due + 'T17:00:00').getTime() : undefined,
      remarks: remarks || undefined,
      attachments: pending,
      assigneeIds: validPics,
    });
  };

  const chip = (d: (typeof ALL_UNITS)[number], on: boolean, tone: 'amber' | 'cyan') => (
    <button
      type="button"
      key={d.id}
      onClick={() => toggle(d.id)}
      title={d.name}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] ${
        on
          ? tone === 'amber'
            ? 'border-amberx-500/70 bg-amberx-500/15 text-amberx-400'
            : 'border-cyanx-500/70 bg-cyanx-500/12 text-cyanx-400'
          : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-ink-500 hover:text-mist-200'
      }`}
    >
      {on && <I n="check" className="h-3 w-3" sw={2.6} />}
      {d.code}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={close} />
      <form onSubmit={submit} className="anim-pop relative w-full max-w-2xl rounded-xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85)]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-flare-400">New paperwork · intake</p>
            <h2 className="mt-0.5 font-display text-[28px] font-bold uppercase leading-tight tracking-wide text-mist-50">Log & transmit a document</h2>
          </div>
          <button type="button" onClick={close} className="rounded-md border border-ink-600 p-2 text-mist-400 transition hover:border-redx-500/60 hover:text-redx-400">
            <I n="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Subject / title *</span>
            <input className={`field ${err(title.trim().length < 6)}`} placeholder="e.g. Road patching — Brgy. San Manuel access road" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Document kind</span>
              <SearchSelect value={kind} onChange={(v) => setKind(v as Kind)} width="w-full"
                options={Object.entries(KINDS).map(([k, v]) => ({ value: k, label: v.label, sub: v.short }))} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Priority</span>
              <SearchSelect value={priority} onChange={(v) => setPriority(v as Priority)} width="w-full"
                options={Object.entries(PRIORITIES).map(([k, v]) => ({ value: k, label: v.label }))} />
            </label>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Origin — requesting office / party *</span>
              <input className={`field ${err(origin.trim().length <= 1)}`} placeholder="e.g. City Administrator's Office" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Due date (optional)</span>
              <input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
          </div>

          {/* recipients */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Recipient division / office * <span className="text-mist-600">— tick every desk that must receive it</span></span>
              <button type="button" onClick={() => setRecipients(allSelected ? [] : [...allIds])}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider transition ${allSelected ? 'border-flare-500/70 bg-flare-500/15 text-flare-400' : 'border-ink-600 bg-ink-800 text-mist-300 hover:border-flare-500/60 hover:text-flare-400'}`}>
                <I n={allSelected ? 'checkc' : 'sitemap'} className="h-3 w-3" sw={2.4} /> All Divisions / Offices
              </button>
              <span className={`ml-auto rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold tabular ${recipients.length > 0 ? 'bg-cyanx-500/12 text-cyanx-400' : 'bg-redx-500/12 text-redx-400'}`}>
                {recipients.length} of {allIds.length} selected
              </span>
            </div>
            <div className={`rounded-lg border bg-ink-950/40 p-2.5 ${err(recipients.length === 0) ? 'border-redx-500/70' : 'border-ink-600'}`}>
              <p className="mb-1.5 px-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] text-amberx-400/90">Executive desks</p>
              <div className="mb-2.5 flex flex-wrap gap-1.5">{DESKS.map((d) => chip(d, recipients.includes(d.id), 'amber'))}</div>
              <p className="mb-1.5 px-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] text-cyanx-400/90">Divisions & teams</p>
              <div className="flex flex-wrap gap-1.5">{[...DIVISIONS, ...CROSS_UNITS].map((d) => chip(d, recipients.includes(d.id), 'cyan'))}</div>
            </div>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
              {recipients.length > 1 ? (
                <>Circulation paper — addressed to <b className="text-cyanx-400">{recipients.length} desks</b>; each desk acknowledges receipt.{primary ? ` Primary holder: ${primary.code}.` : ''}</>
              ) : primary ? (
                <>Single recipient — paper is transmitted to {primary.name} ({primary.code}).</>
              ) : (
                <span className="text-redx-400">Select at least one recipient desk.</span>
              )}
            </span>
          </div>

          {/* persons-in-charge */}
          {roster.length > 0 && (
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Persons-in-charge <span className="text-mist-600">— optional, multiple allowed</span></span>
                <span className="ml-auto rounded-sm bg-tealx-500/12 px-1.5 py-0.5 font-mono text-[9px] font-bold text-tealx-400 tabular">{validPics.length} designated</span>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-ink-600 bg-ink-950/40 p-2.5">
                {roster.map((e) => {
                  const on = pics.includes(e.id);
                  return (
                    <button type="button" key={e.id} onClick={() => setPics((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))} title={`${e.name} — ${e.title}`}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.97] ${on ? 'border-tealx-500/70 bg-tealx-500/12 text-tealx-400' : 'border-ink-600 bg-ink-850 text-mist-500 hover:border-tealx-500/40 hover:text-mist-200'}`}>
                      {on && <I n="check" className="h-3 w-3" sw={2.6} />}
                      {e.name.replace(/^(Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(' ')[0]}
                      <span className={`rounded-sm px-1 py-px text-[7.5px] ${e.role === 'joborder' ? 'bg-amberx-500/15 text-amberx-400' : 'bg-tealx-500/12 text-tealx-400'}`}>{e.role === 'joborder' ? 'JO' : 'EMP'}</span>
                    </button>
                  );
                })}
              </div>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
                {divById(recipients[0])?.code} roster — designated personnel receive the work order on their personal boards immediately
              </span>
            </div>
          )}

          {/* attachments */}
          <div>
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Attachments — JPG / PDF (geotagged photos are mapped)</span>
            <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => void pick(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-600 bg-ink-950/40 px-3 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-mist-500 transition hover:border-cyanx-500/60 hover:text-cyanx-400">
              <I n="cam" className="h-4 w-4" /> {busy ? 'Reading EXIF geotags…' : 'Drop in files or click to browse'}
            </button>
            {pending.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {pending.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 rounded-md border border-ink-700 bg-ink-850 px-2.5 py-2">
                    {a.kind === 'image' ? (
                      <img src={a.url} alt={a.name} className="h-9 w-12 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded bg-flare-500/12 text-flare-400"><I n="file" className="h-4 w-4" sw={1.6} /></span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[11px] font-semibold text-mist-200">{a.name}</span>
                      <span className="block font-mono text-[8.5px] uppercase tracking-wider text-mist-600">{a.kind}{a.size ? ` · ${a.size}` : ''}{a.geotagged ? ' · geotagged' : ''}</span>
                    </span>
                    <button type="button" onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))} className="rounded p-1 text-mist-500 transition hover:bg-ink-700 hover:text-redx-400" title="Discard file">
                      <I n="x" className="h-3.5 w-3.5" sw={2.2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Remarks (optional)</span>
            <textarea className="field" rows={2} placeholder="Anything the receiving desk should know…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">
            {recipients.length > 1 ? `Circulates to ${recipients.length} desks · each desk's Received tray` : `Transmits to ${primary?.code ?? '—'} · Received tray · starts at 0%`}
          </p>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <I n="send" className="h-4 w-4" sw={2} /> Log & transmit
            </button>
          </div>
        </div>

        {touched && !valid && (
          <p className="mt-3 flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
            <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
            Give the paper a proper subject (6+ characters), an origin, and at least one recipient desk before transmitting.
          </p>
        )}
      </form>
    </div>
  );
}
