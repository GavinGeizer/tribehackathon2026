import { useMemo, useState } from 'react';
import type { Project } from '../domain/types';
import type { PermitRecord, PermitStatus } from '../domain/lifecycle-types';
import {
  approveRenewalDraft,
  buildReminderCalendar,
  getPermitNotifications,
  getPermitRecord,
  prepareRenewal,
  updatePermitRecord,
} from '../domain/lifecycle';
import { Icons } from './icons';
import { Badge, FieldError } from './ui';
import './lifecycle.css';

const STATUSES: { id: PermitStatus; label: string }[] = [
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready_for_review', label: 'Ready for review' },
  { id: 'submitted_manually', label: 'Submitted manually' },
  { id: 'issued', label: 'Issued' },
  { id: 'closed', label: 'Closed' },
];

const PRESET_DAYS = [7, 30, 60];

function isIsoDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw;
}

function stamp(project: Project, message: string): Project {
  const at = new Date().toISOString();
  return {
    ...project,
    activity: [...project.activity, { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at, message }],
    updatedAt: at,
  };
}

function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LifecycleTab({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (next: Project) => void;
}) {
  const record: PermitRecord = useMemo(() => getPermitRecord(project), [project]);
  const nowIso = useMemo(() => new Date().toISOString(), []);
  const notifications = useMemo(
    () => getPermitNotifications([project], new Date(nowIso)),
    [project, nowIso],
  );

  const [status, setStatus] = useState<PermitStatus>(record.status);
  const [reference, setReference] = useState(record.reference);
  const [issuedOn, setIssuedOn] = useState(record.issuedOn ?? '');
  const [expiresOn, setExpiresOn] = useState(record.expiresOn ?? '');
  const [expirySource, setExpirySource] = useState(record.expirySource);
  const [reminderDays, setReminderDays] = useState<number[]>(record.reminderDays);
  const [customDay, setCustomDay] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(record.remindersEnabled);
  const [formError, setFormError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | undefined>(undefined);
  const [customError, setCustomError] = useState<string | undefined>(undefined);
  const [savedTick, setSavedTick] = useState(0);
  const [approved, setApproved] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);

  const dirty =
    status !== record.status ||
    reference !== record.reference ||
    issuedOn !== (record.issuedOn ?? '') ||
    expiresOn !== (record.expiresOn ?? '') ||
    expirySource !== record.expirySource ||
    remindersEnabled !== record.remindersEnabled ||
    JSON.stringify([...reminderDays].sort((a, b) => a - b)) !==
      JSON.stringify([...record.reminderDays].sort((a, b) => a - b));

  function toggleDay(day: number) {
    setReminderDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  function addCustomDay() {
    const n = Number(customDay.trim());
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      setCustomError('Enter a whole number of days from 1 to 365.');
      return;
    }
    setCustomError(undefined);
    setCustomDay('');
    setReminderDays((prev) => (prev.includes(n) ? prev : [...prev, n].sort((a, b) => a - b)));
  }

  function save() {
    setSavedTick(0);
    if (issuedOn.trim() !== '' && !isIsoDate(issuedOn.trim())) {
      setDateError('Issued date must be YYYY-MM-DD, or blank.');
      return;
    }
    if (expiresOn.trim() !== '' && !isIsoDate(expiresOn.trim())) {
      setDateError('Expiry date must be YYYY-MM-DD, or blank for unknown.');
      return;
    }
    setDateError(undefined);
    try {
      const patched = updatePermitRecord(project, {
        status,
        reference: reference.trim(),
        issuedOn: issuedOn.trim() === '' ? null : issuedOn.trim(),
        expiresOn: expiresOn.trim() === '' ? null : expiresOn.trim(),
        expirySource: expirySource.trim(),
        reminderDays: [...reminderDays].sort((a, b) => a - b),
        remindersEnabled,
      });
      setFormError(null);
      setSavedTick((t) => t + 1);
      onUpdate(stamp(patched, `Permit record saved (${patched.permit?.status ?? status}). Expiry recorded from: ${expirySource.trim() || 'unspecified'}.`));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Permit record failed validation; nothing was saved.');
    }
  }

  function handlePrepareRenewal() {
    setRenewalError(null);
    try {
      const next = prepareRenewal(project, new Date());
      onUpdate(stamp(next, 'Renewal draft prepared — needs human review. No submission was made.'));
      setApproved(false);
    } catch (e) {
      setRenewalError(e instanceof Error ? e.message : 'Renewal draft could not be prepared yet.');
    }
  }

  function handleApproveRenewal() {
    setRenewalError(null);
    if (!approved) {
      setRenewalError('Tick the explicit human-review checkbox first — approval requires clear human review.');
      return;
    }
    try {
      const next = approveRenewalDraft(project, true, new Date());
      onUpdate(stamp(next, 'Renewal draft approved for guided manual handoff (eligibility not verified; no automatic submission).'));
      setApproved(false);
    } catch (e) {
      setRenewalError(e instanceof Error ? e.message : 'Renewal approval failed; nothing was submitted.');
    }
  }

  function handleCalendar() {
    const ics = buildReminderCalendar(project, new Date());
    downloadIcs(`permit-reminders-${project.id}.ics`, ics);
    onUpdate(stamp(project, 'Reminder calendar (.ics) downloaded.'));
  }

  const draft = record.renewal;
  const expiryLabel = record.expiresOn
    ? new Date(`${record.expiresOn}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : 'Unknown — enter the expiry from the permit document; nothing is assumed.';

  return (
    <div className="lc-stack">
      <section className="card" aria-label="Permit record">
        <div className="lc-row-between">
          <div>
            <p className="kicker">Permit lifecycle</p>
            <h3>Permit record</h3>
          </div>
          <Badge tone={record.expiresOn ? 'teal' : 'amber'}>
            Expires: {record.expiresOn ?? 'unknown'}
          </Badge>
        </div>
        <p className="muted small">
          Expiry is human-entered from the permit document. A missing expiry stays unknown — the
          app never claims universal automatic renewal or invents expiry dates.
        </p>
        <div className="lc-grid" style={{ marginTop: 12 }}>
          <label className="field">
            <span className="field-label">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as PermitStatus)} aria-label="Permit status">
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Permit reference</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. HRM-2026-0143" />
          </label>
        </div>
        <div className="lc-grid">
          <label className="field">
            <span className="field-label">Issued on (YYYY-MM-DD)</span>
            <input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} aria-invalid={Boolean(dateError)} />
          </label>
          <label className="field">
            <span className="field-label">Expires on (YYYY-MM-DD)</span>
            <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} aria-invalid={Boolean(dateError)} />
          </label>
        </div>
        <FieldError message={dateError} />
        <label className="field">
          <span className="field-label">Expiry source</span>
          <input
            value={expirySource}
            onChange={(e) => setExpirySource(e.target.value)}
            placeholder="e.g. permit document, recorded source"
          />
          <span className="field-hint">Recorded source of the expiry, e.g. permit document.</span>
        </label>

        <fieldset className="field" style={{ border: 'none', padding: 0, marginBottom: 12 }}>
          <legend className="field-label">Reminder days before expiry</legend>
          <div className="lc-check-grid">
            {PRESET_DAYS.map((d) => (
              <label key={d} className="lc-check">
                <input
                  type="checkbox"
                  checked={reminderDays.includes(d)}
                  onChange={() => toggleDay(d)}
                  disabled={!remindersEnabled}
                />
                {d} days
              </label>
            ))}
            <span className="lc-check">
              <input
                className="lc-inline-input"
                inputMode="numeric"
                value={customDay}
                onChange={(e) => setCustomDay(e.target.value)}
                placeholder="Custom 1–365"
                aria-label="Custom reminder days (1 to 365)"
                disabled={!remindersEnabled}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomDay} disabled={!remindersEnabled}>
                Add
              </button>
            </span>
          </div>
          <FieldError message={customError} />
          {reminderDays.length > 0 ? (
            <ul className="lc-chip-list" aria-label="Selected reminder days">
              {[...reminderDays].sort((a, b) => a - b).map((d) => (
                <li key={d} className="lc-chip">
                  {d}d
                  <button type="button" onClick={() => toggleDay(d)} aria-label={`Remove ${d}-day reminder`} disabled={!remindersEnabled}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small" style={{ marginTop: 8 }}>No reminder days selected.</p>
          )}
          <label className="lc-check" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)} />
            Reminders enabled
          </label>
        </fieldset>

        {formError ? (
          <p className="banner banner-error" role="alert">
            <Icons.TriangleAlert size={16} aria-hidden /> {formError}
          </p>
        ) : null}
        <div className="form-foot">
          <span className="muted small" aria-live="polite">
            {savedTick > 0 && !dirty ? 'Saved — validator passed, activity recorded.' : dirty ? 'Unsaved changes.' : ''}
          </span>
          <button type="button" className="btn btn-primary" disabled={!dirty} onClick={save}>
            Save permit record
          </button>
        </div>
      </section>

      <section className="card" aria-label="Reminders and calendar">
        <h3>Reminders &amp; calendar</h3>
        <p className="muted small">
          Current recorded expiry: <strong>{expiryLabel}</strong> In-app reminders only — no
          background email or push is claimed.
        </p>
        <div className="lc-actions">
          <button type="button" className="btn btn-secondary" onClick={handleCalendar}>
            <Icons.Download size={16} aria-hidden /> Download calendar (.ics)
          </button>
        </div>
        {notifications.length === 0 ? (
          <p className="muted small" style={{ marginTop: 10 }}>No upcoming, expired, or unknown-expiry notices right now.</p>
        ) : (
          <ul className="lc-notif-list">
            {notifications
              .filter((n) => n.projectId === project.id)
              .map((n) => (
                <li
                  key={n.id}
                  className={`card lc-notif-card ${n.kind === 'expired' ? 'is-expired' : ''} ${n.kind === 'expiry_unknown' ? 'is-unknown' : ''}`}
                >
                  <div className="lc-row-between">
                    <strong>{n.title}</strong>
                    <Badge tone={n.kind === 'expired' ? 'red' : n.kind === 'expiry_unknown' ? 'amber' : 'teal'}>
                      {n.kind === 'expired' ? 'Expired' : n.kind === 'expiry_unknown' ? 'Unknown' : n.kind === 'renewal_review' ? 'Renewal review' : 'Upcoming'}
                    </Badge>
                  </div>
                  <p className="muted small">{n.description}</p>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="card" aria-label="Renewal">
        <h3>Renewal</h3>
        <p className="muted small">
          Renewals are guided manual handoffs only. Draft eligibility is unverified, and approval
          never submits anything automatically.
        </p>
        {draft ? (
          <div style={{ marginTop: 10 }}>
            <div className="lc-badges">
              <Badge tone={draft.status === 'approved_for_manual_handoff' ? 'teal' : 'amber'}>
                {draft.status === 'approved_for_manual_handoff' ? 'Approved for manual handoff' : 'Needs review'}
              </Badge>
              <Badge tone="grey">Eligibility: unverified</Badge>
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>{draft.note}</p>
            {draft.status === 'needs_review' ? (
              <div className="lc-approve-box" style={{ marginTop: 10 }}>
                <label className="lc-check">
                  <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                  I have human-reviewed this draft. Eligibility is not verified.
                </label>
                <div className="lc-actions" style={{ marginTop: 0 }}>
                  <button type="button" className="btn btn-primary" onClick={handleApproveRenewal}>
                    Confirm approval for guided manual handoff
                  </button>
                </div>
              </div>
            ) : (
              <p className="banner banner-info" role="status" style={{ marginTop: 10 }}>
                <Icons.CheckCircle2 size={16} aria-hidden />
                Approved for guided manual handoff on{' '}
                {draft.approvedAt
                  ? new Date(draft.approvedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                  : 'recorded date'}
                . Complete renewal with the municipality; nothing was submitted automatically.
              </p>
            )}
          </div>
        ) : (
          <div className="lc-actions">
            <button type="button" className="btn btn-secondary" onClick={handlePrepareRenewal}>
              Prepare renewal draft
            </button>
          </div>
        )}
        {renewalError ? (
          <p className="banner banner-error" role="alert" style={{ marginTop: 10 }}>
            <Icons.TriangleAlert size={16} aria-hidden /> {renewalError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
