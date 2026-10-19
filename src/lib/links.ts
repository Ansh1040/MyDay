import type { Ref, RefKind } from '../data/types';

const KINDS: RefKind[] = ['experience', 'rabbit', 'rabbitNode', 'skill', 'note', 'entry', 'capsule', 'twist', 'quest', 'collection', 'topic', 'perspective'];

/** Parse "kind:id" (from a `link=` query param) into a Ref. Returns null when invalid. */
export function parseLinkParam(v: string | null | undefined): Ref | null {
  if (!v) return null;
  const i = v.indexOf(':');
  if (i < 1) return null;
  const kind = v.slice(0, i) as RefKind;
  const id = v.slice(i + 1);
  return KINDS.includes(kind) && id ? { kind, id } : null;
}

export const linkParam = (r: Ref) => `${r.kind}:${encodeURIComponent(r.id)}`;
