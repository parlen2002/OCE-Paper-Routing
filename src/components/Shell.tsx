import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Role } from '../lib/core';
import { MOODS, seasonalMood, timeAgo } from '../lib/core';
import { useStore, type Page } from '../lib/store';
import { I, Seal, Avatar, type IconName } from './ui';

const NAV: { page: Page; label: string; icon: IconName; roles?: Role[] }[] = [
  { page: 'dashboard', label: 'Command View', icon: 'grid' },
  { page: 'board', label: 'Tracker Board', icon: 'board', roles: ['supervisor', 'admin', 'division', 'moderator', 'operator'] },
  { page: 'myboard', label: 'My Work Board', icon: 'board', roles: ['employee', 'joborder'] },
  { page: 'personnel', label: 'Personnel Boards', icon: 'users', roles: ['supervisor', 'admin', 'moderator', 'operator'] },
  { page: 'messages', label: 'Messages', icon: 'send' },
  { page: 'documents', label: 'Documents', icon: 'file' },
  { page: 'divisions', label: 'Divisions', icon: 'sitemap' },
  { page: 'activity', label: 'Activity Log', icon: 'pulse', roles: ['supervisor', 'admin', 'moderator', 'operator'] },
  { page: 'users', label: 'Users & Accounts', icon: 'users', roles: ['admin'] },
  { page: 'userlogs', label: 'User History & Logs', icon: 'history', roles: ['admin'] },
  { page: 'customize', label: 'Customize', icon: 'wrench', roles: ['admin'] },
];

const NOTIF_META: Record<string, { icon: IconName; color: string }> = {
  new: { icon: 'plus', color: '#56c8f0' },
  route: { icon: 'route', color: '#ff8a4c' },
  move: { icon: 'send', color: '#f5b924' },
  complete: { icon: 'checkc', color: '#45d483' },
  account: { icon: 'user', color: '#a78bfa' },
};

