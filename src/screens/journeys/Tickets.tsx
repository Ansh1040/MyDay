// Return Tickets: unfinished explorations with notes to future me. Resume, edit, resolve or delete.
import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, Bell, Check, Pencil, RotateCcw, Ticket, Trash } from 'lucide-react';
import type { ReturnTicket } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { Button, EmptyState, IconButton, Screen, Section, Swipeable, confirmDialog, toast } from '../../components/ui';
import { ReturnTicketSheet, scheduleTicketReminder, ticketUrl } from '../../components/ReturnTicketSheet';
import { cancelScheduled } from '../../lib/notify';
import { KIND_LABEL } from '../../lib/refs';
import { fmtDate, nowISO, relTime } from '../../lib/id';
import { getRabbitHole } from '../../data/catalog';
import '../../styles/journeys.css';

function ticketPlace(t: ReturnTicket) {
  if (t.target.kind === 'rabbit' && t.nodeId) {
    const node = getRabbitHole(t.target.id)?.nodes.find((n) => n.id === t.nodeId);
    if (node) return `Rabbit hole · ${node.title}`;
  }
  return KIND_LABEL[t.target.kind];
}

export function TicketsScreen() {
  const tickets = useStore((s) => s.tickets);
  const [editing, setEditing] = useState<ReturnTicket | null>(null);
  const closeEdit = useCallback(() => setEditing(null), []);
  const { open, resolved } = useMemo(() => {
    const all = Object.values(tickets);
    return {
      open: all.filter((t) => !t.resolvedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      resolved: all.filter((t) => t.resolvedAt).sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? '')),
    };
  }, [tickets]);

  return (
    <Screen title="Return Tickets" eyebrow="Journeys" backTo="/journeys" subtitle="Unfinished explorations, with notes on where you stopped and what you wanted to try next.">
      {open.length ? (
        <div className="stack" aria-label="Open tickets">
          {open.map((t) => (
            <TicketCard key={t.id} t={t} onEdit={() => setEditing(t)} />
          ))}
          <p className="on-art tiny j-hint">Swipe a ticket left to resolve it, or use its buttons.</p>
        </div>
      ) : (
        <EmptyState
          icon={<Ticket size={24} />}
          title="No open tickets"
          body="When you stop partway through a rabbit hole, skill or experience, save a return ticket to remember where you were and what you wanted to try next."
          action={<Button variant="primary" onClick={() => navigate('/journeys')}>Explore Journeys</Button>}
        />
      )}

      {!!resolved.length && (
        <Section title={`Resolved · ${resolved.length}`}>
          <div className="list j-wrap">
            {resolved.map((t) => (
              <ResolvedRow key={t.id} t={t} />
            ))}
          </div>
        </Section>
      )}

      {editing && (
        <ReturnTicketSheet open={!!editing} onClose={closeEdit} target={editing.target} nodeId={editing.nodeId} title={editing.title} ticket={editing} />
      )}
    </Screen>
  );
}

async function resolveTicket(t: ReturnTicket) {
  const st = useStore.getState();
  if (t.nativeId != null) await cancelScheduled([t.nativeId]);
  st.patch('tickets', t.id, { resolvedAt: nowISO(), nativeId: undefined });
  toast('Ticket resolved', { action: { label: 'Undo', run: () => void reopenTicket(t.id) } });
}

/** Reopen a resolved ticket. Resolving cancelled its Android reminder, so a reminder that's still ahead is scheduled again. */
async function reopenTicket(id: string) {
  useStore.getState().patch('tickets', id, { resolvedAt: undefined });
  const t = useStore.getState().tickets[id];
  if (t?.remindAt && !t.reminded && t.nativeId == null && new Date(t.remindAt) > new Date()) await scheduleTicketReminder(t, new Date(t.remindAt));
}

async function deleteTicket(t: ReturnTicket) {
  const ok = await confirmDialog({ title: 'Delete this ticket?', body: `Your notes for “${t.title}” will be removed. This can’t be undone.`, confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  if (t.nativeId != null) await cancelScheduled([t.nativeId]);
  useStore.getState().remove('tickets', t.id);
  toast('Ticket deleted');
}

function TicketCard({ t, onEdit }: { t: ReturnTicket; onEdit: () => void }) {
  const pendingReminder = t.remindAt && !t.reminded && new Date(t.remindAt) > new Date();
  return (
    <Swipeable onLeft={() => resolveTicket(t)} leftLabel="Resolve" leftIcon={<Check size={18} />}>
      <article className="card j-ticket" aria-label={`Return ticket: ${t.title}`}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="label accent">{ticketPlace(t)}</div>
            <h2 className="display t-md" style={{ margin: '6px 0 0' }}>{t.title}</h2>
          </div>
          <span className="tiny faint" style={{ whiteSpace: 'nowrap', paddingTop: 2 }}>{relTime(t.createdAt)}</span>
        </div>
        <dl className="j-ticket-notes">
          {t.stoppedAt && (
            <>
              <dt>Where I stopped</dt>
              <dd>{t.stoppedAt}</dd>
            </>
          )}
          {t.caught && (
            <>
              <dt>What caught my attention</dt>
              <dd>{t.caught}</dd>
            </>
          )}
          {t.next && (
            <>
              <dt>What I want to try next</dt>
              <dd>{t.next}</dd>
            </>
          )}
        </dl>
        {pendingReminder && (
          <p className="tiny muted row" style={{ gap: 6, margin: '0 0 12px' }}>
            <Bell size={14} aria-hidden /> Reminder {fmtDate(t.remindAt!, { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        )}
        <div className="row wrap" style={{ gap: 8 }}>
          <Button variant="primary" size="sm" icon={<ArrowRight size={16} />} onClick={() => navigate(ticketUrl(t))}>Resume</Button>
          <span className="grow" />
          <IconButton label={`Edit ticket: ${t.title}`} onClick={onEdit}><Pencil size={18} /></IconButton>
          <IconButton label={`Mark resolved: ${t.title}`} onClick={() => resolveTicket(t)}><Check size={18} /></IconButton>
          <IconButton label={`Delete ticket: ${t.title}`} onClick={() => deleteTicket(t)}><Trash size={18} /></IconButton>
        </div>
      </article>
    </Swipeable>
  );
}

function ResolvedRow({ t }: { t: ReturnTicket }) {
  return (
    <div className="list-row">
      <span className="lr-icon"><Check size={18} aria-hidden /></span>
      <span className="grow">
        <span className="lr-title" style={{ display: 'block' }}>{t.title}</span>
        <span className="lr-sub">Resolved {t.resolvedAt ? fmtDate(t.resolvedAt) : ''}{t.stoppedAt ? ` · ${t.stoppedAt}` : ''}</span>
      </span>
      <IconButton label={`Reopen ticket: ${t.title}`} onClick={() => { void reopenTicket(t.id); toast('Ticket reopened'); }}>
        <RotateCcw size={18} />
      </IconButton>
      <IconButton label={`Delete ticket: ${t.title}`} onClick={() => deleteTicket(t)}><Trash size={18} /></IconButton>
    </div>
  );
}
