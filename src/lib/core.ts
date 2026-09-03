/* ============ OCE Flow — core types, organization, utilities, seed ============ */

export type Role = 'admin' | 'supervisor' | 'moderator' | 'operator' | 'division' | 'employee' | 'joborder';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  title: string;
  shortTitle?: string;
  divisionId?: string;
  /**
   * Additional sub-units / teams the officer serves on top of their home
   * division (semi-permanent). Teams are extra task assignments.
   */
  teamIds?: string[];
  status: UserStatus;
  phone?: string;
  address?: string;
  email?: string;
  requestedDivisionId?: string;
  requestedTitle?: string;
  requestedAt?: number;
  passwordResetAt?: number;
  /** Personal theme (set from the profile panel). Unset = follow the office default. */
  themeAccent?: string;
  themeAccent2?: string;
  themeTone?: string;
  autoSeason?: boolean;
}

export type Stage = 'received' | 'review' | 'progress' | 'verification' | 'completed';
export type Priority = 'urgent' | 'priority' | 'routine';
export type Kind = 'work-order' | 'permit' | 'memo' | 'complaint' | 'inspection';

export const STAGES: { id: Stage; label: string; hint: string; color: string }[] = [
  { id: 'received', label: 'Received', hint: 'Logged & transmitted', color: '#56c8f0' },
  { id: 'review', label: 'Under review', hint: 'Assessment & validation', color: '#f5b924' },
  { id: 'progress', label: 'In progress', hint: 'Field or desk work', color: '#ff8a4c' },
  { id: 'verification', label: 'Verification', hint: 'Inspection & checking', color: '#2dd4bf' },
  { id: 'completed', label: 'Completed', hint: 'Closed & filed', color: '#45d483' },
];
export const stageMeta = (s: Stage) => STAGES.find((x) => x.id === s) ?? STAGES[0];

/** Completion rates move in half-percent steps — format without noise (52 vs 52.5). */
export const fmtPct = (v: number): string => {
  const r = Math.round(v * 2) / 2;
  return r % 1 === 0 ? String(r) : r.toFixed(1);
};

export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#f4645c' },
  priority: { label: 'Priority', color: '#f5b924' },
  routine: { label: 'Routine', color: '#6684a3' },
};

export const KINDS: Record<Kind, { label: string; short: string }> = {
  'work-order': { label: 'Work Order', short: 'WO' },
  permit: { label: 'Permit', short: 'PRM' },
  memo: { label: 'Memorandum', short: 'MEM' },
  complaint: { label: 'Complaint', short: 'CMP' },
  inspection: { label: 'Inspection', short: 'INS' },
};

export interface Attachment {
  id: string;
  name: string;
  kind: 'image' | 'pdf';
  url: string;
  geotagged: boolean;
  lat?: number;
  lng?: number;
  /** Where the coordinates came from: EXIF metadata or the live device location. */
  geoSource?: 'exif' | 'device';
  by: string;
  at: number;
  size?: string;
}

export type CustodyAction = 'created' | 'received' | 'stage' | 'routed' | 'note' | 'attachment' | 'completed';

export interface Custody {
  id: string;
  at: number;
  byName: string;
  action: CustodyAction;
  stage?: Stage;
  fromDivisionId?: string;
  toDivisionId?: string;
  text: string;
}

export interface Paper {
  id: string;
  ref: string;
  title: string;
  kind: Kind;
  priority: Priority;
  origin: string;
  divisionId: string;
  intendedId: string;
  stage: Stage;
  attachments: Attachment[];
  custody: Custody[];
  createdAt: number;
  updatedAt: number;
  byId: string;
  byName: string;
  dueAt?: number;
  remarks?: string;
  diverted: boolean;
  recipientIds?: string[];
  receivedBy?: string[];
  assignees?: string[];
  pendingHeadReview?: boolean;
  progress?: number;
}

export interface Notif {
  id: string;
  at: number;
  text: string;
  kind: 'new' | 'move' | 'route' | 'complete' | 'account';
  docId?: string;
  ref?: string;
  scope: { type: 'division'; divisionId: string } | { type: 'supervisors' };
  targetUserId?: string;
  readBy: string[];
}

export interface Activity {
  id: string;
  at: number;
  byName: string;
  type: 'create' | 'move' | 'route' | 'note' | 'attach' | 'complete';
  text: string;
  ref: string;
  docId: string;
  stage?: Stage;
}

export type LogType =
  | 'login' | 'logout' | 'create' | 'stage' | 'route' | 'note' | 'attachment'
  | 'signup' | 'approve' | 'deny' | 'edit' | 'profile' | 'resetreq' | 'reset' | 'delete';

export interface SysLog {
  id: string;
  at: number;
  userId: string;
  userName: string;
  type: LogType;
  text: string;
  ref?: string;
  docId?: string;
}

export interface Channel {
  id: string;
  name: string;
  kind: 'floor' | 'unit' | 'executive';
  unitId?: string;
  memberIds?: string[];
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  text: string;
  at: number;
  docId?: string;
  docRef?: string;
  docs?: { id: string; ref: string }[];
  /** Set when the author edited the message (within the 10-minute window). */
  editedAt?: number;
  system?: boolean;
}

/** A chat-message deletion awaiting program-admin verification. */
export interface MsgDeleteRequest {
  id: string;
  messageId: string;
  channelId: string;
  byId: string;
  byName: string;
  text: string;
  at: number;
}

export interface Customization {
  orgName?: string;
  tagline?: string;
  description?: string;
  accent?: string;
  accent2?: string;
  bgTone?: string;
  logoKind?: 'seal' | 'gear' | 'bridge' | 'custom';
  logoUrl?: string;
  loginImage?: string;
  barangays?: string[];
}

export const DEFAULT_CUSTOM: Customization = {};

/** Default light-text ramp, restored when a dark mood is active. */
export const DEFAULT_MIST = ['#f2f7fc', '#e4edf6', '#c7d8e8', '#a9c0d6', '#86a2be', '#6684a3', '#4c6785'];

export interface MoodDef {
  label: string;
  tones: string[];
  /** When present, the text ramp is inverted (light mood). */
  mist?: string[];
  accent?: string;
  accent2?: string;
  /** Grid-line / ambient tint for the backdrop. */
  line?: string;
  /** Secondary (warm) ambient glow color. */
  warm?: string;
  seasonal?: boolean;
  note?: string;
}

