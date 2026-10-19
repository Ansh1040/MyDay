// Skill Arcade catalog: five curated skills, each with four levels of short practice + one hands-on project.
// Every experience referenced by a level lives in EXPERIENCES_SKILLS below (ids prefixed `s-`).
import type {
  CodingPayload,
  Experience,
  GamePayload,
  ListeningPayload,
  QuizPayload,
  QuizQuestion,
  SimulationPayload,
  Skill,
  SketchPayload,
  Step,
  StepsPayload,
  WritingPayload,
} from '../types';

// ---------------------------------------------------------------------------
// Small typed helpers (keep payload shapes exactly in line with types.ts)
// ---------------------------------------------------------------------------

type ExpInput = Omit<Experience, 'area' | 'origin' | 'skillId' | 'cost' | 'social'> &
  Partial<Pick<Experience, 'cost' | 'social'>>;

const forSkill =
  (skillId: string) =>
  (e: ExpInput): Experience => ({
    cost: 0,
    social: 'solo',
    ...e,
    area: 'skill',
    origin: 'curated',
    skillId,
  });

const step = (id: string, title: string, body: string, extra: Partial<Omit<Step, 'id' | 'title' | 'body'>> = {}): Step => ({
  id,
  title,
  body,
  ...extra,
});
const steps = (...s: Step[]): StepsPayload => ({ steps: s });
const q = (id: string, prompt: string, options: string[], answer: number, explain?: string): QuizQuestion => ({
  id,
  prompt,
  options,
  answer,
  explain,
});
const quiz = (...questions: QuizQuestion[]): QuizPayload => ({ questions });
const listening = (p: ListeningPayload) => p;
const sketch = (p: SketchPayload) => p;
const writing = (p: WritingPayload) => p;
const coding = (p: CodingPayload) => p;
const game = (p: GamePayload) => p;
const sim = (p: SimulationPayload) => p;

