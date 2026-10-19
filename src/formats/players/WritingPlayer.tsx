// Writing prompt with optional hints, an autosaving textarea and a word count against the target.
import { useId, useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import type { WritingPayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, Progress, confirmDialog, useAutosave } from '../../components/ui';
import { draftOf, Paragraphs, wordCount } from './kit';

interface WritingDraft { text: string; hintsShown?: number }

export function WritingPlayer({ experience, draft, saveDraft, onComplete, completed }: PlayerProps) {
  const p = (experience.payload ?? {}) as Partial<WritingPayload>;
  const prompt = typeof p.prompt === 'string' ? p.prompt : experience.summary;
  const hints = Array.isArray(p.hints) ? p.hints.filter(Boolean) : [];
  const minWords = typeof p.minWords === 'number' && p.minWords > 0 ? p.minWords : 0;
  const d = draftOf<WritingDraft>(draft);
  const [text, setText] = useState(typeof d.text === 'string' ? d.text : '');
  const [hintsShown, setHintsShown] = useState(Math.min(hints.length, d.hintsShown ?? 0));
  const [done, setDone] = useState(false);
  const id = useId();
  const status = useAutosave(text, (t) => saveDraft({ text: t, hintsShown }), [hintsShown]);
  const words = wordCount(text);

  const finish = async () => {
    if (!text.trim()) return;
    if (minWords && words < minWords) {
      const ok = await confirmDialog({
        title: 'Finish under the target?',
        body: `You’ve written ${words} of ${minWords} words. That’s fine — the target is only a nudge.`,
        confirmLabel: 'Finish anyway',
      });
      if (!ok) return;
    }
    setDone(true);
    onComplete({ text, words }, `${words} word${words === 1 ? '' : 's'} saved`);
  };

  return (
    <div className="fx-player fx-writing">
      <div className="fx-prompt glass fx-panel">
        <span className="label accent">Prompt</span>
        <Paragraphs text={prompt} className="display t-md fx-prompt-text" />

        {hints.length > 0 && (
          <div className="fx-hints">
            {hints.slice(0, hintsShown).map((h, i) => (
              <p key={i} className="fx-hint small"><Lightbulb size={16} aria-hidden /> <span>{h}</span></p>
            ))}
            {hintsShown < hints.length && (
              <Button size="sm" variant="ghost" icon={<Lightbulb size={16} aria-hidden />} onClick={() => setHintsShown((n) => n + 1)}>
                {hintsShown === 0 ? 'Need a nudge?' : 'Another nudge'}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="fx-writing-panel glass fx-panel">
        <div className="field">
          <label htmlFor={id} className="fx-field-label">Your writing</label>
          <textarea id={id} className="textarea fx-writing-area" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Start anywhere. You can edit later." />
        </div>
        <div className="fx-wordcount">
          <div className="row between">
            <span className="small mono" aria-live="polite">
              {minWords ? `${words} / ${minWords} words` : `${words} word${words === 1 ? '' : 's'}`}
            </span>
            <span className="tiny faint">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Draft saved' : ''}</span>
          </div>
          {minWords > 0 && <Progress value={words / minWords} label={`${words} of ${minWords} words`} />}
        </div>
      </div>

      <div className="fx-nav end">
        <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={finish} disabled={!text.trim()}>
          {done || completed ? 'Save again' : 'Finish'}
        </Button>
      </div>
    </div>
  );
}

export default WritingPlayer;
