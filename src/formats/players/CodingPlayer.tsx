// Coding exercise: user JavaScript runs in a throwaway Web Worker (no DOM, network switched off) with a 3-second limit.
// console output and the final value (`result`) are captured; `checks[].expr` run inside the worker with `output` and `result`.
import { useEffect, useId, useRef, useState } from 'react';
import { Play, RotateCcw, Check, X, Terminal, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { CodingPayload } from '../../data/types';
import type { PlayerProps } from '../registry';
import { Button, confirmDialog, useAutosave } from '../../components/ui';
import { draftOf, Paragraphs } from './kit';

const TIMEOUT_MS = 3000;

const WORKER_SRC = `
const fmt = (v) => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'function') return '[Function' + (v.name ? ': ' + v.name : '') + ']';
  if (v instanceof Error) return v.name + ': ' + v.message;
  if (typeof v === 'symbol' || typeof v === 'bigint') return String(v);
  try { const s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
};
self.onmessage = async (e) => {
  const { code, checks } = e.data;
  const lines = [];
  const push = (prefix) => (...args) => { if (lines.length < 500) lines.push(prefix + args.map(fmt).join(' ')); };
  // Contract: output = console.log lines joined by "\\n"; each call joins its args with one space.
  console.log = push(''); console.info = push(''); console.debug = push(''); console.warn = push(''); console.error = push('');
  try { self.fetch = undefined; self.XMLHttpRequest = undefined; self.importScripts = undefined; self.WebSocket = undefined; self.EventSource = undefined; } catch (_) {}
  let result, error = null, line = null, offset = 0;
  try {
    try {
      result = (0, eval)(code);
    } catch (err) {
      // Top-level "return" isn't valid in eval; run it as a function body instead (2 header lines).
      if (err instanceof SyntaxError && /return/i.test(err.message)) { offset = 2; result = new Function(code)(); }
      else throw err;
    }
    if (result && typeof result.then === 'function') result = await result;
    await new Promise((r) => setTimeout(r, 30));
  } catch (err) {
    error = (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err));
    const m = err && err.stack && String(err.stack).match(/(?:<anonymous>|> (?:eval|Function)):(\\d+):(\\d+)/);
    if (m && !(err instanceof SyntaxError) && Number(m[1]) - offset > 0) line = Number(m[1]) - offset;
  }
  const output = lines.join('\\n');
  const results = (checks || []).map((c) => {
    try { return { label: c.label, pass: !!(new Function('output', 'result', '"use strict"; return (' + c.expr + ');'))(output, result) }; }
    catch (err) { return { label: c.label, pass: false, error: String((err && err.message) || err) }; }
  });
  self.postMessage({ lines, result: result === undefined ? null : fmt(result), hasResult: result !== undefined, error, line, checks: results });
};
`;

interface RunResult {
  lines: string[];
  result: string | null;
  hasResult: boolean;
  error: string | null;
  line: number | null;
  checks: { label: string; pass: boolean; error?: string }[];
  timedOut?: boolean;
  ms: number;
}

interface CodingDraft { code: string }

export function CodingPlayer({ experience, draft, saveDraft, onComplete, completed }: PlayerProps) {
  const p = (experience.payload ?? {}) as Partial<CodingPayload>;
  const starter = typeof p.starter === 'string' ? p.starter : '';
  const checks = Array.isArray(p.checks) ? p.checks.filter((c) => c && typeof c.expr === 'string') : [];
  const d = draftOf<CodingDraft>(draft);
  const [code, setCode] = useState(typeof d.code === 'string' ? d.code : starter);
  const [run, setRun] = useState<RunResult | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const workerRef = useRef<{ w: Worker; url: string; timer: number } | null>(null);
  const runBtnRef = useRef<HTMLButtonElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const status = useAutosave(code, (c) => saveDraft({ code: c }));

  const stopWorker = () => {
    const r = workerRef.current;
    if (!r) return;
    clearTimeout(r.timer);
    r.w.terminate();
    URL.revokeObjectURL(r.url);
    workerRef.current = null;
  };
  useEffect(() => stopWorker, []);

  const execute = () => {
    if (running) return;
    stopWorker();
    setFatal(null);
    let url = '';
    let w: Worker;
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      w = new Worker(url);
    } catch (e) {
      console.warn(e);
      if (url) URL.revokeObjectURL(url);
      setFatal('Code can’t run here: this browser blocked the sandbox (Web Workers).');
      return;
    }
    const started = performance.now();
    setRunning(true);
    const timer = window.setTimeout(() => {
      stopWorker();
      setRunning(false);
      setRun({ lines: [], result: null, hasResult: false, error: null, line: null, checks: checks.map((c) => ({ label: c.label, pass: false })), timedOut: true, ms: TIMEOUT_MS });
    }, TIMEOUT_MS);
    workerRef.current = { w, url, timer };
    w.onmessage = (e: MessageEvent<Omit<RunResult, 'ms'>>) => {
      stopWorker();
      setRunning(false);
      setRun({ ...e.data, ms: Math.round(performance.now() - started) });
    };
    w.onerror = (e) => {
      e.preventDefault();
      stopWorker();
      setRunning(false);
      setRun({ lines: [], result: null, hasResult: false, error: e.message || 'The code stopped with an error.', line: e.lineno || null, checks: checks.map((c) => ({ label: c.label, pass: false })), ms: Math.round(performance.now() - started) });
    };
    w.postMessage({ code, checks: checks.map((c) => ({ label: c.label, expr: c.expr })) });
  };

  const insert = (ta: HTMLTextAreaElement, text: string, selStart: number, selEnd: number) => {
    ta.setSelectionRange(selStart, selEnd);
    // execCommand keeps the native undo stack where supported; fall back to direct editing.
    const ok = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
    if (!ok) {
      ta.setRangeText(text, selStart, selEnd, 'end');
      setCode(ta.value);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.key === 'Escape') {
      e.preventDefault();
      runBtnRef.current?.focus();
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      execute();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en, value } = ta;
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      if (s === en && !e.shiftKey) {
        insert(ta, '  ', s, en);
        return;
      }
      // Indent / outdent every selected line.
      const block = value.slice(lineStart, en);
      const lines = block.split('\n');
      const next = e.shiftKey ? lines.map((l) => l.replace(/^ {1,2}/, '')) : lines.map((l) => '  ' + l);
      const replaced = next.join('\n');
      insert(ta, replaced, lineStart, en);
      ta.setSelectionRange(lineStart, lineStart + replaced.length);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      const { selectionStart: s, selectionEnd: en, value } = ta;
      const lineStart = value.lastIndexOf('\n', s - 1) + 1;
      const indent = /^[ \t]*/.exec(value.slice(lineStart, s))?.[0] ?? '';
      const extra = /[{[(]\s*$/.test(value.slice(lineStart, s)) ? '  ' : '';
      if (indent || extra) {
        e.preventDefault();
        insert(ta, '\n' + indent + extra, s, en);
      }
    }
  };

  const resetCode = async () => {
    if (code === starter) return;
    if (await confirmDialog({ title: 'Reset to the starter code?', body: 'Your current code will be replaced.', confirmLabel: 'Reset', danger: true })) {
      setCode(starter);
      setRun(null);
    }
  };

  const passed = run ? run.checks.filter((c) => c.pass).length : 0;
  const finish = () => {
    setDone(true);
    onComplete({ code, passed: run ? passed : null, total: checks.length }, checks.length && run ? `${passed} of ${checks.length} checks passed` : 'Code saved');
  };

  return (
    <div className="fx-player fx-coding">
      {p.prompt && (
        <div className="glass glass-strong fx-panel">
          <Paragraphs text={p.prompt} className="prose" preformat />
        </div>
      )}

      <div className="fx-editor glass fx-panel">
        <div className="field">
          <div className="row between">
            <label htmlFor={id} className="fx-field-label">Your code (JavaScript)</label>
            <span className="tiny faint">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Draft saved' : ''}</span>
          </div>
          <textarea
            id={id}
            ref={areaRef}
            className="textarea fx-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            rows={Math.min(22, Math.max(8, code.split('\n').length + 1))}
            aria-describedby={id + '-help'}
          />
          <small id={id + '-help'} className="faint tiny">Tab indents · Esc leaves the editor · Ctrl/⌘ + Enter runs</small>
        </div>

        <div className="row wrap">
          <button ref={runBtnRef} type="button" className="btn primary" onClick={execute} disabled={running}>
            {running ? <LoaderCircle size={18} className="fx-spin" aria-hidden /> : <Play size={18} aria-hidden />}
            {running ? 'Running…' : 'Run'}
          </button>
          {running && <Button variant="secondary" onClick={() => { stopWorker(); setRunning(false); }}>Stop</Button>}
          <Button variant="ghost" icon={<RotateCcw size={18} aria-hidden />} onClick={resetCode} disabled={code === starter}>Reset</Button>
        </div>

        {fatal && <div className="banner error" role="alert"><TriangleAlert size={18} aria-hidden /> {fatal}</div>}
      </div>

      <div className="fx-console glass glass-strong fx-panel" aria-live="polite" aria-label="Program output">
        <div className="fx-console-head row between">
          <span className="label row" style={{ gap: 6 }}><Terminal size={14} aria-hidden /> Output</span>
          {run && !run.timedOut && <span className="tiny faint mono">{run.ms} ms</span>}
        </div>
        {!run && !running && <p className="tiny faint fx-console-empty">Run your code to see what it prints. Nothing leaves this device.</p>}
        {run?.timedOut && (
          <p className="fx-error small" role="alert">
            Stopped after {TIMEOUT_MS / 1000} seconds. Look for a loop that never ends (for example a <code>while</code> whose condition never becomes false).
          </p>
        )}
        {run && run.lines.length > 0 && <pre className="fx-console-out">{run.lines.join('\n')}</pre>}
        {run && !run.timedOut && !run.error && run.lines.length === 0 && !run.hasResult && <p className="tiny faint fx-console-empty">Ran without printing anything. Use <code>console.log(…)</code> to show values.</p>}
        {run?.hasResult && !run.error && (
          <p className="mono small fx-console-result"><span className="faint">result → </span>{run.result}</p>
        )}
        {run?.error && (
          <p className="fx-error mono small" role="alert">
            {run.error}{run.line ? ` (around line ${run.line})` : ''}
          </p>
        )}
      </div>

      {checks.length > 0 && (
        <section className="fx-checks glass fx-panel" aria-label="Checks">
          <div className="row between">
            <h3 className="label">Checks</h3>
            {run && <span className="small mono">{passed}/{checks.length}</span>}
          </div>
          <ul>
            {(run ? run.checks : checks.map((c) => ({ label: c.label, pass: false, error: undefined as string | undefined }))).map((c, i) => (
              <li key={i} className={'fx-check ' + (!run ? 'pending' : c.pass ? 'ok' : 'no')}>
                <span className="fx-mark" aria-hidden>{!run ? <span className="fx-dot-sm" /> : c.pass ? <Check size={14} /> : <X size={14} />}</span>
                <span className="grow">
                  {c.label}
                  <span className="sr-only">{!run ? ' — not run yet' : c.pass ? ' — passed' : ' — not yet'}</span>
                  {run && c.error && <span className="tiny faint" style={{ display: 'block' }}>Check error: {c.error}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fx-nav end">
        <Button variant="primary" icon={<Check size={18} aria-hidden />} onClick={finish} disabled={!code.trim()}>
          {done || completed ? 'Save again' : 'Finish'}
        </Button>
      </div>
    </div>
  );
}

export default CodingPlayer;