const sound = forSkill('soundscapes');
const draw = forSkill('sketching');
const code = forSkill('creative-coding');
const story = forSkill('storytelling');
const field = forSkill('field-observation');

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const SKILLS: Skill[] = [
  {
    id: 'soundscapes',
    name: 'Soundscapes',
    tagline: 'Listen closely to the world, then shape sound into places and moods.',
    topics: ['sound', 'music', 'mind', 'nature'],
    levels: [
      {
        level: 1,
        name: 'First listening',
        goal: 'Hear the layers in everyday sound and put together a simple first soundscape.',
        practice: ['s-sound-three-layers', 's-sound-hunt-walk', 's-sound-tone-basics'],
        project: 's-soundscape-first',
        unlockAfter: 2,
      },
      {
        level: 2,
        name: 'Layers & texture',
        goal: 'Describe sounds precisely and build a soundscape on purpose from a bed, textures and accents.',
        practice: ['s-sound-vocab-quiz', 's-sound-layer-listen', 's-sound-map-sketch'],
        project: 's-sound-kitchen-mood',
        unlockAfter: 2,
      },
      {
        level: 3,
        name: 'Rhythm, space & time',
        goal: 'Shape how a soundscape moves: pulse, density, dynamics and a change that carries the listener somewhere.',
        practice: ['s-sound-rhythm-tap', 's-sound-mood-sim', 's-sound-foley'],
        project: 's-sound-arc',
        unlockAfter: 2,
      },
      {
        level: 4,
        name: 'Composing places',
        goal: 'Compose a finished sound portrait with intent, and use deep listening to change how you experience real places.',
        practice: ['s-sound-deep-listening', 's-sound-mood-pair', 's-sound-describe'],
        project: 's-sound-portrait',
        unlockAfter: 2,
      },
    ],
    realWorld: [
      'Take a two-minute listening pause on your commute or lunch break to reset your attention.',
      'Record a short soundscape of a trip or a special day — a sound souvenir can be more evocative than a photo.',
      'Design a calm or focus soundscape for your own work, reading or wind-down routine.',
      'Notice which sounds at home or work drain you and change what you can: a ticking clock, a humming fan, a TV left on.',
    ],
  },
  {
    id: 'sketching',
    name: 'Sketching',
    tagline: 'Draw to see better. No talent required — just a pen and some attention.',
    topics: ['art', 'mind', 'craft'],
    levels: [
      {
        level: 1,
        name: 'Lines & looking',
        goal: 'Get comfortable making marks and draw what you actually see, not what you think you see.',
        practice: ['s-sketch-blind-contour', 's-sketch-warmup-lines', 's-sketch-simple-shapes'],
        project: 's-sketch-first-still-life',
        unlockAfter: 2,
      },
      {
        level: 2,
        name: 'Light & proportion',
        goal: 'Measure proportions by sighting and use light and shadow to make flat drawings feel solid.',
        practice: ['s-sketch-value-scale', 's-sketch-negative-space', 's-sketch-proportion-quiz'],
        project: 's-sketch-three-lights',
        unlockAfter: 2,
      },
      {
        level: 3,
        name: 'Movement & depth',
        goal: 'Capture movement quickly with gesture drawing and build convincing space with simple perspective.',
        practice: ['s-sketch-gesture', 's-sketch-one-point', 's-sketch-memory'],
        project: 's-sketch-street-corner',
        unlockAfter: 2,
      },
      {
        level: 4,
        name: 'Sketchbook voice',
        goal: 'Compose with intent, simplify scenes into strong values, and use drawing to record and think about your life.',
        practice: ['s-sketch-thumbnails', 's-sketch-three-values', 's-sketch-visual-notes'],
        project: 's-sketch-day-journal',
        unlockAfter: 2,
      },
    ],
    realWorld: [
      'Sketch a room layout or furniture idea before you move anything heavy.',
      'Draw a quick diagram to explain something to a friend or colleague instead of writing a long message.',
      'Keep a small sketchbook for trips — drawing a place makes you remember it far better than a photo.',
      'Use a five-minute sketch as a screen-free break that resets your focus.',
    ],
  },
  {
    id: 'creative-coding',
    name: 'Creative coding',
    tagline: 'Make patterns, text art and tiny generative worlds with JavaScript.',
    topics: ['code', 'math', 'art'],
    levels: [
      {
        level: 1,
        name: 'First loops',
        goal: 'Use variables, loops and console.log to print patterns you design.',
        practice: ['s-code-countdown', 's-code-staircase', 's-code-basics-quiz'],
        project: 's-code-text-banner',
        unlockAfter: 2,
      },
      {
        level: 2,
        name: 'Functions & chance',
        goal: 'Package ideas into reusable functions and use randomness so every run is a little different.',
        practice: ['s-code-checkerboard', 's-code-random-quiz', 's-code-dice'],
        project: 's-code-name-generator',
        unlockAfter: 2,
      },
      {
        level: 3,
        name: 'Grids & rules',
        goal: 'Use nested loops, arrays and simple rules to grow complex patterns from tiny programs.',
        practice: ['s-code-grid-rules', 's-code-rule-90', 's-code-random-walk'],
        project: 's-code-ascii-landscape',
        unlockAfter: 2,
      },
      {
        level: 4,
        name: 'Generative systems',
        goal: 'Combine seeded randomness, state and rules to build small worlds that evolve over time.',
        practice: ['s-code-seeded-random', 's-code-life-step', 's-code-flocking'],
        project: 's-code-life-world',
        unlockAfter: 2,
      },
    ],
    realWorld: [
      'Write a tiny script to rename, sort or tidy a list of files or notes instead of doing it by hand.',
      'Generate patterns or text art for cards, posters or a personal website header.',
      'Test a hunch with a quick simulation — like how often a dice game ends early — before trusting your gut.',
      'Read and tweak the code behind generative art you admire; many creative coders share their sketches openly.',
    ],
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    tagline: 'Turn moments into stories people want to hear — on the page and out loud.',
    topics: ['writing', 'language', 'people'],
    levels: [
      {
        level: 1,
        name: 'Small stories',
        goal: 'Spot story-worthy moments and tell a tiny story with a clear beginning, change and end.',
        practice: ['s-story-six-words', 's-story-moment-mining', 's-story-basics-quiz'],
        project: 's-story-first-tale',
        unlockAfter: 2,
      },
      {
        level: 2,
        name: 'Characters & scenes',
        goal: 'Bring people to life with specific detail, dialogue and scenes instead of summary.',
        practice: ['s-story-show-not-tell', 's-story-subtext', 's-story-people-watching'],
        project: 's-story-flash-fiction',
        unlockAfter: 2,
      },
      {
        level: 3,
        name: 'Structure & tension',
        goal: 'Control pacing and structure: strong openings, rising stakes and endings that land.',
        practice: ['s-story-first-lines', 's-story-structure-quiz', 's-story-reorder'],
        project: 's-story-spoken',
        unlockAfter: 2,
      },
      {
        level: 4,
        name: 'Voice & craft',
        goal: 'Find your voice, revise ruthlessly, and shape a small collection of stories for real readers.',
        practice: ['s-story-pov-switch', 's-story-cut-half', 's-story-reverse-outline'],
        project: 's-story-zine',
        unlockAfter: 2,
      },
    ],
    realWorld: [
      'Open a presentation or pitch with a 30-second true story instead of a slide of facts.',
      'Tell better stories at dinner: start late, keep one clear change, end on a detail.',
      'Write a toast, speech or thank-you note that people actually remember.',
      'Keep a running list of small moments — it becomes a store of stories and a record of your life.',
    ],
  },
  {
    id: 'field-observation',
    name: 'Field observation',
    tagline: 'Notice more of the world, and keep notes that help you notice even more.',
    topics: ['nature', 'cities', 'science', 'mind'],
    levels: [
      {
        level: 1,
        name: 'Start noticing',
        goal: 'Slow down, use all your senses and keep a simple, dated field note.',
        practice: ['s-field-five-senses', 's-field-notice-wonder', 's-field-sit-spot'],
        project: 's-field-first-page',
        unlockAfter: 2,
      },
      {
        level: 2,
        name: 'Look closer',
        goal: 'Observe precisely — size, shape, number and change — and keep what you see separate from what you assume.',
        practice: ['s-field-observe-infer', 's-field-leaf-study', 's-field-ten-minute-count'],
        project: 's-field-change-series',
        unlockAfter: 2,
      },
      {
        level: 3,
        name: 'Patterns & questions',
        goal: 'Spot patterns, estimate with simple tools, and turn wonderings into questions you can test.',
        practice: ['s-field-estimate', 's-field-patterns-sketch', 's-field-questions'],
        project: 's-field-mini-study',
        unlockAfter: 2,
      },
      {
        level: 4,
        name: 'A lasting practice',
        goal: 'Read places like a detective, track seasonal change, and contribute your observations to something bigger.',
        practice: ['s-field-street-detective', 's-field-phenology', 's-field-spread-sim'],
        project: 's-field-citizen-science',
        unlockAfter: 2,
      },
    ],
    realWorld: [
      'Keep a five-minute field note on walks — dates and details become a record of how your neighbourhood changes.',
      'Use “I notice / I wonder / it reminds me of” to slow down in museums, meetings or disagreements, not just outdoors.',
      'Log birds, plants or insects on a citizen-science platform and help real researchers.',
      'Track your own patterns — sleep, mood, a windowsill plant — by observing first and interpreting second.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Soundscapes
// ---------------------------------------------------------------------------

const SOUNDSCAPES: Experience[] = [
  // Level 1 — First listening
  sound({
    id: 's-sound-three-layers',
    title: 'Near, middle, far',
    summary: 'Three minutes of still listening. Sort every sound you hear into near, middle and far — the first step to hearing in layers.',
    format: 'listening',
    topics: ['sound', 'mind'],
    minutes: 5,
    timerMinutes: 3,
    energy: 1,
    comfort: 1,
    payload: listening({
      kind: 'silence',
      seconds: 180,
      prompts: [
        'Close your eyes, or rest them on one spot.',
        'Near: what can you hear within arm’s reach — your breath, your clothes, a device?',
        'Middle: what can you hear in the room, or just outside it?',
        'Far: reach for the most distant sound you can catch.',
        'Which layer was loudest? Which was easiest to ignore?',
      ],
    }),
    related: ['s-sound-hunt-walk', 's-soundscape-first'],
    followUps: ['Repeat it somewhere completely different and compare the three layers.'],
  }),
  sound({
    id: 's-sound-hunt-walk',
    title: 'Sound-hunting walk',
    summary: 'A 15-minute walk with three timed listening stops. Hunt for the quietest, the most rhythmic and the farthest sound you can find.',
    format: 'outdoor',
    topics: ['sound', 'cities', 'nature', 'movement'],
    minutes: 15,
    timerMinutes: 15,
    energy: 2,
    comfort: 2,
    social: 'either',
    payload: steps(
      step(
        'set-out',
        'Set your ears',
        'Pick a route you can walk for about 15 minutes — a street, a park, even the corridors of a big building. Take your headphones off. You are hunting sounds the way a photographer hunts light: slowly, and on purpose.',
      ),
      step(
        'stop-quiet',
        'Stop 1 · The quietest sound',
        'Stand still for two minutes. Let the loud sounds fade into the background and search for the quietest one you can hear. Describe it in a few words.',
        { timerMinutes: 2, input: 'text' },
      ),
      step(
        'walk-feet',
        'Walk · Listen to your feet',
        'Walk on for three minutes listening only to your footsteps. Notice how they change on different surfaces, in open space and next to walls.',
        { timerMinutes: 3 },
      ),
      step(
        'stop-rhythm',
        'Stop 2 · A repeating sound',
        'Stop for two minutes and find something that repeats: a bird call, a crossing signal, a dripping pipe, a flag snapping. Record 20 seconds of it, or skip the recording and describe its rhythm in your notes.',
        { timerMinutes: 2, input: 'audio' },
      ),
      step(
        'stop-far',
        'Stop 3 · The far edge',
        'At your last stop, listen for the farthest sound you can catch. Point towards it. What is it, and how far away do you think it is?',
        { timerMinutes: 2, input: 'text' },
      ),
      step('trophy', 'Your best find', 'Which sound surprised you most — and would you have noticed it on an ordinary walk?', { input: 'text' }),
    ),
    related: ['s-sound-three-layers', 's-soundscape-first', 's-sound-map-sketch'],
    followUps: [
      'Use your best find as one of the layers in “Your first soundscape”.',
      'Walk the same route at a different time of day and compare what you hear.',
    ],
  }),
  sound({
    id: 's-sound-tone-basics',
    title: 'High, low, loud, soft',
    summary: 'Short synthesised tones that train the four words you’ll use most when shaping sound: pitch, loudness, length and timbre.',
    format: 'listening',
    topics: ['sound', 'music'],
    minutes: 5,
    timerMinutes: 5,
    energy: 1,
    comfort: 1,
    payload: listening({
      kind: 'tones',
      seconds: 120,
      prompts: [
        'Pitch: which tone sounds higher? Pitch follows how fast the air vibrates — faster vibration, higher pitch.',
        'Loudness: which tone sounds louder? Loudness follows how strongly the air pressure swings.',
        'Length: which tone lasts longer? Short sounds feel like accents; long ones feel like backgrounds.',
        'Timbre: two tones at the same pitch can still sound different — smooth, buzzy, hollow. That colour is called timbre.',
        'Which tone felt calmest to you? Which felt most alert?',
      ],
    }),
    related: ['s-sound-vocab-quiz', 's-sound-three-layers'],
  }),
  sound({
    id: 's-soundscape-first',
    title: 'Your first soundscape',
    summary: 'Choose a place and a mood, collect three layers of sound, arrange them into a one-minute piece, then listen back and notice what changed.',
    format: 'project',
    topics: ['sound', 'music', 'mind'],
    minutes: 35,
    energy: 2,
    comfort: 2,
    payload: steps(
      step('mood', 'Choose a mood', 'Start with how you want your soundscape to feel. Pick one — you can change your mind later.', {
        input: 'choice',
        choices: ['Calm', 'Cosy', 'Busy', 'Mysterious', 'Wistful'],
      }),
      step(
        'place',
        'Choose a place',
        'Pick a real place where you can sit for about ten minutes and that fits the mood: a kitchen at night, a balcony, a park bench, a bus stop. Write where you’ll go and why it fits.',
        { input: 'text' },
      ),
      step(
        'bed',
        'Layer 1 · The bed',
        'Find the steady background that never quite stops — fridge hum, wind, distant traffic, rain. Record 30–60 seconds with your phone held still, or write a precise description of it.',
        { timerMinutes: 3, input: 'audio' },
      ),
      step(
        'texture',
        'Layer 2 · The texture',
        'Now find sounds that move and change on top of the bed: birds, footsteps, a kettle starting to boil, leaves. Record another 30–60 seconds, or describe them.',
        { timerMinutes: 3, input: 'audio' },
      ),
      step(
        'accent',
        'Layer 3 · The accent',
        'Catch or make one distinct event that stands out: a door, a bell, a spoon tapping a cup, a laugh. Record it two or three times.',
        { timerMinutes: 3, input: 'audio' },
      ),
      step(
        'arrange',
        'Arrange the layers',
        'Plan a one-minute piece. A simple shape that works:\n0:00 the bed alone\n0:15 bring in the texture\n0:30 the first accent\n0:45 let the texture thin out\n1:00 end on the bed\nWith a multitrack app you can layer your recordings. Without one, play the bed from one device and perform the texture and accents live — or simply write your timeline as a score. Note your arrangement here.',
        { timerMinutes: 10, input: 'text' },
      ),
      step(
        'listen',
        'Listen back',
        'Play the piece — or read your score slowly and imagine it — with your eyes closed. Don’t judge yet; just listen all the way through.',
        { timerMinutes: 2 },
      ),
      step(
        'notice',
        'Notice what changed',
        'Did the mood you chose come through? Did the place sound different once you had split it into layers? Write what you would move, remove or add next time.',
        { input: 'text' },
      ),
    ),
    related: ['s-sound-hunt-walk', 's-sound-three-layers', 's-sound-kitchen-mood'],
    followUps: [
      'Play it to someone without naming the mood and ask what they hear.',
      'Add a Version History reflection on how you listen to that place now.',
    ],
  }),

  // Level 2 — Layers & texture
  sound({
    id: 's-sound-vocab-quiz',
    title: 'Words for what you hear',
    summary: 'Five questions on the vocabulary soundscape makers use — keynotes, signals, soundmarks and more.',
    format: 'quiz',
    topics: ['sound', 'music', 'language'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    payload: quiz(
      q(
        'keynote',
        'The composer R. Murray Schafer called the steady background sound of a place — traffic hum, the sea, wind — its…',
        ['Keynote sound', 'Soundmark', 'Sound signal', 'Echo'],
        0,
        'Like the key of a piece of music, a keynote is the background everything else is heard against. We often stop noticing it.',
      ),
      q(
        'soundmark',
        'A sound unique to a community and valued by it — a particular church bell or foghorn — is a…',
        ['Keynote', 'Soundmark', 'Drone', 'Field recording'],
        1,
        'Schafer coined “soundmark” by analogy with “landmark”.',
      ),
      q(
        'signal',
        'Foreground sounds meant to be noticed — sirens, whistles, alarms — Schafer called…',
        ['Sound signals', 'Ambience', 'Room tone', 'Keynotes'],
        0,
        'Sound signals are designed, or simply loud enough, to be listened to consciously.',
      ),
      q(
        'timbre',
        'A flute and a violin play the same note equally loudly. What makes them sound different?',
        ['Frequency', 'Amplitude', 'Timbre', 'Tempo'],
        2,
        'Timbre is tone colour, shaped by the mix of overtones and by how a sound starts and fades.',
      ),
      q(
        'hifi',
        'In what Schafer called a “hi-fi” soundscape, you can…',
        [
          'Hear distant sounds clearly, because there is little background noise',
          'Only hear recorded music',
          'Hear everything at the same loudness',
          'Hear sounds with lots of echo',
        ],
        0,
        'In quiet countryside, sounds carry and stand apart. In a “lo-fi” soundscape, like a busy city, sounds blur together into a dense mass.',
      ),
    ),
    related: ['s-sound-tone-basics', 's-sound-layer-listen'],
  }),
  sound({
    id: 's-sound-layer-listen',
    title: 'Pull the layers apart',
    summary: 'Listen to a synthesised soundscape and pick out its bed, its textures and its accents one at a time.',
    format: 'listening',
    topics: ['sound', 'music'],
    minutes: 6,
    timerMinutes: 4,
    energy: 1,
    comfort: 1,
    payload: listening({
      kind: 'soundscape',
      seconds: 180,
      prompts: [
        'First listen: just let it wash over you. What place or weather does it suggest?',
        'Find the bed — the steady layer underneath everything. Could you hum along with it?',
        'Find the texture — what moves, flickers or changes?',
        'Count the accents — the distinct events. Are they regular or unpredictable?',
        'If you removed one layer, which would change the mood most?',
      ],
    }),
    related: ['s-sound-three-layers', 's-sound-kitchen-mood'],
  }),
  sound({
    id: 's-sound-map-sketch',
    title: 'Draw a sound map',
    summary: 'Put yourself at the centre of a page and plot every sound you hear by direction and distance.',
    format: 'sketch',
    topics: ['sound', 'maps', 'art'],
    minutes: 10,
    timerMinutes: 8,
    energy: 1,
    comfort: 1,
    payload: sketch({
      prompt:
        'Sit somewhere for eight minutes. Mark yourself with an X in the middle of the page. Each time you hear a sound, place a mark where it seems to come from — near the X for close sounds, towards the edge for far ones. Invent a symbol for each kind: dots for taps, waves for hums, zigzags for harsh sounds.',
      constraints: ['No words until the timer ends — symbols only', 'Bigger marks for louder sounds', 'Add a small key at the end'],
    }),
    related: ['s-sound-hunt-walk', 's-field-first-page'],
    followUps: ['Draw a second map of the same spot at a different time and compare them side by side.'],
  }),
  sound({
    id: 's-sound-kitchen-mood',
    title: 'A mood from kitchen sounds',
    summary: 'Make a 90-second soundscape that carries one mood, using only sounds you can make with everyday objects at home.',
    format: 'project',
    topics: ['sound', 'music', 'craft'],
    minutes: 45,
    energy: 2,
    comfort: 2,
    social: 'either',
    payload: steps(
      step('mood', 'Pick a mood to aim for', 'Choose the feeling your piece should carry.', {
        input: 'choice',
        choices: ['Calm', 'Tense', 'Playful', 'Lonely', 'Anticipation'],
      }),
      step(
        'gather',
        'Gather sound makers',
        'Collect five objects: a glass, a pan lid, rice in a jar, a sheet of paper, a spoon — anything. Try each one three ways (tap, scrape, shake) and list the sounds that fit your mood.',
        { timerMinutes: 8, input: 'text' },
      ),
      step(
        'bed',
        'Record a bed',
        'Make a long, steady sound for 60–90 seconds: a wet finger circling the rim of a glass, rice rolling slowly in a tray, a tap at a trickle. Record it.',
        { timerMinutes: 5, input: 'audio' },
      ),
      step(
        'texture',
        'Record textures',
        'Record two or three shorter takes of sounds that move: crumpling paper, a shaker pattern, pouring water. Slow and soft tends to feel calm; fast and uneven tends to feel tense.',
        { timerMinutes: 8, input: 'audio' },
      ),
      step(
        'accents',
        'Record accents',
        'Record a few single events — a lid knock, a spoon on a glass, a drawer shutting — with a little silence before and after each one.',
        { timerMinutes: 5, input: 'audio' },
      ),
      step(
        'build',
        'Build the piece',
        'Layer the takes in a multitrack editor (Audacity is free on computers), or perform it live: play the bed from one device and add textures and accents by hand while recording on another. Aim for about 90 seconds.',
        { timerMinutes: 12, input: 'audio' },
      ),
      step(
        'test',
        'Test it on a listener',
        'Play it to someone without naming the mood. What did they hear? Write their words next to yours.',
        { input: 'text' },
      ),
    ),
    related: ['s-soundscape-first', 's-sound-foley', 's-sound-layer-listen'],
    followUps: ['Change one thing only — tempo, loudness or the bed — and see whether the mood flips.'],
  }),

  // Level 3 — Rhythm, space & time
  sound({
    id: 's-sound-rhythm-tap',
    title: 'Tap the pulse',
    summary: 'Tap along with synthesised rhythms to train your sense of pulse — the hidden grid that makes sounds feel organised.',
    format: 'game',
    topics: ['sound', 'music', 'movement'],
    minutes: 5,
    energy: 2,
    comfort: 1,
    payload: game({ kind: 'rhythm-tap' }),
    related: ['s-sound-arc', 's-sound-mood-sim'],
    followUps: ['Find a repeating sound outside — a crossing signal, a dripping tap — and tap along with it.'],
  }),
  sound({
    id: 's-sound-mood-sim',
    title: 'Tune a mood',
    summary: 'Play with tempo, pitch and density in a live sound model and find the settings that tip a sound from calm to tense.',
    format: 'simulation',
    topics: ['sound', 'music', 'mind'],
    minutes: 8,
    timerMinutes: 8,
    energy: 1,
    comfort: 1,
    payload: sim({ kind: 'sound-mood' }),
    steps: [
      step(
        'predict',
        'Predict first',
        'Before touching anything: which change do you think will make the sound feel tense fastest?',
        { input: 'choice', choices: ['Faster', 'Higher', 'Busier', 'Not sure'] },
      ),
      step('found', 'What tipped it?', 'After exploring, note the setting that changed the mood most for you. Was your prediction right?', {
        input: 'text',
      }),
    ],
    related: ['s-sound-mood-pair', 's-sound-arc'],
  }),
  sound({
    id: 's-sound-foley',
    title: 'Foley swap',
    summary: 'Film sound artists fake footsteps in snow with cornflour. Recreate three sounds with unexpected objects and see whether they fool you.',
    format: 'experiment',
    topics: ['sound', 'craft'],
    minutes: 15,
    timerMinutes: 15,
    energy: 2,
    comfort: 2,
    payload: steps(
      step(
        'snow',
        'Snow underfoot',
        'Put a few spoonfuls of cornflour (cornstarch) in a sealed freezer bag and squeeze it slowly next to your phone’s microphone. It’s a classic foley trick for crunching snow. Record it.',
        { input: 'audio' },
      ),
      step(
        'fire',
        'Crackling fire',
        'Slowly crumple a piece of cellophane or an empty crisp packet close to the microphone. Change your speed until it crackles like a fire. Record it.',
        { input: 'audio' },
      ),
      step(
        'own',
        'Invent your own',
        'Pick a sound you can’t easily record — hooves, rain on a roof, a creaking ship — and fake it with what you have. Ideas: coconut halves or two cups for hooves, rice sprinkled onto a baking tray for rain, a twisted leather belt for creaks.',
        { input: 'audio' },
      ),
      step(
        'judge',
        'Blind test',
        'A few minutes later, listen back without looking at your notes. Which fake is most convincing, and why do you think it works?',
        { input: 'text' },
      ),
    ),
    related: ['s-sound-kitchen-mood', 's-sound-arc'],
  }),
  sound({
    id: 's-sound-arc',
    title: 'A soundscape with an arc',
    summary: 'Compose a 2–3 minute soundscape that goes somewhere — a beginning, a change and an ending — like dawn arriving or a storm passing.',
    format: 'project',
    topics: ['sound', 'music', 'time'],
    minutes: 50,
    energy: 2,
    comfort: 3,
    payload: steps(
      step(
        'change',
        'Choose the change',
        'Soundscapes become memorable when something changes. Pick a transformation: night to dawn, a market opening, a storm arriving and passing, a train journey, a party winding down. Write it in one line.',
        { input: 'text' },
      ),
      step(
        'timeline',
        'Sketch the timeline',
        'Draw a line for 2–3 minutes and mark three sections: A (before), B (the change), C (after). For each, note the density (sparse or busy), the loudness and the main layers.',
        { input: 'sketch' },
      ),
      step(
        'collect',
        'Collect or make sounds',
        'Gather sounds for each section: field recordings, home foley or your own voice. Aim for at least one bed per section plus a few accents. Label them A, B or C.',
        { timerMinutes: 15, input: 'audio' },
      ),
      step(
        'transition',
        'Design one transition',
        'The moment between sections is the heart of the piece. Choose a technique: a slow crossfade, a sudden cut, a moment of near-silence, or one sound that carries across both sections. Describe your choice.',
        { input: 'text' },
      ),
      step(
        'assemble',
        'Assemble it',
        'Put it together in a multitrack editor, or perform it live in one take while recording. Save the loudest, busiest moment for section B.',
        { timerMinutes: 20, input: 'audio' },
      ),
      step(
        'review',
        'Listen with fresh ears',
        'Take a short break, then listen once without stopping. Where did your attention drift? Where did it sharpen? Note one edit, then make it.',
        { input: 'text' },
      ),
    ),
    related: ['s-soundscape-first', 's-sound-mood-sim', 's-sound-rhythm-tap'],
    followUps: ['Save the finished piece in a Personal Capsule and listen again in six months.'],
  }),

  // Level 4 — Composing places
  sound({
    id: 's-sound-deep-listening',
    title: 'Focal and global listening',
    summary: 'A guided practice inspired by composer Pauline Oliveros: switch between following one sound and taking in every sound at once.',
    format: 'listening',
    topics: ['sound', 'mind', 'music'],
    minutes: 10,
    timerMinutes: 8,
    energy: 1,
    comfort: 2,
    payload: listening({
      kind: 'silence',
      seconds: 480,
      prompts: [
        'Settle somewhere with a mix of sounds. Breathe out slowly.',
        'Focal listening: choose one sound and follow it closely — how it starts, its texture, how it fades.',
        'Global listening: widen your attention to take in every sound at once, like a panorama.',
        'Switch between the two a few times. Which mode is harder for you?',
        'End by listening to your own breathing. How does the space sound now, compared with when you started?',
      ],
    }),
    related: ['s-sound-three-layers', 's-sound-portrait'],
  }),
  sound({
    id: 's-sound-mood-pair',
    title: 'Same sounds, different mood',
    summary: 'Hear two synthesised versions of one soundscape and pin down exactly what makes them feel different.',
    format: 'listening',
    topics: ['sound', 'music', 'mind'],
    minutes: 6,
    timerMinutes: 5,
    energy: 1,
    comfort: 1,
    payload: listening({
      kind: 'mood-pair',
      seconds: 120,
      prompts: [
        'Listen to version A, then version B. Which would you choose for a quiet evening?',
        'Name the difference in at least two of these: tempo, pitch, loudness, density, harmony, space.',
        'Which single change do you think does most of the work?',
        'Where could you use the same trick in your own pieces?',
      ],
    }),
    related: ['s-sound-mood-sim', 's-sound-arc'],
  }),
  sound({
    id: 's-sound-describe',
    title: 'Describe it without naming it',
    summary: 'Write about a sound using only its qualities — never its source. A workout for precise listening.',
    format: 'writing',
    topics: ['sound', 'writing', 'language'],
    minutes: 12,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: writing({
      prompt:
        'Choose one sound around you now, or one of your recordings. Describe it in at least 80 words without saying what makes it. Cover its pitch, loudness, texture, rhythm, where it sits in space, and how it changes over time. Then read it to someone and see whether they can guess the source.',
      minWords: 80,
      hints: [
        'Compare it to textures you can touch: grainy, glassy, woolly, sticky.',
        'Describe its shape over time: does it strike, swell, flutter, fade?',
        'Where is it — left, right, above, far behind you?',
      ],
    }),
    related: ['s-sound-vocab-quiz', 's-sound-portrait'],
  }),
  sound({
    id: 's-sound-portrait',
    title: 'Sound portrait of a place',
    summary: 'Record a place that matters to you at different moments and compose a 3-minute portrait that someone else could recognise.',
    format: 'project',
    topics: ['sound', 'cities', 'music'],
    minutes: 60,
    energy: 2,
    comfort: 3,
    social: 'either',
    payload: steps(
      step(
        'place',
        'Choose your place',
        'Pick a place with meaning for you — a market, your street, a station, a relative’s kitchen. Write why it matters and what you want a listener to feel.',
        { input: 'text' },
      ),
      step(
        'scout',
        'Listen before you record',
        'Spend five minutes there just listening. Note its keynote (the constant background), its signals (sounds that demand attention) and anything that could be its soundmark.',
        { timerMinutes: 5, input: 'text' },
      ),
      step(
        'record',
        'Record three moments',
        'Record 1–2 minutes at three different spots or times — arrival, the busiest moment, the quietest corner. Hold the phone still and keep your own noise low. Be considerate: don’t record private conversations.',
        { timerMinutes: 15, input: 'audio' },
      ),
      step('select', 'Pick your best material', 'Listen back to everything and choose the 4–6 strongest moments. Name each in a few words.', {
        input: 'text',
      }),
      step(
        'compose',
        'Compose three minutes',
        'Arrange them with an arc: an opening that establishes the keynote, a middle that brings in the signals and life, an ending that settles. Use short fades so cuts don’t jar.',
        { timerMinutes: 25, input: 'audio' },
      ),
      step('notes', 'Write liner notes', 'Write three or four sentences to go with it: where, when, and what to listen for.', {
        input: 'text',
      }),
      step(
        'share',
        'Share and ask',
        'Play it to someone and ask what they pictured before you say where it is. Write down what they heard that you didn’t.',
        { input: 'text' },
      ),
    ),
    related: ['s-sound-arc', 's-sound-deep-listening', 's-sound-describe'],
    followUps: [
      'Seal it in a Personal Capsule and listen again in a year.',
      'Go back to the place and just listen, without recording. Does it sound different now?',
    ],
  }),
];

// ---------------------------------------------------------------------------
// Sketching
// ---------------------------------------------------------------------------

const SKETCHING: Experience[] = [
  // Level 1 — Lines & looking
  draw({
    id: 's-sketch-blind-contour',
    title: 'Blind contour of your hand',
    summary: 'Draw your hand without looking at the page. The result will look strange — and you’ll have truly looked.',
    format: 'sketch',
    topics: ['art', 'mind'],
    minutes: 6,
    timerMinutes: 5,
    energy: 1,
    comfort: 1,
    payload: sketch({
      prompt:
        'Hold your non-drawing hand in an interesting pose. Rest your eyes on its edge and let your pen move slowly as your eyes trace every wrinkle and bump. Don’t look down until the timer ends.',
      constraints: ['Don’t look at the page', 'One continuous line', 'Move your eyes and your pen at the same slow speed'],
    }),
    related: ['s-sketch-warmup-lines', 's-sketch-memory'],
    followUps: ['Do a second one where you may glance at the page only three times.'],
  }),
  draw({
    id: 's-sketch-warmup-lines',
    title: 'Confident line warm-up',
    summary: 'Fill a page with straight lines, circles and spirals drawn from the shoulder. Five minutes to loosen up and lose the wobble.',
    format: 'sketch',
    topics: ['art', 'craft'],
    minutes: 5,
    timerMinutes: 5,
    energy: 1,
    comfort: 1,
    payload: sketch({
      prompt:
        'Fill the page with marks: rows of straight lines between pairs of dots, circles of different sizes, spirals and waves. Move from your elbow and shoulder rather than your wrist, and draw each line in one quick stroke — speed makes lines straighter.',
      constraints: [
        'Place two dots, then connect them in one stroke',
        'No erasing — just draw the next one',
        'Keep your eyes on the end dot, not on the pen tip',
      ],
    }),
    related: ['s-sketch-blind-contour', 's-sketch-simple-shapes'],
  }),
  draw({
    id: 's-sketch-simple-shapes',
    title: 'Everything is simple shapes',
    summary: 'Draw five objects around you using only boxes, cylinders, spheres and cones — the hidden skeleton under every drawing.',
    format: 'sketch',
    topics: ['art'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 1,
    payload: sketch({
      prompt:
        'Pick five objects nearby — a mug, a lamp, a shoe, a bottle, a plant pot. For each, draw only the basic shapes it’s built from: a mug is a cylinder plus a curved handle, a lamp might be a cone on a cylinder. Draw lightly and skip all details.',
      constraints: ['Basic shapes only — box, cylinder, sphere, cone', 'Draw through each shape, showing its hidden back edges', 'About two minutes per object'],
    }),
    related: ['s-sketch-first-still-life'],
  }),
  draw({
    id: 's-sketch-first-still-life',
    title: 'Your first still life',
    summary: 'Arrange three objects, light them from one side, and build a drawing in clear stages — from simple shapes to shadows.',
    format: 'project',
    topics: ['art', 'craft'],
    minutes: 35,
    energy: 1,
    comfort: 2,
    payload: steps(
      step(
        'arrange',
        'Set up',
        'Choose three objects of different heights and shapes — say a mug, a piece of fruit and a book. Group them so they overlap a little, with a lamp or window lighting them from one side. Use paper and a pencil or pen.',
      ),
      step(
        'look',
        'Look for one minute',
        'Before drawing, just look. Which object is tallest? Where is the darkest shadow? What shapes do the gaps between objects make?',
        { timerMinutes: 1 },
      ),
      step(
        'shapes',
        'Block in simple shapes',
        'Draw very lightly. Place each object as a simple shape — cylinder, sphere, box — getting their sizes and positions right relative to each other. Fix mistakes now; it’s cheap.',
        { timerMinutes: 8 },
      ),
      step(
        'contour',
        'Refine the outlines',
        'Go over the shapes with firmer lines where the real edges are. Let lines be thicker where objects sit in shadow and thinner where light hits.',
        { timerMinutes: 8 },
      ),
      step(
        'shadow',
        'Add the shadows',
        'Squint to see shadows as simple patches. Shade the side of each object facing away from the light, then add the cast shadows on the table — darkest right where each object touches the surface.',
        { timerMinutes: 10 },
      ),
      step('capture', 'Sign, date and capture', 'Sign and date the drawing — future you will want to compare. Then photograph it.', {
        input: 'photo',
      }),
      step('reflect', 'Reflect', 'Which part are you happiest with? What would you do differently next time?', { input: 'text' }),
    ),
    related: ['s-sketch-simple-shapes', 's-sketch-three-lights'],
    followUps: ['Draw the same arrangement again next week and put the two drawings side by side.'],
  }),

  // Level 2 — Light & proportion
  draw({
    id: 's-sketch-value-scale',
    title: 'Five-step value scale',
    summary: 'Shade a strip from white to black in five even steps, then use those values to turn a circle into a sphere.',
    format: 'sketch',
    topics: ['art'],
    minutes: 12,
    timerMinutes: 12,
    energy: 1,
    comfort: 1,
    payload: sketch({
      prompt:
        'Draw a row of five boxes. Leave the first white, make the last as dark as you can, and shade the three between so each step is an even jump. Then draw a circle, decide where the light comes from, and shade it with your five values: highlight, light, mid-tone, core shadow and a little reflected light near the shadow edge. Finish with a cast shadow on the ground.',
      constraints: [
        'Five distinct values — squint to check the steps look even',
        'Light from one direction only',
        'The darkest part of the cast shadow sits right under the sphere',
      ],
    }),
    related: ['s-sketch-three-lights', 's-sketch-three-values'],
  }),
  draw({
    id: 's-sketch-negative-space',
    title: 'Draw the gaps',
    summary: 'Draw the empty shapes between things — chair legs, plant leaves, fingers — and the object appears by itself.',
    format: 'sketch',
    topics: ['art', 'mind'],
    minutes: 10,
    timerMinutes: 8,
    energy: 1,
    comfort: 1,
    payload: sketch({
      prompt:
        'Find something full of gaps: a chair, a houseplant, a pair of scissors, a bike. Instead of drawing the object, draw the shapes of the spaces around and inside it, and fill those spaces in. Your brain has no fixed idea of what a gap looks like, so you end up drawing what is really there.',
      constraints: ['Draw only the empty shapes', 'Fill the gaps with flat tone', 'Leave the object itself as blank paper'],
    }),
    related: ['s-sketch-blind-contour'],
  }),
  draw({
    id: 's-sketch-proportion-quiz',
    title: 'Seeing proportions',
    summary: 'Five questions on the measuring tricks artists use to get sizes and shadows right.',
    format: 'quiz',
    topics: ['art', 'math'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    payload: quiz(
      q(
        'sighting',
        'When “sighting” proportions with a pencil held out in front of you, what should stay the same every time?',
        ['How tightly you grip the pencil', 'Your arm fully straight and one eye closed', 'The colour of the pencil', 'The distance from you to the paper'],
        1,
        'A locked, straight arm keeps the pencil at the same distance from your eye, so measurements compare fairly. Closing one eye stops double vision.',
      ),
      q(
        'eyes',
        'On a typical adult face seen straight on, the eyes sit about…',
        ['A third of the way down the head', 'Halfway down the head', 'Two-thirds of the way down', 'Near the top of the forehead'],
        1,
        'Beginners often draw eyes too high, forgetting how much of the head is skull and hair above them.',
      ),
      q(
        'heads',
        'A standing adult is roughly how many head-heights tall?',
        ['4', '5', '7 to 8', '10 to 12'],
        2,
        'Real people vary, but about seven and a half heads is a common drawing guide. Children’s heads are larger relative to their bodies.',
      ),
      q(
        'cast',
        'A cast shadow falls…',
        ['Towards the light', 'Away from the light source', 'Always straight down', 'Wherever looks best'],
        1,
        'Shadows stretch from the object in the direction opposite the light. A low light makes long shadows.',
      ),
      q(
        'squint',
        'Why do artists squint at what they’re drawing?',
        ['To see fine detail', 'To simplify it into big shapes of light and dark', 'To rest their eyes', 'To judge colours more precisely'],
        1,
        'Squinting blurs detail and merges similar tones, so the big pattern of light and dark is easier to see.',
      ),
    ),
    related: ['s-sketch-value-scale'],
  }),
  draw({
    id: 's-sketch-three-lights',
    title: 'One object, three lights',
    summary: 'Draw the same mug lit from three directions and watch how light alone changes its shape, mood and drama.',
    format: 'project',
    topics: ['art', 'science'],
    minutes: 40,
    energy: 1,
    comfort: 2,
    payload: steps(
      step(
        'setup',
        'Set up',
        'Put a plain, light-coloured object — a mug, an egg, a bowl — on a table in a dim room. You need one movable light: a desk lamp or a phone torch. Divide a page into three frames.',
      ),
      step(
        'side',
        'Light from the side',
        'Light it from the left or right and draw it in the first frame. Shade with your value scale: lit side, core shadow, reflected light and cast shadow.',
        { timerMinutes: 10 },
      ),
      step(
        'top',
        'Light from above',
        'Move the light directly overhead and draw it again in the second frame. Notice how the cast shadow shrinks to a pool underneath.',
        { timerMinutes: 10 },
      ),
      step(
        'low',
        'Light from low and in front',
        'Hold the light low near the table, pointing slightly upwards at the object, and draw a third time. Now the cast shadow stretches out long behind it.',
        { timerMinutes: 10 },
      ),
      step('capture', 'Capture your page', 'Photograph the three drawings together.', { input: 'photo' }),
      step('compare', 'Compare', 'Which version feels most dramatic? Which looks most solid? Which would you choose for a calm picture?', {
        input: 'text',
      }),
    ),
    related: ['s-sketch-value-scale', 's-sketch-first-still-life', 's-sketch-three-values'],
  }),

  // Level 3 — Movement & depth
  draw({
    id: 's-sketch-gesture',
    title: '30-second gestures',
    summary: 'Ten lightning-fast drawings of people or animals in motion. Catch the action, not the details.',
    format: 'sketch',
    topics: ['art', 'movement'],
    minutes: 7,
    timerMinutes: 5,
    energy: 2,
    comfort: 2,
    payload: sketch({
      prompt:
        'Find moving subjects — people in a street, a pet, a sports video you pause and play, or yourself in a mirror. Give each drawing about 30 seconds. Start with one flowing “line of action” for the curve of the whole pose, then hang the head, ribcage and hips on it as simple shapes.',
      constraints: [
        '30 seconds per drawing — move on even if unfinished',
        'Begin every drawing with a single curved line of action',
        'No faces, fingers or clothing details',
      ],
    }),
    related: ['s-sketch-street-corner'],
  }),
  draw({
    id: 's-sketch-one-point',
    title: 'One-point perspective',
    summary: 'Draw a corridor, road or railway running away from you using a single vanishing point.',
    format: 'sketch',
    topics: ['art', 'math'],
    minutes: 12,
    timerMinutes: 12,
    energy: 1,
    comfort: 2,
    payload: sketch({
      prompt:
        'Draw a horizon line across the page at your eye level and put one dot on it: the vanishing point. Every line that runs straight away from you — floor and ceiling edges, kerbs, rails — must head to that dot. Lines running across your view stay horizontal; upright lines stay vertical. Draw a corridor or street with at least three doors or windows getting smaller into the distance.',
      constraints: [
        'One vanishing point, on the horizon line',
        'Lines going away from you always meet at the point',
        'Gaps between repeated objects shrink as they get further away',
      ],
    }),
    related: ['s-sketch-street-corner'],
  }),
  draw({
    id: 's-sketch-memory',
    title: 'Draw it from memory',
    summary: 'Study an object for a minute, hide it, draw it from memory — then look again. You’ll discover exactly what your eyes skip.',
    format: 'experiment',
    topics: ['art', 'mind'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: steps(
      step('look', 'Look hard', 'Choose an object you use every day — a key, a shoe, a tap. Study it for one minute as if you’ll be tested.', {
        timerMinutes: 1,
      }),
      step('draw', 'Hide it and draw', 'Put it out of sight and draw it from memory with as much detail as you can.', {
        timerMinutes: 4,
        input: 'sketch',
      }),
      step('compare', 'Look again', 'Bring it back. List what you missed or got wrong: proportions, the number of holes, which way things face.', {
        input: 'text',
      }),
      step('redraw', 'Second attempt', 'Study it for one more minute, hide it, and draw it again. Did knowing what you missed change how you looked?', {
        timerMinutes: 4,
        input: 'sketch',
      }),
    ),
    related: ['s-sketch-blind-contour', 's-field-observe-infer'],
  }),
  draw({
    id: 's-sketch-street-corner',
    title: 'Urban sketch: a street corner',
    summary: 'Head out and draw a real street scene on location — perspective, people as quick gestures, and notes on what you hear.',
    format: 'outdoor',
    topics: ['art', 'cities'],
    minutes: 50,
    energy: 2,
    comfort: 3,
    payload: steps(
      step(
        'spot',
        'Find your spot',
        'Find a safe, comfortable place with a view down a street or across a square: a bench, a café window, a doorway. Make sure you’re not blocking anyone.',
      ),
      step(
        'thumbs',
        'Three thumbnails',
        'Make three tiny, matchbox-sized sketches of different framings — wide, close, tall. Pick the one with the most interesting shapes.',
        { timerMinutes: 6 },
      ),
      step(
        'perspective',
        'Horizon and vanishing point',
        'Mark your eye level and find where the edges of the street seem to meet. Lightly draw the big lines of buildings, road and kerbs heading there.',
        { timerMinutes: 10 },
      ),
      step('shapes', 'Big shapes first', 'Block in buildings, trees and cars as simple boxes and shapes. Leave windows and signs for later.', {
        timerMinutes: 10,
      }),
      step(
        'people',
        'Add people',
        'Add passers-by as quick gestures. A useful trick: when you’re standing on level ground, the heads of standing adults stay close to the horizon line, whether they’re near or far.',
        { timerMinutes: 8 },
      ),
      step(
        'details',
        'Details and notes',
        'Add a few details that make it this place — a shop sign, a lamp post — then write the date, time, weather and one sound you heard in the margin.',
        { timerMinutes: 8 },
      ),
      step('capture', 'Capture it', 'Photograph your page.', { input: 'photo' }),
    ),
    related: ['s-sketch-one-point', 's-sketch-gesture', 's-field-street-detective'],
    followUps: ['Look up a local Urban Sketchers group — many cities have free meetups where people draw outdoors together.'],
  }),

  // Level 4 — Sketchbook voice
  draw({
    id: 's-sketch-thumbnails',
    title: 'Six thumbnails, one scene',
    summary: 'Draw the same view six tiny ways to find the strongest composition before committing to a drawing.',
    format: 'sketch',
    topics: ['art'],
    minutes: 12,
    timerMinutes: 12,
    energy: 1,
    comfort: 2,
    payload: sketch({
      prompt:
        'Pick a view — out of a window or across a room. Draw six small rectangles. Compose the same scene differently in each: a low horizon, a high horizon, a tight crop on one detail, the main subject on a third-line, a tall vertical frame, and one that breaks a “rule” on purpose.',
      constraints: ['Two minutes per thumbnail', 'Big shapes and darks only — no detail', 'Star the one you’d develop and note why'],
    }),
    related: ['s-sketch-three-values', 's-sketch-day-journal'],
  }),
  draw({
    id: 's-sketch-three-values',
    title: 'Three-value study',
    summary: 'Reduce a scene to just three tones — light, mid and dark. It’s how painters plan pictures that read from across a room.',
    format: 'sketch',
    topics: ['art'],
    minutes: 12,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: sketch({
      prompt:
        'Choose a scene or photo with clear light. Squint until the details dissolve. Draw the big shapes, then sort every area into one of three values: paper white for lights, a flat mid-grey for mid-tones and solid dark for shadows. No gradients, no in-betweens.',
      constraints: [
        'Exactly three values',
        'Fill areas flat — shapes, not lines',
        'Put your darkest dark next to your lightest light at the focal point',
      ],
    }),
    related: ['s-sketch-value-scale', 's-sketch-thumbnails'],
  }),
  draw({
    id: 's-sketch-visual-notes',
    title: 'Visual notes',
    summary: 'Sketchnote a talk, podcast or video: ideas as little drawings, arrows and a few words.',
    format: 'sketch',
    topics: ['art', 'mind', 'writing'],
    minutes: 15,
    timerMinutes: 12,
    energy: 1,
    comfort: 2,
    payload: sketch({
      prompt:
        'Play a short talk or podcast segment, about ten minutes long. Capture its key ideas on one page with simple icons, arrows, boxes and short phrases instead of full sentences. Put the title in big letters at the top.',
      constraints: ['No more than 40 words in total', 'At least five tiny drawings or icons', 'Use arrows to show how ideas connect'],
    }),
    related: ['s-sketch-day-journal'],
  }),
  draw({
    id: 's-sketch-day-journal',
    title: 'A sketched day',
    summary: 'Fill a page with small drawings from a single day, plus captions and a tiny map — an illustrated diary entry.',
    format: 'project',
    topics: ['art', 'time', 'writing'],
    minutes: 60,
    energy: 2,
    comfort: 3,
    payload: steps(
      step(
        'plan',
        'Plan the page',
        'In the morning, divide a sketchbook spread into five or six frames of different sizes, like a comic page. Leave a corner for a small map, and write the date.',
        { timerMinutes: 5 },
      ),
      step('morning', 'Morning frame', 'Draw something from your morning — breakfast, your shoes by the door, the view from a window.', {
        timerMinutes: 10,
      }),
      step('midday', 'Midday frame', 'Draw something from the middle of the day: a quick gesture of a person, your workspace, your lunch.', {
        timerMinutes: 10,
      }),
      step('object', 'An overlooked object', 'Draw one thing you used today but never really looked at — a key, a cup, a ticket.', {
        timerMinutes: 8,
      }),
      step('evening', 'Evening frame', 'Draw the light at the end of the day: a lamp, a window, a street.', { timerMinutes: 10 }),
      step(
        'map',
        'Map and captions',
        'Draw a simple map of where you went, and add a short caption under each frame — something you heard, felt or overheard.',
        { timerMinutes: 12 },
      ),
      step('capture', 'Capture it', 'Photograph the finished spread.', { input: 'photo' }),
      step('reflect', 'Reflect', 'What did drawing make you notice about your day that you would otherwise have missed?', {
        input: 'text',
      }),
    ),
    related: ['s-sketch-thumbnails', 's-sketch-visual-notes', 's-field-first-page'],
    followUps: ['Make one sketched day a week for a month, then lay the pages side by side.'],
  }),
];

// ---------------------------------------------------------------------------
// Creative coding (JavaScript, runs in a Web Worker — console.log only)
// ---------------------------------------------------------------------------

const CREATIVE_CODING: Experience[] = [
  // Level 1 — First loops
  code({
    id: 's-code-countdown',
    title: 'Countdown to liftoff',
    summary: 'Your first loop: change a count-up into a countdown and finish with a flourish.',
    format: 'coding',
    topics: ['code'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 1,
    payload: coding({
      prompt:
        'Loops repeat work for you. Change the loop so it counts down, printing 5, 4, 3, 2, 1 on separate lines, then print "Liftoff!" after the loop.',
      starter: `// A for loop has three parts: where to start; keep going while...; what changes each time.
// This loop counts UP from 1 to 5. Change it so it counts DOWN from 5 to 1.
for (let i = 1; i <= 5; i++) {
  console.log(i);
}

// After the loop, print "Liftoff!"
`,
      checks: [
        { label: 'Counts down 5, 4, 3, 2, 1', expr: "output.trim().startsWith('5\\n4\\n3\\n2\\n1')" },
        { label: 'Ends with Liftoff!', expr: "output.trim().endsWith('Liftoff!')" },
        { label: 'Exactly six lines', expr: "output.trim().split('\\n').length === 6" },
      ],
    }),
    related: ['s-code-staircase'],
    followUps: ['Make it count down from 10 in steps of 2.'],
  }),
  code({
    id: 's-code-staircase',
    title: 'Text staircase',
    summary: 'Use a loop and repeat() to print a staircase of # characters — your first piece of text art.',
    format: 'coding',
    topics: ['code', 'art'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 1,
    payload: coding({
      prompt:
        "Print a staircase of # characters, 5 lines tall: one # on the first line, five on the last. Tip: '#'.repeat(3) gives '###'. Once the checks pass, try other heights and characters.",
      starter: `const height = 5;

for (let i = 1; i <= height; i++) {
  // Build a string of i # characters and print it.

}
`,
      checks: [
        { label: 'Five lines', expr: "output.trim().split('\\n').length === 5" },
        {
          label: 'Each line is one # longer than the last',
          expr: "output.trim().split('\\n').every((line, i) => line === '#'.repeat(i + 1))",
        },
      ],
    }),
    related: ['s-code-countdown', 's-code-text-banner'],
    followUps: ["Right-align the staircase by adding spaces in front: ' '.repeat(height - i)."],
  }),
  code({
    id: 's-code-basics-quiz',
    title: 'JavaScript basics check',
    summary: 'Five quick questions on strings, loops and variables — the building blocks of every sketch.',
    format: 'quiz',
    topics: ['code'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    payload: quiz(
      q('concat', "What does console.log('a' + 'b') print?", ['a b', 'ab', 'a+b', 'An error'], 1, '+ joins strings together with nothing in between.'),
      q(
        'loop',
        'How many times does the body of for (let i = 0; i < 3; i++) run?',
        ['2', '3', '4', 'Forever'],
        1,
        'i takes the values 0, 1 and 2. When i reaches 3, the condition i < 3 is false and the loop stops.',
      ),
      q('repeat', "What is 'ha'.repeat(3)?", ['ha3', 'hahaha', 'ha ha ha', '3ha'], 1, 'repeat() glues copies of a string together.'),
      q(
        'const',
        'Which keyword creates a variable that can’t be reassigned?',
        ['let', 'const', 'var', 'fixed'],
        1,
        'Use const by default and let when the value needs to change, like a loop counter.',
      ),
      q(
        'mod',
        'What does 7 % 3 give?',
        ['2.33', '1', '4', '21'],
        1,
        '% is the remainder operator: 7 divided by 3 is 2 remainder 1. It’s the secret ingredient of many repeating patterns.',
      ),
    ),
    related: ['s-code-countdown'],
  }),
  code({
    id: 's-code-text-banner',
    title: 'Text-art banner',
    summary: 'Build a framed banner that fits any message perfectly — your first program that adapts to its input.',
    format: 'coding',
    topics: ['code', 'art'],
    minutes: 25,
    energy: 2,
    comfort: 2,
    payload: coding({
      prompt:
        'Make a framed banner for a message of your choice, like this:\n+-------------+\n| Hello there |\n+-------------+\nThe frame must fit the message exactly, whatever its length. Every line should be the same width.',
      starter: `// 1. Put your own message here.
const message = 'Hello there';

// 2. The frame is 4 characters wider than the message: '| ' on the left and ' |' on the right.
const width = message.length + 4;

// 3. Build the border: '+', then (width - 2) dashes, then '+'.
const border = '+' + '-'.repeat(width - 2) + '+';

// 4. Print the border, the framed message, and the border again.
console.log(border);
`,
      checks: [
        { label: 'At least three lines', expr: "output.trim().split('\\n').length >= 3" },
        {
          label: 'Top and bottom borders match, like +----+',
          expr: "(() => { const L = output.trim().split('\\n'); return /^\\+-+\\+$/.test(L[0]) && L[0] === L[L.length - 1]; })()",
        },
        {
          label: 'Every line is the same width',
          expr: "(() => { const L = output.trim().split('\\n'); return L.every((l) => l.length === L[0].length); })()",
        },
        {
          label: 'Message lines are framed by "| " and " |"',
          expr: "(() => { const L = output.trim().split('\\n'); return L.length >= 3 && L.slice(1, -1).every((l) => l.startsWith('| ') && l.endsWith(' |')); })()",
        },
      ],
    }),
    steps: [
      step('message', 'Choose a message', 'Pick something worth framing — a greeting, a motto, a name — and put it in the message variable.'),
      step('measure', 'Measure it', 'message.length tells you how wide the frame must be. Print width once to check your maths, then remove that line.'),
      step('frame', 'Print the frame', "Print the border, then '| ' + message + ' |', then the border again. Run it until every check passes."),
      step(
        'two-lines',
        'Stretch: two lines',
        'Add a second, shorter message underneath. Size the frame to the longer one, and use padEnd() on the shorter one so both lines end at the same | edge.',
      ),
      step(
        'style',
        'Make it yours',
        'Once the checks pass, experiment: swap + - | for other characters, or add empty framed lines above and below the message. Copy your favourite into a message to a friend.',
        { input: 'text' },
      ),
    ],
    related: ['s-code-staircase', 's-code-checkerboard'],
  }),

  // Level 2 — Functions & chance
  code({
    id: 's-code-checkerboard',
    title: 'Stripes and checkerboards',
    summary: 'Write your first reusable function and use it twice to build a checkerboard.',
    format: 'coding',
    topics: ['code', 'math', 'art'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: coding({
      prompt:
        "Functions let you name a piece of work and reuse it. Finish stripe(a, b, n) so it returns n characters alternating a and b — stripe('#', '.', 6) gives '#.#.#.'. Then print a 4-row, 6-wide checkerboard where each row starts with the opposite character to the one above.",
      starter: `function stripe(a, b, n) {
  let s = '';
  // Add n characters: a at even positions (0, 2, 4...), b at odd ones.
  // Tip: i % 2 === 0 is true for even numbers.

  return s;
}

console.log(stripe('#', '.', 6)); // should print #.#.#.

// Now print the checkerboard: 4 rows, 6 wide.
// Row 1 starts with '#', row 2 with '.', and so on.
`,
      checks: [
        { label: "stripe('#', '.', 6) prints #.#.#.", expr: "output.trim().split('\\n')[0] === '#.#.#.'" },
        {
          label: 'Four alternating rows follow',
          expr: "output.trim().split('\\n').slice(-4).join('\\n') === '#.#.#.\\n.#.#.#\\n#.#.#.\\n.#.#.#'",
        },
      ],
    }),
    related: ['s-code-text-banner', 's-code-grid-rules'],
    followUps: ['Use stripe() with emoji or longer strings — what other patterns can it make?'],
  }),
  code({
    id: 's-code-random-quiz',
    title: 'How randomness works in code',
    summary: 'Five questions on Math.random, dice rolls and seeds — the tools behind every generative sketch.',
    format: 'quiz',
    topics: ['code', 'math'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    payload: quiz(
      q(
        'range',
        'Math.random() returns…',
        ['A whole number from 0 to 10', 'A decimal from 0 up to, but not including, 1', 'A decimal from 0 to 1, including 1', 'A different type of value each time'],
        1,
        'It can return 0 but never exactly 1, which is what makes the dice formula below work.',
      ),
      q(
        'dice',
        'Which expression gives a fair dice roll from 1 to 6?',
        ['Math.random() * 6', 'Math.floor(Math.random() * 6)', 'Math.floor(Math.random() * 6) + 1', 'Math.round(Math.random() * 6)'],
        2,
        'Math.floor(Math.random() * 6) gives 0–5, and + 1 shifts it to 1–6. Math.round would produce 0–6, with 0 and 6 only half as likely as the rest.',
      ),
      q(
        'pick',
        'How do you pick a random item from an array called words?',
        ['words[Math.random()]', 'words[Math.floor(Math.random() * words.length)]', 'words.random()', 'words[words.length * Math.random() + 1]'],
        1,
        'Scale to the length, round down, and you get a valid index from 0 to length − 1.',
      ),
      q(
        'sixes',
        'You roll a fair die 600 times. How many sixes should you expect?',
        ['Exactly 100', 'Around 100, but rarely exactly 100', 'Around 600', 'There’s no way to say'],
        1,
        'Chance wobbles: results cluster around 100, and the more rolls you make, the smaller the wobble is relative to the total.',
      ),
      q(
        'seed',
        'Why do generative artists often use a “seed” for their randomness?',
        ['To make the code run faster', 'So the same random choices can be replayed exactly', 'To make results more random', 'Because browsers require it'],
        1,
        'JavaScript’s Math.random can’t be seeded, so artists write small seeded generators: same seed, same artwork.',
      ),
    ),
    related: ['s-code-dice', 's-code-seeded-random'],
  }),
  code({
    id: 's-code-dice',
    title: '600 dice rolls',
    summary: 'Simulate hundreds of dice rolls in a blink and watch chance even out — but never perfectly.',
    format: 'coding',
    topics: ['code', 'math'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: coding({
      prompt:
        'Roll a virtual die 600 times and count how often each face comes up. Print one line per face, like "1: 97". Run it several times — the counts change, but they hover around 100.',
      starter: `const counts = [0, 0, 0, 0, 0, 0]; // counts[0] is for face 1 ... counts[5] for face 6

for (let i = 0; i < 600; i++) {
  const face = 1; // replace with a random whole number from 1 to 6
  counts[face - 1]++;
}

for (let f = 1; f <= 6; f++) {
  console.log(f + ': ' + counts[f - 1]);
}
`,
      checks: [
        {
          label: 'Six lines like "1: 97"',
          expr: "output.trim().split('\\n').filter((l) => /^[1-6]: \\d+$/.test(l)).length === 6",
        },
        {
          label: 'Counts add up to 600',
          expr: "output.trim().split('\\n').reduce((sum, l) => sum + Number(l.split(': ')[1] || 0), 0) === 600",
        },
        {
          label: 'Every face lands roughly 100 times (60–140)',
          expr: "output.trim().split('\\n').every((l) => { const n = Number(l.split(': ')[1]); return n >= 60 && n <= 140; })",
        },
      ],
    }),
    related: ['s-code-random-quiz', 's-code-name-generator'],
    followUps: ['Roll two dice and count the totals 2–12. Which total wins, and why?'],
  }),
  code({
    id: 's-code-name-generator',
    title: 'Place-name and poem generator',
    summary: 'Build a little generator that invents place names and a three-line poem — different every time you run it.',
    format: 'coding',
    topics: ['code', 'language', 'writing'],
    minutes: 35,
    energy: 2,
    comfort: 2,
    payload: coding({
      prompt:
        'Invent an imaginary world. Print 5 place names (one per line, each starting with a capital letter and at least 4 letters long), then a line with just ---, then a 3-line poem built from random words. Every run should be different.',
      starter: `const starts = ['ka', 'mor', 'el', 'tis', 'bran', 'ul'];
const middles = ['a', 'en', 'o', 'iri', 'u'];
const ends = ['dor', 'wick', 'mere', 'th', 'lan', 'sk'];

// Step 1: return a random item from any array.
function pick(list) {
  return list[0]; // change this
}

// Step 2: join a start, a middle and an end, then capitalise the first letter.
function placeName() {
  const raw = pick(starts) + pick(middles) + pick(ends);
  return raw; // capitalise: raw[0].toUpperCase() + raw.slice(1)
}

// Step 3: print 5 names, one per line.

// Step 4: print '---', then 3 poem lines built from your own word lists.
`,
      checks: [
        {
          label: 'Five capitalised names come first',
          expr: "output.trim().split('\\n').slice(0, 5).every((l) => /^[A-Z][a-z]{3,}$/.test(l))",
        },
        { label: 'The names are not all the same', expr: "new Set(output.trim().split('\\n').slice(0, 5)).size > 1" },
        { label: 'A --- divider on line 6', expr: "output.trim().split('\\n')[5] === '---'" },
        {
          label: 'Exactly three poem lines after it',
          expr: "(() => { const P = output.trim().split('\\n').slice(6); return P.length === 3 && P.every((l) => l.trim().length > 0); })()",
        },
      ],
    }),
    steps: [
      step('pick', 'Write pick()', 'Make pick(list) return a random item. You need Math.random(), Math.floor() and list.length — the same idea as the dice roll.'),
      step('names', 'Build names', 'Finish placeName() so it capitalises the first letter, then print five names with a loop.'),
      step(
        'poem',
        'Add a poem',
        "Make three word lists — say adjectives, nouns and verbs — and print '---' followed by three lines such as 'the ' + pick(adjectives) + ' ' + pick(nouns) + ' ' + pick(verbs).",
      ),
      step(
        'accent',
        'Tune the accent',
        'Change the syllable lists to give your world a different feel: soft (lu, mi, ela) versus harsh (krag, dur, thak). Run it a few times and write down your favourite name and line.',
        { input: 'text' },
      ),
    ],
    related: ['s-code-dice', 's-code-random-quiz', 's-story-six-words'],
    followUps: ['Use one of your generated names as the setting for a six-word story.'],
  }),

  // Level 3 — Grids & rules
  code({
    id: 's-code-grid-rules',
    title: 'Grid patterns from one rule',
    summary: 'Nested loops plus the % operator turn a single line of logic into a woven pattern.',
    format: 'coding',
    topics: ['code', 'math', 'art'],
    minutes: 12,
    timerMinutes: 12,
    energy: 1,
    comfort: 2,
    payload: coding({
      prompt:
        'The outer loop picks a row (y); the inner loop walks across it (x). Print a 10-wide, 6-tall grid where a cell is # when (x + y) % 3 === 0 and . otherwise. Once it passes, try other rules — (x * y) % 4 === 0, x % (y + 1) === 0, (x - y) % 4 === 0 — and watch new patterns appear.',
      starter: `const W = 10;
const H = 6;

for (let y = 0; y < H; y++) {
  let row = '';
  for (let x = 0; x < W; x++) {
    // add '#' when (x + y) % 3 === 0, otherwise '.'
    row += '.';
  }
  console.log(row);
}
`,
      checks: [
        {
          label: 'Six rows of ten characters',
          expr: "(() => { const L = output.trim().split('\\n'); return L.length === 6 && L.every((l) => l.length === 10); })()",
        },
        {
          label: 'Diagonal pattern matches the rule',
          expr: "output.trim() === '#..#..#..#\\n..#..#..#.\\n.#..#..#..\\n#..#..#..#\\n..#..#..#.\\n.#..#..#..'",
        },
      ],
    }),
    related: ['s-code-checkerboard', 's-code-rule-90'],
  }),
  code({
    id: 's-code-rule-90',
    title: 'A fractal from one rule',
    summary: 'Code a one-dimensional cellular automaton and watch a famous fractal — the Sierpiński triangle — grow from a single cell.',
    format: 'coding',
    topics: ['code', 'math', 'science'],
    minutes: 15,
    timerMinutes: 15,
    energy: 2,
    comfort: 3,
    payload: coding({
      prompt:
        'A cellular automaton updates a row of cells using a rule about neighbours. In Rule 90, a cell is alive in the next row if exactly one of its two neighbours (left or right) is alive now. Starting from one live cell in the middle, print 8 generations.',
      starter: `const WIDTH = 15;
let cells = new Array(WIDTH).fill(0);
cells[7] = 1; // one live cell in the middle

for (let gen = 0; gen < 8; gen++) {
  console.log(cells.map((c) => (c ? '#' : '.')).join(''));

  const next = new Array(WIDTH).fill(0);
  for (let i = 0; i < WIDTH; i++) {
    const left = i > 0 ? cells[i - 1] : 0;
    const right = i < WIDTH - 1 ? cells[i + 1] : 0;
    // Rule 90: alive (1) if exactly one of left and right is alive, otherwise dead (0).
    next[i] = 0; // change this line
  }
  cells = next;
}
`,
      checks: [
        { label: 'Eight generations printed', expr: "output.trim().split('\\n').length === 8" },
        {
          label: 'The triangle appears',
          expr: "output.trim() === '.......#.......\\n......#.#......\\n.....#...#.....\\n....#.#.#.#....\\n...#.......#...\\n..#.#.....#.#..\\n.#...#...#...#.\\n#.#.#.#.#.#.#.#'",
        },
      ],
    }),
    related: ['s-code-grid-rules', 's-code-life-step'],
    followUps: ['Make WIDTH 31 and run 16 generations to see the fractal repeat at a bigger scale.'],
  }),
  code({
    id: 's-code-random-walk',
    title: 'Watch a random walk',
    summary: 'Watch walkers take random steps and see how pure chance still produces recognisable shapes and spreads.',
    format: 'simulation',
    topics: ['code', 'math', 'science'],
    minutes: 6,
    timerMinutes: 5,
    energy: 1,
    comfort: 1,
    payload: sim({ kind: 'random-walk' }),
    steps: [
      step('predict', 'Predict', 'A walker takes 100 random steps of equal length. Where does it usually end up?', {
        input: 'choice',
        choices: ['Back near the start', 'About 100 steps away', 'Somewhere in between'],
      }),
      step(
        'notice',
        'What did you see?',
        'On average a random walker ends up roughly √(number of steps) away from the start — about 10 steps after 100. Did the walkers match that? Did any return to where they began?',
        { input: 'text' },
      ),
    ],
    related: ['s-code-ascii-landscape', 's-code-dice'],
  }),
  code({
    id: 's-code-ascii-landscape',
    title: 'Generative ASCII landscape',
    summary: 'Use a 2D array and a random walk to grow a new range of hills under a starry sky every time you run it.',
    format: 'coding',
    topics: ['code', 'art', 'math'],
    minutes: 45,
    energy: 2,
    comfort: 3,
    payload: coding({
      prompt:
        'Generate a landscape 30 characters wide and 10 rows tall: sky made of ".", hills made of "#" whose heights come from a random walk (each column 1–8 cells tall), and exactly 3 stars "*" placed at random in the top two rows. Every run should give new hills.',
      starter: `const W = 30;
const H = 10;

// Step 1: a grid of sky: H rows, each an array of W '.' characters.
const grid = [];
for (let y = 0; y < H; y++) {
  grid.push(new Array(W).fill('.'));
}

// Step 2: a ground height for each column, using a random walk.
// Start at 4; each column moves by -1, 0 or +1; keep it between 1 and 8.
const heights = [];
let h = 4;
for (let x = 0; x < W; x++) {
  // change h here
  heights.push(h);
}

// Step 3: fill each column from the bottom row up to its height with '#'.
// Hint: the bottom row is grid[H - 1]; a column of height h fills rows H - h to H - 1.

// Step 4: put exactly 3 '*' stars at random columns in the top two rows.

// Step 5: print each row as a string.
for (const row of grid) {
  console.log(row.join(''));
}
`,
      checks: [
        {
          label: 'Ten rows of 30 characters',
          expr: "(() => { const L = output.trim().split('\\n'); return L.length === 10 && L.every((l) => l.length === 30); })()",
        },
        { label: 'Solid ground along the bottom', expr: "output.trim().split('\\n')[9] === '#'.repeat(30)" },
        {
          label: 'Hills rise and fall',
          expr: "output.trim().split('\\n').slice(2, 9).some((l) => l.includes('#') && l.includes('.'))",
        },
        {
          label: 'Stars in the sky',
          expr: "output.trim().split('\\n').slice(0, 2).join('').split('').filter((c) => c === '*').length >= 1",
        },
      ],
    }),
    steps: [
      step('sky', 'Print the empty sky', 'Run the starter as it is: you should see 10 rows of dots. That’s your canvas.'),
      step(
        'walk',
        'Random-walk the heights',
        'Inside the loop, add Math.floor(Math.random() * 3) - 1 to h (that gives -1, 0 or +1), then clamp it with Math.max(1, Math.min(8, h)).',
      ),
      step('fill', 'Fill the hills', 'Loop over each column x, and for each row y from H - heights[x] to H - 1, set grid[y][x] = "#".'),
      step('stars', 'Add stars', 'Pick 3 random columns and a random row (0 or 1) for each, and set those cells to "*". Run until every check passes.'),
      step(
        'variations',
        'Make it your own',
        'Try a snowline (# above a certain height becomes ^), a moon, water "~" in the valleys, or wider steps for jagged mountains. Describe your favourite version.',
        { input: 'text' },
      ),
    ],
    related: ['s-code-random-walk', 's-code-grid-rules', 's-code-life-world'],
  }),

  // Level 4 — Generative systems
  code({
    id: 's-code-seeded-random',
    title: 'Same seed, same world',
    summary: 'Build a tiny seeded random generator so a “random” artwork can be replayed exactly.',
    format: 'coding',
    topics: ['code', 'math'],
    minutes: 15,
    timerMinutes: 15,
    energy: 2,
    comfort: 3,
    payload: coding({
      prompt:
        'Math.random() can’t be replayed, so generative artists often write their own seeded generator: same seed, same numbers, same artwork. Finish this linear congruential generator (LCG). Print five rolls of a 0–99 "die" from makeRandom(42), then five more from a fresh makeRandom(42) — the two lists should match.',
      starter: `function makeRandom(seed) {
  let state = seed;
  return function () {
    // LCG step: state = (state * 1664525 + 1013904223) % 4294967296
    // then return state / 4294967296  (a number from 0 up to 1)
    return 0; // replace
  };
}

const rand = makeRandom(42);
for (let i = 0; i < 5; i++) {
  console.log(Math.floor(rand() * 100));
}

// Now make a second generator with seed 42 and print five more rolls the same way.
`,
      checks: [
        { label: 'Ten rolls printed', expr: "output.trim().split('\\n').length === 10" },
        { label: 'Seed 42 starts 25, 8, 57, 22, 37', expr: "output.trim().split('\\n').slice(0, 5).join(',') === '25,8,57,22,37'" },
        {
          label: 'The same seed replays the same rolls',
          expr: "(() => { const L = output.trim().split('\\n'); return L.length === 10 && L.slice(5).join(',') === L.slice(0, 5).join(','); })()",
        },
      ],
    }),
    related: ['s-code-random-quiz', 's-code-life-world'],
    followUps: ['Try seed 43. A tiny change in the seed gives a completely different sequence.'],
  }),
  code({
    id: 's-code-life-step',
    title: 'One step of the Game of Life',
    summary: 'Write the neighbour-counting heart of Conway’s Game of Life and make a “blinker” flip.',
    format: 'coding',
    topics: ['code', 'math', 'science'],
    minutes: 15,
    timerMinutes: 15,
    energy: 2,
    comfort: 3,
    payload: coding({
      prompt:
        'Conway’s Game of Life updates a grid with two rules: a live cell survives with 2 or 3 live neighbours; a dead cell comes alive with exactly 3. Write countNeighbours() so that a vertical line of three cells — a “blinker” — turns horizontal after one step.',
      starter: `let grid = [
  '.....',
  '..#..',
  '..#..',
  '..#..',
  '.....',
].map((row) => row.split('').map((c) => (c === '#' ? 1 : 0)));

function show(g) {
  g.forEach((row) => console.log(row.map((c) => (c ? '#' : '.')).join('')));
}

// Count live cells among the 8 neighbours of (x, y). Cells beyond the edge count as dead.
function countNeighbours(g, x, y) {
  let n = 0;
  // Loop dy from -1 to 1 and dx from -1 to 1, skip (0, 0), and stay inside the grid.
  return n;
}

function step(g) {
  return g.map((row, y) =>
    row.map((alive, x) => {
      const n = countNeighbours(g, x, y);
      if (alive) return n === 2 || n === 3 ? 1 : 0;
      return n === 3 ? 1 : 0;
    })
  );
}

show(grid);
console.log('');
grid = step(grid);
show(grid);
`,
      checks: [
        {
          label: 'Starts vertical',
          expr: "output.trim().split('\\n\\n')[0] === '.....\\n..#..\\n..#..\\n..#..\\n.....'",
        },
        {
          label: 'Turns horizontal after one step',
          expr: "output.trim().split('\\n\\n')[1] === '.....\\n.....\\n.###.\\n.....\\n.....'",
        },
      ],
    }),
    related: ['s-code-rule-90', 's-code-life-world'],
    followUps: ['Add a third step: the blinker should flip back to vertical.'],
  }),
  code({
    id: 's-code-flocking',
    title: 'Three rules make a flock',
    summary: 'In “boids”, each bird follows three local rules — separation, alignment, cohesion — and a flock emerges with no leader.',
    format: 'simulation',
    topics: ['code', 'nature', 'science'],
    minutes: 8,
    timerMinutes: 8,
    energy: 1,
    comfort: 2,
    payload: sim({ kind: 'flocking' }),
    steps: [
      step('predict', 'Predict', 'Which rule, if removed, do you think would break the flock apart fastest?', {
        input: 'choice',
        choices: ['Separation — don’t crowd your neighbours', 'Alignment — steer the same way as neighbours', 'Cohesion — move towards the group', 'Not sure'],
      }),
      step(
        'notice',
        'What emerged?',
        'Craig Reynolds introduced boids in 1986 to animate flocks. What did you see that no single rule describes on its own? Where have you seen something similar — starlings, fish, crowds?',
        { input: 'text' },
      ),
    ],
    related: ['s-code-life-world', 's-field-spread-sim'],
  }),
  code({
    id: 's-code-life-world',
    title: 'A living world in 16 × 16',
    summary: 'Seed a Game of Life world, run it for 20 generations, track its population — then bend a rule and see its character change.',
    format: 'coding',
    topics: ['code', 'math', 'science', 'art'],
    minutes: 60,
    energy: 3,
    comfort: 4,
    payload: coding({
      prompt:
        'Build a 16 × 16 Game of Life world filled by your seeded generator (each cell alive with probability 0.3). Print "Gen 0: N alive", step it, and keep printing until "Gen 20: N alive" (21 lines). Then print the final grid as 16 rows of # and . characters. Cells beyond the edge count as dead.',
      starter: `// A seeded random generator (from "Same seed, same world").
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const SIZE = 16;
const GENERATIONS = 20;
const rand = makeRandom(7); // try other seeds later

// Step 1: build a SIZE x SIZE grid of 0s and 1s; each cell is 1 when rand() < 0.3.
let grid = [];

// Step 2: reuse your neighbour counting and Life rules.
function countNeighbours(g, x, y) {
  let n = 0;
  return n;
}

function step(g) {
  return g; // replace with the Life rules
}

// Step 3: count live cells in a grid.
function population(g) {
  return 0;
}

// Step 4: print "Gen 0: N alive", then step and print until generation GENERATIONS.

// Step 5: print the final grid, one row per line, using '#' and '.'.
`,
      checks: [
        {
          label: '21 population lines (Gen 0 to Gen 20)',
          expr: "output.trim().split('\\n').filter((l) => /^Gen \\d+: \\d+ alive$/.test(l)).length === 21",
        },
        {
          label: 'Final grid is 16 × 16',
          expr: "output.trim().split('\\n').filter((l) => /^[#.]{16}$/.test(l)).length === 16",
        },
        {
          label: 'Gen 0 has life in it',
          expr: "(() => { const g = output.trim().split('\\n').find((l) => /^Gen 0: \\d+ alive$/.test(l)); return !!g && Number(g.split(' ')[2]) > 0; })()",
        },
        {
          label: 'The world changes over time',
          expr: "new Set(output.trim().split('\\n').filter((l) => /^Gen \\d+: \\d+ alive$/.test(l)).map((l) => l.split(' ')[2])).size > 1",
        },
        {
          label: 'Last population matches the final grid',
          expr: "(() => { const L = output.trim().split('\\n'); const g = L.filter((l) => /^Gen \\d+: \\d+ alive$/.test(l)); const cells = L.filter((l) => /^[#.]{16}$/.test(l)).join(''); return g.length > 0 && Number(g[g.length - 1].split(' ')[2]) === cells.split('').filter((c) => c === '#').length; })()",
        },
      ],
    }),
    steps: [
      step('seed', 'Seed the world', 'Fill the grid using rand() < 0.3 for each cell. Print population(grid) once to check it’s around 77 (30% of 256).'),
      step('rules', 'Bring in the rules', 'Paste or rewrite countNeighbours() and step() from “One step of the Game of Life”.'),
      step('run', 'Run 20 generations', 'Print "Gen 0: N alive", then loop: grid = step(grid) and print the new population, up to generation 20. Then print the grid.'),
      step(
        'twist',
        'Bend a rule',
        'Once all checks pass, change one rule — for example also bring cells to life with 6 neighbours (a variant called HighLife), or let the edges wrap around. Compare the population curve with the original.',
      ),
      step('notes', 'Field notes on your world', 'Which seed and rule gave the most interesting world? What did you notice about how populations rise, crash or settle?', {
        input: 'text',
      }),
    ],
    related: ['s-code-life-step', 's-code-seeded-random', 's-code-flocking'],
    followUps: ['Share your favourite seed and rule with a friend — with a seed, they can recreate your exact world.'],
  }),
];

// ---------------------------------------------------------------------------
// Storytelling
// ---------------------------------------------------------------------------

const STORYTELLING: Experience[] = [
  // Level 1 — Small stories
  story({
    id: 's-story-six-words',
    title: 'Six-word stories',
    summary: 'Write five complete stories in exactly six words each. The constraint makes every word work.',
    format: 'writing',
    topics: ['writing', 'language'],
    minutes: 8,
    timerMinutes: 8,
    energy: 1,
    comfort: 1,
    payload: writing({
      prompt:
        'The six-word story is a well-known micro-form: a whole story — with a change, or a hint of one — in six words. Write five. Try different moods: funny, sad, eerie, hopeful, ordinary.',
      minWords: 30,
      hints: [
        'Imply a before and an after: “Bought two tickets. Used only one.”',
        'Let the reader fill the gap — what’s missing is the story.',
        'Strong verbs and specific nouns beat adjectives.',
      ],
    }),
    related: ['s-story-moment-mining'],
  }),
  story({
    id: 's-story-moment-mining',
    title: 'Story mining',
    summary: 'List ten small moments from the past week in which something shifted. Most good stories start as a tiny moment.',
    format: 'writing',
    topics: ['writing', 'mind', 'time'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 1,
    payload: writing({
      prompt:
        'Look back over the last seven days and list ten small moments when something changed, even slightly: you learned something, felt something unexpected, saw something odd or changed your mind. One or two lines each. Then star the one you’d most like to tell someone.',
      minWords: 60,
      hints: [
        'Small is good: a missed bus, a stranger’s comment, a burnt dinner.',
        'Look for a before and an after — that shift is the heart of a story.',
        'Scroll your photos or messages to jog your memory.',
      ],
    }),
    related: ['s-story-first-tale', 's-story-six-words'],
    followUps: ['Add one moment to the list each evening this week.'],
  }),
  story({
    id: 's-story-basics-quiz',
    title: 'What makes a story?',
    summary: 'Five quick questions on the core ingredients of a story.',
    format: 'quiz',
    topics: ['writing', 'language'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    payload: quiz(
      q(
        'story',
        'Which of these is a story rather than a description?',
        [
          'The café was warm and smelled of coffee.',
          'I sat in the café every morning.',
          'I went to the café to quit my job by text, and left having ordered a second coffee instead.',
          'Cafés are popular in most cities.',
        ],
        2,
        'A story needs something to change — a want, an obstacle, a decision. The others describe a state of affairs.',
      ),
      q(
        'show',
        '“Show, don’t tell” means…',
        ['Use pictures instead of words', 'Let actions and details reveal feelings instead of naming them', 'Never describe anything', 'Always use dialogue'],
        1,
        '“His hands wouldn’t stop folding the receipt” shows nerves; “he was nervous” tells it.',
      ),
      q(
        'drive',
        'What usually drives a story forward?',
        ['A character wanting something and meeting an obstacle', 'Lots of description', 'A surprising last line', 'A large cast of characters'],
        0,
        'Desire plus difficulty creates tension: we keep reading to find out what happens.',
      ),
      q(
        'start',
        'Where is a good place to start a short anecdote?',
        ['With the weather', 'As close to the interesting moment as possible', 'With your full background', 'With the moral'],
        1,
        'Start late: skip the warm-up and drop listeners in just before things change.',
      ),
      q(
        'detail',
        '“A cracked blue thermos” works better than “a bottle” because…',
        ['It is longer', 'It makes the scene concrete and believable', 'Readers like colours', 'It hides the plot'],
        1,
        'Specific details create pictures and quietly suggest character.',
      ),
    ),
    related: ['s-story-six-words'],
  }),
  story({
    id: 's-story-first-tale',
    title: 'Tell a two-minute true story',
    summary: 'Pick a real moment, find what changed, shape it into five beats and tell it out loud — recorded, refined, done.',
    format: 'project',
    topics: ['writing', 'people', 'language'],
    minutes: 35,
    energy: 2,
    comfort: 2,
    social: 'either',
    payload: steps(
      step('pick', 'Pick a moment', 'Choose a small true moment in which something shifted — use your story-mining list if you made one. Write it in one sentence.', {
        input: 'text',
      }),
      step(
        'change',
        'Find the change',
        'Complete this: “Before, I ___. After, I ___.” If you can’t fill it in, choose another moment — the change is the story.',
        { input: 'text' },
      ),
      step(
        'beats',
        'Five beats',
        'Outline it in five short lines:\n1. Where we are and who you are\n2. What you wanted\n3. What got in the way\n4. The turn — the moment it changed\n5. Where it left you',
        { timerMinutes: 8, input: 'text' },
      ),
      step(
        'first-last',
        'First and last lines',
        'Write your exact first line (start as late as you can) and last line (end on the change, not a moral). Everything in between you can tell loosely.',
        { input: 'text' },
      ),
      step('tell', 'Tell it out loud', 'Stand up and tell it to your phone in about two minutes. Don’t read it — glance at your beats if you need to.', {
        timerMinutes: 3,
        input: 'audio',
      }),
      step(
        'refine',
        'Listen and cut',
        'Listen back. Note one thing to cut (a detour, an over-explained bit) and one detail to add that makes it vivid. Then tell it once more.',
        { input: 'text' },
      ),
    ),
    related: ['s-story-moment-mining', 's-story-spoken'],
    followUps: ['Tell it to a friend this week and notice where they lean in.'],
  }),

  // Level 2 — Characters & scenes
  story({
    id: 's-story-show-not-tell',
    title: 'Show the feeling',
    summary: 'Rewrite five flat “telling” sentences as tiny scenes that let the reader feel it without being told.',
    format: 'writing',
    topics: ['writing', 'language'],
    minutes: 12,
    timerMinutes: 10,
    energy: 1,
    comfort: 1,
    payload: writing({
      prompt:
        'Rewrite each sentence as two or three sentences of action, detail or dialogue that show the feeling without naming it:\n1. She was nervous.\n2. The flat was messy.\n3. He was furious.\n4. They were in love.\n5. It was a cold morning.',
      minWords: 80,
      hints: ['What would a camera see? What would a microphone hear?', 'Use the body: hands, breath, posture.', 'One precise detail beats three general ones.'],
    }),
    related: ['s-story-subtext', 's-story-flash-fiction'],
  }),
  story({
    id: 's-story-subtext',
    title: 'Say it without saying it',
    summary: 'Write a short dialogue in which two people want different things — and neither says so directly.',
    format: 'writing',
    topics: ['writing', 'people', 'language'],
    minutes: 12,
    timerMinutes: 12,
    energy: 1,
    comfort: 2,
    payload: writing({
      prompt:
        'Two people are washing up after dinner. One wants to move to another city; the other wants to stay. Write 10–16 lines of dialogue in which nobody mentions moving. Let the tension leak through what they talk about instead — the plates, the neighbours, the weather.',
      minWords: 100,
      hints: [
        'People rarely say exactly what they mean when it matters.',
        'Short replies and sudden changes of subject can carry a lot.',
        'Add one small action between lines — a glass set down too hard.',
      ],
    }),
    related: ['s-story-show-not-tell', 's-story-flash-fiction'],
  }),
  story({
    id: 's-story-people-watching',
    title: 'Character from life',
    summary: 'Sit somewhere public, notice a few real details about passers-by, and invent a character around them — respectfully.',
    format: 'outdoor',
    topics: ['writing', 'people', 'cities'],
    minutes: 15,
    timerMinutes: 12,
    energy: 2,
    comfort: 2,
    payload: steps(
      step(
        'spot',
        'Find a spot',
        'Sit in a café, park, station or library. Be discreet and kind: no photos or recordings of people, and look away if anyone seems uncomfortable.',
      ),
      step(
        'details',
        'Collect details',
        'Over five minutes, note specific details from several different people: a gesture, something they carry, the way they walk, a phrase overheard in passing.',
        { timerMinutes: 5, input: 'text' },
      ),
      step(
        'build',
        'Build a character',
        'Combine details from different people into one invented character. Give them a name, something they want today, and something in their bag they’d never show anyone.',
        { timerMinutes: 7, input: 'text' },
      ),
      step('line', 'One line of dialogue', 'Write one line this character might say that reveals what they want — without stating it.', {
        input: 'text',
      }),
    ),
    related: ['s-story-flash-fiction', 's-field-five-senses'],
  }),
  story({
    id: 's-story-flash-fiction',
    title: 'Write a flash fiction piece',
    summary: 'Draft, cut and title a complete story of about 500 words — with a character, a want, a turn and a final image.',
    format: 'project',
    topics: ['writing', 'language'],
    minutes: 50,
    energy: 2,
    comfort: 2,
    payload: steps(
      step(
        'character',
        'Character and want',
        'Who is this about, and what do they badly want today? Make it concrete: to return a borrowed coat, to win an argument, to be noticed.',
        { input: 'text' },
      ),
      step('setting', 'Setting through the senses', 'Choose one location and note three sensory details beyond sight — a sound, a smell, a texture.', {
        input: 'text',
      }),
      step('turn', 'Obstacle and turn', 'What stands in the way? Then: what is the turn — a choice, a revelation, a reversal — that changes things?', {
        input: 'text',
      }),
      step('draft', 'Draft fast', 'Write the whole story in one go, about 500 words. Start in the middle of the action. Don’t edit yet.', {
        timerMinutes: 20,
        input: 'text',
      }),
      step(
        'cut',
        'Cut 10 percent',
        'Remove at least a tenth of the words: warm-up sentences, repeated ideas, most adverbs. Read it aloud to find the slow parts.',
        { timerMinutes: 10, input: 'text' },
      ),
      step(
        'end',
        'Final image and title',
        'End on a concrete image rather than an explanation. Then choose a title that adds meaning instead of summarising.',
        { input: 'text' },
      ),
    ),
    related: ['s-story-show-not-tell', 's-story-subtext', 's-story-cut-half'],
    followUps: ['Put it away for a week, then reread it and make one more cut.'],
  }),

  // Level 3 — Structure & tension
  story({
    id: 's-story-first-lines',
    title: 'Five ways in',
    summary: 'Write five different opening lines for the same story and feel how each one changes what follows.',
    format: 'writing',
    topics: ['writing', 'language'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: writing({
      prompt:
        'Take a story idea — or your two-minute true story. Write five first lines for it: (1) in the middle of the action, (2) with a question or mystery, (3) in a distinctive voice, (4) with a strange but specific detail, (5) with the ending, then rewind.',
      minWords: 50,
      hints: [
        'After each line, ask: would I want to read the second sentence?',
        'Notice which opening changes the tone completely.',
        'Keep the best two for later.',
      ],
    }),
    related: ['s-story-reorder', 's-story-spoken'],
  }),
  story({
    id: 's-story-structure-quiz',
    title: 'The shapes of stories',
    summary: 'Five questions on story structures from different traditions — from Freytag to kishōtenketsu.',
    format: 'quiz',
    topics: ['writing', 'language', 'history'],
    minutes: 5,
    energy: 1,
    comfort: 2,
    payload: quiz(
      q(
        'freytag',
        'Freytag’s pyramid splits a drama into five parts. Which one is the peak?',
        ['Exposition', 'Rising action', 'Climax', 'Denouement'],
        2,
        'Gustav Freytag described exposition, rising action, climax, falling action and denouement in 1863, analysing classical and Shakespearean drama.',
      ),
      q(
        'medias',
        'Starting a story “in medias res” means starting…',
        ['At the very beginning', 'In the middle of things', 'With the ending', 'With a dream'],
        1,
        'Latin for “into the middle of things” — the Roman poet Horace praised Homer for opening this way.',
      ),
      q(
        'kisho',
        'Kishōtenketsu, a four-part structure found in Chinese, Japanese and Korean writing, is notable because…',
        ['It needs a villain', 'Its third part brings a twist or new angle rather than a conflict', 'It always ends tragically', 'It has no beginning'],
        1,
        'Introduction, development, twist, conclusion: the interest comes from a surprising juxtaposition rather than a fight.',
      ),
      q(
        'chekhov',
        '“Chekhov’s gun” is the principle that…',
        ['Every story needs danger', 'Something introduced prominently should matter later', 'Stories should be short', 'Endings must surprise'],
        1,
        'Anton Chekhov advised that a gun shown in the first act should be fired later — setups need payoffs.',
      ),
      q(
        'stakes',
        'Raising the stakes means…',
        ['Adding more characters', 'Making it matter more what happens if the character fails', 'Writing longer scenes', 'Adding a twist ending'],
        1,
        'Stakes are what’s at risk. Higher stakes make readers care about the outcome.',
      ),
    ),
    related: ['s-story-reverse-outline', 's-story-reorder'],
  }),
  story({
    id: 's-story-reorder',
    title: 'Same events, three orders',
    summary: 'Tell one simple story three ways — in order, from the end, and from the middle — and find which grips hardest.',
    format: 'experiment',
    topics: ['writing', 'mind'],
    minutes: 15,
    timerMinutes: 15,
    energy: 1,
    comfort: 2,
    payload: steps(
      step(
        'events',
        'List four events',
        'Write four events from a simple story, real or invented, in the order they happened. Example: lost keys → searched the flat → found them in the fridge → realised why.',
        { input: 'text' },
      ),
      step('linear', 'Version A · In order', 'Tell it start to finish in four to six sentences.', { timerMinutes: 3, input: 'text' }),
      step('end', 'Version B · Start at the end', 'Open with the final event, then go back and show how it happened.', {
        timerMinutes: 3,
        input: 'text',
      }),
      step('middle', 'Version C · Start in the middle', 'Open at the most tense moment, then fill in how you got there and what happened next.', {
        timerMinutes: 3,
        input: 'text',
      }),
      step('compare', 'Which grips hardest?', 'Read all three back. Which version made you most want to keep reading?', {
        input: 'choice',
        choices: ['A · In order', 'B · From the end', 'C · From the middle'],
      }),
      step(
        'why',
        'Curiosity or suspense?',
        'Starting at the end creates curiosity (“how did this happen?”); keeping the order creates suspense (“what will happen?”). Which did your favourite version use?',
        { input: 'text' },
      ),
    ),
    related: ['s-story-first-lines', 's-story-structure-quiz'],
  }),
  story({
    id: 's-story-spoken',
    title: 'Perform a five-minute story',
    summary: 'Prepare a true story for an audience the way storytelling-night performers do: beats, not a script, rehearsed out loud.',
    format: 'project',
    topics: ['writing', 'people', 'language'],
    minutes: 60,
    energy: 3,
    comfort: 4,
    social: 'either',
    payload: steps(
      step(
        'choose',
        'Choose a story with stakes',
        'Pick a true story in which you had something to lose and you changed in some way. Make sure it’s yours to tell — be careful with other people’s private details.',
        { input: 'text' },
      ),
      step(
        'arc',
        'Find the arc',
        'Write one sentence for who you were at the start and one for who you were at the end. Everything in the story should help move from the first to the second.',
        { input: 'text' },
      ),
      step('beats', 'Map six to eight beats', 'List the beats as short phrases that would fit on one card — not a script. Mark the moment of highest tension.', {
        timerMinutes: 10,
        input: 'text',
      }),
      step(
        'lines',
        'Nail the first and last lines',
        'Learn these two by heart. Start in action; end on the change, ideally echoing something from the beginning.',
        { input: 'text' },
      ),
      step(
        'rehearse',
        'Rehearse out loud three times',
        'Tell it three times standing up, timing each run. Each time, cut what drags and keep what you enjoy telling. Aim for about five minutes.',
        { timerMinutes: 20 },
      ),
      step('perform', 'Perform it', 'Tell it to someone, to a small group, or to a camera in one take.', { timerMinutes: 6, input: 'audio' }),
      step('reflect', 'Reflect', 'Where did it come alive? Where did you rush? What would you change before telling it on a real stage?', {
        input: 'text',
      }),
    ),
    related: ['s-story-first-tale', 's-story-first-lines', 's-story-reorder'],
    followUps: ['Find a local storytelling or open-mic night and go once just to listen.'],
  }),

  // Level 4 — Voice & craft
  story({
    id: 's-story-pov-switch',
    title: 'Switch the point of view',
    summary: 'Retell one small scene from three viewpoints — first person, close third, and an object in the room.',
    format: 'writing',
    topics: ['writing', 'language', 'philosophy'],
    minutes: 15,
    timerMinutes: 15,
    energy: 1,
    comfort: 2,
    payload: writing({
      prompt:
        'Scene: someone gets a text message at a family dinner and leaves the table. Write it three times, about 60 words each: (1) in the first person, as the one who leaves; (2) in close third person, following someone else at the table; (3) from the point of view of an object — the phone, a chair, the dog’s bowl.',
      minWords: 150,
      hints: [
        'Each narrator knows different things — use the gaps.',
        'Voice changes with the narrator: word choice, rhythm, what they notice.',
        'Which version would you continue?',
      ],
    }),
    related: ['s-story-cut-half'],
  }),
  story({
    id: 's-story-cut-half',
    title: 'Cut it in half',
    summary: 'Take something you’ve written and cut it to half its length without losing its heart.',
    format: 'writing',
    topics: ['writing', 'language'],
    minutes: 15,
    timerMinutes: 15,
    energy: 1,
    comfort: 2,
    payload: writing({
      prompt:
        'Take a piece of about 200 words — your flash fiction, a story draft, even a long email. Rewrite it in about 100 words, keeping the character, the want and the turn. Finish with one line on what you cut and whether you miss it.',
      minWords: 80,
      hints: [
        'Cut throat-clearing openings first.',
        'Merge sentences that make the same point.',
        'Replace an adjective plus a noun with one sharper noun.',
      ],
    }),
    related: ['s-story-flash-fiction', 's-story-pov-switch'],
  }),
  story({
    id: 's-story-reverse-outline',
    title: 'Reverse-outline a story you love',
    summary: 'Take apart a short story, episode or film you love, scene by scene, to reveal the structure underneath.',
    format: 'experiment',
    topics: ['writing', 'language'],
    minutes: 15,
    timerMinutes: 15,
    energy: 1,
    comfort: 2,
    payload: steps(
      step('pick', 'Pick a story', 'Choose something short you know well: a short story, a TV episode, a picture book, a favourite film.', {
        input: 'text',
      }),
      step('scenes', 'One line per scene', 'List each scene or section in one line: who, what happens, and what changes.', {
        timerMinutes: 8,
        input: 'text',
      }),
      step('tension', 'Mark the tension', 'Mark each line ↑ if tension rises, ↓ if it falls, or → if it holds. Where is the turn?', { input: 'text' }),
      step('steal', 'Borrow a move', 'What is one structural trick this story uses that you could borrow for your own?', { input: 'text' }),
    ),
    related: ['s-story-structure-quiz', 's-story-zine'],
  }),
  story({
    id: 's-story-zine',
    title: 'Make a mini story zine',
    summary: 'Write three linked micro-stories about one place and fold them into an eight-page zine made from a single sheet of paper.',
    format: 'project',
    topics: ['writing', 'art', 'craft'],
    minutes: 60,
    energy: 2,
    comfort: 3,
    payload: steps(
      step(
        'place',
        'One place, three moments',
        'Choose a place — a bus stop, a launderette, your kitchen — and three moments or people connected to it. Write a line for each.',
        { input: 'text' },
      ),
      step(
        'write',
        'Write three micro-stories',
        'Write three stories of 100–150 words, all set in that place. Let one small object or detail appear in all three.',
        { timerMinutes: 25, input: 'text' },
      ),
      step('revise', 'Revise', 'Read them aloud in order. Cut anything that repeats and make sure each one has its own turn.', { timerMinutes: 8 }),
      step(
        'fold',
        'Fold the zine',
        'Take one A4 or letter sheet. Fold it into eight equal panels (in half three times) and unfold. Fold it in half so the short edges meet, then cut along the centre crease from the folded edge to the next crease line. Open it, fold it lengthwise, and push the ends together so the slit opens into an eight-page booklet. Search “one-page zine fold” if you’d like a diagram.',
        { timerMinutes: 7 },
      ),
      step(
        'layout',
        'Lay it out',
        'Page 1: title and a small drawing. Pages 2–7: your stories and any sketches. Page 8: the date and the place. Write or glue the stories in by hand.',
        { timerMinutes: 15 },
      ),
      step('capture', 'Capture it', 'Photograph the cover or an open spread.', { input: 'photo' }),
      step('share', 'Give it away', 'Who will you give it to? Write their name and what you hope they notice.', { input: 'text' }),
    ),
    related: ['s-story-reverse-outline', 's-story-cut-half', 's-sketch-day-journal'],
    followUps: ['Make a second issue about a different place and swap zines with a friend.'],
  }),
];

// ---------------------------------------------------------------------------
// Field observation
// ---------------------------------------------------------------------------

const FIELD_OBSERVATION: Experience[] = [
  // Level 1 — Start noticing
  field({
    id: 's-field-five-senses',
    title: 'Five-sense check-in',
    summary: 'At a window or outside, notice five things you see, four you hear, three you feel, two you smell and one you taste.',
    format: 'outdoor',
    topics: ['nature', 'mind'],
    minutes: 5,
    timerMinutes: 5,
    energy: 1,
    comfort: 1,
    payload: steps(
      step('see', 'Five things you see', 'Look for small things you normally skip: a colour, a crack, the shape of a shadow.', { input: 'text' }),
      step('hear', 'Four things you hear', 'Include the quiet ones underneath the obvious sounds.', { input: 'text' }),
      step('feel', 'Three things you feel', 'Air on your skin, the texture under your hand, the temperature.', { input: 'text' }),
      step('smell', 'Two things you smell', 'Lean in if you need to: a leaf, your sleeve, the air after rain.', { input: 'text' }),
      step('taste', 'One thing you taste', 'Even just the taste in your mouth right now counts.', { input: 'text' }),
    ),
    related: ['s-field-sit-spot', 's-sound-three-layers'],
  }),
  field({
    id: 's-field-notice-wonder',
    title: 'I notice, I wonder, it reminds me of',
    summary: 'Three simple prompts, popularised by naturalist John Muir Laws, that turn looking into thinking. Try them on one small object.',
    format: 'writing',
    topics: ['nature', 'science', 'writing'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 1,
    payload: writing({
      prompt:
        'Pick one small natural or everyday object — a leaf, a stone, a pine cone, a coin. Write at least three lines for each prompt: “I notice…” (only what you can observe), “I wonder…” (questions), and “It reminds me of…” (connections).',
      minWords: 60,
      hints: [
        'Notice with every sense: weight, temperature, smell, the sound when you tap it.',
        'Wonder freely — no question is too simple.',
        'Connections can be personal: a place, a person, a memory.',
      ],
    }),
    related: ['s-field-first-page', 's-field-questions'],
  }),
  field({
    id: 's-field-sit-spot',
    title: 'Sit spot',
    summary: 'Sit still in one outdoor spot for ten minutes and let the place come back to life around you.',
    format: 'listening',
    topics: ['nature', 'mind', 'sound'],
    minutes: 12,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: listening({
      kind: 'silence',
      seconds: 600,
      prompts: [
        'Find a spot outside — a garden, park bench, balcony or doorstep — and sit comfortably.',
        'Animals and people often react when you arrive. Stay still and let things settle.',
        'Watch for movement at the edges of your vision.',
        'What came closer, or became visible, as you stayed still?',
        'Make this spot yours and come back to it often, in different weather.',
      ],
    }),
    related: ['s-field-five-senses', 's-sound-deep-listening'],
  }),
  field({
    id: 's-field-first-page',
    title: 'Your first field-notes page',
    summary: 'Make one complete field-notes page: date and conditions, a sketch with words, a tiny map, questions and a surprise.',
    format: 'outdoor',
    topics: ['nature', 'science', 'art'],
    minutes: 30,
    energy: 2,
    comfort: 2,
    payload: steps(
      step(
        'header',
        'Header first',
        'Write the date, time, place and weather (temperature, cloud, wind). Field notes have started this way for centuries — it’s what makes them useful years later.',
        { input: 'text' },
      ),
      step('subject', 'Choose a subject', 'Pick one thing to observe closely: a tree, a puddle, a bird feeder, a busy corner, an ant trail.', {
        input: 'text',
      }),
      step(
        'observe',
        'Observe for ten minutes',
        'Make a quick sketch and surround it with words: sizes, colours, counts, movements, sounds. Rough sketches are fine — they’re for looking, not for showing.',
        { timerMinutes: 10, input: 'sketch' },
      ),
      step('map', 'Add a tiny map', 'Draw a small map showing where you are, your subject, and one or two landmarks.', {
        timerMinutes: 4,
        input: 'sketch',
      }),
      step('questions', 'Three questions', 'Write three things you wonder about what you saw.', { input: 'text' }),
      step('surprise', 'One surprise', 'Finish with one sentence: what surprised you?', { input: 'text' }),
    ),
    related: ['s-field-notice-wonder', 's-field-change-series', 's-sound-map-sketch'],
    followUps: ['Return to the same subject next week and start a second page.'],
  }),

  // Level 2 — Look closer
  field({
    id: 's-field-observe-infer',
    title: 'Observation or inference?',
    summary: 'Good field notes keep what you saw separate from what you think it means. Sort these statements.',
    format: 'quiz',
    topics: ['science', 'nature', 'mind'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    payload: quiz(
      q('red', '“The bird has a red patch on its chest.”', ['Observation', 'Inference'], 0, 'You can see it directly.'),
      q(
        'food',
        '“The bird is looking for food.”',
        ['Observation', 'Inference'],
        1,
        'You see it pecking at the ground; “looking for food” is your interpretation. It might be gathering nest material.',
      ),
      q(
        'rain',
        '“It rained last night.” (You see puddles and wet pavements.)',
        ['Observation', 'Inference'],
        1,
        'A reasonable inference — but someone may have washed the street. Write down the evidence: puddles, wet pavement.',
      ),
      q('leaves', '“The leaves on the lower branches are yellow with brown edges.”', ['Observation', 'Inference'], 0, 'Specific, visible and checkable.'),
      q(
        'sick',
        '“This tree is sick.”',
        ['Observation', 'Inference'],
        1,
        'Maybe — or it’s autumn, or a dry spell. Record the symptoms first; the cause is a hypothesis.',
      ),
      q(
        'best',
        'Which is the most useful field-note entry?',
        [
          'Lots of birds, they seemed happy',
          '14:05 — 6 sparrows on the feeder, chirping; 2 chased off by a larger bird',
          'Birds everywhere today',
          'The sparrows were hungry',
        ],
        1,
        'Time, count and behaviour: specific and checkable. Interpretations can follow, labelled as guesses.',
      ),
    ),
    related: ['s-field-ten-minute-count', 's-sketch-memory'],
  }),
  field({
    id: 's-field-leaf-study',
    title: 'Leaf study with scale',
    summary: 'Draw one leaf in close detail with measurements, labels and a scale bar — like a botanist’s plate.',
    format: 'sketch',
    topics: ['plants', 'nature', 'art'],
    minutes: 15,
    timerMinutes: 12,
    energy: 1,
    comfort: 1,
    payload: sketch({
      prompt:
        'Pick up a fallen leaf, or study one on a houseplant. Measure it with a ruler, or use your finger width as a unit. Draw it as large as the page allows. Show the edge (smooth, toothed or lobed), the main vein and how the side veins branch, and any holes, spots or colour changes.',
      constraints: ['Add a scale bar showing real size', 'Label at least three features', 'Note where and when you found it'],
    }),
    related: ['s-field-patterns-sketch', 's-sketch-simple-shapes'],
  }),
  field({
    id: 's-field-ten-minute-count',
    title: 'Ten-minute count',
    summary: 'Pick one thing to count — birds, bikes, bees on a flower, people with umbrellas — and tally it in five two-minute blocks.',
    format: 'outdoor',
    topics: ['nature', 'cities', 'science', 'math'],
    minutes: 12,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: steps(
      step(
        'choose',
        'Choose what to count',
        'Pick something common enough to see several times, and define it exactly: “bees landing on the lavender”, “people with umbrellas”, “birds on the feeder”.',
        { input: 'text' },
      ),
      step('b1', 'Minutes 0–2', 'Tally every one you see.', { timerMinutes: 2, input: 'text' }),
      step('b2', 'Minutes 2–4', 'Keep tallying. Note anything that changes, like a cloud or a passing dog.', { timerMinutes: 2, input: 'text' }),
      step('b3', 'Minutes 4–6', 'Keep tallying.', { timerMinutes: 2, input: 'text' }),
      step('b4', 'Minutes 6–8', 'Keep tallying.', { timerMinutes: 2, input: 'text' }),
      step('b5', 'Minutes 8–10', 'Last block.', { timerMinutes: 2, input: 'text' }),
      step(
        'pattern',
        'Look at the numbers',
        'Did the count rise, fall or bounce around? What might explain it — weather, time, something you did? Write your idea down, clearly marked as a guess.',
        { input: 'text' },
      ),
    ),
    related: ['s-field-observe-infer', 's-field-mini-study'],
    followUps: ['Counting birds? eBird accepts short timed counts from anywhere — your tally can become real data.'],
  }),
  field({
    id: 's-field-change-series',
    title: 'Watch one thing change',
    summary: 'Observe the same subject three times — same spot, same angle — and record what changes and what stays the same.',
    format: 'outdoor',
    topics: ['nature', 'cities', 'science', 'time'],
    minutes: 40,
    energy: 1,
    comfort: 2,
    payload: steps(
      step(
        'choose',
        'Choose a subject and a spot',
        'Pick something that will change within a day or a few days: a flower bud, shadows in a courtyard, a café terrace, a puddle drying, the sky over a roof. Note exactly where you stand so you can return to the same spot.',
        { input: 'text' },
      ),
      step(
        'one',
        'Session 1',
        'Observe for ten minutes. Note the time, light, weather, counts and details. If you like, take a photo from your marked spot.',
        { timerMinutes: 10, input: 'text' },
      ),
      step('two', 'Session 2', 'Come back a few hours or a day later. Same spot, same angle, same ten minutes. Record the same things.', {
        timerMinutes: 10,
        input: 'text',
      }),
      step('three', 'Session 3', 'One more visit at another time. Look especially for things you didn’t notice before.', {
        timerMinutes: 10,
        input: 'text',
      }),
      step('compare', 'Compare', 'List what changed, what stayed the same, and one question about why.', { input: 'text' }),
      step('capture', 'Capture the set', 'If you took photos or sketches, capture them together in one picture.', { input: 'photo' }),
    ),
    related: ['s-field-first-page', 's-field-phenology'],
    followUps: ['Save a Return Ticket between sessions so you remember where you stopped.'],
  }),

  // Level 3 — Patterns & questions
  field({
    id: 's-field-estimate',
    title: 'Field estimates',
    summary: 'Guess numbers every observer can use — the speed of sound, thunder distance, a cricket thermometer and shadow heights.',
    format: 'game',
    topics: ['science', 'nature', 'math'],
    minutes: 6,
    energy: 1,
    comfort: 1,
    payload: game({
      kind: 'estimate',
      items: [
        {
          q: 'How fast does sound travel through air at about 20 °C?',
          answer: 343,
          unit: 'm/s',
          note: 'About 343 metres per second — roughly a kilometre every three seconds.',
        },
        {
          q: 'You see lightning and count 9 seconds before the thunder. Roughly how far away was the strike?',
          answer: 3,
          unit: 'km',
          note: 'Divide the seconds by 3 for kilometres (or by 5 for miles). The light arrives almost instantly; the sound takes about 3 seconds per kilometre.',
        },
        {
          q: 'Dolbear’s law: °F = 50 + (chirps per minute − 40) ÷ 4. A snowy tree cricket chirps 120 times a minute. What’s the temperature in °F?',
          answer: 70,
          unit: '°F',
          note: '50 + 80 ÷ 4 = 70 °F, about 21 °C. Amos Dolbear published the rule in 1897; it works best for this particular species.',
        },
        {
          q: 'You are 1.7 m tall and cast a 1.5 m shadow. A nearby tree casts a 15 m shadow. How tall is the tree?',
          answer: 17,
          unit: 'm',
          note: 'At the same moment, shadows scale with height: 15 ÷ 1.5 = 10, and 10 × 1.7 = 17 m.',
        },
        {
          q: 'Standing on a beach with your eyes 1.7 m above the sea, how far away is the horizon?',
          answer: 4.7,
          unit: 'km',
          note: 'Roughly 3.57 × √(eye height in metres) km. Climb to 20 m and it’s about 16 km.',
        },
      ],
    }),
    related: ['s-field-mini-study', 's-field-patterns-sketch'],
    followUps: ['Next time you’re out on a sunny day, measure a tree with the shadow trick.'],
  }),
  field({
    id: 's-field-patterns-sketch',
    title: 'Patterns in the wild',
    summary: 'Find and sketch three natural or urban patterns — spirals, branches, cracks, tiles — and guess why each one formed.',
    format: 'sketch',
    topics: ['nature', 'math', 'art', 'cities'],
    minutes: 15,
    timerMinutes: 15,
    energy: 2,
    comfort: 2,
    payload: sketch({
      prompt:
        'Go on a short pattern hunt, indoors or out. Find three kinds of pattern — for example a spiral (snail shell, sunflower head, fern tip), branching (trees, leaf veins, cracks, rivers on a map) and a tiling or grid (paving, bricks, honeycomb). Sketch a small patch of each and write one line on what might create it.',
      constraints: ['Three different kinds of pattern', 'Sketch a small patch closely rather than the whole thing', 'Label each with a “maybe because…” guess'],
    }),
    related: ['s-field-leaf-study', 's-code-grid-rules'],
  }),
  field({
    id: 's-field-questions',
    title: 'From wondering to testable',
    summary: 'Turn three loose “I wonder” thoughts into questions you could answer by observing, counting or comparing.',
    format: 'writing',
    topics: ['science', 'nature', 'writing'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: writing({
      prompt:
        'Write down three things you’ve wondered about outdoors, or reuse questions from your field notes. Rewrite each as a question you could answer in an hour with your senses, a watch and some tallies. Then note what you’d count or compare.',
      minWords: 60,
      hints: [
        '“Why do pigeons like this square?” → “Are there more pigeons near the bakery than by the fountain at noon?”',
        'Good field questions say where, when and what to count.',
        'Compare two things: sunny vs shady, morning vs evening, this side vs that side.',
      ],
    }),
    related: ['s-field-notice-wonder', 's-field-mini-study'],
  }),
  field({
    id: 's-field-mini-study',
    title: 'A one-hour field study',
    summary: 'Pick a small question, plan a fair method, collect real counts, and write up what you found — and what you’d change.',
    format: 'outdoor',
    topics: ['science', 'nature', 'cities', 'math'],
    minutes: 60,
    energy: 2,
    comfort: 3,
    payload: steps(
      step(
        'question',
        'Choose your question',
        'Pick something you can answer in an hour by counting or comparing. Ideas: “Does moss really grow more on the north side of trees here?” (a popular rule of thumb that local conditions often break), “Do more bees visit the purple flowers or the yellow ones?”, “Which entrance do more people use?”',
        { input: 'text' },
      ),
      step('predict', 'Predict', 'Write down what you expect to find, and why. It keeps you honest later.', { input: 'text' }),
      step(
        'method',
        'Plan a fair method',
        'Decide exactly what counts, where, and for how long. Keep everything else the same between comparisons — for example 10 trees, all four sides of each, at the same height on the trunk.',
        { input: 'text' },
      ),
      step('collect', 'Collect data', 'Follow your method and record tallies as you go. Note anything odd that might affect the results.', {
        timerMinutes: 25,
        input: 'text',
      }),
      step(
        'summarise',
        'Summarise',
        'Add up your counts and write the totals plus one sentence on what they suggest. With small numbers, say “suggests”, not “proves”.',
        { input: 'text' },
      ),
      step('reflect', 'Reflect', 'Was your prediction right? What would you change to make the study fairer or bigger?', { input: 'text' }),
    ),
    related: ['s-field-questions', 's-field-ten-minute-count', 's-field-estimate'],
    followUps: ['Repeat the study in another season or place and compare the totals.'],
  }),

  // Level 4 — A lasting practice
  field({
    id: 's-field-street-detective',
    title: 'Read a street like a detective',
    summary: 'Walk one street looking for clues to its past and its hidden systems: ghost signs, date stones, worn paths and utility markings.',
    format: 'outdoor',
    topics: ['cities', 'history', 'maps'],
    minutes: 15,
    timerMinutes: 15,
    energy: 2,
    comfort: 2,
    payload: steps(
      step(
        'past',
        'Clues to the past',
        'Look up above the shop fronts. Find a ghost sign (a faded painted advert), a date stone, a bricked-up window, or a change in brick colour where a building was altered.',
        { timerMinutes: 5, input: 'text' },
      ),
      step(
        'paths',
        'Desire paths',
        'Find a desire path — a worn line through grass or a shortcut people take instead of the official route. Where does it go, and what does it say about how people really move?',
        { timerMinutes: 4, input: 'text' },
      ),
      step(
        'hidden',
        'Hidden systems',
        'Spot clues to what runs underground or overhead: manhole covers (often stamped with a maker or purpose), paint marks left by utility crews, cables, drains. Many countries use colour codes — in the US, for example, red marks electric lines, yellow gas, blue drinking water and green sewers.',
        { timerMinutes: 4, input: 'text' },
      ),
      step('theory', 'Your theory', 'From your clues, write a short theory of how this street has changed. Mark what is evidence and what is a guess.', {
        input: 'text',
      }),
    ),
    related: ['s-sketch-street-corner', 's-field-observe-infer'],
    followUps: ['Look up an old map or photo of the street and check your theory.'],
  }),
  field({
    id: 's-field-phenology',
    title: 'Start a seasons log',
    summary: 'Choose three seasonal signals near you — a first blossom, a migrating bird, the first frost — and set up a log to track them year after year.',
    format: 'writing',
    topics: ['nature', 'plants', 'time', 'science'],
    minutes: 10,
    timerMinutes: 10,
    energy: 1,
    comfort: 2,
    payload: writing({
      prompt:
        'Phenology is the study of when seasonal events happen — first leaves, flowering, bird arrivals, first frosts. Long records of these dates are one of the clearest ways to see a changing climate. Choose three signals you can watch near home. For each, write exactly what you’ll record (“first open flower on the cherry tree by the bus stop”), where, and anything you remember from last year.',
      minWords: 60,
      hints: [
        'Pick things you pass often so you won’t miss the date.',
        'Be specific: one particular tree beats “trees in general”.',
        'Set a weekly reminder to check during the season.',
      ],
    }),
    related: ['s-field-change-series', 's-field-citizen-science'],
  }),
  field({
    id: 's-field-spread-sim',
    title: 'How things spread',
    summary: 'Watch something spread through a population in a simple model — seeds, a rumour, an infection — and see how small changes in contact shift the outcome.',
    format: 'simulation',
    topics: ['science', 'nature', 'math'],
    minutes: 8,
    timerMinutes: 8,
    energy: 1,
    comfort: 2,
    payload: sim({ kind: 'spread' }),
    steps: [
      step('predict', 'Predict', 'If each case passes it on to slightly fewer than one other on average, what happens over time?', {
        input: 'choice',
        choices: ['It fades out', 'It grows slowly forever', 'It explodes'],
      }),
      step(
        'notice',
        'What did you see?',
        'Which setting made the biggest difference? Where in your own observations might you see something spreading — a plant, a fashion, a sound?',
        { input: 'text' },
      ),
    ],
    related: ['s-code-flocking', 's-field-citizen-science'],
  }),
  field({
    id: 's-field-citizen-science',
    title: 'Contribute to citizen science',
    summary: 'Follow a real project’s method for one observation session and add your data to something bigger than yourself.',
    format: 'outdoor',
    topics: ['science', 'nature', 'people'],
    minutes: 60,
    energy: 2,
    comfort: 3,
    payload: steps(
      step(
        'pick',
        'Pick a project',
        'Choose one that suits where you live and what you enjoy. Well-established options include iNaturalist (any living thing, with photos), eBird (birds) and Globe at Night (comparing the stars you can see with sky charts to measure light pollution). Local wildlife groups and parks often run their own surveys too.',
        { input: 'choice', choices: ['iNaturalist', 'eBird', 'Globe at Night', 'A local survey', 'Not sure yet'] },
      ),
      step(
        'method',
        'Learn the method',
        'Read the project’s instructions for a single session: what to record, for how long, and what makes data useful (usually date, time, exact location and effort). Write the rules in your own words.',
        { timerMinutes: 10, input: 'text' },
      ),
      step(
        'session',
        'Do one session',
        'Go out and follow the method carefully. Record exactly what you find — including “nothing seen”, which many projects also count as data.',
        { timerMinutes: 25, input: 'text' },
      ),
      step(
        'evidence',
        'Capture evidence',
        'If the project uses photos, take clear ones from several angles with something for scale — without disturbing wildlife.',
        { input: 'photo' },
      ),
      step(
        'submit',
        'Submit or keep it',
        'Upload your observations if you want to (most projects need a free account). Prefer not to? Keep the record in your Field Notes using the same method — it still counts as practice.',
      ),
      step('reflect', 'Reflect', 'What did following a strict method change about how you looked? What did you see that you’d otherwise have missed?', {
        input: 'text',
      }),
    ),
    related: ['s-field-phenology', 's-field-ten-minute-count', 's-field-mini-study'],
    followUps: ['Set a monthly reminder and make it a habit — repeated observations from the same place are especially valuable.'],
  }),
];

export const EXPERIENCES_SKILLS: Experience[] = [
  ...SOUNDSCAPES,
  ...SKETCHING,
  ...CREATIVE_CODING,
  ...STORYTELLING,
  ...FIELD_OBSERVATION,
];
