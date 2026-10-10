import type {
  PermitNotification,
  PermitRecord,
  PermitStatus,
  RenewalDraft,
} from './lifecycle-types';
import type { Activity, Project } from './types';

const STATUSES: PermitStatus[] = [
  'preparing',
  'ready_for_review',
  'submitted_manually',
  'issued',
  'closed',
];
const KNOWN_KEYS = [
  'status',
  'reference',
  'issuedOn',
  'expiresOn',
  'expirySource',
  'reminderDays',
  'remindersEnabled',
  'renewal',
] as const;

const DEFAULT_REMINDERS = [30, 7];

function stamp(when: Date): string {
  return new Date(when).toISOString();
}

function log(_project: Project, message: string, when: Date): Activity {
  return { id: crypto.randomUUID(), at: stamp(when), message };
}

/** Strict ISO YYYY-MM-DD check against the real proleptic Gregorian calendar. */
export function isValidCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1 || mo < 1 || mo > 12 || d < 1) return false;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= dim;
}

function dateField(name: 'issuedOn' | 'expiresOn', value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !isValidCalendarDate(value)) {
    throw new Error(
      `${name} must be a real Gregorian date in ISO YYYY-MM-DD format or null (got ${JSON.stringify(value) ?? 'missing'}).`,
    );
  }
  return value;
}

/** UTC-midnight epoch millis for a validated YYYY-MM-DD string. */
function dayStartUtc(value: string): number {
  const [y, mo, d] = value.split('-').map(Number);
  return Date.UTC(y, mo - 1, d);
}

/** Whole calendar days from `now` to `value`, measured on UTC dates only. */
function daysUntil(value: string, now: Date): number {
  const t = new Date(now);
  return Math.round(
    (dayStartUtc(value) - Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())) / 86400000,
  );
}

function copyRecord(record: PermitRecord): PermitRecord {
  return {
    ...record,
    reminderDays: [...record.reminderDays],
    renewal: record.renewal ? { ...record.renewal } : null,
  };
}

export function getPermitRecord(project: Project): PermitRecord {
  if (!project.permit) {
    return {
      status: 'preparing',
      reference: '',
      issuedOn: null,
      expiresOn: null,
      expirySource: '',
      reminderDays: [...DEFAULT_REMINDERS],
      remindersEnabled: true,
      renewal: null,
    };
  }
  return copyRecord(project.permit);
}

