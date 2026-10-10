import { describe, expect, test } from 'bun:test';
import { createProject } from '../../frontend/src/domain/seed';
import type { Project } from '../../frontend/src/domain/types';
import {
  approveRenewalDraft,
  buildReminderCalendar,
  getPermitNotifications,
  getPermitRecord,
  prepareRenewal,
  updatePermitRecord,
} from '../../frontend/src/domain/lifecycle';

const OCT10 = new Date('2026-10-10T12:00:00Z');

function baseProject(name = 'Harbour Bakery fit-up'): Project {
  return createProject({
    name,
    contractor: 'North Wall Co',
    client: 'Harbour Bakery',
    details: {
      address: '9 Dock Street, Halifax, NS',
      description: 'Interior fit-up',
      proposedArea: 120,
      storeys: 1,
      externalWalls: false,
      onHrmRoad: false,
      rightOfWayWork: false,
      heritageProperty: false,
      energyDocument: null,
    },
  });
}

function issuedProject(expiresOn: string | null = '2026-11-09', name?: string): Project {
  return updatePermitRecord(baseProject(name), {
    status: 'issued',
    reference: 'HRM-2026-0042',
    issuedOn: '2026-06-01',
    ...(expiresOn === null ? {} : { expiresOn }),
    expirySource: 'Recorded from municipal letter dated 2026-06-01.',
  });
}

describe('getPermitRecord defaults', () => {
  test('returns a preparing record with reminders on and no dates', () => {
    expect(getPermitRecord(baseProject())).toEqual({
      status: 'preparing',
      reference: '',
      issuedOn: null,
      expiresOn: null,
      expirySource: '',
      reminderDays: [30, 7],
      remindersEnabled: true,
      renewal: null,
    });
  });
  test('does not mutate the project and returns fresh copies', () => {
    const p = baseProject();
    const before = JSON.stringify(p);
    const a = getPermitRecord(p);
    a.reference = 'MUT';
    a.reminderDays.push(1);
    expect(JSON.stringify(p)).toBe(before);
    expect(p.permit).toBeUndefined();
    expect(getPermitRecord(p).reminderDays).toEqual([30, 7]);
  });
});

describe('updatePermitRecord validation', () => {
  test('applies a valid patch with an audit activity entry', () => {
    const p = baseProject();
    const before = JSON.stringify(p);
    const next = updatePermitRecord(p, { status: 'issued', reference: 'HRM-1', issuedOn: '2026-06-01', expiresOn: '2026-11-09' });
    expect(next.permit?.status).toBe('issued');
    expect(next.permit?.reference).toBe('HRM-1');
    const entry = next.activity[next.activity.length - 1];
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(entry.at).toISOString()).toBe(entry.at);
    expect(entry.message.toLowerCase()).toContain('update');
    expect(JSON.stringify(p)).toBe(before);
  });
  test('rejects unknown status, long reference and bad reminder config', () => {
    const p = baseProject();
    expect(() => updatePermitRecord(p, { status: 'expired' as never })).toThrow(/status must be one of/);
    expect(() => updatePermitRecord(p, { reference: 'x'.repeat(121) })).toThrow(/120/);
    expect(() => updatePermitRecord(p, { expirySource: 'x'.repeat(1001) })).toThrow(/1000/);
    expect(() => updatePermitRecord(p, { reminderDays: [0] })).toThrow(/1 to 365/);
    expect(() => updatePermitRecord(p, { reminderDays: [366] })).toThrow(/1 to 365/);
    expect(() => updatePermitRecord(p, { reminderDays: [7.5] })).toThrow(/whole numbers/);
    expect(() => updatePermitRecord(p, { reminderDays: [7, 7] })).toThrow(/unique/);
    expect(() => updatePermitRecord(p, { reminderDays: [1, 2, 3, 4, 5, 6, 7] })).toThrow(/at most 6/);
    expect(() => updatePermitRecord(p, { remindersEnabled: 'yes' as never })).toThrow(/boolean/);
    expect(() => updatePermitRecord(p, { renewal: null })).toThrow(/prepareRenewal/);
  });
  test('accepts real Gregorian dates and rejects invalid or out-of-order ones', () => {
    const p = baseProject();
    expect(updatePermitRecord(p, { issuedOn: '2024-02-29' }).permit?.issuedOn).toBe('2024-02-29');
    for (const bad of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-1-1', 'not-a-date', '', '2026/10/10']) {
      expect(() => updatePermitRecord(p, { issuedOn: bad }), bad).toThrow(/YYYY-MM-DD/);
      expect(() => updatePermitRecord(p, { expiresOn: bad }), bad).toThrow(/YYYY-MM-DD/);
    }
    expect(() => updatePermitRecord(p, { issuedOn: '2026-11-10', expiresOn: '2026-11-09' })).toThrow(/on or before/);
    expect(updatePermitRecord(p, { issuedOn: '2026-11-09', expiresOn: '2026-11-09' }).permit?.expiresOn).toBe('2026-11-09');
  });
  test('never invents a municipal default expiry', () => {
    const next = updatePermitRecord(baseProject(), { status: 'issued', reference: 'HRM-9' });
    expect(next.permit?.expiresOn).toBeNull();
  });
});