/** All background moods — classic, light/soft, and seasonal. */
export const MOODS: Record<string, MoodDef> = {
  blueprint: { label: 'Blueprint', tones: ['#071120', '#0a1728', '#0d1d31', '#122540', '#1b3354', '#274468', '#35557e'], line: '#56c8f0', warm: '#ff6b1c' },
  midnight: { label: 'Midnight', tones: ['#08060f', '#0d0a19', '#120e23', '#191331', '#241c45', '#32275e', '#45367e'], line: '#9d8cff', warm: '#ff6ec7' },
  slate: { label: 'Slate', tones: ['#101317', '#161a20', '#1c2128', '#242b34', '#303945', '#3f4b59', '#52606f'], line: '#8ba3ba', warm: '#e0b06a' },
  paper: {
    label: 'Paper (light grey)',
    tones: ['#e9ecef', '#f6f7f8', '#e1e4e8', '#d6dae0', '#c0c6cf', '#a3abb7', '#828c9a'],
    mist: ['#141c26', '#1a2531', '#28364a', '#3c4e66', '#54687f', '#6e8098', '#8b9aae'],
    line: '#9aa4b2', warm: '#c98d5a',
    note: 'Light reading mode',
  },
  blossom: {
    label: 'Blossom',
    tones: ['#170b14', '#1f101b', '#271422', '#311a2b', '#43243c', '#5a3050', '#74406a'],
    accent: '#ff7ab0', accent2: '#c9a7f5',
    line: '#f792c9', warm: '#ffc2d9',
    note: 'Soft rose',
  },
  christmas: {
    label: 'Christmas',
    tones: ['#07120c', '#0b1a10', '#102316', '#16301e', '#1f4429', '#2c5c38', '#3d7a4c'],
    accent: '#e0453a', accent2: '#fbc94a',
    line: '#4dbd74', warm: '#e0453a',
    seasonal: true, note: 'Dec 15 – Jan 6',
  },
  valentine: {
    label: "Valentine's",
    tones: ['#160a10', '#1f0f17', '#28131e', '#331a27', '#462437', '#5c2f47', '#78405e'],
    accent: '#ff5c8a', accent2: '#fbc94a',
    line: '#f27fa5', warm: '#fbc94a',
    seasonal: true, note: 'Feb 1 – 14',
  },
  summer: {
    label: 'Dry season',
    tones: ['#141007', '#1c160a', '#241d0e', '#2f2613', '#41341b', '#574626', '#74603a'],
    accent: '#f5b924', accent2: '#56c8f0',
    line: '#e8c25a', warm: '#56c8f0',
    seasonal: true, note: 'Mar – May',
  },
  rainy: {
    label: 'Rainy season',
    tones: ['#071214', '#0b1a1d', '#102326', '#163034', '#1f4449', '#2c5c62', '#3d7a81'],
    accent: '#56c8f0', accent2: '#2dd4bf',
    line: '#5fc4d4', warm: '#6cd1f4',
    seasonal: true, note: 'Jun – Oct',
  },
};

/** The mood the calendar would pick right now, or null outside any season. */
export function seasonalMood(date: Date = new Date()): string | null {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 12 && d >= 15) || (m === 1 && d <= 6)) return 'christmas';
  if (m === 2 && d <= 14) return 'valentine';
  if (m >= 3 && m <= 5) return 'summer';
  if (m >= 6 && m <= 10) return 'rainy';
  return null;
}

export interface DivisionMeta {
  name?: string;
  desc?: string;
  headName?: string;
  headUserId?: string;
  oicId?: string;
  oicName?: string;
  oicSince?: number;
  oicNote?: string;
}

export interface DB {
  v: number;
  session: string | null;
  papers: Paper[];
  notifs: Notif[];
  logs: SysLog[];
  users: User[];
  divisions?: Record<string, DivisionMeta>;
  channels: Channel[];
  messages: Message[];
  reads: Record<string, number>;
  custom?: Customization;
  geobrgy?: Record<string, string>;
  /** Chat-message deletions awaiting program-admin verification. */
  msgDeletes?: MsgDeleteRequest[];
  seq: number;
}

/* ---------------- organization ---------------- */

export interface Division {
  id: string;
  code: string;
  name: string;
  cluster: 'ops' | 'tech';
  head: string;
  headUser: string;
  desc: string;
}

export const DIVISIONS: Division[] = [
  { id: 'const', code: 'CONSTR', name: 'Construction Division', cluster: 'ops', head: 'Engr. Ramil Domingo', headUser: 'u-const', desc: 'Vertical and horizontal infrastructure projects — buildings, roads, bridges and concretation works from planning to turnover.' },
  { id: 'maint', code: 'MAINT', name: 'Maintenance Division', cluster: 'ops', head: 'Engr. Nardo Salvador', headUser: 'u-maint', desc: 'Upkeep and repair of city facilities, drainage lines, roads and public structures; preventive and corrective maintenance.' },
  { id: 'psd', code: 'PSD', name: 'Public Services Division', cluster: 'ops', head: 'Engr. Liza Bartolome', headUser: 'u-psd', desc: 'Public markets, parks, sidewalks, cemeteries and other services infrastructure operated for the citizens.' },
  { id: 'survey', code: 'SURVEY', name: 'Survey and Mapping Division', cluster: 'tech', head: 'Engr. Dante Villamor', headUser: 'u-survey', desc: 'Topographic and cadastral surveys, lot verification, mapping and geodetic control for all engineering projects.' },
  { id: 'elec', code: 'ELEC', name: 'Electrical Division', cluster: 'ops', head: 'Engr. Petra Yumul', headUser: 'u-elec', desc: 'Street lighting, electrical works and power-related infrastructure of the city; maintenance of lighting networks.' },
  { id: 'mtqc', code: 'MTQC', name: 'Materials Testing and Quality Control Division', cluster: 'tech', head: 'Engr. Sonny Cabral', headUser: 'u-mtqc', desc: 'Testing of construction materials — concrete cores, asphalt, aggregates — and quality assurance on all projects.' },
  { id: 'motorpool', code: 'MOTOR', name: 'Motorpool Division', cluster: 'ops', head: 'Mr. Eddie Gatchalian', headUser: 'u-motor', desc: 'Fleet management, dispatch, repair and preventive maintenance of all office vehicles and heavy equipment.' },
  { id: 'plan', code: 'PDPD', name: 'Planning Design and Programming Division', cluster: 'tech', head: 'Engr. Grace Panganiban', headUser: 'u-plan', desc: 'Project planning, engineering designs, cost estimates and annual infrastructure programming of the office.' },
  { id: 'admin', code: 'ADMIN', name: 'Administrative Division', cluster: 'tech', head: 'Ms. Carol Estrella', headUser: 'u-admindiv', desc: 'Records, document intake and routing, HR support, supplies and general administration — the front desk of all paperwork.' },
];

export const INSPECTORATE: Division = {
  id: 'insp-team', code: 'INSP-TEAM', name: 'Inspectorate Team', cluster: 'tech',
  head: 'Engr. Julio B. Sergio', headUser: 'u-sup2',
  desc: 'Cross-division team headed by Engr. Julio B. Sergio, the Assistant City Engineer — conducts structural, safety and occupancy inspections on behalf of the City Engineer. Inspection (INS) paperwork routes here.',
};

export const IT_DIVISION: Division = {
  id: 'it', code: 'IT', name: 'I.T. Section', cluster: 'tech',
  head: 'Alphard S. Grande', headUser: 'u-admin',
  desc: 'Information technology services — maintains OCE Flow, user accounts, office network and connectivity, digital records and data backups for the whole office.',
};

