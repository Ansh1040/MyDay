// Install guide: Android APK, Android Chrome, iOS Safari (web app), desktop Chrome/Edge — plus a real Install
// button when the browser offers one (beforeinstallprompt).
import { useState } from 'react';
import { create } from 'zustand';
import { Download, Smartphone, Monitor, Tablet, CheckCircle2, Share, MoreVertical, SquarePlus, PackageOpen, Info } from 'lucide-react';
import { isNative, isStandalonePWA } from '../../lib/platform';
import { navigate } from '../../lib/router';
import { Screen, Button, Section, toast } from '../../components/ui';
import '../../styles/you.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

// The browser fires `beforeinstallprompt` early, often before this screen is opened, so capture it at module load.
const useInstall = create<{ evt: BeforeInstallPromptEvent | null; installed: boolean }>(() => ({ evt: null, installed: false }));
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ evt: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ evt: null, installed: true }));
}

type Guide = 'apk' | 'android' | 'ios' | 'desktop';

function detect() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const firefox = /Firefox|FxiOS/i.test(ua);
  const edge = /Edg\//i.test(ua);
  const safari = /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|Android|FxiOS/i.test(ua);
  const native = isNative();
  const standalone = isStandalonePWA();
  const primary: Guide = native ? 'apk' : ios ? 'ios' : android ? 'android' : 'desktop';
  const where = native ? 'the Android app' : ios ? 'an iPhone or iPad' : android ? 'an Android phone or tablet' : 'a computer';
  const browser = edge ? 'Edge' : firefox ? 'Firefox' : safari ? 'Safari' : /Chrome|CriOS/i.test(ua) ? 'Chrome' : 'your browser';
  return { ios, android, firefox, edge, safari, native, standalone, primary, where, browser };
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="in-steps">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ol>
  );
}

