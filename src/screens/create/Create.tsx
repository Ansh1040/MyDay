// Create tab — capture, remix, build, and send things to your future self.
import { useMemo } from 'react';
import { Archive, ArrowRight, Hammer, Lock, LockOpen, NotebookPen, Plus, Shuffle } from 'lucide-react';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { fmtDate, relTime } from '../../lib/id';
import { useNow } from '../../lib/timers';
import { REMIX_DISCLAIMER } from '../../lib/remix';
import { formatMeta } from '../../formats/meta';
import { Button, Screen, Section } from '../../components/ui';
import { NoteRow, QuickCapture } from './FieldNotes';
import { capsuleKindMeta, opensIn } from './Capsules';
import type { CapsuleKind, FormatKey } from '../../data/types';
import '../../styles/create.css';

interface DraftItem { key: string; title: string; sub: string; to: string; at: string }

export function Create() {
  const notes = useStore((s) => s.notes);
  const experiences = useStore((s) => s.experiences);
  const capsules = useStore((s) => s.capsules);
  const drafts = useStore((s) => s.drafts);
  const now = useNow(true, 60000);

  const recentNotes = useMemo(() => Object.values(notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3), [notes]);
  const noteCount = Object.keys(notes).length;
  const creations = useMemo(() => Object.values(experiences).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [experiences]);
  const forFriends = creations.filter((e) => e.visibility === 'friends').length;

  const caps = useMemo(() => {
    const all = Object.values(capsules);
    const sealed = all.filter((c) => !c.openedAt && new Date(c.opensAt).getTime() > now).sort((a, b) => a.opensAt.localeCompare(b.opensAt));
    const ready = all.filter((c) => !c.openedAt && new Date(c.opensAt).getTime() <= now);
    const opened = all.filter((c) => c.openedAt).length;
    return { sealed, ready, opened };
  }, [capsules, now]);

  const draftItems = useMemo(() => {
    const out: DraftItem[] = [];
    Object.values(drafts).forEach((d) => {
      if (d.key.startsWith('builder:')) {
        const id = d.key.slice(8);
        const f = (d.data as { form?: { title?: string; format?: FormatKey } } | undefined)?.form;
        const inLib = !!experiences[id];
        out.push({
          key: d.key,
          title: f?.title?.trim() || (inLib ? experiences[id].title : 'Untitled experience'),
          sub: `${inLib ? 'Unpublished changes' : 'Builder draft'} · ${f?.format ? formatMeta(f.format).label + ' · ' : ''}edited ${relTime(d.updatedAt)}`,
          to: `/builder/${id}`,
          at: d.updatedAt,
        });
      } else if (d.key === 'capsule:new') {
        const f = (d.data as { form?: { title?: string; kind?: CapsuleKind } } | undefined)?.form;
        if (!f) return;
        out.push({ key: d.key, title: f.title?.trim() || `Unsealed ${capsuleKindMeta(f.kind ?? 'message').label.toLowerCase()}`, sub: `Capsule draft · edited ${relTime(d.updatedAt)}`, to: '/capsule/new', at: d.updatedAt });
      }
    });
    return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  }, [drafts, experiences]);

  const nextCap = caps.sealed[0];

  return (
    <Screen title="Create" backTo={false} subtitle="Capture what you notice, remix it, build something, or seal it for later.">
      <QuickCapture />

      {caps.ready.length > 0 && (
        <button type="button" className="card tinted card-tap cr-ready" style={{ marginTop: 20 }} onClick={() => navigate(caps.ready.length === 1 ? `/capsule/${caps.ready[0].id}` : '/capsules')}>
          <span className="label accent row" style={{ gap: 6 }}><LockOpen size={14} aria-hidden /> Ready to open</span>
          <span className="display t-md" style={{ display: 'block', marginTop: 6 }}>
            {caps.ready.length === 1 ? caps.ready[0].title : `${caps.ready.length} capsules are ready to open`}
          </span>
        </button>
      )}

      {draftItems.length > 0 && (
        <Section title="Drafts in progress">
          <div className="list">
            {draftItems.map((d) => (
              <button key={d.key} type="button" className="list-row" onClick={() => navigate(d.to)}>
                <span className="grow">
                  <span className="lr-title" style={{ display: 'block' }}>{d.title}</span>
                  <span className="lr-sub">{d.sub}</span>
                </span>
                <ArrowRight size={18} aria-hidden className="faint" />
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Field Notes */}
      <Section
        title="Field Notes"
        action={noteCount > 0 ? <button type="button" className="btn secondary sm" onClick={() => navigate('/notes')}>All {noteCount}</button> : undefined}
      >
        {recentNotes.length ? (
          <div className="stack sm">
            {recentNotes.map((n) => <NoteRow key={n.id} n={n} />)}
          </div>
        ) : (
          <div className="card cr-empty-card">
            <NotebookPen size={20} aria-hidden className="cr-accent" />
            <div className="grow">
              <div style={{ fontWeight: 650 }}>Your notebook is empty</div>
              <p className="small muted" style={{ margin: '2px 0 0' }}>Use the buttons above to capture a thought, sound, sketch, photo or link. Everything stays on this device.</p>
            </div>
          </div>
        )}
      </Section>

      {/* Remix Studio */}
      <Section>
        <article className="card inverse cr-feature">
          <div className="label row" style={{ gap: 6 }}><Shuffle size={14} aria-hidden /> Remix Studio</div>
          <h2 className="display t-lg" style={{ margin: '10px 0 8px' }}>Turn one discovery into something new.</h2>
          <p className="muted" style={{ margin: '0 0 6px' }}>An experience becomes an experiment. A reflection becomes a story. A skill becomes a real-world challenge. A rabbit hole becomes a walk.</p>
          <p className="tiny muted" style={{ margin: '0 0 16px' }}>{REMIX_DISCLAIMER}</p>
          <Button variant="primary" icon={<Shuffle size={18} aria-hidden />} onClick={() => navigate('/remix')}>Start a remix</Button>
        </article>
      </Section>

      {/* Experience Builder */}
      <Section title="Experience Builder" action={creations.length > 0 ? <button type="button" className="btn secondary sm" onClick={() => navigate('/builder')}>Your creations</button> : undefined}>
        <article className="card tinted">
          <h3 className="display t-md" style={{ margin: '0 0 6px' }}>Make quests, quizzes, experiments and journeys.</h3>
          <p className="small muted" style={{ margin: 0 }}>
            {creations.length
              ? `${creations.length} in your library${forFriends ? ` · ${forFriends} marked for friends` : ''}.`
              : 'Nothing built yet. Start from scratch, or remix something you’ve explored.'}
          </p>
          {creations.length > 0 && (
            <div className="list" style={{ marginTop: 14 }}>
              {creations.slice(0, 2).map((e) => {
                const F = formatMeta(e.format);
                return (
                  <button key={e.id} type="button" className="list-row" onClick={() => navigate(`/builder/${e.id}`)}>
                    <span className="lr-icon"><F.icon size={18} aria-hidden /></span>
                    <span className="grow">
                      <span className="lr-title" style={{ display: 'block' }}>{e.title}</span>
                      <span className="lr-sub">{F.label} · {e.visibility === 'friends' ? 'For friends' : 'Private'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="row wrap" style={{ marginTop: 14 }}>
            <Button variant="dark" icon={<Plus size={18} aria-hidden />} onClick={() => navigate('/builder/new')}>New experience</Button>
            {creations.length === 0 && <Button variant="ghost" icon={<Hammer size={18} aria-hidden />} onClick={() => navigate('/builder')}>Your creations</Button>}
          </div>
        </article>
      </Section>

      {/* Capsules */}
      <Section title="Capsules" action={<button type="button" className="btn secondary sm" onClick={() => navigate('/capsules')}>All capsules</button>}>
        <article className="card cr-capsule-card">
          <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <span className="cr-capsule-glyph" aria-hidden>{caps.sealed.length ? <Lock size={20} /> : <Archive size={20} />}</span>
            <div className="grow">
              {caps.sealed.length ? (
                <>
                  <div style={{ fontWeight: 650 }}>{caps.sealed.length} sealed</div>
                  <p className="small muted" style={{ margin: '2px 0 0' }}>
                    Next opens {fmtDate(nextCap.opensAt)} ({opensIn(nextCap.opensAt, now)}){caps.opened ? ` · ${caps.opened} opened` : ''}.
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 650 }}>{caps.opened ? `${caps.opened} opened, none sealed` : 'Nothing sealed yet'}</div>
                  <p className="small muted" style={{ margin: '2px 0 0' }}>Seal a prediction, opinion, message, voice note or creation, and reopen it later through Version History.</p>
                </>
              )}
            </div>
          </div>
          <div className="row wrap" style={{ marginTop: 14 }}>
            <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => navigate('/capsule/new?kind=prediction')}>Prediction</Button>
            <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => navigate('/capsule/new?kind=message')}>Message</Button>
            <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => navigate('/capsule/new?kind=voice')}>Voice</Button>
          </div>
        </article>
      </Section>
    </Screen>
  );
}
