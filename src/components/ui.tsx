// Shared UI kit. All screens compose these so the Index look stays consistent across themes.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, X, Inbox } from 'lucide-react';
import { back, useRoute } from '../lib/router';
import { create } from 'zustand';
import { haptic } from '../lib/platform';
import { useStore } from '../store/store';

// ---------- Screen + NavBar ----------
export function Screen(props: {
  title: string;
  eyebrow?: string; // small label above the large title
  subtitle?: ReactNode;
  backTo?: string | false; // fallback path for back; false = no back button (tab roots)
  actions?: ReactNode; // right-side icon buttons
  children: ReactNode;
  immersive?: boolean; // hides large title, compact header, no tab padding
  hideLargeTitle?: boolean;
  wide?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEdgeSwipeBack(props.backTo !== false && props.backTo !== undefined ? props.backTo : undefined, props.backTo !== false && props.backTo !== undefined);
  const showLarge = !props.immersive && !props.hideLargeTitle;
  return (
    <div className={'screen' + (props.immersive ? ' immersive' : '')}>
      <header className={'navbar' + (scrolled ? ' scrolled' : '') + (showLarge ? '' : ' always')}>
        <div className="navbar-row">
          <div className="navbar-side">
            {props.backTo !== false && props.backTo !== undefined && (
              <button className="icon-btn" aria-label="Back" onClick={() => back(props.backTo as string)}>
                <ChevronLeft size={26} />
              </button>
            )}
          </div>
          <div className="navbar-title" aria-hidden={showLarge && !scrolled}>{props.title}</div>
          <div className="navbar-side right">{props.actions}</div>
        </div>
      </header>
      {showLarge && (
        <div className="large-title">
          {props.eyebrow && <div className="label accent eyebrow">{props.eyebrow}</div>}
          <h1 className="display t-xl">{props.title}</h1>
          {props.subtitle && <div className="muted" style={{ marginTop: 8 }}>{props.subtitle}</div>}
        </div>
      )}
      <main className={'container' + (props.wide ? ' wide' : '')}>{props.children}</main>
    </div>
  );
}

/** Swipe right from the left screen edge to go back (iOS style). A visible back button always exists too. */
function useEdgeSwipeBack(fallback: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let sx = 0, sy = 0, tracking = false;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      tracking = t.clientX < 24;
      sx = t.clientX;
      sy = t.clientY;
    };
    const end = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (t.clientX - sx > 80 && Math.abs(t.clientY - sy) < 60) back(fallback);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchend', end, { passive: true });
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, [fallback, enabled]);
}