export function InstallScreen() {
  const d = detect();
  const evt = useInstall((s) => s.evt);
  const installed = useInstall((s) => s.installed);
  const [busy, setBusy] = useState(false);

  const install = async () => {
    if (!evt) return;
    setBusy(true);
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      useInstall.setState({ evt: null });
      toast(choice.outcome === 'accepted' ? 'Installing Elsewhere…' : 'Install cancelled. You can install later from the browser menu.');
    } catch {
      toast('The browser didn’t open its install prompt. Use its menu instead (steps below).', { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const guides: Record<Guide, { title: string; icon: React.ReactNode; body: React.ReactNode }> = {
    apk: {
      title: 'Android app (APK)',
      icon: <PackageOpen size={20} aria-hidden />,
      body: (
        <>
          <Steps
            items={[
              <>Get the Elsewhere APK file onto your phone — for example <span className="mono small">app-debug.apk</span>, built from this project with <span className="mono small">npm run android:apk</span>.</>,
              <>Open the file from Files or Downloads.</>,
              <>If Android asks, allow <b>Install unknown apps</b> for the app you opened it from (Settings → Apps → Special app access → Install unknown apps).</>,
              <>Tap <b>Install</b>, then <b>Open</b>.</>,
            ]}
          />
          <p className="small muted">
            Because it isn’t from the Play Store, Android will warn that it comes from an unknown source. When asked, allow notifications; for on-time
            reminders also allow <b>Alarms & reminders</b>, and consider turning off battery optimisation for Elsewhere.
          </p>
          <p className="small muted">
            Updating: installing a newer APK signed with the same key keeps your data. If Android refuses (“App not installed”), export your data, uninstall,
            install the new version and import.
          </p>
        </>
      ),
    },
    android: {
      title: 'Android — Chrome',
      icon: <Smartphone size={20} aria-hidden />,
      body: (
        <>
          <Steps
            items={[
              <>Open Elsewhere in Chrome.</>,
              <>Tap the <MoreVertical size={14} aria-label="three-dot menu" style={{ display: 'inline', verticalAlign: '-2px' }} /> menu.</>,
              <>Tap <b>Install app</b> (on some versions, <b>Add to Home screen</b>), then confirm.</>,
            ]}
          />
          <p className="small muted">This installs the web app. Its notifications work only while it’s open; the Android APK (above) can notify while closed.</p>
        </>
      ),
    },
    ios: {
      title: 'iPhone & iPad — Safari',
      icon: <Tablet size={20} aria-hidden />,
      body: (
        <>
          <Steps
            items={[
              <>Open Elsewhere in Safari.</>,
              <>Tap the <b>Share</b> button <Share size={14} aria-hidden style={{ display: 'inline', verticalAlign: '-2px' }} />.</>,
              <>Scroll and tap <b>Add to Home Screen</b> <SquarePlus size={14} aria-hidden style={{ display: 'inline', verticalAlign: '-2px' }} />, then <b>Add</b>.</>,
            ]}
          />
          <p className="small muted">
            This adds the <b>web app</b> to your Home Screen — Elsewhere isn’t a native iOS app. It works offline after the first visit; notifications on
            iPhone and iPad are limited, so expect in-app messages while it’s open.
          </p>
        </>
      ),
    },
    desktop: {
      title: 'Computer — Chrome or Edge',
      icon: <Monitor size={20} aria-hidden />,
      body: (
        <>
          <Steps
            items={[
              <>Look for the <b>install</b> icon at the right end of the address bar, or open the browser menu.</>,
              <>Chrome: <b>Cast, save and share → Install page as app</b> (or <b>Install Elsewhere…</b>). Edge: <b>Apps → Install this site as an app</b>.</>,
              <>Elsewhere opens in its own window and appears with your other apps.</>,
            ]}
          />
          <p className="small muted">Safari on macOS: <b>File → Add to Dock</b>. Firefox can’t install web apps on desktop; Elsewhere works fine in a normal tab.</p>
        </>
      ),
    },
  };
  const order: Guide[] = [d.primary, ...(['apk', 'android', 'ios', 'desktop'] as Guide[]).filter((g) => g !== d.primary)];

  return (
    <Screen title="Install Elsewhere" eyebrow="You" backTo="/you" subtitle="Keep Elsewhere on your home screen. It works offline once installed.">
      <div className="card tinted y-panel in-status" role="status">
        {d.native ? (
          <>
            <CheckCircle2 size={22} aria-hidden />
            <div>
              <div className="display t-sm">You’re using the Android app</div>
              <p className="small muted" style={{ margin: '4px 0 0' }}>Nothing to install. Scheduled notifications can fire while the app is closed.</p>
            </div>
          </>
        ) : d.standalone || installed ? (
          <>
            <CheckCircle2 size={22} aria-hidden />
            <div>
              <div className="display t-sm">{installed && !d.standalone ? 'Installed' : 'Installed as a web app'}</div>
              <p className="small muted" style={{ margin: '4px 0 0' }}>
                {installed && !d.standalone ? 'Open Elsewhere from your home screen or app list.' : 'You’re running the installed web app on this device.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <Info size={22} aria-hidden />
            <div className="grow">
              <div className="display t-sm">You’re in {d.browser} on {d.where}</div>
              {evt ? (
                <>
                  <p className="small muted" style={{ margin: '4px 0 10px' }}>Your browser can install Elsewhere directly.</p>
                  <Button variant="primary" icon={<Download size={18} />} onClick={install} disabled={busy}>{busy ? 'Opening…' : 'Install Elsewhere'}</Button>
                </>
              ) : (
                <p className="small muted" style={{ margin: '4px 0 0' }}>
                  {d.ios
                    ? 'Safari doesn’t offer an install button to websites — follow the steps below.'
                    : d.firefox
                      ? 'Firefox doesn’t offer installing here — the steps below cover other options.'
                      : 'No install button is available right now (it can appear after a moment, or not at all if already installed). The steps below always work.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {order.map((g, i) => (
        <Section key={g} title={i === 0 ? 'For this device' : i === 1 ? 'Other devices' : undefined} style={i > 1 ? { marginTop: 12 } : undefined}>
          <article className={'card glass-strong y-panel in-guide' + (i === 0 ? ' primary' : '')}>
            <h2 className="row display t-sm" style={{ gap: 10, margin: '0 0 10px' }}>
              <span className="in-icon">{guides[g].icon}</span> {guides[g].title}
            </h2>
            {guides[g].body}
          </article>
        </Section>
      ))}

      <Section title="Good to know">
        <div className="card glass-strong y-panel">
          <ul className="st-about">
            <li>Your data stays where you use Elsewhere. The Android app, each browser and an installed web app keep <b>separate</b> data — use <button type="button" className="link-btn" onClick={() => navigate('/settings/data')}>export and import</button> to move it.</li>
            <li>Once loaded, the web app works offline. External links in readings need a connection.</li>
            <li>There are no accounts and nothing to sign in to.</li>
          </ul>
        </div>
      </Section>
    </Screen>
  );
}