export const DOCMON_TEAM: Division = {
  id: 'docmon', code: 'DOC-MON', name: 'Documentation and Monitoring Team', cluster: 'tech',
  head: 'Ms. Rica Domingo', headUser: 'u-ricadomingo',
  desc: 'Documents and monitors ongoing works — progress photography, drone coverage, accomplishment reports and as-built records for every project of the office.',
};

export const SUBAYBAYAN_TEAM: Division = {
  id: 'subay', code: 'SUBAY', name: 'Subaybayan Team', cluster: 'ops',
  head: 'Mr. Aldrin Fajardo', headUser: 'u-afajardo',
  desc: 'Runs the Subaybayan citizen-feedback channel — logs public reports and complaints, validates them on site and tracks the engineering response until closed.',
};

export const CROSS_UNITS: Division[] = [INSPECTORATE, IT_DIVISION, DOCMON_TEAM, SUBAYBAYAN_TEAM];

export const DESKS: Division[] = [
  { id: 'desk-ce', code: 'CE-DESK', name: 'Office of the City Engineer', cluster: 'ops', head: 'Engr. Aries S. Grande', headUser: 'u-sup1', desc: 'Final approval, signing and executive routing — Engr. Aries S. Grande, CGPP Department Head II (City Engineer).' },
  { id: 'desk-ace', code: 'ACE-DESK', name: 'Office of the Assistant City Engineer', cluster: 'tech', head: 'Engr. Julio B. Sergio', headUser: 'u-sup2', desc: 'Review, endorsement and concurrent supervision — Engr. Julio B. Sergio, CGPP Assistant Department Head II (Assistant City Engineer).' },
];

export const ALL_UNITS: Division[] = [...DIVISIONS, ...CROSS_UNITS, ...DESKS];
export const divById = (id: string): Division | undefined => ALL_UNITS.find((d) => d.id === id);
export const cityEngineerName = (users: User[]): string => users.find((u) => u.id === 'u-sup1')?.name ?? 'Engr. Aries S. Grande';

export type DivInfo = Division & { oicId?: string; oicName?: string; oicSince?: number; oicNote?: string };

/* ---------------- utilities ---------------- */

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const timeAgo = (ts: number): string => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)}d ago`;
  return new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtDT = (ts: number): string =>
  new Date(ts).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export const fmtCoord = (lat: number, lng: number): string =>
  `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;

export const mapsLink = (lat: number, lng: number): string =>
  `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

export const osmEmbed = (lat: number, lng: number): string => {
  const d = 0.0038;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d * 0.72}%2C${lng + d}%2C${lat + d * 0.72}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
};

export const initials = (name: string): string =>
  name.replace(/^(Engr|Mr|Ms|Mrs|Dr)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export const dayLabel = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const sod = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((sod(now) - sod(d)) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
};

/* ---------------- geotags & barangays ---------------- */

/**
 * Reads GPS coordinates from a JPEG's EXIF block.
 *
 * Reads the ENTIRE file — Android gallery/camera photos are commonly 3–12 MB
 * and their GPS rational values frequently sit beyond the first megabyte,
 * which previously made them read as 0,0. Every offset is bounds-checked so a
 * truncated or malformed block yields "no GPS" instead of garbage, and the
 * impossible Null-Island coordinate (0,0) is rejected.
 */
export async function readGpsFromJpeg(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    if (!/jpe?g$/i.test(file.name) && !/jpeg/i.test(file.type)) return null;
    if (file.size > 60 * 1024 * 1024) return null; // too large to be worth parsing
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.byteLength < 12 || dv.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    let guard = 0;
    while (off + 4 <= dv.byteLength && guard++ < 256) {
      const marker = dv.getUint16(off);
      if ((marker & 0xff00) !== 0xff00) break;
      if (marker === 0xffd8 || (marker >= 0xffd0 && marker <= 0xffd9) || marker === 0xff01) { off += 2; continue; }
      if (off + 4 > dv.byteLength) break;
      const segLen = dv.getUint16(off + 2);
      if (segLen < 2) break;
      if (marker === 0xffe1 && off + 12 <= dv.byteLength && dv.getUint32(off + 4) === 0x45786966 && dv.getUint16(off + 8) === 0) {
        const gps = parseTiff(dv, off + 10);
        if (gps) return gps;
        // some files carry more than one APP1 (e.g. XMP after EXIF) — keep scanning
      }
      off += 2 + segLen;
    }
  } catch { /* unreadable */ }
  return null;
}

function parseTiff(dv: DataView, base: number): { lat: number; lng: number } | null {
  try {
    const len = dv.byteLength;
    const inR = (o: number, n: number) => base + o + n <= len && base + o >= 0;
    const le = dv.getUint16(base) === 0x4949;
    const u16 = (o: number): number | null => (inR(o, 2) ? dv.getUint16(base + o, le) : null);
    const u32 = (o: number): number | null => (inR(o, 4) ? dv.getUint32(base + o, le) : null);
    const u8 = (o: number): number | null => (inR(o, 1) ? dv.getUint8(base + o) : null);
    if (u16(2) !== 0x002a) return null;
    const ifd0 = u32(4);
    if (ifd0 == null) return null;
    const gps = findLongTag(dv, base, ifd0, 0x8825, le, inR, u16, u32);
    if (gps == null) return null;
    const count = u16(gps);
    if (count == null || count === 0 || count > 64) return null;
    let latRef = 'N', lngRef = 'E';
    let lat: number | null = null, lng: number | null = null;
    /** one RATIONAL (num/den) with sanity checks */
    const rat = (o: number): number | null => {
      const n = u32(o), d = u32(o + 4);
      if (n == null || d == null || d === 0) return null;
      const v = n / d;
      return Number.isFinite(v) ? v : null;
    };
    /** GPS coordinate = 3 rationals (deg, min, sec) — every part must be readable */
    const coord = (o: number): number | null => {
      const deg = rat(o), min = rat(o + 8), sec = rat(o + 16);
      if (deg == null || min == null || sec == null) return null;
      const v = deg + min / 60 + sec / 3600;
      return Number.isFinite(v) ? v : null;
    };
    for (let i = 0; i < count; i++) {
      const e = gps + 2 + i * 12;
      if (!inR(e, 12)) break;
      const tag = u16(e);
      if (tag === 0x0001) { const c = u8(e + 8); if (c != null) latRef = String.fromCharCode(c); }
      else if (tag === 0x0003) { const c = u8(e + 8); if (c != null) lngRef = String.fromCharCode(c); }
      else if (tag === 0x0002) { const o = u32(e + 8); if (o != null) lat = coord(o); }
      else if (tag === 0x0004) { const o = u32(e + 8); if (o != null) lng = coord(o); }
    }
    if (lat == null || lng == null) return null;
    if (latRef === 'S') lat = -lat;
    if (lngRef === 'W') lng = -lng;
    // sanity: within the globe, and never exactly 0,0 ("Null Island" = stripped GPS)
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    if (lat === 0 && lng === 0) return null;
    return { lat, lng };
  } catch { return null; }
}

function findLongTag(
  dv: DataView, base: number, ifd: number, target: number, le: boolean,
  inR: (o: number, n: number) => boolean,
  u16: (o: number) => number | null,
  u32: (o: number) => number | null
): number | null {
  const n = u16(ifd);
  if (n == null || n === 0 || n > 512) return null;
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (!inR(e, 12)) return null;
    if (u16(e) === target) return u32(e + 8);
  }
  return null;
}

export const geobrgyKey = (lat: number, lng: number): string => `${lat.toFixed(3)},${lng.toFixed(3)}`;

export const nominatimReverseUrl = (lat: number, lng: number): string =>
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&zoom=16&addressdetails=1`;

