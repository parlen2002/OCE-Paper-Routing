export type Stage = 'received' | 'review' | 'progress' | 'verification' | 'completed';
export type Cluster = 'ops' | 'tech';
export type Kind = 'work-order' | 'permit' | 'memo' | 'complaint' | 'inspection';
export type Priority = 'routine' | 'priority' | 'urgent';
export type Role = 'supervisor' | 'division' | 'admin' | 'employee';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface Division {
  id: string;
  code: string;
  name: string;
  cluster: Cluster;
  head: string;
  headUser: string;
  desc: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  title: string;
  divisionId?: string;
  shortTitle?: string;
  status: UserStatus;
  requestedDivisionId?: string;
  requestedTitle?: string;
  requestedAt?: number;
}

export interface Attachment {
  id: string;
  name: string;
  kind: 'image' | 'pdf';
  url: string;
  geotagged: boolean;
  lat?: number;
  lng?: number;
  by: string;
  at: number;
  size?: string;
}

export type CustodyAction =
  | 'created'
  | 'received'
  | 'stage'
  | 'routed'
  | 'note'
  | 'attachment'
  | 'completed';

export interface Custody {
  id: string;
  at: number;
  byName: string;
  action: CustodyAction;
  text: string;
  stage?: Stage;
  fromDivisionId?: string;
  toDivisionId?: string;
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
  /** Every desk this paper was addressed to (length > 1 = circular). Falls back to [divisionId]. */
  recipientIds?: string[];
  /** Desk ids that acknowledged receipt of a circular. */
  receivedBy?: string[];
  /** Employee (user id) designated person-in-charge of the work order. */
  assignedTo?: string;
  assignedByName?: string;
  /** Employee submitted it to the division head — awaiting verification. */
  pendingHeadReview?: boolean;
}

export interface Notif {
  id: string;
  at: number;
  text: string;
  kind: 'new' | 'move' | 'route' | 'complete' | 'account';
  docId?: string;
  ref?: string;
  scope: { type: 'division'; divisionId: string } | { type: 'supervisors' };
  /** Deliver directly to this user's bell regardless of scope (e.g. assigned employee). */
  targetUserId?: string;
  readBy: string[];
}

export interface Activity {
  id: string;
  at: number;
  byName: string;
  type: 'create' | 'move' | 'route' | 'note' | 'attach' | 'complete';
  text: string;
  docId: string;
  ref: string;
}

export type LogType =
  | 'login'
  | 'logout'
  | 'create'
  | 'stage'
  | 'route'
  | 'note'
  | 'attachment'
  | 'reset'
  | 'signup'
  | 'approve'
  | 'deny'
  | 'edit'
  | 'delete';

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

export interface DB {
  v: number;
  session: string | null;
  papers: Paper[];
  notifs: Notif[];
  logs: SysLog[];
  users: User[];
  seq: number;
}

export const STAGES: { id: Stage; label: string; hint: string; color: string }[] = [
  { id: 'received', label: 'Received', hint: 'Incoming tray', color: '#56C8F0' },
  { id: 'review', label: 'Under Review', hint: 'Assessment', color: '#F5B924' },
  { id: 'progress', label: 'In Progress', hint: 'Field / desk work', color: '#FF6B1C' },
  { id: 'verification', label: 'Verification', hint: 'Inspection & QA', color: '#2DD4BF' },
  { id: 'completed', label: 'Completed', hint: 'Closed & archived', color: '#45D483' },
];

export const stageMeta = (id: Stage) => STAGES.find((s) => s.id === id)!;

export const KINDS: Record<Kind, { label: string; short: string }> = {
  'work-order': { label: 'Work Order', short: 'WO' },
  permit: { label: 'Permit', short: 'PRM' },
  memo: { label: 'Memorandum', short: 'MEM' },
  complaint: { label: 'Complaint', short: 'CMP' },
  inspection: { label: 'Inspection', short: 'INS' },
};

export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  routine: { label: 'Routine', color: '#6684A3' },
  priority: { label: 'Priority', color: '#F5B924' },
  urgent: { label: 'Urgent', color: '#F4645C' },
};