describe('getPermitNotifications', () => {
  test('Oct 10 now: Oct 17 expiry is 7 days, Nov 9 expiry is 30 days', () => {
    const a = issuedProject('2026-10-17', 'A');
    const b = issuedProject('2026-11-09', 'B');
    const notes = getPermitNotifications([a, b], OCT10);
    expect(notes.find((n) => n.projectId === a.id)).toMatchObject({ kind: 'expires_soon', daysRemaining: 7 });
    expect(notes.find((n) => n.projectId === b.id)).toMatchObject({ kind: 'expires_soon', daysRemaining: 30 });
  });
  test('expired, unknown expiry and renewal review states', () => {
    const expired = issuedProject('2026-10-09', 'Old');
    const unknown = issuedProject(null, 'No date');
    const draft = prepareRenewal(issuedProject('2026-11-09', 'Draft'), OCT10);
    const notes = getPermitNotifications([expired, unknown, draft], OCT10);
    expect(notes.find((n) => n.projectId === expired.id)).toMatchObject({ kind: 'expired', daysRemaining: -1 });
    expect(notes.find((n) => n.projectId === unknown.id)).toMatchObject({ kind: 'expiry_unknown', daysRemaining: null });
    const review = notes.find((n) => n.projectId === draft.id && n.kind === 'renewal_review');
    expect(review?.description.toLowerCase()).not.toContain('eligible');
    expect(notes.filter((n) => n.projectId === draft.id).length).toBe(2);
  });
  test('uses UTC calendar days regardless of local timezone offset', () => {
    const p = issuedProject('2026-10-17', 'TZ');
    const plus14 = new Date('2026-10-10T00:30:00+14:00'); // Oct 9 10:30 UTC
    expect(getPermitNotifications([p], plus14)[0]).toMatchObject({ kind: 'expires_soon', daysRemaining: 8 });
  });
  test('closed projects and disabled reminders suppress reminders; expired facts still surface', () => {
    const closed = updatePermitRecord(issuedProject('2026-10-09', 'Shut'), { status: 'closed' });
    expect(getPermitNotifications([closed], OCT10)).toEqual([]);
    const quiet = updatePermitRecord(issuedProject('2026-10-17', 'Quiet'), { remindersEnabled: false });
    expect(getPermitNotifications([quiet], OCT10)).toEqual([]);
    const quietExpired = updatePermitRecord(issuedProject('2026-10-09', 'Quiet old'), { remindersEnabled: false });
    expect(getPermitNotifications([quietExpired], OCT10)).toMatchObject([{ kind: 'expired' }]);
    expect(getPermitNotifications([baseProject('Prep')], OCT10)).toEqual([]);
  });
});

describe('buildReminderCalendar', () => {
  test('emits real RFC 5545 ICS with DATE event and per-day alarms', () => {
    const ics = buildReminderCalendar(issuedProject('2026-11-09'), OCT10);
    const unfolded = ics.replace(/\r\n /g, '');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261109');
    expect(unfolded).toContain('DTEND;VALUE=DATE:20261110');
    expect(unfolded).toContain('TRIGGER:-P30D');
    expect(unfolded).toContain('TRIGGER:-P7D');
    expect(unfolded).toMatch(/SUMMARY:Permit expiry:/);
    const summary = unfolded.split('\r\n').find((l) => l.startsWith('SUMMARY:')) ?? '';
    expect(summary.toLowerCase()).not.toContain('renew');
    expect(unfolded).toContain('Recorded expiry source:');
    expect(unfolded.toLowerCase()).toContain('manual review');
    expect(ics.endsWith('\r\n')).toBe(true);
  });
  test('escapes commas, semicolons, backslashes and newlines, and folds to 75 octets', () => {
    const tricky = updatePermitRecord(baseProject('Bakery, Main; North \\ Branch\nNew'), {
      status: 'issued',
      reference: 'R-1',
      expiresOn: '2026-11-09',
      expirySource: 'Letter, section 2; line \\ break\nnext. ' + 'é'.repeat(200),
    });
    const ics = buildReminderCalendar(tricky, OCT10);
    const enc = new TextEncoder();
    for (const line of ics.split('\r\n').slice(0, -1)) {
      expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    }
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('Bakery\\, Main\\; North \\\\ Branch\\nNew');
    expect(unfolded).toContain('Letter\\, section 2\\; line \\\\ break\\nnext.');
  });
  test('unique UIDs, no alarms when disabled, helpful error without expiry', () => {
    const a = buildReminderCalendar(issuedProject('2026-11-09', 'A'), OCT10);
    const b = buildReminderCalendar(issuedProject('2026-11-09', 'B'), OCT10);
    const uid = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n').find((l) => l.startsWith('UID:'));
    expect(uid(a)).not.toBe(uid(b));
    const quiet = updatePermitRecord(issuedProject('2026-11-09', 'Q'), { remindersEnabled: false });
    expect(buildReminderCalendar(quiet, OCT10)).not.toContain('VALARM');
    expect(() => buildReminderCalendar(issuedProject(null, 'N'), OCT10)).toThrow(/expiry/i);
  });
});