const BRL_CLEAN = /\s+(Phase|Ext|cor|near|along|frontage|shoreline|road|street|city|access)\b.*$/i;

/** Barangays for one paper: keyword mentions per field + resolved geotag sites. */
export function paperBarangays(p: Paper, geobrgy: Record<string, string>): string[] {
  const out = new Set<string>();
  const scan = (s?: string) => {
    if (!s) return;
    for (const m of s.matchAll(/(?:Brgy\.?|Barangay)\s+([A-Z][A-Za-z.'\-]+(?:\s+[A-Z][A-Za-z.'\-]+)?)/g)) {
      const name = m[1].replace(BRL_CLEAN, '').trim();
      if (name.length > 2) out.add(name);
    }
  };
  scan(p.title); scan(p.origin); scan(p.remarks);
  for (const a of p.attachments) {
    if (a.geotagged && a.lat != null && a.lng != null) {
      const site = geobrgy[geobrgyKey(a.lat, a.lng)];
      if (site) out.add(site);
    }
  }
  return [...out];
}

/** Distinct barangays across papers: keyword mentions, geotag lookups, plus custom names. */
export function extractBarangays(papers: Paper[], customs: string[] = [], geobrgy: Record<string, string> = {}): string[] {
  const set = new Set<string>();
  for (const p of papers) for (const b of paperBarangays(p, geobrgy)) set.add(b);
  for (const b of customs) set.add(b.replace(/^Brgy\.?\s+/i, '').trim());
  return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/* ---------------- attachments helper ---------------- */

/**
 * Decodes + re-encodes an image to a compact, always-displayable JPEG.
 * Fixes the common mobile problems: HEIC/HEIF files that `<img>` can't draw,
 * EXIF-rotated photos, and 12MP frames whose base64 would blow the storage
 * quota. Returns null when the browser cannot decode the file at all.
 */
async function normalizeImage(url: string): Promise<{ url: string; bytes: number } | null> {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error('decode'));
      el.src = url;
    });
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return null;
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // flatten transparency for JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL('image/jpeg', 0.82);
    const bytes = Math.round((out.length - out.indexOf(',') - 1) * 0.75);
    return { url: out, bytes };
  } catch {
    return null;
  }
}

const fmtBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export async function buildAttachments(files: FileList | File[], by: string): Promise<{ atts: Attachment[]; skipped: string[] }> {
  const atts: Attachment[] = [];
  const skipped: string[] = [];
  for (const f of Array.from(files)) {
    const isImg = /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(f.name);
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    if (!isImg && !isPdf) { skipped.push(`${f.name} (unsupported type)`); continue; }
    if (!isImg && f.size > 8 * 1024 * 1024) { skipped.push(`${f.name} (over 8 MB)`); continue; }
    try {
      let url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error('read'));
        r.readAsDataURL(f);
      });
      // GPS must be read from the original file — re-encoding strips EXIF.
      const gps = isImg ? await readGpsFromJpeg(f) : null;
      const geoSource: Attachment['geoSource'] = gps ? 'exif' : undefined;
      let bytes = f.size;
      if (isImg) {
        const norm = await normalizeImage(url);
        if (norm) {
          url = norm.url;
          bytes = norm.bytes;
        } else {
          skipped.push(`${f.name} (could not process — try re-taking as JPEG)`);
          continue;
        }
      }
      atts.push({
        id: uid(), name: f.name, kind: isImg ? 'image' : 'pdf', url,
        geotagged: !!gps, lat: gps?.lat, lng: gps?.lng, geoSource, by, at: Date.now(),
        size: fmtBytes(bytes),
      });
    } catch { skipped.push(`${f.name} (unreadable)`); }
  }
  return { atts, skipped };
}

/* ---------------- seeded PDF generator ---------------- */

export function makeStubPdf(title: string, lines: string[]): string {
  const lat1 = (s: string) =>
    s.replace(/[\u2013\u2014]/g, '-').replace(/\u2192/g, '->').replace(/\u00b0/g, ' deg ')
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2026/g, '...')
      .replace(/[^\x00-\xff]/g, '');
  const esc = (s: string) => lat1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let stream = `BT /F1 15 Tf 56 758 Td (${esc(title)}) Tj ET\n`;
  stream += `BT /F2 9 Tf 56 742 Td (Republic of the Philippines - City of Puerto Princesa - Office of the City Engineer) Tj ET\n`;
  lines.forEach((l, i) => { stream += `BT /F2 10 Tf 56 ${712 - i * 16} Td (${esc(l)}) Tj ET\n`; });
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { pdf += o.toString().padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  try {
    return 'application/pdf;base64,' + btoa(pdf);
  } catch {
    return 'text/plain;charset=utf-8,' + encodeURIComponent('[Attachment data unavailable]');
  }
}

/* ---------------- seed ---------------- */

const D = 864e5;
const now = Date.now();

const c = (at: number, byName: string, action: CustodyAction, text: string, extra: Partial<Custody> = {}): Custody =>
  ({ id: uid(), at, byName, action, text, ...extra });

const att = (name: string, kind: 'image' | 'pdf', url: string, at: number, by: string, geo?: { lat: number; lng: number }, size?: string): Attachment =>
  ({ id: uid(), name, kind, url, geotagged: !!geo, lat: geo?.lat, lng: geo?.lng, by, at, size });