export const DIVISIONS: Division[] = [
  {
    id: 'const',
    code: 'CONST',
    name: 'Construction Division',
    cluster: 'ops',
    head: 'Engr. Ramil Domingo',
    headUser: 'rdomingo',
    desc: 'Vertical & structural projects, seawalls, road concreting, public buildings and special works.',
  },
  {
    id: 'maint',
    code: 'MAINT',
    name: 'Maintenance Division',
    cluster: 'ops',
    head: 'Engr. Nardo Salvador',
    headUser: 'nsalvador',
    desc: 'Upkeep of public structures, drainage & declogging, clearing operations and repair crews.',
  },
  {
    id: 'psd',
    code: 'PSD',
    name: 'Public Services Division',
    cluster: 'ops',
    head: 'Engr. Liza Bartolome',
    headUser: 'lbartolome',
    desc: 'Public service works, sidewalks, market facilities, parks support and community-requested jobs.',
  },
  {
    id: 'survey',
    code: 'SURVEY',
    name: 'Survey and Mapping Division',
    cluster: 'tech',
    head: 'Engr. Dante Villamor',
    headUser: 'dvillamor',
    desc: 'Land surveys, right-of-way verification, topographic mapping and geodetic control for projects.',
  },
  {
    id: 'elec',
    code: 'ELEC',
    name: 'Electrical Division',
    cluster: 'ops',
    head: 'Engr. Petra Yumul',
    headUser: 'pyumul',
    desc: 'Street lighting, building electrical works, pumps and electrical installations city-wide.',
  },
  {
    id: 'mtqc',
    code: 'MTQC',
    name: 'Materials Testing and Quality Control Division',
    cluster: 'tech',
    head: 'Engr. Mona Abad',
    headUser: 'mabad',
    desc: 'Concrete core testing, materials quality control, compliance checks and test result certification.',
  },
  {
    id: 'motorpool',
    code: 'MPOOL',
    name: 'Motorpool Division',
    cluster: 'ops',
    head: 'Engr. Boyet Ramos',
    headUser: 'bramos',
    desc: 'Heavy equipment and service vehicle fleet — deployment, preventive maintenance and dispatch.',
  },
  {
    id: 'plan',
    code: 'PDPD',
    name: 'Planning Design and Programming Division',
    cluster: 'tech',
    head: 'Engr. Grace Panganiban',
    headUser: 'gpanganiban',
    desc: 'Detailed engineering designs, programs of works, cost estimates and annual infrastructure programming.',
  },
  {
    id: 'admin',
    code: 'ADMIN',
    name: 'Administrative Division',
    cluster: 'tech',
    head: 'Ms. Carol Estrella',
    headUser: 'cestrella',
    desc: 'Intake desk, records custody & archiving, HR support and general office administration.',
  },
];

/** Cross-division inspection unit — not one of the nine divisions, but keeps the inspections workflow intact. */
export const INSPECTORATE: Division = {
  id: 'insp-team',
  code: 'INSP-TEAM',
  name: 'Inspectorate Team',
  cluster: 'tech',
  head: 'Under the Office of the City Engineer',
  headUser: '',
    desc: 'Cross-division team that conducts structural, safety and occupancy inspections on behalf of the City Engineer. Inspection (INS) paperwork routes here.',
};

/** I.T. Division — cross-division unit hosting the program administrator and digital services. */
export const IT_DIVISION: Division = {
  id: 'it',
  code: 'IT',
  name: 'I.T. Division',
  cluster: 'tech',
  head: 'Alphard S. Grande',
  headUser: 'admin',
  desc: 'Information technology services — maintains CEO Flow, user accounts, office network and connectivity, digital records and data backups for the whole office.',
};

/** Cross-division units — routable recipients alongside the nine divisions. */
export const CROSS_UNITS: Division[] = [INSPECTORATE, IT_DIVISION];

/** Executive desks — the two department heads are first-class recipients of paperwork. */export const DESKS: Division[] = [
  {
    id: 'desk-ce',
    code: 'CE-DESK',
    name: 'Office of the City Engineer',
    cluster: 'ops',
    head: 'Engr. Aries S. Grande',
    headUser: 'agrande',
    desc: 'Final approval, signing and executive routing — Engr. Aries S. Grande, CGPP Department Head II (City Engineer).',
  },
  {
    id: 'desk-ace',
    code: 'ACE-DESK',
    name: 'Office of the Assistant City Engineer',
    cluster: 'tech',
    head: 'Engr. Julio B. Sergio',
    headUser: 'jsergio',
    desc: 'Review, endorsement and concurrent supervision — Engr. Julio B. Sergio, CGPP Assistant Department Head II (Assistant City Engineer).',
  },
];

export const ALL_UNITS = [...DIVISIONS, ...CROSS_UNITS, ...DESKS];

export const divById = (id: string): Division | undefined => ALL_UNITS.find((d) => d.id === id);

export const CLUSTERS: Record<Cluster, { label: string; supervisor: string }> = {
  ops: { label: 'Field Operations Cluster', supervisor: 'Engr. Aries S. Grande — City Engineer' },
  tech: { label: 'Technical Services Cluster', supervisor: 'Engr. Julio B. Sergio — Asst. City Engineer' },
};

export const cityEngineerName = (users: User[]): string =>
  users.find((u) => u.role === 'supervisor' && u.title.includes('(City Engineer)'))?.name ?? 'Engr. Aries S. Grande';
