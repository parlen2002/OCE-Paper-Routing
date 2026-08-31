import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Activity, Attachment, DB, Kind, Notif, Paper, Priority, Role, Stage, SysLog, User } from './core';
import { deriveActivities, deriveLogs, divById, freshSeed, stageMeta, uid, INITIAL_USERS } from './core';

const LS_KEY = 'ppc-ceoflow-v11';

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 11 && Array.isArray(d.papers) && Array.isArray(d.notifs) && Array.isArray(d.users)) {
        if (!Array.isArray(d.logs)) d.logs = deriveLogs(d.papers);
        return d as DB;
      }
    }
  } catch { /* reseed */ }
  return freshSeed();
}

export type Page =
  | 'dashboard' | 'board' | 'myboard' | 'personnel' | 'documents' | 'divisions'
  | 'activity' | 'users' | 'userlogs';

export interface ReportPreset { presetDiv?: string; paperId?: string; }

export interface UIState {
  page: Page;
  drawerId: string | null;
  newOpen: boolean;
  reportOpen: boolean;
  reportPreset: ReportPreset | null;
  profileOpen: boolean;
  search: string;
  divFilter: string;
  viewer: { docId: string; attId: string } | null;
}

export interface Toast { id: string; kind: 'ok' | 'warn' | 'err'; text: string; }

interface StoreCtx {
  db: DB;
  user: User | null;
  toasts: Toast[];
  ui: UIState;
  activities: Activity[];
  visiblePapers: Paper[];
  visibleNotifs: Notif[];
  unread: number;
  canEdit: (p: Paper) => boolean;
  userUnitId: string | null;
  employeesOf: (unitId: string | undefined) => User[];
  login: (username: string, password: string) => string | null;
  signup: (input: { name: string; username: string; password: string; divisionId: string; title: string; role?: Role }) => string | null;
  approveUser: (id: string) => void;
  denyUser: (id: string) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  changePassword: (current: string, next: string) => string | null;
  requestPasswordReset: () => void;
  approvePasswordReset: (userId: string) => void;
  logout: () => void;
  resetDemo: () => void;
  go: (page: Page) => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  setNewOpen: (open: boolean) => void;
  setReportOpen: (open: boolean, preset?: ReportPreset | null) => void;
  setProfileOpen: (open: boolean) => void;
  setSearch: (s: string) => void;
  setDivFilter: (s: string) => void;
  setViewer: (v: UIState['viewer']) => void;
  createPaper: (input: {
    title: string; kind: Kind; priority: Priority; origin: string; recipientIds: string[];
    dueAt?: number; remarks?: string; attachments: Attachment[]; assigneeIds?: string[];
  }) => void;
  moveStage: (id: string, stage: Stage, note?: string, employeeIds?: string[]) => void;
  routePaper: (id: string, toDivisionId: string, note?: string) => void;
  addNote: (id: string, text: string) => void;
  addAttachments: (id: string, atts: Attachment[]) => void;
  removeAttachment: (docId: string, attId: string) => void;
  setProgress: (id: string, pct: number) => void;
  assignPaper: (id: string, ids: string[]) => void;
  submitToHead: (id: string) => void;
  returnToEmployee: (id: string) => void;
  deletePaper: (id: string) => void;
  updatePaper: (id: string, patch: Partial<Paper>) => void;
  ackPaper: (id: string) => void;
  markAllRead: () => void;
  markRead: (notifId: string) => void;
  pushToast: (kind: Toast['kind'], text: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);
export const useStore = (): StoreCtx => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
};

function fireBrowser(title: string, body: string) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(title, { body, tag: uid() });
  } catch { /* unsupported */ }
}