export const INITIAL_USERS: User[] = [
  { id: 'u-admin', name: 'Alphard S. Grande', username: 'admin', password: 'cityeng2026', role: 'admin', title: 'System Administrator — I.T. Section', shortTitle: 'Administrator', divisionId: 'it', status: 'active' },
  { id: 'u-sup1', name: 'Engr. Aries S. Grande', username: 'agrande', password: 'cityeng2026', role: 'supervisor', title: 'CGPP Department Head II (City Engineer)', shortTitle: 'City Engineer', status: 'active' },
  { id: 'u-sup2', name: 'Engr. Julio B. Sergio', username: 'jsergio', password: 'cityeng2026', role: 'supervisor', title: 'CGPP Assistant Department Head II (Assistant City Engineer)', shortTitle: 'Asst. City Engineer', status: 'active' },
  { id: 'u-mod', name: 'Ms. Bianca Salonga', username: 'bsalonga', password: 'cityeng2026', role: 'moderator', title: 'Board Moderator — Office of the City Engineer', shortTitle: 'Moderator', status: 'active' },
  { id: 'u-operator', name: 'Mr. Vince Ortega', username: 'vortega', password: 'cityeng2026', role: 'operator', title: 'Operator — Office of the City Engineer', shortTitle: 'Operator', status: 'active' },
  { id: 'u-const', name: 'Engr. Ramil Domingo', username: 'rdomingo', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'const', status: 'active' },
  { id: 'u-maint', name: 'Engr. Nardo Salvador', username: 'nsalvador', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'maint', status: 'active' },
  { id: 'u-psd', name: 'Engr. Liza Bartolome', username: 'lbartolome', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'psd', status: 'active' },
  { id: 'u-survey', name: 'Engr. Dante Villamor', username: 'dvillamor', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'survey', status: 'active' },
  { id: 'u-elec', name: 'Engr. Petra Yumul', username: 'pyumul', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'elec', status: 'active' },
  { id: 'u-mtqc', name: 'Engr. Sonny Cabral', username: 'scabral', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'mtqc', status: 'active' },
  { id: 'u-motor', name: 'Mr. Eddie Gatchalian', username: 'egatchalian', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'motorpool', status: 'active' },
  { id: 'u-plan', name: 'Engr. Grace Panganiban', username: 'gpanganiban', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'plan', status: 'active' },
  { id: 'u-admindiv', name: 'Ms. Carol Estrella', username: 'cestrella', password: 'cityeng2026', role: 'division', title: 'Records & Admin Officer', divisionId: 'admin', status: 'active' },
  { id: 'u-ricadomingo', name: 'Ms. Rica Domingo', username: 'ricadomingo', password: 'cityeng2026', role: 'division', title: 'Team Head — Documentation & Monitoring', divisionId: 'docmon', status: 'active' },
  { id: 'u-afajardo', name: 'Mr. Aldrin Fajardo', username: 'afajardo', password: 'cityeng2026', role: 'division', title: 'Team Head — Subaybayan', divisionId: 'subay', status: 'active' },
  { id: 'u-pmanalo', name: 'Engr. Paolo Manalo', username: 'pmanalo', password: 'cityeng2026', role: 'employee', title: 'Project Engineer I', divisionId: 'const', teamIds: ['docmon'], status: 'active' },
  { id: 'u-daquino', name: 'Mr. Dennis Aquino', username: 'daquino', password: 'cityeng2026', role: 'employee', title: 'Maintenance Foreman', divisionId: 'maint', status: 'active' },
  { id: 'u-jreyes', name: 'Mr. Joem Reyes', username: 'jreyes', password: 'cityeng2026', role: 'employee', title: 'Lineman II', divisionId: 'elec', status: 'active' },
  { id: 'u-kvillanueva', name: 'Engr. Kara Villanueva', username: 'kvillanueva', password: 'cityeng2026', role: 'employee', title: 'Survey Technician III', divisionId: 'survey', teamIds: ['insp-team'], status: 'active' },
  { id: 'u-rito', name: 'Mr. Ramon Ito', username: 'rito', password: 'cityeng2026', role: 'employee', title: 'Sanitation Inspector', divisionId: 'psd', status: 'active' },
  { id: 'u-kduque', name: 'Mr. Kevin Duque', username: 'kduque', password: 'cityeng2026', role: 'joborder', title: 'Skilled Worker II (Job Order)', divisionId: 'maint', status: 'active' },
  { id: 'u-lmarquez', name: 'Ms. Lani Marquez', username: 'lmarquez', password: 'cityeng2026', role: 'joborder', title: 'Records Clerk (Job Order)', divisionId: 'admin', status: 'active' },
  { id: 'u-rbautista', name: 'Ms. Rhea Bautista', username: 'rbautista', password: 'cityeng2026', role: 'employee', title: 'Documentation Technician', divisionId: 'docmon', status: 'active' },
  { id: 'u-jacosta', name: 'Mr. Joseph Acosta', username: 'jacosta', password: 'cityeng2026', role: 'joborder', title: 'Feedback Officer (Job Order)', divisionId: 'subay', status: 'active' },
  { id: 'u-milagan', name: 'Mr. Marcus Ilagan', username: 'milagan', password: 'cityeng2026', role: 'employee', title: 'Materials Technician', divisionId: 'mtqc', status: 'pending', requestedDivisionId: 'mtqc', requestedTitle: 'Materials Technician', requestedAt: now - 0.4 * D, phone: '0917 555 2210', email: 'm.ilagan@mail.com', address: 'Purok 3, San Pedro, Puerto Princesa City' },
];