describe('prepareRenewal and approveRenewalDraft', () => {
  test('draft preserves originals and marks eligibility unverified', () => {
    const p = issuedProject('2026-11-09', 'Renew me');
    const before = JSON.stringify(p);
    const next = prepareRenewal(p, OCT10);
    expect(next.permit?.renewal).toMatchObject({
      status: 'needs_review',
      eligibility: 'unverified',
      approvedAt: null,
      createdAt: OCT10.toISOString(),
    });
    expect(next.permit?.status).toBe('issued');
    expect(next.permit?.issuedOn).toBe('2026-06-01');
    expect(next.permit?.expiresOn).toBe('2026-11-09');
    expect(next.permit?.reference).toBe('HRM-2026-0042');
    expect(next.documents).toBe(p.documents);
    expect(next.activity[next.activity.length - 1].message).toContain('HRM-2026-0042');
    expect(JSON.stringify(p)).toBe(before);
  });
  test('prepareRenewal requires issued permit, reference and known expiry', () => {
    expect(() => prepareRenewal(baseProject('Prep'), OCT10)).toThrow(/issued/);
    expect(() => prepareRenewal(updatePermitRecord(baseProject('No ref'), { status: 'issued', expiresOn: '2026-11-09' }), OCT10)).toThrow(/reference/);
    expect(() => prepareRenewal(issuedProject(null, 'No expiry'), OCT10)).toThrow(/expiry/);
    const drafted = prepareRenewal(issuedProject('2026-11-09', 'Dup'), OCT10);
    expect(() => prepareRenewal(drafted, OCT10)).toThrow(/already/);
  });
  test('approval timestamps only on approve and never submits externally', () => {
    const drafted = prepareRenewal(issuedProject('2026-11-09', 'Vote'), OCT10);
    const rejected = approveRenewalDraft(drafted, false, OCT10);
    expect(rejected.permit?.renewal?.approvedAt).toBeNull();
    expect(rejected.permit?.renewal?.status).toBe('needs_review');
    const approved = approveRenewalDraft(drafted, true, OCT10);
    expect(approved.permit?.renewal).toMatchObject({ status: 'approved_for_manual_handoff', approvedAt: OCT10.toISOString(), eligibility: 'unverified' });
    expect(approved.permit?.expiresOn).toBe('2026-11-09');
    expect(approved.permit?.status).toBe('issued');
    expect(approved.activity[approved.activity.length - 1].message.toLowerCase()).toContain('manual handoff');
    expect(() => approveRenewalDraft(approved, true, OCT10)).toThrow(/already/);
    expect(() => approveRenewalDraft(baseProject('None'), true, OCT10)).toThrow(/no renewal draft/i);
  });
  test('approval requires the defensible minimum and explains it for the UI', () => {
    const drafted = prepareRenewal(issuedProject('2026-11-09', 'Thin'), OCT10);
    const stripped = updatePermitRecord(drafted, { reference: '' });
    expect(() => approveRenewalDraft(stripped, true, OCT10)).toThrow(/before approving/);
  });
});

describe('renewal review remains tied to the recorded permit', () => {
  test('changing a reviewed expiry invalidates the existing renewal approval', () => {
    const approved = approveRenewalDraft(prepareRenewal(issuedProject(), OCT10), true, OCT10);
    const changed = updatePermitRecord(approved, { expiresOn: '2026-12-01' });
    expect(changed.permit?.renewal).toBeNull();
    expect(changed.activity.at(-1)?.message).toContain('renewal');
  });
  test('a record no longer issued cannot approve a prepared renewal', () => {
    const draft = prepareRenewal(issuedProject(), OCT10);
    const changed = { ...draft, permit: { ...draft.permit!, status: 'closed' as const } };
    expect(() => approveRenewalDraft(changed, true, OCT10)).toThrow('issued');
  });
  test('changing reminders preserves a reviewed renewal', () => {
    const approved = approveRenewalDraft(prepareRenewal(issuedProject(), OCT10), true, OCT10);
    expect(updatePermitRecord(approved, { reminderDays: [14] }).permit?.renewal).toEqual(approved.permit?.renewal);
  });
});
