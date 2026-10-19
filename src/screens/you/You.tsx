// The You tab: Version History, Curiosity Map, Progress, Capsules, Collections, Settings, Import, Install.
import { useMemo, useState } from 'react';
import { ArrowRight, Plus, Settings as SettingsIcon, Import as ImportIcon, Download, Lock, ChevronRight, Hourglass, FolderOpen, TrendingUp, Network } from 'lucide-react';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { fmtDate } from '../../lib/id';
import { SKILLS } from '../../data/catalog';
import { Screen, Button, ListRow } from '../../components/ui';
import { AddEntrySheet, ENTRY_META, entryTitle, plural } from './VersionHistory';
import { CuriosityPreview } from './CuriosityMap';
import '../../styles/you.css';

export function You() {
  const name = useStore((s) => s.prefs.name.trim());
  const entries = useStore((s) => s.entries);
  const capsules = useStore((s) => s.capsules);
  const collections = useStore((s) => s.collections);
  const completions = useStore((s) => s.completions);
  const blur = useStore((s) => s.settings.privacy.blurPrivate);
  const [addOpen, setAddOpen] = useState(false);

  const latest = useMemo(() => Object.values(entries).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3), [entries]);
  const entryCount = Object.keys(entries).length;

  const caps = useMemo(() => {
    const now = Date.now();
    const sealed = Object.values(capsules).filter((c) => !c.openedAt);
    const ready = sealed.filter((c) => new Date(c.opensAt).getTime() <= now).length;
    const next = sealed.filter((c) => new Date(c.opensAt).getTime() > now).sort((a, b) => a.opensAt.localeCompare(b.opensAt))[0];
    return { sealed: sealed.length, ready, next };
  }, [capsules]);

  const progress = useMemo(() => {
    const doneExp = new Set(Object.values(completions).filter((c) => c.ref.kind === 'experience').map((c) => c.ref.id));
    const skills = SKILLS.filter((k) => k.levels.some((l) => [...l.practice, l.project].some((id) => doneExp.has(id)))).length;
    return { experiences: doneExp.size, skills };
  }, [completions]);

  const cols = useMemo(() => {
    const list = Object.values(collections);
    return { n: list.length, items: list.reduce((s, c) => s + c.items.length, 0) };
  }, [collections]);

  return (
    <Screen title={name || 'You'} eyebrow={name ? 'You' : 'Your notebook'} backTo={false} subtitle="Your timeline, your map and your settings — all kept on this device.">
      {/* Version History */}
      <section className="card y-panel you-section you-vh" aria-labelledby="you-vh">
        <div className="you-head">
          <div>
            <div className="label accent">Version History</div>
            <h2 id="you-vh" className="display t-lg">How you’re changing</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate('/history')}>See all <ArrowRight size={16} aria-hidden /></Button>
        </div>
        {latest.length ? (
          <ol className="you-latest">
            {latest.map((e) => {
              const M = ENTRY_META[e.kind];
              const hidden = e.private && blur;
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => navigate(`/entry/${e.id}`)}>
                    <span className="label row" style={{ gap: 6 }}>
                      <M.icon size={13} aria-hidden /> {M.label} · {fmtDate(e.createdAt, { day: 'numeric', month: 'short' })}
                      {e.private && <Lock size={12} aria-label="Private" />}
                    </span>
                    <span className={'display t-sm you-latest-title' + (hidden ? ' you-blurred' : '')}>
                      {hidden ? 'Private entry — open to read' : entryTitle(e)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="muted" style={{ margin: '0 0 12px' }}>
            Nothing here yet. Write what you think, notice or want now — later you can see how it changed.
          </p>
        )}
        <div className="row wrap" style={{ marginTop: 12 }}>
          <Button size="sm" variant="primary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>Add entry</Button>
          {entryCount > 0 && <span className="small muted">{plural(entryCount, 'entry', 'entries')} so far</span>}
        </div>
      </section>

      {/* Curiosity Map */}
      <section className="you-section" aria-labelledby="you-map">
        <button type="button" className="card you-map-card" onClick={() => navigate('/map')}>
          <span className="row between" style={{ marginBottom: 6 }}>
            <span className="label accent row" style={{ gap: 6 }}><Network size={14} aria-hidden /> Curiosity Map</span>
            <ChevronRight size={18} aria-hidden />
          </span>
          <span id="you-map" className="display t-md" style={{ display: 'block' }}>Everything you’ve explored, connected</span>
          <CuriosityPreview />
        </button>
      </section>

      {/* Progress + Capsules */}
      <section className="you-section you-pair" aria-label="Progress and capsules">
        <button type="button" className="card you-tile" onClick={() => navigate('/progress')}>
          <span className="label row" style={{ gap: 6 }}><TrendingUp size={14} aria-hidden /> Progress</span>
          <span className="display t-sm" style={{ display: 'block', margin: '8px 0 4px' }}>
            {progress.experiences ? plural(progress.experiences, 'experience done', 'experiences done') : 'Nothing finished yet'}
          </span>
          <span className="small muted">
            {progress.skills ? `${plural(progress.skills, 'skill', 'skills')} under way` : 'Skills, rabbit holes and saved work'}
          </span>
        </button>
        <button type="button" className={'card you-tile' + (caps.ready ? ' tinted ready' : '')} onClick={() => navigate('/capsules')}>
          <span className="label row" style={{ gap: 6 }}><Hourglass size={14} aria-hidden /> Capsules</span>
          <span className="display t-sm" style={{ display: 'block', margin: '8px 0 4px' }}>
            {caps.ready ? `${caps.ready} ready to open` : caps.sealed ? plural(caps.sealed, 'sealed', 'sealed') : 'None sealed'}
          </span>
          <span className="small muted">
            {caps.next ? `Next opens ${fmtDate(caps.next.opensAt)}` : caps.ready ? 'Open them to see what you thought' : 'Messages to your future self'}
          </span>
        </button>
      </section>

      {/* Collections */}
      <section className="you-section">
        <button type="button" className="card you-row" onClick={() => navigate('/collections')}>
          <FolderOpen size={20} aria-hidden />
          <span className="grow">
            <span className="display t-sm" style={{ display: 'block' }}>Collections</span>
            <span className="small muted">{plural(cols.n, 'collection', 'collections')} · {plural(cols.items, 'item', 'items')}</span>
          </span>
          <ChevronRight size={18} aria-hidden />
        </button>
      </section>

      {/* More */}
      <section className="you-section">
        <h2 className="label on-art you-more">More</h2>
        <div className="list y-panel">
          <ListRow icon={<SettingsIcon size={18} aria-hidden />} title="Settings" sub="Appearance, preferences, notifications, privacy, data" onClick={() => navigate('/settings')} right={<ChevronRight size={18} aria-hidden />} />
          <ListRow icon={<ImportIcon size={18} aria-hidden />} title="Import a share code" sub="Open something a friend sent you" onClick={() => navigate('/import')} right={<ChevronRight size={18} aria-hidden />} />
          <ListRow icon={<Download size={18} aria-hidden />} title="Install guide" sub="Home screen, Android app, offline use" onClick={() => navigate('/install')} right={<ChevronRight size={18} aria-hidden />} />
        </div>
      </section>

      <AddEntrySheet open={addOpen} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}
