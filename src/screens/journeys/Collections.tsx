// Personal Collections: named shelves for anything in Elsewhere (experiences, ideas, notes, skills, quests…).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, FolderOpen, Library, Link2, Pencil, Plus, Trash, X } from 'lucide-react';
import type { Collection, ID, RabbitHole, Ref } from '../../data/types';
import { useStore } from '../../store/store';
import { navigate } from '../../lib/router';
import { Button, EmptyState, Field, IconButton, Screen, Section, Sheet, confirmDialog, toast } from '../../components/ui';
import { LinkPicker } from '../../components/common';
import { resolveRef } from '../../lib/refs';
import { nowISO, uid } from '../../lib/id';
import { RABBIT_HOLES } from '../../data/catalog';
import '../../styles/journeys.css';

const STARTERS: { id: ID; name: string; description: string }[] = [
  { id: 'col-surprised', name: 'Things that surprised me', description: 'Moments and ideas that caught me off guard.' },
  { id: 'col-try', name: 'Projects I want to try', description: 'A shelf of things to make or do next.' },
  { id: 'col-changed', name: 'Ideas I changed my mind about', description: 'Where my thinking moved.' },
];

const sameRef = (a: Ref, b: Ref) => a.kind === b.kind && a.id === b.id;

async function deleteCollection(c: Collection) {
  const ok = await confirmDialog({
    title: `Delete “${c.name}”?`,
    body: c.items.length ? `The collection goes away; the ${c.items.length} thing${c.items.length === 1 ? '' : 's'} in it stay where they are.` : 'This empty collection will be removed.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return false;
  useStore.getState().remove('collections', c.id);
  toast(`Deleted “${c.name}”`);
  return true;
}

/** Create or edit a collection's name and description. */
function CollectionForm({ initial, submitLabel, onSubmit, onCancel }: { initial: { name: string; description: string }; submitLabel: string; onSubmit: (v: { name: string; description: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSubmit({ name: name.trim(), description: description.trim() });
      }}
    >
      <Field label="Name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sounds worth remembering" maxLength={80} />
      </Field>
      <Field label="Description (optional)">
        <textarea className="textarea" style={{ minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What belongs here?" />
      </Field>
      <div className="row">
        <Button type="button" className="grow" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="grow" variant="primary" disabled={!name.trim()}>{submitLabel}</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- all collections
export function CollectionsScreen() {
  const collections = useStore((s) => s.collections);
  const upsert = useStore((s) => s.upsert);
  const patch = useStore((s) => s.patch);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Collection | null>(null);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeRename = useCallback(() => setRenaming(null), []);
  const list = useMemo(
    () => Object.values(collections).sort((a, b) => (a.system === b.system ? a.createdAt.localeCompare(b.createdAt) : a.system ? -1 : 1)),
    [collections],
  );
  const missingStarters = STARTERS.filter((s) => !collections[s.id]);

  return (
    <Screen
      title="Collections"
      eyebrow="Journeys"
      backTo="/journeys"
      subtitle="Named shelves for discoveries, projects, notes and ideas."
      actions={<IconButton label="New collection" onClick={() => setCreating(true)}><Plus size={22} /></IconButton>}
    >
      {list.length ? (
        <div className="stack">
          {list.map((c) => (
            <article key={c.id} className="card j-col-card">
              <button type="button" className="card-tap" style={{ background: 'none', border: 0, padding: 0 }} onClick={() => navigate(`/collection/${c.id}`)}>
                <div className="label accent">{c.items.length} item{c.items.length === 1 ? '' : 's'}{c.system ? ' · Starter' : ''}</div>
                <h2 className="display t-md" style={{ margin: '6px 0 4px' }}>{c.name}</h2>
                {c.description && <p className="muted small" style={{ margin: 0 }}>{c.description}</p>}
                {!!c.items.length && (
                  <p className="tiny faint j-col-peek">{c.items.slice(0, 3).map((r) => resolveRef(r).title).join(' · ')}{c.items.length > 3 ? ' …' : ''}</p>
                )}
              </button>
              <div className="row j-col-actions">
                <Button size="sm" variant="ghost" icon={<FolderOpen size={16} />} onClick={() => navigate(`/collection/${c.id}`)}>Open</Button>
                <span className="grow" />
                <IconButton label={`Rename ${c.name}`} onClick={() => setRenaming(c)}><Pencil size={18} /></IconButton>
                <IconButton label={`Delete ${c.name}`} onClick={() => deleteCollection(c)}><Trash size={18} /></IconButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Library size={24} />} title="No collections" body="Collections keep the things you want to come back to, grouped your way." action={<Button variant="primary" icon={<Plus size={18} />} onClick={() => setCreating(true)}>New collection</Button>} />
      )}

      <Section>
        <div className="row wrap">
          <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>New collection</Button>
          {!!missingStarters.length && (
            <Button
              onClick={() => {
                const at = nowISO();
                missingStarters.forEach((s) => upsert('collections', { ...s, items: [], createdAt: at, system: true }));
                toast(`Added ${missingStarters.length} starter collection${missingStarters.length === 1 ? '' : 's'}`);
              }}
            >
              Restore starter collections
            </Button>
          )}
        </div>
      </Section>

      <Sheet open={creating} onClose={closeCreate} title="New collection">
        <CollectionForm
          initial={{ name: '', description: '' }}
          submitLabel="Create"
          onCancel={closeCreate}
          onSubmit={(v) => {
            const id = uid('col-');
            upsert('collections', { id, name: v.name, description: v.description, items: [], createdAt: nowISO() });
            setCreating(false);
            toast(`Created “${v.name}”`, { action: { label: 'Open', run: () => navigate(`/collection/${id}`) } });
          }}
        />
      </Sheet>
      <Sheet open={!!renaming} onClose={closeRename} title="Rename collection">
        {renaming && (
          <CollectionForm
            initial={{ name: renaming.name, description: renaming.description }}
            submitLabel="Save"
            onCancel={closeRename}
            onSubmit={(v) => {
              patch('collections', renaming.id, v);
              setRenaming(null);
              toast('Collection updated');
            }}
          />
        )}
      </Sheet>
    </Screen>
  );
}

// ---------------------------------------------------------------- one collection
export function CollectionScreen({ id }: { id: string }) {
  const c = useStore((s) => s.collections[id]);
  if (!c) {
    return (
      <Screen title="Collection" backTo="/collections">
        <EmptyState
          icon={<Library size={24} />}
          title="Collection not found"
          body="It may have been deleted."
          action={<Button variant="primary" onClick={() => navigate('/collections', { replace: true })}>All collections</Button>}
        />
      </Screen>
    );
  }
  return <CollectionDetail c={c} />;
}

function CollectionDetail({ c }: { c: Collection }) {
  const patch = useStore((s) => s.patch);
  const removeFromCollection = useStore((s) => s.removeFromCollection);
  const blurPrivate = useStore((s) => s.settings.privacy.blurPrivate);
  // Re-resolve titles when the things they point to change.
  const notes = useStore((s) => s.notes);
  const entries = useStore((s) => s.entries);
  const quests = useStore((s) => s.quests);
  const experiences = useStore((s) => s.experiences);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [announce, setAnnounce] = useState('');
  const closeEdit = useCallback(() => setEditing(false), []);
  const closePick = useCallback(() => setPicking(false), []);
  const items = useMemo(() => c.items.map(resolveRef), [c.items, notes, entries, quests, experiences]);

  useEffect(() => {
    if (!announce) return;
    const t = setTimeout(() => setAnnounce(''), 1500);
    return () => clearTimeout(t);
  }, [announce]);

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= c.items.length) return;
    const arr = [...c.items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    patch('collections', c.id, { items: arr });
    setAnnounce(`Moved to position ${j + 1} of ${arr.length}`);
  };

  const remove = (ref: Ref, title: string) => {
    const idx = c.items.findIndex((r) => sameRef(r, ref));
    removeFromCollection(c.id, ref);
    toast(`Removed “${title.length > 40 ? title.slice(0, 38) + '…' : title}”`, {
      action: {
        label: 'Undo',
        run: () => {
          const cur = useStore.getState().collections[c.id];
          if (!cur || cur.items.some((r) => sameRef(r, ref))) return;
          const arr = [...cur.items];
          arr.splice(Math.min(Math.max(0, idx), arr.length), 0, ref);
          useStore.getState().patch('collections', c.id, { items: arr });
        },
      },
    });
  };

  return (
    <Screen
      title={c.name}
      eyebrow="Collection"
      subtitle={c.description || undefined}
      backTo="/collections"
      actions={
        <>
          <IconButton label="Edit name and description" onClick={() => setEditing(true)}><Pencil size={20} /></IconButton>
          <IconButton label="Delete collection" onClick={async () => { if (await deleteCollection(c)) navigate('/collections', { replace: true }); }}><Trash size={20} /></IconButton>
        </>
      }
    >
      {!!c.items.length && (
        <div className="row between j-count-row">
          <span className="on-art small muted">{c.items.length} item{c.items.length === 1 ? '' : 's'}</span>
          <Button size="sm" variant="soft" icon={<Link2 size={16} />} onClick={() => setPicking(true)}>Add things</Button>
        </div>
      )}

      {items.length ? (
        <ol className="list j-col-list" aria-label={`Items in ${c.name}`}>
          {items.map((x, i) => {
            const hidden = x.private && blurPrivate;
            const title = hidden ? 'Private item' : x.title;
            return (
              <li key={x.ref.kind + x.ref.id} className="list-row j-col-item">
                <button type="button" className="grow j-col-open" disabled={x.missing} onClick={() => navigate(x.url)} aria-label={x.missing ? `${title} (no longer available)` : `Open ${title}`}>
                  <span className="label">{x.kindLabel}{x.private ? ' · Private' : ''}</span>
                  <span className={'lr-title' + (hidden ? ' j-blur' : '')} style={{ display: 'block' }}>{title}</span>
                  {x.missing && <span className="lr-sub">No longer available</span>}
                </button>
                <span className="row j-col-tools" style={{ gap: 0 }}>
                  <IconButton label={`Move ${title} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={18} /></IconButton>
                  <IconButton label={`Move ${title} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={18} /></IconButton>
                  <IconButton label={`Remove ${title} from collection`} onClick={() => remove(x.ref, title)}><X size={18} /></IconButton>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptySuggestions c={c} onAdd={() => setPicking(true)} />
      )}
      <div className="sr-only" aria-live="polite">{announce}</div>

      <Sheet open={editing} onClose={closeEdit} title="Edit collection">
        <CollectionForm
          initial={{ name: c.name, description: c.description }}
          submitLabel="Save"
          onCancel={closeEdit}
          onSubmit={(v) => {
            patch('collections', c.id, v);
            setEditing(false);
            toast('Collection updated');
          }}
        />
      </Sheet>
      {picking && <LinkPicker open onClose={closePick} value={c.items} onChange={(refs) => patch('collections', c.id, { items: refs })} />}
    </Screen>
  );
}

function EmptySuggestions({ c, onAdd }: { c: Collection; onAdd: () => void }) {
  const hole: RabbitHole | undefined = RABBIT_HOLES[0];
  let body = 'Use “Save discovery” in a rabbit hole, or the collection button on experiences, to fill this shelf.';
  let links: { label: string; to: string }[] = [
    { label: 'Rabbit holes', to: '/journeys' },
    { label: 'Discover', to: '/discover' },
  ];
  if (c.id === 'col-surprised') {
    body = 'Rabbit holes have “Unexpected” callouts. Tap “Save to Things that surprised me” on any that catch you off guard.';
    links = hole ? [{ label: `Open “${hole.title}”`, to: `/rabbit/${hole.id}` }, { label: 'All rabbit holes', to: '/journeys' }] : links;
  } else if (c.id === 'col-try') {
    body = 'Keep hands-on projects here — from Skill Arcade levels or anything in Discover.';
    links = [
      { label: 'Skill Arcade', to: '/skills' },
      { label: 'Discover', to: '/discover' },
    ];
  } else if (c.id === 'col-changed') {
    body = 'Work through a question in Perspective Switch; if your stance moves, you can add it here.';
    links = [{ label: 'Perspective Switch', to: '/perspectives' }];
  }
  return (
    <EmptyState
      icon={<FolderOpen size={24} />}
      title="Nothing here yet"
      body={body}
      action={
        <div className="stack sm" style={{ alignItems: 'center' }}>
          <Button variant="primary" icon={<Plus size={18} />} onClick={onAdd}>Add things</Button>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            {links.map((l) => (
              <Button key={l.to} size="sm" variant="ghost" onClick={() => navigate(l.to)}>
                {l.label} <ChevronRight size={16} aria-hidden />
              </Button>
            ))}
          </div>
        </div>
      }
    />
  );
}
