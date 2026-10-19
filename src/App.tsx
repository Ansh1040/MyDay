import { Component, useEffect, type ReactNode } from 'react';
import { Compass, Route as RouteIcon, PenSquare, CircleUser, WifiOff } from 'lucide-react';
import { useRoute, navigate, type Route } from './lib/router';
import { useStore } from './store/store';
import { useApplyTheme } from './lib/theme';
import { ToastHost, ConfirmHost, EmptyState, Button } from './components/ui';
import { TimerDock } from './components/common';
import { useBackgroundChecks } from './lib/background';
import { useOnline } from './lib/online';

import { Onboarding } from './screens/onboarding/Onboarding';
import { Discover, SearchScreen, SavedScreen, TopicScreen } from './screens/discover/Discover';
import { PlotTwistScreen } from './screens/discover/PlotTwist';
import { ExperienceView } from './screens/discover/ExperienceView';
import { Journeys } from './screens/journeys/Journeys';
import { RabbitHoleScreen } from './screens/journeys/RabbitHole';
import { SkillsScreen, SkillScreen } from './screens/journeys/SkillArcade';
import { TicketsScreen } from './screens/journeys/Tickets';
import { QuestsScreen, QuestScreen } from './screens/journeys/Quests';
import { CollectionsScreen, CollectionScreen } from './screens/journeys/Collections';
import { PerspectivesScreen, PerspectiveScreen } from './screens/journeys/Perspective';
import { ImportScreen } from './screens/journeys/Import';
import { Create } from './screens/create/Create';
import { NotesScreen, NoteScreen } from './screens/create/FieldNotes';
import { RemixScreen } from './screens/create/Remix';
import { BuilderListScreen, BuilderScreen } from './screens/create/Builder';
import { CapsulesScreen, CapsuleScreen } from './screens/create/Capsules';
import { You } from './screens/you/You';
import { HistoryScreen, EntryScreen } from './screens/you/VersionHistory';
import { CuriosityMapScreen } from './screens/you/CuriosityMap';
import { SettingsScreen } from './screens/you/Settings';
import { InstallScreen } from './screens/you/Install';
import { ProgressScreen } from './screens/you/Progress';

/** Keeps one broken screen from blanking the whole app (tab bar, import, settings stay usable). */
class ScreenBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('Screen crashed', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen container" style={{ paddingTop: 80 }}>
        <EmptyState title="Something went wrong on this screen" body="Your data is safe. Try another screen, or reload the app." action={<Button variant="primary" onClick={() => navigate('/discover', { replace: true })}>Go to Discover</Button>} />
      </div>
    );
  }
}

function renderRoute(r: Route): ReactNode {
  const [a, b, c] = r.segments;
  switch (a) {
    case 'discover': return <Discover />;
    case 'search': return <SearchScreen />;
    case 'saved': return <SavedScreen />;
    case 'topic': return <TopicScreen id={b} />;
    case 'twist': return <PlotTwistScreen />;
    case 'x': return <ExperienceView id={b} />;
    case 'journeys': return <Journeys />;
    case 'rabbit': return <RabbitHoleScreen id={b} />;
    case 'skills': return <SkillsScreen />;
    case 'skill': return <SkillScreen id={b} />;
    case 'tickets': return <TicketsScreen />;
    case 'quests': return <QuestsScreen />;
    case 'quest': return <QuestScreen id={b} />;
    case 'collections': return <CollectionsScreen />;
    case 'collection': return <CollectionScreen id={b} />;
    case 'perspectives': return <PerspectivesScreen />;
    case 'perspective': return <PerspectiveScreen id={b} />;
    case 'import': return <ImportScreen />;
    case 'create': return <Create />;
    case 'notes': return <NotesScreen />;
    case 'note': return <NoteScreen id={b} />;
    case 'remix': return <RemixScreen />;
    case 'builder': return b ? <BuilderScreen id={b} /> : <BuilderListScreen />;
    case 'capsules': return <CapsulesScreen />;
    case 'capsule': return <CapsuleScreen id={b} />;
    case 'you': return <You />;
    case 'history': return <HistoryScreen />;
    case 'entry': return <EntryScreen id={b} />;
    case 'map': return <CuriosityMapScreen />;
    case 'settings': return <SettingsScreen section={b} />;
    case 'install': return <InstallScreen />;
    case 'progress': return <ProgressScreen />;
    default:
      return (
        <div className="screen container" style={{ paddingTop: 80 }}>
          <EmptyState title="This page doesn’t exist" body={`Nothing lives at “${r.path}${c ? '' : ''}”.`} action={<Button variant="primary" onClick={() => navigate('/discover', { replace: true })}>Go to Discover</Button>} />
        </div>
      );
  }
}

const TABS = [
  { id: 'discover', label: 'Discover', icon: Compass, path: '/discover' },
  { id: 'journeys', label: 'Journeys', icon: RouteIcon, path: '/journeys' },
  { id: 'create', label: 'Create', icon: PenSquare, path: '/create' },
  { id: 'you', label: 'You', icon: CircleUser, path: '/you' },
] as const;

/** The theme's artwork, fixed behind every screen (changes with the theme; darkened at night by a veil). */
function Scene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-fill" />
      <div className="scene-art" />
      <div className="scene-veil" />
    </div>
  );
}

function TabBar({ tab }: { tab: Route['tab'] }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-brand display t-lg">Elsewhere</div>
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => navigate(t.path)}>
            <t.icon size={22} strokeWidth={tab === t.id ? 2.3 : 1.8} aria-hidden />
            <span>{t.label}</span>
            <span className="tab-dot" aria-hidden />
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  useApplyTheme();
  const route = useRoute();
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.onboarded);
  const storageError = useStore((s) => s.storageError);
  const online = useOnline();
  useBackgroundChecks();

  useEffect(() => {
    document.title = 'Elsewhere';
  }, [route.path]);

  if (!hydrated) {
    return (
      <div className="container" style={{ paddingTop: 120 }} aria-busy="true">
        <div className="display t-xl">Elsewhere</div>
        <p className="muted">Opening your notebook…</p>
      </div>
    );
  }
  // Shared links can be imported even before onboarding.
  if (!onboarded && route.segments[0] !== 'import') return <><Scene /><Onboarding /><ToastHost /></>;

  return (
    <div className="app">
      <Scene />
      <TabBar tab={route.tab} />
      <div className="app-main">
        {!online && (
          <div className="banner warn" role="status" style={{ borderRadius: 0, justifyContent: 'center', paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
            <WifiOff size={16} aria-hidden /> You’re offline. Everything stored on this device still works; external links won’t open.
          </div>
        )}
        {storageError && <div className="banner error" role="alert" style={{ borderRadius: 0 }}>{storageError}</div>}
        <ScreenBoundary key={route.path}>{renderRoute(route)}</ScreenBoundary>
      </div>
      <TimerDock />
      <ToastHost />
      <ConfirmHost />
    </div>
  );
}
