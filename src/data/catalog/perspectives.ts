import type { PerspectiveQuestion } from '../types';

// Perspective Switch questions (ids prefixed `p-`). Each lens is written to be fair to its position —
// no strawmen — and ends with a prompt inviting the user's own response.

export const PERSPECTIVES: PerspectiveQuestion[] = [
  {
    id: 'p-boredom',
    question: 'Is boredom useful?',
    topics: ['mind', 'time', 'philosophy'],
    lenses: [
      {
        id: 'psychologist',
        name: 'The psychologist',
        take:
          "Many researchers now treat boredom as a signal rather than a flaw: an uncomfortable nudge saying that what you're doing isn't meaningful or engaging enough, and it's time to look for something that is. A few small studies have found people came up with more ideas on a creative task after doing something dull first, though results vary and the effect isn't settled. On this view boredom is useful the way hunger is — unpleasant, but informative.",
        prompt: 'Think of the last time you were bored. What was it trying to tell you?',
      },
      {
        id: 'philosopher',
        name: 'The philosopher',
        take:
          "Philosophers have long taken boredom seriously. A character in Kierkegaard's Either/Or calls it the root of all evil; Heidegger argued that deep boredom, when everything seems to lose its pull, can reveal something about what we actually care about. From this angle, boredom isn't a problem to fix instantly but an experience worth sitting inside now and then — a pause in which the usual distractions fall away and bigger questions become audible.",
        prompt: "Is there anything you've only realised during a stretch of boredom?",
      },
      {
        id: 'skeptic',
        name: 'The skeptic',
        take:
          "It's easy to romanticise boredom when you choose it. Chronic boredom — in a repetitive job, in isolation, in a hospital bed — has been linked in studies to lower wellbeing and more impulsive choices, and it's no gift to the person stuck in it. Calling boredom 'useful' can quietly excuse dull schools, workplaces and situations that should simply be made better. Sometimes boredom means something needs to change, not that you should sit with it.",
        prompt: 'When has boredom felt harmful rather than helpful for you? What would actually have fixed it?',
      },
      {
        id: 'designer',
        name: 'The designer',
        take:
          'Phones, feeds and autoplay have made it possible never to be bored for more than a few seconds, and many apps are deliberately built to fill every gap. Whether boredom is useful or not, the empty moments where it used to live are disappearing. A designer might ask: if we want some of those moments back, should we rely on willpower, or redesign our tools and routines so that a few gaps stay open by default?',
        prompt: 'Where in your day could you leave a gap empty on purpose? What usually fills it?',
      },
    ],
  },
  {
    id: 'p-cars',
    question: 'Should cities be designed around cars?',
    topics: ['cities', 'people'],
    lenses: [
      {
        id: 'driver',
        name: 'The commuter who drives',
        take:
          "For many people a car isn't a luxury but the only practical way to make a complicated day work: school runs, shifts at odd hours, carrying tools, caring for relatives across town, or living where buses are rare. Making driving slower or parking scarcer can feel like punishing the people with the fewest alternatives. From this view, any change should start by making the other options genuinely good — not by making driving worse first.",
        prompt: 'Which trips in your life would be hardest to make without a car? Which would be easiest?',
      },
      {
        id: 'planner',
        name: 'The urban planner',
        take:
          "Space is a city's scarcest resource, and cars use a lot of it — moving, and especially parked, which most cars are for most of the day. A lane of road can carry far more people by bus, tram or bike than by private car. Planners who favour walking, cycling and transit argue that streets built around them are quieter and safer, with room left for trees, seating and homes. The question isn't banning cars, they'd say, but who gets priority.",
        prompt: 'Picture your nearest main street with half its parking turned into something else. What would you put there?',
      },
      {
        id: 'shopkeeper',
        name: 'The local shopkeeper',
        take:
          'Small businesses often worry that removing parking will send customers to out-of-town stores with big car parks. Some studies in different cities have found that shopkeepers tend to overestimate how many customers arrive by car, and that people on foot visit more often — but every street is different, and the cost of getting it wrong falls on the shop, not the planner. Change, from this lens, needs local evidence and a real voice for those whose livelihoods depend on it.',
        prompt: 'Think of a shop you love. How do you usually get there — and how would you feel if that became harder?',
      },
      {
        id: 'non-driver',
        name: 'The child and the older neighbour',
        take:
          "Ask people who can't drive — children, many older people, some disabled people — and the question looks different. Fast, busy roads decide whether a ten-year-old can walk to school alone or an eighty-year-old can cross to the shop. For them, a city built around cars can mean a smaller world. Yet some older and disabled people rely on being driven, or on parking close to where they're going, so 'fewer cars' doesn't automatically mean 'more access'.",
        prompt: 'At what age were you allowed to go out alone where you grew up? What decided that?',
      },
    ],
  },
  {
    id: 'p-handmade',
    question: 'Is a handmade object worth more than a flawless machine-made one?',
    topics: ['craft', 'art', 'philosophy'],
    lenses: [
      {
        id: 'maker',
        name: 'The maker',
        take:
          'A handmade object carries the traces of a person: decisions, small mistakes, the hours it took. When you know who made something, owning it can feel like part of a relationship rather than a transaction. Makers often add that the value lies not only in the object but in the skill kept alive by making it — techniques that quietly disappear when nobody practises them any more. A slightly wonky bowl, on this view, is a record of a human being paying attention.',
        prompt: 'Do you own something handmade? What makes it matter to you?',
      },
      {
        id: 'engineer',
        name: 'The engineer',
        take:
          "Machines make things consistent, affordable and often better. A well-designed mass-produced bowl can be lighter, stronger and cheaper than most handmade ones, and that affordability is what puts good tools and objects into millions of homes. Precision is a kind of care too: someone designed that factory process with enormous attention. Valuing the handmade above all can tip into a preference only some people can afford, overlooking the craft hidden inside everyday industrial design.",
        prompt: "What's a mass-produced object you think is genuinely beautiful or brilliant?",
      },
      {
        id: 'economist',
        name: 'The economist',
        take:
          "Price reflects what people are willing to pay, not some inner worth. Handmade objects usually cost more because they take more labour, and buyers may pay extra for the story, the rarity or what owning it says about them. Whether that premium is 'worth it' depends entirely on what you value. Neither kind of object is objectively more valuable; they're offering different things, and a sensible buyer just asks which of those things they actually want.",
        prompt: 'When have you paid more for the story behind something? Was it worth it?',
      },
      {
        id: 'environmentalist',
        name: 'The environmentalist',
        take:
          "Perhaps the more useful question is which object will last, be repaired and be kept. A handmade chair you keep for forty years may beat a cheap one replaced every few — but a sturdy factory-made item designed for repair can beat a fragile handmade one. Materials, longevity and repairability may matter more than who, or what, did the making. The most valuable object might simply be the one you never need to replace.",
        prompt: 'Which object have you owned the longest? Why has it lasted?',
      },
    ],
  },
  {
    id: 'p-de-extinction',
    question: 'Should we try to bring back extinct species?',
    topics: ['nature', 'science', 'philosophy'],
    lenses: [
      {
        id: 'conservationist',
        name: 'The cautious conservationist',
        take:
          'Money and attention for conservation are limited. Every pound or dollar spent reviving a lost species could protect habitats and species that are still hanging on. A revived animal also needs somewhere to live: if the forest, prey or climate it depended on has gone, bringing it back may create a lonely curiosity rather than a working population. Better, this lens says, to prevent the next extinction than to chase the last one.',
        prompt: 'If you had to choose, would you fund protecting a living endangered species or reviving a lost one? Why?',
      },
      {
        id: 'geneticist',
        name: 'The hopeful geneticist',
        take:
          'The tools developed for de-extinction — gene editing, cloning, reading ancient genomes — can help living species too. In 2020, for example, a black-footed ferret was cloned from cells frozen in the 1980s, as part of an effort to add genetic diversity to an endangered population. Ambitious projects can also attract funding and public excitement that might never go to conservation otherwise. Trying, on this view, teaches us things we cannot learn any other way.',
        prompt: 'Does the spin-off benefit change how you feel about the headline goal?',
      },
      {
        id: 'ecologist',
        name: 'The ecologist',
        take:
          "Some species shaped whole landscapes: large grazers kept grasslands open, and their absence changed what grows. Supporters argue that restoring a missing ecological role, even through a close substitute, could help ecosystems recover. Critics point out that a 'revived' animal is usually an edited relative rather than the original, and that ecosystems have moved on since it vanished. The real question becomes: what role is missing, and is reviving a species the best way to fill it?",
        prompt: 'Is a close substitute "the same" species? What would make you count it as one?',
      },
      {
        id: 'ethicist',
        name: 'The ethicist',
        take:
          'There is a moral pull to undo extinctions that humans caused — something like righting a wrong. But it raises hard questions. Is the animal we create the same species, or a new one with an old name? Would its life be a good one, perhaps raised without others of its kind? And might the promise of bringing species back make people less careful about losing them in the first place?',
        prompt: 'Do we owe anything to species we drove to extinction? What, exactly?',
      },
    ],
  },
  {
    id: 'p-photos',
    question: 'Do photos help us remember — or replace remembering?',
    topics: ['mind', 'art', 'time'],
    lenses: [
      {
        id: 'memory-researcher',
        name: 'The memory researcher',
        take:
          "Some experiments suggest photographing something can weaken memory of it: in a widely cited 2014 study, museum visitors recalled fewer details of objects they'd photographed than of objects they had simply looked at. Other studies have found that taking photos can sharpen visual memory while weakening memory for what you heard. The evidence is mixed, which itself suggests something useful — how and why you take a photo may matter more than whether you take one.",
        prompt: 'Think of a trip you photographed heavily. What do you remember that is not in the pictures?',
      },
      {
        id: 'archivist',
        name: 'The archivist',
        take:
          "Human memory fades and rewrites itself; photographs are evidence. Families rebuild their histories from old prints, and a single picture can bring back a whole afternoon that would otherwise be gone for good. From this view, photos don't replace remembering — they're the cue that makes remembering possible decades later. The real loss isn't taking too many pictures; it's having thousands that nobody ever looks at again.",
        prompt: 'Which old photo brings back the most for you? What does it bring back?',
      },
      {
        id: 'photographer',
        name: 'The photographer',
        take:
          "Taking a good photograph means looking harder: noticing the light, choosing a frame, deciding what to leave out. Many photographers say the camera trains their attention so they see more, not less, even when it's in their pocket. The problem, on this view, isn't cameras but snapping on autopilot. One carefully chosen photo can be an act of attention; fifty taken without looking are just a way of not being there.",
        prompt: 'Next time you reach for your camera, what would make the photo worth taking?',
      },
      {
        id: 'presence',
        name: 'The "be here now" view',
        take:
          "Every moment spent framing a shot is partly spent thinking about later — how it will look, who will see it. Some people find that putting the camera away lets them experience a concert, a meal or a view more fully, even if they keep fewer records of it. Others feel anxious without the record. The trade-off is personal, but worth making on purpose rather than by habit: what are you trading presence for?",
        prompt: 'When did you last choose not to take a photo? How do you remember that moment now?',
      },
    ],
  },
  {
    id: 'p-language',
    question: 'Is language getting worse, or just changing?',
    topics: ['language', 'writing', 'history'],
    lenses: [
      {
        id: 'editor',
        name: 'The careful editor',
        take:
          "Rules of grammar and spelling aren't just snobbery; they help writing travel clearly between strangers. When usage drifts, ambiguity can creep in, and some readers judge harshly whether or not they should. Defending shared standards, from this lens, is about clarity and fairness: knowing the conventions gives people access to the places — exams, job applications, official letters — where those conventions are still expected, and quietly enforced.",
        prompt: 'Which language change bothers you most? Is it about clarity, or something else?',
      },
      {
        id: 'linguist',
        name: 'The linguist',
        take:
          "Linguists mostly describe language rather than police it, and they point out that complaints about decline are very old — writers have lamented the corruption of their language for centuries. English has lost and gained word endings, spellings and rules continuously, and some of today's 'correct' forms began as yesterday's mistakes. Change isn't decay, on this view; it's what living languages do, and only dead ones stop.",
        prompt: 'Think of a word or phrase you use that your grandparents might not have. Is it worse, or just new?',
      },
      {
        id: 'poet',
        name: 'The poet',
        take:
          "To a poet, rules and the breaking of rules both matter. Slang, new coinages and playful grammar are where much of a language's energy comes from — yet breaking a rule only has an effect if readers know the rule is there. The richest language, from this angle, keeps both its standards and its playgrounds, and lets writers move between them on purpose rather than by accident.",
        prompt: 'What is a rule you love to break — or a new word you love?',
      },
      {
        id: 'teacher',
        name: 'The teacher',
        take:
          "In a classroom the question gets practical. Students who speak a dialect or another language at home need standard forms for exams and many jobs, but treating their own speech as simply 'wrong' can make them feel their background is a deficit. Many teachers aim for both: respect for how students actually talk, and the confidence to switch into standard forms when it serves them. Changing language and shared standards can coexist.",
        prompt: 'Do you speak differently with different people? When did you learn to switch?',
      },
    ],
  },
  {
    id: 'p-travel',
    question: 'Is it better to travel far, or to know one place deeply?',
    topics: ['maps', 'cities', 'people'],
    lenses: [
      {
        id: 'traveller',
        name: 'The traveller',
        take:
          "Seeing how other people live — different food, languages and rhythms of a day — can loosen assumptions you didn't know you had. Distance creates contrast, and contrast makes the familiar visible again. Many people say a trip abroad changed how they saw home more than anything they read. On this view, going far isn't escapism; it's a way of finally noticing the water you swim in.",
        prompt: 'Which journey changed how you see home? What did it change?',
      },
      {
        id: 'local',
        name: 'The local',
        take:
          "You can spend a lifetime in one place and still not know it: its history, its plants, its people. Depth has its own rewards — being recognised, noticing the seasons turn, belonging. Gilbert White's The Natural History of Selborne, published in 1789, grew from decades of watching a single English parish, and it's still read today. Attention, not mileage, may be what turns a place into a world.",
        prompt: 'What do you know about where you live that a visitor never would?',
      },
      {
        id: 'climate',
        name: 'The climate-conscious view',
        take:
          "Long-distance travel, especially flying, carries a large carbon footprint per trip. That doesn't settle the question, but it adds weight to one side: if some of the benefits of going far can be found nearer home, it may be worth looking there first, and making far trips rarer, longer and more deliberate. Plenty of people find that a train journey a few hours away still feels like elsewhere.",
        prompt: 'What is the nearest place to you that would still feel like somewhere new?',
      },
      {
        id: 'realist',
        name: 'The realist',
        take:
          "Both options assume freedom of time and money. Many people can't travel far, and others move often for work, family or safety rather than by choice. Perhaps the real skill is portable: bringing a traveller's curiosity to wherever you already are, and a local's patience to wherever you end up. Framed that way, the question isn't where you go but how you look once you're there.",
        prompt: 'How could you bring a traveller’s eyes to an ordinary day this week?',
      },
    ],
  },
  {
    id: 'p-specialist',
    question: 'Is it better to go deep in one skill or dabble in many?',
    topics: ['craft', 'mind', 'people'],
    lenses: [
      {
        id: 'specialist',
        name: 'The specialist',
        take:
          'Mastery takes time. The most skilled people in many fields have spent years of focused practice on a narrow set of skills, and depth opens doors breadth cannot: real expertise, work only an expert can do, and the particular satisfaction of knowing something thoroughly. Dabbling can also become a way of avoiding the uncomfortable middle stage of learning, where progress slows and only persistence carries you through.',
        prompt: 'What have you stuck with past the point where it stopped being easy? What did that give you?',
      },
      {
        id: 'generalist',
        name: 'The generalist',
        take:
          "Many fresh ideas come from connecting fields — borrowing a concept from biology to solve an engineering problem, or bringing a musician's ear to code. Generalists can adapt when one field changes, and spot patterns specialists might miss. Sampling widely also helps people discover the thing they'll eventually want to go deep in; few people find their calling on the first try.",
        prompt: 'Which two of your interests could borrow something from each other?',
      },
      {
        id: 'craftsperson',
        name: 'The craftsperson',
        take:
          "In practice, most skilled people are a bit of both: deep in one core craft and curious about its neighbours. A potter learns some chemistry for glazes; a carpenter learns to draw; a cook learns about growing food. Perhaps the real question isn't 'which?' but 'what depth, in what order?' — a central skill to keep returning to, with side paths that feed it.",
        prompt: 'What is your core skill, and what neighbouring skill would strengthen it?',
      },
      {
        id: 'player',
        name: 'The player',
        take:
          "Not everything has to be optimised. Some skills are worth doing badly forever, simply because they're fun, restful or social. Measuring every hobby by mastery can drain the joy out of it and turn play into another job. Ask instead: which skills do you actually want to get good at, and which do you just want to enjoy? Both are legitimate answers, and you're allowed to change your mind.",
        prompt: 'Which activity do you love doing badly? What would change if you tried to get good at it?',
      },
    ],
  },
];
