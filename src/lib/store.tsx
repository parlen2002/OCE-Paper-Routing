import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Activity, Attachment, Channel, Customization, DB, DivInfo, DivisionMeta, Kind, Message, MoodDef, MsgDeleteRequest, Notif, Paper, Priority, Role, Stage, SysLog, User } from './core';
import { ALL_UNITS, DEFAULT_CUSTOM, DEFAULT_MIST, MOODS, deriveActivities, deriveLogs, divById, freshSeed, geobrgyKey, nominatimReverseUrl, seasonalMood, stageMeta, uid } from './core';

const LS_KEY = 'ppc-ceoflow-v20';

/** A chat message may be edited by its author for 10 minutes after posting. */
export const MSG_EDIT_WINDOW = 10 * 60 * 1000;

function shade(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((ch) => ch + ch).join('') : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt > 0 ? 255 : 0;
  const p = Math.abs(amt);
  const mix = (ch: number) => Math.round(ch + (t - ch) * p);
  return `#${[mix(r), mix(g), mix(b)].map((ch) => ch.toString(16).padStart(2, '0')).join('')}`;
}

/** hex + alpha → rgba() string for ambient backdrop layers */
function rgba(hex: string, a: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((ch) => ch + ch).join('') : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(86,200,240,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 20 && Array.isArray(d.papers) && Array.isArray(d.notifs) && Array.isArray(d.users)) {
        if (!Array.isArray(d.logs)) d.logs = deriveLogs(d.papers);
        if (!Array.isArray(d.channels)) d.channels = [];
        if (!Array.isArray(d.messages)) d.messages = [];
        if (!d.reads) d.reads = {};
        if (!Array.isArray(d.msgDeletes)) d.msgDeletes = [];
        return d as DB;
      }
    }
  } catch { /* corrupted — reseed */ }
  return freshSeed();
}

export type Page =
  | 'dashboard' | 'board' | 'myboard' | 'personnel' | 'documents' | 'divisions'
  | 'activity' | 'users' | 'userlogs' | 'messages' | 'customize';