const withLog = (d: DB, entry: Omit<SysLog, 'id' | 'at'>): DB => ({
  ...d,
  logs: [{ ...entry, id: uid(), at: Date.now() }, ...d.logs].slice(0, 600),
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDb);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ui, setUi] = useState<UIState>({
    page: 'dashboard', drawerId: null, newOpen: false, reportOpen: false, reportPreset: null,
    profileOpen: false, search: '', divFilter: 'all', viewer: null,
  });

  const user = db.users.find((x) => x.id === db.session) ?? null;

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch { /* quota */ }
  }, [db]);

  useEffect(() => {
    if (user) {
      setUi((u) => ({
        ...u,
        page: user.role === 'employee' || user.role === 'joborder' ? 'myboard'
          : user.role === 'division' || user.role === 'moderator' ? 'board' : 'dashboard',
        divFilter: 'all',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.session]);

  const activities = useMemo(() => deriveActivities(db.papers), [db.papers]);

  const visiblePapers = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'moderator')
      return [...db.papers].sort((a, b) => b.updatedAt - a.updatedAt);
    if (user.role === 'employee' || user.role === 'joborder')
      return db.papers.filter((p) => (p.assignees ?? []).includes(user.id)).sort((a, b) => b.updatedAt - a.updatedAt);
    const mine = (p: Paper) =>
      p.divisionId === user.divisionId || p.intendedId === user.divisionId ||
      (p.recipientIds ?? []).includes(user.divisionId ?? '') ||
      p.custody.some((e) => e.toDivisionId === user.divisionId || e.fromDivisionId === user.divisionId);
    return db.papers.filter(mine).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.papers, user]);

  const visibleNotifs = useMemo(() => {
    if (!user) return [];
    const vis = db.notifs.filter((n) =>
      user.role === 'admin' || user.role === 'supervisor' || user.role === 'moderator'
        ? true
        : (n.scope.type === 'division' && n.scope.divisionId === user.divisionId) || n.targetUserId === user.id
    );
    return [...vis].sort((a, b) => b.at - a.at);
  }, [db.notifs, user]);

  const unread = useMemo(
    () => (user ? visibleNotifs.filter((n) => !n.readBy.includes(user.id)).length : 0),
    [visibleNotifs, user]
  );

  const pushToast = (kind: Toast['kind'], text: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  const pushNotif = (d: DB, n: Omit<Notif, 'id' | 'at' | 'readBy'>, currentUser: User): DB => {
    const notif: Notif = { ...n, id: uid(), at: Date.now(), readBy: [currentUser.id] };
    const targetsMe =
      currentUser.role === 'admin' || currentUser.role === 'moderator'
        ? true
        : currentUser.role === 'supervisor'
          ? n.scope.type === 'supervisors'
          : n.targetUserId === currentUser.id || (n.scope.type === 'division' && n.scope.divisionId === currentUser.divisionId);
    if (targetsMe) fireBrowser('CEO Flow — ' + (n.ref ?? 'Update'), n.text);
    return { ...d, notifs: [notif, ...d.notifs].slice(0, 80) };
  };

  const canEdit = (p: Paper): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'moderator') return true;
    if (user.role === 'employee' || user.role === 'joborder') return (p.assignees ?? []).includes(user.id);
    if ((p.recipientIds?.length ?? 0) > 1) return (p.recipientIds ?? []).includes(user.divisionId ?? '');
    return user.divisionId === p.divisionId;
  };

  const userUnitId: string | null = !user
    ? null
    : user.role === 'division' ? user.divisionId ?? null
      : user.role === 'supervisor' ? (user.title.includes('Assistant') ? 'desk-ace' : 'desk-ce')
        : null;

  const employeesOf = (unitId: string | undefined): User[] =>
    db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && u.divisionId === unitId && u.status === 'active');

  /* ---------------- auth ---------------- */

  const login = (username: string, password: string): string | null => {
    const u = db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u) return 'Access denied — account not found in the authorized register.';
    if (u.password !== password) return 'Access denied — incorrect password for this account.';
    if (u.status === 'pending') return 'Account is pending administrator verification. Sign-in is disabled until your request is approved.';
    if (u.status === 'disabled') return 'This account has been disabled by the administrator.';
    setDb((d) => withLog({ ...d, session: u.id }, { userId: u.id, userName: u.name, type: 'login', text: 'Signed in to CEO Flow — session start' }));
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
    } catch { /* ignore */ }
    return null;
  };

  const signup: StoreCtx['signup'] = (input) => {
    const name = input.name.trim();
    const username = input.username.trim().toLowerCase();
    if (name.length < 3) return 'Please enter your full name as it should appear on documents.';
    if (!/^[a-z0-9._-]{3,20}$/.test(username)) return 'Username must be 3-20 characters — letters, numbers, dots or dashes.';
    if (db.users.some((x) => x.username.toLowerCase() === username)) return 'That username is already taken — choose another.';
    if (input.password.length < 6) return 'Password must be at least 6 characters long.';
    const div = divById(input.divisionId);
    const role: Role = input.role === 'employee' ? 'employee' : input.role === 'joborder' ? 'joborder' : 'division';
    const nu: User = {
      id: uid(), name, username, password: input.password, role,
      title: input.title.trim() || (role === 'division' ? 'Division Staff' : 'Division Employee'),
      divisionId: input.divisionId, status: 'pending',
      requestedDivisionId: input.divisionId, requestedTitle: input.title.trim(), requestedAt: Date.now(),
    };
    setDb((d) => {
      let next: DB = { ...d, users: [...d.users, nu] };
      next = withLog(next, { userId: nu.id, userName: nu.name, type: 'signup', text: `Submitted an account request (${role} · ${div?.code ?? input.divisionId}) — pending administrator verification` });
      next = pushNotif(next, { text: `Account request — ${nu.name} (${div?.name ?? 'division'}) is awaiting administrator verification`, kind: 'account', scope: { type: 'supervisors' } }, nu);
      return next;
    });
    fireBrowser('CEO Flow — account request', `${nu.name} requested access (${div?.code ?? ''}) — pending verification`);
    return null;
  };

  const approveUser = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === id);
    if (!t) return;
    setDb((d) => withLog(
      { ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: 'active' as const } : x)) },
      { userId: user.id, userName: user.name, type: 'approve', text: `Approved account request of ${t.name} (@${t.username})` }
    ));
    pushToast('ok', `${t.name} verified — they can now sign in`);
  };

  const denyUser = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === id);
    if (!t) return;
    setDb((d) => withLog(
      { ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: 'disabled' as const } : x)) },
      { userId: user.id, userName: user.name, type: 'deny', text: `Denied account request of ${t.name} (@${t.username})` }
    ));
    pushToast('warn', `Request from ${t.name} denied — account disabled`);
  };

  const updateUser: StoreCtx['updateUser'] = (id, patch) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === id);
    if (!t) return;
    const cleaned: Partial<User> = { ...patch };
    if (!cleaned.password) delete cleaned.password;
    // tri-state: undefined = keep · '' = explicitly clear · value = set
    if (cleaned.divisionId === undefined) delete cleaned.divisionId;
    else if (cleaned.divisionId === '') cleaned.divisionId = undefined;
    setDb((d) => withLog(
      { ...d, users: d.users.map((x) => (x.id === id ? { ...x, ...cleaned } : x)) },
      { userId: user.id, userName: user.name, type: 'edit', text: `Edited account of ${t.name}${cleaned.status && cleaned.status !== t.status ? ` — status set to ${cleaned.status}` : ''}${cleaned.role && cleaned.role !== t.role ? ` — role set to ${cleaned.role}` : ''}${cleaned.divisionId && cleaned.divisionId !== t.divisionId ? ` — assigned to ${divById(cleaned.divisionId)?.code ?? cleaned.divisionId}` : ''}` }
    ));
    pushToast('ok', `Account of ${t.name} updated`);
  };

  const changePassword: StoreCtx['changePassword'] = (current, next) => {
    if (!user) return 'Not signed in.';
    if (user.password !== current) return 'Current password is incorrect.';
    if (next.length < 6) return 'New password must be at least 6 characters long.';
    if (next === current) return 'New password must be different from the current one.';
    setDb((d) => withLog(
      { ...d, users: d.users.map((x) => (x.id === user.id ? { ...x, password: next, passwordResetAt: undefined } : x)) },
      { userId: user.id, userName: user.name, type: 'profile', text: 'Changed their own password from the profile panel' }
    ));
    pushToast('ok', 'Password updated — use it the next time you sign in');
    return null;
  };

  const requestPasswordReset = () => {
    if (!user || user.passwordResetAt) return;
    setDb((d) => {
      let next: DB = { ...d, users: d.users.map((x) => (x.id === user.id ? { ...x, passwordResetAt: Date.now() } : x)) };
      next = withLog(next, { userId: user.id, userName: user.name, type: 'resetreq', text: 'Requested a password reset (to 123456) — awaiting program admin verification' });
      next = pushNotif(next, { text: `Password reset request — ${user.name} (@${user.username}) asks to reset their password to 123456`, kind: 'account', scope: { type: 'supervisors' } }, user);
      return next;
    });
    pushToast('ok', 'Reset request sent — the program admin will verify and set it to 123456');
  };

  const approvePasswordReset = (userId: string) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === userId);
    if (!t) return;
    setDb((d) => {
      let next: DB = { ...d, users: d.users.map((x) => (x.id === userId ? { ...x, password: '123456', passwordResetAt: undefined } : x)) };
      next = withLog(next, { userId: user.id, userName: user.name, type: 'reset', text: `Approved password reset for ${t.name} (@${t.username}) — set to 123456` });
      next = pushNotif(next, { text: 'Your password was reset by the administrator — your new password is 123456', kind: 'account', scope: { type: 'division', divisionId: t.divisionId ?? '' }, targetUserId: t.id }, user);
      return next;
    });
    pushToast('ok', `${t.name}'s password reset to 123456 — they have been notified`);
  };

  const logout = () => {
    setDb((d) => user ? withLog({ ...d, session: null }, { userId: user.id, userName: user.name, type: 'logout', text: 'Signed out — session closed' }) : { ...d, session: null });
    setUi((u) => ({ ...u, drawerId: null, newOpen: false, reportOpen: false, profileOpen: false, viewer: null, search: '' }));
  };

  const resetDemo = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setDb(user ? withLog(freshSeed(), { userId: user.id, userName: user.name, type: 'reset', text: 'Restored demo dataset to the original seed' }) : freshSeed());
    pushToast('ok', 'Demo data restored to the original seed');
  };

  /* ---------------- paperwork workflow ---------------- */

  const touch = (p: Paper, fn: (p: Paper) => Paper): Paper => ({ ...fn(p), updatedAt: Date.now() });

  const createPaper: StoreCtx['createPaper'] = (input) => {
    if (!user) return;
    const recipients = input.recipientIds.length ? input.recipientIds : [input.recipientIds[0]];
    const primaryId = recipients[0];
    const div = divById(primaryId);
    const ref = `CEO-2026-${String(db.seq).padStart(4, '0')}`;
    const nowTs = Date.now();
    const pics = db.users.filter((u) => (input.assigneeIds ?? []).includes(u.id));
    const paper: Paper = {
      id: uid(), ref, title: input.title.trim(), kind: input.kind, priority: input.priority,
      origin: input.origin.trim() || 'Walk-in / internal', divisionId: primaryId, intendedId: primaryId,
      stage: 'received', attachments: input.attachments,
      custody: [{
        id: uid(), at: nowTs, byName: user.name, action: 'created',
        text: `Logged into the system and transmitted to ${div?.name ?? primaryId}${recipients.length > 1 ? ` (circular to ${recipients.length} desks)` : ''}${pics.length ? ` · persons-in-charge: ${pics.map((p) => p.name).join(', ')}` : ''}`,
        toDivisionId: primaryId,
      }],
      createdAt: nowTs, updatedAt: nowTs, byId: user.id, byName: user.name,
      dueAt: input.dueAt, remarks: input.remarks?.trim() || undefined, diverted: false,
      recipientIds: recipients, receivedBy: [], assignees: input.assigneeIds?.length ? input.assigneeIds : undefined,
      progress: 0,
    };
    setDb((d) => {
      let next: DB = { ...d, papers: [paper, ...d.papers], seq: d.seq + 1 };
      for (const rid of recipients) {
        next = pushNotif(next, {
          text: `New ${paper.kind === 'work-order' ? 'work order' : paper.kind} ${ref} — ${paper.title.slice(0, 60)}`,
          kind: 'new', docId: paper.id, ref, scope: { type: 'division', divisionId: rid },
        }, user);
      }
      for (const pic of pics) {
        next = pushNotif(next, {
          text: `${ref} assigned to you at intake — ${paper.title.slice(0, 58)}`,
          kind: 'new', docId: paper.id, ref, scope: { type: 'division', divisionId: primaryId }, targetUserId: pic.id,
        }, user);
      }
      if (user.role === 'division') {
        next = pushNotif(next, { text: `${ref} posted by ${user.name} for ${div?.code ?? ''}`, kind: 'new', docId: paper.id, ref, scope: { type: 'supervisors' } }, user);
      }
      next = withLog(next, { userId: user.id, userName: user.name, type: 'create', text: `Logged ${ref} — ${paper.title.slice(0, 70)} → ${div?.code ?? ''}`, ref, docId: paper.id });
      return next;
    });
    fireBrowser('CEO Flow — ' + ref, `New paperwork logged and transmitted to ${div?.code ?? 'division'}`);
    pushToast('ok', `${ref} created and transmitted to ${div?.code ?? 'division'}${recipients.length > 1 ? ` (+${recipients.length - 1} more desks)` : ''}`);
    setUi((u) => ({ ...u, newOpen: false, page: 'board', drawerId: paper.id }));
  };

  const moveStage: StoreCtx['moveStage'] = (id, stage, note, employeeIds) => {
    if (!user) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const assign = employeeIds !== undefined;
    if (p.stage === stage && !assign) return;
    if (!canEdit(p)) {
      pushToast('warn', `Only ${divById(p.divisionId)?.name ?? 'the assigned division'} or a supervisor can move this paper`);
      return;
    }
    if ((user.role === 'employee' || user.role === 'joborder') && stage === 'completed') {
      pushToast('warn', 'Completion is verified by your division head — submit the paper for review instead');
      return;
    }
    const meta = stageMeta(stage);
    const newPics = assign
      ? db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && (employeeIds ?? []).includes(u.id))
      : [];
    const picNote = newPics.length ? ` · persons-in-charge: ${newPics.map((e) => e.name).join(', ')}` : '';
    const entry = {
      id: uid(), at: Date.now(), byName: user.name, action: 'stage' as const, stage,
      text: note?.trim() ? `${meta.label} — ${note.trim()}${picNote}` : `Moved to ${meta.label}${picNote}`,
    };
    setDb((d) => {
      let next: DB = {
        ...d,
        papers: d.papers.map((x) => x.id === id
          ? touch(x, (pp) => ({
              ...pp, stage,
              assignees: assign ? (newPics.length ? newPics.map((e) => e.id) : undefined) : pp.assignees,
              pendingHeadReview: false,
              progress: stage === 'completed' ? 100 : pp.progress,
              custody: [...pp.custody, entry],
            }))
          : x),
      };
      for (const emp of newPics) {
        if (!p.assignees?.includes(emp.id)) {
          next = pushNotif(next, {
            text: `${p.ref} assigned to you — ${p.title.slice(0, 58)}`,
            kind: 'new', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId }, targetUserId: emp.id,
          }, user);
        }
      }
      if (stage === 'completed') {
        next = pushNotif(next, { text: `${p.ref} completed — ${p.title.slice(0, 64)}`, kind: 'complete', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } }, user);
      } else {
        next = pushNotif(next, { text: `${p.ref} moved to ${meta.label} by ${user.name}`, kind: 'move', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } }, user);
      }
      next = withLog(next, { userId: user.id, userName: user.name, type: 'stage', text: `Moved ${p.ref} to ${meta.label}${note?.trim() ? ` — ${note.trim()}` : ''}${picNote}`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', newPics.length
      ? `${p.ref} moved to ${meta.label} — ${newPics.map((e) => e.name).join(', ')} designated`
      : `${p.ref} moved to ${meta.label}`);
  };

  const routePaper: StoreCtx['routePaper'] = (id, toDivisionId, note) => {
    if (!user) return;
    if (user.role === 'employee' || user.role === 'joborder') {
      pushToast('warn', 'Employees and job-order personnel submit to their division head — routing is done by the division head');
      return;
    }
    const p = db.papers.find((x) => x.id === id);
    const to = divById(toDivisionId);
    if (!p || !to || p.divisionId === toDivisionId) return;
    if (!canEdit(p)) { pushToast('warn', 'Only the holding division or a supervisor can forward this paper'); return; }
    const from = divById(p.divisionId);
    const entry = {
      id: uid(), at: Date.now(), byName: user.name, action: 'routed' as const,
      fromDivisionId: p.divisionId, toDivisionId,
      text: note?.trim() ? `Forwarded to ${to.name} — ${note.trim()}` : `Forwarded to ${to.name}`,
    };
    setDb((d) => {
      let next: DB = {
        ...d,
        papers: d.papers.map((x) => x.id === id
          ? touch(x, (pp) => ({ ...pp, divisionId: toDivisionId, stage: 'received', diverted: toDivisionId !== pp.intendedId, custody: [...pp.custody, entry] }))
          : x),
      };
      next = pushNotif(next, { text: `${p.ref} forwarded to your division by ${from?.code ?? ''} — ${p.title.slice(0, 56)}`, kind: 'route', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: toDivisionId } }, user);
      if (user.role === 'division') {
        next = pushNotif(next, { text: `${p.ref} re-routed ${from?.code} → ${to.code} by ${user.name}`, kind: 'route', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } }, user);
      }
      next = withLog(next, { userId: user.id, userName: user.name, type: 'route', text: `Forwarded ${p.ref} from ${from?.code ?? '?'} to ${to.code}`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', `${p.ref} forwarded to ${to.code} — it now sits in their Received tray`);
  };

  const addNote = (id: string, text: string) => {
    if (!user || !text.trim()) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const entry = { id: uid(), at: Date.now(), byName: user.name, action: 'note' as const, text: text.trim() };
    setDb((d) => withLog(
      { ...d, papers: d.papers.map((x) => (x.id === id ? touch(x, (pp) => ({ ...pp, custody: [...pp.custody, entry] })) : x)) },
      { userId: user.id, userName: user.name, type: 'note', text: `Remark on ${p.ref} — ${text.trim().slice(0, 70)}`, ref: p.ref, docId: p.id }
    ));
    pushToast('ok', 'Remark added to the chain of custody');
  };

  const addAttachments = (id: string, atts: Attachment[]) => {
    if (!user || atts.length === 0) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const entry = {
      id: uid(), at: Date.now(), byName: user.name, action: 'attachment' as const,
      text: `Attached ${atts.length} file${atts.length > 1 ? 's' : ''} — ${atts.map((a) => a.name).join(', ').slice(0, 80)}`,
    };
    setDb((d) => withLog(
      { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, attachments: [...pp.attachments, ...atts], custody: [...pp.custody, entry] })) : x) },
      { userId: user.id, userName: user.name, type: 'attachment', text: `Attached ${atts.length} file(s) to ${p.ref}`, ref: p.ref, docId: p.id }
    ));
    const geos = atts.filter((a) => a.geotagged).length;
    pushToast('ok', geos > 0 ? `${atts.length} file(s) attached — ${geos} geotagged photo(s) linked to the map` : `${atts.length} file(s) attached`);
  };

  const removeAttachment = (docId: string, attId: string) => {
    if (!user) return;
    const p = db.papers.find((x) => x.id === docId);
    const att = p?.attachments.find((a) => a.id === attId);
    if (!p || !att) return;
    const remainingGeo = p.attachments.filter((a) => a.id !== attId && a.geotagged).length;
    const geoNote = att.geotagged && remainingGeo === 0 ? ' — last geotagged photo, site map removed' : '';
    const entry = {
      id: uid(), at: Date.now(), byName: user.name, action: 'attachment' as const,
      text: `Removed attachment "${att.name}" from the record${geoNote}`,
    };
    setDb((d) => withLog(
      { ...d, papers: d.papers.map((x) => x.id === docId ? touch(x, (pp) => ({ ...pp, attachments: pp.attachments.filter((a) => a.id !== attId), custody: [...pp.custody, entry] })) : x) },
      { userId: user.id, userName: user.name, type: 'attachment', text: `Removed ${att.kind} "${att.name}" from ${p.ref}${geoNote}`, ref: p.ref, docId }
    ));
    pushToast('ok', `"${att.name}" removed${att.geotagged && remainingGeo === 0 ? ' — no geotagged photos remain, map link cleared' : ''}`);
  };

  const setProgress: StoreCtx['setProgress'] = (id, pct) => {
    if (!user) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const v = Math.max(0, Math.min(100, Math.round(pct)));
    if ((p.progress ?? 0) === v) return;
    if (!canEdit(p)) { pushToast('warn', 'Only the holding desk, its persons-in-charge, or a supervisor can adjust completion'); return; }
    const entry = {
      id: uid(), at: Date.now(), byName: user.name, action: 'note' as const,
      text: `Completion updated to ${v}%${v === 100 ? ' — fully accomplished' : ''}`,
    };
    setDb((d) => withLog(
      { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, progress: v, custody: [...pp.custody, entry] })) : x) },
      { userId: user.id, userName: user.name, type: 'stage', text: `Set completion of ${p.ref} to ${v}%`, ref: p.ref, docId: p.id }
    ));
    pushToast('ok', `${p.ref} completion set to ${v}%`);
  };

  const assignPaper: StoreCtx['assignPaper'] = (id, ids) => {
    if (!user) return;
    if (user.role === 'employee' || user.role === 'joborder') {
      pushToast('warn', 'Only the division head or an executive can designate the persons-in-charge');
      return;
    }
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const prev = p.assignees ?? [];
    const nextIds = [...new Set(ids.filter((x) => x))];
    if (JSON.stringify(prev) === JSON.stringify(nextIds)) return;
    const picUsers = db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && nextIds.includes(u.id));
    const added = picUsers.filter((u) => !prev.includes(u.id));
    const entry = {
      id: uid(), at: Date.now(), byName: user.name, action: 'note' as const,
      text: picUsers.length ? `Persons-in-charge designated — ${picUsers.map((u) => u.name).join(', ')}` : 'Persons-in-charge cleared — paper is unassigned',
    };
    setDb((d) => {
      let next: DB = { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, assignees: nextIds.length ? nextIds : undefined, custody: [...pp.custody, entry] })) : x) };
      for (const emp of added) {
        next = pushNotif(next, { text: `${p.ref} assigned to you by ${user.name} — ${p.title.slice(0, 56)}`, kind: 'new', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId }, targetUserId: emp.id }, user);
      }
      next = withLog(next, { userId: user.id, userName: user.name, type: 'stage', text: picUsers.length ? `Assigned ${p.ref} to ${picUsers.map((u) => u.name).join(', ')}` : `Cleared persons-in-charge on ${p.ref}`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', picUsers.length ? `${p.ref} — ${picUsers.map((u) => u.name).join(', ')} now in charge` : `${p.ref} is now unassigned`);
  };

  const submitToHead = (id: string) => {
    if (!user || (user.role !== 'employee' && user.role !== 'joborder')) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p || !(p.assignees ?? []).includes(user.id) || p.pendingHeadReview || p.stage === 'completed') return;
    const div = divById(p.divisionId);
    const entry = { id: uid(), at: Date.now(), byName: user.name, action: 'note' as const, text: 'Submitted to division head for verification' };
    setDb((d) => {
      let next: DB = { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, pendingHeadReview: true, custody: [...pp.custody, entry] })) : x) };
      next = pushNotif(next, { text: `${p.ref} submitted by ${user.name} — awaiting your verification (${div?.code ?? ''})`, kind: 'move', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId } }, user);
      next = withLog(next, { userId: user.id, userName: user.name, type: 'stage', text: `Submitted ${p.ref} to the division head for verification`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', `${p.ref} submitted to ${div?.name ?? 'the division head'} for verification`);
  };

  const returnToEmployee = (id: string) => {
    if (!user || user.role === 'employee' || user.role === 'joborder') return;
    const p = db.papers.find((x) => x.id === id);
    if (!p || !p.pendingHeadReview) return;
    if (user.role === 'division' && p.divisionId !== user.divisionId) return;
    const emps = db.users.filter((u) => (p.assignees ?? []).includes(u.id));
    const entry = { id: uid(), at: Date.now(), byName: user.name, action: 'note' as const, text: 'Returned by division head for rework — verification not yet passed' };
    setDb((d) => {
      let next: DB = { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, stage: 'progress' as Stage, pendingHeadReview: false, custody: [...pp.custody, entry] })) : x) };
      for (const emp of emps) {
        next = pushNotif(next, { text: `${p.ref} returned for rework by ${user.name} — revise and resubmit`, kind: 'route', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId }, targetUserId: emp.id }, user);
      }
      next = withLog(next, { userId: user.id, userName: user.name, type: 'stage', text: `Returned ${p.ref} to ${emps.map((e) => e.name).join(', ') || 'employee'} for rework`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('warn', `${p.ref} returned to ${emps.map((e) => e.name).join(', ') || 'the employee'} for rework`);
  };

  const deletePaper = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    setDb((d) => withLog(
      { ...d, papers: d.papers.filter((x) => x.id !== id) },
      { userId: user.id, userName: user.name, type: 'delete', text: `Deleted board entry ${p.ref} — ${p.title.slice(0, 60)}`, ref: p.ref, docId: p.id }
    ));
    pushToast('ok', `${p.ref} deleted from the board`);
    setUi((u) => ({ ...u, drawerId: null }));
  };

  const updatePaper: StoreCtx['updatePaper'] = (id, patch) => {
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const entry = { id: uid(), at: Date.now(), byName: user.name, action: 'note' as const, text: `Record updated by ${user.role === 'admin' ? 'administrator' : 'moderator'}` };
    setDb((d) => withLog(
      { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, ...patch, custody: [...pp.custody, entry] })) : x) },
      { userId: user.id, userName: user.name, type: 'edit', text: `Updated record ${p.ref}${patch.title ? ' — title changed' : ''}`, ref: p.ref, docId: p.id }
    ));
    pushToast('ok', `${p.ref} updated`);
  };

  const ackPaper = (id: string) => {
    if (!user) return;
    const unit = userUnitId;
    const p = db.papers.find((x) => x.id === id);
    if (!p || !unit) return;
    if (!(p.recipientIds ?? []).includes(unit)) { pushToast('warn', 'Your desk is not an addressee of this paper'); return; }
    if ((p.receivedBy ?? []).includes(unit)) return;
    const entry = { id: uid(), at: Date.now(), byName: user.name, action: 'received' as const, toDivisionId: unit, text: `Receipt acknowledged for ${divById(unit)?.name ?? unit}` };
    setDb((d) => withLog(
      { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, receivedBy: [...(pp.receivedBy ?? []), unit], custody: [...pp.custody, entry] })) : x) },
      { userId: user.id, userName: user.name, type: 'create', text: `Acknowledged receipt of ${p.ref} for ${divById(unit)?.code ?? unit}`, ref: p.ref, docId: p.id }
    ));
    pushToast('ok', `Receipt recorded — ${(p.receivedBy ?? []).length + 1} of ${(p.recipientIds ?? []).length} desks acknowledged`);
  };

  const markRead = (notifId: string) => {
    if (!user) return;
    setDb((d) => ({ ...d, notifs: d.notifs.map((n) => (n.id === notifId && !n.readBy.includes(user.id) ? { ...n, readBy: [...n.readBy, user.id] } : n)) }));
  };

  const markAllRead = () => {
    if (!user) return;
    setDb((d) => ({ ...d, notifs: d.notifs.map((n) => (n.readBy.includes(user.id) ? n : { ...n, readBy: [...n.readBy, user.id] })) }));
  };

  const value: StoreCtx = {
    db, user, toasts, ui, activities, visiblePapers, visibleNotifs, unread,
    canEdit, userUnitId, employeesOf,
    login, signup, approveUser, denyUser, updateUser,
    changePassword, requestPasswordReset, approvePasswordReset,
    logout, resetDemo,
    go: (page) => setUi((u) => ({ ...u, page })),
    openDrawer: (id) => setUi((u) => ({ ...u, drawerId: id })),
    closeDrawer: () => setUi((u) => ({ ...u, drawerId: null })),
    setNewOpen: (open) => setUi((u) => ({ ...u, newOpen: open })),
    setReportOpen: (open, preset) => setUi((u) => ({ ...u, reportOpen: open, reportPreset: preset ?? null })),
    setProfileOpen: (open) => setUi((u) => ({ ...u, profileOpen: open })),
    setSearch: (s) => setUi((u) => ({ ...u, search: s })),
    setDivFilter: (s) => setUi((u) => ({ ...u, divFilter: s })),
    setViewer: (v) => setUi((u) => ({ ...u, viewer: v })),
    createPaper, moveStage, routePaper, addNote, addAttachments, removeAttachment, setProgress,
    assignPaper, submitToHead, returnToEmployee, deletePaper, updatePaper, ackPaper,
    markAllRead, markRead, pushToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
