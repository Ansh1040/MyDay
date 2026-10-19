// Return Tickets: save an unfinished exploration with where I stopped, what caught my attention and what I want
// to try next — plus an optional reminder. Used by rabbit holes, experiences, skills and the Tickets screen.
import { useEffect, useState } from 'react';
import { BellOff, Info, Ticket } from 'lucide-react';
import type { Ref, ReturnTicket } from '../data/types';
import { useStore } from '../store/store';
import { Button, Field, Segmented, Sheet, toast } from './ui';
import { canScheduleWhileClosed, cancelScheduled, getPermission, requestPermission, scheduleAt } from '../lib/notify';
import { nowISO, uid } from '../lib/id';
import { navigate } from '../lib/router';
import '../styles/journeys.css';

type RemindChoice = 'none' | 'tomorrow' | '3days' | 'week';

const REMIND_OPTIONS: { value: RemindChoice; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: '3days', label: '3 days' },
  { value: 'week', label: '1 week' },
];

/** Android only: schedule a ticket's reminder natively and remember its id (no-op on the web, without permission or with ticket notifications off). */
export async function scheduleTicketReminder(t: ReturnTicket, at: Date) {
  const nid = await scheduleAt('tickets', 'Pick up where you left off', `${t.title}: ${t.next || t.stoppedAt || 'Your return ticket is waiting.'}`, at, '/tickets');
  if (nid != null) useStore.getState().patch('tickets', t.id, { nativeId: nid });
}

/** Reminders land at 9:00 local time on the chosen day. */
function remindDate(choice: RemindChoice, from = new Date()): Date | null {
  const days = choice === 'tomorrow' ? 1 : choice === '3days' ? 3 : choice === 'week' ? 7 : 0;
  if (!days) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d;
}

const fmtWhen = (d: Date) =>
  d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Where a ticket resumes: a rabbit hole at its node, or the target's own page. */
export function ticketUrl(t: Pick<ReturnTicket, 'target' | 'nodeId'>): string {
  const { kind, id } = t.target;
  if (kind === 'rabbit') return `/rabbit/${id}${t.nodeId ? `?node=${encodeURIComponent(t.nodeId)}` : ''}`;
  if (kind === 'rabbitNode') {
    const [rid, nid] = id.split('/');
    return `/rabbit/${rid}?node=${encodeURIComponent(nid ?? '')}`;
  }
  if (kind === 'experience') return `/x/${id}`;
  if (kind === 'skill') return `/skill/${id}`;
  if (kind === 'quest') return `/quest/${id}`;
  if (kind === 'perspective') return `/perspective/${id}`;
  if (kind === 'collection') return `/collection/${id}`;
  if (kind === 'topic') return `/topic/${id}`;
  if (kind === 'note') return `/note/${id}`;
  if (kind === 'entry') return `/entry/${id}`;
  if (kind === 'capsule') return `/capsule/${id}`;
  if (kind === 'twist') return `/twist?id=${id}`;
  return '/journeys';
}

