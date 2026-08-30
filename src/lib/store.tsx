import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, Attachment, DB, Kind, Notif, Paper, Priority, Stage, SysLog, User } from './types';
import { divById, stageMeta } from './types';
import { freshSeed, deriveActivities } from './seed';
import { uid } from './util';

const LS_KEY = 'ppc-ceoflow-v5';

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 5 && Array.isArray(d.papers) && Array.isArray(d.notifs) && Array.isArray(d.users)) {
        if (!Array.isArray(d.logs)) d.logs = [];
        return d as DB;
      }
    }
  } catch {
    /* corrupted or legacy storage — reseed */
  }
  return freshSeed();
}

export type Page = 'dashboard' | 'board' | 'documents' | 'divisions' | 'activity' | 'users' | 'userlogs';

export interface UIState {
  page: Page;
  drawerId: string | null;
  newOpen: boolean;
  reportOpen: boolean;
  search: string;
  divFilter: string; // 'all' | division id
  viewer: { docId: string; attId: string } | null; // attachment viewer target
}

export interface Toast {
  id: string;
  kind: 'ok' | 'warn' | 'err';
  text: string;
}

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
  login: (username: string, password: string) => string | null;
  signup: (input: { name: string; username: string; password: string; divisionId: string; title: string }) => string | null;
  approveUser: (id: string) => void;
  denyUser: (id: string) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  logout: () => void;
  resetDemo: () => void;
  go: (page: Page) => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  setNewOpen: (open: boolean) => void;
  setReportOpen: (open: boolean) => void;
  setSearch: (s: string) => void;
  setDivFilter: (s: string) => void;
  setViewer: (v: { docId: string; attId: string } | null) => void;
  deletePaper: (id: string) => void;
  updatePaper: (
    id: string,
    patch: {
      title?: string;
      kind?: Kind;
      priority?: Priority;
      origin?: string;
      divisionId?: string;
      dueAt?: number | null;
      remarks?: string;
    }
  ) => void;
  createPaper: (input: {
    title: string;
    kind: Kind;
    priority: Priority;
    origin: string;
    recipientIds: string[];
    dueAt?: number;
    remarks?: string;
    attachments: Attachment[];
  }) => void;
  ackPaper: (id: string) => void;
  userUnitId: string | null;
  moveStage: (id: string, stage: Stage, note?: string) => void;
  routePaper: (id: string, toDivisionId: string, note?: string) => void;
  addNote: (id: string, text: string) => void;
  addAttachments: (id: string, atts: Attachment[]) => void;
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
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, tag: uid() });
    }
  } catch {
    /* unsupported */
  }
}

