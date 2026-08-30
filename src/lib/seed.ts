import type {
  Activity,
  Attachment,
  Custody,
  CustodyAction,
  DB,
  LogType,
  Notif,
  Paper,
  SysLog,
  User,
} from './types';
import { ALL_UNITS } from './types';
import { uid, makeStubPdf } from './util';

const H = 36e5;
const D = 24 * H;

const IMG = {
  road: 'https://image.qwenlm.ai/generated-images/b05be70d-2635-4308-90c1-b364dcbc0fea/_result.png',
  drain: 'https://image.qwenlm.ai/generated-images/6373dd2b-e3b1-4741-9ca2-a2cbc8d61b47/_result.png',
  building: 'https://image.qwenlm.ai/generated-images/a1586b10-5301-4245-9a70-7b3c2a8ef017/_result.png',
  seawall: 'https://image.qwenlm.ai/generated-images/43b0b574-1d83-478d-bd01-dc79d9a29bcf/_result.png',
};

const c = (
  at: number,
  byName: string,
  action: CustodyAction,
  text: string,
  extra: Partial<Custody> = {}
): Custody => ({ id: uid(), at, byName, action, text, ...extra });

const img = (
  name: string,
  url: string,
  by: string,
  at: number,
  lat?: number,
  lng?: number
): Attachment => ({
  id: uid(),
  name,
  kind: 'image',
  url,
  geotagged: lat != null && lng != null,
  lat,
  lng,
  by,
  at,
  size: '812 KB',
});

const pdf = (name: string, title: string, lines: string[], by: string, at: number): Attachment => ({
  id: uid(),
  name,
  kind: 'pdf',
  url: makeStubPdf(title, lines),
  geotagged: false,
  by,
  at,
  size: '4 KB',
});

const CAROL = 'Ms. Carol Estrella';
const CE = 'Engr. Aries S. Grande';
const ACE = 'Engr. Julio B. Sergio';

export const INITIAL_USERS: User[] = [
  { id: 'u-admin', name: 'Alphard S. Grande', username: 'admin', password: 'cityeng2026', role: 'admin', title: 'System Administrator — I.T. Division', shortTitle: 'Administrator', divisionId: 'it', status: 'active' },
  { id: 'u-sup1', name: 'Engr. Aries S. Grande', username: 'agrande', password: 'cityeng2026', role: 'supervisor', title: 'CGPP Department Head II (City Engineer)', shortTitle: 'City Engineer', status: 'active' },
  { id: 'u-sup2', name: 'Engr. Julio B. Sergio', username: 'jsergio', password: 'cityeng2026', role: 'supervisor', title: 'CGPP Assistant Department Head II (Assistant City Engineer)', shortTitle: 'Asst. City Engineer', status: 'active' },
  { id: 'u-const', name: 'Engr. Ramil Domingo', username: 'rdomingo', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'const', status: 'active' },
  { id: 'u-maint', name: 'Engr. Nardo Salvador', username: 'nsalvador', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'maint', status: 'active' },
  { id: 'u-psd', name: 'Engr. Liza Bartolome', username: 'lbartolome', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'psd', status: 'active' },
  { id: 'u-survey', name: 'Engr. Dante Villamor', username: 'dvillamor', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'survey', status: 'active' },
  { id: 'u-elec', name: 'Engr. Petra Yumul', username: 'pyumul', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'elec', status: 'active' },
  { id: 'u-mtqc', name: 'Engr. Mona Abad', username: 'mabad', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'mtqc', status: 'active' },
  { id: 'u-motor', name: 'Engr. Boyet Ramos', username: 'bramos', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'motorpool', status: 'active' },
  { id: 'u-plan', name: 'Engr. Grace Panganiban', username: 'gpanganiban', password: 'cityeng2026', role: 'division', title: 'Division Head', divisionId: 'plan', status: 'active' },
  { id: 'u-admindiv', name: 'Ms. Carol Estrella', username: 'cestrella', password: 'cityeng2026', role: 'division', title: 'Records & Admin Officer', divisionId: 'admin', status: 'active' },
  // ---- employees: person-in-charge of individual work orders, each with a personal board ----
  { id: 'u-pmanalo', name: 'Engr. Paolo Manalo', username: 'pmanalo', password: 'cityeng2026', role: 'employee', title: 'Project Engineer I', divisionId: 'const', status: 'active' },
  { id: 'u-daquino', name: 'Mr. Dennis Aquino', username: 'daquino', password: 'cityeng2026', role: 'employee', title: 'Maintenance Foreman', divisionId: 'maint', status: 'active' },
  { id: 'u-kvillanueva', name: 'Engr. Kara Villanueva', username: 'kvillanueva', password: 'cityeng2026', role: 'employee', title: 'Survey Technician III', divisionId: 'survey', status: 'active' },
  { id: 'u-rito', name: 'Mr. Ramon Ito', username: 'rito', password: 'cityeng2026', role: 'employee', title: 'Sanitation Inspector', divisionId: 'psd', status: 'active' },
  { id: 'u-jreyes', name: 'Mr. Joem Reyes', username: 'jreyes', password: 'cityeng2026', role: 'employee', title: 'Lineman II', divisionId: 'elec', status: 'active' },
  {
    id: 'u-pend1',
    name: 'Marcus Ilagan',
    username: 'milagan',
    password: 'cityeng2026',
    role: 'division',
    title: 'OIC — MTQC',
    divisionId: 'mtqc',
    status: 'pending',
    requestedDivisionId: 'mtqc',
    requestedTitle: 'Division OIC',
    requestedAt: Date.now() - 0.4 * D,
  },
  {
    id: 'u-pend2',
    name: 'Ms. Bea Castillo',
    username: 'bcastillo',
    password: 'cityeng2026',
    role: 'employee',
    title: 'Junior Project Engineer',
    divisionId: 'const',
    status: 'pending',
    requestedDivisionId: 'const',
    requestedTitle: 'Junior Project Engineer',
    requestedAt: Date.now() - 0.15 * D,
  },
];

