// Editorial reading view: sections with strong typography, reading progress, sources as external links.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Check, WifiOff, CornerDownLeft } from 'lucide-react';
import type { ReadingPayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button } from '../../components/ui';
import { useOnline } from '../../lib/online';
import { draftOf, Paragraphs, wordCount, useReducedMotion } from './kit';

interface ReadingDraft { progress: number }

export function ReadingPlayer({ experience, draft, saveDraft, onComplete, completed }: PlayerProps) {
  const p = (experience.payload ?? {}) as Partial<ReadingPayload>;
  const sections = Array.isArray(p.sections) ? p.sections.filter((s) => s && typeof s.text === 'string') : [];
  const sources = Array.isArray(p.sources) ? p.sources.filter((s) => s && s.url) : [];
  const online = useOnline();
  const reduced = useReducedMotion();
  const articleRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const saved = draftOf<ReadingDraft>(draft).progress ?? 0;
  const [resumeOffered, setResumeOffered] = useState(saved > 0.08 && saved < 0.97);
  const maxRef = useRef(saved);
  const [done, setDone] = useState(false);

  const words = useMemo(() => sections.reduce((n, s) => n + wordCount(s.text) + wordCount(s.heading ?? ''), 0), [sections]);
  const readMins = Math.max(1, Math.round(words / 220));

  useEffect(() => {
    let raf = 0;
    let lastSaved = maxRef.current;
    const measure = () => {
      raf = 0;
      const el = articleRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height - vh * 0.6;
      const pr = total <= 0 ? (r.top < vh ? 1 : 0) : Math.max(0, Math.min(1, (vh * 0.4 - r.top) / total));
      setProgress(pr);
      if (pr > maxRef.current) maxRef.current = pr;
      if (maxRef.current - lastSaved > 0.1) {
        lastSaved = maxRef.current;
        saveDraft({ progress: Math.round(maxRef.current * 100) / 100 });
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [saveDraft]);

  const resume = () => {
    const el = articleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const total = r.height - window.innerHeight * 0.6;
    const y = window.scrollY + r.top - window.innerHeight * 0.4 + saved * total;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
    setResumeOffered(false);
  };

  const finish = () => {
    setDone(true);
    onComplete({ read: true, progress: Math.round(Math.max(progress, maxRef.current) * 100) / 100 }, 'Marked as read');
  };

  if (!sections.length) {
    return (
      <div className="fx-player">
        <p className="muted glass fx-panel">This reading has no text yet.</p>
      </div>
    );
  }

  return (
    <div className="fx-player fx-reading">
      <div className="fx-readbar" aria-hidden>
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="fx-reading-panel glass glass-strong fx-panel">
        <div className="row between fx-reading-meta">
          <span className="label">{readMins} min read · {words.toLocaleString()} words</span>
          {resumeOffered && (
            <Button size="sm" variant="soft" icon={<CornerDownLeft size={16} aria-hidden />} onClick={resume}>
              Continue where you stopped
            </Button>
          )}
        </div>

        <article ref={articleRef} className="fx-article" aria-label={experience.title}>
          {sections.map((s, i) => (
            <section key={i} className="fx-article-section">
              {s.heading && <h2 className="display t-md fx-article-h">{s.heading}</h2>}
              <Paragraphs text={s.text} className={'prose fx-article-text' + (i === 0 ? ' lede' : '')} />
            </section>
          ))}
        </article>

        {sources.length > 0 && (
          <section className="fx-sources" aria-labelledby={`src-${experience.id}`}>
            <h2 className="label" id={`src-${experience.id}`}>Sources & further reading</h2>
            {!online && (
              <p className="small faint row" style={{ gap: 6 }}>
                <WifiOff size={14} aria-hidden /> You’re offline — these links will open once you’re connected.
              </p>
            )}
            <ul className="fx-source-list">
              {sources.map((s, i) => (
                <li key={i}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="fx-source" aria-disabled={!online || undefined}>
                    <span className="grow">{s.label || s.url}</span>
                    <ExternalLink size={16} aria-hidden />
                    <span className="sr-only">(opens in a new window)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="fx-nav end">
        <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={finish}>
          {done || completed ? 'Done reading — log again' : 'Done reading'}
        </Button>
      </div>
    </div>
  );
}

export default ReadingPlayer;
