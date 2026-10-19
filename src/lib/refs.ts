// Resolve any Ref to a title/subtitle/url — used by collections, links, the Curiosity Map and Version History.
import type { Ref, RefKind } from '../data/types';
import { useStore } from '../store/store';
import { getExperience, getPerspective, getRabbitHole, getSkill, RABBIT_HOLES, topicLabel } from '../data/catalog';
import { refUrl } from './timers';
import { formatMeta } from '../formats/meta';

export interface ResolvedRef { ref: Ref; title: string; kindLabel: string; url: string; missing?: boolean; private?: boolean }

export const KIND_LABEL: Record<RefKind, string> = {
  experience: 'Experience', rabbit: 'Rabbit hole', rabbitNode: 'Idea', skill: 'Skill', note: 'Field note', entry: 'Version History',
  capsule: 'Capsule', twist: 'Plot twist', quest: 'Two-person quest', collection: 'Collection', topic: 'Topic', perspective: 'Perspective',
};

export function resolveRef(ref: Ref): ResolvedRef {
  const s = useStore.getState();
  const base = { ref, kindLabel: KIND_LABEL[ref.kind], url: refUrl(ref) };
  switch (ref.kind) {
    case 'experience': {
      const e = getExperience(ref.id);
      return e ? { ...base, title: e.title, kindLabel: formatMeta(e.format).label } : { ...base, title: 'Removed experience', missing: true };
    }
    case 'rabbit': {
      const r = getRabbitHole(ref.id);
      return r ? { ...base, title: r.title } : { ...base, title: 'Unknown rabbit hole', missing: true };
    }
    case 'rabbitNode': {
      // id format: "<rabbitId>/<nodeId>"
      const [rid, nid] = ref.id.split('/');
      const node = RABBIT_HOLES.find((r) => r.id === rid)?.nodes.find((n) => n.id === nid);
      return node ? { ...base, title: node.title, url: `/rabbit/${rid}?node=${nid}` } : { ...base, title: 'Unknown idea', missing: true };
    }
    case 'skill': {
      const k = getSkill(ref.id);
      return k ? { ...base, title: k.name } : { ...base, title: 'Unknown skill', missing: true };
    }
    case 'note': {
      const n = s.notes[ref.id];
      return n ? { ...base, title: n.title || n.text.slice(0, 60) || 'Untitled note', private: n.private } : { ...base, title: 'Deleted note', missing: true };
    }
    case 'entry': {
      const e = s.entries[ref.id];
      return e ? { ...base, title: e.title || e.text.slice(0, 60), private: e.private } : { ...base, title: 'Deleted entry', missing: true };
    }
    case 'capsule': {
      const c = s.capsules[ref.id];
      return c ? { ...base, title: c.title } : { ...base, title: 'Deleted capsule', missing: true };
    }
    case 'twist': {
      const t = s.twists[ref.id];
      return t ? { ...base, title: t.text } : { ...base, title: 'Removed plot twist', missing: true };
    }
    case 'quest': {
      const q = s.quests[ref.id];
      return q ? { ...base, title: q.title } : { ...base, title: 'Removed quest', missing: true };
    }
    case 'collection': {
      const c = s.collections[ref.id];
      return c ? { ...base, title: c.name } : { ...base, title: 'Deleted collection', missing: true };
    }
    case 'topic':
      return { ...base, title: topicLabel(ref.id) };
    case 'perspective': {
      const p = getPerspective(ref.id);
      return p ? { ...base, title: p.question } : { ...base, title: 'Unknown question', missing: true };
    }
  }
}