export function freshSeed(): DB {
  const CAROL = 'Ms. Carol Estrella';
  const CE = 'Engr. Aries S. Grande';
  const ACE = 'Engr. Julio B. Sergio';
  const IMG = {
    road: 'https://image.qwenlm.ai/generated-images/1770e5be-42c1-4185-ad24-492be4412c96/_result.png',
    flood: 'https://image.qwenlm.ai/generated-images/6f241a44-0a13-477b-b108-f74421995e75/_result.png',
    bldg: 'https://image.qwenlm.ai/generated-images/cd6c5509-4db7-44b6-8107-937dc582cfc4/_result.png',
    wall: 'https://image.qwenlm.ai/generated-images/bba0a52c-43c5-48b3-8596-5154a95fb448/_result.png',
  };
  const pdfBudget = makeStubPdf('Supplemental Budget Request — H2 2026', [
    'Document ref: OCE-2026-0142', 'Origin: Office of the City Administrator',
    'Requested by: City Budget Office', 'Amount: PHP 4,850,000.00 for priority infrastructure repairs',
    'Line items: seawall repair, road patching, drainage declogging, street lights',
    'Status: Under final review at the City Engineer desk', '', 'Prepared by: Administrative Division, Records Section',
  ]);

  const papers: Paper[] = [
    {
      id: uid(), ref: 'OCE-2026-0141', title: 'Road widening — Brgy. San Manuel Phase 2', kind: 'work-order',
      priority: 'priority', origin: "City Administrator's Office", divisionId: 'const', intendedId: 'const', stage: 'progress',
      attachments: [
        att('road-crew-site.jpg', 'image', IMG.road, now - 2.1 * D, 'Engr. Paolo Manalo', { lat: 9.7389, lng: 118.7371 }, '412 KB'),
        att('work-order-0141.pdf', 'pdf', pdfBudget, now - 2.2 * D, CAROL, undefined, '96 KB'),
      ],
      custody: [
        c(now - 3 * D, CAROL, 'created', 'Logged into the system and transmitted to Construction Division', { fromDivisionId: 'admin', toDivisionId: 'const' }),
        c(now - 2.4 * D, 'Engr. Ramil Domingo', 'stage', 'Plans validated; moved to Under review', { stage: 'review' }),
        c(now - 2.1 * D, 'Engr. Ramil Domingo', 'stage', 'Site team mobilized; moved to In progress', { stage: 'progress' }),
        c(now - 2.0 * D, 'Engr. Ramil Domingo', 'note', 'Persons-in-charge designated — Engr. Paolo Manalo'),
      ],
      createdAt: now - 3 * D, updatedAt: now - 2 * D, byId: 'u-admindiv', byName: CAROL,
      dueAt: now + 5 * D, diverted: false, assignees: ['u-pmanalo'], progress: 45,
    },
    {
      id: uid(), ref: 'OCE-2026-0139', title: 'Declogging of main drainage — Rizal Ave. cor. Malvar St.', kind: 'work-order',
      priority: 'urgent', origin: 'CDRRMO flood complaint #C-2214', divisionId: 'maint', intendedId: 'maint', stage: 'progress',
      attachments: [att('flooded-intersection.jpg', 'image', IMG.flood, now - 1 * D, 'Mr. Dennis Aquino', { lat: 9.7412, lng: 118.7358 }, '388 KB')],
      custody: [
        c(now - 1.1 * D, CAROL, 'created', 'Logged into the system and transmitted to Maintenance Division', { fromDivisionId: 'admin', toDivisionId: 'maint' }),
        c(now - 0.6 * D, 'Engr. Nardo Salvador', 'stage', 'Vactor truck dispatched; declogging underway', { stage: 'progress' }),
        c(now - 0.5 * D, 'Engr. Nardo Salvador', 'note', 'Persons-in-charge designated — Mr. Dennis Aquino (Maintenance Foreman), Mr. Kevin Duque (Skilled Worker II, Job Order)'),
      ],
      createdAt: now - 1.1 * D, updatedAt: now - 0.5 * D, byId: 'u-admindiv', byName: CAROL,
      dueAt: now + 0.5 * D, diverted: false, assignees: ['u-daquino', 'u-kduque'],
      remarks: 'Resident reports knee-deep water at the intersection after 30-min rain.', progress: 60,
    },
    {
      id: uid(), ref: 'OCE-2026-0136', title: 'Lot verification survey — Brgy. San Pedro (drainage easement)', kind: 'inspection',
      priority: 'routine', origin: 'City Planning & Development Office', divisionId: 'survey', intendedId: 'survey', stage: 'verification',
      attachments: [
        att('site-marker-photo.jpg', 'image', IMG.bldg, now - 1 * D, 'Engr. Kara Villanueva', { lat: 9.7521, lng: 118.7264 }, '350 KB'),
      ],
      custody: [
        c(now - 2.6 * D, CAROL, 'created', 'Logged into the system and transmitted to Survey and Mapping Division', { fromDivisionId: 'admin', toDivisionId: 'survey' }),
        c(now - 1.4 * D, 'Engr. Dante Villamor', 'stage', 'Checking titling records; field survey to follow', { stage: 'review' }),
        c(now - 1.0 * D, 'Engr. Dante Villamor', 'note', 'Person-in-charge designated — Engr. Kara Villanueva (Survey Technician III)'),
        c(now - 0.18 * D, 'Engr. Kara Villanueva', 'note', 'Submitted to division head for verification — field verification complete, maps attached to records'),
      ],
      createdAt: now - 2.6 * D, updatedAt: now - 0.18 * D, byId: 'u-admindiv', byName: CAROL,
      dueAt: now + 6 * D, diverted: false, assignees: ['u-kvillanueva'], pendingHeadReview: true, progress: 85,
    },
    {
      id: uid(), ref: 'OCE-2026-0134', title: 'Seawall damage assessment — Brgy. Mandaragat shoreline', kind: 'inspection',
      priority: 'urgent', origin: 'CDRRMO coastal watch', divisionId: 'plan', intendedId: 'plan', stage: 'review',
      attachments: [att('seawall-erosion.jpg', 'image', IMG.wall, now - 2.4 * D, 'Engr. Grace Panganiban', { lat: 9.7355, lng: 118.7422 }, '402 KB')],
      custody: [
        c(now - 2.2 * D, CAROL, 'created', 'Logged into the system and transmitted to Planning Design and Programming Division', { fromDivisionId: 'admin', toDivisionId: 'plan' }),
        c(now - 1.2 * D, 'Engr. Grace Panganiban', 'stage', 'Site photos received; assessment drafting started', { stage: 'review' }),
      ],
      createdAt: now - 2.2 * D, updatedAt: now - 1.2 * D, byId: 'u-admindiv', byName: CAROL,
      dueAt: now + 1.2 * D, diverted: false,
      remarks: 'CDRRMO flag: erosion undermining promenade footing near marker B-17.', progress: 30,
    },
    {
      id: uid(), ref: 'OCE-2026-0137', title: 'Street light restoration — National Highway, Brgy. Sta. Monica', kind: 'work-order',
      priority: 'routine', origin: 'Barangay Sta. Monica (resident petition)', divisionId: 'elec', intendedId: 'elec', stage: 'progress',
      attachments: [],
      custody: [
        c(now - 0.3 * D, CAROL, 'created', 'Logged into the system and transmitted to Administrative Division', { fromDivisionId: 'admin', toDivisionId: 'admin' }),
        c(now - 0.25 * D, CE, 'routed', 'For inclusion in the next maintenance run of the Electrical Division', { fromDivisionId: 'admin', toDivisionId: 'elec' }),
        c(now - 0.2 * D, 'Engr. Petra Yumul', 'stage', 'Crew scheduled; parts checked from store', { stage: 'progress' }),
        c(now - 0.15 * D, 'Engr. Petra Yumul', 'note', 'Person-in-charge designated — Mr. Joem Reyes (Lineman II)'),
      ],
      createdAt: now - 0.3 * D, updatedAt: now - 0.15 * D, byId: 'u-admindiv', byName: CAROL, diverted: false, assignees: ['u-jreyes'], progress: 20,
    },
    {
      id: uid(), ref: 'OCE-2026-0130', title: 'Building permit structural review — 3-storey commercial, Rizal Ave.', kind: 'permit',
      priority: 'priority', origin: 'Building Official (applicant: Lim Hardware)', divisionId: 'insp-team', intendedId: 'insp-team', stage: 'verification',
      attachments: [att('facade-check.jpg', 'image', IMG.bldg, now - 4 * D, 'Inspectorate Team', { lat: 9.7435, lng: 118.7349 }, '375 KB')],
      custody: [
        c(now - 5 * D, CAROL, 'created', 'Logged into the system and transmitted to Inspectorate Team', { fromDivisionId: 'admin', toDivisionId: 'insp-team' }),
        c(now - 3 * D, ACE, 'stage', 'Documents complete; scheduled facade inspection', { stage: 'review' }),
        c(now - 1 * D, ACE, 'stage', 'Inspection done; report under final checking', { stage: 'verification' }),
      ],
      createdAt: now - 5 * D, updatedAt: now - 1 * D, byId: 'u-admindiv', byName: CAROL, diverted: false, progress: 90,
    },
    {
      id: uid(), ref: 'OCE-2026-0128', title: 'Sidewalk clearing & repair — Public Market frontage', kind: 'work-order',
      priority: 'routine', origin: 'Walk-in / internal', divisionId: 'psd', intendedId: 'psd', stage: 'progress',
      attachments: [],
      custody: [
        c(now - 6 * D, CAROL, 'created', 'Logged into the system and transmitted to Public Services Division', { fromDivisionId: 'admin', toDivisionId: 'psd' }),
        c(now - 4 * D, 'Engr. Liza Bartolome', 'routed', 'Needs motorpool hauler; endorsed to Motorpool Division', { fromDivisionId: 'psd', toDivisionId: 'motorpool' }),
        c(now - 3 * D, 'Mr. Eddie Gatchalian', 'routed', 'Hauler scheduled; returned to Public Services Division for execution', { fromDivisionId: 'motorpool', toDivisionId: 'psd' }),
        c(now - 1.7 * D, 'Engr. Liza Bartolome', 'stage', 'Crew assigned; clearing starts Monday', { stage: 'progress' }),
        c(now - 1.5 * D, 'Engr. Liza Bartolome', 'note', 'Person-in-charge designated — Mr. Ramon Ito (Sanitation Inspector)'),
      ],
      createdAt: now - 6 * D, updatedAt: now - 1.5 * D, byId: 'u-admindiv', byName: CAROL, diverted: true, assignees: ['u-rito'], progress: 35,
    },
    {
      id: uid(), ref: 'OCE-2026-0142', title: 'Supplemental budget request — H2 2026 infrastructure repairs', kind: 'memo',
      priority: 'urgent', origin: 'City Budget Office', divisionId: 'desk-ce', intendedId: 'desk-ce', stage: 'verification',
      attachments: [att('budget-request-h2.pdf', 'pdf', pdfBudget, now - 1.3 * D, CAROL, undefined, '110 KB')],
      custody: [
        c(now - 1.4 * D, CAROL, 'created', 'Logged into the system and transmitted to the City Engineer desk', { fromDivisionId: 'admin', toDivisionId: 'desk-ce' }),
        c(now - 0.9 * D, CE, 'stage', 'Line items under final review', { stage: 'verification' }),
      ],
      createdAt: now - 1.4 * D, updatedAt: now - 0.9 * D, byId: 'u-admindiv', byName: CAROL, diverted: false, dueAt: now + 1 * D,
    },
    {
      id: uid(), ref: 'OCE-2026-0144', title: 'Scheduled maintenance — OCE Flow server & office network backup', kind: 'memo',
      priority: 'routine', origin: 'I.T. Section (systems maintenance program)', divisionId: 'it', intendedId: 'it', stage: 'progress',
      attachments: [],
      custody: [
        c(now - 1.6 * D, CAROL, 'created', 'Maintenance window memo logged for all divisions', { fromDivisionId: 'admin', toDivisionId: 'it' }),
        c(now - 0.6 * D, 'Alphard S. Grande', 'stage', 'Database backup verified; patch staging in progress', { stage: 'progress' }),
      ],
      createdAt: now - 1.6 * D, updatedAt: now - 0.6 * D, byId: 'u-admindiv', byName: CAROL, diverted: false, progress: 55,
    },
    {
      id: uid(), ref: 'OCE-2026-0146', title: 'Photo & drone documentation — Q3 road concreting projects', kind: 'memo',
      priority: 'routine', origin: 'Documentation and Monitoring Team program', divisionId: 'docmon', intendedId: 'docmon', stage: 'progress',
      attachments: [],
      custody: [
        c(now - 2.4 * D, CAROL, 'created', 'Logged into the system and transmitted to Documentation and Monitoring Team', { fromDivisionId: 'admin', toDivisionId: 'docmon' }),
        c(now - 0.8 * D, 'Ms. Rica Domingo', 'stage', 'Drone sortie over Brgy. San Manuel completed; editing underway', { stage: 'progress' }),
      ],
      createdAt: now - 2.4 * D, updatedAt: now - 0.8 * D, byId: 'u-admindiv', byName: CAROL, diverted: false, progress: 70,
    },
    {
      id: uid(), ref: 'OCE-2026-0147', title: 'Subaybayan citizen report — pothole cluster along Rizal Avenue near the public market', kind: 'complaint',
      priority: 'priority', origin: 'Subaybayan hotline — caller: resident, Brgy. Liwanag', divisionId: 'subay', intendedId: 'subay', stage: 'review',
      attachments: [],
      custody: [
        c(now - 0.5 * D, CAROL, 'created', 'Citizen report logged into the system and transmitted to Subaybayan Team', { fromDivisionId: 'admin', toDivisionId: 'subay' }),
        c(now - 0.3 * D, 'Mr. Aldrin Fajardo', 'stage', 'Report validated on site; endorsement to Maintenance being prepared', { stage: 'review' }),
      ],
      createdAt: now - 0.5 * D, updatedAt: now - 0.3 * D, byId: 'u-admindiv', byName: CAROL, diverted: false, progress: 15,
    },
    {
      id: uid(), ref: 'OCE-2026-0145', title: 'Memorandum Circular 2026-04 — year-end physical inventory of property & equipment', kind: 'memo',
      priority: 'priority', origin: 'Office of the City Engineer — Memorandum Circular', divisionId: 'desk-ce', intendedId: 'desk-ce', stage: 'progress',
      attachments: [],
      custody: [
        c(now - 1.1 * D, CAROL, 'created', 'Circular logged and addressed to all divisions and offices — acknowledgement required', { fromDivisionId: 'admin', toDivisionId: 'desk-ce' }),
        c(now - 1.05 * D, CE, 'routed', 'For dissemination; every desk to submit inventory forms to Administrative Division', { fromDivisionId: 'desk-ce', toDivisionId: 'admin' }),
        c(now - 0.9 * D, CAROL, 'received', 'Receipt acknowledged for Administrative Division', { toDivisionId: 'admin' }),
        c(now - 0.8 * D, 'Engr. Ramil Domingo', 'received', 'Receipt acknowledged for Construction Division', { toDivisionId: 'const' }),
        c(now - 0.75 * D, 'Engr. Nardo Salvador', 'received', 'Receipt acknowledged for Maintenance Division', { toDivisionId: 'maint' }),
        c(now - 0.6 * D, 'Engr. Liza Bartolome', 'received', 'Receipt acknowledged for Public Services Division', { toDivisionId: 'psd' }),
        c(now - 0.4 * D, 'Mr. Eddie Gatchalian', 'received', 'Receipt acknowledged for Motorpool Division', { toDivisionId: 'motorpool' }),
      ],
      createdAt: now - 1.1 * D, updatedAt: now - 0.4 * D, byId: 'u-admindiv', byName: CAROL, diverted: false,
      recipientIds: ALL_UNITS.map((u) => u.id), receivedBy: ['admin', 'const', 'maint', 'psd', 'motorpool'],
    },
    {
      id: uid(), ref: 'OCE-2026-0125', title: 'Materials test results — concreting batch, Brgy. San Manuel', kind: 'inspection',
      priority: 'routine', origin: 'Construction Division (batch request)', divisionId: 'mtqc', intendedId: 'mtqc', stage: 'completed',
      attachments: [],
      custody: [
        c(now - 8 * D, CAROL, 'created', 'Logged into the system and transmitted to Materials Testing and Quality Control Division', { fromDivisionId: 'admin', toDivisionId: 'mtqc' }),
        c(now - 6 * D, 'Engr. Sonny Cabral', 'stage', 'Cores extracted; curing underway', { stage: 'progress' }),
        c(now - 2 * D, 'Engr. Sonny Cabral', 'stage', 'Compressive strength passed at 27.4 MPa; report released', { stage: 'completed' }),
      ],
      createdAt: now - 8 * D, updatedAt: now - 2 * D, byId: 'u-admindiv', byName: CAROL, diverted: false, progress: 100,
    },
  ];

  const notifs: Notif[] = [
    { id: uid(), at: now - 0.35 * D, text: 'Circulated memo OCE-2026-0145 is awaiting your desk’s receipt — 5 of 15 desks acknowledged', kind: 'new', docId: papers[11].id, ref: 'OCE-2026-0145', scope: { type: 'division', divisionId: 'survey' }, readBy: [] },
    { id: uid(), at: now - 0.3 * D, text: 'OCE-2026-0144 assigned to your division — OCE Flow server maintenance window', kind: 'new', docId: papers[8].id, ref: 'OCE-2026-0144', scope: { type: 'division', divisionId: 'it' }, readBy: [] },
    { id: uid(), at: now - 0.4 * D, text: 'Account request — Marcus Ilagan (MTQC) is awaiting administrator verification', kind: 'account', scope: { type: 'supervisors' }, readBy: [] },
    { id: uid(), at: now - 0.9 * D, text: 'OCE-2026-0142 reached the City Engineer’s desk — supplemental budget awaiting approval', kind: 'move', docId: papers[7].id, ref: 'OCE-2026-0142', scope: { type: 'supervisors' }, readBy: [] },
    { id: uid(), at: now - 1.1 * D, text: 'OIC designated — Mr. Dennis Aquino is acting head of MAINT while Engr. Salvador is on leave', kind: 'account', scope: { type: 'supervisors' }, readBy: [] },
    { id: uid(), at: now - 1.1 * D, text: 'You are designated OIC of the Maintenance Division — the division board is now under your charge', kind: 'account', docId: papers[1].id, ref: 'OCE-2026-0139', scope: { type: 'division', divisionId: 'maint' }, targetUserId: 'u-daquino', readBy: [] },
  ];

  const channels: Channel[] = [
    { id: 'ch-floor', name: 'Office Floor', kind: 'floor' },
    { id: 'ch-exec', name: 'Executive Council', kind: 'executive', memberIds: ['u-admin', 'u-sup1', 'u-sup2', 'u-mod'] },
    ...ALL_UNITS.map((d) => ({ id: `ch-${d.id}`, name: d.name, kind: 'unit' as const, unitId: d.id })),
  ];

  const messages: Message[] = [
    { id: uid(), channelId: 'ch-floor', authorId: 'u-admindiv', authorName: 'Ms. Carol Estrella', text: 'Morning everyone — the year-end inventory circular (OCE-2026-0145) is out. Please acknowledge receipt on your boards.', at: now - 1 * D },
    { id: uid(), channelId: 'ch-maint', authorId: 'u-daquino', authorName: 'Mr. Dennis Aquino', text: 'Vactor truck is on Rizal Ave. Expect the intersection to be passable by late afternoon.', at: now - 0.5 * D, docs: [{ id: papers[1].id, ref: papers[1].ref }] },
    { id: uid(), channelId: 'ch-exec', authorId: 'u-sup2', authorName: 'Engr. Julio B. Sergio', text: 'Heads up: seawall assessment for Mandaragat is urgent — CDRRMO flagged footing erosion. PDPD to prioritize.', at: now - 1.2 * D, docs: [{ id: papers[3].id, ref: papers[3].ref }] },
    { id: uid(), channelId: 'ch-subay', authorId: 'u-afajardo', authorName: 'Mr. Aldrin Fajardo', text: 'Site validation done on the Rizal Avenue potholes. Drafting the endorsement to Maintenance now.', at: now - 0.3 * D, docs: [{ id: papers[10].id, ref: papers[10].ref }] },
  ];

  const divisions: Record<string, DivisionMeta> = {
    maint: { oicId: 'u-daquino', oicName: 'Mr. Dennis Aquino', oicSince: now - 1.2 * D, oicNote: 'Acting while Engr. Nardo Salvador is on official leave' },
  };

  const geobrgy: Record<string, string> = {
    [geobrgyKey(9.7389, 118.7371)]: 'San Manuel',
    [geobrgyKey(9.7412, 118.7358)]: 'Liwanag',
    [geobrgyKey(9.7521, 118.7264)]: 'San Pedro',
    [geobrgyKey(9.7355, 118.7422)]: 'Mandaragat',
    [geobrgyKey(9.7435, 118.7349)]: 'Liwanag',
  };

  return { v: 20, session: null, papers, notifs, logs: deriveLogs(papers), users: INITIAL_USERS.map((u) => ({ ...u })), divisions, channels, messages, reads: {}, geobrgy, msgDeletes: [], seq: 148 };
}

