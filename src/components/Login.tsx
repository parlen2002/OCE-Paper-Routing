import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { ALL_UNITS, DIVISIONS, CROSS_UNITS } from '../lib/core';
import { I, Seal } from './ui';

const QUICK = [
  { u: 'admin', label: 'System Admin' },
  { u: 'agrande', label: 'City Engineer' },
  { u: 'jsergio', label: 'Asst. City Engineer' },
  { u: 'bsalonga', label: 'Moderator' },
  { u: 'rdomingo', label: 'Construction Head' },
  { u: 'kvillanueva', label: 'Employee' },
];

export function Login() {
  const { login, signup } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(0);

  const [suName, setSuName] = useState('');
  const [suUser, setSuUser] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPass2, setSuPass2] = useState('');
  const [suDiv, setSuDiv] = useState('const');
  const [suTitle, setSuTitle] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suAddress, setSuAddress] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suErr, setSuErr] = useState('');
  const [suDone, setSuDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = login(u, p);
    if (reason) {
      setErr(reason);
      setShake((s) => s + 1);
    }
  };

  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (suPass !== suPass2) return setSuErr('Passwords do not match.');
    const reason = signup({ name: suName, username: suUser, password: suPass, divisionId: suDiv, title: suTitle, phone: suPhone, address: suAddress, email: suEmail });
    if (reason) return setSuErr(reason);
    setSuDone(true);
  };

  return (
    <div className="bg-blueprint relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* ambient glows */}
      <div className="anim-glow pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyanx-500/10 blur-3xl" />
      <div className="anim-glow pointer-events-none absolute -right-20 bottom-6 h-80 w-80 rounded-full bg-flare-500/10 blur-3xl" style={{ animationDelay: '2s' }} />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-ink-600 bg-ink-900/90 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur lg:grid-cols-[1.05fr_1fr]">
        {/* left — identity */}
        <div className="relative hidden flex-col justify-between border-r border-ink-700 bg-ink-950/60 p-9 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <Seal className="h-14 w-14" />
              <div>
                <p className="font-display text-[26px] font-bold uppercase leading-none tracking-wider text-mist-50">
                  CEO <span className="text-flare-500">Flow</span>
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-mist-500">Paperwork flow command</p>
              </div>
            </div>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-flare-400">City Government of Puerto Princesa</p>
            <h1 className="mt-2 font-display text-[44px] font-bold uppercase leading-[0.98] tracking-wide text-mist-50">
              Office of the<br />City Engineer
            </h1>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-mist-400">
              Every paper is tracked desk to desk — nine divisions, the Inspectorate Team, I.T. Section,
              Documentation & Monitoring, Subaybayan and the two executive desks, on one custody trail.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: '15', l: 'Recipient desks' },
              { n: '5', l: 'Custody stages' },
              { n: '100%', l: 'Trail auditability' },
            ].map((s, i) => (
              <div key={s.l} className="anim-fade-up rounded-lg border border-ink-700 bg-ink-850/70 px-3 py-2.5" style={{ animationDelay: `${200 + i * 90}ms` }}>
                <p className="font-display text-[24px] font-bold leading-none text-cyanx-400">{s.n}</p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-mist-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* right — gate */}
        <div className="p-7 sm:p-9">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Seal className="h-10 w-10" />
            <div>
              <p className="font-display text-xl font-bold uppercase tracking-wider text-mist-50">CEO <span className="text-flare-500">Flow</span></p>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-mist-500">City Engineering · Puerto Princesa</p>
            </div>
          </div>

          <div className="mb-5 flex overflow-hidden rounded-md border border-ink-600">
            {([['signin', 'Sign in'], ['signup', 'Request account']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => { setMode(v); setErr(''); setSuErr(''); }}
                className={`flex-1 px-3 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-wider transition ${mode === v ? 'bg-flare-500/15 text-flare-400' : 'bg-ink-850 text-mist-500 hover:text-mist-200'}`}>
                {l}
              </button>
            ))}
          </div>

          {mode === 'signin' ? (
            <form onSubmit={submit} key={shake} className={shake ? 'anim-shake' : 'anim-fade-up'}>
              <p className="mb-4 font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Authorized personnel only</p>
              <label className="mb-3 block">
                <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Username</span>
                <input className="field font-mono" autoComplete="username" value={u} onChange={(e) => { setU(e.target.value); setErr(''); }} placeholder="e.g. agrande" />
              </label>
              <label className="mb-3 block">
                <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Password</span>
                <input className="field font-mono" type="password" autoComplete="current-password" value={p} onChange={(e) => { setP(e.target.value); setErr(''); }} placeholder="••••••••••" />
              </label>
              {err && (
                <p className="mb-3 flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
                  <I n="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />{err}
                </p>
              )}
              <button className="btn btn-primary w-full justify-center" type="submit" disabled={!u || !p}>
                <I n="check" className="h-4 w-4" sw={2.2} /> Enter the command floor
              </button>

              <div className="mt-5">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mist-600">Demo access · password cityeng2026</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {QUICK.map((q) => (
                    <button key={q.u} type="button" onClick={() => { setU(q.u); setP('cityeng2026'); setErr(''); }}
                      className={`rounded-md border px-2.5 py-2 text-left text-[11.5px] font-semibold transition hover:text-mist-50 ${q.u === 'admin' ? 'border-flare-500/50 bg-flare-500/10 text-flare-300 hover:bg-flare-500/15' : 'border-ink-600 bg-ink-800/70 text-mist-200 hover:border-cyanx-500/70'}`}>
                      {q.label}
                      <span className="mt-0.5 block font-mono text-[10px] font-normal text-mist-500">@{q.u}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : suDone ? (
            <div className="anim-pop rounded-lg border border-greenx-500/40 bg-greenx-500/[0.07] p-5 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-greenx-500/50 bg-greenx-500/15 text-greenx-500">
                <I n="checkc" className="h-6 w-6" sw={1.8} />
              </span>
              <p className="font-display text-[20px] font-bold uppercase tracking-wider text-mist-50">Request submitted</p>
              <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-mist-400">
                Your account is pending administrator verification. You'll be able to sign in once the program admin approves it.
              </p>
              <button className="btn btn-ghost mx-auto mt-4" onClick={() => { setMode('signin'); setSuDone(false); }}>Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={submitSignup} className="anim-fade-up space-y-3">
              <p className="font-display text-[22px] font-bold uppercase tracking-wider text-mist-50">Request an account</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Full name *</span>
                  <input className="field" value={suName} onChange={(e) => { setSuName(e.target.value); setSuErr(''); }} placeholder="e.g. Juan Dela Cruz" />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Username *</span>
                  <input className="field font-mono" value={suUser} onChange={(e) => { setSuUser(e.target.value); setSuErr(''); }} placeholder="e.g. jdelacruz" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Password *</span>
                  <input className="field font-mono" type="password" value={suPass} onChange={(e) => { setSuPass(e.target.value); setSuErr(''); }} />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Confirm *</span>
                  <input className="field font-mono" type="password" value={suPass2} onChange={(e) => { setSuPass2(e.target.value); setSuErr(''); }} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Division / team *</span>
                  <select className="field" value={suDiv} onChange={(e) => { setSuDiv(e.target.value); setSuErr(''); }}>
                    {DIVISIONS.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    {CROSS_UNITS.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Designation</span>
                  <input className="field" value={suTitle} onChange={(e) => { setSuTitle(e.target.value); setSuErr(''); }} placeholder="e.g. Project Engineer I" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Phone number</span>
                  <input className="field font-mono" value={suPhone} onChange={(e) => { setSuPhone(e.target.value); setSuErr(''); }} placeholder="e.g. 0917 000 0000" />
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Email address</span>
                  <input className="field font-mono" type="email" value={suEmail} onChange={(e) => { setSuEmail(e.target.value); setSuErr(''); }} placeholder="e.g. name@ppc.gov.ph" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Home address</span>
                <input className="field" value={suAddress} onChange={(e) => { setSuAddress(e.target.value); setSuErr(''); }} placeholder="e.g. Purok 3, Brgy. San Pedro, Puerto Princesa City" />
              </label>
              <p className="flex items-start gap-2 rounded-md border border-ink-700 bg-ink-850/70 px-3 py-2.5 font-mono text-[8.5px] uppercase tracking-[0.14em] leading-relaxed text-mist-500">
                <I n="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyanx-400" sw={2} />
                Access level and role are assigned by the program admin during verification — every request starts as division staff.
              </p>
              {suErr && (
                <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
                  <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />{suErr}
                </p>
              )}
              <button className="btn btn-primary w-full justify-center" type="submit" disabled={!suName || !suUser || !suPass || !suPass2}>
                <I n="send" className="h-4 w-4" sw={2} /> Submit for verification
              </button>
              <p className="text-center font-mono text-[9px] uppercase tracking-[0.16em] text-mist-600">
                The program admin reviews every request before access is granted
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
