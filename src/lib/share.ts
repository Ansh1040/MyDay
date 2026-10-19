// Sharing without a server: content is packed into a compact text code (and optionally a web link).
// The other person pastes the code into Elsewhere → Import (or opens the link if a web copy is hosted).
// Nothing is uploaded anywhere by the app; the user's chosen share channel carries the code.
import { Share } from '@capacitor/share';
import { isNative } from './platform';
import type { Experience, TwoPersonQuest, QuestAnswerSet } from '../data/types';

export type SharePacket =
  | { t: 'experience'; v: 1; experience: Experience; from?: string }
  | { t: 'quest'; v: 1; quest: Pick<TwoPersonQuest, 'id' | 'title' | 'intro' | 'kind' | 'prompts'>; from?: string; answers?: QuestAnswerSet }
  | { t: 'quest-reply'; v: 1; questId: string; answers: QuestAnswerSet };

const PREFIX = 'ELSW1:';

function b64urlEncode(bytes: Uint8Array) {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str: string) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodePacket(p: SharePacket): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(p));
  if ('CompressionStream' in window) return PREFIX + 'z' + b64urlEncode(await pipe(json, new CompressionStream('deflate-raw')));
  return PREFIX + 'j' + b64urlEncode(json);
}

/** Accepts a raw code, a message containing a code, or a link with ?d=<code>. Throws a readable Error on failure. */
export async function decodePacket(input: string): Promise<SharePacket> {
  // A pasted share link carries the code URL-encoded (“ELSW1%3A…”).
  const text = /ELSW1%3A/i.test(input) ? input.replace(/ELSW1%3A/gi, 'ELSW1:') : input;
  const match = text.match(/ELSW1:([zj])([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('No Elsewhere share code found. Codes start with “ELSW1:”.');
  if (match[1] === 'z' && !('DecompressionStream' in window)) throw new Error('This device cannot read compressed share codes.');
  try {
    let bytes = b64urlDecode(match[2]);
    if (match[1] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    const p = JSON.parse(new TextDecoder().decode(bytes)) as SharePacket;
    if (!p || typeof p !== 'object' || typeof p.t !== 'string') throw new Error('This share code is incomplete or damaged. Ask for it to be sent again.');
    if (p.v !== 1) throw new Error('Unsupported share code version.');
    return p;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Unsupported')) throw e;
    throw new Error('This share code is incomplete or damaged. Ask for it to be sent again.');
  }
}

/** Optional public web address of a hosted copy (set VITE_PUBLIC_URL at build time). */
export const PUBLIC_URL: string | undefined = import.meta.env.VITE_PUBLIC_URL || undefined;

export function shareLink(code: string) {
  return PUBLIC_URL ? `${PUBLIC_URL.replace(/\/$/, '')}/#/import?d=${encodeURIComponent(code)}` : undefined;
}

/** Opens the system share sheet when available, otherwise copies to clipboard. Returns what happened. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (isNative()) {
      await Share.share({ title, text, dialogTitle: title });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function composeShareMessage(intro: string, code: string) {
  const link = shareLink(code);
  return `${intro}\n\nOpen Elsewhere → You → Import, and paste this code:\n${code}${link ? `\n\nOr open: ${link}` : ''}`;
}

/** Save a file to the user's device (web download). */
export function downloadFile(name: string, data: string | Blob, type = 'application/json') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
