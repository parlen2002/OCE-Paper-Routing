import React, { useState } from 'react';
import { CROSS_UNITS, DIVISIONS } from '../lib/core';
import { useStore } from '../lib/store';
import { I, Seal, SearchSelect, type SearchOption } from './ui';

const QUICK = [
  { u: 'admin', label: 'System Admin' },
  { u: 'agrande', label: 'City Engineer' },
  { u: 'jsergio', label: 'Asst. City Engineer' },
  { u: 'bsalonga', label: 'Moderator' },
  { u: 'rdomingo', label: 'Construction Head' },
  { u: 'kvillanueva', label: 'Employee' },
  { u: 'vortega', label: 'Operator' },
];

function wrapHeading(s: string): string[] {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 14 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export function Login() {
  const { login, signup, requestForgotPassword, custom } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(0);

  const [suName, setSuName] = useState('');
  const [suUser, setSuUser] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPass2, setSuPass2] = useState('');
  const [suDiv, setSuDiv] = useState('admin');
  const [suTitle, setSuTitle] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suAddress, setSuAddress] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suErr, setSuErr] = useState('');
  const [suDone, setSuDone] = useState(false);

  const [fpUser, setFpUser] = useState('');
  const [fpContact, setFpContact] = useState('');
  const [fpErr, setFpErr] = useState('');
  const [fpDone, setFpDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = login(u, p);
    if (reason) { setErr(reason); setShake((s) => s + 1); }
  };

  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (suPass !== suPass2) return setSuErr('Passwords do not match.');
    const reason = signup({ name: suName, username: suUser, password: suPass, divisionId: suDiv, title: suTitle, phone: suPhone, address: suAddress, email: suEmail });
    if (reason) return setSuErr(reason);
    setSuDone(true);
  };

  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = requestForgotPassword(fpUser, fpContact);
    if (reason) return setFpErr(reason);
    setFpDone(true);
  };

  return (
    <div className="bg-blueprint flex min-h-screen items-center justify-center p-6">
      <div className="grid w-full max-w-[880px] items-stretch gap-5 lg:grid-cols-[1fr_1.02fr]">
        {/* left: brand box — seal, tagline, photo, description */}
        <div className="anim-fade-up relative flex flex-col overflow-hidden rounded-xl border border-ink-600 bg-ink-900/80 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-flare-500 via-flare-400 to-cyanx-500" />
          <div className="flex flex-1 flex-col p-7">
            <div className="flex items-center gap-3">
              <Seal className="h-12 w-12 shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-[22px] font-bold uppercase leading-none tracking-wider text-mist-50">
                  OCE <span className="text-flare-500">Flow</span>
                </p>
                <p className="mt-1 truncate font-mono text-[8.5px] uppercase tracking-[0.22em] text-mist-500">{custom.tagline || 'Paperwork flow command'}</p>
              </div>
            </div>

            {custom.loginImage && (
              <img src={custom.loginImage} alt="Office" className="mt-5 h-36 w-full rounded-lg border border-ink-700 object-cover shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]" />
            )}

            <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-flare-400">City Government of Puerto Princesa</p>
            <h1 className="mt-1.5 font-display text-[32px] font-bold uppercase leading-[1.02] tracking-wide text-mist-50">
              {wrapHeading(custom.orgName || 'Office of the City Engineer').map((line, i) => (
                <span key={i}>{i > 0 && <br />}{line}</span>
              ))}
            </h1>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mist-400">
              {custom.description || 'Every paper is tracked desk to desk — nine divisions, the Inspectorate Team, I.T. Section, Documentation & Monitoring, Subaybayan and the two executive desks, on one custody trail.'}
            </p>
          </div>
          <div className="flex items-center gap-2 border-t border-ink-700/70 bg-ink-950/40 px-7 py-3">
            <I n="lock" className="h-3 w-3 shrink-0 text-mist-600" sw={2.2} />
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-mist-600">Authorized personnel only · all activity is logged</p>
          </div>
        </div>

        {/* right: auth card */}
        <div key={shake} className={`flex ${shake ? 'anim-shake' : 'anim-fade-up'}`} style={{ animationDelay: '90ms' }}>
          <div className="w-full self-center rounded-xl border border-ink-600 bg-ink-900/90 p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
            {mode === 'signin' && (
              <form onSubmit={submit}>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-flare-400">Restricted system</p>
                <h2 className="mt-1 font-display text-[30px] font-bold uppercase leading-tight tracking-wide text-mist-50">Sign in to the floor</h2>
                <div className="mt-5 space-y-3.5">
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Username</span>
                    <input className="field font-mono" autoFocus value={u} onChange={(e) => { setU(e.target.value); setErr(''); }} placeholder="e.g. agrande" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Password</span>
                    <input type="password" className="field font-mono" value={p} onChange={(e) => { setP(e.target.value); setErr(''); }} placeholder="••••••••" />
                  </label>
                </div>
                {err && (
                  <p className="mt-3 flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
                    <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />{err}
                  </p>
                )}
                <button type="submit" className="btn btn-primary mt-5 w-full justify-center py-2.5 text-[14px]">
                  <I n="lock" className="h-4 w-4" sw={2} /> Enter OCE Flow
                </button>
                <div className="mt-3 flex items-center justify-between">
                  <button type="button" onClick={() => { setMode('forgot'); setFpUser(u); setFpErr(''); setFpDone(false); }} className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyanx-400 transition hover:text-cyanx-300">
                    Forgot password?
                  </button>
                  <button type="button" onClick={() => { setMode('signup'); setSuErr(''); setSuDone(false); }} className="font-mono text-[10px] uppercase tracking-[0.16em] text-flare-400 transition hover:text-flare-300">
                    Request an account →
                  </button>
                </div>
                <div className="mt-5 border-t border-ink-700 pt-4">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-mist-600">Demo quick access · password cityeng2026</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {QUICK.map((qk) => (
                      <button key={qk.u} type="button" onClick={() => { setU(qk.u); setP('cityeng2026'); setErr(''); }}
                        className={`rounded-md border px-2.5 py-2 text-left text-[11.5px] font-semibold transition hover:border-flare-500/70 hover:text-mist-50 ${qk.u === 'admin' ? 'border-flare-500/50 bg-flare-500/10 text-flare-300 hover:bg-flare-500/15' : 'border-ink-600 bg-ink-800/70 text-mist-200 hover:border-cyanx-500/70'}`}>
                        {qk.label}
                        <span className="mt-0.5 block font-mono text-[10px] font-normal text-mist-500">@{qk.u}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={submitForgot}>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyanx-400">Account recovery</p>
                <h2 className="mt-1 font-display text-[30px] font-bold uppercase leading-tight tracking-wide text-mist-50">Forgot password</h2>
                {fpDone ? (
                  <div className="anim-pop mt-5 rounded-md border border-greenx-500/40 bg-greenx-500/10 px-4 py-4 text-[12.5px] leading-relaxed text-greenx-500">
                    <p className="flex items-center gap-2 font-bold"><I n="checkc" className="h-4 w-4" sw={2} /> Request sent to the program admin</p>
                    <p className="mt-1.5 text-mist-300">Once verified, your password will be set to the default <b className="font-mono">OCE@2026</b>. Change it from your profile after signing in.</p>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-[12px] leading-relaxed text-mist-400">
                      Send a reset request to the program administrator. After verification, your password becomes the default <b className="font-mono text-mist-200">OCE@2026</b>.
                    </p>
                    <div className="mt-4 space-y-3.5">
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Your username</span>
                        <input className="field font-mono" autoFocus value={fpUser} onChange={(e) => { setFpUser(e.target.value); setFpErr(''); }} placeholder="e.g. kvillanueva" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Email or phone (helps verification)</span>
                        <input className="field" value={fpContact} onChange={(e) => setFpContact(e.target.value)} placeholder="Optional" />
                      </label>
                    </div>
                    {fpErr && (
                      <p className="mt-3 flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
                        <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />{fpErr}
                      </p>
                    )}
                    <button type="submit" className="btn btn-primary mt-5 w-full justify-center">
                      <I n="send" className="h-4 w-4" sw={2} /> Send reset request
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setMode('signin')} className="mt-4 w-full text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500 transition hover:text-mist-200">
                  ← Back to sign in
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={submitSignup}>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-flare-400">New personnel</p>
                <h2 className="mt-1 font-display text-[30px] font-bold uppercase leading-tight tracking-wide text-mist-50">Request an account</h2>
                {suDone ? (
                  <div className="anim-pop mt-5 rounded-md border border-greenx-500/40 bg-greenx-500/10 px-4 py-4 text-[12.5px] leading-relaxed text-greenx-500">
                    <p className="flex items-center gap-2 font-bold"><I n="checkc" className="h-4 w-4" sw={2} /> Request submitted</p>
                    <p className="mt-1.5 text-mist-300">The program administrator will verify your request. You can sign in once approved.</p>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-[12px] leading-relaxed text-mist-400">
                      Access level and role are assigned by the program administrator during verification.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Full name</span>
                        <input className="field" value={suName} onChange={(e) => { setSuName(e.target.value); setSuErr(''); }} placeholder="e.g. Juan Dela Cruz" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Username</span>
                        <input className="field font-mono" value={suUser} onChange={(e) => { setSuUser(e.target.value.toLowerCase()); setSuErr(''); }} placeholder="e.g. jdelacruz" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Designation</span>
                        <input className="field" value={suTitle} onChange={(e) => { setSuTitle(e.target.value); setSuErr(''); }} placeholder="e.g. Lineman II" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Password</span>
                        <input type="password" className="field font-mono" value={suPass} onChange={(e) => { setSuPass(e.target.value); setSuErr(''); }} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Confirm password</span>
                        <input type="password" className="field font-mono" value={suPass2} onChange={(e) => { setSuPass2(e.target.value); setSuErr(''); }} />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Division / team</span>
                        <SearchSelect
                          value={suDiv}
                          onChange={(v) => { setSuDiv(v); setSuErr(''); }}
                          options={[
                            ...DIVISIONS.map((d): SearchOption => ({ value: d.id, label: d.name, sub: d.code, group: 'Divisions' })),
                            ...CROSS_UNITS.map((d): SearchOption => ({ value: d.id, label: d.name, sub: d.code, group: 'Cross-division units' })),
                          ]}
                          width="w-full"
                          placeholder="Search division / team…"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Phone number</span>
                        <input className="field" value={suPhone} onChange={(e) => { setSuPhone(e.target.value); setSuErr(''); }} placeholder="e.g. 0917 555 0000" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Email address</span>
                        <input className="field" value={suEmail} onChange={(e) => { setSuEmail(e.target.value); setSuErr(''); }} placeholder="e.g. name@mail.com" />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-mist-400">Home address</span>
                        <input className="field" value={suAddress} onChange={(e) => { setSuAddress(e.target.value); setSuErr(''); }} placeholder="e.g. Purok 3, San Pedro, Puerto Princesa City" />
                      </label>
                    </div>
                    {suErr && (
                      <p className="mt-3 flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
                        <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />{suErr}
                      </p>
                    )}
                    <button type="submit" className="btn btn-primary mt-5 w-full justify-center">
                      <I n="send" className="h-4 w-4" sw={2} /> Submit for verification
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setMode('signin')} className="mt-4 w-full text-center font-mono text-[10px] uppercase tracking-[0.16em] text-mist-500 transition hover:text-mist-200">
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