const LOG_MAP: Record<CustodyAction, LogType | null> = {
  created: 'create', received: 'create', stage: 'stage', routed: 'route', note: 'note', attachment: 'attachment', completed: 'stage',
};

export function deriveLogs(papers: Paper[]): SysLog[] {
  const byName = new Map(INITIAL_USERS.map((u) => [u.name, u]));
  const logs: SysLog[] = [];
  const firstSeen = new Map<string, number>();
  for (const p of papers) {
    for (const e of p.custody) {
      const u = byName.get(e.byName);
      if (!u) continue;
      const type = LOG_MAP[e.action];
      if (!type) continue;
      if (!firstSeen.has(u.id) || e.at < (firstSeen.get(u.id) ?? 0)) firstSeen.set(u.id, e.at);
      logs.push({ id: `log-${e.id}`, at: e.at, userId: u.id, userName: u.name, type, text: e.text, ref: p.ref, docId: p.id });
    }
  }
  for (const [userId, at] of firstSeen) {
    const u = INITIAL_USERS.find((x) => x.id === userId);
    logs.push({ id: uid(), at: at - 22 * 60 * 1000, userId, userName: u?.name ?? 'Officer', type: 'login', text: 'Signed in to OCE Flow (session start)' });
  }
  return logs.sort((a, b) => b.at - a.at);
}

export function deriveActivities(papers: Paper[]): Activity[] {
  const out: Activity[] = [];
  for (const p of papers) {
    for (const e of p.custody) {
      let type: Activity['type'] | null = null;
      if (e.action === 'created') type = 'create';
      else if (e.action === 'stage') type = e.stage === 'completed' ? 'complete' : 'move';
      else if (e.action === 'routed') type = 'route';
      else if (e.action === 'note') type = 'note';
      else if (e.action === 'attachment') type = 'attach';
      else if (e.action === 'received') type = 'note';
      if (!type) continue;
      out.push({ id: e.id, at: e.at, byName: e.byName, type, text: e.text, ref: p.ref, docId: p.id, stage: e.stage });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}