export interface ReportPreset {
  presetDiv?: string;
  paperId?: string;
}

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
  me: User | null;
  myUnitId: string | null;
  /** Papers in scope for the Command View (role-filtered). */
  scopePapers: Paper[];
  toasts: Toast[];
  ui: UIState;
  activities: Activity[];
  visiblePapers: Paper[];
  visibleNotifs: Notif[];
  unread: number;
  custom: Customization;
  geotagBrgys: string[];
  canEdit: (p: Paper) => boolean;
  canManageDivision: (divId: string) => boolean;
  employeesOf: (unitId: string | undefined) => User[];
  divOf: (id: string) => DivInfo | undefined;
  login: (username: string, password: string) => string | null;
  signup: (input: { name: string; username: string; password: string; divisionId: string; title: string; phone?: string; address?: string; email?: string; teamIds?: string[] }) => string | null;
  approveUser: (id: string) => void;
  denyUser: (id: string) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  changePassword: (current: string, next: string) => string | null;
  requestPasswordReset: () => void;
  /** Self-service profile editing — name, position, phone, email, address. Returns an error or null. */
  updateProfile: (patch: { name?: string; title?: string; phone?: string; email?: string; address?: string }) => string | null;
  requestForgotPassword: (username: string, contact?: string) => string | null;
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
  setViewer: (v: { docId: string; attId: string } | null) => void;
  createPaper: (input: { title: string; kind: Kind; priority: Priority; origin: string; recipientIds: string[]; dueAt?: number; remarks?: string; attachments: Attachment[]; assigneeIds?: string[] }) => void;
  moveStage: (id: string, stage: Stage, note?: string, employeeId?: string) => void;
  routePaperMulti: (id: string, targets: string[], note?: string) => void;
  addNote: (id: string, text: string) => void;
  addAttachments: (id: string, atts: Attachment[]) => void;
  removeAttachment: (docId: string, attId: string) => void;
  stampGeoAttachments: (docId: string, attIds: string[], lat: number, lng: number) => void;
  setProgress: (id: string, value: number) => void;
  assignPaper: (id: string, ids: string[]) => void;
  submitToHead: (id: string) => void;
  returnToEmployee: (id: string) => void;
  deletePaper: (id: string) => void;
  updatePaper: (id: string, patch: Partial<Paper>) => void;
  ackPaper: (id: string, unitId?: string) => void;
  /** Units the officer is designated OIC of. */
  oicUnitIds: string[];
  updateDivision: (id: string, patch: { name?: string; desc?: string }) => void;
  setDivisionHead: (id: string, userId: string, temporary: boolean, note?: string) => void;
  removeDivisionOIC: (id: string) => void;
  updateCustom: (patch: Partial<Customization>) => void;
  /** Resolved theme: personal choice > seasonal auto-mood > office default. */
  theme: { toneId: string; mood: MoodDef; accent?: string; accent2?: string; seasonal: string | null; autoSeason: boolean; isPersonal: boolean };
  updateMyTheme: (patch: Partial<Pick<User, 'themeAccent' | 'themeAccent2' | 'themeTone' | 'autoSeason'>>) => void;
  /** Unsaved theme edits shown as a live preview; committed only on save. */
  themeDraft: Pick<User, 'themeAccent' | 'themeAccent2' | 'themeTone' | 'autoSeason'>;
  themeDirty: boolean;
  previewTheme: (patch: Partial<Pick<User, 'themeAccent' | 'themeAccent2' | 'themeTone' | 'autoSeason'>>) => void;
  clearThemePreview: () => void;
  saveTheme: () => void;
  visibleChannels: Channel[];
  messagesOf: (chId: string) => Message[];
  unreadFor: (chId: string) => number;
  msgUnreadTotal: number;
  canPostChannel: (ch: Channel) => boolean;
  sendMsg: (channelId: string, text: string, docIds?: string[]) => void;
  markChannelRead: (chId: string) => void;
  /** Author edits own message (10-min window). */
  updateMessage: (msgId: string, text: string) => void;
  /** Files a deletion request for the program admin to verify. */
  requestDeleteMessage: (msgId: string) => void;
  approveDeleteMessage: (reqId: string) => void;
  denyDeleteMessage: (reqId: string) => void;
  msgDeletes: MsgDeleteRequest[];
  manageChannelMember: (channelId: string, userId: string, add: boolean) => void;
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

  /* ---- division overrides & effective identity (OIC acts as division head) ---- */
  const divMeta = (id: string): DivisionMeta => db.divisions?.[id] ?? {};
  const divOf = (id: string): DivInfo | undefined => {
    const base = ALL_UNITS.find((d) => d.id === id);
    if (!base) return undefined;
    const m = divMeta(id);
    return { ...base, name: m.name ?? base.name, desc: m.desc ?? base.desc, head: m.headName ?? base.head, headUser: m.headUserId ?? base.headUser, oicId: m.oicId, oicName: m.oicName, oicSince: m.oicSince, oicNote: m.oicNote };
  };

  const oicOfDivId: string | null = useMemo(() => {
    if (!user) return null;
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'moderator') return null;
    for (const d of ALL_UNITS) if (db.divisions?.[d.id]?.oicId === user.id) return d.id;
    return null;
  }, [db.divisions, user]);

  const me: User | null = useMemo(() => {
    if (!user) return null;
    if (oicOfDivId) return { ...user, role: 'division', divisionId: oicOfDivId, title: `${user.title} — OIC` };
    return user;
  }, [user, oicOfDivId]);

  const myUnitId: string | null = !me ? null
    : me.role === 'division' ? me.divisionId ?? null
      : me.role === 'supervisor' ? (me.title.includes('Assistant') ? 'desk-ace' : 'desk-ce')
        : null;

  /** Units the signed-in officer is designated OIC of — receipt rights follow the posting, whatever their role. */
  const oicUnitIds = useMemo(() => {
    if (!user) return [] as string[];
    const ids: string[] = [];
    for (const d of ALL_UNITS) if (db.divisions?.[d.id]?.oicId === user.id) ids.push(d.id);
    return ids;
  }, [db.divisions, user]);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch { /* quota */ }
  }, [db]);

  useEffect(() => {
    if (user) {
      setUi((u) => ({
        ...u,
        page: user.role === 'employee' || user.role === 'joborder' ? 'myboard' : user.role === 'division' || user.role === 'moderator' || user.role === 'operator' ? 'board' : 'dashboard',
        divFilter: 'all',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.session]);

  /* ---- theming ----
   * Precedence: the user's personal theme (profile panel) beats the seasonal
   * auto-mood, which beats the office default the program admin set in Customize. */
  const custom: Customization = useMemo(() => ({ ...DEFAULT_CUSTOM, ...(db.custom ?? {}) }), [db.custom]);

  /* Unsaved theme edits — previewed live, written to the account only on save
     (so exploring moods never spams the user history log). */
  const [themePreview, setThemePreview] = useState<Partial<Pick<User, 'themeAccent' | 'themeAccent2' | 'themeTone' | 'autoSeason'>> | null>(null);

  const theme = useMemo(() => {
    // Draft = saved personal values overlaid with the unsaved preview.
    const autoSeason = (themePreview?.autoSeason ?? me?.autoSeason) ?? false;
    const seasonal = autoSeason ? seasonalMood() : null;
    const pTone = themePreview && 'themeTone' in themePreview ? themePreview.themeTone : me?.themeTone;
    const pAccent = themePreview && 'themeAccent' in themePreview ? themePreview.themeAccent : me?.themeAccent;
    const pAccent2 = themePreview && 'themeAccent2' in themePreview ? themePreview.themeAccent2 : me?.themeAccent2;
    const toneId = pTone ?? seasonal ?? custom.bgTone ?? 'blueprint';
    return {
      toneId,
      mood: MOODS[toneId] ?? MOODS.blueprint,
      accent: pAccent ?? (seasonal ? MOODS[seasonal]?.accent : undefined) ?? custom.accent,
      accent2: pAccent2 ?? (seasonal ? MOODS[seasonal]?.accent2 : undefined) ?? custom.accent2,
      seasonal,
      autoSeason,
      isPersonal: !!(pTone || pAccent || pAccent2),
    };
  }, [custom, me, themePreview]);

  const themeDraft: StoreCtx['themeDraft'] = {
    themeTone: themePreview && 'themeTone' in themePreview ? themePreview.themeTone : me?.themeTone,
    themeAccent: themePreview && 'themeAccent' in themePreview ? themePreview.themeAccent : me?.themeAccent,
    themeAccent2: themePreview && 'themeAccent2' in themePreview ? themePreview.themeAccent2 : me?.themeAccent2,
    autoSeason: (themePreview?.autoSeason ?? me?.autoSeason) ?? false,
  };

  const previewTheme: StoreCtx['previewTheme'] = (patch) => setThemePreview((p) => ({ ...(p ?? {}), ...patch }));
  const clearThemePreview = () => setThemePreview(null);
  const saveTheme = () => {
    if (!user || !themePreview) return;
    setDb((d) =>
      withLog(
        { ...d, users: d.users.map((x) => (x.id === user.id ? { ...x, ...themePreview } : x)) },
        { userId: user.id, userName: user.name, type: 'profile', text: 'Saved their personal theme' }
      )
    );
    setThemePreview(null);
    pushToast('ok', 'Theme saved to your profile.');
  };

  useEffect(() => {
    const root = document.documentElement;
    const { accent, accent2, mood } = theme;
    if (accent) {
      root.style.setProperty('--color-flare-300', shade(accent, 0.35));
      root.style.setProperty('--color-flare-400', shade(accent, 0.18));
      root.style.setProperty('--color-flare-500', accent);
      root.style.setProperty('--color-flare-600', shade(accent, -0.12));
      root.style.setProperty('--color-flare-700', shade(accent, -0.22));
    } else ['--color-flare-300', '--color-flare-400', '--color-flare-500', '--color-flare-600', '--color-flare-700'].forEach((k) => root.style.removeProperty(k));
    if (accent2) {
      root.style.setProperty('--color-cyanx-300', shade(accent2, 0.3));
      root.style.setProperty('--color-cyanx-400', shade(accent2, 0.15));
      root.style.setProperty('--color-cyanx-500', accent2);
      root.style.setProperty('--color-cyanx-600', shade(accent2, -0.18));
    } else ['--color-cyanx-300', '--color-cyanx-400', '--color-cyanx-500', '--color-cyanx-600'].forEach((k) => root.style.removeProperty(k));
    ['--color-ink-950', '--color-ink-900', '--color-ink-850', '--color-ink-800', '--color-ink-700', '--color-ink-600', '--color-ink-500'].forEach((k, i) => root.style.setProperty(k, mood.tones[i]));
    // light moods invert the text ramp so everything stays readable
    const mist = mood.mist ?? DEFAULT_MIST;
    ['--color-mist-50', '--color-mist-100', '--color-mist-200', '--color-mist-300', '--color-mist-400', '--color-mist-500', '--color-mist-600'].forEach((k, i) => root.style.setProperty(k, mist[i]));

    // ambient backdrop — grid lines + glows follow the mood's curated palette.
    // Opacities are deliberately bold so a mood switch is unmistakable, and the
    // variables are written to both <html> and <body> so no cascade layer can
    // strand them above the .bg-blueprint surfaces.
    const isLight = !!mood.mist;
    // keep <body> in lockstep regardless of CSS cascade (direct, not via variable)
    document.body.style.backgroundColor = mood.tones[0];
    const line = mood.line ?? accent2 ?? '#56c8f0';
    const warm = accent ?? mood.warm ?? '#ff6b1c';
    const gridA = isLight ? 0.16 : 0.09;
    const gridB = isLight ? 0.08 : 0.045;
    const glowA = isLight ? 0.14 : 0.14;
    const glowB = isLight ? 0.10 : 0.11;
    const pairs: [string, string][] = [
      ['--bg-grid', rgba(line, gridA)],
      ['--bg-grid-fine', rgba(line, gridB)],
      ['--bg-glow-a', rgba(line, glowA)],
      ['--bg-glow-b', rgba(warm, glowB)],
    ];
    for (const [k, v] of pairs) {
      root.style.setProperty(k, v);
      document.body.style.setProperty(k, v);
    }
  }, [theme]);

  const activities = useMemo(() => deriveActivities(db.papers), [db.papers]);

  const visiblePapers = useMemo(() => {
    if (!me) return [];
    if (me.role === 'admin' || me.role === 'supervisor' || me.role === 'moderator' || me.role === 'operator') return [...db.papers].sort((a, b) => b.updatedAt - a.updatedAt);
    if (me.role === 'employee' || me.role === 'joborder')
      return db.papers.filter((p) => (p.assignees ?? []).includes(me.id)).sort((a, b) => b.updatedAt - a.updatedAt);
    const mine = (p: Paper) =>
      p.divisionId === me.divisionId || p.intendedId === me.divisionId ||
      (p.recipientIds ?? []).includes(me.divisionId ?? '') ||
      p.custody.some((e) => e.toDivisionId === me.divisionId || e.fromDivisionId === me.divisionId);
    return db.papers.filter(mine).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.papers, me]);

  /**
   * Papers in scope for the Command View. Overseers see everything; division
   * heads AND the employees/job-order under the same division share one
   * division-level picture (desk load, urgent, overdue…).
   */
  const scopePapers = useMemo(() => {
    if (!me) return [];
    if (me.role === 'admin' || me.role === 'supervisor' || me.role === 'moderator' || me.role === 'operator')
      return [...db.papers].sort((a, b) => b.updatedAt - a.updatedAt);
    const divId = me.divisionId ?? '';
    return db.papers
      .filter(
        (p) =>
          p.divisionId === divId ||
          p.intendedId === divId ||
          (p.recipientIds ?? []).includes(divId) ||
          p.custody.some((e) => e.toDivisionId === divId || e.fromDivisionId === divId)
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.papers, me]);

  const visibleNotifs = useMemo(() => {
    if (!me) return [];
    const vis = db.notifs.filter((n) =>
      // overseers see everything; everyone else only what's intended for them
      me.role === 'admin' || me.role === 'moderator' || me.role === 'operator'
        ? true
        : me.role === 'supervisor'
          ? n.targetUserId === me.id || n.scope.type === 'supervisors'
          : me.role === 'division'
            ? n.targetUserId === me.id || (n.scope.type === 'division' && n.scope.divisionId === me.divisionId)
            : n.targetUserId === me.id
    );
    return [...vis].sort((a, b) => b.at - a.at);
  }, [db.notifs, me]);

  const unread = useMemo(() => (me ? visibleNotifs.filter((n) => !n.readBy.includes(me.id)).length : 0), [visibleNotifs, me]);

  const pushToast = (kind: Toast['kind'], text: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };

  const pushNotif = (d: DB, n: Omit<Notif, 'id' | 'at' | 'readBy'>, currentUser: User): DB => {
    const notif: Notif = { ...n, id: uid(), at: Date.now(), readBy: [currentUser.id] };
    // Same scoping rule as the bell: overseers see all; division heads see their
    // division's signals; employees / job-order only signals addressed to them.
    const targetsMe =
      currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.role === 'operator'
        ? true
        : currentUser.role === 'supervisor'
          ? n.targetUserId === currentUser.id || n.scope.type === 'supervisors'
          : currentUser.role === 'division'
            ? n.targetUserId === currentUser.id || (n.scope.type === 'division' && n.scope.divisionId === currentUser.divisionId)
            : n.targetUserId === currentUser.id;
    if (targetsMe) fireBrowser('OCE Flow — ' + (n.ref ?? 'Update'), n.text);
    return { ...d, notifs: [notif, ...d.notifs].slice(0, 80) };
  };

  const canEdit = (p: Paper): boolean => {
    if (!me) return false;
    // operator moves/updates papers like the moderator — but never edits or deletes records
    if (me.role === 'admin' || me.role === 'supervisor' || me.role === 'moderator' || me.role === 'operator') return true;
    if (me.role === 'employee' || me.role === 'joborder') return (p.assignees ?? []).includes(me.id);
    if ((p.recipientIds?.length ?? 0) > 1) return (p.recipientIds ?? []).includes(me.divisionId ?? '');
    return me.divisionId === p.divisionId;
  };

  const canManageDivision = (divId: string): boolean => {
    if (!user) return false;
    // Operator is intentionally excluded — it can move paperwork but never manage heads / OICs.
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'moderator') return true;
    if (db.divisions?.[divId]?.oicId === user.id) return false;
    if (user.role === 'division') {
      const info = divOf(divId);
      return info?.headUser === user.id;
    }
    return false;
  };

  const employeesOf = (unitId: string | undefined): User[] =>
    db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && u.divisionId === unitId && u.status === 'active');

  /* ---- auth ---- */
  const login = (username: string, password: string): string | null => {
    const u = db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u) return 'Access denied — account not found in the authorized register.';
    if (u.password !== password) return 'Access denied — incorrect password for this account.';
    if (u.status === 'pending') return 'Account is pending administrator verification. Sign-in is disabled until your request is approved.';
    if (u.status === 'disabled') return 'This account has been disabled by the administrator.';
    setDb((d) => withLog({ ...d, session: u.id }, { userId: u.id, userName: u.name, type: 'login', text: 'Signed in to OCE Flow — session start' }));
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
    } catch { /* ignore */ }
    return null;
  };

  const logout = () => {
    setDb((d) => user ? withLog({ ...d, session: null }, { userId: user.id, userName: user.name, type: 'logout', text: 'Signed out — session closed' }) : { ...d, session: null });
    setThemePreview(null); // unsaved theme edits never follow into the next session
    setUi((u) => ({ ...u, drawerId: null, newOpen: false, reportOpen: false, reportPreset: null, profileOpen: false, viewer: null, search: '' }));
  };

  const resetDemo = () => {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setDb(user ? withLog(freshSeed(), { userId: user.id, userName: user.name, type: 'reset', text: 'Restored demo dataset to the original seed' }) : freshSeed());
    pushToast('ok', 'Demo data restored to the original seed');
  };

  /* ---- accounts ---- */
  const signup: StoreCtx['signup'] = (input) => {
    const name = input.name.trim();
    const username = input.username.trim().toLowerCase();
    if (name.length < 3) return 'Please enter your full name as it should appear on documents.';
    if (!/^[a-z0-9._-]{3,20}$/.test(username)) return 'Username must be 3-20 characters — letters, numbers, dots or dashes.';
    if (db.users.some((x) => x.username.toLowerCase() === username)) return 'That username is already taken — choose another.';
    if (input.password.length < 6) return 'Password must be at least 6 characters long.';
    const email = input.email?.trim() || undefined;
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'That email address does not look valid — check it and try again.';
    const div = divById(input.divisionId);
    const nu: User = {
      id: uid(), name, username, password: input.password, role: 'division',
      title: input.title.trim() || 'Division Staff', divisionId: input.divisionId, status: 'pending',
      requestedDivisionId: input.divisionId, requestedTitle: input.title.trim(), requestedAt: Date.now(),
      phone: input.phone?.trim() || undefined, address: input.address?.trim() || undefined, email,
      teamIds: input.teamIds?.length ? input.teamIds : undefined,
    };
    setDb((d) => {
      let next: DB = { ...d, users: [...d.users, nu] };
      next = withLog(next, { userId: nu.id, userName: nu.name, type: 'signup', text: `Submitted an account request (${div?.code ?? input.divisionId})${email ? ` · ${email}` : ''} — pending administrator verification` });
      next = pushNotif(next, { text: `Account request — ${nu.name} (${div?.name ?? 'division'}) is awaiting administrator verification`, kind: 'account', scope: { type: 'supervisors' } }, nu);
      return next;
    });
    fireBrowser('OCE Flow — account request', `${nu.name} requested access (${div?.code ?? ''}) — pending verification`);
    return null;
  };

  const approveUser = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === id);
    if (!t) return;
    setDb((d) => withLog({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: 'active' as const } : x)) },
      { userId: user.id, userName: user.name, type: 'approve', text: `Approved account request of ${t.name} (@${t.username})` }));
    pushToast('ok', `${t.name} verified — they can now sign in`);
  };

  const denyUser = (id: string) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === id);
    if (!t) return;
    setDb((d) => withLog({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, status: 'disabled' as const } : x)) },
      { userId: user.id, userName: user.name, type: 'deny', text: `Denied account request of ${t.name} (@${t.username})` }));
    pushToast('warn', `Request from ${t.name} denied — account disabled`);
  };

  const updateUser: StoreCtx['updateUser'] = (id, patch) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === id);
    if (!t) return;
    const cleaned: Partial<User> = { ...patch };
    if (!cleaned.password) delete cleaned.password;
    if (cleaned.divisionId === undefined) delete cleaned.divisionId;
    else if (cleaned.divisionId === '') cleaned.divisionId = undefined;
    setDb((d) => withLog({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, ...cleaned } : x)) },
      { userId: user.id, userName: user.name, type: 'edit', text: `Edited account of ${t.name}${cleaned.status && cleaned.status !== t.status ? ` — status set to ${cleaned.status}` : ''}${cleaned.role && cleaned.role !== t.role ? ` — role set to ${cleaned.role}` : ''}` }));
    pushToast('ok', `Account of ${t.name} updated`);
  };

  const changePassword: StoreCtx['changePassword'] = (current, next) => {
    if (!user) return 'Not signed in.';
    if (user.password !== current) return 'Current password is incorrect.';
    if (next.length < 6) return 'New password must be at least 6 characters long.';
    if (next === current) return 'New password must be different from the current one.';
    setDb((d) => withLog({ ...d, users: d.users.map((x) => (x.id === user.id ? { ...x, password: next, passwordResetAt: undefined } : x)) },
      { userId: user.id, userName: user.name, type: 'profile', text: 'Changed their own password from the profile panel' }));
    pushToast('ok', 'Password updated — use it the next time you sign in');
    return null;
  };

  const updateProfile: StoreCtx['updateProfile'] = (patch) => {
    if (!user) return 'Not signed in.';
    const name = (patch.name ?? user.name).trim();
    if (name.length < 3) return 'Full name must be at least 3 characters.';
    const email = (patch.email ?? '').trim() || undefined;
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'That email address does not look valid.';
    const clean = {
      name,
      title: (patch.title ?? user.title).trim() || user.title,
      phone: (patch.phone ?? '').trim() || undefined,
      email,
      address: (patch.address ?? '').trim() || undefined,
    };
    setDb((d) => withLog({ ...d, users: d.users.map((x) => (x.id === user.id ? { ...x, ...clean } : x)) },
      { userId: user.id, userName: user.name, type: 'profile', text: 'Updated their profile details from the profile panel' }));
    pushToast('ok', 'Profile updated.');
    return null;
  };

  const requestPasswordReset = () => {
    if (!user || user.passwordResetAt) return;
    setDb((d) => {
      let next: DB = { ...d, users: d.users.map((x) => (x.id === user.id ? { ...x, passwordResetAt: Date.now() } : x)) };
      next = withLog(next, { userId: user.id, userName: user.name, type: 'resetreq', text: 'Requested a password reset (to OCE@2026) — awaiting program admin verification' });
      next = pushNotif(next, { text: `Password reset request — ${user.name} (@${user.username}) asks to reset their password to OCE@2026`, kind: 'account', scope: { type: 'supervisors' } }, user);
      return next;
    });
    pushToast('ok', 'Reset request sent — the program admin will verify and set it to OCE@2026');
  };

  const requestForgotPassword: StoreCtx['requestForgotPassword'] = (username, contact) => {
    const uname = username.trim().toLowerCase();
    if (!uname) return 'Enter your username so the administrator can locate your account.';
    const target = db.users.find((x) => x.username.toLowerCase() === uname);
    if (!target) return 'No account matches that username — check it, or request a new account instead.';
    if (target.status === 'disabled') return 'This account has been disabled. Contact the program administrator directly.';
    if (target.passwordResetAt) return 'A reset request is already pending for this account — the program admin is on it.';
    const hint = contact?.trim();
    const snap: User = { ...target };
    setDb((d) => {
      let next: DB = { ...d, users: d.users.map((x) => (x.id === snap.id ? { ...x, passwordResetAt: Date.now() } : x)) };
      next = withLog(next, { userId: snap.id, userName: snap.name, type: 'resetreq', text: `Forgot-password request from the sign-in gate${hint ? ` · contact given: ${hint}` : ''} — awaiting program admin verification` });
      next = pushNotif(next, { text: `Forgot-password request — ${snap.name} (@${snap.username})${hint ? ` · ${hint}` : ''} asks to reset to OCE@2026`, kind: 'account', scope: { type: 'supervisors' } }, snap);
      return next;
    });
    fireBrowser('OCE Flow — forgot password', `${snap.name} (@${snap.username}) requested a password reset`);
    return null;
  };

  const approvePasswordReset = (userId: string) => {
    if (!user || user.role !== 'admin') return;
    const t = db.users.find((x) => x.id === userId);
    if (!t) return;
    setDb((d) => {
      let next: DB = { ...d, users: d.users.map((x) => (x.id === userId ? { ...x, password: 'OCE@2026', passwordResetAt: undefined } : x)) };
      next = withLog(next, { userId: user.id, userName: user.name, type: 'reset', text: `Approved password reset for ${t.name} (@${t.username}) — set to the default OCE@2026` });
      next = pushNotif(next, { text: 'Your password was reset by the administrator — your new default password is OCE@2026. Change it from your profile after signing in.', kind: 'account', scope: { type: 'division', divisionId: t.divisionId ?? '' }, targetUserId: t.id }, user);
      return next;
    });
    pushToast('ok', `${t.name}'s password reset to OCE@2026 — they have been notified`);
  };

  /* ---- papers ---- */
  const touch = (p: Paper, fn: (p: Paper) => Paper): Paper => { const n = fn(p); return { ...n, updatedAt: Date.now() }; };

  const createPaper: StoreCtx['createPaper'] = (input) => {
    if (!me) return;
    const primaryId = input.recipientIds[0];
    const div = divById(primaryId);
    const ref = `OCE-2026-${String(db.seq).padStart(4, '0')}`;
    const nowTs = Date.now();
    const pics = db.users.filter((u) => (u.role === 'employee' || u.role === 'joborder') && (input.assigneeIds ?? []).includes(u.id));
    const paper: Paper = {
      id: uid(), ref, title: input.title.trim(), kind: input.kind, priority: input.priority,
      origin: input.origin.trim() || 'Walk-in / internal', divisionId: primaryId, intendedId: primaryId, stage: 'received',
      attachments: input.attachments,
      custody: [{
        id: uid(), at: nowTs, byName: me.name, action: 'created',
        text: `Logged into the system and transmitted to ${div?.name ?? primaryId}${input.recipientIds.length > 1 ? ` (+${input.recipientIds.length - 1} more desks)` : ''}`,
        fromDivisionId: myUnitId ?? undefined, toDivisionId: primaryId,
      }],
      createdAt: nowTs, updatedAt: nowTs, byId: me.id, byName: me.name,
      dueAt: input.dueAt, remarks: input.remarks?.trim() || undefined, diverted: false,
      recipientIds: input.recipientIds, receivedBy: [], assignees: pics.length ? pics.map((p) => p.id) : undefined, progress: 0,
    };
    setDb((d) => {
      let next: DB = { ...d, papers: [paper, ...d.papers], seq: d.seq + 1 };
      for (const rid of input.recipientIds) {
        next = pushNotif(next, { text: `New ${paper.kind === 'work-order' ? 'work order' : paper.kind} ${ref} — ${paper.title.slice(0, 60)}`, kind: 'new', docId: paper.id, ref, scope: { type: 'division', divisionId: rid } }, me);
      }
      if (me.role === 'division') {
        next = pushNotif(next, { text: `${ref} posted by ${me.name} for ${div?.code ?? ''}`, kind: 'new', docId: paper.id, ref, scope: { type: 'supervisors' } }, me);
      }
      next = withLog(next, { userId: me.id, userName: me.name, type: 'create', text: `Logged ${ref} — ${paper.title.slice(0, 70)} → ${div?.code ?? ''}`, ref, docId: paper.id });
      return next;
    });
    fireBrowser('OCE Flow — ' + ref, `New paperwork logged and transmitted to ${div?.code ?? 'division'}`);
    pushToast('ok', `${ref} created and transmitted to ${div?.code ?? 'division'}`);
    setUi((u) => ({ ...u, newOpen: false, page: 'board', divFilter: me.role === 'admin' || me.role === 'supervisor' || me.role === 'moderator' ? primaryId : u.divFilter, drawerId: paper.id }));
  };

  const moveStage: StoreCtx['moveStage'] = (id, stage, note, employeeId) => {
    if (!me) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    if (p.stage === stage && employeeId === undefined) return;
    if (!canEdit(p)) {
      pushToast('warn', `Only ${divById(p.divisionId)?.name ?? 'the assigned division'} or an overseer can move this paper`);
      return;
    }
    if ((me.role === 'employee' || me.role === 'joborder') && stage === 'completed') {
      pushToast('warn', 'Completion is verified by your division head — submit the paper for review instead');
      return;
    }
    const meta = stageMeta(stage);
    const emp = employeeId !== undefined ? db.users.find((u) => u.id === employeeId) : undefined;
    const picNote = emp ? ` · person-in-charge: ${emp.name}` : '';
    const entry: CustodyEntryLocal = {
      id: uid(), at: Date.now(), byName: me.name, action: 'stage', stage,
      text: note?.trim() ? `${meta.label} — ${note.trim()}${picNote}` : `Moved to ${meta.label}${picNote}`,
    };
    setDb((d) => {
      let next: DB = {
        ...d,
        papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({
          ...pp, stage,
          assignedTo: undefined,
          assignees: employeeId !== undefined ? (employeeId ? [employeeId] : undefined) : pp.assignees,
          pendingHeadReview: false,
          progress: stage === 'completed' ? 100 : pp.progress,
          custody: [...pp.custody, entry],
        })) : x),
      };
      if (emp && !(p.assignees ?? []).includes(emp.id)) {
        next = pushNotif(next, { text: `${p.ref} assigned to you — ${p.title.slice(0, 58)}`, kind: 'new', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId }, targetUserId: emp.id }, me);
      }
      if (stage === 'completed') {
        next = pushNotif(next, { text: `${p.ref} completed — ${p.title.slice(0, 64)}`, kind: 'complete', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } }, me);
      }
      next = withLog(next, { userId: me.id, userName: me.name, type: 'stage', text: `Moved ${p.ref} to ${meta.label}${note?.trim() ? ` — ${note.trim()}` : ''}`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', emp ? `${p.ref} moved to ${meta.label} — ${emp.name} designated person-in-charge` : `${p.ref} moved to ${meta.label}`);
  };

  const routePaperMulti: StoreCtx['routePaperMulti'] = (id, targets, note) => {
    if (!me) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p || !targets.length) return;
    if (!canEdit(p)) {
      pushToast('warn', 'Only the holding desk or an overseer can forward this paper');
      return;
    }
    const codes = targets.map((t) => divById(t)?.code ?? t).join(', ');
    const entry: CustodyEntryLocal = {
      id: uid(), at: Date.now(), byName: me.name, action: 'routed', fromDivisionId: p.divisionId, toDivisionId: targets[0],
      text: targets.length === 1
        ? `Forwarded to ${divById(targets[0])?.name ?? targets[0]}${note?.trim() ? ` — ${note.trim()}` : ''}`
        : `Circulated to ${codes}${note?.trim() ? ` — ${note.trim()}` : ''}`,
    };
    setDb((d) => {
      let next: DB = {
        ...d,
        papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({
          ...pp, divisionId: targets[0], stage: 'received',
          recipientIds: targets, receivedBy: [],
          diverted: !targets.includes(pp.intendedId),
          custody: [...pp.custody, entry],
        })) : x),
      };
      for (const t of targets) {
        next = pushNotif(next, { text: `${p.ref} forwarded to your desk by ${me.name} — ${p.title.slice(0, 56)}`, kind: 'route', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: t } }, me);
      }
      if (me.role === 'division') {
        next = pushNotif(next, { text: `${p.ref} re-routed to ${codes} by ${me.name}`, kind: 'route', docId: p.id, ref: p.ref, scope: { type: 'supervisors' } }, me);
      }
      next = withLog(next, { userId: me.id, userName: me.name, type: 'route', text: `Forwarded ${p.ref} to ${codes}`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', `${p.ref} forwarded to ${codes} — now in their Received tray${targets.length > 1 ? 's' : ''}`);
  };

  const ackPaper: StoreCtx['ackPaper'] = (id, unitId) => {
    if (!me) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    /* desks this officer may stamp: their real membership plus any unit they are OIC of */
    const eligible = Array.from(new Set([myUnitId, ...oicUnitIds].filter((u): u is string => !!u)));
    const candidates = eligible.filter((u) => (p.recipientIds ?? []).includes(u) && !(p.receivedBy ?? []).includes(u));
    const unit = unitId && candidates.includes(unitId) ? unitId : candidates[0];
    if (!unit) {
      pushToast('warn', eligible.length === 0 ? 'You are not an addressee of this paper' : 'Your desks have already stamped this paper');
      return;
    }
    const unitName = divById(unit)?.name ?? unit;
    const asOic = unit !== myUnitId;
    const entry: CustodyEntryLocal = { id: uid(), at: Date.now(), byName: me.name, action: 'received', toDivisionId: unit, text: `Receipt acknowledged for ${unitName}${asOic ? ` (acting OIC — ${me.name})` : ''}` };
    setDb((d) => withLog({
      ...d,
      papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, receivedBy: [...(pp.receivedBy ?? []), unit], custody: [...pp.custody, entry] })) : x),
    }, { userId: me.id, userName: me.name, type: 'create', text: `Acknowledged receipt of ${p.ref} for ${divById(unit)?.code ?? unit}${asOic ? ' as OIC' : ''}`, ref: p.ref, docId: p.id }));
    const total = (p.recipientIds ?? []).length;
    const done = (p.receivedBy ?? []).length + 1;
    pushToast('ok', done === total ? `${p.ref} — all ${total} desks have acknowledged receipt` : `Receipt recorded for ${divById(unit)?.code ?? unit} — ${done} of ${total} desks acknowledged`);
  };

  const addNote: StoreCtx['addNote'] = (id, text) => {
    if (!me || !text.trim()) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const entry: CustodyEntryLocal = { id: uid(), at: Date.now(), byName: me.name, action: 'note', text: text.trim() };
    setDb((d) => withLog({ ...d, papers: d.papers.map((x) => (x.id === id ? touch(x, (pp) => ({ ...pp, custody: [...pp.custody, entry] })) : x)) },
      { userId: me.id, userName: me.name, type: 'note', text: `Remark on ${p.ref} — ${text.trim().slice(0, 70)}`, ref: p.ref, docId: p.id }));
    pushToast('ok', 'Remark added to the chain of custody');
  };

  const addAttachments: StoreCtx['addAttachments'] = (id, atts) => {
    if (!me || atts.length === 0) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const entry: CustodyEntryLocal = { id: uid(), at: Date.now(), byName: me.name, action: 'attachment', text: `Attached ${atts.length} file(s) — ${atts.map((a) => a.name).join(', ').slice(0, 80)}` };
    setDb((d) => withLog({ ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, attachments: [...pp.attachments, ...atts], custody: [...pp.custody, entry] })) : x) },
      { userId: me.id, userName: me.name, type: 'attachment', text: `Attached ${atts.length} file(s) to ${p.ref}`, ref: p.ref, docId: p.id }));
    const geos = atts.filter((a) => a.geotagged).length;
    pushToast('ok', geos > 0 ? `${atts.length} file(s) attached — ${geos} geotagged photo(s) linked to the map` : `${atts.length} file(s) attached`);
  };

  const removeAttachment: StoreCtx['removeAttachment'] = (docId, attId) => {
    if (!me) return;
    const p = db.papers.find((x) => x.id === docId);
    const a = p?.attachments.find((x) => x.id === attId);
    if (!p || !a) return;
    const remainingGeos = p.attachments.filter((x) => x.id !== attId && x.geotagged).length;
    const entry: CustodyEntryLocal = { id: uid(), at: Date.now(), byName: me.name, action: 'attachment', text: `Removed attachment ${a.name}${a.geotagged && remainingGeos === 0 ? ' — geotag map cleared' : ''}` };
    setDb((d) => withLog({ ...d, papers: d.papers.map((x) => x.id === docId ? touch(x, (pp) => ({ ...pp, attachments: pp.attachments.filter((f) => f.id !== attId), custody: [...pp.custody, entry] })) : x) },
      { userId: me.id, userName: me.name, type: 'attachment', text: `Removed attachment ${a.name} from ${p.ref}`, ref: p.ref, docId }));
    pushToast('ok', remainingGeos === 0 && a.geotagged ? `${a.name} removed — no geotagged photos remain, so the map link was cleared` : `${a.name} removed from ${p.ref}`);
  };

  /** Stamp the device's live GPS onto photos whose EXIF location was stripped by the browser/OS. */
  const stampGeoAttachments: StoreCtx['stampGeoAttachments'] = (docId, attIds, lat, lng) => {
    if (!me) return;
    const p = db.papers.find((x) => x.id === docId);
    if (!p) return;
    const want = new Set(attIds);
    const n = p.attachments.filter((a) => want.has(a.id) && !a.geotagged).length;
    if (!n) return;
    const coord = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const entry: CustodyEntryLocal = { id: uid(), at: Date.now(), byName: me.name, action: 'attachment', text: `Device GPS stamped on ${n} photo(s) — ${coord}` };
    setDb((d) => withLog({ ...d, papers: d.papers.map((x) => x.id === docId ? touch(x, (pp) => ({
      ...pp,
      attachments: pp.attachments.map((a) => want.has(a.id) && !a.geotagged ? { ...a, geotagged: true, lat, lng, geoSource: 'device' as const } : a),
      custody: [...pp.custody, entry],
    })) : x) },
      { userId: me.id, userName: me.name, type: 'attachment', text: `Stamped device GPS (${coord}) on ${n} photo(s) of ${p.ref}`, ref: p.ref, docId }));
    pushToast('ok', `${n} photo(s) stamped at ${lat.toFixed(4)}, ${lng.toFixed(4)} — map updated`);
  };

  const setProgress: StoreCtx['setProgress'] = (id, value) => {
    if (!me) return;
    /* half-percent granularity: 52, 52.5, 53 … */
    const v = Math.max(0, Math.min(100, Math.round(value * 2) / 2));
    const p = db.papers.find((x) => x.id === id);
    if (!p || !canEdit(p)) return;
    if (p.progress === v) return;
    if ((me.role === 'employee' || me.role === 'joborder') && v >= 100) {
      pushToast('warn', 'Only the division head can mark a work order 100% complete — submit it for verification instead');
      return;
    }
    const label = v % 1 === 0 ? String(v) : v.toFixed(1);
    setDb((d) => withLog({ ...d, papers: d.papers.map((x) => (x.id === id ? touch(x, (pp) => ({ ...pp, progress: v })) : x)) },
      { userId: me.id, userName: me.name, type: 'stage', text: `Set completion of ${p.ref} to ${label}%`, ref: p.ref, docId: p.id }));
    pushToast('ok', `${p.ref} completion set to ${label}%`);
  };

  const assignPaper: StoreCtx['assignPaper'] = (id, ids) => {
    if (!me || me.role === 'employee' || me.role === 'joborder') {
      pushToast('warn', 'Only the division head or an overseer can designate the persons-in-charge');
      return;
    }
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    const prev = p.assignees ?? [];
    const nextIds = [...new Set(ids.filter(Boolean))];
    if (JSON.stringify(prev) === JSON.stringify(nextIds)) return;
    const picUsers = db.users.filter((u) => nextIds.includes(u.id));
    const added = picUsers.filter((u) => !prev.includes(u.id));
    const entry: CustodyEntryLocal = {
      id: uid(), at: Date.now(), byName: me.name, action: 'note',
      text: picUsers.length ? `Persons-in-charge designated — ${picUsers.map((u) => u.name).join(', ')}` : 'Persons-in-charge cleared — paper is unassigned',
    };
    setDb((d) => {
      let next: DB = { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, assignees: nextIds.length ? nextIds : undefined, custody: [...pp.custody, entry] })) : x) };
      for (const emp of added) {
        next = pushNotif(next, { text: `${p.ref} assigned to you by ${me.name} — ${p.title.slice(0, 56)}`, kind: 'new', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId }, targetUserId: emp.id }, me);
      }
      next = withLog(next, { userId: me.id, userName: me.name, type: 'stage', text: picUsers.length ? `Assigned ${p.ref} to ${picUsers.map((u) => u.name).join(', ')} as persons-in-charge` : `Cleared persons-in-charge on ${p.ref}`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', picUsers.length ? `${p.ref} — ${picUsers.map((u) => u.name).join(', ')} now in charge` : `${p.ref} is now unassigned`);
  };

  const submitToHead: StoreCtx['submitToHead'] = (id) => {
    if (!me || (me.role !== 'employee' && me.role !== 'joborder')) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p || !(p.assignees ?? []).includes(me.id) || p.pendingHeadReview || p.stage === 'completed') return;
    const entry: CustodyEntryLocal = { id: uid(), at: Date.now(), byName: me.name, action: 'note', text: 'Submitted to division head for verification' };
    setDb((d) => {
      let next: DB = { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, pendingHeadReview: true, stage: pp.stage === 'received' || pp.stage === 'review' ? 'verification' : pp.stage, custody: [...pp.custody, entry] })) : x) };
      next = pushNotif(next, { text: `${p.ref} submitted for verification by ${me.name} — ${p.title.slice(0, 56)}`, kind: 'move', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId } }, me);
      next = withLog(next, { userId: me.id, userName: me.name, type: 'stage', text: `Submitted ${p.ref} to the division head for verification`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('ok', `${p.ref} submitted — your division head will verify the work`);
  };

  const returnToEmployee: StoreCtx['returnToEmployee'] = (id) => {
    if (!me) return;
    if (me.role === 'employee' || me.role === 'joborder') return;
    if (me.role === 'division' && !(me.divisionId && db.papers.find((x) => x.id === id)?.divisionId === me.divisionId)) return;
    const p = db.papers.find((x) => x.id === id);
    if (!p || !p.pendingHeadReview) return;
    const emps = db.users.filter((u) => (p.assignees ?? []).includes(u.id));
    const entry: CustodyEntryLocal = { id: uid(), at: Date.now(), byName: me.name, action: 'note', text: 'Returned by division head for rework — verification not yet passed' };
    setDb((d) => {
      let next: DB = { ...d, papers: d.papers.map((x) => x.id === id ? touch(x, (pp) => ({ ...pp, stage: 'progress' as Stage, pendingHeadReview: false, custody: [...pp.custody, entry] })) : x) };
      for (const emp of emps) {
        next = pushNotif(next, { text: `${p.ref} returned for rework by ${me.name} — revise and resubmit`, kind: 'route', docId: p.id, ref: p.ref, scope: { type: 'division', divisionId: p.divisionId }, targetUserId: emp.id }, me);
      }
      next = withLog(next, { userId: me.id, userName: me.name, type: 'stage', text: `Returned ${p.ref} to ${emps.length ? emps.map((e) => e.name).join(', ') : 'employee'} for rework`, ref: p.ref, docId: p.id });
      return next;
    });
    pushToast('warn', `${p.ref} returned to ${emps.length ? emps.map((e) => e.name).join(', ') : 'the employee'} for rework`);
  };

  const deletePaper: StoreCtx['deletePaper'] = (id) => {
    if (!me || (me.role !== 'admin' && me.role !== 'moderator')) {
      pushToast('warn', 'Only the program admin or the moderator can delete board entries.');
      return;
    }
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    setDb((d) => withLog({ ...d, papers: d.papers.filter((x) => x.id !== id) },
      { userId: me.id, userName: me.name, type: 'delete', text: `Deleted board entry ${p.ref} — ${p.title.slice(0, 60)}`, ref: p.ref, docId: p.id }));
    setUi((u) => ({ ...u, drawerId: null }));
    pushToast('warn', `${p.ref} deleted from the board`);
  };

  const updatePaper: StoreCtx['updatePaper'] = (id, patch) => {
    if (!me) return;
    if (me.role !== 'admin' && me.role !== 'moderator') {
      pushToast('warn', 'Only the program admin or the moderator can edit board entries.');
      return;
    }
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    setDb((d) => withLog({ ...d, papers: d.papers.map((x) => (x.id === id ? touch(x, (pp) => ({ ...pp, ...patch })) : x)) },
      { userId: me.id, userName: me.name, type: 'edit', text: `Edited ${p.ref} — updated record details`, ref: p.ref, docId: p.id }));
    pushToast('ok', `${p.ref} updated`);
  };

  /* ---- divisions / OIC ---- */
  const writeDivMeta = (id: string, patch: DivisionMeta, logText: string) => {
    if (!user) return;
    setDb((d) => withLog({ ...d, divisions: { ...(d.divisions ?? {}), [id]: { ...(d.divisions?.[id] ?? {}), ...patch } } },
      { userId: user.id, userName: user.name, type: 'edit', text: logText, ref: divById(id)?.code }));
  };

  const updateDivision: StoreCtx['updateDivision'] = (id, patch) => {
    if (!canManageDivision(id)) {
      pushToast('warn', 'Only the program admin, an executive, the moderator, or the permanent division head can edit this division.');
      return;
    }
    const info = divOf(id);
    const clean: DivisionMeta = {};
    if (patch.name !== undefined) clean.name = patch.name.trim() || undefined;
    if (patch.desc !== undefined) clean.desc = patch.desc.trim() || undefined;
    writeDivMeta(id, clean, `Edited ${info?.name ?? id} — updated ${[clean.name && 'title', clean.desc && 'description'].filter(Boolean).join(' & ') || 'details'}`);
    pushToast('ok', `${info?.name ?? 'Division'} details updated`);
  };

  const setDivisionHead: StoreCtx['setDivisionHead'] = (id, userId, temporary, note) => {
    if (!canManageDivision(id)) {
      pushToast('warn', 'Only the program admin, an executive, the moderator, or the permanent division head can change the head of this division.');
      return;
    }
    const target = db.users.find((u) => u.id === userId);
    const info = divOf(id);
    if (!target) return;
    if (temporary) {
      writeDivMeta(id, { oicId: target.id, oicName: target.name, oicSince: Date.now(), oicNote: note?.trim() || undefined },
        `Designated ${target.name} as OIC (temporary head) of ${info?.name ?? id}${note ? ` — ${note.trim()}` : ''}`);
      pushToast('ok', `${target.name} is now OIC of ${info?.code ?? id} — the permanent head is retained for reinstatement`);
    } else {
      writeDivMeta(id, { headName: target.name, headUserId: target.id, oicId: undefined, oicName: undefined, oicSince: undefined, oicNote: undefined },
        `Appointed ${target.name} as permanent head of ${info?.name ?? id} (replaces ${info?.head ?? 'the previous head'})`);
      pushToast('ok', `${target.name} is now the permanent head of ${info?.code ?? id}`);
    }
  };

  const removeDivisionOIC: StoreCtx['removeDivisionOIC'] = (id) => {
    if (!canManageDivision(id)) {
      pushToast('warn', 'Only the program admin, an executive, the moderator, or the permanent division head can remove the OIC.');
      return;
    }
    const info = divOf(id);
    writeDivMeta(id, { oicId: undefined, oicName: undefined, oicSince: undefined, oicNote: undefined },
      `Removed ${info?.oicName ?? 'the OIC'} as OIC of ${info?.name ?? id} — ${info?.head ?? 'the permanent head'} resumes command`);
    pushToast('ok', `OIC removed — ${info?.head ?? 'the permanent head'} resumes command of ${info?.code ?? id}`);
  };

  /* ---- customization ---- */
  const updateCustom: StoreCtx['updateCustom'] = (patch) => {
    if (!user || user.role !== 'admin') {
      pushToast('warn', 'Only the program admin can change the program’s look and settings.');
      return;
    }
    setDb((d) => withLog({ ...d, custom: { ...(d.custom ?? {}), ...patch } },
      { userId: user.id, userName: user.name, type: 'edit', text: `Updated program customization (${Object.keys(patch).join(', ')})` }));
    pushToast('ok', 'Customization saved — applied across the program.');
  };

  /** Any signed-in user can personalize their own theme from the profile panel. */
  const updateMyTheme: StoreCtx['updateMyTheme'] = (patch) => {
    if (!user) return;
    setDb((d) =>
      withLog(
        { ...d, users: d.users.map((x) => (x.id === user.id ? { ...x, ...patch } : x)) },
        { userId: user.id, userName: user.name, type: 'profile', text: 'Updated their personal theme' }
      )
    );
    pushToast('ok', 'Theme preference saved.');
  };

  /* ---- geotag barangay resolver ---- */
  const geotagBrgys = useMemo(
    () => [...new Set(Object.values(db.geobrgy ?? {}))].sort((a, b) => a.localeCompare(b)),
    [db.geobrgy]
  );

  useEffect(() => {
    const known = db.geobrgy ?? {};
    const missing: { lat: number; lng: number; key: string }[] = [];
    for (const p of db.papers) {
      for (const a of p.attachments) {
        // skip Null Island (0,0) — it means the GPS block was stripped, not a real site
        if (a.geotagged && a.lat != null && a.lng != null && !(a.lat === 0 && a.lng === 0)) {
          const key = geobrgyKey(a.lat, a.lng);
          if (!(key in known) && !missing.some((m) => m.key === key)) missing.push({ lat: a.lat, lng: a.lng, key });
        }
      }
    }
    if (missing.length === 0) return;
    let cancelled = false;
    let i = 0;
    const step = async () => {
      if (cancelled || i >= missing.length) return;
      const m = missing[i++];
      try {
        const res = await fetch(nominatimReverseUrl(m.lat, m.lng));
        const j = await res.json();
        const ad = j?.address ?? {};
        const raw: string = ad.suburb || ad.neighbourhood || ad.quarter || ad.city_district || ad.village || ad.town || '';
        const name = raw.replace(/^(Barangay|Brgy\.?)\s+/i, '').trim();
        if (name && !cancelled) {
          setDb((d) => ({ ...d, geobrgy: { ...(d.geobrgy ?? {}), [m.key]: name } }));
        }
      } catch { /* offline / rate-limited — skip quietly */ }
      window.setTimeout(step, 1100);
    };
    const t = window.setTimeout(step, 600);
    return () => { cancelled = true; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.papers]);

  /* ---- messaging ---- */
  const overseer = (r?: Role) => r === 'admin' || r === 'supervisor' || r === 'moderator' || r === 'operator';
  /* Channels follow the officer's TRUE identity — home division, additional
   * teams, and any unit they are designated OIC of. An OIC assignment only
   * ADDS a channel; it never takes their own division/team channels away,
   * and executives keep full oversight regardless of an OIC posting. */
  const channelUnits = useMemo(() => {
    const s = new Set<string>();
    if (user?.divisionId) s.add(user.divisionId);
    for (const t of user?.teamIds ?? []) s.add(t);
    if (oicOfDivId) s.add(oicOfDivId);
    return s;
  }, [user, oicOfDivId]);

  const canSeeChannel = (ch: Channel): boolean => {
    if (!user) return false;
    if (overseer(user.role)) return true;
    if (ch.kind === 'floor') return true;
    if (ch.kind === 'executive') return (ch.memberIds ?? []).includes(user.id);
    return !!ch.unitId && channelUnits.has(ch.unitId);
  };
  const canPostChannel = (ch: Channel): boolean => {
    if (!user) return false;
    if (ch.kind === 'executive') return (ch.memberIds ?? []).includes(user.id);
    if (ch.kind === 'floor') return true;
    return overseer(user.role) || (!!ch.unitId && channelUnits.has(ch.unitId));
  };
  const visibleChannels = useMemo(() => (db.channels ?? []).filter((ch) => canSeeChannel(ch)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.channels, user, channelUnits]);
  const readKey = (uid0: string, chId: string) => `${uid0}|${chId}`;
  const unreadFor = (chId: string): number => {
    if (!me) return 0;
    const last = db.reads?.[readKey(me.id, chId)] ?? 0;
    return (db.messages ?? []).filter((m) => m.channelId === chId && m.at > last && m.authorId !== me.id).length;
  };
  const msgUnreadTotal = useMemo(() => visibleChannels.reduce((a, ch) => a + unreadFor(ch.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleChannels, db.messages, db.reads, me]);
  const messagesOf = (chId: string): Message[] => (db.messages ?? []).filter((m) => m.channelId === chId).sort((a, b) => a.at - b.at);

  const sendMsg: StoreCtx['sendMsg'] = (channelId, text, docIds) => {
    if (!me) return;
    const ch = (db.channels ?? []).find((x) => x.id === channelId);
    if (!ch || !canPostChannel(ch)) return;
    const t = text.trim();
    if (!t) return;
    const docs = (docIds ?? []).map((id) => db.papers.find((p) => p.id === id)).filter((p): p is Paper => !!p).map((p) => ({ id: p.id, ref: p.ref }));
    const m: Message = { id: uid(), channelId, authorId: me.id, authorName: me.name, text: t.slice(0, 600), at: Date.now(), docs: docs.length ? docs : undefined };
    setDb((d) => ({ ...d, messages: [...(d.messages ?? []), m] }));
  };

  const markChannelRead: StoreCtx['markChannelRead'] = (chId) => {
    if (!me) return;
    setDb((d) => ({ ...d, reads: { ...(d.reads ?? {}), [readKey(me.id, chId)]: Date.now() } }));
  };

  /* ---- message edit / admin-verified delete ---- */

  /** Author may edit their own message within MSG_EDIT_WINDOW of posting. */
  const updateMessage: StoreCtx['updateMessage'] = (msgId, text) => {
    if (!me) return;
    const m = (db.messages ?? []).find((x) => x.id === msgId);
    if (!m) return;
    if (m.authorId !== me.id) {
      pushToast('warn', 'You can only edit your own messages.');
      return;
    }
    if (Date.now() - m.at > MSG_EDIT_WINDOW) {
      pushToast('warn', 'The 10-minute edit window for this message has closed.');
      return;
    }
    const t = text.trim();
    if (!t) return;
    setDb((d) => ({
      ...d,
      messages: (d.messages ?? []).map((x) => (x.id === msgId ? { ...x, text: t.slice(0, 600), editedAt: Date.now() } : x)),
    }));
    pushToast('ok', 'Message updated.');
  };

  /** Deletion is never instant — it files a request for the program admin to verify. */
  const requestDeleteMessage: StoreCtx['requestDeleteMessage'] = (msgId) => {
    if (!me) return;
    const m = (db.messages ?? []).find((x) => x.id === msgId);
    if (!m || m.system) return;
    const isAuthor = m.authorId === me.id;
    if (!isAuthor && !overseer(me.role)) {
      pushToast('warn', 'Only the author or an overseer can request a message deletion.');
      return;
    }
    if ((db.msgDeletes ?? []).some((r) => r.messageId === msgId)) {
      pushToast('warn', 'A deletion request for this message is already pending with the program admin.');
      return;
    }
    const req: MsgDeleteRequest = {
      id: uid(),
      messageId: m.id,
      channelId: m.channelId,
      byId: me.id,
      byName: me.name,
      text: m.text,
      at: Date.now(),
    };
    setDb((d) => {
      let next: DB = { ...d, msgDeletes: [...(d.msgDeletes ?? []), req] };
      // Notify every program admin so they can verify in the Messages tab.
      for (const admin of d.users.filter((u) => u.role === 'admin' && u.id !== me!.id)) {
        next = pushNotif(
          next,
          {
            text: `Deletion request — ${me!.name} asks to remove a message from ${
              (d.channels ?? []).find((c) => c.id === m.channelId)?.name ?? 'a channel'
            }`,
            kind: 'account',
            scope: { type: 'division', divisionId: '' },
            targetUserId: admin.id,
          },
          me!
        );
      }
      return next;
    });
    pushToast('ok', 'Deletion request sent — the program admin must verify before it is removed.');
  };

  const approveDeleteMessage: StoreCtx['approveDeleteMessage'] = (reqId) => {
    if (!me || me.role !== 'admin') return;
    const req = (db.msgDeletes ?? []).find((r) => r.id === reqId);
    if (!req) return;
    setDb((d) =>
      withLog(
        {
          ...d,
          messages: (d.messages ?? []).filter((x) => x.id !== req.messageId),
          msgDeletes: (d.msgDeletes ?? []).filter((r) => r.id !== reqId),
        },
        { userId: me.id, userName: me.name, type: 'delete', text: `Verified & removed a chat message requested by ${req.byName}` }
      )
    );
    pushToast('ok', 'Message deleted after verification.');
  };

  const denyDeleteMessage: StoreCtx['denyDeleteMessage'] = (reqId) => {
    if (!me || me.role !== 'admin') return;
    setDb((d) => ({ ...d, msgDeletes: (d.msgDeletes ?? []).filter((r) => r.id !== reqId) }));
    pushToast('warn', 'Deletion request denied — the message stays.');
  };

  const manageChannelMember: StoreCtx['manageChannelMember'] = (channelId, userId, add) => {
    if (!me || !overseer(me.role)) return;
    const ch = (db.channels ?? []).find((x) => x.id === channelId);
    const target = db.users.find((u) => u.id === userId);
    if (!ch || ch.kind !== 'executive' || !target) return;
    const protectedIds = ['u-admin', 'u-sup1', 'u-sup2', 'u-mod'];
    if (!add && protectedIds.includes(userId)) {
      pushToast('warn', `${target.name} holds a permanent council seat and cannot be removed.`);
      return;
    }
    const members = ch.memberIds ?? [];
    if (add === members.includes(userId)) return;
    const nextMembers = add ? [...members, userId] : members.filter((x) => x !== userId);
    const sys: Message = { id: uid(), channelId, authorId: me.id, authorName: 'OCE Flow', system: true, text: `${me.name} ${add ? 'added' : 'removed'} ${target.name} ${add ? 'to' : 'from'} the Executive Council.`, at: Date.now() };
    setDb((d) => ({ ...d, channels: (d.channels ?? []).map((x) => (x.id === channelId ? { ...x, memberIds: nextMembers } : x)), messages: [...(d.messages ?? []), sys] }));
    pushToast('ok', `${target.name} ${add ? 'added to' : 'removed from'} the Executive Council.`);
  };

  /* ---- notifications ---- */
  const markRead = (notifId: string) => {
    if (!me) return;
    setDb((d) => ({ ...d, notifs: d.notifs.map((n) => (n.id === notifId && !n.readBy.includes(me.id) ? { ...n, readBy: [...n.readBy, me.id] } : n)) }));
  };
  const markAllRead = () => {
    if (!me) return;
    setDb((d) => ({ ...d, notifs: d.notifs.map((n) => (n.readBy.includes(me.id) ? n : { ...n, readBy: [...n.readBy, me.id] })) }));
  };

  const value: StoreCtx = {
    db, user, me, myUnitId, oicUnitIds, scopePapers, toasts, ui, activities, visiblePapers, visibleNotifs, unread, custom, geotagBrgys,
    canEdit, canManageDivision, employeesOf, divOf,
    login, signup, approveUser, denyUser, updateUser, changePassword, requestPasswordReset, requestForgotPassword, approvePasswordReset, updateProfile, logout, resetDemo,
    go: (page) => setUi((u) => ({ ...u, page })),
    openDrawer: (id) => setUi((u) => ({ ...u, drawerId: id })),
    closeDrawer: () => setUi((u) => ({ ...u, drawerId: null })),
    setNewOpen: (open) => setUi((u) => ({ ...u, newOpen: open })),
    setReportOpen: (open, preset) => setUi((u) => ({ ...u, reportOpen: open, reportPreset: preset ?? null })),
    // closing the profile panel (any path, incl. Esc) discards unsaved theme edits
    setProfileOpen: (open) => {
      setUi((u) => ({ ...u, profileOpen: open }));
      if (!open) setThemePreview(null);
    },
    setSearch: (s) => setUi((u) => ({ ...u, search: s })),
    setDivFilter: (s) => setUi((u) => ({ ...u, divFilter: s })),
    setViewer: (v) => setUi((u) => ({ ...u, viewer: v })),
    createPaper, moveStage, routePaperMulti, addNote, addAttachments, removeAttachment, setProgress, assignPaper, submitToHead, returnToEmployee,
    deletePaper, updatePaper, ackPaper,
    updateDivision, setDivisionHead, removeDivisionOIC, updateCustom, theme, updateMyTheme,
    themeDraft, themeDirty: themePreview != null, previewTheme, clearThemePreview, saveTheme,
    visibleChannels, messagesOf, unreadFor, msgUnreadTotal, canPostChannel, sendMsg, markChannelRead, manageChannelMember,
    updateMessage, requestDeleteMessage, approveDeleteMessage, denyDeleteMessage, msgDeletes: db.msgDeletes ?? [], stampGeoAttachments,
    markAllRead, markRead, pushToast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

type CustodyEntryLocal = {
  id: string; at: number; byName: string;
  action: 'created' | 'received' | 'stage' | 'routed' | 'note' | 'attachment' | 'completed';
  stage?: Stage; fromDivisionId?: string; toDivisionId?: string; text: string;
};
