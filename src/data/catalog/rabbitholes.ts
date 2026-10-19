// Rabbit holes: curated branching explorations, plus the try-it experiences used inside them.
// All content here is curated (origin 'curated'). Contested science is hedged in the text.
import type {
  DebatePayload,
  Experience,
  GamePayload,
  ListeningPayload,
  QuizPayload,
  RabbitHole,
  SimulationPayload,
  StepsPayload,
  WritingPayload,
} from '../types';

/* ------------------------------------------------------------------ */
/* Try-it experiences used inside rabbit holes (ids prefixed `r-`)     */
/* ------------------------------------------------------------------ */

export const EXPERIENCES_RABBIT: Experience[] = [
  /* ---------------- music-mood ---------------- */
  {
    id: 'r-mood-pair',
    title: 'Major or minor? Fast or slow?',
    summary:
      'Hear the same short melody change key and speed, then decide what each version does to your mood. All clips are synthesised on your device.',
    area: 'rabbit',
    format: 'listening',
    topics: ['music', 'mind', 'sound'],
    minutes: 6,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      kind: 'mood-pair',
      seconds: 8,
      prompts: [
        'Pair 1: the same melody in a major key, then in a minor key. Which feels brighter? Which feels heavier? Notice where in your body you feel the difference.',
        'Pair 2: the same melody played fast, then slow. How does your energy change between them?',
        'Pair 3: a fast minor clip against a slow major clip. Which one sounds happier to you? Does speed win, or does key?',
        'Play any pair again with your eyes closed. Did your answer change on the second listen?',
      ],
    } satisfies ListeningPayload,
    related: ['r-sound-mood-sim', 's-soundscape-first'],
    followUps: [
      'Change one dial at a time in the Mood Mixer simulation and listen for which one shifts the feeling most.',
      'Write down which pair surprised you most in a field note.',
    ],
  },
  {
    id: 'r-sound-mood-sim',
    title: 'The Mood Mixer',
    summary:
      'Turn the dials (tempo, key, pitch and density) and hear a synthesised loop shift in feeling as you go.',
    area: 'rabbit',
    format: 'simulation',
    topics: ['music', 'sound', 'mind'],
    minutes: 8,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    skillId: 'soundscapes',
    payload: { kind: 'sound-mood', params: { tempo: 96, mode: 'major' } } satisfies SimulationPayload,
    related: ['r-mood-pair', 's-soundscape-first'],
    followUps: [
      'Try to make the "saddest" loop you can, then change only the tempo. Is it still sad?',
      'Pick one mood and use the same settings as the starting point for your first soundscape.',
    ],
  },
  {
    id: 'r-music-quiz',
    title: 'Chills, surprises and the musical brain',
    summary: 'Six quick questions on musical chills, expectation and what research does (and does not) show.',
    area: 'rabbit',
    format: 'quiz',
    topics: ['music', 'mind', 'science'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      questions: [
        {
          id: 'q1',
          prompt: "In Valorie Salimpoor and colleagues' 2011 study of pleasurable music, when was dopamine release detected?",
          options: ['Only at the peak moment', 'Only after the music ended', 'Both in the build-up and at the peak', 'It was not detected at all'],
          answer: 2,
          explain:
            'The study linked dopamine release to the anticipation before a peak moment as well as the peak itself, in different parts of the striatum. The build-up seems to be rewarding in its own right.',
        },
        {
          id: 'q2',
          prompt: 'Which of these is most often reported as a trigger for musical chills?',
          options: [
            'A steady, unchanging drone',
            'A sudden change: a voice entering, a new harmony, a jump in loudness',
            'Music played very quietly in the background',
            'Any song played at a fast tempo',
          ],
          answer: 1,
          explain:
            'Chills tend to come with surprising or intense moments, though the exact triggers vary a lot from person to person.',
        },
        {
          id: 'q3',
          prompt: 'In 1956 the music theorist Leonard Meyer argued that emotion in music comes mainly from…',
          options: ['The physical loudness of sound', 'Expectations being set up, delayed and resolved', "The composer's mood while writing", 'The lyrics'],
          answer: 1,
          explain:
            'Meyer\'s book Emotion and Meaning in Music focused on expectation. Later researchers such as David Huron built on the idea.',
        },
        {
          id: 'q4',
          prompt: 'True or false: everyone gets chills from music.',
          options: ['True', 'False'],
          answer: 1,
          explain:
            'Many people report musical chills, but plenty never get them, and those who do get them from different moments.',
        },
        {
          id: 'q5',
          prompt:
            'In a 2003 study by Lise Gagnon and Isabelle Peretz that varied speed and key separately, which influenced happy-versus-sad judgements more?',
          options: ['Key (major or minor)', 'Tempo', 'Neither had any effect'],
          answer: 1,
          explain:
            'Tempo was the more powerful cue in that study, though mode mattered too. A fast minor tune can sound cheerful.',
        },
        {
          id: 'q6',
          prompt: 'Just for you: where do your strongest music feelings usually come from?',
          options: ['Voices', 'Big builds and drops', 'Lyrics', 'Memories attached to songs'],
        },
      ],
    } satisfies QuizPayload,
    related: ['r-rhythm-tap'],
  },
  {
    id: 'r-rhythm-tap',
    title: 'Find the groove',
    summary:
      'Tap along to synthesised beats that move from straight to syncopated, and notice which pattern makes you most want to move.',
    area: 'rabbit',
    format: 'game',
    topics: ['music', 'movement', 'mind'],
    minutes: 5,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: { kind: 'rhythm-tap', params: { bpm: 100, rounds: 4 } } satisfies GamePayload,
    followUps: [
      'After playing, rate each round: which made you want to move the most? Was it the simplest one?',
      'Listen for off-beat accents in a song you love and try tapping them.',
    ],
  },
  {
    id: 'r-song-memory',
    title: 'The song that holds a time',
    summary: 'Write the memory a particular song opens, and how that song feels to you now.',
    area: 'rabbit',
    format: 'writing',
    topics: ['music', 'writing', 'mind'],
    minutes: 15,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      prompt:
        'Choose a song that carries you back to a specific time or place. Write the scene it opens: where you were, who was there, what the light and the air were like. Then write how the song feels now compared with then. Has its meaning changed?',
      minWords: 120,
      hints: [
        'Start with one concrete sensory detail rather than the big picture.',
        'Notice whether the feeling arrives before the memory does.',
        'If it is a sad song you love, try to name what it gives you: company, release, nostalgia?',
      ],
    } satisfies WritingPayload,
    related: ['s-sound-hunt-walk'],
    followUps: ['Save this as a Version History reflection and revisit it in a year.'],
  },

  /* ---------------- boredom ---------------- */
  {
    id: 'r-bore-sit',
    title: 'Ten minutes with nothing',
    summary:
      'Sit alone with no phone, book or task for ten minutes, and notice what your mind and hands try to do.',
    area: 'rabbit',
    format: 'experiment',
    topics: ['mind', 'time'],
    minutes: 15,
    energy: 1,
    comfort: 3,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 'set-up',
          title: 'Set up',
          body: 'Find somewhere you can sit undisturbed. Put your phone face down out of reach once the timer is running. No book, no music, no task.',
          input: 'none',
        },
        {
          id: 'sit',
          title: 'Sit with it',
          body: 'For ten minutes, simply think about whatever you like. When you feel an urge to get up, check something or fidget, notice it and let it pass if you can.',
          timerMinutes: 10,
          input: 'none',
        },
        {
          id: 'notice',
          title: 'What happened?',
          body: 'Roughly how often did you feel the urge to reach for something? Where did your thoughts go: plans, memories, worries, daydreams?',
          input: 'text',
        },
        {
          id: 'rate',
          title: 'How did it feel?',
          body: 'Pick the word that fits best.',
          input: 'choice',
          choices: ['Restful', 'Restless', 'Mixed', 'Surprisingly interesting'],
        },
      ],
    } satisfies StepsPayload,
    followUps: [
      'Try it again next week and compare your notes. Did it get easier?',
      'Next time, give yourself something pleasant to think about before you start, such as a trip you are planning.',
    ],
  },
  {
    id: 'r-bore-quiz',
    title: 'Boredom: what do you know?',
    summary: 'A short quiz on the history, language and science of boredom.',
    area: 'rabbit',
    format: 'quiz',
    topics: ['mind', 'time', 'history'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      questions: [
        {
          id: 'q1',
          prompt: "In Timothy Wilson and colleagues' 2014 studies, what did many participants do rather than sit quietly with their thoughts?",
          options: ['Read a book they had hidden', 'Gave themselves a mild electric shock', 'Left the room early', 'Fell asleep'],
          answer: 1,
          explain:
            'In one study, about two-thirds of the men and a quarter of the women pressed a button to give themselves a mild shock at least once during the thinking period.',
        },
        {
          id: 'q2',
          prompt: 'The German word for boredom, Langeweile, literally means…',
          options: ['Empty time', 'Long while', 'Heavy hours', 'Slow day'],
          answer: 1,
          explain: 'Lange Weile: a long while. The language noticed how boredom stretches time.',
        },
        {
          id: 'q3',
          prompt: "Which fourth-century monk wrote about acedia, the restless 'noonday demon' that made the day feel endless?",
          options: ['Evagrius Ponticus', 'Augustine of Hippo', 'Benedict of Nursia', 'Gregory the Great'],
          answer: 0,
          explain: 'Evagrius described acedia as making the sun seem barely to move and the day feel fifty hours long.',
        },
        {
          id: 'q4',
          prompt: "According to the 'holiday paradox', a week full of new experiences tends to…",
          options: [
            'Feel slow while you live it and short afterwards',
            'Feel quick while you live it and long in memory',
            'Feel exactly the same either way',
          ],
          answer: 1,
          explain:
            'Novelty makes time fly in the moment but leaves many memories, so the week seems long when you look back. Boredom does roughly the opposite.',
        },
        {
          id: 'q5',
          prompt: 'True or false: boredom only happens when a task is too easy.',
          options: ['True', 'False'],
          answer: 1,
          explain:
            'Researchers such as Erin Westgate and Timothy Wilson argue that boredom can come from a mismatch either way (too little or too much demand on attention) and from tasks that feel meaningless.',
        },
        {
          id: 'q6',
          prompt: 'Just for you: what do you most often do when boredom hits?',
          options: ['Reach for my phone', 'Snack', 'Daydream', 'Start something new'],
        },
      ],
    } satisfies QuizPayload,
  },
  {
    id: 'r-bore-uses',
    title: 'The paper cup challenge',
    summary:
      'Do something deliberately dull for three minutes, then list as many uses for a paper cup as you can. Does the dullness help?',
    area: 'rabbit',
    format: 'writing',
    topics: ['mind', 'writing', 'time'],
    minutes: 12,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    steps: [
      {
        id: 'warm-up',
        title: 'A dull warm-up',
        body: 'For three minutes, copy out text you do not care about: the ingredients on a packet, a page of terms and conditions, a list of postcodes. Resist making it interesting.',
        timerMinutes: 3,
        input: 'none',
      },
    ],
    payload: {
      prompt:
        'After your dull warm-up, list as many different uses for a paper cup as you can. Go for quantity first, then push for strange ones.',
      minWords: 40,
      hints: [
        'Change its size, material or setting: what is it for in a garden, on a stage, in space?',
        'Think about what you could do with ten thousand of them.',
        'Combine it with something else in the room.',
      ],
    } satisfies WritingPayload,
    followUps: [
      'Try the same prompt on another day without the warm-up and compare how many ideas you get. One comparison proves nothing, but it is a fun experiment.',
    ],
  },
  {
    id: 'r-bore-debate',
    title: 'Make room for boredom, or design it out?',
    summary: 'Weigh up two views on boredom and decide where you stand.',
    area: 'rabbit',
    format: 'debate',
    topics: ['mind', 'time', 'philosophy'],
    minutes: 15,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      question: 'Should we protect time for boredom, or reduce it wherever we can?',
      sides: [
        {
          label: 'Make room for it',
          argument:
            'Boredom may be a signal that something needs to change. If we silence it instantly with a feed, we never hear what it is pointing at. Unstructured time can also leave space for daydreaming, planning and ideas.',
        },
        {
          label: 'Reduce it where you can',
          argument:
            'Boredom is unpleasant, and frequent boredom has been linked in studies to various difficulties. Most of life already contains plenty of dull waiting. Filling it with something engaging, social or useful is not a failure.',
        },
        {
          label: 'It depends on the boredom',
          argument:
            'Boredom in a queue is not the same as boredom with your whole job. The useful question is what this particular boredom is about, and whether rest, challenge, meaning or company would answer it.',
        },
      ],
    } satisfies DebatePayload,
    followUps: ['Record where you landed as an opinion in Version History, and revisit it later.'],
  },

  /* ---------------- cities ---------------- */
  {
    id: 'r-city-estimate',
    title: 'City numbers: take a guess',
    summary: 'Estimate a handful of real figures about cities and urban life, then see how close you were.',
    area: 'rabbit',
    format: 'game',
    topics: ['cities', 'history', 'math'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      kind: 'estimate',
      items: [
        {
          q: "Share of the world's population living in urban areas in 1950",
          answer: 30,
          unit: '%',
          note: 'United Nations estimate (World Urbanization Prospects 2018).',
        },
        {
          q: "Share of the world's population living in urban areas in 2018",
          answer: 55,
          unit: '%',
          note: 'United Nations estimate (World Urbanization Prospects 2018).',
        },
        {
          q: 'Share projected to live in urban areas by 2050',
          answer: 68,
          unit: '%',
          note: 'A United Nations projection, not a certainty.',
        },
        {
          q: "Year Jane Jacobs published The Death and Life of Great American Cities",
          answer: 1961,
          note: 'The book argued for busy, mixed streets and "eyes on the street".',
        },
        {
          q: "Year Copenhagen made its main shopping street, Strøget, car-free",
          answer: 1962,
          note: 'Jan Gehl later studied how people used it.',
        },
        {
          q: "Number of countries compared in Robert Levine and Ara Norenzayan's pace-of-life study",
          answer: 31,
          unit: 'countries',
          note: 'They timed walking speed, a simple post office request, and the accuracy of public clocks.',
        },
        {
          q: "Number of kinds of element in Kevin Lynch's model of how people picture a city",
          answer: 5,
          unit: 'elements',
          note: 'Paths, edges, districts, nodes and landmarks.',
        },
      ],
    } satisfies GamePayload,
  },
  {
    id: 'r-city-whyte',
    title: 'Watch a square like William Whyte',
    summary:
      'Spend twenty quiet minutes observing how people actually use a small public space, then sketch what you saw.',
    area: 'rabbit',
    format: 'outdoor',
    topics: ['cities', 'people', 'art'],
    minutes: 30,
    energy: 2,
    comfort: 3,
    cost: 0,
    social: 'either',
    origin: 'curated',
    skillId: 'field-observation',
    payload: {
      steps: [
        {
          id: 'choose',
          title: 'Choose a spot',
          body: 'Pick a small public space where people pass or linger: a square, a park corner, a station forecourt, the steps of a library. Find somewhere comfortable to sit where you can see it all. Observe politely; there is no need to photograph people.',
          input: 'none',
        },
        {
          id: 'watch',
          title: 'Watch and count',
          body: 'For ten minutes, notice where people sit, stand and stop. Keep a rough tally: how many are alone, how many in groups? Where do conversations happen?',
          timerMinutes: 10,
          input: 'text',
        },
        {
          id: 'triangulation',
          title: 'Look for triangulation',
          body: "Whyte used this word for something that gives strangers a reason to interact: a busker, a dog, a food stall, a strange sculpture. Did you see anything like that? What happened around it?",
          input: 'text',
        },
        {
          id: 'map',
          title: 'Sketch the space',
          body: 'Draw a quick plan of the space and mark where people gathered and where nobody went. Sun, shade, seating, edges and entrances are all worth marking.',
          timerMinutes: 5,
          input: 'sketch',
        },
        {
          id: 'redesign',
          title: 'One change',
          body: 'If you could change one thing about this space to make it more welcoming, what would it be, and who would benefit?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    followUps: ['Visit the same place at a different time of day and compare your sketches.'],
  },
  {
    id: 'r-city-map',
    title: 'Draw your neighbourhood from memory',
    summary:
      'Sketch the area around your home without looking, label it with Kevin Lynch\'s five elements, then compare it with a real map.',
    area: 'rabbit',
    format: 'experiment',
    topics: ['cities', 'maps', 'art'],
    minutes: 20,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 'draw',
          title: 'Draw from memory',
          body: 'Without looking at any map, sketch the streets and places around your home, as far as you feel you know them. Do not worry about accuracy.',
          timerMinutes: 8,
          input: 'sketch',
        },
        {
          id: 'label',
          title: 'Label the elements',
          body: 'Lynch found people organise mental maps around paths (routes), edges (rivers, rail lines, big roads), districts (areas with a character), nodes (junctions, squares) and landmarks. Which of each appear on your drawing?',
          input: 'text',
        },
        {
          id: 'compare',
          title: 'Compare with a real map',
          body: 'Now open a real map. What did you leave out, enlarge, shrink or bend? Which places loom larger in your head than on paper, and why?',
          input: 'text',
        },
        {
          id: 'next',
          title: 'Fill a gap',
          body: 'Pick one place that was missing or blurry on your drawing. Plan to walk there this week.',
          input: 'none',
        },
      ],
    } satisfies StepsPayload,
    followUps: ['Ask a friend or family member to draw the same area and compare your mental maps.'],
  },
  {
    id: 'r-city-debate',
    title: 'Should city centres be car-free?',
    summary: 'Consider different sides of one of the liveliest arguments in city design.',
    area: 'rabbit',
    format: 'debate',
    topics: ['cities', 'people', 'philosophy'],
    minutes: 15,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      question: 'Should the centres of cities be largely closed to private cars?',
      sides: [
        {
          label: 'Yes: streets for people',
          argument:
            'Cars take up a great deal of space, make noise and pollution, and make walking and cycling less safe. Pedestrianised streets like Copenhagen\'s Strøget show public life can flourish when space is given back to people.',
        },
        {
          label: 'Not so fast: access matters',
          argument:
            'Many people depend on cars: disabled people, carers, tradespeople, those with poor public transport. Closing centres without real alternatives can hurt businesses and exclude people who live further out.',
        },
        {
          label: 'Design the transition',
          argument:
            'The answer may differ by city and street. Good transit, deliveries, blue-badge access and trial schemes can test what works before making permanent changes.',
        },
      ],
    } satisfies DebatePayload,
  },

  /* ---------------- randomness ---------------- */
  {
    id: 'r-rand-fake',
    title: 'Fake it, then flip it',
    summary:
      'Invent 100 "random" coin flips, then flip a real coin 100 times. Compare the longest runs and see what gives the fake away.',
    area: 'rabbit',
    format: 'experiment',
    topics: ['math', 'mind', 'science'],
    minutes: 20,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 'invent',
          title: 'Invent',
          body: 'Without a coin, write 100 "random" flips as H and T. Go quickly and trust your instincts.',
          input: 'text',
        },
        {
          id: 'flip',
          title: 'Flip',
          body: 'Now flip a real coin 100 times and write down each result. No coin? Ask someone to flip while you write.',
          input: 'text',
        },
        {
          id: 'runs',
          title: 'Find the longest run',
          body: 'In each list, find the longest run of the same result in a row, and count how many times the result switched from H to T or back.',
          input: 'text',
        },
        {
          id: 'compare',
          title: 'Compare',
          body: 'Which list had the longer runs? Which switched more often? Real sequences are usually clumpier than invented ones, but any single test can go either way.',
          input: 'choice',
          choices: ['My invented list had shorter runs', 'They looked about the same', 'My invented list had longer runs'],
        },
      ],
    } satisfies StepsPayload,
    followUps: ['Try it with a friend: one invents, one flips, then see whether you can spot which list is fake.'],
  },
  {
    id: 'r-rand-walk',
    title: 'Watch a random walk',
    summary:
      'Release walkers that step in random directions. Watch how far they wander, how often they return and how clumpy their paths look.',
    area: 'rabbit',
    format: 'simulation',
    topics: ['math', 'science', 'code'],
    minutes: 8,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: { kind: 'random-walk', params: { walkers: 5 } } satisfies SimulationPayload,
    followUps: [
      'Watch a walker for a while. Do its paths look like they have a purpose? That impression is your pattern-detector at work.',
      'Typical distance from the start grows with the square root of the number of steps: after 100 steps, roughly 10 steps away.',
    ],
  },
  {
    id: 'r-rand-estimate',
    title: 'Chance versus intuition',
    summary: 'Estimate some classic numbers from probability. Most people\'s guesses are way off, and that is the fun.',
    area: 'rabbit',
    format: 'game',
    topics: ['math', 'science'],
    minutes: 6,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      kind: 'estimate',
      items: [
        {
          q: 'How many people need to be in a room for a better-than-even chance that two share a birthday?',
          answer: 23,
          unit: 'people',
          note: 'Assuming birthdays are spread evenly and ignoring leap days, 23 people give just over a 50% chance.',
        },
        {
          q: 'How many ordinary riffle shuffles does it take to mix a 52-card deck thoroughly?',
          answer: 7,
          unit: 'shuffles',
          note: 'Dave Bayer and Persi Diaconis showed in 1992 that about seven riffle shuffles are needed; fewer leave detectable order.',
        },
        {
          q: 'The number of possible orders of a 52-card deck has about how many digits?',
          answer: 68,
          unit: 'digits',
          note: '52 factorial is roughly 8 × 10^67, a 68-digit number.',
        },
        {
          q: 'In 200 flips of a fair coin, how long is the longest run of heads, typically?',
          answer: 7,
          unit: 'in a row',
          note: 'The expected longest run is close to seven. Invented sequences rarely include runs that long.',
        },
        {
          q: 'How many times in a row did black reportedly come up on a Monte Carlo roulette wheel in 1913?',
          answer: 26,
          unit: 'spins',
          note: 'A famous story about the gambler\'s fallacy: many bet on red being "due".',
        },
        {
          q: 'After 100 random steps (each one step long), roughly how far from the start does a walker typically end up?',
          answer: 10,
          unit: 'steps',
          note: 'Typical distance grows with the square root of the number of steps.',
        },
      ],
    } satisfies GamePayload,
  },
  {
    id: 'r-rand-debate',
    title: 'Should some decisions be made by lottery?',
    summary: 'From ancient Athens to modern citizens\' assemblies: is drawing lots fair, foolish, or both?',
    area: 'rabbit',
    format: 'debate',
    topics: ['math', 'philosophy', 'people', 'history'],
    minutes: 15,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      question: 'Should some public decisions, or the people who make them, be chosen by lottery?',
      sides: [
        {
          label: 'Yes: draw lots',
          argument:
            'Random selection gives everyone an equal chance, resists capture by the wealthy or well-connected, and can produce a group that looks more like the public. Ancient Athens chose many officials and jurors this way, and citizens\' assemblies use it today.',
        },
        {
          label: 'No: choose with judgement',
          argument:
            'Some roles need expertise, experience or accountability to voters. A lottery is fair in process, but not necessarily in outcome, and people may feel less bound by decisions nobody chose.',
        },
        {
          label: 'Use chance where it fits',
          argument:
            'Lotteries may work well for advisory panels, juries or allocating scarce places fairly, while elections and expertise handle other roles. The question is which decisions benefit from impartiality most.',
        },
      ],
    } satisfies DebatePayload,
  },

  /* ---------------- plant-signals ---------------- */
  {
    id: 'r-plant-quiz',
    title: 'Plant signals: solid, debated or myth?',
    summary: 'Sort famous claims about plant communication into well supported, still debated, or overstated.',
    area: 'rabbit',
    format: 'quiz',
    topics: ['plants', 'science', 'nature'],
    minutes: 6,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      questions: [
        {
          id: 'q1',
          prompt: 'Maize attacked by caterpillars releases scents that attract parasitic wasps, which attack the caterpillars.',
          options: ['Well supported', 'Still debated', 'Myth'],
          answer: 0,
          explain:
            'Shown by Ted Turlings and colleagues in 1990 and studied extensively since. Similar "indirect defences" are known in other plants.',
        },
        {
          id: 'q2',
          prompt: 'Trees routinely use fungal networks to send food and warnings to their offspring.',
          options: ['Well supported', 'Still debated', 'Myth'],
          answer: 1,
          explain:
            'Mycorrhizal networks exist and some transfers have been measured, but a 2023 review by Justine Karst and colleagues argued that claims about their role in real forests have been overstated.',
        },
        {
          id: 'q3',
          prompt: 'A Venus flytrap snaps shut after a single touch of a trigger hair.',
          options: ['True', 'False: it usually needs two touches in quick succession'],
          answer: 1,
          explain: 'Requiring two touches helps the trap avoid closing on raindrops or debris.',
        },
        {
          id: 'q4',
          prompt: 'Stressed tomato and tobacco plants emit ultrasonic clicking sounds.',
          options: ['Reported in a 2023 study', 'Never observed', 'Proven to be heard and answered by other plants'],
          answer: 0,
          explain:
            "Lilach Hadany's team reported the clicks in 2023. Whether any organism responds to them is not yet known.",
        },
        {
          id: 'q5',
          prompt: "Pea plants have been shown to learn associations, like Pavlov's dogs.",
          options: ['Well supported', 'Claimed, but a replication attempt failed', 'Disproven for all plants'],
          answer: 1,
          explain:
            'A 2016 study claimed it; a 2020 replication attempt by other researchers did not find the effect. The broader question of plant learning remains open.',
        },
        {
          id: 'q6',
          prompt: 'Just for you: which word best fits what plants do with information?',
          options: ['Communicate', 'Signal', 'Leak cues that others read', 'Still deciding'],
        },
      ],
    } satisfies QuizPayload,
  },
  {
    id: 'r-plant-touch',
    title: 'Touch and grow',
    summary:
      'Grow two pots of seedlings side by side and gently brush one of them every day. Does touch change how plants grow?',
    area: 'rabbit',
    format: 'experiment',
    topics: ['plants', 'science', 'craft'],
    minutes: 15,
    energy: 1,
    comfort: 2,
    cost: 1,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 'sow',
          title: 'Sow two pots',
          body: 'Sow the same fast-growing seeds (beans, peas or sunflowers work well) in two similar pots. Keep them side by side so they get the same light and water. Take a photo.',
          input: 'photo',
        },
        {
          id: 'brush',
          title: 'Brush one pot daily',
          body: 'Once the seedlings are a few centimetres tall, gently brush the tops of one pot\'s seedlings back and forth about 20 times each day with your hand or a piece of card. Leave the other pot untouched.',
          timerMinutes: 1,
          input: 'none',
        },
        {
          id: 'measure',
          title: 'Measure after two weeks',
          body: 'Measure the height of a few seedlings in each pot and notice how thick and sturdy the stems feel. Take another photo.',
          input: 'text',
        },
        {
          id: 'compare',
          title: 'Compare',
          body: 'Plants that are touched or shaken often grow shorter and sturdier, a response called thigmomorphogenesis. Results vary by species and conditions. What did you see?',
          input: 'choice',
          choices: ['Brushed plants were shorter or sturdier', 'No clear difference', 'Brushed plants were taller'],
        },
      ],
    } satisfies StepsPayload,
    followUps: ['Set a daily reminder for the brushing so the experiment stays consistent.'],
  },
  {
    id: 'r-plant-walk',
    title: 'Plant detective walk',
    summary:
      'Look for signs of plants sensing and responding: bite marks, shade stretching, climbing tendrils and fungi near trees.',
    area: 'rabbit',
    format: 'outdoor',
    topics: ['plants', 'nature'],
    minutes: 30,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    skillId: 'field-observation',
    timerMinutes: 30,
    payload: {
      steps: [
        {
          id: 'safety',
          title: 'Before you go',
          body: 'Look, smell and photograph, but do not eat anything or pick fungi. Avoid touching plants you cannot identify, since some sting or irritate skin.',
          input: 'none',
        },
        {
          id: 'bites',
          title: 'Look for bite marks',
          body: 'Find two plants of the same kind growing near each other. Count roughly how many leaves on each show chewing damage. Are some plants much more eaten than others?',
          input: 'text',
        },
        {
          id: 'shade',
          title: 'Shade and stretch',
          body: 'Find the same kind of plant growing in sun and in shade. Many plants in shade grow taller and leggier, with more space between leaves, as they reach for light. Photograph the pair.',
          input: 'photo',
        },
        {
          id: 'touch',
          title: 'Climbers and tendrils',
          body: 'Look for climbing plants: tendrils that have curled around a support, or stems twining up a fence. These plants sense touch and grow in response to it.',
          input: 'none',
        },
        {
          id: 'smell',
          title: 'The smell of damage',
          body: 'Gently rub a leaf from a plant you know is safe, such as mint or a blade of grass, and smell it. Part of that green smell comes from compounds plants release within seconds of being damaged.',
          input: 'none',
        },
        {
          id: 'fungi',
          title: 'Look down',
          body: 'Near trees, look for mushrooms. Some woodland mushrooms are the fruiting bodies of fungi that partner with tree roots underground. Photograph, do not pick.',
          input: 'photo',
        },
        {
          id: 'question',
          title: 'Your question',
          body: 'What did you notice that you would like to test or read more about?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
  },
  {
    id: 'r-plant-spread',
    title: 'How an alarm spreads through a field',
    summary:
      'A simple, simplified model of a cue spreading from plant to plant. It is a thinking tool, not a botanical simulation: play with density and rate.',
    area: 'rabbit',
    format: 'simulation',
    topics: ['plants', 'science', 'math'],
    minutes: 8,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: { kind: 'spread', params: { density: 0.6, rate: 0.3 } } satisfies SimulationPayload,
    followUps: [
      'Ask yourself: in real fields, wind, distance and plant species all matter. Which of those does this toy model leave out?',
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Rabbit holes                                                        */
/* ------------------------------------------------------------------ */

export const RABBIT_HOLES: RabbitHole[] = [
  /* ================================================================ */
  {
    id: 'music-mood',
    title: 'Why does music change how we feel?',
    hook: 'A few notes can lift you, unsettle you or bring back a whole summer. Follow the routes from sound to feeling, then make and hunt for sounds yourself.',
    topics: ['music', 'sound', 'mind', 'science'],
    start: 'mm-start',
    nodes: [
      {
        id: 'mm-start',
        title: 'Sound that reaches inside',
        question: 'Why does a pattern of vibrations in the air change how we feel?',
        body:
          "Physically, music is just air pressure rising and falling. Nothing in it is sad or triumphant the way a storm is dangerous or a meal is nourishing. And yet a few bars can slow your breathing, lift your shoulders or bring tears you didn't see coming.\n\nResearchers don't think there is a single answer. Psychologists such as Patrik Juslin have argued that music reaches our emotions through several routes at once: fast, reflex-like reactions to loud or sudden sounds; our bodies falling into step with a rhythm; 'catching' the emotion in a voice-like melody, much as we catch a friend's mood; memories and images a piece calls up; and the push and pull of what we expect to happen next.\n\nOne distinction runs through all of this: perceiving an emotion is not the same as feeling it. You can recognise that a song is sad while feeling calm, comforted or even happy. Much of the puzzle lives in the gap between the two.\n\nThis rabbit hole follows several of those routes. Pick the one that tugs at you.",
        surprise:
          'In a large study led by Samuel Mehr, listeners from dozens of countries heard songs from small-scale societies around the world. Without knowing the language or the culture, they could tell lullabies and dance songs apart at better-than-chance rates.',
        perspectives: [
          {
            lens: 'A neuroscientist',
            take: 'Music recruits systems that evolved for other jobs: hearing, movement, prediction and reward. The emotion may come from those borrowed circuits working together.',
          },
          {
            lens: 'A composer',
            take: "We don't place feelings inside the notes. We shape tension, release, space and colour, and listeners bring the rest.",
          },
          {
            lens: 'A skeptic',
            take: 'Many lab studies use short clips and Western listeners. Be careful generalising from a thirty-second excerpt in a scanner to what a song means at a funeral.',
          },
        ],
        experiences: ['r-mood-pair'],
        branches: [
          { label: 'Why do minor keys sound sad, or do they?', to: 'mm-major-minor' },
          { label: "What's happening when music gives me chills?", to: 'mm-chills' },
          { label: 'Why can one song bring back an entire summer?', to: 'mm-memory' },
        ],
      },
      {
        id: 'mm-major-minor',
        title: 'Major, minor and the sound of sadness',
        question: "Is the 'sad' in a minor key in the music, or in us?",
        body:
          "If you grew up with Western music, you probably hear major keys as bright and minor keys as sad almost instantly. The difference can come down to a single note: lower the third note of a major scale by a semitone and the mood seems to darken.\n\nBut key is only one lever, and often not the strongest. Tempo, loudness, pitch height and the brightness of the sound all carry emotional cues. Fast, loud, high and bright tends to read as excited or happy; slow, soft, low and dark as sad or tender. Many of these cues echo how emotion sounds in speech: an excited voice speeds up and rises, a sad one slows and drops.\n\nThat overlap may explain why some cues travel across cultures better than others. A 2009 study found that Mafa listeners in Cameroon, with little exposure to Western music, recognised happy, sad and fearful Western excerpts above chance. Yet research with listeners who have had little contact with Western harmony suggests the major-happy, minor-sad link on its own is weaker, and may be at least partly learned.\n\nThe honest answer: some of it is in the sound, and some of it is in your listening history.",
        surprise:
          'In a 2003 study that varied speed and key independently, tempo influenced happy-versus-sad judgements more than major versus minor did. A fast minor tune can sound cheerful; a slow major one can sound wistful.',
        perspectives: [
          {
            lens: 'A film composer',
            take: 'I rarely rely on key alone. A minor chord in a bright, fast texture can feel adventurous; a major chord held quietly can break your heart.',
          },
          {
            lens: 'An ethnomusicologist',
            take: "'Major' and 'minor' are categories from one tradition. Many musical systems divide pitch differently and attach meaning in their own ways.",
          },
          {
            lens: 'A music psychologist',
            take: 'Treat each cue as a dial, not a switch. Listeners combine many cues at once, weighted by experience.',
          },
        ],
        experiences: ['r-mood-pair', 'r-sound-mood-sim'],
        branches: [
          { label: 'Could I design a mood on purpose?', to: 'mm-make' },
          { label: 'Why does a beat make my body want to move?', to: 'mm-rhythm' },
          { label: 'If sad music sounds sad, why do we love it?', to: 'mm-sad' },
        ],
      },
      {
        id: 'mm-chills',
        title: 'The chills moment',
        question: 'Why does one particular moment in a song make the hair on your arms stand up?',
        body:
          "Many people know the feeling: a voice enters, a chord shifts, the band drops out and crashes back in, and a shiver runs up the spine. Researchers call it frisson, or simply musical chills. Not everyone gets them, and the same person may get them from one song and not another.\n\nIn a 2001 brain-imaging study, Anne Blood and Robert Zatorre found that intense chills went along with activity in regions linked to reward and motivation, the same broad systems involved in food and other pleasures. A decade later, Valorie Salimpoor and colleagues reported that dopamine was released at peak emotional moments in music, and also in the seconds leading up to them.\n\nThe moments that trigger chills tend to share something: they are a kind of surprise. A sudden change in loudness, a new texture, an unexpected harmony, a melody climbing past where you thought it would stop. That points to a deeper story about anticipation.\n\nIt's worth being clear about what these studies show. They link musical pleasure to brain activity. They don't reduce the experience to a single chemical.",
        surprise:
          "In Salimpoor's study, dopamine activity in one region was linked to the anticipation before a favourite moment, and in another region to the moment itself. The build-up seems to be rewarding in its own right, not just a wait for the payoff.",
        perspectives: [
          {
            lens: 'A neuroscientist',
            take: "Music taps reward systems that evolved for survival-relevant things, even though music isn't food or shelter. That's part of what makes it so interesting.",
          },
          {
            lens: 'A skeptic',
            take: "'Dopamine hit' has become a cliché. Dopamine is involved in wanting, learning and prediction, not only pleasure, and these studies used small groups choosing their own favourite music.",
          },
          {
            lens: 'A listener',
            take: 'My chills come almost entirely from voices. Instruments move me, but a human voice cracking open gets me every time.',
          },
        ],
        experiences: ['r-music-quiz'],
        branches: [
          { label: 'Why does surprise feel so good?', to: 'mm-expectation' },
          { label: 'Why do sad songs give some people chills?', to: 'mm-sad' },
          { label: 'What does rhythm add to the feeling?', to: 'mm-rhythm' },
        ],
      },
      {
        id: 'mm-expectation',
        title: 'The prediction game',
        question: 'Is your brain enjoying the music, or enjoying guessing what comes next?',
        body:
          "As you listen, you are constantly and silently predicting. Where will the melody go? When will the beat land? Will this chord resolve? You learned the rules for these predictions without trying, just by hearing thousands of songs.\n\nIn 1956 the music theorist Leonard Meyer argued that emotion in music comes from expectations being set up, delayed, bent, and finally satisfied or denied. Fifty years later the music cognition researcher David Huron developed the idea in his book Sweet Anticipation, describing how we are rewarded for accurate predictions, react sharply to surprises, and can find a surprise delightful once it turns out to be harmless.\n\nThis helps explain a familiar pattern. Music that is completely predictable gets boring; music with no predictable structure is hard to enjoy. Many listeners find a sweet spot between the two: enough pattern to guess, enough surprise to keep guessing.\n\nIt also helps explain why taste changes. As you hear more of a style, your predictions sharpen, and music that once felt chaotic can start to feel thrilling.",
        surprise:
          'A twist you know is coming can still surprise you. Huron distinguishes expectations based on a whole style from memory of a specific piece; the style-level surprise can persist even after many hearings.',
        perspectives: [
          {
            lens: 'A producer',
            take: "A good drop works because I've made you wait for it. Tension is a material, just like melody.",
          },
          {
            lens: 'A cognitive scientist',
            take: 'Many theories now treat the brain as a prediction machine. Music may be one of its purest playgrounds.',
          },
          {
            lens: 'A skeptic',
            take: 'Expectation explains a lot about tension and release, but less about why one particular voice or timbre moves you. It is one route among several.',
          },
        ],
        experiences: ['r-music-quiz', 'r-rhythm-tap'],
        branches: [
          { label: 'Could I build tension in my own sounds?', to: 'mm-make' },
          { label: 'How does this connect to chills?', to: 'mm-chills' },
          { label: 'So is all of this learned?', to: 'mm-major-minor' },
        ],
      },
      {
        id: 'mm-rhythm',
        title: 'Why the beat gets into your body',
        question: 'Why is it so hard to keep still when the groove is right?',
        body:
          "Listen to a strong beat and parts of the brain involved in planning movement become active, even if you sit perfectly still. Many people tap a foot or nod without noticing. Researchers call this pull towards movement 'groove', and the falling into step 'entrainment'.\n\nGroove isn't just a loud, regular beat. In a 2014 study, Maria Witek and colleagues found that rhythms with a moderate amount of syncopation, with some notes landing off the beat, made people most want to move and felt most pleasurable. Too little syncopation was dull; too much was confusing. Once again, the sweet spot sits between predictability and surprise.\n\nRhythm also connects music to its social uses. Cross-cultural analyses of songs from many societies suggest that dance songs tend to be faster and more energetic, while lullabies tend to be slower and gentler. Moving in time with other people seems to make many of us feel more connected, which may be part of why music is so often shared.\n\nTempo shapes mood too: quicker tempos tend to be heard as more energetic, slower ones as calmer or sadder.",
        surprise:
          'Snowball, a sulphur-crested cockatoo, became famous for dancing to pop songs. When researchers changed the tempo of the music, he often adjusted his head-bobbing to stay in time, evidence that beat-keeping is not uniquely human.',
        perspectives: [
          {
            lens: 'A drummer',
            take: 'Groove lives in tiny timing choices. A snare a few milliseconds late can feel completely different.',
          },
          {
            lens: 'An anthropologist',
            take: 'Moving together in time (dancing, marching, rowing, chanting) shows up in social life almost everywhere. Music may partly be a technology for togetherness.',
          },
          {
            lens: 'A neuroscientist',
            take: "Motor areas respond to rhythm even when you don't move, which suggests listening and moving are more intertwined than they seem.",
          },
        ],
        experiences: ['r-rhythm-tap'],
        branches: [
          { label: 'How could I use rhythm to shape a mood?', to: 'mm-make' },
          { label: 'Why does a delayed beat feel so good?', to: 'mm-expectation' },
          { label: 'What rhythms are hiding in my street?', to: 'mm-soundwalk' },
        ],
      },
      {
        id: 'mm-sad',
        title: 'Why we choose sad songs',
        question: 'If sadness is unpleasant, why do so many people seek out sad music?',
        body:
          "Philosophers have asked a version of this question about tragedy for more than two thousand years. With music it is especially sharp: people put on heartbreak ballads after a breakup, or slow, aching pieces on a quiet evening, and say it helps.\n\nResearch suggests the experience is rarely plain sadness. People describe being moved, nostalgia, tenderness, peace, or a sense of being understood. Because the sadness is borrowed from the music rather than caused by a real loss, it may be safe to feel, a little like fear on a rollercoaster.\n\nThere are clear individual differences. Studies by Jonna Vuoskoski, Tuomas Eerola and colleagues suggest that people higher in empathy tend to enjoy sad music more. Some people, though, find that sad music pulls them further down, especially when it feeds rumination. How you use it seems to matter: listening to feel accompanied may help, while looping a song to replay a painful thought may not.\n\nDavid Huron has floated a more speculative idea involving consoling hormones. It's intriguing but not established, and a good example of a theory still waiting on evidence.",
        surprise:
          "Researchers studying the feeling of 'being moved' (tears, warmth in the chest, goosebumps) have given it a name borrowed from Sanskrit: kama muta. They argue it arises when we witness a sudden sense of closeness or connection.",
        perspectives: [
          {
            lens: 'A psychologist',
            take: 'Perceived sadness and felt sadness can come apart. Many listeners feel comfort while recognising sorrow in what they hear.',
          },
          {
            lens: 'A songwriter',
            take: "A sad song says: someone else has been here. That company is half the point.",
          },
          {
            lens: 'A skeptic',
            take: "Feelings like 'being moved' are hard to measure, and most studies rely on what people report. Treat neat explanations with some caution.",
          },
        ],
        experiences: ['r-song-memory'],
        branches: [
          { label: 'Why are songs so tangled up with memory?', to: 'mm-memory' },
          { label: 'Is this related to musical chills?', to: 'mm-chills' },
          { label: 'Back to it: is minor really sad?', to: 'mm-major-minor' },
        ],
      },
      {
        id: 'mm-memory',
        title: 'Songs as time machines',
        question: 'How can three notes put you back in a specific kitchen, years ago?',
        body:
          "Music is remarkably good at triggering autobiographical memories: vivid, personal scenes from your own life. Researchers sometimes call them music-evoked autobiographical memories, and they are often emotional, detailed and surprisingly sudden.\n\nPart of the reason may be simple association. Hear a song again and again during an intense period of life and it becomes bound to that time, a kind of learning psychologists call conditioning. Play it years later and the feelings come back with it, sometimes before the memory itself does.\n\nThere also seems to be a 'reminiscence bump': many people feel most strongly about music they heard in their teens and early twenties, a time of identity-building and many firsts. Studies of people with Alzheimer's disease suggest that memory for familiar music can be relatively preserved even as other memories fade, which is one reason music is used in some care settings. The research is promising but still developing, so grand claims deserve caution.\n\nThis route explains why the same song can be joyful to one person and unbearable to another.",
        surprise:
          "In a 2013 study, Carol Krumhansl and Justin Zupnick found that young adults also showed a bump for music popular when their parents were young. They called it a 'cascading reminiscence bump': tastes and memories handed down through family listening.",
        perspectives: [
          {
            lens: 'A memory researcher',
            take: 'Music combines emotion, repetition and a strong time-stamp. That is an excellent recipe for a memory cue.',
          },
          {
            lens: 'A care worker',
            take: "A familiar song can open a conversation with someone who has struggled to talk all day. It doesn't fix anything, but it can be a door.",
          },
          {
            lens: 'A sound artist',
            take: 'Places have their own songs: a ferry horn, a school bell, a particular bird. They work on memory just like music does.',
          },
        ],
        experiences: ['r-song-memory'],
        branches: [
          { label: 'Why do people choose sad songs?', to: 'mm-sad' },
          { label: 'Can everyday sounds hold places, too?', to: 'mm-soundwalk' },
          { label: 'Back to the big question', to: 'mm-start' },
        ],
      },
      {
        id: 'mm-make',
        title: 'From listener to maker',
        question: 'If you know the levers, can you build a feeling out of sound?',
        body:
          "Everything in this rabbit hole points to a toolkit. Tempo: faster for energy, slower for calm. Pitch: higher for lightness, lower for weight. Harmony: major for brightness, minor for shadow, unresolved chords for suspense. Density: one sound alone feels intimate; many layered sounds feel busy or grand. Loudness and space: a soft, close sound feels private; a sound with a long echo feels vast.\n\nYou don't need instruments to use these levers. In the 1970s the composer R. Murray Schafer and the World Soundscape Project popularised the word 'soundscape' for the sonic environment around us. They paid attention to everyday sounds: background 'keynote' sounds like traffic or wind, foreground 'signals' like bells, and 'soundmarks' that make a place recognisable.\n\nA soundscape you make can borrow from both worlds: a slow pulse, a low drone, and a few recorded sounds from a real place, arranged to create a mood on purpose.\n\nStart by playing with the dials in the Mood Mixer, then try building your first short soundscape.",
        surprise:
          'In 1967 Schafer wrote a booklet called Ear Cleaning, arguing that people should learn to really hear their surroundings before trying to make music from them.',
        perspectives: [
          {
            lens: 'A composer',
            take: 'Mood comes from relationships. A high sound only feels bright next to something lower.',
          },
          {
            lens: 'A sound designer',
            take: 'Films and games often use quiet room tone and tiny details to tell you how to feel before anything happens on screen.',
          },
          {
            lens: 'A beginner',
            take: 'Start with three sounds and one rule. Limits make it easier to hear what each change does.',
          },
        ],
        experiences: ['r-sound-mood-sim', 's-soundscape-first'],
        branches: [
          { label: 'Where can I find sounds worth using?', to: 'mm-soundwalk' },
          { label: 'How can rhythm move people?', to: 'mm-rhythm' },
          { label: 'How do I build tension and release?', to: 'mm-expectation' },
        ],
      },
      {
        id: 'mm-soundwalk',
        title: 'Hunting for sound',
        question: 'What does your neighbourhood sound like when you actually listen?',
        body:
          "Most of us filter out the sounds around us. That's useful (imagine noticing every fridge hum), but it means we miss a lot. A soundwalk reverses the filter: you walk slowly, with listening as the main purpose.\n\nThe composer Hildegard Westerkamp, part of the World Soundscape Project, helped shape soundwalking as a practice. The idea is simple: notice the layers. What is constant in the background? What pops out? What rhythms can you hear: footsteps, a ticking indicator, a bouncing ball, a train? Which sounds make you feel tense, safe, nostalgic or curious?\n\nThis is where earlier branches come back. You may hear tempo in traffic and footsteps, brightness or darkness in a siren or a birdsong, surprise in a sudden door slam. You might notice that the mood of a street changes with its sounds even when it looks the same.\n\nIf you carry a phone, record a few short clips. They become raw material: a soundscape made from your own streets is a kind of audio diary that holds a place and a mood together.",
        surprise:
          'In noisy cities some birds sing differently. A 2003 study found that great tits in noisier parts of a city sang with higher-pitched notes, which may help them be heard above low traffic rumble.',
        perspectives: [
          {
            lens: 'An acoustic ecologist',
            take: 'Listening to a place is a way of caring for it. Soundscapes change, and some sounds disappear without anyone noticing.',
          },
          {
            lens: 'A walker',
            take: "Slowing down to listen made a familiar street feel new. I heard a fountain I'd walked past for years.",
          },
          {
            lens: 'An urban planner',
            take: 'Noise is a health issue as well as an aesthetic one. Careful listening is a first step towards better places.',
          },
        ],
        experiences: ['s-sound-hunt-walk'],
        branches: [
          { label: 'Turn what I heard into a soundscape', to: 'mm-make' },
          { label: 'Why do some sounds bring back memories?', to: 'mm-memory' },
          { label: 'Start again with the big question', to: 'mm-start' },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: 'boredom',
    title: 'What is boredom for?',
    hook: 'That restless, sticky feeling that nothing is quite enough. Why we feel it, what it does to time, and why it might be one of the more useful feelings you have.',
    topics: ['mind', 'time', 'philosophy', 'history'],
    start: 'bd-start',
    nodes: [
      {
        id: 'bd-start',
        title: 'The itch with nowhere to go',
        question: 'What exactly is boredom, and why does it feel so uncomfortable?',
        body:
          "Boredom is easy to recognise and surprisingly hard to define. It isn't the same as having nothing to do: you can be bored in a crowded meeting, and perfectly content sitting alone watching rain.\n\nIn 2012 the psychologist John Eastwood and colleagues proposed a definition many researchers now build on: boredom is the unpleasant experience of wanting to engage in satisfying activity, but being unable to. The key ingredients are attention and desire. You want your mind to be occupied, and nothing on offer grips it, because it is too easy, too hard, or simply meaningless to you.\n\nThat definition explains some odd features. Boredom often comes with restlessness rather than calm. It can strike when you have plenty to do but none of it feels like yours. And it can sit alongside tiredness, which is why being bored can feel strangely exhausting.\n\nIf boredom is a feeling of unmet engagement, the obvious next question is: what is the feeling for?",
        surprise:
          'Boredom is not only about too little challenge. Erin Westgate and Timothy Wilson have argued that it can come from a mismatch in either direction (tasks demanding too little or too much of our attention) and from tasks that feel meaningless.',
        perspectives: [
          {
            lens: 'A psychologist',
            take: 'Boredom is an attention problem as much as a mood. The mind is looking for a foothold and not finding one.',
          },
          {
            lens: 'A teenager',
            take: "Bored doesn't mean nothing to do. It means nothing I care about doing.",
          },
          {
            lens: 'A philosopher',
            take: 'The discomfort is telling. You only feel stuck if, somewhere, you want something else.',
          },
        ],
        experiences: ['r-bore-sit'],
        branches: [
          { label: 'Is boredom trying to tell me something?', to: 'bd-signal' },
          { label: 'Why does bored time drag so slowly?', to: 'bd-time' },
          { label: 'Have people always been bored?', to: 'bd-history' },
        ],
      },
      {
        id: 'bd-signal',
        title: 'Boredom as a messenger',
        question: 'Could boredom be useful in the way pain or hunger are?',
        body:
          "Pain is unpleasant, and that's the point: it pushes you to stop doing something harmful. A growing number of researchers think boredom works in a similar way for attention and meaning.\n\nOn this view, developed by the philosopher Andreas Elpidorou and psychologists such as James Danckert and John Eastwood, boredom is a signal that your current situation isn't giving you what you need. It nudges you to look for something more engaging, more challenging or more meaningful. Without it, you might stay stuck in an unrewarding activity indefinitely.\n\nThat doesn't make boredom pleasant, or always helpful. A signal only works if you respond well. You can answer boredom by finding a goal that matters to you, or by grabbing the nearest distraction, which silences the alarm without fixing what set it off. Some people also experience boredom much more often than others, and frequent boredom has been linked in studies to various difficulties, though cause and effect are hard to untangle.\n\nThe interesting question becomes not 'How do I avoid boredom?' but 'What is my boredom pointing at?'",
        surprise:
          'Animals may get bored too. In one study, mink kept in bare cages were quicker to investigate new things, including ones they might normally avoid, than mink kept in enriched cages.',
        perspectives: [
          {
            lens: 'A philosopher',
            take: 'Boredom keeps us honest about our projects. It is the feeling of a life momentarily out of line with what we care about.',
          },
          {
            lens: 'A clinician',
            take: "For some people, frequent boredom travels with low mood or trouble concentrating. It's worth paying attention to, not just pushing through.",
          },
          {
            lens: 'A skeptic',
            take: "Calling boredom 'a signal' is a useful frame, but it is a theory about function, and functions are hard to prove.",
          },
        ],
        experiences: ['r-bore-sit', 'r-bore-quiz'],
        branches: [
          { label: 'Can boredom make me more creative?', to: 'bd-creative' },
          { label: 'Why would anyone choose an electric shock instead?', to: 'bd-shock' },
          { label: 'Is there a deeper, existential kind of boredom?', to: 'bd-philosophy' },
        ],
      },
      {
        id: 'bd-shock',
        title: 'Would you rather be shocked?',
        question: 'How much do people dislike being alone with their own thoughts?',
        body:
          "In 2014 the psychologist Timothy Wilson and colleagues published a striking set of studies. They asked people to sit alone in a plain room for between six and fifteen minutes, with no phone, book or task, and simply entertain themselves with their thoughts. Many found it unpleasant and hard to concentrate.\n\nIn one version, participants first felt a mild electric shock, and the analysis focused on those who said they would pay money to avoid feeling it again. Then they were left alone with a button that would deliver the same shock. A substantial share pressed it anyway: about two-thirds of the men and a quarter of the women, at least once.\n\nThe study is often summarised as 'people prefer pain to boredom', which overstates it. The shocks were mild, curiosity may have played a part, and the setting was artificial. But the finding fits a broader picture: sitting with an unoccupied mind is harder than most of us assume, and we reach for stimulation quickly.\n\nThat raises a practical question. If fifteen minutes with our thoughts is hard, what happens to all the small empty moments in a day?",
        surprise:
          'People found the thinking task no easier at home, where they could quietly cheat by checking their phones, and some admitted that they had.',
        perspectives: [
          {
            lens: 'A social psychologist',
            take: 'Thinking for pleasure is a skill. Without a plan (something to look forward to, a problem to mull over) many minds drift into unpleasant places.',
          },
          {
            lens: 'A meditation teacher',
            take: 'Sitting with your mind is uncomfortable at first. Like any practice, it changes with repetition.',
          },
          {
            lens: 'A skeptic',
            take: "Lab rooms are odd places, and pressing a curious button once isn't the same as preferring pain. The headline is more dramatic than the data.",
          },
        ],
        experiences: ['r-bore-sit'],
        branches: [
          { label: "Where does the mind go when it's left alone?", to: 'bd-wander' },
          { label: 'What do phones change about all this?', to: 'bd-phones' },
          { label: 'So what is boredom actually for?', to: 'bd-signal' },
        ],
      },
      {
        id: 'bd-wander',
        title: 'Where the mind goes',
        question: 'When attention slips off a dull task, where does it go, and is that bad?',
        body:
          "Boredom and mind-wandering are close cousins. When a task fails to hold your attention, thoughts slide towards plans, memories, worries and daydreams. Brain imaging has linked this inward-turning state with a set of regions often called the default mode network, which tends to be more active when we're not focused on the outside world.\n\nMind-wandering is common. A 2010 study by Matthew Killingsworth and Daniel Gilbert, which asked people about their thoughts at random moments through a phone app, found minds wandering in nearly half of the samples, and people reported being somewhat less happy when their minds wandered. Their title put it bluntly: 'A wandering mind is an unhappy mind.'\n\nThat isn't the whole story. Other research suggests a wandering mind can help with planning and creative problem-solving. In a 2012 study led by Benjamin Baird, people who did an undemanding task during a break came up with more ideas for a problem they had already seen than people who rested or did a demanding task.\n\nThe content matters: wandering towards possibilities may feel very different from wandering into worry.",
        surprise:
          "In Killingsworth and Gilbert's analysis, what people were thinking about predicted their happiness better than what they were actually doing.",
        perspectives: [
          {
            lens: 'A neuroscientist',
            take: "The 'resting' brain isn't idle. Simulating the future and replaying the past take real work, and are probably useful.",
          },
          {
            lens: 'A writer',
            take: "My best ideas arrive on the bus, never at the desk. I've learned to protect dull time.",
          },
          {
            lens: 'A psychologist',
            take: 'Daydreams that loop around worries tend to feel bad. Daydreams aimed at goals or curiosity often feel better.',
          },
        ],
        experiences: ['r-bore-uses'],
        branches: [
          { label: 'Does boredom actually boost creativity?', to: 'bd-creative' },
          { label: "Why does time crawl when I'm bored?", to: 'bd-time' },
          { label: 'Back to the start: what is boredom?', to: 'bd-start' },
        ],
      },
      {
        id: 'bd-creative',
        title: 'The boredom–creativity link',
        question: 'Is boredom secretly good for ideas?',
        body:
          "It's a popular claim: let yourself (or your children) be bored and creativity will follow. There is some research behind it, though less than the headlines suggest.\n\nIn a 2014 study, Sandi Mann and Rebekah Cadman had some participants copy numbers out of a phone book before a creative task: thinking up uses for a pair of plastic cups. Those who had done the dull copying came up with more ideas than a control group. Other studies suggest boredom increases the appetite for novelty and for meaning, a restlessness that can be channelled into exploration.\n\nThe effect isn't automatic. Studies are often small, results vary, and boredom can just as easily lead to impulsive or unhelpful choices. It probably isn't boredom itself that creates; it's the search boredom sets off, plus having the space and materials to follow that search somewhere interesting.\n\nA practical reading: boredom may open a door, but you still have to walk through it. Leaving the phone in another room and keeping a notebook nearby might make that more likely.",
        surprise:
          'In the same study, people who merely read the phone book, rather than copying from it, produced even more ideas, perhaps because a passive dull task leaves more room for daydreaming.',
        perspectives: [
          {
            lens: 'An artist',
            take: "I don't seek boredom out, but I don't run from it either. The itch is often the start of something.",
          },
          {
            lens: 'A researcher',
            take: 'The evidence is suggestive, not settled. Boredom raises the appetite for novelty; whether that turns creative depends on context.',
          },
          {
            lens: 'A parent',
            take: 'When my kids complain of boredom, the first ten minutes are awful. The next hour is sometimes the best of the day.',
          },
        ],
        experiences: ['r-bore-uses'],
        branches: [
          { label: 'What happens when I reach for my phone instead?', to: 'bd-phones' },
          { label: 'Where does a bored mind wander?', to: 'bd-wander' },
          { label: 'Is there a deeper kind of boredom?', to: 'bd-philosophy' },
        ],
      },
      {
        id: 'bd-time',
        title: 'Why bored time stretches',
        question: 'Why does a dull afternoon last forever, then vanish from memory?',
        body:
          "When you're bored, you notice time. You check the clock, count minutes, wait. The more attention you pay to time passing, the slower it seems to go: the watched-pot effect that timing research keeps finding.\n\nBut there's a twist. Looking back, a dull week often seems to have passed quickly, because it left few distinct memories behind. A week packed with new experiences can fly by while it's happening, then feel long in hindsight, because memory has so much to work with. The broadcaster and psychology writer Claudia Hammond calls this the 'holiday paradox'.\n\nSo time has two clocks: the one you feel in the moment, and the one you rebuild from memory afterwards. Boredom tends to stretch the first and shrink the second. Novelty tends to do the opposite.\n\nThat has practical implications for routine. Days that blur together may drag while you live them and then seem to have vanished when you look back at a month or a year. Adding small new experiences, such as a different route or an unfamiliar activity, may give memory more landmarks to hold on to.",
        surprise:
          "Some researchers think this is part of why years seem to speed up as we age: fewer firsts mean fewer memorable landmarks, so a remembered year feels shorter. It's a plausible explanation, not a proven one.",
        perspectives: [
          {
            lens: 'A psychologist',
            take: "We don't have a sense organ for time. We infer duration from attention, memory and change.",
          },
          {
            lens: 'A linguist',
            take: "The German word for boredom, Langeweile, literally means 'long while'. Language noticed the time-stretching long before the lab did.",
          },
          {
            lens: 'A traveller',
            take: 'My first week in a new city always feels like a month. The second month feels like a week.',
          },
        ],
        experiences: ['r-bore-sit'],
        branches: [
          { label: 'Have people always felt time drag like this?', to: 'bd-history' },
          { label: 'Where does attention go when it leaves the clock?', to: 'bd-wander' },
          { label: 'Does scrolling make the minutes faster or slower?', to: 'bd-phones' },
        ],
      },
      {
        id: 'bd-history',
        title: 'A short history of being bored',
        question: 'Is boredom a modern invention?',
        body:
          "The feeling is old, even if the word is not. In the fourth century the monk Evagrius Ponticus wrote about acedia, a listless restlessness that struck desert monks in the heat of the day (the 'noonday demon'), making the hours crawl and the cell feel unbearable. Centuries later, French writers explored ennui, a weary dissatisfaction with life in general.\n\nThe English noun 'boredom' only became common in the nineteenth century; Charles Dickens used it in Bleak House, where Lady Dedlock is 'bored to death'. Some historians link its rise to changes in how people lived: more leisure for some, more repetitive work for others, and a growing expectation that life should be interesting.\n\nThat last idea is worth pausing on. Boredom depends partly on what we expect. If you believe every hour should be engaging, ordinary dullness becomes a problem to solve. Today, with entertainment a tap away, the gap between expectation and reality may show up in new ways.\n\nHistory suggests boredom isn't new. What changes is how we interpret it, and what we reach for when it arrives.",
        surprise:
          'Evagrius wrote that acedia makes it seem as though the sun barely moves and the day is fifty hours long: a vivid account of time dragging, written more than sixteen centuries ago.',
        perspectives: [
          {
            lens: 'A historian',
            take: 'Feelings have histories. The words and remedies change, even if something underneath persists.',
          },
          {
            lens: 'The desert monks',
            take: 'For them, the remedy for acedia was perseverance: staying in your cell rather than fleeing from it.',
          },
          {
            lens: 'A sociologist',
            take: 'Modern life sells stimulation. Boredom becomes both a problem and a market.',
          },
        ],
        experiences: ['r-bore-debate'],
        branches: [
          { label: 'What did philosophers make of it?', to: 'bd-philosophy' },
          { label: "What's different in the age of phones?", to: 'bd-phones' },
          { label: 'Back to the beginning: what is it, exactly?', to: 'bd-start' },
        ],
      },
      {
        id: 'bd-philosophy',
        title: 'Profound boredom',
        question: 'What if boredom reveals something about life itself?',
        body:
          "Philosophers have taken boredom surprisingly seriously. Arthur Schopenhauer described human life as swinging like a pendulum between pain and boredom: when our needs go unmet we suffer, and when they're met we're bored. For him, boredom hinted that existence has no deep value in itself, a bleak conclusion many have disputed.\n\nSøren Kierkegaard, writing in the voice of a pleasure-seeking character in Either/Or, half-jokingly called boredom the root of all evil and proposed constantly 'rotating' experiences to escape it, a strategy the book seems to present as hollow.\n\nIn lectures given in 1929–30, Martin Heidegger distinguished several forms of boredom, from being bored by something, such as waiting for a late train, to a deep, diffuse boredom in which everything seems indifferent. Strangely, he thought this profound boredom could be revealing: when everything falls flat, we are confronted with our own existence and the question of what we'll do with it.\n\nYou don't have to accept any of these views to find them useful. Together they suggest boredom can be an occasion for reflection, not just a gap to fill.",
        surprise:
          "Heidegger's example of everyday boredom is waiting hours for a train at a sleepy provincial station: checking the timetable again, pacing, looking at the clock. Almost anyone with a delayed train will recognise it.",
        perspectives: [
          {
            lens: 'An existentialist',
            take: 'Deep boredom strips away distractions. What remains is the question of what you actually care about.',
          },
          {
            lens: 'A pessimist',
            take: "Schopenhauer would say boredom proves that getting what we want doesn't satisfy us.",
          },
          {
            lens: 'A pragmatist',
            take: 'Big theories aside, boredom is information. Use it to adjust, not to despair.',
          },
        ],
        experiences: ['r-bore-debate'],
        branches: [
          { label: 'Is boredom just a messenger, then?', to: 'bd-signal' },
          { label: 'How did ordinary people experience it in the past?', to: 'bd-history' },
          { label: 'Can boredom spark creativity?', to: 'bd-creative' },
        ],
      },
      {
        id: 'bd-phones',
        title: 'The always-available escape',
        question: 'What happens to boredom when relief is always in your pocket?',
        body:
          "For most of history a dull wait was simply endured. Now a queue, a bus ride or a lull in conversation can be filled instantly. Many people describe reaching for their phone before they have even noticed feeling bored.\n\nResearch here is young and mixed, and it's easy to overclaim. Some studies suggest that people who check their phones more often also report more boredom, and that quick scrolling may relieve boredom only briefly. One explanation fits the boredom-as-signal idea: if boredom is telling you that you need something more engaging or meaningful, a stream of brief, low-effort content may quiet the signal without meeting the need.\n\nThat doesn't make phones the villain. They also connect people, inform them and entertain them in genuinely satisfying ways. The useful distinction may be between choosing something engaging and grabbing anything to make an uncomfortable feeling stop.\n\nOne simple experiment: notice the reach. Next time your hand goes for your phone during a pause, wait one minute. What were you feeling? What did you actually want?",
        surprise:
          'A 2024 set of experiments found that people who skipped and switched between videos reported more boredom, not less, than people who watched without switching. Fragmenting attention may make each thing harder to engage with.',
        perspectives: [
          {
            lens: 'A psychologist',
            take: 'Ask what the boredom is about before you solve it. Sometimes you need rest, sometimes challenge, sometimes people.',
          },
          {
            lens: 'A designer',
            take: 'Infinite feeds are designed to remove stopping points. Adding your own stopping points is a design choice too.',
          },
          {
            lens: 'A skeptic',
            take: 'Panics about new media are old: novels and television had their turn. Look for evidence, not nostalgia.',
          },
        ],
        experiences: ['r-bore-sit', 'r-bore-debate'],
        branches: [
          { label: 'Could a little boredom be good for ideas?', to: 'bd-creative' },
          { label: 'Why is it so hard to sit with our thoughts?', to: 'bd-shock' },
          { label: 'Does scrolling change how time feels?', to: 'bd-time' },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: 'cities',
    title: 'How do cities shape the way we live?',
    hook: 'Pavements, plazas, strangers and street trees: how places quietly design our days, and how people redesign them right back.',
    topics: ['cities', 'people', 'maps', 'history'],
    start: 'ct-start',
    nodes: [
      {
        id: 'ct-start',
        title: 'Cities shape us, and we shape them',
        question: 'How much of your daily life is quietly designed by the place you live?',
        body:
          "According to United Nations estimates, more than half of the world's people now live in urban areas, and that share is projected to keep rising. For most of human history the opposite was true. Cities are, in a sense, an experiment we are all running together.\n\nThink about how a city organises an ordinary day. The distance to a shop decides whether you walk or drive. The width of a pavement decides whether you stop to chat. A bench in the shade invites lingering; a bench with armrests every half-metre discourages lying down. The route of a bus line can determine which neighbourhoods meet each other and which never do.\n\nNone of this is neutral. Streets, buildings and rules embody choices about who and what a place is for. Yet cities are also shaped from below: by the paths people wear into grass, the corners where teenagers gather, the market that appears every Saturday.\n\nThis rabbit hole looks in both directions: how places shape behaviour, and how behaviour reshapes places.",
        surprise:
          "By UN estimates, about 30% of people lived in urban areas in 1950 and about 55% in 2018. Within a single long lifetime, humanity went from mostly rural to mostly urban.",
        perspectives: [
          {
            lens: 'An urban planner',
            take: 'Every plan is a set of bets about how people will behave. Some bets age well; many don\'t.',
          },
          {
            lens: 'A resident',
            take: "I didn't choose to be someone who walks everywhere. My neighbourhood made it the easiest option.",
          },
          {
            lens: 'A skeptic',
            take: 'Design matters, but so do money, culture and law. Not everything about city life can be fixed with better pavements.',
          },
        ],
        experiences: ['r-city-estimate'],
        branches: [
          { label: 'What makes a street feel alive?', to: 'ct-street' },
          { label: 'Do cities make us walk, and live, faster?', to: 'ct-pace' },
          { label: 'How do we carry a whole city in our heads?', to: 'ct-mental-map' },
        ],
      },
      {
        id: 'ct-street',
        title: 'Eyes on the street',
        question: 'Why do some streets feel safe and lively while others feel empty?',
        body:
          "In 1961 the writer and activist Jane Jacobs published The Death and Life of Great American Cities, a fierce critique of the planning orthodoxy of her day. Rather than grand theories, she offered observations, many from her own street in Greenwich Village, New York.\n\nJacobs argued that busy, mixed streets are safer and more pleasant than tidy, single-use ones. Shops, homes, workplaces and cafés side by side mean people are around at different times of day. Shopkeepers and residents watching the pavement provide what she called 'eyes on the street': informal attention that helps keep public space safe. She described the daily rhythm of comings and goings as a 'sidewalk ballet'.\n\nShe also championed short blocks, a mix of old and new buildings, and enough density to support local life. Many of these ideas have since become mainstream in urban design, though critics point out that lively neighbourhoods can become so desirable that they price out the people who made them lively.\n\nNext time you walk a street that feels good, try to notice why. Who is around? What are the ground floors doing?",
        surprise:
          'Jacobs had no formal training in planning. She also helped lead the campaign that stopped a planned expressway from cutting through Lower Manhattan.',
        perspectives: [
          {
            lens: 'A planner',
            take: 'Jacobs taught a generation to look at how streets are used, not just how they look on plans.',
          },
          {
            lens: 'A critic',
            take: 'Her ideas came from particular neighbourhoods in particular decades. Not every city works like mid-century Greenwich Village.',
          },
          {
            lens: 'A shopkeeper',
            take: 'I know who walks past every morning. If something is off, I notice.',
          },
        ],
        experiences: ['r-city-whyte'],
        branches: [
          { label: 'Why do people sit where they sit?', to: 'ct-plaza' },
          { label: 'Who is a street actually designed for?', to: 'ct-design-for' },
          { label: 'What changes when a city gets bigger?', to: 'ct-scaling' },
        ],
      },
      {
        id: 'ct-plaza',
        title: 'The social life of small spaces',
        question: 'Why are some public squares full and others deserted?',
        body:
          "In the 1970s the sociologist William H. Whyte and his team set up cameras overlooking plazas and parks in New York and simply watched. Their findings, published in The Social Life of Small Urban Spaces (1980), were often delightfully ordinary.\n\nPeople sit where there is somewhere to sit, a point that sounds obvious but was routinely ignored. Movable chairs are popular, partly because shifting a chair even slightly lets people claim a spot. People like being near the flow of foot traffic rather than tucked away, and they are drawn to places where other people already are. Sun, trees, water and food help. Whyte also described 'triangulation': something like a street performer that gives strangers a reason to talk.\n\nIn Copenhagen, the Danish architect Jan Gehl was studying similar questions. The city's main shopping street, Strøget, had been made car-free in 1962, and Gehl's book Life Between Buildings argued that good public spaces invite small, everyday activities (lingering, watching, chatting) that add up to public life.\n\nThe lesson: public life isn't just about people. It's about what spaces allow.",
        surprise:
          'Whyte noticed that people often stopped to chat right in the middle of busy pedestrian flows, even in doorways, rather than stepping aside. Conversations seem to gravitate to where the people are.',
        perspectives: [
          {
            lens: 'A sociologist',
            take: 'Watch first, design second. People tell you what a space needs by what they do in it.',
          },
          {
            lens: 'An architect',
            take: 'The human scale, what you can see and hear at walking pace, matters more than the skyline.',
          },
          {
            lens: 'A teenager',
            take: "We hang out wherever nobody moves us on. That's usually not where the designers wanted us.",
          },
        ],
        experiences: ['r-city-whyte'],
        branches: [
          { label: 'Why do strangers ignore each other so politely?', to: 'ct-strangers' },
          { label: 'Do trees and quiet change how we feel?', to: 'ct-green' },
          { label: 'Back to the street: what keeps it alive?', to: 'ct-street' },
        ],
      },
      {
        id: 'ct-pace',
        title: 'The pace of life',
        question: 'Do cities make us walk, and live, faster?',
        body:
          "In 1976 Marc and Helen Bornstein published a short paper in Nature reporting that people tended to walk faster in bigger cities. Later, the social psychologist Robert Levine and Ara Norenzayan compared the 'pace of life' across 31 countries, timing walking speeds, how quickly post office clerks handled a simple request, and how accurate public clocks were. A faster pace tended to go with stronger economies, colder climates and more individualistic cultures.\n\nWhy might cities speed us up? A classic explanation comes from the psychologist Stanley Milgram, who argued in 1970 that city dwellers face 'overload': more people, sounds and demands than anyone can attend to. Adapting means filtering: spending less time on each encounter, ignoring much of what happens around you, moving efficiently.\n\nThere are other possibilities. Time may feel more valuable where wages are higher, and denser cities simply put more destinations within walking distance.\n\nThese are averages and correlations, not destinies. Plenty of big-city people stroll and plenty of small-town people rush. But next time you visit somewhere new, notice whether your pace changes to match.",
        surprise:
          "One of Levine's three measures was simply how accurate public clocks were, on the idea that places that care about speed also care about being on time.",
        perspectives: [
          {
            lens: 'A psychologist',
            take: "Filtering isn't rudeness. It's a way of coping with more input than any one person can handle.",
          },
          {
            lens: 'An economist',
            take: 'When an hour of your time is worth more money, you tend to treat it as scarcer.',
          },
          {
            lens: 'A visitor',
            take: 'Within a day of arriving in a big city I walk twice as fast. It\'s contagious.',
          },
        ],
        experiences: ['r-city-estimate'],
        branches: [
          { label: 'If everyone is rushing, how do strangers coexist?', to: 'ct-strangers' },
          { label: 'Does city size change everything at once?', to: 'ct-scaling' },
          { label: 'Can green space slow us down?', to: 'ct-green' },
        ],
      },
      {
        id: 'ct-strangers',
        title: 'A city of strangers',
        question: "How do millions of people who don't know each other live side by side?",
        body:
          "Cities are places where you are surrounded by people you will never meet. That can be alienating, and sometimes is. But sociologists have noticed a set of quiet habits that make it work.\n\nErving Goffman described 'civil inattention': a brief glance that acknowledges someone, followed by looking away, signalling that you've seen them and mean no harm or intrusion. Stanley Milgram studied 'familiar strangers': people you see regularly at a station or café and recognise, but never speak to. Many people, he found, could point out several such faces.\n\nThe sociologist Mark Granovetter argued in 1973 for 'the strength of weak ties'. Acquaintances, rather than close friends, often connect us to new information and opportunities, because they move in different circles. Cities are dense with potential weak ties.\n\nPlace matters too. Markets, libraries, parks and playgrounds give strangers low-pressure reasons to be near one another, and occasionally to become something more than strangers.",
        surprise:
          'Milgram observed that familiar strangers were more likely to finally speak if they met somewhere unexpected, say in another city, than in the place where they saw each other every day.',
        perspectives: [
          {
            lens: 'A sociologist',
            take: "Anonymity isn't the absence of social order. It's a different kind of social order.",
          },
          {
            lens: 'An introvert',
            take: 'I love that I can be alone in public. Nobody needs anything from me.',
          },
          {
            lens: 'A community organiser',
            take: 'A neighbourhood needs places where weak ties can grow: a bench, a noticeboard, a regular event.',
          },
        ],
        experiences: ['r-city-debate'],
        branches: [
          { label: 'Where do strangers actually gather?', to: 'ct-plaza' },
          { label: 'Who gets to feel at home in public?', to: 'ct-design-for' },
          { label: 'Back to the start: how do cities shape us?', to: 'ct-start' },
        ],
      },
      {
        id: 'ct-mental-map',
        title: 'The city in your head',
        question: 'How do we remember and navigate a place too big to see all at once?',
        body:
          "In 1960 the urban planner Kevin Lynch published The Image of the City, based on interviews in which residents of Boston, Jersey City and Los Angeles described and sketched their cities from memory. He found that people organised their mental maps around five kinds of element: paths (streets and routes), edges (rivers, rail lines), districts (areas with a character), nodes (junctions, squares) and landmarks.\n\nCities with clear, memorable elements were easier to picture and navigate; Lynch called this 'imageability'. A grid of near-identical streets can be harder to hold in your head than a messier city full of distinctive landmarks.\n\nNavigation may even shape the brain. In a 2000 study, Eleanor Maguire and colleagues found that London taxi drivers, who memorise a vast web of streets known as 'the Knowledge', had a larger posterior hippocampus, a region involved in spatial memory, than comparison participants. Later work suggested the difference developed with training.\n\nPeople also leave their own marks: 'desire paths', the worn tracks across grass where people prefer to walk, are a map of how a place is really used.",
        surprise:
          'Some campuses and parks have waited to see where desire paths formed before deciding where to lay paving, letting people\'s footsteps help design the walkways.',
        perspectives: [
          {
            lens: 'A planner',
            take: 'Wayfinding is a design problem. If people keep getting lost, the city is unclear, not the people.',
          },
          {
            lens: 'A neuroscientist',
            take: 'Spatial memory is adaptable. How we navigate, from memory or by following a blue dot, may matter for it.',
          },
          {
            lens: 'A walker',
            take: 'I only learned my city once I stopped using the map and got lost on purpose.',
          },
        ],
        experiences: ['r-city-map'],
        branches: [
          { label: 'What makes a remembered street feel alive?', to: 'ct-street' },
          { label: 'Who decides how a city is laid out?', to: 'ct-design-for' },
          { label: 'Does knowing a city change how fast you move through it?', to: 'ct-pace' },
        ],
      },
      {
        id: 'ct-scaling',
        title: 'Bigger city, faster everything?',
        question: 'Is there a hidden mathematics of how cities grow?',
        body:
          "In 2007 a team including Luís Bettencourt and the physicist Geoffrey West published an analysis suggesting that cities follow surprisingly regular 'scaling' patterns. Comparing cities of different sizes, they reported that infrastructure such as road surface and petrol stations tended to grow more slowly than population, so bigger cities needed less per person. Meanwhile many social and economic quantities, including wages and patents but also some crimes and infections, tended to grow faster than population.\n\nThe proposed explanation is that cities are networks of interactions. Pack more people together and the number of possible encounters rises faster than the number of people, for good and ill. Ideas, opportunities and problems all spread more readily.\n\nIt's an elegant idea and has been influential, but it is also debated. Results depend on how you draw a city's boundaries, which data you use and which countries you study, and some researchers have found the patterns weaker or less universal than first claimed.\n\nEven so, the core intuition rings true for many people who move to a big city: more people means more of everything, from chances to costs to noise to surprises.",
        surprise:
          'In that 2007 data, a city with double the population typically needed noticeably less than double the infrastructure, one reason denser places can be more efficient per person.',
        perspectives: [
          {
            lens: 'A physicist',
            take: 'Beneath the variety of cities there may be common rules, a little like those found in biology.',
          },
          {
            lens: 'A geographer',
            take: 'Cities are shaped by history, politics and landscape. Universal laws can hide important differences.',
          },
          {
            lens: 'A resident',
            take: 'Moving to a bigger city meant more opportunities, and more rent. Both scaled up.',
          },
        ],
        experiences: ['r-city-estimate'],
        branches: [
          { label: 'Is the faster pace part of the same pattern?', to: 'ct-pace' },
          { label: 'Where does nature fit in a dense city?', to: 'ct-green' },
          { label: 'Who benefits when cities grow?', to: 'ct-design-for' },
        ],
      },
      {
        id: 'ct-green',
        title: 'Trees, noise and nerves',
        question: 'How do greenery and sound change how a city feels?',
        body:
          "In 1984 the researcher Roger Ulrich published a small study in Science comparing hospital patients recovering from the same operation. Those whose window looked out on trees tended to have shorter stays and needed fewer strong painkillers than those facing a brick wall. It was an early, influential hint that what we see around us might affect recovery.\n\nSince then, many studies have linked access to parks and trees with better reported wellbeing, lower stress and more physical activity. Trees also cool streets: cities tend to be warmer than their surroundings, the 'urban heat island' effect, and shade and vegetation can reduce it. Much of the evidence is correlational, though, and greener neighbourhoods are often wealthier ones, which makes cause and effect hard to separate.\n\nSound matters too. Health researchers have linked long-term traffic noise to poorer sleep and stress, and the World Health Organization has published guidelines on environmental noise. Meanwhile, sounds like birdsong and running water are often rated as pleasant and restorative.\n\nA city's mood, in other words, is partly a matter of leaves, shade and soundscape.",
        surprise:
          "Ulrich's study involved only a few dozen patients, yet it helped shape decades of thinking about hospital design. Small studies can be influential, which is exactly why later research was needed to test the idea.",
        perspectives: [
          {
            lens: 'A public health researcher',
            take: 'Green space works partly as health infrastructure: shade, cooler streets, places to move.',
          },
          {
            lens: 'An ecologist',
            take: 'City parks are habitats. Plenty of species now live mainly alongside us.',
          },
          {
            lens: 'A skeptic',
            take: 'Many studies show associations. Fewer can show that adding trees, by itself, makes people healthier.',
          },
        ],
        experiences: ['r-city-whyte'],
        branches: [
          { label: 'Who gets the green, quiet streets?', to: 'ct-design-for' },
          { label: 'How do parks and landmarks shape mental maps?', to: 'ct-mental-map' },
          { label: 'Back to the start: how do cities shape us?', to: 'ct-start' },
        ],
      },
      {
        id: 'ct-design-for',
        title: 'Who is the city designed for?',
        question: 'Whose daily life does a street make easy, and whose does it make hard?',
        body:
          "Every street encodes priorities. Wide roads and generous parking make driving easy; narrow pavements and long waits at crossings make walking harder. Steps without ramps exclude wheelchair users and parents with buggies. Benches with dividers, studs on ledges and similar features, often called 'hostile' or 'defensive' architecture, are designed to discourage sleeping or lingering, and critics argue they push vulnerable people out of public space.\n\nSome cities have tried to design more deliberately for different lives. Vienna has been noted since the 1990s for 'gender mainstreaming' in planning, considering how women, children and older people actually move around, for example on trips that chain together school, shops and work. The 'fifteen-minute city', associated with the researcher Carlos Moreno and taken up in Paris, aims to put daily needs within a short walk or bike ride.\n\nThese ideas are debated. Supporters see healthier, fairer neighbourhoods; critics raise concerns about cost, gentrification or limits on driving. The fifteen-minute city has also been the target of misleading conspiracy theories.\n\nA good question to carry: who was imagined as the user of this space, and who was left out?",
        surprise:
          "After snowfall, the patches of road that cars never drive over stay white. Street-design activists photograph these 'sneckdowns' to show where kerbs could be extended and space given back to pedestrians.",
        perspectives: [
          {
            lens: 'A wheelchair user',
            take: 'A single step can decide whether a café is part of my city or not.',
          },
          {
            lens: 'A traffic engineer',
            take: 'Roads also carry buses, deliveries and ambulances. Every change has trade-offs worth taking seriously.',
          },
          {
            lens: 'An urbanist',
            take: 'Designing for a child or an older person often makes streets better for everyone.',
          },
        ],
        experiences: ['r-city-debate', 'r-city-map'],
        branches: [
          { label: 'How do strangers share these spaces?', to: 'ct-strangers' },
          { label: "What made Jane Jacobs' street work?", to: 'ct-street' },
          { label: 'Back to the start: how do cities shape us?', to: 'ct-start' },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: 'randomness',
    title: 'What does random really mean?',
    hook: 'Coin flips, lucky streaks, lava lamps and decaying atoms. Why chance is stranger than it looks, and why our brains so often get it wrong.',
    topics: ['math', 'science', 'philosophy', 'code'],
    start: 'rd-start',
    nodes: [
      {
        id: 'rd-start',
        title: "What do we mean by 'random'?",
        question: 'Is randomness a property of things, or of what we don\'t know?',
        body:
          "We use 'random' casually (a random thought, a random stranger), but the word hides several different ideas.\n\nSometimes random means unpredictable: you can't know whether the coin will land heads. Sometimes it means patternless: a string of digits with no structure you could exploit or compress. Sometimes it describes a process, like a fair die or a shuffle, rather than any particular outcome. A perfectly fair process can still produce results that look suspicious, like five sixes in a row.\n\nThere's also a deep question about where randomness comes from. Is a coin flip random because physics itself is uncertain, or just because the motion is too complicated for us to track? Many 'random' events may be determined in principle and unpredictable in practice. Quantum physics, on the other hand, seems to contain randomness that isn't just ignorance, though what that means is still argued about.\n\nAnd then there's us. Human brains are pattern-hunting machines, and we are notoriously poor at recognising or producing randomness. That turns out to matter for gambling, sport, science and even playlist design.",
        surprise:
          'Mathematicians have a striking definition: a sequence is random if no program much shorter than the sequence itself can produce it. By that standard, the digits of pi are not random at all, since a short program can generate them, even though they look patternless.',
        perspectives: [
          {
            lens: 'A mathematician',
            take: 'Randomness is a model. We assume certain outcomes are equally likely and see how far that takes us.',
          },
          {
            lens: 'A physicist',
            take: 'Some randomness seems built into nature at the smallest scales, or at least our best theory says so.',
          },
          {
            lens: 'A philosopher',
            take: "Calling something random often just means 'I can't see the cause.'",
          },
        ],
        experiences: ['r-rand-fake'],
        branches: [
          { label: 'Can I fake randomness convincingly?', to: 'rd-human' },
          { label: 'Is a coin flip truly random?', to: 'rd-coin' },
          { label: 'How does a computer roll dice?', to: 'rd-pseudo' },
        ],
      },
      {
        id: 'rd-human',
        title: "Why we're bad at faking random",
        question: 'If you write down a "random" list of coin flips, what gives you away?',
        body:
          "Ask people to invent a sequence of coin flips and they usually produce something that looks random to them, and suspiciously tidy to a statistician. Invented sequences tend to switch between heads and tails too often and to avoid long runs. Five heads in a row doesn't feel random, so people don't write it.\n\nReal randomness is clumpier than intuition expects. In 200 genuine flips, a run of six or seven heads is entirely ordinary. Some statistics teachers turn this into a classroom trick: one group flips a real coin, another invents results, and the teacher can often spot the fakes by looking for the longest run.\n\nThe same intuition shapes technology. When music apps offered a truly random shuffle, some listeners complained it wasn't random, because the same artist sometimes came up twice in a row. Spotify's engineers wrote in 2014 that they had changed their shuffle to spread artists out more evenly: less random, so it would feel more random.\n\nOur sense of randomness, it turns out, is really a sense of evenness.",
        surprise:
          'In 200 fair coin flips, the longest run of heads is typically around seven. Invented sequences rarely include runs anywhere near that long.',
        perspectives: [
          {
            lens: 'A statistician',
            take: 'If your data look too even, I get suspicious. Real data are lumpy.',
          },
          {
            lens: 'A psychologist',
            take: 'We judge randomness by how representative a sequence looks, not by how it was produced.',
          },
          {
            lens: 'A music listener',
            take: "I don't actually want random. I want variety. Those are different things.",
          },
        ],
        experiences: ['r-rand-fake', 'r-rand-estimate'],
        branches: [
          { label: "Why do we see patterns that aren't there?", to: 'rd-clusters' },
          { label: "After five reds, isn't black due?", to: 'rd-gambler' },
          { label: 'So how do machines make randomness?', to: 'rd-pseudo' },
        ],
      },
      {
        id: 'rd-clusters',
        title: 'Patterns in the noise',
        question: 'When does a cluster mean something, and when is it just chance?',
        body:
          "During the Second World War, as V-1 flying bombs fell on London, many people believed the bombs were landing in clusters, perhaps aimed at particular targets. In 1946 the actuary R. D. Clarke published a short analysis. He divided an area of south London into small squares and counted the hits in each. The pattern closely matched what you'd expect if the bombs were landing at random: some squares get several hits and many get none, purely by chance.\n\nThis is the clustering illusion. Random events in space or time naturally form clumps and gaps, and our minds read those clumps as meaningful. It shows up in worries about disease clusters, in streaks of bad luck, and in seeing faces in clouds.\n\nOf course, some clusters are real, which is exactly why statistics matters. Epidemiologists investigating a possible cancer cluster have to ask how often such a cluster would appear by chance alone, given how many places and diseases are being watched. Without that comparison, coincidence can look like cause.\n\nThe skill is holding two thoughts at once: clusters happen naturally, and some clusters are clues.",
        surprise:
          "Clarke's counts fitted a formula called the Poisson distribution so well that his analysis became a classic textbook example: a wartime worry examined with nothing more than a grid and a tally.",
        perspectives: [
          {
            lens: 'An epidemiologist',
            take: 'Every real outbreak starts as a cluster. The question is whether it is bigger than chance would produce.',
          },
          {
            lens: 'A psychologist',
            take: 'Seeing patterns is useful most of the time. False alarms are the price of not missing real ones.',
          },
          {
            lens: 'A skeptic',
            take: 'Look at enough places and something will always look unusual somewhere.',
          },
        ],
        experiences: ['r-rand-walk'],
        branches: [
          { label: 'Is a winning streak ever real?', to: 'rd-gambler' },
          { label: 'How does randomness move through space?', to: 'rd-walk' },
          { label: 'How do scientists put chance to work?', to: 'rd-uses' },
        ],
      },
      {
        id: 'rd-gambler',
        title: "The gambler's fallacy and the hot hand",
        question: 'After a long run of red, is black "due"?',
        body:
          "A famous story from Monte Carlo tells of a night in 1913 when a roulette wheel landed on black 26 times in a row. Gamblers reportedly bet heavily on red, convinced it was due, and lost fortunes as the streak went on. Each spin was independent: the wheel had no memory. The belief that past outcomes must 'balance out' is called the gambler's fallacy.\n\nThe opposite instinct is the 'hot hand': the sense that a basketball player who has scored several in a row is more likely to score again. In 1985 Thomas Gilovich, Robert Vallone and Amos Tversky analysed shooting data and argued the hot hand was an illusion, with streaks no more common than chance predicts.\n\nThen came a twist. In 2018 the economists Joshua Miller and Adam Sanjurjo showed that the original analysis contained a subtle statistical bias: in short sequences, looking at what happens right after a streak is skewed in a way that hides real streakiness. After correcting for it, they found evidence of a modest hot hand.\n\nSo one bias was real, and the method used to expose another had a bias of its own. Thinking clearly about randomness is genuinely hard.",
        surprise:
          'You can see the Miller–Sanjurjo bias with a fair coin: flip it four times and record the share of heads among the flips that come right after a heads. Averaged over all possible four-flip sequences, that share comes out around 40.5%, not 50%.',
        perspectives: [
          {
            lens: 'A statistician',
            take: "Independence is the key. A fair wheel or coin doesn't remember anything.",
          },
          {
            lens: 'An athlete',
            take: 'Confidence is real. Whether it shows up in the numbers is another question.',
          },
          {
            lens: 'An economist',
            take: 'Even experts can be fooled by subtle sampling effects. That is humbling, and a good reason for re-checking famous results.',
          },
        ],
        experiences: ['r-rand-estimate'],
        branches: [
          { label: 'Why do invented sequences avoid streaks?', to: 'rd-human' },
          { label: 'Is the coin itself really fair?', to: 'rd-coin' },
          { label: 'Can chance be used fairly, on purpose?', to: 'rd-uses' },
        ],
      },
      {
        id: 'rd-coin',
        title: 'Is a coin flip really random?',
        question: 'If you knew everything about the flip, could you predict the landing?',
        body:
          "A coin flip obeys ordinary physics. In principle, if you knew exactly how hard it was flicked, how fast it spun and how it would bounce, you could predict the result. The randomness comes from our ignorance: tiny differences in the flick lead to different outcomes, and nobody controls them precisely.\n\nThe statistician and former magician Persi Diaconis took this seriously. With colleagues, he built a mechanical flipper that could make a coin land the same way every time, and analysed the physics of human flips. Their 2007 paper suggested that a flipped coin is slightly more likely to land on the side it started on, about 51% of the time. In 2023 a large team of researchers tested this with hundreds of thousands of real flips and found a similar small same-side bias.\n\nThis connects to chaos theory. In 1963 the meteorologist Edward Lorenz showed that simple, fully deterministic equations for weather could be exquisitely sensitive to their starting conditions. Systems like this are completely determined, yet practically unpredictable.\n\nSo 'random' often means 'too sensitive to predict', which is different from 'without a cause'.",
        surprise:
          'Lorenz stumbled on this sensitivity partly by accident. Rerunning a weather simulation with a number rounded from six decimal places to three, he got a forecast that soon looked completely different.',
        perspectives: [
          {
            lens: 'A physicist',
            take: 'Determinism and predictability are different things. Chaos lives in the gap between them.',
          },
          {
            lens: 'A magician',
            take: "With enough practice, many 'random' acts become controllable. Audiences rarely realise how much.",
          },
          {
            lens: 'A philosopher',
            take: "If the universe were fully deterministic, would anything be random, or is 'random' always about what we know?",
          },
        ],
        experiences: ['r-rand-walk'],
        branches: [
          { label: 'Is anything truly random, then?', to: 'rd-quantum' },
          { label: 'How do computers fake it?', to: 'rd-pseudo' },
          { label: 'What happens when random steps add up?', to: 'rd-walk' },
        ],
      },
      {
        id: 'rd-pseudo',
        title: 'How computers fake it',
        question: 'How can a machine that follows exact instructions produce randomness?',
        body:
          "Computers are built to be predictable: run the same program on the same input and you get the same output. So most 'random' numbers in software are pseudorandom. A deterministic formula churns out a sequence that looks random and passes statistical tests, but is entirely determined by a starting value called the seed.\n\nThe mathematician John von Neumann, who proposed one early method, joked in 1951 that 'anyone who considers arithmetical methods of producing random digits is, of course, in a state of sin.' His point was that such numbers aren't truly random. But for many purposes, like games and simulations, they're good enough, and they have a useful property: you can reproduce them exactly.\n\nFor security, predictability is dangerous. Encryption keys need numbers an attacker can't guess, so systems gather 'entropy' from messy physical sources: tiny timing variations, electrical noise, or hardware designed to measure physical noise directly.\n\nBefore computers were everywhere, randomness came in book form. In 1955 the RAND Corporation published A Million Random Digits with 100,000 Normal Deviates, generated with an electronic roulette wheel, for scientists who needed random numbers.",
        surprise:
          'The internet company Cloudflare has used a wall of lava lamps in its San Francisco office as one source of randomness. A camera photographs the shifting blobs, and the unpredictable images feed into its random number generation.',
        perspectives: [
          {
            lens: 'A programmer',
            take: "A seed is a superpower: I can replay a 'random' simulation exactly to find a bug.",
          },
          {
            lens: 'A security engineer',
            take: 'Weak randomness has broken real systems. If an attacker can guess your seed, they can guess your keys.',
          },
          {
            lens: 'A game designer',
            take: "Players don't always want true randomness. Sometimes we nudge the dice so bad luck doesn't feel unfair.",
          },
        ],
        experiences: ['r-rand-walk'],
        branches: [
          { label: 'Where does truly unpredictable randomness come from?', to: 'rd-quantum' },
          { label: 'What can simple random steps model?', to: 'rd-walk' },
          { label: 'Would a human do better than a formula?', to: 'rd-human' },
        ],
      },
      {
        id: 'rd-quantum',
        title: 'Is anything truly random?',
        question: "Is there randomness that isn't just our ignorance?",
        body:
          "Take a single atom of a radioactive element. Physics can tell you the probability that it will decay in the next hour, but not when it will happen. According to standard quantum mechanics, that's not because we're missing information: the timing is fundamentally probabilistic.\n\nThis troubled many physicists. Albert Einstein expressed his doubts in a 1926 letter to Max Born, writing that he was convinced God 'does not throw dice'. One alternative was 'hidden variables', undiscovered details that secretly determine outcomes. In 1964 John Bell showed that a broad class of such theories, those in which no influence travels faster than light, make predictions that differ from quantum mechanics and can be tested. Experiments since the 1970s, recognised by the 2022 Nobel Prize in Physics awarded to Alain Aspect, John Clauser and Anton Zeilinger, have consistently sided with quantum mechanics.\n\nThat doesn't settle everything. Different interpretations of quantum theory describe the randomness differently, and physicists still debate what is really going on. But it is the strongest candidate we have for randomness built into nature rather than into our knowledge.\n\nSome devices now use quantum effects to generate random numbers.",
        surprise:
          "A radioactive sample's half-life can be measured with great precision, even though the moment any single atom decays is unpredictable. Randomness at the small scale produces reliable regularity at the large scale.",
        perspectives: [
          {
            lens: 'A physicist',
            take: "Quantum randomness isn't a gap in the theory. As far as experiments can tell, it is the theory.",
          },
          {
            lens: 'A philosopher of science',
            take: 'Interpretations differ. Some describe a branching universe with no randomness at all, just uncertainty about which branch you are in.',
          },
          {
            lens: 'A skeptic',
            take: "'Truly random' is a strong claim. What we can say is that no local hidden mechanism has survived testing.",
          },
        ],
        experiences: ['r-rand-estimate'],
        branches: [
          { label: 'Back to the coin: random or not?', to: 'rd-coin' },
          { label: 'How do we use randomness on purpose?', to: 'rd-uses' },
          { label: 'Start over: what do we mean by random?', to: 'rd-start' },
        ],
      },
      {
        id: 'rd-walk',
        title: "The drunkard's walk",
        question: 'What happens when random steps add up?',
        body:
          "Imagine someone taking steps in completely random directions. Where do they end up? This is a random walk, one of the most useful ideas in science.\n\nIn 1827 the botanist Robert Brown watched tiny particles released from pollen grains jiggling restlessly in water. In 1905 Albert Einstein explained this 'Brownian motion' as the result of countless invisible molecules bumping into the particles at random. His analysis helped convince doubters that atoms and molecules were real.\n\nRandom walks have surprising mathematics. The typical distance from the start grows only with the square root of the number of steps: after 100 steps you will usually be somewhere around 10 steps' distance away, not 100. In 1921 the mathematician George Pólya proved that a random walker on an endless grid is certain to return to its starting point eventually in one or two dimensions, but in three dimensions it may wander off forever.\n\nThe same idea models perfume spreading through a room, animals foraging, molecules moving inside cells and, more controversially, stock prices. Simple randomness, repeated, produces structure that can be described precisely.",
        surprise:
          "Pólya's result is often summed up by a quip attributed to the mathematician Shizuo Kakutani: 'A drunk man will find his way home, but a drunk bird may get lost forever.'",
        perspectives: [
          {
            lens: 'A physicist',
            take: 'Diffusion is random walks at enormous scale. Smell, heat and ink in water all spread this way.',
          },
          {
            lens: 'An ecologist',
            take: 'Some animal search patterns look like random walks, though many species layer smarter strategies on top.',
          },
          {
            lens: 'A skeptical investor',
            take: 'Markets resemble random walks in many ways, but big crashes happen more often than the simplest random-walk models predict.',
          },
        ],
        experiences: ['r-rand-walk'],
        branches: [
          { label: 'Why do random paths seem to cluster?', to: 'rd-clusters' },
          { label: 'How do scientists use chance as a tool?', to: 'rd-uses' },
          { label: 'How do computers generate these steps?', to: 'rd-pseudo' },
        ],
      },
      {
        id: 'rd-uses',
        title: 'Putting chance to work',
        question: 'When is randomness the fairest or smartest choice?',
        body:
          "Randomness isn't just something to understand; it's a tool. Ancient Athens chose many public officials by lot, partly to keep the powerful from capturing office, and used a stone allotment device called a kleroterion to select jurors. Today, citizens' assemblies in several countries use random selection to bring together a cross-section of the public to deliberate on hard questions.\n\nIn science, random assignment is the heart of the randomised controlled trial. If people are assigned to treatments by chance rather than by anyone's judgement, the groups should differ only by chance, so a difference in outcomes can more confidently be put down to the treatment. The statistician Ronald Fisher championed randomisation in experimental design in the 1920s and 1930s.\n\nRandomness also solves problems too complicated to calculate directly. In the 1940s, scientists at Los Alamos including Stanislaw Ulam and John von Neumann developed 'Monte Carlo' methods, named after the casino, which estimate answers by running huge numbers of random trials.\n\nArtists have used chance as a collaborator too. The composer John Cage made musical decisions by consulting the I Ching, a classical Chinese text traditionally used by tossing coins or sorting stalks.",
        surprise:
          'Ulam later recalled that the Monte Carlo idea came to him while recovering from an illness and playing solitaire: he wondered whether it was easier to estimate the chance of winning by playing many games than by calculating it.',
        perspectives: [
          {
            lens: 'A democracy researcher',
            take: 'A random sample of citizens can be more representative than self-selected volunteers or professional politicians.',
          },
          {
            lens: 'A scientist',
            take: "Randomisation protects us from our own biases, even ones we don't know we have.",
          },
          {
            lens: 'A skeptic',
            take: 'A lottery is fair in process, not necessarily in outcome. Sometimes we want judgement, not dice.',
          },
        ],
        experiences: ['r-rand-debate'],
        branches: [
          { label: 'Back to the beginning: what is random?', to: 'rd-start' },
          { label: 'Why do lucky streaks fool us?', to: 'rd-gambler' },
          { label: 'How do random walks model the world?', to: 'rd-walk' },
        ],
      },
    ],
  },

  /* ================================================================ */
  {
    id: 'plant-signals',
    title: 'Do plants communicate?',
    hook: 'Scents that summon wasps, clicks too high to hear, and a lively argument about words. What plants really do with information, and what is still uncertain.',
    topics: ['plants', 'nature', 'science', 'philosophy'],
    start: 'ps-start',
    nodes: [
      {
        id: 'ps-start',
        title: 'What would it mean for a plant to talk?',
        question: 'Can something without a brain send a message?',
        body:
          "Plants can't run, shout or frown, yet they are far from passive. They sense light, gravity, touch, water, chemicals and damage, and they respond by growing, changing their chemistry, opening or closing pores and releasing scents. The question is whether any of this counts as communication.\n\nThat depends on definitions. Biologists who study behaviour often distinguish a signal, something that evolved because it influences a receiver, from a cue, information others can pick up even though it didn't evolve for that purpose. A wolf's howl is a signal; its footprints are a cue. Under that strict definition, much of what plants do may be better described as giving off cues that others, including other plants, have evolved to read.\n\nOther researchers use 'communication' more loosely, to mean any transfer of information that changes another organism's behaviour. Under that definition, plants communicate constantly: with insects, fungi, microbes and each other.\n\nThis rabbit hole keeps both definitions in view and tries to separate solid findings from exciting but contested claims. Choose a thread to pull.",
        surprise:
          'Plants can detect neighbours before touching them. Leaves absorb red light but reflect far-red light, so a drop in the ratio of red to far-red light warns a plant that competitors are nearby, and many species respond by growing taller to escape the coming shade.',
        perspectives: [
          {
            lens: 'A plant biologist',
            take: "Plants process information in sophisticated ways. Whether we call that 'communication' is partly a question of vocabulary.",
          },
          {
            lens: 'A behavioural ecologist',
            take: 'The signal-versus-cue distinction keeps us honest. Not every leak of information is a message.',
          },
          {
            lens: 'A philosopher',
            take: "Words like 'talk' and 'listen' come from human life. Borrowing them can illuminate, or mislead.",
          },
        ],
        experiences: ['r-plant-quiz'],
        branches: [
          { label: 'Can plants smell danger?', to: 'ps-volatiles' },
          { label: "Is there really a 'wood wide web' underground?", to: 'ps-network' },
          { label: 'How do plants send signals without nerves?', to: 'ps-electric' },
        ],
      },
      {
        id: 'ps-volatiles',
        title: 'The smell of being eaten',
        question: 'Do damaged plants warn their neighbours?',
        body:
          "Damaged leaves release a burst of airborne chemicals. Many plants do this when insects chew them, and the blend can vary with the attacker.\n\nIn 1983 two studies, one by Ian Baldwin and Jack Schultz with poplar and maple seedlings and one by David Rhoades with willows, suggested that undamaged plants near damaged ones increased their chemical defences. The press called it 'talking trees'. Many scientists were sceptical, criticising the experimental designs, and the idea fell out of fashion for years.\n\nLater work has made the core finding more solid. The ecologist Richard Karban and colleagues showed in field experiments that wild tobacco plants growing near clipped sagebrush suffered less insect damage, apparently because they picked up airborne cues from the sagebrush. Karban has also reported that sagebrush responds more strongly to cues from closely related neighbours.\n\nWhat remains debated is interpretation. Is the damaged plant 'warning' its neighbours, or are the neighbours eavesdropping on chemicals that mainly help the damaged plant itself? Airborne cues can travel between a plant's own branches faster than signals moving through its tissues, so the first audience may be the plant itself.",
        surprise:
          "The smell of freshly cut grass is largely made of 'green leaf volatiles', compounds plants release within seconds of being damaged. A mown lawn's scent is, in a sense, the smell of plants under attack.",
        perspectives: [
          {
            lens: 'An ecologist',
            take: "The evidence that plants respond to their neighbours' airborne chemicals is now strong in several systems. 'Talking' is the shaky part.",
          },
          {
            lens: 'An evolutionary biologist',
            take: "Why would a plant help its competitors? Unless they're relatives, or the benefit is really to itself, warning others is hard to explain.",
          },
          {
            lens: 'A gardener',
            take: "I've always felt my plants were reacting to each other. It's nice to know there's something to it, even if 'talking' oversells it.",
          },
        ],
        experiences: ['r-plant-spread'],
        branches: [
          { label: 'Can plants call in bodyguards?', to: 'ps-bodyguards' },
          { label: 'Is it a warning, or eavesdropping?', to: 'ps-eavesdrop' },
          { label: 'Do plants share signals underground too?', to: 'ps-network' },
        ],
      },
      {
        id: 'ps-bodyguards',
        title: 'Calling in bodyguards',
        question: 'Can a plant summon the enemies of its enemies?',
        body:
          "Some of the clearest examples of plants influencing other organisms involve insects. When caterpillars chew on maize, the plant releases a blend of airborne compounds. In a 1990 study, Ted Turlings, James Tumlinson and W. Joe Lewis showed that parasitic wasps were attracted to this blend, and those wasps lay their eggs inside caterpillars. Similar responses have been described in other plants: lima beans attacked by spider mites, for instance, release compounds that attract predatory mites.\n\nCrucially, the chemicals released after insect feeding can differ from those released after simple mechanical damage, which suggests they carry information about the attacker. In some cases, substances in the caterpillar's saliva help trigger the response.\n\nThis 'indirect defence' is one of the strongest cases for something like plant communication. The plant benefits, the predators benefit, and only the herbivore loses. Researchers have explored whether crops with stronger bodyguard-attracting responses could help with natural pest control.\n\nStill, 'calling' is a metaphor. The plant doesn't intend anything the way a person does. Evolution has favoured plants whose chemical responses happen to recruit helpers.",
        surprise:
          'Roots can recruit help too. Maize roots attacked by beetle larvae release a compound that attracts tiny worms called nematodes, which hunt those larvae. Many North American maize varieties appear to have largely lost this ability during breeding.',
        perspectives: [
          {
            lens: 'An entomologist',
            take: "Parasitic wasps can learn to associate these smells with prey. The plant's chemistry becomes part of the wasp's search strategy.",
          },
          {
            lens: 'A farmer',
            take: 'If crops can recruit their own pest control, that could mean less spraying. The challenge is making it reliable in real fields.',
          },
          {
            lens: 'A skeptic',
            take: "A 'cry for help' is a vivid phrase. It's a story about evolution, not about plant intentions.",
          },
        ],
        experiences: ['r-plant-walk'],
        branches: [
          { label: 'Is this a message, or eavesdropping?', to: 'ps-eavesdrop' },
          { label: 'Can plants detect insects by sound?', to: 'ps-sound' },
          { label: 'Start over with the big question', to: 'ps-start' },
        ],
      },
      {
        id: 'ps-eavesdrop',
        title: 'Signal or eavesdropping?',
        question: 'If a plant gives away information, is that the same as sending a message?',
        body:
          "Imagine a neighbour overhears you on the phone saying a storm is coming, and brings in their washing. You didn't communicate with them; they eavesdropped. Many plant interactions may work like this.\n\nThe parasitic plant dodder is a vivid example. It has almost no leaves, and its seedlings must find a host quickly. In a 2006 study, Justin Runyon, Mark Mescher and Consuelo De Moraes showed that dodder seedlings grew towards the scent of tomato plants and could tell tomato from wheat. The tomato certainly isn't trying to attract its parasite. Dodder simply evolved to read cues the tomato gives off.\n\nThis raises a puzzle for the 'talking trees' story. If a damaged plant's chemicals help its neighbours defend themselves, why would natural selection favour releasing them? Neighbours are usually competitors for light and water. Possible answers include: the chemicals mainly help the damaged plant itself, the neighbours are often relatives, or the information simply leaks and neighbours have evolved to use it.\n\nFrom a plant's point of view, the world may be full of information, but not all of it is meant to be shared.",
        surprise:
          'The researchers reported that dodder seedlings grew towards several individual compounds from tomato scent, while one compound from wheat seemed to put them off.',
        perspectives: [
          {
            lens: 'A behavioural ecologist',
            take: 'Eavesdropping is everywhere in nature. Information leaks, and evolution exploits leaks.',
          },
          {
            lens: 'A plant scientist',
            take: 'The line between signal and cue can be hard to draw for plants. Many chemicals do several jobs at once.',
          },
          {
            lens: 'A philosopher',
            take: 'Communication may require a sender with something at stake. That is a useful test for each new claim.',
          },
        ],
        experiences: ['r-plant-quiz'],
        branches: [
          { label: 'Do plants treat relatives differently?', to: 'ps-kin' },
          { label: 'Back to the big question: what counts as talking?', to: 'ps-start' },
          { label: "If not talking, are plants 'intelligent'?", to: 'ps-mind' },
        ],
      },
      {
        id: 'ps-network',
        title: 'The wood wide web, and its critics',
        question: 'Are trees linked by an underground internet of fungi?',
        body:
          "Most plants live in partnership with mycorrhizal fungi. The fungi wrap around or enter plant roots and extend fine threads through the soil, helping the plant gather water and nutrients in exchange for sugars. The partnership is ancient and extremely widespread.\n\nBecause one fungus can connect to several plants, and one plant to several fungi, plants can be linked in a 'common mycorrhizal network'. In 1997 the forest ecologist Suzanne Simard and colleagues reported in Nature that carbon appeared to move between birch and Douglas fir seedlings through such connections. The journal's cover called it the 'wood-wide web'.\n\nThe idea grew into popular stories of 'mother trees' feeding their offspring and forests cooperating through fungal networks. Those stories have been challenged. In a 2023 review, Justine Karst and colleagues argued that claims about networks moving meaningful resources and warning signals between trees in real forests have been overstated, with field evidence weaker than often presented.\n\nWhat seems safe to say: mycorrhizal fungi are vital, networks can exist, and some transfers have been measured. How often they matter in real forests, and whether 'sharing' is the right word, is genuinely open.",
        surprise:
          'Fossils suggest partnerships between plants and fungi go back more than 400 million years, to some of the earliest plants on land. Fungi may have helped plants colonise land in the first place.',
        perspectives: [
          {
            lens: 'A forest ecologist',
            take: 'Fungal networks are real, and life below ground is hugely underappreciated. The details matter for how we manage forests.',
          },
          {
            lens: 'A critic',
            take: 'Extraordinary claims need field evidence. A beautiful metaphor should not outrun the data.',
          },
          {
            lens: 'A mycologist',
            take: "Remember the fungus has its own interests. It isn't just a cable between trees; it's an organism trading on its own terms.",
          },
        ],
        experiences: ['r-plant-quiz'],
        branches: [
          { label: 'Do plants favour their relatives?', to: 'ps-kin' },
          { label: 'Are plants intelligent, then?', to: 'ps-mind' },
          { label: 'What about signals through the air?', to: 'ps-volatiles' },
        ],
      },
      {
        id: 'ps-electric',
        title: 'Fast signals without nerves',
        question: 'How does a plant send a message from one leaf to another?',
        body:
          "Plants have no nerves, but they do use electrical signals. The Venus flytrap is the showpiece. Its trap is lined with sensitive trigger hairs. Touch one and an electrical impulse, an action potential a little like those in animal nerves, passes through the leaf. One touch usually isn't enough: two touches within a short window, around twenty to thirty seconds, make the trap snap shut, which helps it avoid wasting effort on raindrops and debris.\n\nIn 2016, Rainer Hedrich's group reported that the flytrap effectively keeps counting. As trapped prey struggles and triggers more impulses, five or more of them switch on the production of digestive enzymes and the machinery for absorbing nutrients.\n\nOrdinary plants signal too. In a 2018 study, Masatsugu Toyota, Simon Gilroy and colleagues filmed plants engineered to glow where calcium levels rise. When a caterpillar chewed one leaf, a wave of calcium swept to other leaves within minutes, set off by the amino acid glutamate, switching on defences far from the wound.\n\nThese are genuine, fast, long-distance signals within a plant. Whether they are 'like a nervous system' is a matter of analogy rather than anatomy.",
        surprise:
          'Touch changes how many plants grow. Plants that are regularly brushed, shaken or blown by wind often grow shorter and sturdier, a response called thigmomorphogenesis. Some growers brush their seedlings daily to toughen them up.',
        perspectives: [
          {
            lens: 'A plant physiologist',
            take: 'Electrical and chemical signals are tightly linked in plants. The calcium wave is a beautiful example.',
          },
          {
            lens: 'A neuroscientist',
            take: 'Similar electrical tools turn up in very different organisms. Shared tools do not imply shared minds.',
          },
          {
            lens: 'A skeptic',
            take: "'Plant nervous system' makes a good headline. 'Plant signalling' is more accurate.",
          },
        ],
        experiences: ['r-plant-touch'],
        branches: [
          { label: 'Are plants intelligent?', to: 'ps-mind' },
          { label: 'Can plants sense sound and vibration?', to: 'ps-sound' },
          { label: 'What do these signals switch on?', to: 'ps-bodyguards' },
        ],
      },
      {
        id: 'ps-sound',
        title: 'Do plants listen, or click?',
        question: 'Can plants respond to sound, or even make it?',
        body:
          "Sound is a newer frontier in plant research, and results deserve care.\n\nIn a 2014 study, Heidi Appel and Rex Cocroft recorded the vibrations a caterpillar makes while chewing a leaf. When they played these vibrations to thale cress plants, the plants later produced more defensive chemicals when attacked than plants that had been kept in silence. Vibrations from wind or from a harmless insect's song did not have the same effect, suggesting some specificity.\n\nIn 2023 a team led by Lilach Hadany reported that stressed tomato and tobacco plants, either dehydrated or cut, emitted ultrasonic clicks too high-pitched for humans to hear, and that machine-learning models could tell from the sounds what kind of stress a plant was under. Whether any animal or plant actually responds to these sounds is not yet known. The clicks may simply be a physical side effect, a little like the creak of a drying branch.\n\nOther work from the same lab suggested that beach evening primrose flowers produced sweeter nectar soon after being exposed to the sound of a bee's wingbeat. It's an exciting result that needs more replication.\n\nThis is a field where curiosity is high and caution is wise.",
        surprise:
          'In the 2023 study, well-watered, undamaged plants made very few sounds, while stressed plants clicked far more. The researchers suggest that, in principle, microphones might one day help growers spot thirsty crops.',
        perspectives: [
          {
            lens: 'A bioacoustician',
            take: 'Vibrations travel well through stems and leaves. It would be surprising if no plant had evolved to use them.',
          },
          {
            lens: 'A skeptic',
            take: "Making a sound isn't the same as communicating. Ice cracks too.",
          },
          {
            lens: 'A farmer',
            take: "If a microphone can tell me which plants are thirsty, I don't need them to be talking, just useful.",
          },
        ],
        experiences: ['r-plant-quiz'],
        branches: [
          { label: 'How do signals travel inside a plant?', to: 'ps-electric' },
          { label: 'Is a click a message, or a leak?', to: 'ps-eavesdrop' },
          { label: 'Does responding to sound make a plant intelligent?', to: 'ps-mind' },
        ],
      },
      {
        id: 'ps-kin',
        title: 'Plants that recognise relatives',
        question: 'Can a plant tell family from strangers?',
        body:
          "Many animals treat relatives differently from strangers. Some evidence suggests plants may too, though how they would do it is still being worked out.\n\nIn 2007 Susan Dudley and Amanda File grew sea rocket, a beach plant, in pots with either siblings or unrelated plants of the same species. Plants sharing a pot with strangers put more growth into roots, a sign of competing harder for water and nutrients, than plants growing with siblings. The idea is that holding back with relatives could benefit shared genes.\n\nField studies of sagebrush by Richard Karban and colleagues suggested that plants responded more strongly to airborne cues from close relatives than from unrelated plants. Other research has looked at how roots respond to chemicals released by neighbouring roots, which might be one way plants detect who is nearby.\n\nKin recognition in plants is still debated. Root growth is affected by pot size, nutrients and many other factors, and some experiments have proved hard to interpret or repeat. Still, it is a striking possibility: that a plant's behaviour depends not only on whether it has neighbours, but on who they are.",
        surprise:
          "Some studies suggest roots can tell 'self' from 'other': a plant's roots may grow differently when they meet roots of a different plant than when they meet their own.",
        perspectives: [
          {
            lens: 'An evolutionary biologist',
            take: 'Kin selection predicts restraint towards relatives. Finding it in plants would show how general that logic is.',
          },
          {
            lens: 'A skeptic',
            take: 'Root mass in pots is a noisy measure. Careful controls and repeat experiments matter.',
          },
          {
            lens: 'A gardener',
            take: 'Seeds from the same parent often land together. Maybe that changes how they grow.',
          },
        ],
        experiences: ['r-plant-walk'],
        branches: [
          { label: 'Do fungal networks favour relatives too?', to: 'ps-network' },
          { label: 'Why would a plant warn its neighbours at all?', to: 'ps-eavesdrop' },
          { label: 'Back to the big question', to: 'ps-start' },
        ],
      },
      {
        id: 'ps-mind',
        title: 'Are plants intelligent?',
        question: "Is 'plant intelligence' a discovery or a metaphor?",
        body:
          "Since the mid-2000s, researchers including Stefano Mancuso and František Baluška have argued for 'plant neurobiology': the idea that plants integrate information, make decisions and could reasonably be called intelligent. Their work has drawn attention to how sophisticated plant behaviour is.\n\nIt has also drawn sharp criticism. In 2007 a group of plant scientists published a letter titled 'Plant neurobiology: no brain, no gain?', arguing that the term misleads, since plants have no neurons, synapses or brains, and that eye-catching analogies were running ahead of the evidence.\n\nThe debate continues around specific experiments. In 2014 Monica Gagliano and colleagues reported that Mimosa pudica plants, which fold their leaves when disturbed, stopped folding after being repeatedly dropped harmlessly, and kept this habituation for weeks. Some researchers accept this as a form of learning; others question the interpretation. A later study from Gagliano suggesting pea plants could learn associations did not replicate in a 2020 attempt by other researchers.\n\nMuch depends on definitions. If intelligence means flexible, adaptive responses to a changing environment, plants qualify in some sense. If it requires experience or awareness, there is no good evidence plants have it, and no agreed way to test.",
        surprise:
          "In Gagliano's mimosa experiment, plants that had stopped responding to the drop still folded when shaken in a new way. That suggests they weren't simply exhausted; they had stopped responding specifically to the harmless drop.",
        perspectives: [
          {
            lens: 'A plant neurobiologist',
            take: 'Plants solve problems (finding light, water and partners) without a central brain. We should study that on its own terms.',
          },
          {
            lens: 'A critic',
            take: "Calling it 'neurobiology' imports assumptions that don't fit. 'Adaptive behaviour' says enough.",
          },
          {
            lens: 'A philosopher',
            take: 'The question reveals as much about our concepts as about plants. Intelligence may come in more than one shape.',
          },
        ],
        experiences: ['r-plant-quiz', 'r-plant-touch'],
        branches: [
          { label: 'Back to basics: what counts as communication?', to: 'ps-start' },
          { label: 'How do fast electrical signals fit in?', to: 'ps-electric' },
          { label: "What about the 'wood wide web'?", to: 'ps-network' },
        ],
      },
    ],
  },
];
