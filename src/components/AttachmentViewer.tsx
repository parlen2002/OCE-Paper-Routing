import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { I } from './icons';
import { fmtCoord, fmtDT, mapsLink } from '../lib/util';

/** In-app viewer for JPG / PNG / PDF attachments, with zoom and prev/next navigation. */
export function AttachmentViewer() {
  const { db, ui, setViewer } = useStore();
  const [zoom, setZoom] = useState(1);

  const paper = ui.viewer ? db.papers.find((p) => p.id === ui.viewer?.docId) ?? null : null;
  const idx = paper && ui.viewer ? paper.attachments.findIndex((a) => a.id === ui.viewer?.attId) : -1;
  const att = paper && idx >= 0 ? paper.attachments[idx] : null;

  useEffect(() => setZoom(1), [ui.viewer?.attId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!paper || paper.attachments.length < 2) return;
      const n = paper.attachments.length;
      if (e.key === 'ArrowRight') setViewer({ docId: paper.id, attId: paper.attachments[(idx + 1) % n].id });
      if (e.key === 'ArrowLeft') setViewer({ docId: paper.id, attId: paper.attachments[(idx - 1 + n) % n].id });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paper, idx, setViewer]);

  if (!paper || !att || !ui.viewer) return null;
  const close = () => setViewer(null);
  const n = paper.attachments.length;
  const nav = (dir: 1 | -1) => {
    if (n < 2) return;
    setViewer({ docId: paper.id, attId: paper.attachments[(idx + dir + n) % n].id });
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-ink-950/92 backdrop-blur-sm" onClick={close} />

      <div className="anim-pop relative flex h-[90vh] w-[min(1080px,96vw)] flex-col overflow-hidden rounded-xl border border-ink-600 bg-ink-900 shadow-[0_50px_120px_-20px_rgba(0,0,0,0.9)]">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-ink-700 px-4 py-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
              att.kind === 'image' ? 'border-cyanx-500/50 bg-cyanx-500/10 text-cyanx-400' : 'border-flare-500/50 bg-flare-500/10 text-flare-400'
            }`}
          >
            <I n={att.kind === 'image' ? 'clip' : 'file'} className="h-5 w-5" sw={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-mist-50" title={att.name}>
              {att.name}
            </p>
            <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">
              <span className="text-cyanx-400">{paper.ref}</span> · {att.kind === 'image' ? 'Photo' : 'PDF document'}
              {att.size ? ` · ${att.size}` : ''} · {att.by} · {fmtDT(att.at)}
              {n > 1 ? ` · ${idx + 1} of ${n}` : ''}
            </p>
          </div>

          {att.geotagged && att.lat != null && att.lng != null && (
            <a
              href={mapsLink(att.lat, att.lng)}
              target="_blank"
              rel="noreferrer"
              className="hidden shrink-0 items-center gap-1.5 rounded-md border border-tealx-500/50 bg-tealx-500/10 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-tealx-400 transition hover:bg-tealx-500/20 sm:inline-flex"
            >
              <I n="pin" className="h-3.5 w-3.5" sw={2.2} />
              {fmtCoord(att.lat, att.lng)}
            </a>
          )}

          {n > 1 && (
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => nav(-1)} className="rounded-md border border-ink-600 p-2 text-mist-300 transition hover:border-cyanx-500/60 hover:text-cyanx-400" title="Previous attachment (←)">
                <I n="chevR" className="h-4 w-4 rotate-180" sw={2.2} />
              </button>
              <button onClick={() => nav(1)} className="rounded-md border border-ink-600 p-2 text-mist-300 transition hover:border-cyanx-500/60 hover:text-cyanx-400" title="Next attachment (→)">
                <I n="chevR" className="h-4 w-4" sw={2.2} />
              </button>
            </div>
          )}

          <button onClick={close} className="shrink-0 rounded-md border border-ink-600 p-2 text-mist-300 transition hover:border-redx-500/60 hover:text-redx-400" title="Close (Esc)">
            <I n="x" className="h-4 w-4" sw={2.2} />
          </button>
        </div>

        {/* body */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {att.kind === 'image' ? (
            <div
              className="bg-blueprint-fine flex min-h-0 flex-1 items-center justify-center overflow-auto bg-ink-950/70 p-4"
              onWheel={(e) => {
                if (!e.ctrlKey) return;
                e.preventDefault();
                setZoom((z) => Math.min(4, Math.max(0.25, z + (e.deltaY < 0 ? 0.15 : -0.15))));
              }}
            >
              <img
                src={att.url}
                alt={att.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.18s ease' }}
                className="max-h-full max-w-full rounded-md object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
              />
            </div>
          ) : (
            <iframe title={att.name} src={att.url} className="min-h-0 w-full flex-1 border-0 bg-white" />
          )}
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 px-4 py-2.5">
          {att.kind === 'image' ? (
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[12px] font-bold text-mist-300 transition hover:border-cyanx-500/60 hover:text-cyanx-400" title="Zoom out">
                −
              </button>
              <span className="w-14 text-center font-mono text-[10.5px] font-bold text-mist-300 tabular">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[12px] font-bold text-mist-300 transition hover:border-cyanx-500/60 hover:text-cyanx-400" title="Zoom in">
                +
              </button>
              <button onClick={() => setZoom(1)} className="ml-1 rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-mist-400 transition hover:border-cyanx-500/60 hover:text-cyanx-400">
                Fit
              </button>
              <span className="ml-2 hidden font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600 lg:inline">Ctrl + scroll to zoom</span>
            </div>
          ) : (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-mist-600">
              Rendering with the built-in PDF engine — use the browser bar inside the frame to page through
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <a href={att.url} target="_blank" rel="noreferrer" className="btn btn-ghost py-1.5 text-[11.5px]">
              <I n="out" className="h-3.5 w-3.5" sw={2} />
              Open in new tab
            </a>
            <a href={att.url} download={att.name} rel="noreferrer" className="btn btn-primary py-1.5 text-[11.5px]">
              <I n="dl" className="h-3.5 w-3.5" sw={2.2} />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