export function Shell({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const { user, ui, go, visibleNotifs, unread, markAllRead, markRead, openDrawer, logout, resetDemo, setNewOpen, setProfileOpen, msgUnreadTotal, custom, theme } = store;
  const [bellOpen, setBellOpen] = useState(false);
  const prevUnread = useRef(unread);

  useEffect(() => {
    document.title =
      unread > 0
        ? `(${unread}) OCE Flow — Office of the City Engineer, Puerto Princesa`
        : 'OCE Flow — Office of the City Engineer, Puerto Princesa';
  }, [unread]);

  useEffect(() => { prevUnread.current = unread; }, [unread]);

  const openPapers = useMemo(() => store.visiblePapers.filter((p) => p.stage !== 'completed').length, [store.visiblePapers]);

  if (!user) return null;

  return (
    <div className="bg-blueprint min-h-screen" style={{ backgroundColor: theme.mood.tones[0] }}>
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col border-r border-ink-700/70 bg-ink-900/95 backdrop-blur">
        <div className="flex items-center gap-2.5 border-b border-ink-700/70 px-4 py-4">
          <Seal className="h-9 w-9" />
          <div>
            <p className="font-display text-[15px] font-bold uppercase leading-tight tracking-wider text-mist-50">OCE <span className="text-flare-400">Flow</span></p>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-mist-500">{custom.orgName || 'Office of the City Engineer · PPC'}</p>
          </div>
        </div>

        <div className="px-3.5 pt-4">
          <button className="btn btn-primary w-full justify-center" onClick={() => setNewOpen(true)}>
            <I n="plus" className="h-4 w-4" sw={2.2} /> New paperwork
          </button>
        </div>

        <nav className="scroll-slim mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          <p className="px-2 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-mist-600">Command</p>
          {NAV.filter((n) => !n.roles || n.roles.includes(user.role)).map((n) => {
            const active = ui.page === n.page;
            return (
              <button key={n.page} onClick={() => go(n.page)}
                className={`group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${active ? 'bg-ink-800 text-mist-50' : 'text-mist-400 hover:bg-ink-850 hover:text-mist-100'}`}>
                <span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-flare-500 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                <I n={n.icon} className={`h-[17px] w-[17px] ${active ? 'text-flare-400' : 'text-mist-500 group-hover:text-mist-300'}`} />
                {n.label}
                {n.page === 'board' && (
                  <span className="ml-auto rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyanx-400 tabular">{openPapers}</span>
                )}
                {n.page === 'messages' && msgUnreadTotal > 0 && (
                  <span className="anim-badge ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-flare-500 px-1 font-mono text-[10px] font-bold ink-flare tabular">{msgUnreadTotal}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-ink-700/70 p-3">
          <div className="flex items-center gap-2.5 rounded-md bg-ink-850 px-2.5 py-2.5">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-mist-100">{user.name}</p>
              <p className="truncate font-mono text-[9.5px] uppercase tracking-wider text-mist-500">{user.shortTitle ?? user.title}</p>
            </div>
            <button onClick={() => setProfileOpen(true)} title="My profile — change password" className="rounded p-1.5 text-mist-500 transition hover:bg-ink-700 hover:text-cyanx-400">
              <I n="user" className="h-4 w-4" />
            </button>
            <button onClick={logout} title="Sign out" className="rounded p-1.5 text-mist-500 transition hover:bg-ink-700 hover:text-redx-400">
              <I n="out" className="h-4 w-4" />
            </button>
          </div>
          <button onClick={resetDemo} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-mist-600 transition hover:text-cyanx-400">
            <I n="refresh" className="h-3 w-3" /> Reset demo data
          </button>
        </div>
      </aside>

      <div className="pl-[228px]">
        <header className="sticky top-0 z-30 flex h-[58px] items-center gap-4 border-b border-ink-700/70 bg-ink-950/85 px-5 backdrop-blur">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-mist-600">Office of the City Engineer / {ui.page}</p>
            <h2 className="truncate font-display text-[19px] font-bold uppercase leading-none tracking-wider text-mist-50">
              {NAV.find((n) => n.page === ui.page)?.label ?? 'OCE Flow'}
            </h2>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="relative">
              <button onClick={() => setBellOpen((o) => !o)}
                className={`relative rounded-md border p-2.5 transition ${bellOpen ? 'border-cyanx-500/60 bg-ink-800 text-cyanx-400' : 'border-ink-600 bg-ink-850 text-mist-300 hover:text-cyanx-400'}`}
                title="Notifications">
                <I n="bell" className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span key={unread} className="anim-badge absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-flare-500 px-1 font-mono text-[10px] font-bold ink-flare">{unread}</span>
                )}
              </button>

              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  <div className="anim-pop absolute right-0 top-[calc(100%+10px)] z-50 w-[min(400px,90vw)] overflow-hidden rounded-lg border border-ink-600 bg-ink-850 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)]">
                    <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
                      <p className="font-display text-[15px] font-bold uppercase tracking-wider text-mist-100">
                        Signals <span className="ml-1 font-mono text-[10px] font-normal text-mist-500">{visibleNotifs.length}</span>
                      </p>
                      <button onClick={markAllRead} className="rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyanx-400 transition hover:bg-ink-800">Mark all read</button>
                    </div>
                    <div className="scroll-slim max-h-[380px] overflow-y-auto">
                      {visibleNotifs.length === 0 && (
                        <div className="px-4 py-10 text-center">
                          <p className="font-display text-base font-semibold uppercase tracking-wide text-mist-400">All clear</p>
                          <p className="mt-1 text-[12px] text-mist-600">No signals for your scope yet.</p>
                        </div>
                      )}
                      {visibleNotifs.map((n) => {
                        const isUnread = !n.readBy.includes(user.id);
                        const meta = NOTIF_META[n.kind] ?? NOTIF_META.move;
                        return (
                          <button key={n.id}
                            onClick={() => { markRead(n.id); setBellOpen(false); if (n.docId) openDrawer(n.docId); }}
                            className={`flex w-full items-start gap-3 border-b border-ink-700/60 px-4 py-3 text-left transition hover:bg-ink-800/70 ${isUnread ? 'bg-ink-800/40' : ''}`}>
                            <span className="mt-0.5" style={{ color: meta.color }}><I n={meta.icon} className="h-4 w-4" sw={2} /></span>
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[12.5px] leading-snug ${isUnread ? 'font-semibold text-mist-100' : 'text-mist-300'}`}>{n.text}</span>
                              <span className="mt-0.5 block font-mono text-[10px] text-mist-500">{n.ref ? `${n.ref} · ` : ''}{timeAgo(n.at)}</span>
                            </span>
                            {isUnread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flare-400" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="border-t border-ink-700 px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-mist-600">Taskbar alerts follow your permission grant</p>
                  </div>
                </>
              )}
            </div>

            <div className="hidden items-center gap-2 rounded-md border border-ink-600 bg-ink-850 py-1 pl-1 pr-3 sm:flex">
              <Avatar name={user.name} size="sm" />
              <div className="leading-tight">
                <p className="text-[12px] font-bold text-mist-100">{user.name}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-mist-500">{user.title}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 px-5 py-6">{children}</main>
      </div>

      {ui.profileOpen && <ProfileModal />}
    </div>
  );
}

const ACCENT_SWATCHES = ['#ff6b1c', '#56c8f0', '#2dd4bf', '#f5b924', '#45d483', '#f4645c', '#a78bfa'];
const ACCENT2_SWATCHES = ['#56c8f0', '#ff6b1c', '#45e0cd', '#fbc94a', '#8adcf8', '#f8837c', '#6cd1f4'];

function ProfileModal() {
  const { user, db, ui, setProfileOpen, changePassword, requestPasswordReset, updateProfile, theme, themeDraft, themeDirty, previewTheme, clearThemePreview, saveTheme } = useStore();
  const meUser0 = user ? db.users.find((x) => x.id === user.id) ?? user : null;
  /* profile details (self-service) */
  const [pName, setPName] = useState(meUser0?.name ?? '');
  const [pTitle, setPTitle] = useState(meUser0?.title ?? '');
  const [pPhone, setPPhone] = useState(meUser0?.phone ?? '');
  const [pEmail, setPEmail] = useState(meUser0?.email ?? '');
  const [pAddress, setPAddress] = useState(meUser0?.address ?? '');
  const [pErr, setPErr] = useState('');
  /* password */
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  if (!user) return null;
  const meUser = db.users.find((x) => x.id === user.id) ?? user;
  const close = () => setProfileOpen(false);

  const submit = () => {
    setErr('');
    if (next !== confirm) return setErr('New password and confirmation do not match.');
    const reason = changePassword(cur, next);
    if (reason) return setErr(reason);
    setCur(''); setNext(''); setConfirm('');
  };

  const saveProfile = () => {
    setPErr('');
    const reason = updateProfile({ name: pName, title: pTitle, phone: pPhone, email: pEmail, address: pAddress });
    if (reason) return setPErr(reason);
    if (themeDirty) saveTheme(); // commit any previewed theme along with the details
  };

  return (
    <div className="fixed inset-0 z-[66] flex items-start justify-center overflow-y-auto p-4 sm:p-12">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-[2px]" onClick={close} />
      <div className="anim-pop relative w-full max-w-md rounded-xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.22em] text-flare-400">My profile</p>
            <h3 className="truncate font-display text-[22px] font-bold uppercase leading-tight tracking-wide text-mist-50">{user.name}</h3>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-mist-500">@{user.username} · {user.title}</p>
          </div>
          <button onClick={close} className="ml-auto rounded-md border border-ink-600 p-2 text-mist-400 transition hover:border-redx-500/60 hover:text-redx-400">
            <I n="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {/* profile details */}
          <p className="flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cyanx-400">
            <I n="user" className="h-3 w-3" sw={2.2} /> Profile details
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Full name</span>
              <input className="field" value={pName} onChange={(e) => { setPName(e.target.value); setPErr(''); }} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Position / designation</span>
              <input className="field" value={pTitle} onChange={(e) => setPTitle(e.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Phone number</span>
              <input className="field font-mono" placeholder="e.g. 0917 000 0000" value={pPhone} onChange={(e) => setPPhone(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Email address</span>
              <input className="field font-mono" placeholder="name@office.gov.ph" value={pEmail} onChange={(e) => { setPEmail(e.target.value); setPErr(''); }} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Home address</span>
            <input className="field" placeholder="Street, barangay, city" value={pAddress} onChange={(e) => setPAddress(e.target.value)} />
          </label>
          {pErr && (
            <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
              <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />{pErr}
            </p>
          )}
          <button className="btn btn-primary w-full justify-center" onClick={saveProfile}>
            <I n="check" className="h-4 w-4" sw={2.2} /> Save profile{themeDirty ? ' & theme' : ''}
          </button>

          {/* personal theme — everyone can re-skin their own view */}
          <div className="border-t border-ink-700 pt-3">
            <p className="mb-2.5 flex flex-wrap items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-tealx-400">
              <I n="pulse" className="h-3 w-3" sw={2.2} /> My theme
              {theme.isPersonal && (
                <span className="rounded-sm bg-tealx-500/12 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-tealx-400">personal</span>
              )}
              {theme.seasonal && theme.autoSeason && !themeDraft.themeTone && (
                <span className="rounded-sm bg-amberx-500/12 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-amberx-400">
                  {MOODS[theme.seasonal]?.label} · auto
                </span>
              )}
              {themeDirty && (
                <span className="anim-pop inline-flex items-center gap-1 rounded-sm bg-flare-500/15 px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-flare-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flare-400" /> preview — not saved
                </span>
              )}
            </p>

            <div className="mb-2.5">
              <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Background mood · click to preview</span>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(MOODS).map(([id, m]) => {
                  const on = theme.toneId === id && !!themeDraft.themeTone;
                  return (
                    <button
                      key={id}
                      onClick={() => previewTheme({ themeTone: id })}
                      title={`Preview ${m.label}${m.note ? ` — ${m.note}` : ''} (save to keep)`}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition active:scale-[0.96] ${
                        on ? 'border-tealx-500/70 bg-tealx-500/12' : 'border-ink-600 bg-ink-850 hover:border-ink-500'
                      }`}
                    >
                      <span className="h-6 w-8 shrink-0 rounded" style={{ background: `linear-gradient(135deg, ${m.tones[1]}, ${m.tones[3]})` }} />
                      <span className="min-w-0">
                        <span className={`block truncate font-mono text-[9px] font-bold uppercase tracking-wider ${on ? 'text-tealx-400' : 'text-mist-300'}`}>{m.label}</span>
                        {m.seasonal && <span className="block font-mono text-[7.5px] uppercase tracking-wider text-amberx-400/80">{m.note}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Primary accent</span>
                <div className="flex flex-wrap items-center gap-1">
                  {ACCENT_SWATCHES.map((c) => (
                    <button key={c} onClick={() => previewTheme({ themeAccent: c })}
                      className={`h-5 w-5 rounded-full border transition hover:scale-110 ${theme.accent === c ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }} title={`Preview ${c}`} />
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1 block font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-mist-600">Secondary accent</span>
                <div className="flex flex-wrap items-center gap-1">
                  {ACCENT2_SWATCHES.map((c) => (
                    <button key={c} onClick={() => previewTheme({ themeAccent2: c })}
                      className={`h-5 w-5 rounded-full border transition hover:scale-110 ${theme.accent2 === c ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c }} title={`Preview ${c}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => previewTheme({ autoSeason: !themeDraft.autoSeason })}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider transition ${
                  themeDraft.autoSeason ? 'border-amberx-500/60 bg-amberx-500/12 text-amberx-400' : 'border-ink-600 bg-ink-850 text-mist-400 hover:text-mist-200'
                }`}
                title="Automatically switch to the current season's mood"
              >
                <I n="refresh" className="h-3 w-3" sw={2.4} /> Auto seasonal {themeDraft.autoSeason ? 'on' : 'off'}
              </button>
              <button
                onClick={() => previewTheme({ themeTone: undefined, themeAccent: undefined, themeAccent2: undefined })}
                className="btn btn-ghost px-2.5 py-1.5 text-[10.5px]"
                title="Preview the office default theme"
              >
                Office default
              </button>
              {themeDirty && (
                <button
                  onClick={clearThemePreview}
                  className="btn btn-ghost px-2.5 py-1.5 text-[10.5px] hover:border-redx-500/60 hover:text-redx-400"
                  title="Discard the preview and go back to your saved theme"
                >
                  <I n="x" className="h-3 w-3" sw={2.4} /> Revert
                </button>
              )}
            </div>
            <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-mist-600">
              Preview instantly — press <b className="text-tealx-400">Save profile</b> to keep it. Applies only to your view.
            </p>
          </div>

          <div className="border-t border-ink-700 pt-3">
            <p className="mb-3 flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-flare-400">
              <I n="lock" className="h-3 w-3" sw={2.2} /> Password
            </p>
          </div>
          <label className="block">
            <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Current password</span>
            <input type="password" className="field font-mono" value={cur} onChange={(e) => { setCur(e.target.value); setErr(''); }} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">New password</span>
              <input type="password" className="field font-mono" value={next} onChange={(e) => { setNext(e.target.value); setErr(''); }} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-500">Confirm new</span>
              <input type="password" className="field font-mono" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErr(''); }} />
            </label>
          </div>

          {err && (
            <p className="flex items-start gap-2 rounded-md border border-redx-500/40 bg-redx-500/10 px-3 py-2 text-[12px] text-redx-400">
              <I n="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />{err}
            </p>
          )}

          <button className="btn btn-primary w-full justify-center" onClick={submit} disabled={!cur || !next || !confirm}>
            <I n="check" className="h-4 w-4" sw={2.2} /> Update password
          </button>

          <div className="rounded-md border border-ink-700 bg-ink-850/70 px-3.5 py-3">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mist-400">Forgot your password?</p>
            {meUser.passwordResetAt ? (
              <p className="mt-1.5 flex items-start gap-2 text-[11.5px] leading-relaxed text-amberx-400">
                <I n="clock" className="mt-0.5 h-3.5 w-3.5 shrink-0" sw={2} />
                Reset request sent {timeAgo(meUser.passwordResetAt)} — the program admin will verify it and set your password to OCE@2026.
              </p>
            ) : (
              <>
                <p className="mt-1 text-[11.5px] leading-relaxed text-mist-500">
                  Send a request to the program admin. Once verified, your password is reset to the default <b className="font-mono text-mist-300">OCE@2026</b> — change it again after signing in.
                </p>
                <button className="btn btn-ghost mt-2 w-full justify-center" onClick={requestPasswordReset}>
                  <I n="refresh" className="h-3.5 w-3.5" sw={2.2} /> Request admin password reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