export function freshSeed(): DB {
  const now = Date.now();

  const papers: Paper[] = [
    {
      id: uid(),
      ref: 'CEO-2026-0141',
      title: 'Emergency seawall erosion repair — Baywalk Ext., Brgy. Liwanag',
      kind: 'work-order',
      priority: 'urgent',
      origin: 'City Disaster Risk Reduction & Management Office',
      divisionId: 'const',
      intendedId: 'const',
      stage: 'progress',
      attachments: [img('seawall-erosion-site.jpg', IMG.seawall, 'Engr. Ramil Domingo', now - 1.9 * D, 9.7399, 118.7295)],
      custody: [
        c(now - 2.2 * D, CAROL, 'created', 'Logged at intake desk - endorsed by CDRRMO after high-tide inspection', { toDivisionId: 'const' }),
        c(now - 2.1 * D, CE, 'routed', 'Emergency work order released to Construction Division - mobilize within 24h', { fromDivisionId: 'admin', toDivisionId: 'const' }),
        c(now - 1.9 * D, 'Engr. Ramil Domingo', 'attachment', 'Attached site photos with GPS tags (Baywalk section 4)', {}),
        c(now - 1.2 * D, 'Engr. Ramil Domingo', 'stage', 'Site team deployed; gabion shoring underway', { stage: 'progress' }),
        c(now - 1.1 * D, 'Engr. Ramil Domingo', 'note', 'Person-in-charge designated — Engr. Paolo Manalo (Project Engineer I)', {}),
      ],
      createdAt: now - 2.2 * D,
      updatedAt: now - 1.1 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 1.2 * D,
      remarks: 'CDRRMO flag: erosion undermining promenade footing near marker B-17.',
      diverted: false,
      assignedTo: 'u-pmanalo',
      assignedByName: 'Engr. Paolo Manalo',
    },
    {
      id: uid(),
      ref: 'CEO-2026-0140',
      title: 'Structural inspection — City Market arcade roof trusses',
      kind: 'inspection',
      priority: 'priority',
      origin: 'City Market Administration',
      divisionId: 'insp-team',
      intendedId: 'insp-team',
      stage: 'verification',
      attachments: [img('market-arcade-trusses.jpg', IMG.building, 'Inspectorate Team', now - 0.5 * D, 9.7372, 118.7344)],
      custody: [
        c(now - 4.2 * D, CAROL, 'created', 'Endorsed by City Market Administrator - corrosion reported on truss line C', { toDivisionId: 'insp-team' }),
        c(now - 4.1 * D, ACE, 'routed', 'Inspectorate Team to conduct structural integrity check of arcade roof trusses', { fromDivisionId: 'admin', toDivisionId: 'insp-team' }),
        c(now - 3.0 * D, 'Engr. Mona Abad', 'stage', 'Inspection team scheduled; access coordinated with market admin', { stage: 'progress' }),
        c(now - 0.5 * D, 'Engr. Mona Abad', 'stage', 'Field inspection done; computing load ratings', { stage: 'verification' }),
      ],
      createdAt: now - 4.2 * D,
      updatedAt: now - 0.5 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 2 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0139',
      title: 'Clogged drainage & minor flooding — Malvar St. cor. Burgos St.',
      kind: 'complaint',
      priority: 'urgent',
      origin: 'Brgy. Bancao-Bancao resident (R. Maturan)',
      divisionId: 'maint',
      intendedId: 'maint',
      stage: 'progress',
      attachments: [img('malvar-flooding-report.jpg', IMG.drain, 'Engr. Boyet Ramos', now - 0.9 * D, 9.7521, 118.7352)],
      custody: [
        c(now - 1.1 * D, CAROL, 'created', "Complaint endorsed by City Administrator's Office", { toDivisionId: 'maint' }),
        c(now - 1.05 * D, CE, 'routed', 'Urgent - flooding at Malvar-Burgos intersection; Maintenance to dispatch declogging team', { fromDivisionId: 'admin', toDivisionId: 'maint' }),
        c(now - 0.9 * D, 'Engr. Nardo Salvador', 'attachment', 'Attached geotagged photo of overflow point', {}),
        c(now - 0.6 * D, 'Engr. Nardo Salvador', 'stage', 'Vactor truck dispatched; declogging underway', { stage: 'progress' }),
        c(now - 0.5 * D, 'Engr. Nardo Salvador', 'note', 'Person-in-charge designated — Mr. Dennis Aquino (Maintenance Foreman)', {}),
      ],
      createdAt: now - 1.1 * D,
      updatedAt: now - 0.5 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 0.5 * D,
      remarks: 'Resident reports knee-deep water at the intersection after 30-min rain.',
      diverted: false,
      assignedTo: 'u-daquino',
      assignedByName: 'Mr. Dennis Aquino',
    },
    {
      id: uid(),
      ref: 'CEO-2026-0138',
      title: 'Barangay road concreting Phase 2 — Brgy. San Pedro (240 lm)',
      kind: 'work-order',
      priority: 'priority',
      origin: 'Office of the City Mayor (2026 infrastructure program)',
      divisionId: 'const',
      intendedId: 'const',
      stage: 'progress',
      attachments: [img('san-pedro-pouring.jpg', IMG.road, 'Engr. Ramil Domingo', now - 1.9 * D, 9.7683, 118.7621)],
      custody: [
        c(now - 3.1 * D, CAROL, 'created', "Work order received from Mayor's Office", { toDivisionId: 'const' }),
        c(now - 3.0 * D, CE, 'routed', 'Phase 2 concreting, 240 lm - coordinate with barangay for closure schedule', { fromDivisionId: 'admin', toDivisionId: 'const' }),
        c(now - 2.0 * D, 'Engr. Ramil Domingo', 'stage', 'Base course finished; pouring scheduled this week', { stage: 'progress' }),
        c(now - 1.9 * D, 'Engr. Ramil Domingo', 'attachment', 'Attached progress photos (geotagged)', {}),
      ],
      createdAt: now - 3.1 * D,
      updatedAt: now - 1.9 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 9 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0137',
      title: 'Street lighting repair — Liwanag Avenue (14 units)',
      kind: 'work-order',
      priority: 'routine',
      origin: 'Barangay Liwanag Council',
      divisionId: 'elec',
      intendedId: 'elec',
      stage: 'progress',
      attachments: [
        pdf(
          'Liwanag-Ave-lighting-inventory.pdf',
          'STREET LIGHTING INVENTORY - LIWANAG AVE',
          [
            'Unit 01-14: 100W LED, pole condition fair',
            'Units 03, 07, 11: no output - suspected ballast failure',
            'Unit 09: pole leaning approx. 4 deg after vehicle impact',
            'Requested action: repair and realign within maintenance run',
          ],
          CAROL,
          now - 0.3 * D
        ),
      ],
      custody: [
        c(now - 0.3 * D, CAROL, 'created', 'Received with lighting inventory attached', { toDivisionId: 'elec' }),
        c(now - 0.25 * D, CE, 'routed', 'For inclusion in the next maintenance run of the Electrical Division', { fromDivisionId: 'admin', toDivisionId: 'elec' }),
        c(now - 0.2 * D, 'Engr. Petra Yumul', 'stage', 'Crew scheduled; parts checked from store', { stage: 'progress' }),
        c(now - 0.15 * D, 'Engr. Petra Yumul', 'note', 'Person-in-charge designated — Mr. Joem Reyes (Lineman II)', {}),
      ],
      createdAt: now - 0.3 * D,
      updatedAt: now - 0.15 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: false,
      assignedTo: 'u-jreyes',
      assignedByName: 'Mr. Joem Reyes',
    },
    {
      id: uid(),
      ref: 'CEO-2026-0136',
      title: 'Land survey & right-of-way verification — Brgy. Bacalan crossing',
      kind: 'work-order',
      priority: 'priority',
      origin: 'Planning Design and Programming Division',
      divisionId: 'survey',
      intendedId: 'survey',
      stage: 'verification',
      attachments: [],
      custody: [
        c(now - 2.6 * D, CAROL, 'created', 'Survey request logged with vicinity map annex', { toDivisionId: 'survey' }),
        c(now - 2.5 * D, ACE, 'routed', 'Verify lot boundaries and right-of-way before design proceeds', { fromDivisionId: 'admin', toDivisionId: 'survey' }),
        c(now - 1.4 * D, 'Engr. Dante Villamor', 'stage', 'Checking titling records; field survey to follow', { stage: 'review' }),
        c(now - 1.0 * D, 'Engr. Dante Villamor', 'note', 'Person-in-charge designated — Engr. Kara Villanueva (Survey Technician III)', {}),
        c(now - 0.18 * D, 'Engr. Kara Villanueva', 'note', 'Submitted to division head for verification — field verification complete, maps attached to records', {}),
      ],
      createdAt: now - 2.6 * D,
      updatedAt: now - 0.18 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 6 * D,
      diverted: false,
      assignedTo: 'u-kvillanueva',
      assignedByName: 'Engr. Kara Villanueva',
      pendingHeadReview: true,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0135',
      title: 'Concrete core testing — City Market arcade (truss line C footings)',
      kind: 'inspection',
      priority: 'priority',
      origin: 'Inspectorate Team endorsement',
      divisionId: 'mtqc',
      intendedId: 'mtqc',
      stage: 'verification',
      attachments: [],
      custody: [
        c(now - 1.8 * D, CAROL, 'created', 'Testing request endorsed by the Inspectorate Team', { toDivisionId: 'mtqc' }),
        c(now - 1.7 * D, ACE, 'routed', 'MTQC to extract and test 3 cores; results to the Inspectorate Team', { fromDivisionId: 'admin', toDivisionId: 'mtqc' }),
        c(now - 0.8 * D, 'Engr. Mona Abad', 'stage', 'Cores extracted; 7-day compressive strength pending', { stage: 'verification' }),
      ],
      createdAt: now - 1.8 * D,
      updatedAt: now - 0.8 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 5 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0134',
      title: 'Preventive maintenance — Iwahig flood control pumping station',
      kind: 'work-order',
      priority: 'routine',
      origin: 'Office of the City Engineer (scheduled PM)',
      divisionId: 'maint',
      intendedId: 'maint',
      stage: 'completed',
      attachments: [],
      custody: [
        c(now - 9 * D, CAROL, 'created', 'Scheduled PM work order issued', { toDivisionId: 'maint' }),
        c(now - 8.8 * D, CE, 'routed', 'Both pump units due for quarterly service', { fromDivisionId: 'admin', toDivisionId: 'maint' }),
        c(now - 7 * D, 'Engr. Nardo Salvador', 'stage', 'Parts received; service started', { stage: 'progress' }),
        c(now - 3.2 * D, 'Engr. Nardo Salvador', 'stage', 'Both pumps serviced and tested at full load', { stage: 'completed' }),
        c(now - 3.2 * D, 'Engr. Nardo Salvador', 'completed', 'Job closed - PM checklist filed to Administrative Division', {}),
      ],
      createdAt: now - 9 * D,
      updatedAt: now - 3.2 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0133',
      title: 'Sidewalk clearing & repair — National Highway, San Manuel stretch',
      kind: 'work-order',
      priority: 'routine',
      origin: "City Administrator's Office",
      divisionId: 'psd',
      intendedId: 'maint',
      stage: 'progress',
      attachments: [],
      custody: [
        c(now - 5 * D, CAROL, 'created', 'Clearing order logged after inter-agency meeting', { toDivisionId: 'maint' }),
        c(now - 4.9 * D, CE, 'routed', 'For sidewalk clearing crew scheduling', { fromDivisionId: 'admin', toDivisionId: 'maint' }),
        c(now - 2.3 * D, 'Engr. Nardo Salvador', 'routed', 'Endorsed to Public Services Division - concurrent with their sidewalk program on the same stretch', { fromDivisionId: 'maint', toDivisionId: 'psd' }),
        c(now - 1.7 * D, 'Engr. Liza Bartolome', 'stage', 'Crew assigned; clearing starts Monday', { stage: 'progress' }),
        c(now - 1.5 * D, 'Engr. Liza Bartolome', 'note', 'Person-in-charge designated — Mr. Ramon Ito (Sanitation Inspector)', {}),
      ],
      createdAt: now - 5 * D,
      updatedAt: now - 1.5 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: true,
      assignedTo: 'u-rito',
      assignedByName: 'Mr. Ramon Ito',
    },
    {
      id: uid(),
      ref: 'CEO-2026-0132',
      title: 'Detailed design — box culvert, Brgy. Bacalan crossing',
      kind: 'memo',
      priority: 'priority',
      origin: 'City Planning & Development Office',
      divisionId: 'plan',
      intendedId: 'plan',
      stage: 'review',
      attachments: [],
      custody: [
        c(now - 2.6 * D, CAROL, 'created', 'Design request logged with hydrology annex', { toDivisionId: 'plan' }),
        c(now - 2.5 * D, ACE, 'routed', 'Prepare detailed design and program of works', { fromDivisionId: 'admin', toDivisionId: 'plan' }),
        c(now - 1.4 * D, 'Engr. Grace Panganiban', 'stage', 'Hydrology data gathering underway', { stage: 'review' }),
      ],
      createdAt: now - 2.6 * D,
      updatedAt: now - 1.4 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 12 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0131',
      title: 'Digitization of 2025 as-built drawings — records program',
      kind: 'memo',
      priority: 'routine',
      origin: 'Administrative Division (records program)',
      divisionId: 'admin',
      intendedId: 'admin',
      stage: 'progress',
      attachments: [],
      custody: [
        c(now - 6 * D, CAROL, 'created', 'Records program memo issued for 2025 as-built files', { toDivisionId: 'admin' }),
        c(now - 5 * D, CAROL, 'stage', 'Scanning started - batches 1 to 3 of 14', { stage: 'progress' }),
      ],
      createdAt: now - 6 * D,
      updatedAt: now - 5 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0130',
      title: 'Annual audit — batching plant, asphalt kettle & heavy equipment',
      kind: 'inspection',
      priority: 'priority',
      origin: 'Office of the City Engineer (equipment audit)',
      divisionId: 'motorpool',
      intendedId: 'motorpool',
      stage: 'received',
      attachments: [
        pdf(
          'equipment-audit-checklist.pdf',
          'ANNUAL EQUIPMENT AUDIT - CHECKLIST',
          [
            'Batching plant: motors, conveyor, silo discharge',
            'Asphalt kettle units 1-2: burner and thermostat',
            'Rollers R-03 / R-05: vibration system',
            'Findings to be encoded in the equipment registry',
          ],
          ACE,
          now - 0.15 * D
        ),
      ],
      custody: [
        c(now - 0.15 * D, CAROL, 'created', 'Annual equipment inspection request logged', { toDivisionId: 'motorpool' }),
        c(now - 0.1 * D, ACE, 'routed', 'Motorpool to schedule within the week; submit findings to Technical Services', { fromDivisionId: 'admin', toDivisionId: 'motorpool' }),
      ],
      createdAt: now - 0.15 * D,
      updatedAt: now - 0.1 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 6 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0129',
      title: 'Road shoulder erosion — Puerto Princesa North Rd, Brgy. Sta. Monica',
      kind: 'complaint',
      priority: 'priority',
      origin: 'Brgy. Sta. Monica resident report',
      divisionId: 'const',
      intendedId: 'const',
      stage: 'review',
      attachments: [],
      custody: [
        c(now - 3.6 * D, CAROL, 'created', 'Resident report endorsed by the barangay', { toDivisionId: 'const' }),
        c(now - 3.5 * D, CE, 'routed', 'Verify extent of erosion; check if DPWH jurisdiction applies', { fromDivisionId: 'admin', toDivisionId: 'const' }),
        c(now - 2.2 * D, 'Engr. Ramil Domingo', 'stage', 'Assessing whether slope protection is required', { stage: 'review' }),
      ],
      createdAt: now - 3.6 * D,
      updatedAt: now - 2.2 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0128',
      title: 'Rehabilitation — waiting shed, Plaza Rizal terminal',
      kind: 'work-order',
      priority: 'routine',
      origin: 'City Transport & Traffic Management Office',
      divisionId: 'psd',
      intendedId: 'psd',
      stage: 'completed',
      attachments: [],
      custody: [
        c(now - 12 * D, CAROL, 'created', 'Rehab request logged with damage photos on file', { toDivisionId: 'psd' }),
        c(now - 11.8 * D, CE, 'routed', 'For carpentry and painting crew', { fromDivisionId: 'admin', toDivisionId: 'psd' }),
        c(now - 9 * D, 'Engr. Liza Bartolome', 'stage', 'Materials procured; works started', { stage: 'progress' }),
        c(now - 5.5 * D, 'Engr. Liza Bartolome', 'stage', 'Roofing replaced, benches repaired, repainted', { stage: 'completed' }),
        c(now - 5.5 * D, 'Engr. Liza Bartolome', 'completed', 'Turned over to CTTMO representative', {}),
      ],
      createdAt: now - 12 * D,
      updatedAt: now - 5.5 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0142',
      title: 'Supplemental budget request — city road rehabilitation program',
      kind: 'memo',
      priority: 'urgent',
      origin: 'Planning Design and Programming Division',
      divisionId: 'desk-ce',
      intendedId: 'desk-ce',
      stage: 'verification',
      attachments: [],
      custody: [
        c(now - 1.1 * D, CAROL, 'created', 'Budget memo logged at the intake desk', { toDivisionId: 'plan' }),
        c(now - 1.05 * D, ACE, 'routed', 'For preparation of the program of works and cost estimates', { fromDivisionId: 'admin', toDivisionId: 'plan' }),
        c(now - 0.8 * D, 'Engr. Grace Panganiban', 'stage', 'Program of works being consolidated', { stage: 'review' }),
        c(now - 0.35 * D, 'Engr. Grace Panganiban', 'routed', 'POW complete; submitted for the City Engineer’s approval', { fromDivisionId: 'plan', toDivisionId: 'desk-ce' }),
        c(now - 0.12 * D, CE, 'stage', 'Under final review before signing', { stage: 'verification' }),
      ],
      createdAt: now - 1.1 * D,
      updatedAt: now - 0.12 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      dueAt: now + 2 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0143',
      title: 'Intersection improvement proposal — Rizal Ave. / Malvar St.',
      kind: 'memo',
      priority: 'routine',
      origin: 'Brgy. Poblacion residents & traffic study',
      divisionId: 'desk-ace',
      intendedId: 'plan',
      stage: 'review',
      attachments: [],
      custody: [
        c(now - 2.4 * D, CAROL, 'created', 'Proposal logged from barangay endorsement', { toDivisionId: 'plan' }),
        c(now - 2.3 * D, ACE, 'routed', 'For technical evaluation and concept design', { fromDivisionId: 'admin', toDivisionId: 'plan' }),
        c(now - 1.2 * D, 'Engr. Grace Panganiban', 'stage', 'Concept costing in progress', { stage: 'review' }),
        c(now - 0.5 * D, 'Engr. Grace Panganiban', 'routed', 'Endorsed to the Assistant City Engineer for programming concurrence', { fromDivisionId: 'plan', toDivisionId: 'desk-ace' }),
        c(now - 0.2 * D, ACE, 'stage', 'Reviewing alongside the traffic office study', { stage: 'review' }),
      ],
      createdAt: now - 2.4 * D,
      updatedAt: now - 0.2 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: true,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0144',
      title: 'Scheduled maintenance — CEO Flow server & office network backup',
      kind: 'memo',
      priority: 'routine',
      origin: 'I.T. Division (systems maintenance program)',
      divisionId: 'it',
      intendedId: 'it',
      stage: 'progress',
      attachments: [],
      custody: [
        c(now - 1.6 * D, CAROL, 'created', 'Maintenance window memo logged for all divisions', { toDivisionId: 'it' }),
        c(now - 1.5 * D, ACE, 'routed', 'For execution; advise all divisions of the downtime window', { fromDivisionId: 'admin', toDivisionId: 'it' }),
        c(now - 0.6 * D, 'Alphard S. Grande', 'stage', 'Database backup verified; patch staging in progress', { stage: 'progress' }),
      ],
      createdAt: now - 1.6 * D,
      updatedAt: now - 0.6 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0145',
      title: 'Memorandum Circular 2026-04 — year-end physical inventory of property & equipment',
      kind: 'memo',
      priority: 'priority',
      origin: 'Office of the City Engineer — Memorandum Circular',
      divisionId: 'desk-ce',
      intendedId: 'desk-ce',
      stage: 'progress',
      attachments: [],
      custody: [
        c(now - 1.1 * D, CAROL, 'created', 'Circular logged and addressed to all divisions and offices — acknowledgement required', {
          toDivisionId: 'desk-ce',
        }),
        c(now - 1.05 * D, CE, 'routed', 'For dissemination; every desk to submit inventory forms to Administrative Division', {
          fromDivisionId: 'desk-ce',
          toDivisionId: 'admin',
        }),
        c(now - 0.9 * D, 'Ms. Carol Estrella', 'received', 'Receipt acknowledged for Administrative Division', { toDivisionId: 'admin' }),
        c(now - 0.8 * D, 'Engr. Ramil Domingo', 'received', 'Receipt acknowledged for Construction Division', { toDivisionId: 'const' }),
        c(now - 0.75 * D, 'Engr. Nardo Salvador', 'received', 'Receipt acknowledged for Maintenance Division', { toDivisionId: 'maint' }),
        c(now - 0.6 * D, 'Engr. Liza Bartolome', 'received', 'Receipt acknowledged for Public Services Division', { toDivisionId: 'psd' }),
        c(now - 0.4 * D, 'Engr. Boyet Ramos', 'received', 'Receipt acknowledged for Motorpool Division', { toDivisionId: 'motorpool' }),
      ],
      createdAt: now - 1.1 * D,
      updatedAt: now - 0.4 * D,
      byId: 'u-admindiv',
      byName: CAROL,
      diverted: false,
      recipientIds: ALL_UNITS.map((u) => u.id),
      receivedBy: ['admin', 'const', 'maint', 'psd', 'motorpool'],
    },
  ];

  const notifs: Notif[] = [
    {
      id: uid(),
      at: now - 0.18 * D,
      text: 'CEO-2026-0136 submitted by Engr. Kara Villanueva — awaiting your verification (SURVEY)',
      kind: 'move',
      docId: papers[5].id,
      ref: 'CEO-2026-0136',
      scope: { type: 'supervisors' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 1.1 * D,
      text: 'CEO-2026-0141 assigned to you — emergency seawall erosion repair, Baywalk Ext.',
      kind: 'new',
      docId: papers[0].id,
      ref: 'CEO-2026-0141',
      scope: { type: 'division', divisionId: 'const' },
      targetUserId: 'u-pmanalo',
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.5 * D,
      text: 'CEO-2026-0139 assigned to you — Malvar St. declogging (urgent)',
      kind: 'new',
      docId: papers[2].id,
      ref: 'CEO-2026-0139',
      scope: { type: 'division', divisionId: 'maint' },
      targetUserId: 'u-daquino',
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.35 * D,
      text: 'Circulated memo CEO-2026-0145 is awaiting your desk’s receipt — 5 of 12 desks acknowledged',
      kind: 'new',
      docId: papers[17].id,
      ref: 'CEO-2026-0145',
      scope: { type: 'division', divisionId: 'survey' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.35 * D,
      text: 'Circulated memo CEO-2026-0145 is awaiting your desk’s receipt — 5 of 12 desks acknowledged',
      kind: 'new',
      docId: papers[17].id,
      ref: 'CEO-2026-0145',
      scope: { type: 'division', divisionId: 'elec' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.35 * D,
      text: 'Circulated memo CEO-2026-0145 is awaiting your desk’s receipt — 5 of 12 desks acknowledged',
      kind: 'new',
      docId: papers[17].id,
      ref: 'CEO-2026-0145',
      scope: { type: 'division', divisionId: 'mtqc' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.35 * D,
      text: 'Circulated memo CEO-2026-0145 is awaiting your desk’s receipt — 5 of 12 desks acknowledged',
      kind: 'new',
      docId: papers[17].id,
      ref: 'CEO-2026-0145',
      scope: { type: 'division', divisionId: 'it' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.3 * D,
      text: 'CEO-2026-0144 assigned to your division — CEO Flow server maintenance window',
      kind: 'new',
      docId: papers[16].id,
      ref: 'CEO-2026-0144',
      scope: { type: 'division', divisionId: 'it' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.35 * D,
      text: 'CEO-2026-0142 reached the City Engineer’s desk — supplemental budget awaiting approval',
      kind: 'move',
      docId: papers[14].id,
      ref: 'CEO-2026-0142',
      scope: { type: 'supervisors' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.4 * D,
      text: 'Account request — Marcus Ilagan (MTQC) is awaiting administrator verification',
      kind: 'account',
      scope: { type: 'supervisors' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 0.1 * D,
      text: 'CEO-2026-0130 received — annual equipment audit assigned to your division',
      kind: 'new',
      docId: papers[11].id,
      ref: 'CEO-2026-0130',
      scope: { type: 'division', divisionId: 'motorpool' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 1.05 * D,
      text: 'URGENT complaint CEO-2026-0139 — Malvar St. flooding assigned to your division',
      kind: 'new',
      docId: papers[2].id,
      ref: 'CEO-2026-0139',
      scope: { type: 'division', divisionId: 'maint' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 1.2 * D,
      text: 'CEO-2026-0141 moved to In Progress by Construction Division',
      kind: 'move',
      docId: papers[0].id,
      ref: 'CEO-2026-0141',
      scope: { type: 'supervisors' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 2.1 * D,
      text: 'URGENT work order CEO-2026-0141 — Baywalk seawall erosion assigned to your division',
      kind: 'new',
      docId: papers[0].id,
      ref: 'CEO-2026-0141',
      scope: { type: 'division', divisionId: 'const' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 2.3 * D,
      text: 'CEO-2026-0133 forwarded to your division by Maintenance (sidewalk clearing, San Manuel)',
      kind: 'route',
      docId: papers[8].id,
      ref: 'CEO-2026-0133',
      scope: { type: 'division', divisionId: 'psd' },
      readBy: ['u-psd'],
    },
    {
      id: uid(),
      at: now - 3.2 * D,
      text: 'CEO-2026-0134 completed — Iwahig pumping station preventive maintenance',
      kind: 'complete',
      docId: papers[7].id,
      ref: 'CEO-2026-0134',
      scope: { type: 'supervisors' },
      readBy: ['u-sup1'],
    },
  ];

  const logs = deriveLogs(papers);
  return { v: 8, session: null, papers, notifs, logs, users: INITIAL_USERS.map((u) => ({ ...u })), seq: 146 };
}

const LOG_MAP: Record<CustodyAction, LogType | null> = {
  created: 'create',
  received: 'create',
  stage: 'stage',
  routed: 'route',
  note: 'note',
  attachment: 'attachment',
  completed: 'stage',
};

/** Rebuilds the system log (per-user history) from the custody trails, plus sign-in events. */
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
      logs.push({
        id: `log-${e.id}`,
        at: e.at,
        userId: u.id,
        userName: u.name,
        type,
        text: e.text,
        ref: p.ref,
        docId: p.id,
      });
    }
  }

  for (const [userId, at] of firstSeen) {
    const u = INITIAL_USERS.find((x) => x.id === userId);
    if (!u) continue;
    logs.push({
      id: uid(),
      at: at - 22 * 60 * 1000,
      userId,
      userName: u.name,
      type: 'login',
      text: 'Signed in to CEO Flow (session start)',
    });
  }

  const extra: [string, number][] = [
    ['u-admindiv', Date.now() - 4.4 * D],
    ['u-sup1', Date.now() - 3.4 * D],
    ['u-sup2', Date.now() - 3.3 * D],
    ['u-pend1', Date.now() - 0.4 * D],
  ];
  for (const [userId, at] of extra) {
    const u = INITIAL_USERS.find((x) => x.id === userId);
    if (!u) continue;
    logs.push({
      id: uid(),
      at,
      userId,
      userName: u.name,
      type: userId === 'u-pend1' ? 'signup' : 'login',
      text:
        userId === 'u-pend1'
          ? 'Submitted an account request (MTQC) — pending administrator verification'
          : 'Signed in to CEO Flow (session start)',
    });
  }

  return logs.sort((a, b) => b.at - a.at);
}

export function deriveActivities(papers: Paper[]): Activity[] {
  const list: Activity[] = [];
  for (const p of papers) {
    for (const e of p.custody) {
      const t =
        e.action === 'created' || e.action === 'received'
          ? 'create'
          : e.action === 'stage' && e.stage === 'completed'
            ? 'complete'
            : e.action === 'stage'
              ? 'move'
              : e.action === 'routed'
                ? 'route'
                : e.action === 'note'
                  ? 'note'
                  : e.action === 'attachment'
                    ? 'attach'
                    : null;
      if (!t) continue;
      list.push({
        id: e.id,
        at: e.at,
        byName: e.byName,
        type: t,
        text: e.text,
        docId: p.id,
        ref: p.ref,
      });
    }
  }
  return list.sort((a, b) => b.at - a.at);
}
