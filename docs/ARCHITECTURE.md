# Elsewhere — architecture & contributor contract

Elsewhere is a personal discovery app: **Rabbit Hole**, **Plot Twist**, **Skill Arcade** and **Version History**, plus Curiosity Map, Remix Studio, Personal Capsules, Surprise Dial, Experience Builder, Field Notes, Two-Person Quests, Return Tickets, Perspective Switch and Personal Collections.

Primary navigation: **Discover · Journeys · Create · You**.

## Stack
- Vite + React 19 + TypeScript (strict). State: zustand (`src/store/store.ts`) persisted to IndexedDB (`src/lib/db.ts`).
- Icons: `lucide-react` only. No other UI libraries. **Do not add npm dependencies.**
- Android APK via Capacitor 8 (`@capacitor/local-notifications`, `@capacitor/share`, `@capacitor/app`). Web build is an installable PWA (`public/sw.js`).
- Hash router (`src/lib/router.ts`): `navigate('/path?x=1')`, `back(fallback)`, `useRoute()` → `{ segments, query }`.

## Read these before writing code
- `src/data/types.ts` — every data type.
- `src/store/store.ts` — state + actions (`upsert/patch/remove` on entity maps, `complete`, `toggleSave`, `giveFeedback`, `hide`, collections, drafts, `markVisited`, `setRabbitProgress`).
- `src/components/ui.tsx` — Screen, Button, IconButton, Chip, Tag, Field, Toggle, Segmented, Section, ListRow, EmptyState, Progress, Skeleton, Sheet, toast(), confirmDialog(), Swipeable, useAutosave.
- `src/components/common.tsx` — ExperienceCard, MetaLine, TopicTags, OriginTag, AddToCollectionSheet, LinkPicker, LinkedRefs, TimerControl, TimerDock, ENERGY/COMFORT/COST labels.
- `src/data/catalog/index.ts` — catalog accessors (`allExperiences`, `getExperience`, `useExperience`, `getRabbitHole`, `getSkill`, …) and `topics.ts`.
- `src/formats/meta.ts`, `src/formats/registry.ts` — format metadata + Player contract.
- `src/lib/notify.ts`, `src/lib/timers.ts`, `src/lib/share.ts`, `src/lib/refs.ts`, `src/lib/background.ts`, `src/lib/id.ts`.
- `src/styles/themes.css`, `src/styles/base.css` — tokens and classes. Look at class names before inventing new ones.

