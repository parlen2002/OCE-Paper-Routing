export type Stage = 'received' | 'review' | 'progress' | 'verification' | 'completed';
export type Cluster = 'ops' | 'tech';
export type Kind = 'work-order' | 'permit' | 'memo' | 'complaint' | 'inspection';
export type Priority = 'routine' | 'priority' | 'urgent';
export type Role = 'supervisor' | 'division';

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
}

export interface Notif {
  id: string;
  at: number;
  text: string;
  kind: 'new' | 'move' | 'route' | 'complete';
  docId?: string;
  ref?: string;
  scope: { type: 'division'; divisionId: string } | { type: 'supervisors' };
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

export interface DB {
  v: number;
  session: string | null;
  papers: Paper[];
  notifs: Notif[];
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
    name: 'Construction & Projects',
    cluster: 'ops',
    head: 'Engr. Ramil Domingo',
    headUser: 'rdomingo',
    desc: 'Vertical & structural projects, seawalls, public buildings and special works.',
  },
  {
    id: 'roads',
    code: 'ROADS',
    name: 'Roads & Bridges',
    cluster: 'ops',
    head: 'Engr. Liza Bartolome',
    headUser: 'lbartolome',
    desc: 'Road concreting, bridges, culverts, shoulders and right-of-way works.',
  },
  {
    id: 'maint',
    code: 'MAINT',
    name: 'Maintenance',
    cluster: 'ops',
    head: 'Engr. Nardo Salvador',
    headUser: 'nsalvador',
    desc: 'Sidewalks, public structures upkeep, clearing operations and repair crews.',
  },
  {
    id: 'elec',
    code: 'ELEC-MECH',
    name: 'Electrical & Mechanical',
    cluster: 'ops',
    head: 'Engr. Petra Yumul',
    headUser: 'pyumul',
    desc: 'Street lighting, pumps, shop equipment and mechanical installations.',
  },
  {
    id: 'drain',
    code: 'DRAIN',
    name: 'Drainage & Flood Control',
    cluster: 'ops',
    head: 'Engr. Boyet Ramos',
    headUser: 'bramos',
    desc: 'Canals, declogging, pumping stations and flood mitigation works.',
  },
  {
    id: 'plan',
    code: 'PLAN',
    name: 'Planning & Design',
    cluster: 'tech',
    head: 'Engr. Grace Panganiban',
    headUser: 'gpanganiban',
    desc: 'Detailed engineering designs, programs of works and cost estimates.',
  },
  {
    id: 'permits',
    code: 'PERMITS',
    name: 'Building Official & Permits',
    cluster: 'tech',
    head: 'Engr. Victor Halili',
    headUser: 'vhalili',
    desc: 'Building permits, occupancy evaluation and plan compliance checks.',
  },
  {
    id: 'insp',
    code: 'INSP',
    name: 'Inspection & Safety',
    cluster: 'tech',
    head: 'Engr. Mona Abad',
    headUser: 'mabad',
    desc: 'Structural inspections, materials testing and safety compliance.',
  },
  {
    id: 'admin',
    code: 'RECORDS',
    name: 'Records & Administration',
    cluster: 'tech',
    head: 'Ms. Carol Estrella',
    headUser: 'cestrella',
    desc: 'Intake desk, records custody, archiving and office administration.',
  },
];

export const USERS: User[] = [
  { id: 'u-sup1', name: 'Engr. Ana Villanueva', username: 'avillanueva', password: 'cityeng2026', role: 'supervisor', title: 'Supervisor — Field Operations Cluster' },
  { id: 'u-sup2', name: 'Engr. Cesar Tiongson', username: 'ctiongson', password: 'cityeng2026', role: 'supervisor', title: 'Supervisor — Technical Services Cluster' },
  { id: 'u-const', name: 'Engr. Ramil Domingo', username: 'rdomingo', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'const' },
  { id: 'u-roads', name: 'Engr. Liza Bartolome', username: 'lbartolome', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'roads' },
  { id: 'u-maint', name: 'Engr. Nardo Salvador', username: 'nsalvador', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'maint' },
  { id: 'u-elec', name: 'Engr. Petra Yumul', username: 'pyumul', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'elec' },
  { id: 'u-drain', name: 'Engr. Boyet Ramos', username: 'bramos', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'drain' },
  { id: 'u-plan', name: 'Engr. Grace Panganiban', username: 'gpanganiban', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'plan' },
  { id: 'u-permits', name: 'Engr. Victor Halali', username: 'vhalali', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'permits' },
  { id: 'u-insp', name: 'Engr. Mona Abad', username: 'mabad', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'insp' },
  { id: 'u-admin', name: 'Ms. Carol Estrella', username: 'cestrella', password: 'cityeng2026', role: 'division', title: 'Records Officer', divisionId: 'admin' },
];

export const divById = (id: string): Division | undefined => DIVISIONS.find((d) => d.id === id);
export const userById = (id: string | null): User | undefined => USERS.find((u) => u.id === id);

export const CLUSTERS: Record<Cluster, { label: string; supervisor: string }> = {
  ops: { label: 'Field Operations Cluster', supervisor: 'Engr. Ana Villanueva' },
  tech: { label: 'Technical Services Cluster', supervisor: 'Engr. Cesar Tiongson' },
};