function validatePatch(patch: Partial<PermitRecord>): void {
  for (const key of Object.keys(patch)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unknown permit field "${key}".`);
    }
  }
  if (patch.status !== undefined && !STATUSES.includes(patch.status)) {
    throw new Error(`status must be one of: ${STATUSES.join(', ')}.`);
  }
  if (patch.reference !== undefined && (typeof patch.reference !== 'string' || patch.reference.length > 120)) {
    throw new Error('reference must be a string of at most 120 characters.');
  }
  if (patch.expirySource !== undefined && (typeof patch.expirySource !== 'string' || patch.expirySource.length > 1000)) {
    throw new Error('expirySource must be a string of at most 1000 characters.');
  }
  if (patch.reminderDays !== undefined) {
    const days = patch.reminderDays;
    if (!Array.isArray(days)) throw new Error('reminderDays must be an array of whole numbers.');
    if (days.length > 6) throw new Error('reminderDays supports at most 6 reminder thresholds.');
    for (const d of days) {
      if (typeof d !== 'number' || !Number.isFinite(d) || !Number.isInteger(d)) {
        throw new Error('reminderDays must contain only finite whole numbers.');
      }
      if (d < 1 || d > 365) throw new Error('reminderDays values must each be in the range 1 to 365.');
    }
    if (new Set(days).size !== days.length) throw new Error('reminderDays values must be unique.');
  }
  if (patch.remindersEnabled !== undefined && typeof patch.remindersEnabled !== 'boolean') {
    throw new Error('remindersEnabled must be a boolean.');
  }
  if (patch.renewal !== undefined) {
    throw new Error('Use prepareRenewal/approveRenewalDraft to manage the renewal draft; it cannot be patched directly.');
  }
}

export function updatePermitRecord(project: Project, patch: Partial<PermitRecord>): Project {
  validatePatch(patch);
  const current = getPermitRecord(project);
  const next: PermitRecord = {
    ...current,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.reference !== undefined ? { reference: patch.reference } : {}),
    ...(patch.issuedOn !== undefined ? { issuedOn: dateField('issuedOn', patch.issuedOn) } : {}),
    ...(patch.expiresOn !== undefined ? { expiresOn: dateField('expiresOn', patch.expiresOn) } : {}),
    ...(patch.expirySource !== undefined ? { expirySource: patch.expirySource } : {}),
    ...(patch.reminderDays !== undefined ? { reminderDays: [...(patch.reminderDays as number[])] } : {}),
    ...(patch.remindersEnabled !== undefined ? { remindersEnabled: patch.remindersEnabled } : {}),
  };
  // Explicit user-recorded dates only: never invent a municipal default expiry here.
  if (next.issuedOn && next.expiresOn && next.issuedOn > next.expiresOn) {
    throw new Error(`issuedOn (${next.issuedOn}) must be on or before expiresOn (${next.expiresOn}).`);
  }
  const changed = KNOWN_KEYS.filter((k) => k !== 'renewal' && patch[k] !== undefined);
  const at = new Date().toISOString();
  return {
    ...project,
    permit: copyRecord(next),
    activity: [...project.activity, { id: crypto.randomUUID(), at, message: `Permit record updated (${changed.join(', ') || 'no changes'}).` }],
    updatedAt: at,
  };
}

const plural = (n: number) => `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'}`;

export function getPermitNotifications(projects: Project[], now: Date = new Date()): PermitNotification[] {
  const out: PermitNotification[] = [];
  for (const project of projects) {
    const record = getPermitRecord(project);
    if (record.status === 'closed') continue; // Closed projects are excluded from reminders.
    const ref = record.reference ? ` (${record.reference})` : '';
    if (record.renewal && record.renewal.status === 'needs_review') {
      out.push({
        id: `${project.id}:renewal_review`,
        projectId: project.id,
        projectName: project.name,
        kind: 'renewal_review',
        title: `Renewal draft needs review: ${project.name}`,
        description:
          `A renewal preparation draft created on ${record.renewal.createdAt.slice(0, 10)} is waiting for your review. ` +
          `Approval only prepares a manual handoff; it confirms no renewal rules and submits nothing.`,
        daysRemaining: null,
      });
    }
    if (record.status !== 'issued') continue;
    if (record.expiresOn === null) {
      if (!record.remindersEnabled) continue;
      out.push({
        id: `${project.id}:expiry_unknown`,
        projectId: project.id,
        projectName: project.name,
        kind: 'expiry_unknown',
        title: `Permit expiry unknown: ${project.name}`,
        description:
          `No expiry date is recorded for issued permit${ref}. Record the expiry date manually; no expiry is assumed.`,
        daysRemaining: null,
      });
      continue;
    }
    const days = daysUntil(record.expiresOn, now);
    if (days < 0) {
      // Factual state, not a reminder: always surfaced so expiry is never silently hidden.
      out.push({
        id: `${project.id}:expired`,
        projectId: project.id,
        projectName: project.name,
        kind: 'expired',
        title: `Permit expired: ${project.name}`,
        description:
          `Permit${ref} expired on ${record.expiresOn} (${plural(days)} ago). ` +
          `Record any renewal steps manually; this app does not submit renewals.`,
        daysRemaining: days,
      });
      continue;
    }
    const window = Math.max(...record.reminderDays, 0);
    if (record.remindersEnabled && record.reminderDays.length > 0 && days <= window) {
      out.push({
        id: `${project.id}:expires_soon`,
        projectId: project.id,
        projectName: project.name,
        kind: 'expires_soon',
        title: `Permit expiring soon: ${project.name}`,
        description:
          `Permit${ref} expires on ${record.expiresOn} (${plural(days)} remaining). ` +
          `This is an in-app reminder only; import the calendar file for alerts.`,
        daysRemaining: days,
      });
    }
  }
  return out;
}

const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

/** Fold one logical line to physical lines of at most 75 UTF-8 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) {
      parts.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.join('\r\n');
}

const compactDate = (iso: string): string => iso.replace(/-/g, '');

function nextDay(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d + 1));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

export function buildReminderCalendar(project: Project, now: Date = new Date()): string {
  const record = getPermitRecord(project);
  if (record.expiresOn === null || !isValidCalendarDate(record.expiresOn)) {
    throw new Error(
      `No valid permit expiry date is recorded for project "${project.name}". ` +
        `Record the expiry date manually before exporting calendar reminders.`,
    );
  }
  const ref = record.reference ? ` (${record.reference})` : '';
  // Structured lines (property names/params) must be emitted verbatim; only TEXT values are escaped.
  const raw: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PermitPath//Permit Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@permitpath.local`,
    `DTSTAMP:${stamp(now).replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;VALUE=DATE:${compactDate(record.expiresOn)}`,
    `DTEND;VALUE=DATE:${compactDate(nextDay(record.expiresOn))}`,
  ];
  const prop = (name: string, value: string): string => `${name}:${esc(value)}`;
  raw.push(prop('SUMMARY', `Permit expiry: ${project.name}${ref}`));
  raw.push(
    prop(
      'DESCRIPTION',
      `Recorded expiry source: ${record.expirySource || 'Not recorded. Confirm the date with the issuing office.'} ` +
        'Manual review required: verify this date against the official permit before relying on it. ' +
        'Calendar reminders appear only after you import this file; this app sends no background email or push alerts.',
    ),
  );
  if (record.remindersEnabled) {
    for (const days of [...record.reminderDays].sort((a, b) => b - a)) {
      raw.push('BEGIN:VALARM', `TRIGGER:-P${days}D`, 'ACTION:DISPLAY');
      raw.push(prop('DESCRIPTION', `Permit expires in ${plural(days)}: ${project.name}${ref}`));
      raw.push('END:VALARM');
    }
  }
  raw.push('END:VEVENT', 'END:VCALENDAR');
  return raw.map(fold).join('\r\n') + '\r\n';
}

export function prepareRenewal(project: Project, now: Date = new Date()): Project {
  const record = getPermitRecord(project);
  if (record.status !== 'issued') {
    throw new Error('Renewal preparation requires an issued permit. Record the issued permit first.');
  }
  if (!record.reference.trim()) {
    throw new Error('Record the permit reference before preparing a renewal; human input is needed.');
  }
  if (record.expiresOn === null) {
    throw new Error('Record the permit expiry date before preparing a renewal; human input is needed.');
  }
  if (record.renewal) {
    throw new Error('A renewal draft already exists for this permit. Review or resolve it before preparing another.');
  }
  const at = stamp(now);
  const draft: RenewalDraft = {
    createdAt: at,
    approvedAt: null,
    status: 'needs_review',
    eligibility: 'unverified',
    note:
      `Renewal draft prepared for permit ${record.reference} (expires ${record.expiresOn}). ` +
      `Original permit dates, reference and documents are unchanged. ` +
      `Eligibility is unverified: explicit human review is required before any manual handoff.`,
  };
  return {
    ...project,
    permit: { ...copyRecord(record), renewal: draft },
    activity: [
      ...project.activity,
      log(project, `Renewal draft prepared for permit ${record.reference}. Eligibility unverified; explicit human review required.`, now),
    ],
    updatedAt: at,
  };
}

export function approveRenewalDraft(project: Project, approved: boolean, now: Date = new Date()): Project {
  const record = getPermitRecord(project);
  if (!record.renewal) {
    throw new Error('No renewal draft exists for this permit. Prepare one before approving.');
  }
  if (record.renewal.status === 'approved_for_manual_handoff') {
    throw new Error('This renewal draft is already approved for manual handoff.');
  }
  const at = stamp(now);
  if (!approved) {
    return {
      ...project,
      permit: copyRecord(record),
      activity: [...project.activity, log(project, 'Renewal draft sent back for changes; still needs review.', now)],
      updatedAt: at,
    };
  }
  // Defensible minimum for approval: the permit the draft refers to must still be identifiable and dated.
  if (!record.reference.trim() || !record.issuedOn || record.expiresOn === null) {
    throw new Error(
      'Cannot approve: the permit reference, issue date and expiry date must all be recorded before approving. ' +
        'This approval only prepares a manual handoff; it confirms no eligibility and performs no official submission.',
    );
  }
  return {
    ...project,
    permit: {
      ...copyRecord(record),
      renewal: { ...record.renewal, status: 'approved_for_manual_handoff', approvedAt: at },
    },
    activity: [
      ...project.activity,
      log(
        project,
        'Renewal draft approved for manual handoff. This is approval to prepare an export only; no eligibility is confirmed and nothing was submitted.',
        now,
      ),
    ],
    updatedAt: at,
  };
}