// ---------- Buttons ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'dark';
export function Button({
  variant = 'secondary', size, block, icon, children, className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm'; block?: boolean; icon?: ReactNode }) {
  return (
    <button className={`btn ${variant} ${size ?? ''} ${block ? 'block' : ''} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={'icon-btn ' + className} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

// ---------- Chips / tags ----------
export function Chip({ active, onClick, children, accent, icon }: { active?: boolean; onClick?: () => void; children: ReactNode; accent?: boolean; icon?: ReactNode }) {
  return (
    <button type="button" className={'chip' + (accent ? ' accent' : '')} aria-pressed={!!active} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
export const Tag = ({ children, accent }: { children: ReactNode; accent?: boolean }) => <span className={'tag' + (accent ? ' accent' : '')}>{children}</span>;

// ---------- Form ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="faint">{hint}</small>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
    </span>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Sections / lists ----------
export function Section({ title, action, children, style }: { title?: ReactNode; action?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="section" style={style}>
      {(title || action) && (
        <div className="section-head">
          {typeof title === 'string' ? <h2 className="label">{title}</h2> : title}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ListRow({ icon, title, sub, right, onClick, href }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      {icon && <span className="lr-icon">{icon}</span>}
      <span className="grow">
        <span className="lr-title" style={{ display: 'block' }}>{title}</span>
        {sub && <span className="lr-sub" style={{ display: 'block' }}>{sub}</span>}
      </span>
      {right}
    </>
  );
  if (href) return <a className="list-row" href={href}>{inner}</a>;
  if (onClick) return <button type="button" className="list-row" onClick={onClick}>{inner}</button>;
  return <div className="list-row">{inner}</div>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon ?? <Inbox size={24} />}</div>
      <h3 className="display t-md">{title}</h3>
      {body && <p style={{ margin: '0 0 16px' }}>{body}</p>}
      {action}
    </div>
  );
}

export const Progress = ({ value, label }: { value: number; label: string }) => (
  <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
    <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
  </div>
);

export const Skeleton = ({ h = 120 }: { h?: number }) => <div className="skeleton" style={{ height: h }} aria-hidden />;

// ---------- Sheet (bottom sheet with drag-to-dismiss + close button) ----------
// Open sheets, oldest first. Escape closes only the top one (e.g. a confirm over a sheet), and the page
// stays scroll-locked until the last one closes.
const openSheets: object[] = [];

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ y: 0, dy: 0, active: false, base: '' });
  // Keep the latest onClose in a ref so inline callbacks don't re-run the open effect (which moves focus).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const token = {};
    openSheets.push(token);
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openSheets[openSheets.length - 1] === token && closeRef.current();
    window.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,textarea,button,select,[tabindex]')?.focus(), 30);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      openSheets.splice(openSheets.indexOf(token), 1);
      if (!openSheets.length) document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  const onStart = (e: React.TouchEvent) => {
    // Don't drag the sheet while the touch is scrolling the sheet or a scrolled list inside it.
    for (let n = e.target as HTMLElement | null; n && n !== ref.current?.parentNode; n = n.parentElement) if (n.scrollTop > 0) return;
    const base = ref.current ? getComputedStyle(ref.current).transform : 'none';
    drag.current = { y: e.touches[0].clientY, dy: 0, active: true, base: base === 'none' ? '' : base };
  };
  const onMove = (e: React.TouchEvent) => {
    if (!drag.current.active) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    // Keep any layout transform (the sheet is centred with translateY(-50%) on wide screens).
    if (ref.current) ref.current.style.transform = `${drag.current.base} translateY(${drag.current.dy}px)`;
  };
  const onEnd = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (drag.current.dy > 110) onClose();
    else if (ref.current) ref.current.style.transform = '';
  };
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Dialog'} ref={ref} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
        <div className="sheet-grip" aria-hidden />
        <div className="sheet-head">
          <h2 className="display t-md">{title}</h2>
          <IconButton label="Close" className="filled" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

// ---------- Toasts + confirm (imperative API) ----------
interface ToastItem { id: number; msg: string; kind: 'info' | 'error'; at: number; action?: { label: string; run: () => void } }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let tid = 0;
export function toast(msg: string, opts: { action?: ToastItem['action']; kind?: ToastItem['kind']; ms?: number } = {}) {
  const id = ++tid;
  // The same message again replaces the earlier one instead of stacking a copy.
  useToasts.setState((s) => ({ items: [...s.items.filter((t) => t.msg !== msg).slice(-2), { id, msg, kind: opts.kind ?? 'info', at: Date.now(), action: opts.action }] }));
  if (useStore.getState().settings.haptics) haptic(8);
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), opts.ms ?? (opts.action ? 5000 : 2600));
}
export function ToastHost() {
  const items = useToasts((s) => s.items);
  const ref = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  // A new screen drops toasts from earlier screens. Ones raised by the action that navigated (e.g. "Deleted · Undo") stay.
  const path = useRoute().path;
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) return void (firstPath.current = false);
    const cutoff = Date.now() - 600;
    useToasts.setState((s) => (s.items.some((t) => t.at < cutoff) ? { items: s.items.filter((t) => t.at >= cutoff) } : s));
  }, [path]);
  // Keep toasts clear of the floating timer pill (both sit just above the tab bar on phones).
  useLayoutEffect(() => {
    const pill = document.querySelector('.timer-pill');
    if (!items.length || !pill || !ref.current) return setLift(0);
    const overlap = ref.current.getBoundingClientRect().bottom - pill.getBoundingClientRect().top;
    setLift(overlap > -8 ? overlap + 8 : 0);
  }, [items]);
  return (
    <div className="toast-host" role="status" aria-live="polite" ref={ref} style={lift ? { paddingBottom: lift } : undefined}>
      {items.map((t) => (
        <div key={t.id} className={'toast' + (t.kind === 'error' ? ' error' : '')}>
          <span className="grow">{t.msg}</span>
          {t.action && (
            <button className="btn" onClick={() => { t.action!.run(); useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== t.id) })); }}>
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

interface ConfirmReq { title: string; body?: string; confirmLabel?: string; danger?: boolean; resolve: (v: boolean) => void }
const useConfirm = create<{ req: ConfirmReq | null }>(() => ({ req: null }));
export function confirmDialog(o: Omit<ConfirmReq, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => useConfirm.setState({ req: { ...o, resolve } }));
}
export function ConfirmHost() {
  const req = useConfirm((s) => s.req);
  const close = (v: boolean) => {
    req?.resolve(v);
    useConfirm.setState({ req: null });
  };
  return (
    <Sheet open={!!req} onClose={() => close(false)} title={req?.title}>
      {req?.body && <p className="muted" style={{ marginTop: 0 }}>{req.body}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <Button className="grow" onClick={() => close(false)}>Cancel</Button>
        <Button className="grow" variant={req?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{req?.confirmLabel ?? 'Confirm'}</Button>
      </div>
    </Sheet>
  );
}

// ---------- Swipeable card (right = primary action, left = secondary). Buttons must exist elsewhere too. ----------
export function Swipeable({ children, onRight, onLeft, rightLabel, leftLabel, rightIcon, leftIcon }: {
  children: ReactNode; onRight?: () => void; onLeft?: () => void; rightLabel?: string; leftLabel?: string; rightIcon?: ReactNode; leftIcon?: ReactNode;
}) {
  const front = useRef<HTMLDivElement>(null);
  const st = useRef({ x: 0, y: 0, dx: 0, lock: '' as '' | 'h' | 'v' });
  const [dx, setDx] = useState(0);
  const TH = 90;
  const onStart = (e: React.TouchEvent) => {
    st.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, lock: '' };
  };
  const onMove = (e: React.TouchEvent) => {
    const ddx = e.touches[0].clientX - st.current.x;
    const ddy = e.touches[0].clientY - st.current.y;
    if (!st.current.lock) {
      if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy) * 1.3) st.current.lock = 'h';
      else if (Math.abs(ddy) > 10) st.current.lock = 'v';
    }
    if (st.current.lock !== 'h') return;
    if ((ddx > 0 && !onRight) || (ddx < 0 && !onLeft)) return;
    st.current.dx = ddx;
    setDx(ddx);
  };
  const onEnd = () => {
    const d = st.current.dx;
    setDx(0);
    if (st.current.lock !== 'h') return;
    if (d > TH && onRight) { haptic(12); onRight(); }
    else if (d < -TH && onLeft) { haptic(12); onLeft(); }
  };
  return (
    <div className="swipe-wrap" onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd}>
      <div className={'swipe-under' + (dx !== 0 ? ' active' : '')} aria-hidden style={{ background: dx > 0 ? 'color-mix(in srgb, var(--accent) 20%, var(--glass-strong))' : dx < 0 ? 'var(--glass-strong)' : 'transparent' }}>
        <span className="l" style={{ opacity: dx > 0 ? Math.min(1, dx / TH) : 0 }}>{rightIcon}{rightLabel}</span>
        <span className="r" style={{ opacity: dx < 0 ? Math.min(1, -dx / TH) : 0 }}>{leftLabel}{leftIcon}</span>
      </div>
      <div className="swipe-front" ref={front} style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform .25s ease' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

/** Debounced autosave hook for drafts. Calls save(value) 600ms after the last change. */
export function useAutosave<T>(value: T, save: (v: T) => void, deps: unknown[] = []) {
  // Compare against the initial value instead of a first-run flag: StrictMode runs effects twice in development.
  const initial = useRef(JSON.stringify(value));
  const pending = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => {
    if (initial.current !== undefined && JSON.stringify(value) === initial.current) return;
    initial.current = undefined as unknown as string;
    setStatus('saving');
    const run = () => {
      if (pending.current !== run) return; // already saved by the hide flush below
      pending.current = null;
      save(value);
      setStatus('saved');
    };
    pending.current = run;
    const t = setTimeout(run, 600);
    return () => {
      clearTimeout(t);
      if (pending.current === run) pending.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ...deps]);
  // If the app is hidden or closed mid-debounce, save now. Capture phase so this runs before the store's own
  // hide/pagehide flush to IndexedDB (store.ts), which then includes this edit.
  useEffect(() => {
    const flush = () => pending.current?.();
    const onVis = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('visibilitychange', onVis, true);
    window.addEventListener('pagehide', flush, true);
    return () => {
      window.removeEventListener('visibilitychange', onVis, true);
      window.removeEventListener('pagehide', flush, true);
    };
  }, []);
  return status;
}