## Rules
1. **Only theme tokens** (`var(--bg)`, `--surface`, `--surface-2`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--accent`, `--accent-text`, `--accent-ink`, `--accent-soft`, `--success`, `--warning`, `--danger`, `--font-display`, `--font-mono`, `--radius-card`, `--radius-ctl`). Never hard-code colours. Everything must look right in Vermilion/Cobalt/Plum/Graphite × day/night.
2. Index style: editorial, strong type (`.display` classes for headings, `.label` for eyebrows), generous spacing, subtle dividers, varied card layouts. No dashboards, no decorative stats, no glows/gradients, no big decorative artwork.
3. Area-specific CSS goes in your own file `src/styles/<area>.css`, imported from your screen file. Do not edit shared files (types.ts, store.ts, ui.tsx, common.tsx, base.css, themes.css, App.tsx, lib/*) — if you need a change there, describe it in your final report.
4. **Honesty**: never simulate features. No fake users, fake friends, invented statistics, or pretend AI. Rule-based logic must be labelled “rule-based”; template output “template-generated”; curated content “curated”. Patterns in personal data must be literal counts with clear wording, never speculation presented as fact.
5. Mobile-first: touch targets ≥ 44px, safe areas (already handled by Screen/TabBar), visible alternatives for every gesture, keyboard accessible, `aria-label`s on icon buttons, readable contrast.
6. Every list needs a real empty state; async actions need loading/error states; destructive actions need `confirmDialog`; edits autosave (drafts) where sensible.
7. Screens use `<Screen title=… backTo=… actions=…>` (tab roots use `backTo={false}`). Immersive players use `immersive`.
8. Use `uid()` / `nowISO()` from `src/lib/id.ts` for new ids/timestamps.

## Fixed identifiers (shared across files)
- Topics: see `src/data/catalog/topics.ts`.
- Skill ids: `soundscapes`, `sketching`, `creative-coding`, `storytelling`, `field-observation`.
- Rabbit hole ids: `music-mood`, `boredom`, `cities`, `randomness`, `plant-signals`.
- Experience id prefixes: general `g-`, rabbit-hole `r-`, skill `s-`; twist templates `t-`; perspective questions `p-`; quest templates `q-`.
- Required cross-reference experiences (created by the skills catalog): `s-soundscape-first` (project), `s-sound-hunt-walk` (outdoor).
- `simulation` payload kinds: `random-walk`, `life`, `flocking`, `waves`, `spread`, `sound-mood`.
- `game` payload kinds: `pattern-memory`, `rhythm-tap`, `estimate` (uses `items`).
- `listening` payload kinds: `tones`, `soundscape`, `silence`, `rhythm`, `mood-pair`. All audio is synthesised with Web Audio (no media files), except `silence` which is a guided environmental-listening timer.
- `coding` payloads run user JavaScript in a sandboxed Web Worker with a timeout; `checks[].expr` is a JS boolean expression evaluated with `output` (console lines joined by "\n") and `result` in scope.

## URL contract (deep links between areas)
| Purpose | URL |
|---|---|
| Experience player | `/x/<experienceId>` |
| Rabbit hole (at node) | `/rabbit/<id>?node=<nodeId>` |
| Skill | `/skill/<id>`; all skills `/skills` |
| Plot Twist | `/twist` (optional `?id=<twistId>`) |
| New Version History entry | `/entry/new?kind=<EntryKind>&link=<refKind>:<id>&title=<text>` |
| Entry | `/entry/<id>` |
| New field note | `/note/new?kind=<NoteKind>&link=<refKind>:<id>` |
| Remix | `/remix?from=<refKind>:<id>` |
| Builder | `/builder` (list), `/builder/new`, `/builder/<experienceId>` |
| Capsule | `/capsules`, `/capsule/new?kind=<CapsuleKind>&link=<refKind>:<id>`, `/capsule/<id>` |
| Perspective Switch | `/perspectives`, `/perspective/<questionId>` |
| Quests | `/quests` (`?template=<id>` starts one), `/quest/<id>` |
| Collections | `/collections`, `/collection/<id>` |
| Return tickets | `/tickets` |
| Import a share code | `/import` (optional `?d=<code>`) |
| Search | `/search?q=<text>`; topic page `/topic/<topicId>`; saved `/saved` |
| Curiosity Map | `/map` ; Version History `/history`; Progress `/progress` |
| Settings | `/settings` , `/settings/<section>` where section ∈ `appearance`,`profile`,`notifications`,`privacy`,`data`,`about` ; Install `/install` |

`link=<refKind>:<id>` params should be parsed with `parseLinkParam` from `src/lib/links.ts`.

## Shared modules owned by specific areas (others import them)
- `src/components/ReturnTicketSheet.tsx` (Journeys): `ReturnTicketSheet({ open, onClose, target: Ref, nodeId?: string, title: string, defaultStoppedAt?: string })`.
- `src/lib/progress.ts` (Journeys): `skillProgress(skill, completions)` and `useSkillProgress(skillId)` returning `{ currentLevel, levels: { level, practiceDone, practiceTotal, projectDone, complete }[] }`.
- `src/lib/recommend.ts` (Discover): `rankExperiences(opts)` → `{ experience, score, reasons: string[], method: 'rule-based' }[]`, `surpriseMe(comfort)`.
- `src/lib/twists.ts` (Discover): Plot Twist generator.
- `src/lib/remix.ts` (Create): rule-based remix templates.
- `src/lib/dataio.ts` (You): export/import/delete personal data.
- `src/formats/index.ts` (Formats): `FORMATS` registry + `getFormat(key)`.