const withLog = (d: DB, entry: Omit<SysLog, 'id' | 'at'>): DB => ({
  ...d,
  logs: [{ ...entry, id: uid(), at: Date.now() }, ...d.logs].slice(0, 600),
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDb);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ui, setUi] = useState<UIState>({
    page: 'dashboard',
    drawerId: null,
    newOpen: false,
    reportOpen: false,
    search: '',
    divFilter: 'all',
    viewer: null,
  });
  const uiRef = useRef(ui);
  uiRef.current = ui;

  const user = db.users.find((x) => x.id === db.session && x.status === 'active') ?? null;

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch {
      /* quota exceeded — keep in memory */
    }
  }, [db]);

  // set sensible landing page per role after login / on first paint
  useEffect(() => {
    if (user) {
      setUi((u) => ({
        ...u,
        page: user.role === 'division' ? 'board' : 'dashboard',
        divFilter: 'all',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.session]);

  const activities = useMemo(() => deriveActivities(db.papers), [db.papers]);

  const visiblePapers = useMemo(() => {
    if (!user) return [];
    if (user.role !== 'division') return [...db.papers].sort((a, b) => b.updatedAt - a.updatedAt);
    const mine = (p: Paper) =>
      p.divisionId === user.divisionId ||
      p.intendedId === user.divisionId ||
      (p.recipientIds ?? []).includes(user.divisionId ?? '') ||
      p.custody.some((e) => e.toDivisionId === user.divisionId || e.fromDivisionId === user.divisionId);
    return db.papers.filter(mine).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.papers, user]);

  const visibleNotifs = useMemo(() => {
    if (!user) return [];
    const vis = db.notifs.filter((n) =>
      user.role !== 'division'
        ? true
        : n.scope.type === 'division' && n.scope.divisionId === user.divisionId
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

  const pushNotif = (
    d: DB,
    n: Omit<Notif, 'id' | 'at' | 'readBy'>,
    currentUser: User
  ): DB => {
    const notif: Notif = { ...n, id: uid(), at: Date.now(), readBy: [currentUser.id] };
    // Taskbar notification — only when the event targets the signed-in user's scope
    const targetsMe =
      currentUser.role === 'admin'
        ? true
        : currentUser.role === 'supervisor'
          ? n.scope.type === 'supervisors'
          : n.scope.type === 'division' && n.scope.divisionId === currentUser.divisionId;
    if (targetsMe) fireBrowser('CEO Flow — ' + (n.ref ?? 'Update'), n.text);
    return { ...d, notifs: [notif, ...d.notifs].slice(0, 80) };
  };

  const canEdit = (p: Paper): boolean => {
    if (!user) return false;
    if (user.role !== 'division') return true;
    // circulars: any addressed desk may act on the paper
    if ((p.recipientIds?.length ?? 0) > 1) return (p.recipientIds ?? []).includes(user.divisionId ?? '');
    return user.divisionId === p.divisionId;
  };

  /** The routable unit the signed-in officer answers for (division, or their executive desk). */
  const userUnitId: string | null = !user
    ? null
    : user.role === 'division'
      ? user.divisionId ?? null
      : user.role === 'supervisor'
        ? user.title.includes('Assistant')
          ? 'desk-ace'
          : 'desk-ce'
        : null;

  const ackPaper: StoreCtx['ackPaper'] = (id) => {
    if (!user) return;
    const unit = userUnitId;
    const p = db.papers.find((x) => x.id === id);
    if (!p || !unit) return;
    if (!(p.recipientIds ?? []).includes(unit)) {
      pushToast('warn', 'Your desk is not an addressee of this paper');
      return;
    }
    if ((p.receivedBy ?? []).includes(unit)) return;
    const unitName = divById(unit)?.name ?? unit;
    const entry = {
      id: uid(),
      at: Date.now(),
      byName: user.name,
      action: 'received' as const,
      toDivisionId: unit,
      text: `Receipt acknowledged for ${unitName}`,
    };
    setDb((d) =>
      withLog(
        {
          ...d,
          papers: d.papers.map((x) =>
            x.id === id
              ? touch(x, (pp) => ({ ...pp, receivedBy: [...(pp.receivedBy ?? []), unit], custody: [...pp.custody, entry] }))
              : x
          ),
        },
        {
          userId: user.id,
          userName: user.name,
          type: 'create',
          text: `Acknowledged receipt of ${p.ref} for ${divById(unit)?.code ?? unit}`,
          ref: p.ref,
          docId: p.id,
        }
      )
    );
    const total = (p.recipientIds ?? []).length;
    const done = (p.receivedBy ?? []).length + 1;
    pushToast(
      'ok',
      done === total
        ? `${p.ref} — all ${total} desks have acknowledged receipt`
        : `Receipt recorded — ${done} of ${total} desks acknowledged`
    );
  };

  const login = (username: string, password: string): string | null => {
    const u = db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u) return 'Access denied — account not found in the authorized register.';
    if (u.password !== password) return 'Access denied — incorrect password for this account.';
    if (u.status === 'pending')
      return 'Account is pending administrator verification. Sign-in is disabled until your request is approved.';
    if (u.status === 'disabled') return 'This account has been disabled by the administrator.';
    setDb((d) =>
      withLog({ ...d, session: u.id }, { userId: u.id, userName: u.name, type: 'login', text: 'Signed in to CEO Flow — session start' })
    );
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    } catch {
      /* ignore */
    }
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
    const nu: User = {
      id: uid(),
      name,
      username,
      password: input.password,
      role: 'division',
      title: input.title.trim() || 'Division Staff',
      divisionId: input.divisionId,
      status: 'pending',
      requestedDivisionId: input.divisionId,
      requestedTitle: input.title.trim() || 'Division Staff',
      requestedAt: Date.now(),
    };
    setDb((d) => {
      let next: DB = { ...d, users: [...d.users, nu] };
      next = withLog(next, {
        userId: nu.id,
        userName: nu.name,
        type: 'signup',
        text: `Submitted an account request (${div?.code ?? input.divisionId}) — pending administrator verification`,
      });
      next = pushNotif(
        next,
        {
          text: `Account request — ${nu.name} (${div?.name ?? 'division'}) is awaiting administrator verification`,
          kind: 'account',
          scope: { type: 'supervisors' },
        },
        nu
      );
      return next;
    });
    fireBrowser('CEO Flow — account request', `${nu.name} requested access (${div?.code ?? ''}) — pending verification`);
    return null;
  };

  const approveUser = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const target = db.users.find((x) => x.id === id);
    if (!target) return;
    setDb((d) =>
      withLog(
        { ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: 'active' as const } : x)) },
        { userId: user.id, userName: user.name, type: 'approve', text: `Approved account request of ${target.name} (@${target.username})` }
      )
    );
    pushToast('ok', `${target.name} verified — they can now sign in`);
  };

  const denyUser = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const target = db.users.find((x) => x.id === id);
    if (!target) return;
    setDb((d) =>
      withLog(
        { ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: 'disabled' as const } : x)) },
        { userId: user.id, userName: user.name, type: 'deny', text: `Denied account request of ${target.name} (@${target.username})` }
      )
    );
    pushToast('warn', `Request from ${target.name} denied — account disabled`);
  };

  const updateUser: StoreCtx['updateUser'] = (id, patch) => {
    if (!user || user.role !== 'admin') return;
    const target = db.users.find((x) => x.id === id);
    if (!target) return;
    const cleaned: Partial<User> = { ...patch };
    if (!cleaned.password) delete cleaned.password;
    setDb((d) =>
      withLog(
        { ...d, users: d.users.map((x) => (x.id === id ? { ...x, ...cleaned } : x)) },
        {
          userId: user.id,
          userName: user.name,
          type: 'edit',
          text: `Edited account of ${target.name}${
            cleaned.status && cleaned.status !== target.status ? ` — status set to ${cleaned.status}` : ''
          }${cleaned.role && cleaned.role !== target.role ? ` — role set to ${cleaned.role}` : ''}${
            cleaned.divisionId && cleaned.divisionId !== target.divisionId
              ? ` — assigned to ${divById(cleaned.divisionId)?.code ?? cleaned.divisionId}`
              : ''
          }`,
        }
      )
    );
    pushToast('ok', `Account of ${target.name} updated`);
  };

  const logout = () => {
    setDb((d) =>
      user
        ? withLog({ ...d, session: null }, { userId: user.id, userName: user.name, type: 'logout', text: 'Signed out — session closed' })
        : { ...d, session: null }
    );
    setUi((u) => ({ ...u, drawerId: null, newOpen: false, reportOpen: false, viewer: null, search: '' }));
  };

  const resetDemo = () => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    setDb(
      user
        ? withLog(freshSeed(), { userId: user.id, userName: user.name, type: 'reset', text: 'Restored demo dataset to the original seed' })
        : freshSeed()
    );
    pushToast('ok', 'Demo data restored to the original seed');
  };

  const createPaper: StoreCtx['createPaper'] = (input) => {
    if (!user) return;
    const recipients = input.recipientIds.length > 0 ? input.recipientIds : [];
    const primary = recipients[0];
    if (!primary) return;
    const div = divById(primary);
    const multi = recipients.length > 1;
    const ref = `CEO-2026-${String(db.seq).padStart(4, '0')}`;
    const nowTs = Date.now();
    const paper: Paper = {
      id: uid(),
      ref,
      title: input.title.trim(),
      kind: input.kind,
      priority: input.priority,
      origin: input.origin.trim() || 'Walk-in / internal',
      divisionId: primary,
      intendedId: primary,
      stage: 'received',
      attachments: input.attachments,
      custody: [
        {
          id: uid(),
          at: nowTs,
          byName: user.name,
          action: 'created',
          text: multi
            ? `Logged into the system and circulated to ${recipients.length} desks (primary: ${div?.code ?? primary})`
            : `Logged into the system and transmitted to ${div?.name ?? primary}`,
          toDivisionId: primary,
        },
      ],
      createdAt: nowTs,
      updatedAt: nowTs,
      byId: user.id,
      byName: user.name,
      dueAt: input.dueAt,
      remarks: input.remarks?.trim() || undefined,
      diverted: false,
      recipientIds: recipients,
      receivedBy: multi ? [] : undefined,
    };
    setDb((d) => {
      let next: DB = { ...d, papers: [paper, ...d.papers], seq: d.seq + 1 };
      for (const rid of recipients) {
        next = pushNotif(
          next,
          {
            text: multi
              ? `Circular ${ref} addressed to your desk — ${paper.title.slice(0, 58)}`
              : `New ${paper.kind === 'work-order' ? 'work order' : paper.kind} ${ref} — ${paper.title.slice(0, 60)}`,
            kind: 'new',
            docId: paper.id,
            ref,
            scope: { type: 'division', divisionId: rid },
          },
          user
        );
      }
      if (user.role === 'division') {
        next = pushNotif(
          next,
          {
            text: `${ref} posted by ${user.name} for ${multi ? `${recipients.length} desks` : div?.code ?? ''}`,
            kind: 'new',
            docId: paper.id,
            ref,
            scope: { type: 'supervisors' },
          },
          user
        );
      }
      next = withLog(next, {
        userId: user.id,
        userName: user.name,
        type: 'create',
        text: multi
          ? `Logged ${ref} — ${paper.title.slice(0, 62)} → circulated to ${recipients.length} desks`
          : `Logged ${ref} — ${paper.title.slice(0, 70)} → ${div?.code ?? ''}`,
        ref,
        docId: paper.id,
      });
      return next;
    });
    fireBrowser(
      'CEO Flow — ' + ref,
      multi ? `Circular logged and addressed to ${recipients.length} desks` : `New paperwork logged and transmitted to ${div?.code ?? 'division'}`
    );
    pushToast('ok', multi ? `${ref} circulated to ${recipients.length} desks — each must acknowledge receipt` : `${ref} created and transmitted to ${div?.code ?? 'division'}`);
    setUi((u) => ({ ...u, newOpen: false, page: 'board', divFilter: user.role === 'supervisor' ? primary : u.divFilter }));
    setUi((u) => ({ ...u, drawerId: paper.id }));
  };

  const touch = (p: Paper, fn: (p: Paper) => Paper): Paper => {
    const next = fn(p);
    return { ...next, updatedAt: Date.now() };
  };

  const moveStage: StoreCtx['moveStage'] = (id, stage, note) => {
    if (!user) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    if (p.stage === stage) return;
    if (!canEdit(p)) {
      pushToast('warn', `Only ${divById(p.divisionId)?.name ?? 'the assigned division'} or a supervisor can move this paper`);
      return;
    }
    const meta = stageMeta(stage);
    const entry = {
      id: uid(),
      at: Date.now(),
      byName: user.name,
      action: 'stage' as const,
      stage,
      text: note?.trim() ? `${meta.label} — ${note.trim()}` : `Moved to ${meta.label}`,
    };
    setDb((d) => {
      let next: DB = {
        ...d,
        papers: d.papers.map((x) => (x.id === id ? touch(x, (pp) => ({ ...pp, stage, custody: [...pp.custody, entry] })) : x)),
      };
      if (stage === 'completed') {
        next = pushNotif(
          next,
          { text: `${p.ref} completed — ${p.title.slice(0, 64)}`, kind: 'complete', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } },
          user
        );
      } else {
        next = pushNotif(
          next,
          { text: `${p.ref} moved to ${meta.label} by ${user.name}`, kind: 'move', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } },
          user
        );
      }
      next = withLog(next, {
        userId: user.id,
        userName: user.name,
        type: 'stage',
        text: `Moved ${p.ref} to ${meta.label}${note?.trim() ? ` — ${note.trim()}` : ''}`,
        ref: p.ref,
        docId: p.id,
      });
      return next;
    });
    pushToast('ok', `${p.ref} moved to ${meta.label}`);
  };

  const routePaper: StoreCtx['routePaper'] = (id, toDivisionId, note) => {
    if (!user) return;
    const p = db.papers.find((x) => x.id === id);
    const to = divById(toDivisionId);
    if (!p || !to || p.divisionId === toDivisionId) return;
    if (!canEdit(p)) {
      pushToast('warn', 'Only the holding division or a supervisor can forward this paper');
      return;
    }
    const from = divById(p.divisionId);
    const entry = {
      id: uid(),
      at: Date.now(),
      byName: user.name,
      action: 'routed' as const,
      fromDivisionId: p.divisionId,
      toDivisionId,
      text: note?.trim()
        ? `Forwarded to ${to.name} — ${note.trim()}`
        : `Forwarded to ${to.name}`,
    };
    setDb((d) => {
      let next: DB = {
        ...d,
        papers: d.papers.map((x) =>
          x.id === id
            ? touch(x, (pp) => ({
                ...pp,
                divisionId: toDivisionId,
                stage: 'received',
                diverted: toDivisionId !== pp.intendedId,
                custody: [...pp.custody, entry],
              }))
            : x
        ),
      };
      next = pushNotif(
        next,
        {
          text: `${p.ref} forwarded to your division by ${from?.code ?? ''} — ${p.title.slice(0, 56)}`,
          kind: 'route',
          docId: p.id,
          ref: p.ref,
          scope: { type: 'division', divisionId: toDivisionId },
        },
        user
      );
      if (user.role === 'division') {
        next = pushNotif(
          next,
          { text: `${p.ref} re-routed ${from?.code} → ${to.code} by ${user.name}`, kind: 'route', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } },
          user
        );
      }
      next = withLog(next, {
        userId: user.id,
        userName: user.name,
        type: 'route',
        text: `Forwarded ${p.ref} from ${from?.code ?? '?'} to ${to.code}`,
        ref: p.ref,
        docId: p.id,
      });
      return next;
    });
    pushToast('ok', `${p.ref} forwarded to ${to.code} — it now sits in their Received tray`);
  };

  const addNote: StoreCtx['addNote'] = (id, text) => {
    if (!user || !text.trim()) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const entry = { id: uid(), at: Date.now(), byName: user.name, action: 'note' as const, text: text.trim() };
    setDb((d) =>
      withLog(
        {
          ...d,
          papers: d.papers.map((x) => (x.id === id ? touch(x, (pp) => ({ ...pp, custody: [...pp.custody, entry] })) : x)),
        },
        { userId: user.id, userName: user.name, type: 'note', text: `Remark on ${p.ref} — ${text.trim().slice(0, 70)}`, ref: p.ref, docId: p.id }
      )
    );
    pushToast('ok', 'Remark added to the chain of custody');
  };

  const addAttachments: StoreCtx['addAttachments'] = (id, atts) => {
    if (!user || atts.length === 0) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const entry = {
      id: uid(),
      at: Date.now(),
      byName: user.name,
      action: 'attachment' as const,
      text: `Attached ${atts.length} file${atts.length > 1 ? 's' : ''} — ${atts.map((a) => a.name).join(', ').slice(0, 80)}`,
    };
    setDb((d) =>
      withLog(
        {
          ...d,
          papers: d.papers.map((x) =>
            x.id === id ? touch(x, (pp) => ({ ...pp, attachments: [...pp.attachments, ...atts], custody: [...pp.custody, entry] })) : x
          ),
        },
        {
          userId: user.id,
          userName: user.name,
          type: 'attachment',
          text: `Attached ${atts.length} file(s) to ${p.ref}`,
          ref: p.ref,
          docId: p.id,
        }
      )
    );
    const geos = atts.filter((a) => a.geotagged).length;
    pushToast('ok', geos > 0 ? `${atts.length} file(s) attached — ${geos} geotagged photo(s) linked to the map` : `${atts.length} file(s) attached`);
  };

  const deletePaper = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    setDb((d) =>
      withLog(
        { ...d, papers: d.papers.filter((x) => x.id !== id) },
        {
          userId: user.id,
          userName: user.name,
          type: 'delete',
          text: `Deleted board entry ${p.ref} — ${p.title.slice(0, 64)}`,
          ref: p.ref,
          docId: p.id,
        }
      )
    );
    setUi((u) => ({ ...u, drawerId: null }));
    pushToast('warn', `${p.ref} deleted from the board and the register`);
  };

  const updatePaper: StoreCtx['updatePaper'] = (id, patch) => {
    if (!user || user.role !== 'admin') return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const holderChanged = !!patch.divisionId && patch.divisionId !== p.divisionId;
    const toDiv = holderChanged ? divById(patch.divisionId!) : undefined;
    const fromDiv = divById(p.divisionId);
    const custodyEntry = holderChanged
      ? {
          id: uid(),
          at: Date.now(),
          byName: user.name,
          action: 'routed' as const,
          fromDivisionId: p.divisionId,
          toDivisionId: patch.divisionId,
          text: `Administrator re-assigned the holder ${fromDiv?.code ?? ''} → ${toDiv?.code ?? ''}`,
        }
      : null;
    setDb((d) =>
      withLog(
        {
          ...d,
          papers: d.papers.map((x) => {
            if (x.id !== id) return x;
            const nextHolder = patch.divisionId ?? x.divisionId;
            return {
              ...x,
              title: patch.title?.trim() || x.title,
              kind: patch.kind ?? x.kind,
              priority: patch.priority ?? x.priority,
              origin: patch.origin?.trim() || x.origin,
              remarks: patch.remarks !== undefined ? patch.remarks.trim() || undefined : x.remarks,
              dueAt: patch.dueAt !== undefined ? patch.dueAt ?? undefined : x.dueAt,
              divisionId: nextHolder,
              stage: holderChanged ? ('received' as Stage) : x.stage,
              diverted: nextHolder !== x.intendedId,
              custody: custodyEntry ? [...x.custody, custodyEntry] : x.custody,
              updatedAt: Date.now(),
            };
          }),
        },
        {
          userId: user.id,
          userName: user.name,
          type: 'edit',
          text: `Edited document ${p.ref} — administrator update${holderChanged ? ` (holder → ${toDiv?.code ?? ''})` : ''}`,
          ref: p.ref,
          docId: p.id,
        }
      )
    );
    pushToast('ok', `${p.ref} updated by the administrator`);
  };

  const markRead = (notifId: string) => {
    if (!user) return;
    setDb((d) => ({
      ...d,
      notifs: d.notifs.map((n) => (n.id === notifId && !n.readBy.includes(user.id) ? { ...n, readBy: [...n.readBy, user.id] } : n)),
    }));
  };

  const markAllRead = () => {
    if (!user) return;
    setDb((d) => ({
      ...d,
      notifs: d.notifs.map((n) => (n.readBy.includes(user.id) ? n : { ...n, readBy: [...n.readBy, user.id] })),
    }));
  };

  const value: StoreCtx = {
    db,
    user,
    toasts,
    ui,
    activities,
    visiblePapers,
    visibleNotifs,
    unread,
    canEdit,
    userUnitId,
    ackPaper,
    login,
    logout,
    resetDemo,
    go: (page) => setUi((u) => ({ ...u, page })),
    openDrawer: (id) => setUi((u) => ({ ...u, drawerId: id })),
    closeDrawer: () => setUi((u) => ({ ...u, drawerId: null })),
    setNewOpen: (open) => setUi((u) => ({ ...u, newOpen: open })),
    setReportOpen: (open) => setUi((u) => ({ ...u, reportOpen: open })),
    setSearch: (s) => setUi((u) => ({ ...u, search: s })),
    setDivFilter: (s) => setUi((u) => ({ ...u, divFilter: s })),
    setViewer: (url) => setUi((u) => ({ ...u, viewer: url })),
    createPaper,
    moveStage,
    routePaper,
    addNote,
    addAttachments,
    deletePaper,
    updatePaper,
    markAllRead,
    markRead,
    pushToast,
    signup,
    approveUser,
    denyUser,
    updateUser,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
