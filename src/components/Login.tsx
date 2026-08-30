import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { CROSS_UNITS, DIVISIONS } from '../lib/types';
import { I, Seal } from './icons';

const QUICK = [
  { label: 'System Admin', u: 'admin' },
  { label: 'City Engineer', u: 'agrande' },
  { label: 'Asst. City Engineer', u: 'jsergio' },
  { label: 'Construction', u: 'rdomingo' },
  { label: 'MTQC', u: 'mabad' },
  { label: 'Administrative', u: 'cestrella' },
];

const FLOW = [
  { x: 24, y: 46, label: 'RECEIVED' },
  { x: 128, y: 22, label: 'REVIEW' },
  { x: 232, y: 52, label: 'PROGRESS' },
  { x: 336, y: 22, label: 'VERIFY' },
  { x: 440, y: 46, label: 'DONE' },
];

export function Login() {
  const { login, signup, pushToast } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // sign-in state
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  // sign-up state
  const [suName, setSuName] = useState('');
  const [suUser, setSuUser] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPass2, setSuPass2] = useState('');
  const [suDiv, setSuDiv] = useState('const');
  const [suTitle, setSuTitle] = useState('');
  const [suErr, setSuErr] = useState('');
  const [suDone, setSuDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      const reason = login(u, p);
      if (reason) {
        setErr(reason);
        setShakeKey((k) => k + 1);
        setBusy(false);
      } else {
        pushToast('ok', 'Identity verified — welcome to the command floor');
      }
    }, 450);
  };

  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (suPass !== suPass2) {
      setSuErr('Passwords do not match — re-enter both fields.');
      setShakeKey((k) => k + 1);
      return;
    }
    const reason = signup({ name: suName, username: suUser, password: suPass, divisionId: suDiv, title: suTitle });
    if (reason) {
      setSuErr(reason);
      setShakeKey((k) => k + 1);
      return;
    }
    setSuDone(true);
    pushToast('ok', 'Account request submitted — the administrator has been signaled');
  };

  return (
    <div className="flex min-h-screen bg-ink-950">
      {/* ---- brand / operations panel ---- */}
      <div className="relative hidden w-[54%] flex-col justify-between overflow-hidden border-r border-ink-700/60 bg-ink-900 p-10 lg:flex">
        <div className="bg-blueprint-fine pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_0%,rgba(86,200,240,0.10),transparent_60%),radial-gradient(700px_500px_at_90%_100%,rgba(255,107,28,0.10),transparent_55%)]" />

        <div className="relative flex items-center gap-3">
          <Seal className="h-11 w-11" />
          <div>
            <p className="font-display text-lg font-bold uppercase leading-tight tracking-wider text-mist-50">
              Office of the City Engineer
            </p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-mist-400">
              City Government of Puerto Princesa (CGPP)
            </p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-flare-400">
            Paperwork Flow Command · CEO FLOW
          </p>
          <h1 className="font-display text-[58px] font-bold uppercase leading-[0.95] tracking-wide text-mist-50 xl:text-[70px]">
            Every paper,
            <br />
            <span className="text-flare-500">tracked</span> to the desk
            <br />
            it belongs to.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-mist-300">
            Work orders, permits, memos and complaints move across nine divisions — plus the
            cross-division Inspectorate Team — under the City Engineer and the Assistant City
            Engineer. Each hand-off is stamped into the chain of custody, so a paper never
            disappears between floors.
          </p>

          <svg viewBox="0 0 464 80" className="mt-8 w-full max-w-lg">
            <path
              d={`M${FLOW[0].x} ${FLOW[0].y} C 76 46, 84 ${FLOW[1].y}, ${FLOW[1].x} ${FLOW[1].y} S 188 ${FLOW[2].y}, ${FLOW[2].x} ${FLOW[2].y} S 292 ${FLOW[3].y}, ${FLOW[3].x} ${FLOW[3].y} S 396 ${FLOW[4].y}, ${FLOW[4].x} ${FLOW[4].y}`}
              fill="none"
              stroke="#2fa9d6"
              strokeWidth="1.6"
              className="dash-flow"
              opacity="0.8"
            />
            {FLOW.map((f, i) => (
              <g key={f.label}>
                <circle cx={f.x} cy={f.y} r="10" fill="#0d1d31" stroke={i === 4 ? '#45d483' : '#56c8f0'} strokeWidth="1.6" />
                <circle cx={f.x} cy={f.y} r="3" fill={i === 4 ? '#45d483' : '#ff6b1c'} />
                <text x={f.x} y={f.y + 26} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#86a2be" letterSpacing="1.5">
                  {f.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="relative flex items-center gap-6 font-mono text-[10.5px] uppercase tracking-[0.2em] text-mist-500">
          <span><b className="text-mist-200">09</b> divisions</span>
          <span className="h-3 w-px bg-ink-600" />
          <span><b className="text-mist-200">01</b> Inspectorate Team</span>
          <span className="h-3 w-px bg-ink-600" />
          <span>full chain of custody</span>
        </div>
      </div>

      {/* ---- gate panel ---- */}
      <div className="bg-blueprint flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Seal className="h-10 w-10" />
            <div>
              <p className="font-display text-base font-bold uppercase tracking-wider text-mist-50">Office of the City Engineer</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mist-400">CGPP · Puerto Princesa City</p>
            </div>
          </div>

          <div key={shakeKey} className={`${err || suErr ? 'anim-shake' : 'anim-fade-up'}`}>
            <div className="rounded-xl border border-ink-600 bg-ink-900/90 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]">
              {/* mode tabs */}
              <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-md border border-ink-600 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em]">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setSuErr(''); }}
                  className={`py-2.5 transition ${mode === 'signin' ? 'bg-flare-500/20 text-flare-400' : 'bg-ink-850 text-mist-500 hover:text-mist-200'}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErr(''); }}
                  className={`py-2.5 transition ${mode === 'signup' ? 'bg-cyanx-500/15 text-cyanx-400' : 'bg-ink-850 text-mist-500 hover:text-mist-200'}`}
                >
                  Request account
                </button>
              </div>

              {mode === 'signin' ? (
                <>
                  <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.26em] text-flare-400">Authorized access</p>
                  <h2 className="mt-1.5 font-display text-[28px] font-bold uppercase leading-none tracking-wide text-mist-50">
                    Sign in to the floor
                  </h2>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">
                    Department heads see the whole office. Division accounts see their own queue and
                    the trail of everything that passed through it.
                  </p>

                  <form onSubmit={submit} className="mt-6 space-y-3.5">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500">
                        <I n="user" className="h-4 w-4" />
                      </span>
                      <input className="field pl-9" placeholder="Username" value={u} onChange={(e) => { setU(e.target.value); setErr(''); }} autoComplete="username" autoFocus />
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500">
                        <I n="lock" className="h-4 w-4" />
                      </span>
                      <input className="field pl-9" type="password" placeholder="Password" value={p} onChange={(e) => { setP(e.target.value); setErr(''); }} autoComplete="current-password" />
                    </div>
                    {err && (
                      <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] leading-snug text-redx-400">
                        <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
                        {err}
                      </p>
                    )}
                    <button type="submit" className="btn btn-primary w-full justify-center py-2.5 text-[13.5px]" disabled={busy}>
                      <I n="lock" className="h-4 w-4" sw={2} />
                      {busy ? 'Verifying…' : 'Enter command floor'}
                    </button>
                  </form>

                  <div className="mt-6">
                    <p className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-mist-500">
                      <span className="h-px flex-1 bg-ink-600" />
                      Demo accounts · password <b className="text-mist-300">cityeng2026</b>
                      <span className="h-px flex-1 bg-ink-600" />
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {QUICK.map((q) => (
                        <button
                          key={q.u}
                          type="button"
                          onClick={() => { setU(q.u); setP('cityeng2026'); setErr(''); }}
                          className={`rounded-md border px-2.5 py-2 text-left text-[11.5px] font-semibold transition hover:border-flare-500/70 hover:text-mist-50 ${
                            q.u === 'admin'
                              ? 'border-flare-500/50 bg-flare-500/10 text-flare-300 hover:bg-flare-500/15'
                              : 'border-ink-600 bg-ink-800/70 text-mist-200 hover:border-cyanx-500/70'
                          }`}
                        >
                          {q.label}
                          <span className="mt-0.5 block font-mono text-[10px] font-normal text-mist-500">@{q.u}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : suDone ? (
                <div className="py-4 text-center">
                  <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-greenx-500/50 bg-greenx-500/10 text-greenx-500">
                    <I n="checkc" className="h-7 w-7" sw={1.8} />
                  </span>
                  <h2 className="font-display text-[24px] font-bold uppercase leading-tight tracking-wide text-mist-50">
                    Request submitted
                  </h2>
                  <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-mist-400">
                    Your account is now <b className="text-amberx-400">pending administrator verification</b>.
                    You will be able to sign in once the administrator approves your request.
                  </p>
                  <button className="btn btn-ghost mx-auto mt-5" onClick={() => { setMode('signin'); setSuDone(false); }}>
                    <I n="out" className="h-4 w-4" />
                    Back to sign-in
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.26em] text-cyanx-400">Access request</p>
                  <h2 className="mt-1.5 font-display text-[28px] font-bold uppercase leading-none tracking-wide text-mist-50">
                    Request an account
                  </h2>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-mist-400">
                    Submit your details — the system administrator reviews every request and only
                    verified accounts may enter the command floor.
                  </p>

                  <form onSubmit={submitSignup} className="mt-5 space-y-3">
                    <div>
                      <label className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Full name</label>
                      <input className="field" placeholder="e.g. Juan D. Cruz" value={suName} onChange={(e) => { setSuName(e.target.value); setSuErr(''); }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Username</label>
                        <input className="field font-mono" placeholder="jcruz" value={suUser} onChange={(e) => { setSuUser(e.target.value); setSuErr(''); }} />
                      </div>
                      <div>
                        <label className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Designation</label>
                        <input className="field" placeholder="e.g. Division OIC" value={suTitle} onChange={(e) => { setSuTitle(e.target.value); setSuErr(''); }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Password</label>
                        <input className="field" type="password" value={suPass} onChange={(e) => { setSuPass(e.target.value); setSuErr(''); }} />
                      </div>
                      <div>
                        <label className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Confirm password</label>
                        <input className="field" type="password" value={suPass2} onChange={(e) => { setSuPass2(e.target.value); setSuErr(''); }} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Division / team</label>
                      <select className="field" value={suDiv} onChange={(e) => setSuDiv(e.target.value)}>
                        {DIVISIONS.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                        {CROSS_UNITS.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {suErr && (
                      <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] leading-snug text-redx-400">
                        <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
                        {suErr}
                      </p>
                    )}

                    <button type="submit" className="btn btn-primary w-full justify-center py-2.5 text-[13.5px]" style={{ background: '#2fa9d6' }}>
                      <I n="send" className="h-4 w-4" sw={2} />
                      Submit for verification
                    </button>
                    <p className="text-center font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">
                      Administrator approval required before first sign-in
                    </p>
                  </form>
                </>
              )}
            </div>
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-mist-600">
              Sessions are written to the custody trail · unauthorized access is logged
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