export function ReturnTicketSheet({
  open, onClose, target, nodeId, title, defaultStoppedAt, ticket, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  target: Ref;
  nodeId?: string;
  title: string;
  defaultStoppedAt?: string;
  /** Pass an existing ticket to edit it instead of creating a new one. */
  ticket?: ReturnTicket;
  onSaved?: (t: ReturnTicket) => void;
}) {
  const upsert = useStore((s) => s.upsert);
  const ticketsOn = useStore((s) => s.settings.notifications.tickets);
  const [stoppedAt, setStoppedAt] = useState('');
  const [caught, setCaught] = useState('');
  const [next, setNext] = useState('');
  const [remind, setRemind] = useState<RemindChoice>('none');
  const [keepExisting, setKeepExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setStoppedAt(ticket?.stoppedAt ?? defaultStoppedAt ?? '');
    setCaught(ticket?.caught ?? '');
    setNext(ticket?.next ?? '');
    setRemind('none');
    setKeepExisting(!!ticket?.remindAt && !ticket.reminded && new Date(ticket.remindAt) > new Date());
    setBusy(false);
    setError(null);
  }, [open, ticket, defaultStoppedAt]);

  const when = remindDate(remind);
  const nativeOk = canScheduleWhileClosed();
  const empty = !stoppedAt.trim() && !caught.trim() && !next.trim();

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = ticket?.id ?? uid('tk-');
      // A new reminder choice (or removing the old one) cancels any previously scheduled native notification.
      if (ticket?.nativeId != null && !keepExisting) await cancelScheduled([ticket.nativeId]);
      const t: ReturnTicket = {
        id,
        target,
        nodeId,
        title,
        stoppedAt: stoppedAt.trim(),
        caught: caught.trim(),
        next: next.trim(),
        createdAt: ticket?.createdAt ?? nowISO(),
        remindAt: when ? when.toISOString() : keepExisting ? ticket?.remindAt : undefined,
        reminded: when ? false : keepExisting ? ticket?.reminded : undefined,
        nativeId: when ? undefined : keepExisting ? ticket?.nativeId : undefined,
        resolvedAt: ticket?.resolvedAt,
      };
      // Save first so nothing is lost while a permission prompt is open.
      upsert('tickets', t);
      onSaved?.(t);
      onClose();
      toast(
        (ticket ? 'Ticket updated.' : 'Return ticket saved.') + (when ? ` Reminder set for ${fmtWhen(when)}.` : ''),
        ticket ? {} : { action: { label: 'View tickets', run: () => navigate('/tickets') } },
      );
      if (when) await setUpReminder(t, when);
    } catch (e) {
      console.error(e);
      setError('The ticket couldn’t be saved. Please try again.');
      setBusy(false);
    }
  };

  /** Contextual permission request — only now, because a reminder was chosen. On Android, also schedule natively. */
  const setUpReminder = async (t: ReturnTicket, at: Date) => {
    if (!ticketsOn) {
      toast('Return-ticket notifications are off in Settings, so this reminder won’t notify you.');
      return;
    }
    let perm = await getPermission();
    if (perm === 'prompt') perm = await requestPermission();
    if (perm === 'granted') {
      if (nativeOk) await scheduleTicketReminder(t, at);
    } else if (perm === 'denied') toast('Notifications are blocked, so the reminder will appear inside Elsewhere instead.');
    else if (perm === 'prompt') toast('Notifications weren’t allowed, so the reminder will appear inside Elsewhere instead.');
    else toast('This device can’t show notifications; the reminder will appear inside Elsewhere.');
  };

  return (
    <Sheet open={open} onClose={onClose} title={ticket ? 'Edit return ticket' : 'Save a return ticket'}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <p className="muted small" style={{ margin: 0 }}>
          <Ticket size={14} aria-hidden style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
          For <strong>{title}</strong>. Leave yourself a note so picking this up later is easy.
        </p>
        <Field label="Where I stopped">
          <input className="input" value={stoppedAt} onChange={(e) => setStoppedAt(e.target.value)} placeholder="e.g. Halfway through the idea about scales" />
        </Field>
        <Field label="What caught my attention">
          <textarea className="textarea" style={{ minHeight: 84 }} value={caught} onChange={(e) => setCaught(e.target.value)} placeholder="A detail, a question, a surprise…" />
        </Field>
        <Field label="What I want to try next">
          <textarea className="textarea" style={{ minHeight: 84 }} value={next} onChange={(e) => setNext(e.target.value)} placeholder="e.g. Follow the thread about birdsong" />
        </Field>

        <div className="field">
          <span id="rt-remind-label">Remind me</span>
          {keepExisting && ticket?.remindAt ? (
            <div className="row between j-remind-kept">
              <span className="small">Reminder set for {fmtWhen(new Date(ticket.remindAt))}</span>
              <Button type="button" size="sm" variant="ghost" icon={<BellOff size={16} />} onClick={() => setKeepExisting(false)}>
                Change
              </Button>
            </div>
          ) : (
            <Segmented label="Remind me" value={remind} options={REMIND_OPTIONS} onChange={setRemind} />
          )}
          {when && <small className="faint" aria-live="polite">On {fmtWhen(when)}.</small>}
        </div>

        {(when || keepExisting) && (
          <div className="banner" role="note">
            <Info size={16} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              {nativeOk
                ? 'The Android app schedules this on your device, so it can remind you even when Elsewhere is closed.'
                : 'On the web, reminders only show while Elsewhere is open (or open in a background tab). There’s no server to send them otherwise. The Android app can remind you when it’s closed.'}
              {!ticketsOn && ' Return-ticket notifications are currently off in Settings → Notifications.'}
            </span>
          </div>
        )}

        {error && (
          <div className="banner error" role="alert">
            {error}
          </div>
        )}

        <div className="row" style={{ marginTop: 4 }}>
          <Button type="button" className="grow" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="grow" disabled={busy || empty} aria-busy={busy}>
            {busy ? 'Saving…' : ticket ? 'Save changes' : 'Save ticket'}
          </Button>
        </div>
        {empty && <small className="faint" style={{ textAlign: 'center' }}>Write at least one line to save the ticket.</small>}
      </form>
    </Sheet>
  );
}
