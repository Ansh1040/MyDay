import type {
  CodingPayload,
  DebatePayload,
  Experience,
  GamePayload,
  ListeningPayload,
  QuizPayload,
  ReadingPayload,
  SimulationPayload,
  SketchPayload,
  StepsPayload,
  WritingPayload,
} from '../types';

// Curated general experiences (ids prefixed `g-`), spread across every format, topic and area.
// Facts are written to be accurate; anything uncertain is hedged in the text itself.
// `related` only points at ids in this file.

export const EXPERIENCES_GENERAL: Experience[] = [
  // ───────────────────────────── Reading ─────────────────────────────
  {
    id: 'g-earworms',
    title: 'Why songs get stuck in your head',
    summary:
      "Earworms are one of memory's most common quirks. Here's what researchers have learned about which tunes stick — and how people shake them loose.",
    area: 'rabbit',
    format: 'reading',
    topics: ['music', 'mind'],
    minutes: 6,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      sections: [
        {
          heading: "The loop you didn't choose",
          text:
            "Psychologists call it involuntary musical imagery; most of us call it an earworm, a word borrowed from the German Ohrwurm. Surveys suggest the large majority of people get them at least now and then. What arrives is rarely a whole song. Usually it's a fragment — a chorus, a hook, a few seconds of melody that ends and then politely starts again. Earworms tend to show up when the mind has spare capacity: walking, showering, doing chores. They're often set off by something small, too — a word from the lyrics, a person you associate with the song, or simply having heard it recently.",
        },
        {
          heading: 'What makes a tune sticky',
          text:
            "A study published in 2016 by music psychologists led by Kelly Jakubowski compared songs people often named as earworms with songs that were just as popular but rarely got stuck. The sticky ones tended to be fairly fast, with an overall melodic shape that was common and easy to sing — often rising and then falling — plus something slightly unusual, such as an unexpected leap or a run of repeated notes. Lady Gaga's 'Bad Romance' topped that study's list of most-named earworms. Exposure matters as well: songs heard often, and recently, are more likely to come back uninvited. None of this is a guaranteed recipe, but it suggests catchiness is a balance of the familiar and the surprising.",
        },
        {
          heading: 'Why the brain hits repeat',
          text:
            "Nobody knows for certain. One popular idea links earworms to the way memory handles unfinished business: we tend to keep rehearsing things that feel incomplete, and a looping fragment is, by definition, never finished. Another points to the inner voice we use to rehearse words and sounds — the same one you use to hold a phone number in mind. Earworms seem to borrow it, which may be why they're usually brief. For most people they're mildly annoying or even pleasant, though a minority find them genuinely distressing.",
        },
        {
          heading: 'How to evict one',
          text:
            "Several small studies point to tactics worth trying. Researchers at the University of Reading found that chewing gum reduced how often people heard an unwanted tune, possibly because it keeps the jaw busy in a way that interferes with silent rehearsal. Another study found that a moderately demanding task — anagrams, or a sudoku that isn't too hard — helped push a song out, while tasks that were too easy or too frustrating let it back in. Some people swear by listening to the whole song through, to give it an ending. If nothing works, the reassuring news is that most earworms fade on their own.",
        },
      ],
      sources: [{ label: 'Wikipedia — Earworm', url: 'https://en.wikipedia.org/wiki/Earworm' }],
    } satisfies ReadingPayload,
    related: ['g-listen-moods', 'g-listen-rhythm', 'g-rhythm-tap'],
    followUps: [
      'Note your next earworm: what were you doing, and what might have triggered it?',
      'Try the gum trick or a medium-hard puzzle the next time one arrives.',
      'Listen to two versions of the same phrase in "One phrase, two moods".',
    ],
  },
  {
    id: 'g-desire-paths',
    title: 'Desire paths: maps drawn by feet',
    summary:
      'Those worn shortcuts across the grass are a quiet vote on how a place should work. What they reveal, and why some planners wait for them.',
    area: 'rabbit',
    format: 'reading',
    topics: ['cities', 'maps'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      sections: [
        {
          heading: 'Paths nobody drew',
          text:
            "Cut across almost any park and you'll find them: thin brown lines worn through the grass where people took a shorter, smoother or more natural route than the one laid out for them. Planners call them desire paths or desire lines. They form through a kind of quiet consensus. A few people step off the pavement, the grass wears thin, and the visible track invites the next person to follow. Within a season, choices made by strangers who never met become a route everyone uses — a map drawn by feet.",
        },
        {
          heading: 'Planning by waiting',
          text:
            "Some designers treat desire paths as free research. A story told about several university campuses goes like this: the architects planted grass, waited to see where people walked, and only then paved the worn lines. Accounts disagree about where this first happened, so treat any single origin story with caution — but the approach itself is real and still discussed by landscape architects. Others take the opposite view and try to block informal routes with fences, hedges or 'keep off the grass' signs. Often the result is simply a new path that bends around the obstacle.",
        },
        {
          heading: 'What they tell you',
          text:
            "A desire path is a small argument between a plan and the people using it. It might reveal a crossing placed too far from where people need it, a corner that forces walkers the long way round, or an entrance nobody anticipated. They aren't unique to humans: animals wear similar trails between water, shelter and food. Fresh snow is a good time to look, because new lines can appear within hours. Next time you spot one, ask what it's telling you — where were people trying to go, and what was in their way?",
        },
      ],
      sources: [{ label: 'Wikipedia — Desire path', url: 'https://en.wikipedia.org/wiki/Desire_path' }],
    } satisfies ReadingPayload,
    related: ['g-memory-map', 'g-oldest-thing', 'g-quiz-maps'],
    followUps: [
      'Find and photograph one desire path near you. Where does it lead?',
      'Draw a map of your neighbourhood from memory and mark the shortcuts you take.',
      'Notice one place where you break the official route — and why.',
    ],
  },
  {
    id: 'g-railway-time',
    title: 'How railways reset the clocks',
    summary:
      'Not long ago, every town kept its own time. Then fast trains arrived, and the hour on your wall became a matter of agreement rather than sunlight.',
    area: 'rabbit',
    format: 'reading',
    topics: ['history', 'time', 'maps'],
    minutes: 7,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      sections: [
        {
          heading: 'Every town its own noon',
          text:
            "For most of history, time was local. Noon was when the sun stood highest over your town, and clocks were set to match. Because the Earth turns about 15 degrees an hour, noon arrives roughly four minutes later for every degree you travel west. Bristol, about two and a half degrees west of London, ran around ten minutes behind it. Nobody much minded: when a journey between two towns took a day by coach, a few minutes' difference between their clocks hardly mattered.",
        },
        {
          heading: 'Trains broke the system',
          text:
            "Railways changed that. A timetable listing a dozen slightly different local times is confusing, and on a busy line confusion can be dangerous. In 1840 Britain's Great Western Railway began running its trains on London time, and other companies followed over the next few years. Towns gradually adopted 'railway time' for everyday life too, though not always happily. Bristol's Corn Exchange still has a clock with two minute hands — one for London time and one for local Bristol time. Greenwich Mean Time became Britain's legal standard in 1880.",
        },
        {
          heading: 'The day of two noons',
          text:
            "North America faced a bigger version of the same tangle, with dozens of local times in use by different railroads. On 18 November 1883 the railroads switched to a handful of standard time zones; in many places clocks were reset around midday, which earned it the nickname 'the day of two noons'. The following year, the International Meridian Conference in Washington chose Greenwich as the world's prime meridian. Remarkably, the US government didn't make the time zones official law until the Standard Time Act of 1918.",
        },
        {
          heading: 'Time is an agreement',
          text:
            "Time zones look scientific on a map, but they're as much political as astronomical. China spans roughly five time zones' worth of longitude, yet has used a single official time since 1949. Spain lies mostly west of Greenwich but keeps Central European Time, a choice made in 1940. Some countries change their clocks twice a year; others have stopped. The hour on your phone is less a fact about the sun than a long-running agreement between people — one that railways forced into being.",
        },
      ],
      sources: [
        { label: 'Wikipedia — Railway time', url: 'https://en.wikipedia.org/wiki/Railway_time' },
        { label: 'Wikipedia — Standard time', url: 'https://en.wikipedia.org/wiki/Standard_time' },
        { label: 'Wikipedia — International Meridian Conference', url: 'https://en.wikipedia.org/wiki/International_Meridian_Conference' },
      ],
    } satisfies ReadingPayload,
    related: ['g-quiz-maps', 'g-energy-map', 'g-oldest-thing'],
    followUps: [
      "Work out your town's longitude and how far its solar noon is from clock noon.",
      'Watch where the sun is at exactly 12:00 today — is it due south (or north) of you?',
      'Look for an old public clock near you and find out when it was installed.',
    ],
  },
  {
    id: 'g-plant-clocks',
    title: 'How plants keep time',
    summary:
      'A mimosa in a dark cupboard, a garden that tells the hour, and the discovery that many plants measure the length of the night.',
    area: 'rabbit',
    format: 'reading',
    topics: ['plants', 'science', 'time'],
    minutes: 7,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      sections: [
        {
          heading: 'A plant in the dark',
          text:
            "In 1729 the French astronomer Jean-Jacques d'Ortous de Mairan tried something simple. He kept a mimosa plant — whose leaves open by day and fold at night — in darkness, and watched. The leaves carried on opening and folding on roughly the same daily schedule, with no sunlight to cue them. The rhythm seemed to come from inside the plant. It was one of the earliest recorded glimpses of what we now call a circadian rhythm, from the Latin circa diem, 'about a day'. Biologists have since found internal daily clocks across a remarkable range of life, from some bacteria to fungi, plants and people.",
        },
        {
          heading: 'A garden that tells the time',
          text:
            "In 1751 the Swedish botanist Carl Linnaeus proposed a 'flower clock': a garden planted with species that open and close at different hours, so you could read the time from the flowerbeds. Whether anyone ever grew a fully working one is doubtful — opening times shift with latitude, season and weather. But the idea captures something true. Many flowers keep schedules, some opening at dawn, some at midday and some only in the evening, often in step with the hours their pollinators are about.",
        },
        {
          heading: 'Measuring the night',
          text:
            "Plants don't just keep time; they measure it. In the 1920s two US Department of Agriculture scientists, Wightman Garner and Harry Allard, showed that a tobacco variety called Maryland Mammoth flowered only when days grew short. They named the phenomenon photoperiodism. Later experiments revealed a twist: for many species, what really matters is the length of uninterrupted darkness. Interrupt a long night with a brief flash of light and a 'short-day' plant may not flower at all. Plants sense this partly through light-sensitive pigments called phytochromes, which respond to red and far-red light.",
        },
        {
          heading: 'Why bother keeping time?',
          text:
            "A clock lets a plant anticipate rather than merely react. It can ready its photosynthesis machinery before dawn, and some flowers release scent at the hours their pollinators fly — certain petunias, for instance, smell strongest in the evening, when the moths that visit them are active. Experiments with the small lab plant Arabidopsis have found that plants whose internal clock matches the length of their day tend to grow better than plants with a mismatched clock. For an organism that can't walk away, timing is a way of making the most of where it stands.",
        },
      ],
      sources: [
        { label: 'Wikipedia — Circadian rhythm', url: 'https://en.wikipedia.org/wiki/Circadian_rhythm' },
        { label: 'Wikipedia — Photoperiodism', url: 'https://en.wikipedia.org/wiki/Photoperiodism' },
        { label: "Wikipedia — Linnaeus's flower clock", url: 'https://en.wikipedia.org/wiki/Linnaeus%27s_flower_clock' },
      ],
    } satisfies ReadingPayload,
    related: ['g-bean-diary', 'g-regrow-scraps', 'g-meet-a-tree'],
    followUps: [
      'Watch one flower or houseplant at the same times morning and evening for three days.',
      'Start a two-week bean diary and see a seed sense gravity.',
      'Note when you feel most alert across a day — your own clock at work.',
    ],
  },
  {
    id: 'g-umami',
    title: 'Umami: the taste with a birth year',
    summary:
      'Sweet, sour, salty and bitter are ancient ideas. The fifth basic taste was named in 1908, in a bowl of seaweed broth.',
    area: 'general',
    format: 'reading',
    topics: ['food', 'science', 'language'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      sections: [
        {
          heading: 'A flavour without a name',
          text:
            "In 1908 the Japanese chemist Kikunae Ikeda set out to explain a flavour he noticed in kombu dashi, the seaweed broth at the heart of much Japanese cooking. It wasn't sweet, sour, salty or bitter. He isolated the substance responsible — glutamate — and named the taste umami, from umai, meaning delicious. Ikeda then patented a way of producing monosodium glutamate, which went on sale in 1909 under the brand name Ajinomoto. It's rare for a basic sensation to have such a clear origin story.",
        },
        {
          heading: 'A long wait for recognition',
          text:
            "For much of the twentieth century, many Western scientists treated umami as a flavour enhancer rather than a taste in its own right. The turning point came around 2000, when researchers identified receptors on the tongue that respond specifically to glutamate. That gave umami the same kind of biological footing as the other basic tastes, and it's now widely counted as the fifth. Some researchers argue there may be more — fat, and a 'richness' sensation called kokumi, have both been proposed — though these are still debated.",
        },
        {
          heading: 'Where it hides',
          text:
            "Glutamate turns up in ripe tomatoes, aged cheeses such as Parmesan, mushrooms, soy sauce, fish sauce and cured meats. Cooks were using it long before it had a name: garum, the fermented fish sauce popular in ancient Rome, was almost certainly rich in it. There's also a useful piece of kitchen chemistry. Glutamate works in synergy with compounds called inosinate (found in meat and fish) and guanylate (found in dried mushrooms), so a combination tastes far more savoury than either alone. It's one reason dashi often pairs kombu with dried bonito flakes.",
        },
      ],
      sources: [
        { label: 'Wikipedia — Umami', url: 'https://en.wikipedia.org/wiki/Umami' },
        { label: 'Wikipedia — Kikunae Ikeda', url: 'https://en.wikipedia.org/wiki/Kikunae_Ikeda' },
      ],
    } satisfies ReadingPayload,
    related: ['g-taste-nose', 'g-cook-unfamiliar', 'g-quiz-word-origins'],
    followUps: [
      'Taste a ripe tomato, then a tomato with a little grated Parmesan. Notice the difference.',
      'Try the nose-pinch experiment to separate taste from smell.',
      'Next time you cook, add one umami ingredient and note what changes.',
    ],
  },

  // ───────────────────────────── Quiz ─────────────────────────────
  {
    id: 'g-quiz-sound',
    title: 'Sound: hunch or fact?',
    summary: 'Six quick questions about how sound travels, how loud is loud, and why your recorded voice sounds so strange.',
    area: 'rabbit',
    format: 'quiz',
    topics: ['sound', 'science'],
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
          prompt: 'Through which of these does sound travel fastest?',
          options: ['Air', 'Water', 'Steel'],
          answer: 2,
          explain:
            'Roughly 343 m/s in air at 20 °C, about 1,480 m/s in water, and around 5,000–6,000 m/s in steel. Stiffer materials pass vibrations along faster.',
        },
        {
          id: 'q2',
          prompt: 'Can sound travel through the near-vacuum of space?',
          options: ['Yes, just more quietly', 'No — it needs something to travel through', 'Only very low notes'],
          answer: 1,
          explain:
            'Sound is a vibration passed from particle to particle. With almost no particles, there is almost nothing to carry it. Roaring spaceships in films are artistic licence.',
        },
        {
          id: 'q3',
          prompt: 'What is the rough range of human hearing?',
          options: ['20 Hz to 200 Hz', '20 Hz to 20,000 Hz', '2,000 Hz to 200,000 Hz'],
          answer: 1,
          explain: 'About 20 Hz to 20 kHz for many young people. The upper limit usually falls with age.',
        },
        {
          id: 'q4',
          prompt: 'A sound 10 decibels louder carries how much more energy?',
          options: ['About 10% more', 'About twice as much', 'About ten times as much'],
          answer: 2,
          explain:
            'Decibels are logarithmic: +10 dB means ten times the intensity — yet most people hear it as only about twice as loud.',
        },
        {
          id: 'q5',
          prompt: 'Why does your recorded voice sound odd to you?',
          options: [
            'Microphones distort voices',
            'You normally hear your voice partly through the bones of your head',
            'Recordings play back slightly faster',
          ],
          answer: 1,
          explain:
            'When you speak, vibrations reach your inner ear through your skull as well as through the air, which adds depth. A recording gives you only the airborne version — the one everyone else hears.',
        },
        {
          id: 'q6',
          prompt: 'You see lightning and count six seconds before the thunder. Roughly how far away was it?',
          options: ['About 200 m', 'About 2 km', 'About 20 km'],
          answer: 1,
          explain: 'Light arrives almost instantly; sound covers about 1 km every 3 seconds (about a mile every 5). Six seconds ≈ 2 km.',
        },
      ],
    } satisfies QuizPayload,
    related: ['g-listen-silence', 'g-estimate-world', 'g-rubber-band-guitar'],
    followUps: [
      'Record your voice, then listen back with one ear covered while you speak along.',
      'Next storm, count the seconds between flash and rumble and track whether it approaches.',
    ],
  },
  {
    id: 'g-quiz-maps',
    title: 'Is the map lying?',
    summary: 'Every flat map of a round world distorts something. Test your hunches about projections, routes and which way is up.',
    area: 'rabbit',
    format: 'quiz',
    topics: ['maps', 'math'],
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
          prompt: 'On a Mercator world map, Greenland and Africa look similar in size. In reality, Africa is about…',
          options: ['The same size', 'Three times larger', 'Fourteen times larger'],
          answer: 2,
          explain:
            'Africa covers about 30 million km²; Greenland about 2.2 million km². Mercator stretches areas more and more as you move towards the poles.',
        },
        {
          id: 'q2',
          prompt: 'Gerardus Mercator designed his 1569 map mainly for…',
          options: ['Sailors', 'Tax collectors', 'School classrooms'],
          answer: 0,
          explain:
            'On a Mercator map a line of constant compass bearing is a straight line, which made it useful for navigation at sea. The price is size distortion.',
        },
        {
          id: 'q3',
          prompt: 'Could a clever enough flat map show the whole globe with no distortion at all?',
          options: ['Yes, with the right projection', 'No, never'],
          answer: 1,
          explain:
            "Carl Friedrich Gauss proved in 1827 that a sphere's curvature can't be flattened without stretching. Every projection trades off area, shape, distance or direction.",
        },
        {
          id: 'q4',
          prompt: 'Why do long-haul flight routes often look curved on flat maps?',
          options: ['To avoid bad weather', 'The shortest path on a sphere is a great-circle arc', 'Air traffic rules'],
          answer: 1,
          explain:
            'The shortest route between two points on a globe follows a great circle, which looks curved once flattened. Winds and airspace also shape real routes, but geometry explains most of the curve.',
        },
        {
          id: 'q5',
          prompt: 'Has north always been at the top of maps?',
          options: ['Yes, it is a geographical rule', 'No — it is a convention'],
          answer: 1,
          explain:
            "Many medieval European world maps put east at the top, and al-Idrisi's famous 1154 map for Roger II of Sicily put south at the top. North-up became the norm much later.",
        },
        {
          id: 'q6',
          prompt: 'Just for you: which map would you hang on your wall?',
          options: ['A classic world map', 'A map of a place I have lived', 'A map of somewhere I have never been', 'A hand-drawn map of my own day'],
        },
      ],
    } satisfies QuizPayload,
    related: ['g-memory-map', 'g-desire-paths', 'g-railway-time'],
    followUps: [
      'Compare the size of two countries using an online "true size" map tool.',
      'Turn a map of your town upside down and see what you notice that you missed before.',
    ],
  },
  {
    id: 'g-quiz-word-origins',
    title: 'Words that travelled',
    summary: 'Everyday English words with surprising passports. Guess where six of them came from.',
    area: 'general',
    format: 'quiz',
    topics: ['language', 'history'],
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
          prompt: '"Robot" first appeared in…',
          options: ['A 1920 Czech play', 'A 1950s American comic', 'A Victorian engineering manual'],
          answer: 0,
          explain:
            "Karel Čapek's 1920 play R.U.R. introduced it, from the Czech robota, 'forced labour'. Čapek credited his brother Josef with suggesting the word.",
        },
        {
          id: 'q2',
          prompt: '"Ketchup" most likely comes from a word for…',
          options: ['A Dutch tomato soup', 'A fermented fish sauce in Hokkien Chinese', 'A French mustard'],
          answer: 1,
          explain:
            'Most etymologists trace it to a Hokkien (Southern Min) word for a fish sauce. Early English ketchups were often made from mushrooms, walnuts or oysters; tomato came later.',
        },
        {
          id: 'q3',
          prompt: '"Avocado" reached English via Spanish from which language?',
          options: ['Nahuatl', 'Quechua', 'Arabic'],
          answer: 0,
          explain: 'From the Nahuatl āhuacatl, the language of the Aztec Empire, adapted by Spanish speakers.',
        },
        {
          id: 'q4',
          prompt: '"Quarantine" originally referred to…',
          options: ['A fortress', 'A period of forty days', 'A doctor’s certificate'],
          answer: 1,
          explain:
            "From the Venetian quaranta giorni, 'forty days' — the time ships could be required to wait offshore during plague outbreaks.",
        },
        {
          id: 'q5',
          prompt: '"Shampoo" comes from a Hindi word meaning…',
          options: ['To press or knead', 'Soap', 'Clean hair'],
          answer: 0,
          explain: "From chāmpo, 'press!' — it first meant a massage in English, and only later hair-washing.",
        },
        {
          id: 'q6',
          prompt: '"Algorithm" is derived from…',
          options: ['A Greek word for counting', 'The name of a 9th-century Persian mathematician', 'A Latin legal term'],
          answer: 1,
          explain:
            "From al-Khwārizmī, the scholar who worked in Baghdad's House of Wisdom. His book on al-jabr also gave us 'algebra'.",
        },
      ],
    } satisfies QuizPayload,
    related: ['g-six-words', 'g-umami', 'g-code-word-count'],
    followUps: [
      'Pick three words you used today and look up their origins.',
      'Find a word in another language that has no neat English equivalent.',
    ],
  },

  // ───────────────────────────── Experiment ─────────────────────────────
  {
    id: 'g-taste-nose',
    title: 'Taste with your nose closed',
    summary: 'A ten-minute kitchen experiment that shows how much of "taste" is really smell.',
    area: 'general',
    format: 'experiment',
    topics: ['food', 'science', 'mind'],
    minutes: 10,
    energy: 1,
    comfort: 1,
    cost: 1,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Set up',
          body:
            "Choose three foods with a similar texture but different flavours — jelly beans in three colours, or small peeled cubes of apple, pear and raw potato. If you can, ask someone else to choose the order so you don't know which is which. Skip anything you're allergic to.",
          input: 'none',
        },
        {
          id: 's2',
          title: 'Pinch and chew',
          body:
            'Close your eyes, pinch your nose firmly and chew the first piece for about ten seconds. What can you actually detect — sweet, sour, salty, bitter, savoury? What do you think it is?',
          input: 'text',
        },
        {
          id: 's3',
          title: 'Let go',
          body: 'Still chewing, release your nose. Many people notice the flavour arrive almost at once. Write down what changed.',
          input: 'text',
        },
        {
          id: 's4',
          title: 'Repeat and score',
          body: 'Do the same with the other two. How many did you identify with your nose pinched, and how many after letting go?',
          input: 'text',
        },
        {
          id: 's5',
          title: 'What happened',
          body:
            "Your tongue detects a handful of basic tastes. Much of the detail we call flavour comes from smell: aromas travel from the back of your mouth up into your nose (sometimes called retronasal smell). Pinching your nose blocks that airflow — which is why food can seem bland when you have a heavy cold.\n\nWhich sense was doing more of the work for you?",
          input: 'choice',
          choices: ['Mostly taste', 'Mostly smell', 'About even'],
        },
      ],
    } satisfies StepsPayload,
    related: ['g-umami', 'g-five-senses', 'g-cook-unfamiliar'],
    followUps: [
      'Try it with two juices that look alike, such as apple and pear.',
      'Run it with a friend and compare scores.',
      'Read about umami, the taste that was named in 1908.',
    ],
  },
  {
    id: 'g-colour-hunt',
    title: "The colour you weren't looking for",
    summary: 'Hunt for one colour, then try to remember another. What you search for quietly decides what you see.',
    area: 'rabbit',
    format: 'experiment',
    topics: ['mind', 'art'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        { id: 's1', title: 'Pick a colour', body: 'Choose one colour to hunt for.', input: 'choice', choices: ['Red', 'Blue', 'Green', 'Yellow'] },
        {
          id: 's2',
          title: 'Hunt',
          body: 'For one minute, look around the room or out of the window and notice everything you can find in your colour. Really look.',
          timerMinutes: 1,
          input: 'none',
        },
        {
          id: 's3',
          title: 'Eyes closed',
          body: 'Close your eyes. Without peeking, list everything you can remember that was brown or grey.',
          input: 'text',
        },
        {
          id: 's4',
          title: 'Check',
          body: 'Open your eyes and look for brown and grey things. How many did you miss?',
          input: 'text',
        },
        {
          id: 's5',
          title: 'Why it happens',
          body:
            "Attention works like a filter: when you search for one thing, the brain turns down much of the rest. The extreme version is called inattentional blindness — in a well-known 1999 study by Daniel Simons and Christopher Chabris, many people counting basketball passes in a video failed to notice a person in a gorilla suit walking through the scene.\n\nWhere else might what you're looking for be deciding what you see?",
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-blind-contour', 'g-seven-days-noticing', 'g-five-senses'],
    followUps: [
      'Repeat the hunt on a walk, choosing a colour that is rare where you live.',
      'Try a week of noticing — one sense or theme per day.',
    ],
  },
  {
    id: 'g-pendulum',
    title: 'The pendulum that ignores its weight',
    summary: 'Make a pendulum from string and keys, then find out which change makes it swing faster — and which, surprisingly, does not.',
    area: 'general',
    format: 'experiment',
    topics: ['science', 'math', 'craft'],
    minutes: 20,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Build it',
          body:
            'Tie a small weight — a bunch of keys, a nut or a washer — to a piece of string about 1 metre long. Tape or tie the other end to a table edge or doorframe so the weight hangs freely without touching anything.',
          input: 'none',
        },
        {
          id: 's2',
          title: 'Time ten swings',
          body:
            'Pull the weight a short way to one side and let go. With a stopwatch, time ten full swings (out and back counts as one). Divide by ten for the time of a single swing.',
          input: 'text',
        },
        {
          id: 's3',
          title: 'Predict',
          body: 'If you shorten the string to a quarter of its length (about 25 cm), what will happen to the time of one swing?',
          input: 'choice',
          choices: ['About a quarter as long', 'About half as long', 'No change', 'Longer'],
        },
        { id: 's4', title: 'Test it', body: 'Shorten the string and time ten swings again. Record the result.', input: 'text' },
        {
          id: 's5',
          title: 'Change the weight',
          body: 'Back to the long string. Add more weight, or swap in something heavier, and time ten swings again. Did anything change?',
          input: 'text',
        },
        {
          id: 's6',
          title: "What's going on",
          body:
            "For small swings, a pendulum's period depends almost entirely on its length, not its weight: T ≈ 2π√(L/g). A 1 m pendulum takes about 2 seconds per swing; a 25 cm one about 1 second — a quarter of the length, half the time. Very wide swings run slightly slower. Galileo is said to have noticed the regularity watching a lamp sway in Pisa cathedral; whatever the truth of the story, his studies helped lead to the first pendulum clock, built by Christiaan Huygens in 1656.",
          input: 'none',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-sim-random-walk', 'g-estimate-world', 'g-rubber-band-guitar'],
    followUps: [
      'Find the string length that gives exactly one second per swing, then use it as a metronome.',
      'Time a playground swing, short and tall riders, and compare.',
    ],
  },

  // ───────────────────────────── Simulation ─────────────────────────────
  {
    id: 'g-sim-random-walk',
    title: 'Where does a random walker end up?',
    summary: 'Every step is a coin flip. Watch walkers wander and a quiet law emerge: distance grows with the square root of time.',
    area: 'rabbit',
    format: 'simulation',
    topics: ['math', 'science'],
    minutes: 8,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: { kind: 'random-walk', params: { walkers: 24 } } satisfies SimulationPayload,
    steps: [
      {
        id: 's1',
        title: 'Predict',
        body: 'A walker takes 100 random steps, each one unit long. Roughly how far from the start will a typical walker end up?',
        input: 'choice',
        choices: ['About 100 steps', 'About 50 steps', 'About 10 steps', 'Right back at the start'],
      },
      {
        id: 's2',
        title: 'Watch',
        body: 'Run the simulation. Walkers sometimes dither for ages, then drift off. Do any return to where they began?',
        input: 'text',
      },
      {
        id: 's3',
        title: 'The pattern',
        body:
          "On average, a random walker's distance from the start grows with the square root of the number of steps: 100 steps takes you about 10 away, 10,000 steps about 100. The same mathematics describes ink spreading through water — in 1905 Albert Einstein used it to explain Brownian motion, the jiggling of tiny particles in a liquid.",
        input: 'none',
      },
    ],
    related: ['g-code-coin-walk', 'g-sim-life', 'g-pendulum'],
    followUps: [
      'Write your own random walk in a few lines of code.',
      'Drop food colouring into still water and watch diffusion happen.',
    ],
  },
  {
    id: 'g-sim-flocking',
    title: 'Three rules make a flock',
    summary: 'No leader, no plan — just three local rules. Watch lifelike flocking emerge on screen.',
    area: 'rabbit',
    format: 'simulation',
    topics: ['nature', 'code', 'movement'],
    minutes: 8,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: { kind: 'flocking', params: { boids: 60 } } satisfies SimulationPayload,
    steps: [
      {
        id: 's1',
        title: 'The rules',
        body:
          "In 1987 computer graphics researcher Craig Reynolds published 'boids', a model in which each bird follows three rules: steer away from neighbours that are too close (separation), match their average heading (alignment), and drift towards their average position (cohesion). No bird is in charge.",
        input: 'none',
      },
      {
        id: 's2',
        title: 'Play',
        body: 'Watch for a minute. Do you see splitting, merging, swirling? Describe one behaviour nobody explicitly programmed.',
        input: 'text',
      },
      {
        id: 's3',
        title: 'In the wild',
        body:
          'Real flocks are more complex, but a study of starlings published in 2008 suggested each bird keeps track of roughly six or seven nearest neighbours, however far away they are. If starlings gather near you, look for murmurations around dusk.',
        input: 'none',
      },
    ],
    related: ['g-sim-life', 'g-sim-random-walk', 'g-read-the-sky'],
    followUps: [
      'Watch birds, fish or a crowd for five minutes and look for the three rules.',
      'Notice how people on a busy pavement avoid each other without speaking.',
    ],
  },
  {
    id: 'g-sim-life',
    title: 'The Game of Life',
    summary: "A grid, a few rules and no players. John Conway's 1970 invention shows how complexity can grow from almost nothing.",
    area: 'skill',
    format: 'simulation',
    topics: ['code', 'math'],
    minutes: 10,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: { kind: 'life' } satisfies SimulationPayload,
    steps: [
      {
        id: 's1',
        title: 'The rules',
        body:
          'Each square is alive or dead. On every tick: a live cell with two or three live neighbours survives; a dead cell with exactly three live neighbours comes alive; every other cell dies or stays empty.',
        input: 'none',
      },
      {
        id: 's2',
        title: 'Seed and watch',
        body:
          "Start from a random pattern. Look for 'still lifes' that never change, 'oscillators' that blink, and 'gliders' — five-cell shapes that crawl across the grid. What did you find?",
        input: 'text',
      },
      {
        id: 's3',
        title: 'Why it matters',
        body:
          "Mathematician John Conway devised the game, and it reached a wide audience through Martin Gardner's column in Scientific American in October 1970. It has since been shown that, in principle, it can carry out any computation an ordinary computer can — a striking example of complex behaviour from simple local rules.",
        input: 'none',
      },
    ],
    related: ['g-sim-flocking', 'g-code-staircase', 'g-pattern-memory'],
    followUps: [
      'Draw a glider on squared paper and work out its next four generations by hand.',
      'Try writing your own Life grid in code once you are comfortable with loops.',
    ],
  },

  // ───────────────────────────── Listening ─────────────────────────────
  {
    id: 'g-listen-silence',
    title: 'Two minutes of not-quite-silence',
    summary:
      "John Cage's 4′33″ (1952) asks performers to play nothing, so the audience hears the room. Try your own version wherever you are.",
    area: 'general',
    format: 'listening',
    topics: ['sound', 'mind'],
    minutes: 4,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      kind: 'silence',
      seconds: 120,
      prompts: [
        "What's the quietest sound you can hear?",
        'How many separate sound sources can you count?',
        'Which sounds are near, and which are far away?',
        "Did a sound you'd usually ignore become interesting?",
      ],
    } satisfies ListeningPayload,
    related: ['g-five-senses', 'g-draw-a-sound', 'g-quiz-sound'],
    followUps: [
      'Repeat it somewhere completely different — a park, a kitchen, a bus.',
      'Draw the sounds you heard as marks on a page.',
      'Use what you noticed as the starting point for a soundscape.',
    ],
  },
  {
    id: 'g-listen-moods',
    title: 'One phrase, two moods',
    summary: 'Hear the same short musical idea in two versions and notice how quickly your feelings follow small changes.',
    area: 'rabbit',
    format: 'listening',
    topics: ['music', 'mind'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      kind: 'mood-pair',
      prompts: [
        'Which version felt brighter, and which heavier?',
        'If each were the soundtrack to a scene, what would be happening?',
        'Can you name what changed — speed, pitch, the notes themselves?',
        'Did the difference feel strong or subtle to you?',
      ],
    } satisfies ListeningPayload,
    steps: [
      {
        id: 's1',
        title: 'A note on mood',
        body:
          "Many listeners raised on Western music hear major keys as bright and minor keys as sad. Research suggests that link is partly learned through musical culture rather than built in, and listeners from other traditions don't always hear it the same way. Tempo and pitch matter too: faster and higher often reads as more energetic. Your own reaction is the interesting data here.",
        input: 'none',
      },
    ],
    related: ['g-earworms', 'g-listen-rhythm', 'g-rubber-band-guitar'],
    followUps: [
      'Play a favourite song and ask: is it actually happy, or just fast?',
      'Write down three songs that always shift your mood, and what they shift it to.',
    ],
  },
  {
    id: 'g-listen-rhythm',
    title: 'Find the pulse',
    summary: 'Listen to a looping rhythm and find the steady beat hidden inside it. Your body may get there before your mind does.',
    area: 'skill',
    format: 'listening',
    topics: ['music', 'movement'],
    minutes: 4,
    energy: 2,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      kind: 'rhythm',
      seconds: 90,
      prompts: [
        'Can you tap or nod along to a steady pulse underneath the pattern?',
        "Where does the loop feel like it 'starts'?",
        'Which part of your body wants to move first?',
      ],
    } satisfies ListeningPayload,
    steps: [
      {
        id: 's1',
        title: 'A rare talent',
        body:
          'Finding a beat and moving to it comes easily to most people, but convincing beat-keeping is rare in other animals. A sulphur-crested cockatoo named Snowball became famous after a 2009 study showed him bobbing in time to music — and adjusting when the tempo changed.',
        input: 'none',
      },
    ],
    related: ['g-rhythm-tap', 'g-listen-moods', 'g-earworms'],
    followUps: [
      'Tap the beat of a song on a table, then try tapping only every other beat.',
      'Notice the rhythm of an everyday sound — a washing machine, footsteps, rain.',
    ],
  },

  // ───────────────────────────── Sketch ─────────────────────────────
  {
    id: 'g-blind-contour',
    title: 'Draw without looking',
    summary:
      "Blind contour drawing — eyes on the subject, never the page — is a classic exercise for learning to see. The results are wonky; that's the point.",
    area: 'skill',
    format: 'sketch',
    topics: ['art', 'mind'],
    minutes: 8,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    timerMinutes: 5,
    payload: {
      prompt:
        'Draw your non-drawing hand without looking at the page. Keep your eyes on your hand and move the pen slowly, as if it were touching every edge and crease your eyes follow.',
      constraints: [
        "Don't look at the page until the timer ends",
        'Keep the pen on the paper — one continuous line',
        'Go slower than feels natural',
      ],
    } satisfies SketchPayload,
    steps: [
      {
        id: 's1',
        title: 'Where it comes from',
        body:
          "The exercise was popularised by the art teacher Kimon Nicolaïdes in The Natural Way to Draw (1941). The aim isn't a good picture; it's slow, careful looking. Many people find the drawing oddly lively, and the hand surprisingly complicated.",
        input: 'none',
      },
    ],
    related: ['g-colour-hunt', 'g-draw-a-sound', 'g-back-to-back'],
    followUps: [
      'Repeat with a crumpled piece of paper, a shoe or a houseplant.',
      'Do one blind contour a day for a week and compare the first and last.',
    ],
  },
  {
    id: 'g-memory-map',
    title: 'Map your neighbourhood from memory',
    summary:
      'In 1960 urban planner Kevin Lynch asked city residents to sketch maps from memory. What people remember — and forget — says a lot about a place.',
    area: 'general',
    format: 'sketch',
    topics: ['maps', 'cities'],
    minutes: 15,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      prompt:
        "From memory, draw a map of your neighbourhood — whatever 'neighbourhood' means to you. Include the routes you actually use, the places you'd point out to a visitor, and the edges where your mental map fades.",
      constraints: ['No looking at a real map until you are done', "Mark five landmarks you'd give a visitor", 'Circle anywhere you feel unsure'],
    } satisfies SketchPayload,
    steps: [
      {
        id: 's1',
        title: 'Compare',
        body:
          "Now open a real map. What did you shrink, stretch or leave out? In The Image of the City, Lynch found people organise places around paths, edges, districts, nodes and landmarks. Which of those dominate your sketch?",
        input: 'text',
      },
    ],
    related: ['g-desire-paths', 'g-quiz-maps', 'g-oldest-thing'],
    followUps: [
      'Ask someone who lives nearby to draw the same area, then compare maps.',
      'Walk to the blankest part of your map and fill it in.',
    ],
  },
  {
    id: 'g-draw-a-sound',
    title: 'Bouba, kiki and the shape of sounds',
    summary: "Which shape is 'bouba' and which is 'kiki'? Most people agree, across many languages. Then try drawing the sounds around you.",
    area: 'rabbit',
    format: 'sketch',
    topics: ['sound', 'art', 'language'],
    minutes: 10,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      prompt:
        "First, draw two shapes: one called 'bouba' and one called 'kiki'. Then listen for a minute and draw three sounds you can hear right now — not the objects making them, but the sounds themselves.",
      constraints: ['Abstract marks only — no pictures of things', 'One pen or one colour', 'Label each sound afterwards'],
    } satisfies SketchPayload,
    steps: [
      {
        id: 's1',
        title: 'What most people do',
        body:
          "Most people make 'kiki' spiky and 'bouba' rounded. The psychologist Wolfgang Köhler described a version of this in 1929 using invented words; the names bouba and kiki come from a 2001 study by V. S. Ramachandran and Edward Hubbard. A large 2021 study found the effect among speakers of many different languages, though not equally strongly everywhere.",
        input: 'none',
      },
    ],
    related: ['g-listen-silence', 'g-blind-contour', 'g-six-words'],
    followUps: [
      'Show your sound drawings to someone and see if they can guess the sounds.',
      'Invent a word for a sound that has no name.',
    ],
  },

  // ───────────────────────────── Writing ─────────────────────────────
  {
    id: 'g-object-biography',
    title: 'The secret life of an ordinary object',
    summary: 'Everything near you has a backstory involving mines, forests, factories, ships and strangers. Write one.',
    area: 'general',
    format: 'writing',
    topics: ['writing', 'history', 'craft'],
    minutes: 20,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      prompt:
        'Pick an ordinary object within reach — a mug, a pencil, a spoon — and write its biography. Where did its materials come from? Who might have made it? How did it travel to you, and what has it witnessed since?',
      minWords: 150,
      hints: [
        'Start before it was an object: what was it made from, and where did that come from?',
        "Guessing is allowed — 'probably' and 'perhaps' are honest words",
        'End with where it might go after you',
      ],
    } satisfies WritingPayload,
    related: ['g-oldest-thing', 'g-one-sheet-zine', 'g-letter-to-future'],
    followUps: [
      'Look up how one of its materials is actually produced and revise one detail.',
      'Turn the biography into a one-page zine.',
    ],
  },
  {
    id: 'g-letter-to-future',
    title: 'A letter to you, one year from now',
    summary: "Write to the person you'll be in a year. Seal it as a capsule and let time do the interesting part.",
    area: 'history',
    format: 'writing',
    topics: ['time', 'writing'],
    minutes: 15,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      prompt:
        'Write a letter to yourself to open one year from today. Describe an ordinary day right now, what is on your mind, and what you hope will have changed — or stayed the same.',
      minWords: 120,
      hints: [
        'What are you worried about that future-you may have forgotten?',
        'Make one plain prediction you can check',
        'Ask future-you a question you genuinely want answered',
      ],
    } satisfies WritingPayload,
    related: ['g-changed-my-mind', 'g-energy-map', 'g-seven-days-noticing'],
    followUps: [
      'Seal the letter as a Personal Capsule set to open in a year.',
      'Save your prediction as an opinion in Version History so you can revisit it.',
    ],
  },
  {
    id: 'g-six-words',
    title: 'Six-word stories',
    summary:
      "A whole story in six words. The most famous example is usually credited to Hemingway — though there's no good evidence he wrote it.",
    area: 'skill',
    format: 'writing',
    topics: ['writing', 'language'],
    minutes: 10,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    timerMinutes: 10,
    payload: {
      prompt: 'Write a story in exactly six words. Then write five more, each in a different mood.',
      minWords: 6,
      hints: ['Imply a before and an after', 'Let one word do double duty', "Try one that's funny, one that's sad and one that's strange"],
    } satisfies WritingPayload,
    related: ['g-story-ping-pong', 'g-object-biography', 'g-quiz-word-origins'],
    followUps: [
      'Write a six-word story about today every evening this week.',
      'Swap six-word stories with a friend and illustrate each other’s.',
    ],
  },

  // ───────────────────────────── Coding ─────────────────────────────
  {
    id: 'g-code-staircase',
    title: 'Build a staircase out of text',
    summary: 'Your first loop: print a staircase of # characters, one step at a time. Small program, satisfying shape.',
    area: 'skill',
    format: 'coding',
    topics: ['code', 'art'],
    minutes: 10,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      prompt:
        "Use a loop to print a staircase five steps tall: the first line is #, the second ##, and so on down to #####. Bonus: make it climb the other way by adding spaces in front.",
      starter: `// Print a five-step staircase of # characters.
// Hint: '#'.repeat(3) gives '###'.
for (let i = 1; i <= 5; i++) {
  // your code here
}
`,
      checks: [
        { label: 'Prints 5 lines', expr: "output.trim().split('\\n').length === 5" },
        { label: 'First step is a single #', expr: "output.trim().split('\\n')[0].trim() === '#'" },
        { label: 'Last step is #####', expr: "(output.trim().split('\\n')[4] || '').trim() === '#####'" },
      ],
    } satisfies CodingPayload,
    related: ['g-code-coin-walk', 'g-sim-life', 'g-code-word-count'],
    followUps: ['Make the staircase any height by storing it in a variable.', 'Print a diamond or a triangle instead.'],
  },
  {
    id: 'g-code-coin-walk',
    title: 'A random walk in a few lines',
    summary: 'Code a walker who flips a coin at every step. Run it a few times and watch how unpredictable — and predictable — it is.',
    area: 'skill',
    format: 'coding',
    topics: ['code', 'math'],
    minutes: 10,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      prompt:
        'A walker starts at 0 and flips a coin 100 times: heads means one step forward (+1), tails one step back (−1). Print the position after every flip. Run it several times — how far does the walker usually get?',
      starter: `let position = 0;
for (let i = 0; i < 100; i++) {
  const heads = Math.random() < 0.5;
  // change position here: +1 for heads, -1 for tails
  console.log(position);
}
`,
      checks: [
        { label: 'Prints 100 positions', expr: "output.trim().split('\\n').length === 100" },
        {
          label: 'Every flip moves exactly one step',
          expr: "output.trim().split('\\n').map(Number).every((v, i, a) => Math.abs(v - (i === 0 ? 0 : a[i - 1])) === 1)",
        },
        { label: 'Final position is within 100 of the start', expr: "Math.abs(Number(output.trim().split('\\n').pop())) <= 100" },
      ],
    } satisfies CodingPayload,
    related: ['g-sim-random-walk', 'g-code-staircase', 'g-estimate-world'],
    followUps: [
      'Run it 20 times and note the final positions. How many land within 10 of zero?',
      'Turn the walk into a picture by printing a # at each position.',
    ],
  },
  {
    id: 'g-code-word-count',
    title: 'Which word wins?',
    summary: 'Count words in a sentence and crown the most common one — a tiny version of how search engines and linguists study text.',
    area: 'skill',
    format: 'coding',
    topics: ['code', 'language'],
    minutes: 15,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      prompt:
        'Count how often each word appears in the sentence, then print the most common word and its count on one line, like: the 3',
      starter: `const text = "the cat sat on the mat and the dog sat too";
const words = text.split(" ");
const counts = {};

// 1. Count each word, e.g. counts["cat"] = 1
// 2. Find the word with the highest count
// 3. console.log(word + " " + count)
`,
      checks: [
        { label: 'Names the most common word', expr: "/\\bthe\\b/.test(output)" },
        { label: 'Gives its count (3)', expr: "/\\b3\\b/.test(output)" },
        { label: "Doesn't crown 'sat' (it appears twice)", expr: "!/\\bsat\\b/.test(output.trim().split('\\n').pop() || '')" },
      ],
    } satisfies CodingPayload,
    related: ['g-quiz-word-origins', 'g-code-staircase', 'g-six-words'],
    followUps: [
      'Paste in a paragraph you wrote and find your most-used word.',
      'Ignore tiny words like "the" and "and" — what wins then?',
    ],
  },

  // ───────────────────────────── Project ─────────────────────────────
  {
    id: 'g-rubber-band-guitar',
    title: 'Build a rubber-band guitar',
    summary: 'Make a playable instrument from a box and rubber bands, and feel the physics of pitch under your fingers.',
    area: 'skill',
    format: 'project',
    topics: ['music', 'craft', 'sound'],
    minutes: 30,
    energy: 2,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Gather',
          body: 'You need a sturdy open box (a shoebox or tissue box works), four to six rubber bands of different thicknesses, and a pencil or ruler.',
          input: 'none',
        },
        {
          id: 's2',
          title: 'String it',
          body:
            'Stretch the bands lengthways around the box so they pass over the opening. No opening? Cut a hole roughly in the middle of the lid to let the sound out. Keep bands away from your face while stretching — they can snap.',
          input: 'none',
        },
        {
          id: 's3',
          title: 'Add a bridge',
          body: 'Slide the pencil under the bands near one end so they lift off the box. This sets the vibrating length of each band.',
          input: 'none',
        },
        {
          id: 's4',
          title: 'Pluck and listen',
          body:
            'Pluck each band. Thicker or looser bands should sound lower; thinner or tighter ones higher. Arrange or adjust them from lowest to highest and record a quick scale.',
          input: 'audio',
        },
        {
          id: 's5',
          title: 'Change the length',
          body:
            "Press a band against the box with one finger and pluck between your finger and the bridge. A shorter vibrating length gives a higher note — exactly what guitarists do on a fretboard.",
          input: 'none',
        },
        {
          id: 's6',
          title: 'Play a tune',
          body: 'Pick out the first few notes of a simple tune you know. Record it, wobbly tuning and all.',
          input: 'audio',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-quiz-sound', 'g-listen-moods', 'g-pendulum'],
    followUps: [
      'Try a deeper box or a metal tin and compare the sound.',
      'Record three notes and loop them into a tiny soundscape.',
    ],
  },
  {
    id: 'g-one-sheet-zine',
    title: 'Make an eight-page zine from one sheet',
    summary: 'One sheet of paper, one cut and a few folds make a little booklet. Fill it with whatever you have been noticing.',
    area: 'skill',
    format: 'project',
    topics: ['writing', 'art', 'craft'],
    minutes: 45,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Fold eight panels',
          body:
            'Lay a sheet of A4 or letter paper landscape. Fold it in half top to bottom, crease and unfold. Fold it in half left to right, then in half again the same way, and unfold everything. You should see eight panels: four across, two down.',
          input: 'none',
        },
        {
          id: 's2',
          title: 'Make one cut',
          body:
            'Fold the sheet in half left to right. Starting at the folded edge, cut along the middle horizontal crease and stop at the next vertical crease — halfway across the folded sheet. Unfold: there is now a slit through the two middle panels.',
          input: 'none',
        },
        {
          id: 's3',
          title: 'Fold into a booklet',
          body:
            'Fold the sheet in half top to bottom again, so the slit runs along the top fold. Hold the two short ends and push them towards each other; the slit opens into a diamond. Keep pushing until the panels collapse into an eight-page booklet, then flatten and crease.',
          input: 'none',
        },
        {
          id: 's4',
          title: 'Choose a theme',
          body: 'Small and specific works best.',
          input: 'choice',
          choices: ['A field guide to my street', 'Six things I noticed this week', 'Instructions for a perfect ordinary day', 'Something else'],
        },
        {
          id: 's5',
          title: 'Fill it',
          body: 'Front cover, six inside pages, back cover. Draw, write, collage. Done is better than neat.',
          timerMinutes: 30,
          input: 'none',
        },
        {
          id: 's6',
          title: 'Share it',
          body: 'Photograph the pages, or photocopy the unfolded sheet to make more copies. Give one away.',
          input: 'photo',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-object-biography', 'g-six-words', 'g-oldest-thing'],
    followUps: ['Make a zine with a friend — four pages each, no peeking.', 'Leave a copy in a little free library or on a community noticeboard.'],
  },
  {
    id: 'g-regrow-scraps',
    title: 'Regrow your kitchen scraps',
    summary: 'Spring onion roots and a celery base are not rubbish — they are a slow-motion experiment for your windowsill.',
    area: 'general',
    format: 'project',
    topics: ['plants', 'food'],
    minutes: 10,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Save the ends',
          body: 'Keep the root end of a few spring onions (3–5 cm with the roots attached), the base of a celery bunch, or the stump of a romaine lettuce.',
          input: 'none',
        },
        {
          id: 's2',
          title: 'Set up',
          body: 'Stand them in a glass or shallow dish with water covering the roots or base, but not the cut top. Put them on a bright windowsill.',
          input: 'photo',
        },
        { id: 's3', title: 'Fresh water', body: 'Change the water every day or two so it stays clear.', input: 'none' },
        {
          id: 's4',
          title: 'Watch',
          body: 'Spring onions often show new green growth within a few days; celery and lettuce take longer. Photograph them at the same time each day.',
          input: 'photo',
        },
        {
          id: 's5',
          title: 'What next',
          body:
            'Regrowth in water gives a modest harvest that fades over a few weeks, because the plant has limited stored energy and few nutrients. Moving it to a pot of soil once the roots are strong can keep it going longer.\n\nWhat surprised you?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-bean-diary', 'g-plant-clocks', 'g-meet-a-tree'],
    followUps: ['Plant the strongest one in soil and keep a weekly photo diary.', 'Try a carrot top in a saucer of water and watch for leaves.'],
  },

  // ───────────────────────────── Challenge ─────────────────────────────
  {
    id: 'g-screen-free-hour',
    title: 'One hour, no screens',
    summary: 'Put every screen away for one hour and notice what fills the gap.',
    area: 'twist',
    format: 'challenge',
    topics: ['time', 'mind'],
    minutes: 60,
    energy: 1,
    comfort: 3,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Choose your hour',
          body: 'Pick a time when nobody urgently needs you. If someone might, tell them you will be offline for an hour.',
          input: 'none',
        },
        {
          id: 's2',
          title: 'Choose an activity — or none',
          body: 'What will you do instead?',
          input: 'choice',
          choices: ['A walk', 'A paper book', 'Cooking something', 'Drawing or writing by hand', 'Nothing at all'],
        },
        {
          id: 's3',
          title: 'Start and stash',
          body:
            'Start the timer, then put your phone in another room or a drawer and switch off other screens. If notifications are allowed, the timer will tell you when the hour is up.',
          timerMinutes: 60,
          input: 'none',
        },
        {
          id: 's4',
          title: 'Afterwards',
          body: 'How many times did you reach for a phone that was not there? What did you do instead? Did the hour feel long or short?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-energy-map', 'g-five-senses', 'g-seven-days-noticing'],
    followUps: ['Pick one daily gap — a queue, a commute — to leave screen-free this week.', 'Write a Version History reflection on what the hour showed you.'],
  },
  {
    id: 'g-ask-a-local',
    title: 'Let a stranger choose your lunch',
    summary: 'Ask the person serving what they would order, then order exactly that. A small act of trust that usually leads somewhere good.',
    area: 'twist',
    format: 'challenge',
    topics: ['people', 'food', 'cities'],
    minutes: 45,
    energy: 2,
    comfort: 4,
    cost: 2,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        { id: 's1', title: 'Pick a place', body: "Choose a local café, bakery, market stall or small restaurant you don't usually go to.", input: 'none' },
        {
          id: 's2',
          title: 'Ask',
          body: "Ask the person serving: 'What would you order here?' Mention any dietary needs or a budget so their pick works for you.",
          input: 'none',
        },
        { id: 's3', title: 'Order it', body: 'Whatever they suggest, go with it.', input: 'none' },
        {
          id: 's4',
          title: 'Taste properly',
          body: "Eat slowly. What's the first flavour you notice? Would you have chosen this yourself?",
          input: 'text',
        },
        {
          id: 's5',
          title: 'Close the loop',
          body: 'If the moment allows, tell them what you thought. Note anything they told you about the dish or the place.',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-cook-unfamiliar', 'g-taste-nose', 'g-two-minute-talk'],
    followUps: ['Ask the same question somewhere else next week and compare.', 'Try cooking a version of the dish at home.'],
  },
  {
    id: 'g-other-hand',
    title: 'A morning with your other hand',
    summary: 'Do small tasks with your non-dominant hand and discover how much of your day runs on autopilot.',
    area: 'twist',
    format: 'challenge',
    topics: ['movement', 'mind'],
    minutes: 15,
    energy: 1,
    comfort: 3,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Choose your tasks',
          body: 'Pick three safe, everyday tasks to do with your other hand this morning. Avoid knives, hot pans, driving or anything risky.',
          input: 'choice',
          choices: ['Brushing teeth', 'Stirring a drink', 'Opening doors', 'Using a computer mouse', 'Eating breakfast', 'Writing a shopping list'],
        },
        { id: 's2', title: 'Signature test', body: 'Write your name with your usual hand, then with your other hand. Keep both.', input: 'sketch' },
        {
          id: 's3',
          title: 'Live with it',
          body: 'Do your tasks with the other hand all morning. Each time you forget and switch back, make a mental note.',
          input: 'none',
        },
        {
          id: 's4',
          title: 'Go public once',
          body: 'Do one small thing with your other hand while someone can see — paying at a till, signing for a parcel, holding a door. Notice whether being watched makes it harder.',
          input: 'none',
        },
        {
          id: 's5',
          title: 'Report',
          body: 'Which task was hardest? What did you notice about habits you never usually think about?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-blind-contour', 'g-colour-hunt', 'g-rhythm-tap'],
    followUps: ['Repeat the signature test daily for a week and see if it improves.', 'Swap one more habit: a different route, a different mug, a different seat.'],
  },
  {
    id: 'g-two-minute-talk',
    title: 'Give a two-minute talk',
    summary:
      "Pick something you've learned recently and explain it out loud, to real people, in two minutes. Few things show you so clearly what you actually understand.",
    area: 'skill',
    format: 'challenge',
    topics: ['people', 'language'],
    minutes: 30,
    energy: 3,
    comfort: 5,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Pick a topic',
          body: "Choose something you've explored recently, here or anywhere else. Small and specific beats big and vague.",
          input: 'text',
        },
        { id: 's2', title: 'Three points', body: 'Write the three things you most want people to remember, plus one example or story.', input: 'text' },
        {
          id: 's3',
          title: 'Rehearse',
          body: "Say it out loud, timed, at least twice. Cut anything that doesn't fit in two minutes.",
          timerMinutes: 2,
          input: 'audio',
        },
        {
          id: 's4',
          title: 'Give it for real',
          body: 'Find an audience — even a small one.',
          input: 'choice',
          choices: ['Family or housemates', 'Friends', 'A video call', 'A meetup or open mic', 'Somewhere else'],
        },
        {
          id: 's5',
          title: 'Afterwards',
          body: "What did people ask? Which part landed, and which part did you realise you didn't fully understand?",
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-ask-a-local', 'g-debate-theseus', 'g-railway-time'],
    followUps: ['Look up the question you could not answer and add a Field Note.', 'Give the same talk to someone else and see how it changes.'],
  },

  // ───────────────────────────── Outdoor ─────────────────────────────
  {
    id: 'g-meet-a-tree',
    title: 'Meet one tree properly',
    summary: 'Choose a tree you pass often and get to know it: bark, leaves, girth, name and story.',
    area: 'general',
    format: 'outdoor',
    topics: ['plants', 'nature'],
    minutes: 25,
    energy: 2,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        { id: 's1', title: 'Choose', body: 'Pick a tree you see regularly — on your street, in a park, from your window.', input: 'none' },
        {
          id: 's2',
          title: 'Bark',
          body: 'Touch the bark. Is it smooth, ridged, flaky, peeling? If you have paper and a crayon, take a bark rubbing; otherwise photograph it up close.',
          input: 'photo',
        },
        {
          id: 's3',
          title: 'Leaves',
          body: 'Look closely at one leaf: its outline, its edges (smooth or toothed), and whether leaves grow opposite each other on the twig or alternate. Sketch one.',
          input: 'sketch',
        },
        {
          id: 's4',
          title: 'Measure',
          body:
            'Measure the trunk around at about 1.5 m off the ground, with a tape or in arm spans. A very rough UK rule of thumb says many trees add about 2.5 cm of girth a year, but growth varies hugely by species and setting — treat any age estimate as a guess.',
          input: 'text',
        },
        {
          id: 's5',
          title: 'Name it',
          body: 'Use a field guide, an identification app or a knowledgeable friend to find its species. Write down one fact about it.',
          input: 'text',
        },
        { id: 's6', title: 'Come back', body: 'Return in another season and photograph it from the same spot.', input: 'photo' },
      ],
    } satisfies StepsPayload,
    related: ['g-plant-clocks', 'g-bean-diary', 'g-read-the-sky'],
    followUps: ['Set a reminder to visit the same tree in three months.', 'Learn the names of the three most common trees on your street.'],
  },
  {
    id: 'g-read-the-sky',
    title: 'Read the sky',
    summary: 'Learn the cloud names Luke Howard proposed in 1802, then make — and check — your own forecast.',
    area: 'general',
    format: 'outdoor',
    topics: ['nature', 'science'],
    minutes: 15,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        { id: 's1', title: 'Look up', body: 'Go outside, or to a window with a wide view of the sky. Just look for two minutes.', timerMinutes: 2, input: 'none' },
        {
          id: 's2',
          title: 'Name it',
          body: 'In 1802 the amateur meteorologist Luke Howard gave clouds Latin names we still use. Which best describes what you see?',
          input: 'choice',
          choices: [
            'Cumulus — heaped, cotton-wool piles',
            'Stratus — flat grey layers',
            'Cirrus — high, thin wisps',
            'Nimbus — dark, rain-bearing',
            'A mix',
            'Clear sky',
          ],
        },
        {
          id: 's3',
          title: 'Follow one cloud',
          body: 'Pick one cloud and watch it for three minutes. Is it growing, shrinking or drifting? Which way?',
          timerMinutes: 3,
          input: 'text',
        },
        {
          id: 's4',
          title: 'Forecast',
          body:
            'Make a forecast for the next few hours. Some rough sky lore: cumulus that keeps building taller through a warm afternoon can bring showers; high cirrus thickening into a veil sometimes arrives ahead of rain within a day. Neither is a guarantee.',
          input: 'text',
        },
        { id: 's5', title: 'Check', body: 'Later or tomorrow, note what actually happened. Were you right?', input: 'text' },
      ],
    } satisfies StepsPayload,
    related: ['g-sim-flocking', 'g-meet-a-tree', 'g-seven-days-noticing'],
    followUps: ['Photograph the sky from the same spot at the same time for a week.', "Compare your forecast with an official one for three days."],
  },
  {
    id: 'g-oldest-thing',
    title: 'Find the oldest thing on your street',
    summary: 'Walk your own street like a historian. Date stones, faded signs and odd street names are clues hiding in plain sight.',
    area: 'twist',
    format: 'outdoor',
    topics: ['history', 'cities'],
    minutes: 45,
    energy: 2,
    comfort: 3,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Walk slowly',
          body: 'Walk your street or a nearby block at half your usual speed. Look up — above shopfronts is where the past often survives.',
          input: 'none',
        },
        {
          id: 's2',
          title: 'Hunt for clues',
          body:
            "Look for date stones and plaques, foundation stones, faded painted adverts on brick walls (often called ghost signs), old metal covers with makers' names, and street names that hint at past uses — Mill Lane, Market Street, Brewery Road.",
          input: 'none',
        },
        { id: 's3', title: 'Collect three candidates', body: 'Photograph your three best candidates for the oldest thing on the street.', input: 'photo' },
        { id: 's4', title: 'Guess their ages', body: 'Write a guess for each, with your reasoning.', input: 'text' },
        {
          id: 's5',
          title: 'Ask someone',
          body: "If a long-time neighbour or shopkeeper is around and it feels right, ask what they know about the street's past. Note anything they tell you.",
          input: 'text',
        },
        {
          id: 's6',
          title: 'Check',
          body: 'Look them up: a local history society, the library, old maps online or a historic buildings record. How close were you?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-railway-time', 'g-memory-map', 'g-object-biography'],
    followUps: ['Find an old map of your area and compare it with today.', 'Ask a long-time neighbour what the street used to be like.'],
  },

  // ───────────────────────────── Debate ─────────────────────────────
  {
    id: 'g-debate-handwriting',
    title: 'Should schools still teach handwriting?',
    summary: 'Typing is everywhere, but handwriting persists in classrooms. Weigh three positions and see where you land.',
    area: 'general',
    format: 'debate',
    topics: ['language', 'writing'],
    minutes: 15,
    energy: 2,
    comfort: 3,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      question: 'Should schools still spend time teaching handwriting — especially joined-up (cursive) writing?',
      sides: [
        {
          label: 'Keep teaching it',
          argument:
            'Some studies suggest that forming letters by hand helps young children learn to recognise them, and that handwritten notes can encourage summarising rather than transcribing — though findings are mixed and still debated. Handwriting needs no device or battery, and many people still use it for cards, forms and quick notes. Teaching joined-up writing also keeps old documents and family letters readable for the next generation.',
        },
        {
          label: 'Spend the time elsewhere',
          argument:
            'School hours are limited, and most adult writing is now typed. Time spent perfecting letter shapes could go to touch-typing, reading or other skills. For students with dysgraphia or motor difficulties, a heavy emphasis on neat handwriting can turn writing lessons into frustration, when a keyboard would let their ideas through. Legible print is enough; cursive is a tradition, not a necessity.',
        },
        {
          label: 'Teach it differently',
          argument:
            "It needn't be all or nothing. Schools could teach clear, fluent handwriting early, when it may help with learning letters, then ease off cursive and neatness drills and teach typing alongside. The goal would be comfort with both tools, so people can choose whichever suits the moment.",
        },
      ],
    } satisfies DebatePayload,
    related: ['g-debate-theseus', 'g-six-words', 'g-changed-my-mind'],
    followUps: ['Take notes by hand for one meeting or lecture and by keyboard for the next. Compare.', 'Ask someone of a different generation how they were taught to write.'],
  },
  {
    id: 'g-debate-theseus',
    title: 'The Ship of Theseus',
    summary: 'Replace every part of something, and is it still the same thing? An ancient puzzle that applies to ships, bands, cities — and you.',
    area: 'rabbit',
    format: 'debate',
    topics: ['philosophy', 'history', 'craft'],
    minutes: 15,
    energy: 2,
    comfort: 2,
    cost: 0,
    social: 'either',
    origin: 'curated',
    payload: {
      question:
        'The Greek writer Plutarch recorded a puzzle about the ship of Theseus, repaired plank by plank over the years. If every plank is replaced, is it still the same ship? And if someone rebuilt the old planks into a second ship, which one is the original?',
      sides: [
        {
          label: "It's the same ship",
          argument:
            'Identity lives in continuity, not materials. The ship kept its name, shape, purpose and unbroken history, and each repair was made to that ship. We think this way about plenty of things: a river whose water is always changing, a football club whose players all change, a body that renews many of its cells. If gradual replacement destroyed identity, almost nothing would last.',
        },
        {
          label: "It's a new ship",
          argument:
            'The original ship is the material it was made of. Once every plank is gone, nothing of the original remains — only a replacement occupying its place. The philosopher Thomas Hobbes sharpened the puzzle: if someone gathered the discarded planks and reassembled them, that ship would have a strong claim to be the original, and there cannot be two.',
        },
        {
          label: 'It depends why you ask',
          argument:
            "'Same' means different things in different contexts. For ownership and law, the repaired ship is clearly the same. For a museum that cares about authenticity, the reassembled planks might matter more. For sentiment, it may be whichever ship carries the memories. Perhaps identity isn't one fact waiting to be discovered, but a choice shaped by the question we're asking.",
        },
      ],
    } satisfies DebatePayload,
    related: ['g-changed-my-mind', 'g-debate-handwriting', 'g-object-biography'],
    followUps: ['Apply the puzzle to something you own that has been repaired many times.', 'Ask: are you the same person you were ten years ago? Write a short answer.'],
  },

  // ───────────────────────────── Reflection ─────────────────────────────
  {
    id: 'g-changed-my-mind',
    title: 'Something I changed my mind about',
    summary: 'Pick one belief you no longer hold and trace how it changed. Changing your mind is a skill worth noticing.',
    area: 'history',
    format: 'reflection',
    topics: ['philosophy', 'mind'],
    minutes: 10,
    energy: 1,
    comfort: 3,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        { id: 's1', title: 'Name it', body: 'Name something you used to believe and no longer do. Big or small.', input: 'text' },
        { id: 's2', title: 'Then', body: 'What exactly did you believe, and why did it make sense at the time?', input: 'text' },
        {
          id: 's3',
          title: 'What changed it',
          body: 'What moved you?',
          input: 'choice',
          choices: ['A person', 'An experience', 'Evidence or reading', 'A slow drift', 'Not sure'],
        },
        { id: 's4', title: 'What remains', body: 'Is there anything from the old view you still think was right?', input: 'text' },
        {
          id: 's5',
          title: 'How sure now',
          body: 'How confident are you in your current view?',
          input: 'choice',
          choices: ['Very', 'Fairly', 'Half-sure', 'Still wondering'],
        },
      ],
    } satisfies StepsPayload,
    related: ['g-letter-to-future', 'g-debate-theseus', 'g-energy-map'],
    followUps: [
      'Save this as a "mind change" entry in Version History.',
      'Add it to a collection called "Ideas I changed my mind about".',
      'Seal a prediction about this topic in a capsule for next year.',
    ],
  },
  {
    id: 'g-energy-map',
    title: 'Map your week’s energy',
    summary: 'Sort what gave you energy this week from what drained it. A small, honest audit with one practical change at the end.',
    area: 'history',
    format: 'reflection',
    topics: ['time', 'mind'],
    minutes: 15,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'List your week',
          body: 'Write down the main things you did this past week — work, chores, people, hobbies, rest. Ten to fifteen items is plenty.',
          input: 'text',
        },
        { id: 's2', title: 'Mark each one', body: 'Next to each item, write + if it gave you energy, − if it drained you, and = if it was neutral.', input: 'text' },
        {
          id: 's3',
          title: 'Look for patterns',
          body:
            'Do the pluses share anything — a time of day, certain people, using your hands, being outside? Do the minuses? Describe only what you can actually see in the list.',
          input: 'text',
        },
        { id: 's4', title: 'One small change', body: 'Choose one thing to try next week: a little more of a plus, or a little less of a minus.', input: 'text' },
        { id: 's5', title: 'Check back', body: 'Set a reminder for a week from now to revisit this list and note what happened.', input: 'none' },
      ],
    } satisfies StepsPayload,
    related: ['g-screen-free-hour', 'g-changed-my-mind', 'g-seven-days-noticing'],
    followUps: ['Save your one change as a goal in Version History.', 'Repeat the map in a month and compare the two.'],
  },
  {
    id: 'g-five-senses',
    title: 'Five-sense check-in',
    summary: 'Five things you see, four you hear, three you feel, two you smell, one you taste. A short way to arrive where you are.',
    area: 'general',
    format: 'reflection',
    topics: ['mind', 'sound', 'nature'],
    minutes: 5,
    energy: 1,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        { id: 's1', title: 'Five things you can see', body: 'Look for small details: a texture, a reflection, a shadow.', input: 'text' },
        { id: 's2', title: 'Four things you can hear', body: 'Listen for a full minute before writing.', timerMinutes: 1, input: 'text' },
        { id: 's3', title: 'Three things you can feel', body: 'The chair under you, air on your skin, the weight of your hands.', input: 'text' },
        { id: 's4', title: 'Two things you can smell', body: 'If nothing is obvious, move closer to something — a sleeve, a cup, a plant.', input: 'text' },
        { id: 's5', title: 'One thing you can taste', body: 'Even if it is just the last thing you drank.', input: 'text' },
        { id: 's6', title: 'What stood out', body: 'Which sense surprised you most? How do you feel now compared with five minutes ago?', input: 'text' },
      ],
    } satisfies StepsPayload,
    related: ['g-listen-silence', 'g-taste-nose', 'g-colour-hunt'],
    followUps: ['Try the check-in somewhere busy, then somewhere quiet.', 'Turn one detail you noticed into a Field Note.'],
  },

  // ───────────────────────────── Game ─────────────────────────────
  {
    id: 'g-estimate-world',
    title: 'Guess the world in numbers',
    summary: 'Six numbers about the world. Guess first, then see how close you got — good estimating is a skill you can practise.',
    area: 'general',
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
          q: 'How tall is the Eiffel Tower, including its antennas?',
          answer: 330,
          unit: 'm',
          note: 'About 330 m. The iron tower itself is roughly 300 m; antennas added over the decades took it higher.',
        },
        { q: 'How many keys are on a standard modern piano?', answer: 88, unit: 'keys', note: '52 white and 36 black, spanning a little over seven octaves.' },
        {
          q: 'How many bones are in a typical adult human skeleton?',
          answer: 206,
          unit: 'bones',
          note: 'Newborns have more separate bones — often quoted as around 270 — many of which fuse as they grow.',
        },
        {
          q: 'How fast does sound travel through air at 20 °C?',
          answer: 343,
          unit: 'm/s',
          note: 'Roughly a kilometre every three seconds — the basis of counting the gap between lightning and thunder.',
        },
        {
          q: 'How far is it around the Earth at the equator?',
          answer: 40075,
          unit: 'km',
          note: 'Close to a round 40,000 because the metre was originally defined, in the 1790s, as one ten-millionth of the distance from the North Pole to the equator.',
        },
        {
          q: 'At roughly what temperature does water boil on the summit of Mount Everest?',
          answer: 70,
          unit: '°C',
          note: 'Around 70 °C. Air pressure at the summit is roughly a third of that at sea level, so water boils cooler and cooking takes much longer.',
        },
      ],
    } satisfies GamePayload,
    related: ['g-quiz-sound', 'g-pendulum', 'g-code-coin-walk'],
    followUps: ['Before looking anything up today, estimate one number first and see how close you were.', 'Challenge a friend: whoever is closest on three questions wins.'],
  },
  {
    id: 'g-pattern-memory',
    title: 'How long a pattern can you hold?',
    summary: 'Watch a sequence light up, then repeat it. Each round adds one more step.',
    area: 'general',
    format: 'game',
    topics: ['mind'],
    minutes: 3,
    energy: 2,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: { kind: 'pattern-memory', params: { start: 3 } } satisfies GamePayload,
    steps: [
      {
        id: 's1',
        title: 'About working memory',
        body:
          "In 1956 the psychologist George Miller wrote a famous paper suggesting people hold about 'seven, plus or minus two' items in short-term memory. Later research suggests the real limit may be closer to four meaningful chunks — and that grouping items is how we stretch it. Notice whether you start grouping the pattern in your head.",
        input: 'none',
      },
    ],
    related: ['g-rhythm-tap', 'g-colour-hunt', 'g-sim-life'],
    followUps: ['Play once in the morning and once at night. Any difference?', 'Try remembering a phone number by chunking it into groups.'],
  },
  {
    id: 'g-rhythm-tap',
    title: 'Keep the beat',
    summary: 'Tap along to a steady beat and see how closely you can keep time. Then try it with your eyes closed.',
    area: 'skill',
    format: 'game',
    topics: ['music', 'movement'],
    minutes: 4,
    energy: 2,
    comfort: 1,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: { kind: 'rhythm-tap', params: { bpm: 96 } } satisfies GamePayload,
    steps: [
      {
        id: 's1',
        title: 'A curious habit',
        body:
          'When people tap along to a regular beat, they often tap slightly ahead of it — typically by a few tens of milliseconds — without noticing. Researchers call this negative mean asynchrony. Watch whether your taps run early or late.',
        input: 'none',
      },
    ],
    related: ['g-listen-rhythm', 'g-pattern-memory', 'g-earworms'],
    followUps: ['Tap along to a favourite song and see if you rush the chorus.', 'Try tapping with your other hand.'],
  },

  // ───────────────────────────── Collab ─────────────────────────────
  {
    id: 'g-back-to-back',
    title: 'Back-to-back drawing',
    summary: 'One person describes, the other draws, and neither can see. A funny, surprisingly revealing lesson in how we explain things.',
    area: 'general',
    format: 'collab',
    topics: ['people', 'art', 'language'],
    minutes: 20,
    energy: 2,
    comfort: 3,
    cost: 0,
    social: 'shared',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Set up',
          body: 'Sit back to back. The describer draws a simple picture made of a few shapes — or picks one — without showing it. The drawer needs paper and a pen.',
          input: 'none',
        },
        {
          id: 's2',
          title: 'Round one: no questions',
          body: "The describer explains the picture using only shapes, sizes and positions — no naming what it is ('a house'). The drawer can't ask anything.",
          timerMinutes: 5,
          input: 'none',
        },
        { id: 's3', title: 'Reveal', body: 'Compare the two drawings. Photograph them side by side.', input: 'photo' },
        { id: 's4', title: 'Round two: questions allowed', body: 'Swap roles with a new picture. This time the drawer may ask questions.', timerMinutes: 5, input: 'none' },
        {
          id: 's5',
          title: 'Talk it over',
          body: 'Which instructions worked best? What did the questions change? What does this suggest about explaining things in everyday life?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-story-ping-pong', 'g-blind-contour', 'g-memory-map'],
    followUps: ['Try it with directions to a real place instead of a drawing.', 'Play a round where the describer can only use ten words.'],
  },
  {
    id: 'g-story-ping-pong',
    title: 'Story ping-pong',
    summary: 'Build a story one sentence at a time with someone else — with a few rules to keep it surprising.',
    area: 'general',
    format: 'collab',
    topics: ['writing', 'people'],
    minutes: 20,
    energy: 2,
    comfort: 3,
    cost: 0,
    social: 'shared',
    origin: 'curated',
    payload: {
      steps: [
        { id: 's1', title: 'Opening line', body: 'One of you writes an opening sentence. Anything goes.', input: 'text' },
        {
          id: 's2',
          title: 'Ping-pong',
          body: 'Take turns adding one sentence each, for ten rounds. Rule: each new sentence must reuse the last word of the previous one somewhere.',
          timerMinutes: 10,
          input: 'text',
        },
        { id: 's3', title: 'The twist', body: "At round six, whoever's turn it is must introduce an object that doesn't belong in the story.", input: 'none' },
        { id: 's4', title: 'Land it', body: 'The final sentence must connect back to the opening line.', input: 'text' },
        { id: 's5', title: 'Read it aloud', body: 'Read the whole story aloud together. Which sentence surprised you most?', input: 'text' },
      ],
    } satisfies StepsPayload,
    related: ['g-six-words', 'g-back-to-back', 'g-one-sheet-zine'],
    followUps: ['Play by message over a week — one sentence a day.', 'Illustrate your favourite sentence.'],
  },
  {
    id: 'g-cook-unfamiliar',
    title: 'Cook from a cuisine new to you both',
    summary: 'Pick a cuisine neither of you has cooked before, choose one dish and make it together. Mistakes encouraged.',
    area: 'twist',
    format: 'collab',
    topics: ['food', 'people'],
    minutes: 60,
    energy: 3,
    comfort: 3,
    cost: 2,
    social: 'shared',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 's1',
          title: 'Choose together',
          body: "Agree on a cuisine neither of you has cooked from. Each suggest one; flip a coin if you can't decide.",
          input: 'text',
        },
        {
          id: 's2',
          title: 'Find one dish',
          body:
            "Pick a single approachable recipe from a trusted source. Read it through together and check you have the time and equipment. One of you looks up a little about the dish's origins.",
          input: 'text',
        },
        { id: 's3', title: 'Shop', body: 'Buy what you need, including at least one ingredient neither of you has used before.', input: 'photo' },
        { id: 's4', title: 'Cook', body: 'Split the jobs and cook together. Taste as you go.', timerMinutes: 45, input: 'none' },
        { id: 's5', title: 'Eat and review', body: 'Eat it properly, at a table. Each of you: one thing you loved, one thing you would change.', input: 'text' },
      ],
    } satisfies StepsPayload,
    related: ['g-ask-a-local', 'g-umami', 'g-taste-nose'],
    followUps: ['Cook the same dish again in a month, changing one thing.', 'Write down the recipe in your own words with your changes.'],
  },

  // ───────────────────────────── Journey ─────────────────────────────
  {
    id: 'g-seven-days-noticing',
    title: 'Seven days of noticing',
    summary: 'Ten minutes a day for a week, each day tuned to a different kind of noticing. By day seven, ordinary routes may look different.',
    area: 'history',
    format: 'journey',
    topics: ['mind', 'nature', 'time'],
    minutes: 10,
    energy: 1,
    comfort: 2,
    cost: 0,
    social: 'solo',
    origin: 'curated',
    payload: {
      steps: [
        { id: 'd1', title: 'Day 1 · Sounds', body: "On a route you take every day, notice three sounds you've never paid attention to. Write them down.", input: 'text' },
        { id: 'd2', title: 'Day 2 · One colour', body: 'Choose a colour in the morning and spot it all day. Note the most unexpected place it appeared.', input: 'text' },
        { id: 'd3', title: 'Day 3 · Small kindnesses', body: 'Notice small acts of kindness — given, received or witnessed. Note one.', input: 'text' },
        { id: 'd4', title: 'Day 4 · Textures', body: 'Touch five different surfaces on purpose today. Sketch the most interesting one.', input: 'sketch' },
        { id: 'd5', title: 'Day 5 · Smells', body: 'Notice smells as you move between places — home, street, shops, work. Which one lingered?', input: 'text' },
        { id: 'd6', title: 'Day 6 · Light', body: 'Notice where light falls in one room or street at a time of your choosing. Photograph it.', input: 'photo' },
        {
          id: 'd7',
          title: 'Day 7 · Look back',
          body: 'Read back over the week. Which kind of noticing came most easily? Which surprised you? Is there one you want to keep?',
          input: 'text',
        },
      ],
    } satisfies StepsPayload,
    related: ['g-colour-hunt', 'g-five-senses', 'g-listen-silence'],
    followUps: ['Save your Day 7 answer as a reflection in Version History.', 'Pick your favourite day and repeat it next month.'],
  },
  {
    id: 'g-bean-diary',
    title: 'A two-week bean diary',
    summary: 'Sprout a few dried beans in a glass jar and watch, over two weeks, how a seed works out which way is down.',
    area: 'general',
    format: 'journey',
    topics: ['plants', 'science'],
    minutes: 10,
    energy: 1,
    comfort: 1,
    cost: 1,
    social: 'either',
    origin: 'curated',
    payload: {
      steps: [
        {
          id: 'd1',
          title: 'Day 1 · Soak and set up',
          body:
            "Soak four or five dried beans (broad, mung, kidney — whatever's in the cupboard) in water overnight. Then line a clear jar with damp kitchen paper and tuck the beans between the paper and the glass so you can see them. Keep a little water in the bottom so the paper stays moist. Don't eat the beans afterwards.",
          input: 'none',
        },
        { id: 'd2', title: 'Days 2–3 · First signs', body: 'Look for the seed coat splitting and a small root emerging. Which way does it grow?', input: 'photo' },
        {
          id: 'd3',
          title: 'Day 4 · Turn the jar',
          body: 'Lay the jar on its side. Predict what the roots will do.',
          input: 'choice',
          choices: ['Keep growing the same way', 'Turn to point down again', 'Stop growing'],
        },
        {
          id: 'd4',
          title: 'Days 5–6 · Watch the turn',
          body:
            'Within a day or two the root tips usually bend to grow downward again. This response to gravity is called gravitropism; specialised cells near the root tip help the plant sense which way is down.',
          input: 'photo',
        },
        { id: 'd5', title: 'Days 7–10 · Shoot and leaves', body: 'A shoot should rise and the first leaves unfold. Keep the paper damp and move the jar somewhere bright.', input: 'photo' },
        { id: 'd6', title: 'Days 11–14 · Plant one', body: 'Move your strongest seedling into a pot of soil. Draw the whole sequence from bean to plant.', input: 'sketch' },
        { id: 'd7', title: 'Look back', body: 'What surprised you most across the two weeks?', input: 'text' },
      ],
    } satisfies StepsPayload,
    related: ['g-plant-clocks', 'g-regrow-scraps', 'g-meet-a-tree'],
    followUps: ['Grow one jar in the light and one in a cupboard, and compare.', 'Plant your seedling outside once the weather is mild.'],
  },
];
