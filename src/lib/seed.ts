import type { Activity, Attachment, Custody, CustodyAction, DB, LogType, Notif, Paper, SysLog } from './types';
import { USERS } from './types';
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
const SUP1 = 'Engr. Ana Villanueva';
const SUP2 = 'Engr. Cesar Tiongson';

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
        c(now - 2.2 * D, CAROL, 'created', 'Logged at Records desk — endorsed by CDRRMO after high-tide inspection', { toDivisionId: 'const' }),
        c(now - 2.1 * D, SUP1, 'routed', 'Emergency work order released to Construction & Projects — mobilize within 24h', { fromDivisionId: 'admin', toDivisionId: 'const' }),
        c(now - 1.9 * D, 'Engr. Ramil Domingo', 'attachment', 'Attached site photos with GPS tags (Baywalk section 4)', {}),
        c(now - 1.2 * D, 'Engr. Ramil Domingo', 'stage', 'Site team deployed; gabion shoring underway', { stage: 'progress' }),
      ],
      createdAt: now - 2.2 * D,
      updatedAt: now - 1.2 * D,
      byId: 'u-admin',
      byName: CAROL,
      dueAt: now + 1.2 * D,
      remarks: 'CDRRMO flag: erosion undermining promenade footing near marker B-17.',
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0140',
      title: 'Building permit — 3-storey commercial building, Rizal Avenue',
      kind: 'permit',
      priority: 'priority',
      origin: 'Halili Commercial Ventures (applicant)',
      divisionId: 'permits',
      intendedId: 'permits',
      stage: 'review',
      attachments: [img('facade-survey-rizal-ave.jpg', IMG.building, 'Engr. Victor Halali', now - 0.7 * D, 9.7413, 118.7371)],
      custody: [
        c(now - 1.6 * D, CAROL, 'created', 'Permit application received with 3 sets of plans', { toDivisionId: 'permits' }),
        c(now - 1.5 * D, SUP2, 'routed', 'For technical evaluation — verify structural plans vs. NBC provisions', { fromDivisionId: 'admin', toDivisionId: 'permits' }),
        c(now - 0.8 * D, 'Engr. Victor Halali', 'stage', 'Plans under review; checking setbacks and lot occupancy', { stage: 'review' }),
        c(now - 0.7 * D, 'Engr. Victor Halali', 'attachment', 'Attached geotagged facade survey photo', {}),
      ],
      createdAt: now - 1.6 * D,
      updatedAt: now - 0.7 * D,
      byId: 'u-admin',
      byName: CAROL,
      dueAt: now + 4 * D,
      remarks: 'Applicant requests expedited evaluation; occupancy target June.',
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0139',
      title: 'Clogged drainage & minor flooding — Malvar St. cor. Burgos St.',
      kind: 'complaint',
      priority: 'urgent',
      origin: 'Brgy. Bancao-Bancao resident (R. Maturan)',
      divisionId: 'drain',
      intendedId: 'drain',
      stage: 'progress',
      attachments: [img('malvar-flooding-report.jpg', IMG.drain, 'Engr. Boyet Ramos', now - 0.9 * D, 9.7521, 118.7352)],
      custody: [
        c(now - 1.1 * D, CAROL, 'created', 'Complaint endorsed by City Administrator’s Office', { toDivisionId: 'drain' }),
        c(now - 1.05 * D, SUP1, 'routed', 'Urgent — flooding reported at Malvar–Burgos intersection; dispatch declogging team', { fromDivisionId: 'admin', toDivisionId: 'drain' }),
        c(now - 0.9 * D, 'Engr. Boyet Ramos', 'attachment', 'Attached geotagged photo of overflow point', {}),
        c(now - 0.6 * D, 'Engr. Boyet Ramos', 'stage', 'Vactor truck dispatched; declogging underway', { stage: 'progress' }),
      ],
      createdAt: now - 1.1 * D,
      updatedAt: now - 0.6 * D,
      byId: 'u-admin',
      byName: CAROL,
      dueAt: now + 0.5 * D,
      remarks: 'Resident reports knee-deep water at the intersection after 30-min rain.',
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0138',
      title: 'Barangay road concreting Phase 2 — Brgy. San Pedro (240 lm)',
      kind: 'work-order',
      priority: 'priority',
      origin: 'Office of the City Mayor (2026 infrastructure program)',
      divisionId: 'roads',
      intendedId: 'roads',
      stage: 'progress',
      attachments: [img('san-pedro-pouring.jpg', IMG.road, 'Engr. Liza Bartolome', now - 1.9 * D, 9.7683, 118.7621)],
      custody: [
        c(now - 3.1 * D, CAROL, 'created', 'Work order received from Mayor’s Office', { toDivisionId: 'roads' }),
        c(now - 3.0 * D, SUP1, 'routed', 'Phase 2 concreting, 240 lm — coordinate with barangay for closure schedule', { fromDivisionId: 'admin', toDivisionId: 'roads' }),
        c(now - 2.0 * D, 'Engr. Liza Bartolome', 'stage', 'Base course finished; pouring scheduled this week', { stage: 'progress' }),
        c(now - 1.9 * D, 'Engr. Liza Bartolome', 'attachment', 'Attached progress photos (geotagged)', {}),
      ],
      createdAt: now - 3.1 * D,
      updatedAt: now - 1.9 * D,
      byId: 'u-admin',
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
      stage: 'received',
      attachments: [
        pdf(
          'Liwanag-Ave-lighting-inventory.pdf',
          'STREET LIGHTING INVENTORY — LIWANAG AVE',
          [
            'Unit 01-14: 100W LED, pole condition fair',
            'Units 03, 07, 11: no output — suspected ballast failure',
            'Unit 09: pole leaning ~4 deg after vehicle impact',
            'Requested action: repair and realign within maintenance run',
          ],
          CAROL,
          now - 0.3 * D
        ),
      ],
      custody: [
        c(now - 0.3 * D, CAROL, 'created', 'Received with lighting inventory attached', { toDivisionId: 'elec' }),
        c(now - 0.25 * D, SUP1, 'routed', 'For inclusion in the next maintenance run', { fromDivisionId: 'admin', toDivisionId: 'elec' }),
      ],
      createdAt: now - 0.3 * D,
      updatedAt: now - 0.25 * D,
      byId: 'u-admin',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0136',
      title: 'Structural inspection — City Market arcade roof trusses',
      kind: 'inspection',
      priority: 'priority',
      origin: 'City Market Administration',
      divisionId: 'insp',
      intendedId: 'insp',
      stage: 'verification',
      attachments: [],
      custody: [
        c(now - 4.2 * D, CAROL, 'created', 'Endorsed by City Market Administrator — corrosion reported on truss line C', { toDivisionId: 'insp' }),
        c(now - 4.1 * D, SUP2, 'routed', 'Structural integrity check of arcade roof trusses', { fromDivisionId: 'admin', toDivisionId: 'insp' }),
        c(now - 3.0 * D, 'Engr. Mona Abad', 'stage', 'Inspection team scheduled; access coordinated with market admin', { stage: 'progress' }),
        c(now - 0.5 * D, 'Engr. Mona Abad', 'stage', 'Field inspection done; computing load ratings', { stage: 'verification' }),
      ],
      createdAt: now - 4.2 * D,
      updatedAt: now - 0.5 * D,
      byId: 'u-admin',
      byName: CAROL,
      dueAt: now + 2 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0135',
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
        c(now - 2.5 * D, SUP2, 'routed', 'Prepare detailed design and program of works', { fromDivisionId: 'admin', toDivisionId: 'plan' }),
        c(now - 1.4 * D, 'Engr. Grace Panganiban', 'stage', 'Hydrology data gathering underway', { stage: 'review' }),
      ],
      createdAt: now - 2.6 * D,
      updatedAt: now - 1.4 * D,
      byId: 'u-admin',
      byName: CAROL,
      dueAt: now + 12 * D,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0134',
      title: 'Preventive maintenance — Iwahig flood control pumping station',
      kind: 'work-order',
      priority: 'routine',
      origin: 'Office of the City Engineer (scheduled PM)',
      divisionId: 'drain',
      intendedId: 'drain',
      stage: 'completed',
      attachments: [],
      custody: [
        c(now - 9 * D, CAROL, 'created', 'Scheduled PM work order issued', { toDivisionId: 'drain' }),
        c(now - 8.8 * D, SUP1, 'routed', 'Both pump units due for quarterly service', { fromDivisionId: 'admin', toDivisionId: 'drain' }),
        c(now - 7 * D, 'Engr. Boyet Ramos', 'stage', 'Parts received; service started', { stage: 'progress' }),
        c(now - 3.2 * D, 'Engr. Boyet Ramos', 'stage', 'Both pumps serviced and tested at full load', { stage: 'completed' }),
        c(now - 3.2 * D, 'Engr. Boyet Ramos', 'completed', 'Job closed — PM checklist filed to Records', {}),
      ],
      createdAt: now - 9 * D,
      updatedAt: now - 3.2 * D,
      byId: 'u-admin',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0133',
      title: 'Sidewalk clearing & repair — National Highway, San Manuel stretch',
      kind: 'work-order',
      priority: 'routine',
      origin: 'City Administrator’s Office',
      divisionId: 'roads',
      intendedId: 'maint',
      stage: 'progress',
      attachments: [],
      custody: [
        c(now - 5 * D, CAROL, 'created', 'Clearing order logged after inter-agency meeting', { toDivisionId: 'maint' }),
        c(now - 4.9 * D, SUP1, 'routed', 'For sidewalk repair crew scheduling', { fromDivisionId: 'admin', toDivisionId: 'maint' }),
        c(now - 2.3 * D, 'Engr. Nardo Salvador', 'routed', 'Endorsed to Roads & Bridges — concurrent with their shoulder works on the same stretch', { fromDivisionId: 'maint', toDivisionId: 'roads' }),
        c(now - 1.7 * D, 'Engr. Liza Bartolome', 'stage', 'Crew assigned; clearing starts Monday', { stage: 'progress' }),
      ],
      createdAt: now - 5 * D,
      updatedAt: now - 1.7 * D,
      byId: 'u-admin',
      byName: CAROL,
      diverted: true,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0132',
      title: 'Occupancy inspection — pension house, Malvar St.',
      kind: 'inspection',
      priority: 'priority',
      origin: 'BPLO application #2026-0311',
      divisionId: 'insp',
      intendedId: 'permits',
      stage: 'verification',
      attachments: [],
      custody: [
        c(now - 2.8 * D, CAROL, 'created', 'Occupancy application logged', { toDivisionId: 'permits' }),
        c(now - 2.7 * D, SUP2, 'routed', 'For occupancy evaluation', { fromDivisionId: 'admin', toDivisionId: 'permits' }),
        c(now - 1.5 * D, 'Engr. Victor Halali', 'routed', 'Requires structural and fire-safety inspection before occupancy release', { fromDivisionId: 'permits', toDivisionId: 'insp' }),
        c(now - 0.9 * D, 'Engr. Mona Abad', 'stage', 'Inspection scheduled with building owner', { stage: 'verification' }),
      ],
      createdAt: now - 2.8 * D,
      updatedAt: now - 0.9 * D,
      byId: 'u-admin',
      byName: CAROL,
      dueAt: now + 3 * D,
      diverted: true,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0131',
      title: 'Rehabilitation — waiting shed, Plaza Rizal terminal',
      kind: 'work-order',
      priority: 'routine',
      origin: 'City Transport & Traffic Management Office',
      divisionId: 'const',
      intendedId: 'const',
      stage: 'completed',
      attachments: [],
      custody: [
        c(now - 12 * D, CAROL, 'created', 'Rehab request logged with damage photos on file', { toDivisionId: 'const' }),
        c(now - 11.8 * D, SUP1, 'routed', 'For carpentry and painting crew', { fromDivisionId: 'admin', toDivisionId: 'const' }),
        c(now - 9 * D, 'Engr. Ramil Domingo', 'stage', 'Materials procured; works started', { stage: 'progress' }),
        c(now - 5.5 * D, 'Engr. Ramil Domingo', 'stage', 'Roofing replaced, benches repaired, repainted', { stage: 'completed' }),
        c(now - 5.5 * D, 'Engr. Ramil Domingo', 'completed', 'Turned over to CTTMO representative', {}),
      ],
      createdAt: now - 12 * D,
      updatedAt: now - 5.5 * D,
      byId: 'u-admin',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0130',
      title: 'Annual inspection — batching plant & asphalt equipment',
      kind: 'inspection',
      priority: 'priority',
      origin: 'Office of the City Engineer (equipment audit)',
      divisionId: 'elec',
      intendedId: 'elec',
      stage: 'received',
      attachments: [
        pdf(
          'equipment-audit-checklist.pdf',
          'ANNUAL EQUIPMENT AUDIT — CHECKLIST',
          [
            'Batching plant: motors, conveyor, silo discharge',
            'Asphalt kettle units 1-2: burner and thermostat',
            'Rollers R-03 / R-05: vibration system',
            'Findings to be encoded in the equipment registry',
          ],
          SUP2,
          now - 0.15 * D
        ),
      ],
      custody: [
        c(now - 0.15 * D, CAROL, 'created', 'Annual equipment inspection request logged', { toDivisionId: 'elec' }),
        c(now - 0.1 * D, SUP2, 'routed', 'Schedule within the week; submit findings to Technical Services', { fromDivisionId: 'admin', toDivisionId: 'elec' }),
      ],
      createdAt: now - 0.15 * D,
      updatedAt: now - 0.1 * D,
      byId: 'u-admin',
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
      divisionId: 'roads',
      intendedId: 'roads',
      stage: 'review',
      attachments: [],
      custody: [
        c(now - 3.6 * D, CAROL, 'created', 'Resident report endorsed by the barangay', { toDivisionId: 'roads' }),
        c(now - 3.5 * D, SUP1, 'routed', 'Verify extent of erosion; check if DPWH jurisdiction applies', { fromDivisionId: 'admin', toDivisionId: 'roads' }),
        c(now - 2.2 * D, 'Engr. Liza Bartolome', 'stage', 'Assessing whether slope protection is required', { stage: 'review' }),
      ],
      createdAt: now - 3.6 * D,
      updatedAt: now - 2.2 * D,
      byId: 'u-admin',
      byName: CAROL,
      diverted: false,
    },
    {
      id: uid(),
      ref: 'CEO-2026-0128',
      title: 'Digitization of 2025 as-built drawings — records program',
      kind: 'memo',
      priority: 'routine',
      origin: 'Records & Administration Division',
      divisionId: 'admin',
      intendedId: 'admin',
      stage: 'progress',
      attachments: [],
      custody: [
        c(now - 6 * D, CAROL, 'created', 'Records program memo issued for 2025 as-built files', { toDivisionId: 'admin' }),
        c(now - 5 * D, CAROL, 'stage', 'Scanning started — batches 1–3 of 14', { stage: 'progress' }),
      ],
      createdAt: now - 6 * D,
      updatedAt: now - 5 * D,
      byId: 'u-admin',
      byName: CAROL,
      diverted: false,
    },
  ];

  const notifs: Notif[] = [
    {
      id: uid(),
      at: now - 0.1 * D,
      text: 'CEO-2026-0130 received — annual batching plant inspection assigned to your division',
      kind: 'new',
      docId: papers[11].id,
      ref: 'CEO-2026-0130',
      scope: { type: 'division', divisionId: 'elec' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 1.05 * D,
      text: 'URGENT complaint CEO-2026-0139 — Malvar St. flooding assigned to your division',
      kind: 'new',
      docId: papers[2].id,
      ref: 'CEO-2026-0139',
      scope: { type: 'division', divisionId: 'drain' },
      readBy: [],
    },
    {
      id: uid(),
      at: now - 1.2 * D,
      text: 'CEO-2026-0141 moved to In Progress by Construction & Projects',
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
      scope: { type: 'division', divisionId: 'roads' },
      readBy: ['u-roads'],
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
  return { v: 1, session: null, papers, notifs, logs, seq: 142 };
}

const ACTIVITY_MAP: Record<CustodyAction, Activity['type'] | null> = {
  created: 'create',
  received: 'create',
  stage: 'move',
  routed: 'route',
  note: 'note',
  attachment: 'attach',
  completed: 'complete',
};

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
  const byName = new Map(USERS.map((u) => [u.name, u]));
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

  // sign-in events — shortly before each officer's first recorded action
  for (const [userId, at] of firstSeen) {
    const u = byName.get(USERS.find((x) => x.id === userId)?.name ?? '');
    logs.push({
      id: uid(),
      at: at - 22 * 60 * 1000,
      userId,
      userName: u?.name ?? 'Officer',
      type: 'login',
      text: 'Signed in to CEO Flow (session start)',
    });
  }

  // a couple of historical sign-ins for the records desk and supervisors
  const extra: [string, number][] = [
    ['u-admin', Date.now() - 4.4 * 24 * 36e5],
    ['u-sup1', Date.now() - 3.4 * 24 * 36e5],
    ['u-sup2', Date.now() - 3.3 * 24 * 36e5],
  ];
  for (const [userId, at] of extra) {
    const u = USERS.find((x) => x.id === userId);
    if (!u) continue;
    logs.push({ id: uid(), at, userId, userName: u.name, type: 'login', text: 'Signed in to CEO Flow (session start)' });
  }

  return logs.sort((a, b) => b.at - a.at);
}

export function deriveActivities(papers: Paper[]): Activity[] {
  const list: Activity[] = [];
  for (const p of papers) {
    for (const e of p.custody) {
      const type = ACTIVITY_MAP[e.action];
      if (!type) continue;
      const t =
        type === 'move' && e.stage === 'completed'
          ? 'complete'
          : type === 'move'
            ? 'move'
            : type;
      list.push({
        id: e.id,
        at: e.at,
        byName: e.byName,
        type: t,
        text: `${e.text}`,
        docId: p.id,
        ref: p.ref,
      });
    }
  }
  return list.sort((a, b) => b.at - a.at);
}
