import type { QuestTemplate } from '../types';

// Two-Person Quest templates (ids prefixed `q-`). Each person answers separately;
// prompts are chosen so the two sets of answers are interesting to compare side by side.

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'q-same-place',
    title: 'Same place, two pairs of eyes',
    intro:
      "Each of you spends ten minutes in the same place — at different times, or side by side without talking. Answer separately, then compare. It's surprising how differently two people can see one spot.",
    kind: 'interpretation',
    topics: ['cities', 'people', 'mind'],
    prompts: [
      { id: 'p1', kind: 'text', text: 'What was the first thing you noticed?' },
      { id: 'p2', kind: 'choice', text: 'Which word fits the place best?', choices: ['Calm', 'Busy', 'Tired', 'Hopeful', 'Strange', 'Something else'] },
      { id: 'p3', kind: 'task', text: 'Find the most overlooked detail in the place. Describe it so the other person could find it.' },
      { id: 'p4', kind: 'text', text: 'If this place were a song, what would it be — and why?' },
      { id: 'p5', kind: 'text', text: 'Who do you imagine uses this place most, and when?' },
    ],
  },
  {
    id: 'q-second-cup',
    title: 'The second cup',
    intro:
      "Read this tiny scene, then answer without discussing it: 'The kettle clicked off. She poured two cups, left one on the counter and picked up her coat. Outside, it had just started to rain.' There's no right answer — the fun is in how differently you read it.",
    kind: 'interpretation',
    topics: ['writing', 'people', 'language'],
    prompts: [
      { id: 'p1', kind: 'text', text: 'Who is the second cup for?' },
      { id: 'p2', kind: 'choice', text: 'How is she feeling?', choices: ['Relieved', 'Sad', 'Hopeful', 'Angry', 'Something else'] },
      { id: 'p3', kind: 'text', text: 'Where is she going?' },
      { id: 'p4', kind: 'text', text: 'Write the next sentence.' },
      { id: 'p5', kind: 'text', text: 'Give the whole scene a title.' },
    ],
  },
  {
    id: 'q-guess-me',
    title: 'How well do you guess each other?',
    intro:
      'Answer for yourself, then guess what the other person chose. When you compare, score a point for every correct guess — and ask about every wrong one.',
    kind: 'challenge',
    topics: ['people'],
    prompts: [
      {
        id: 'p1',
        kind: 'choice',
        text: 'A free day appears. Which do you pick?',
        choices: ['A long walk somewhere new', 'A day at home making something', 'A whole day with friends', 'Total, glorious nothing'],
      },
      { id: 'p2', kind: 'text', text: 'Your guess: which did the other person pick?' },
      {
        id: 'p3',
        kind: 'choice',
        text: 'Which would you rather be able to do instantly?',
        choices: ['Play any instrument', 'Speak any language', 'Draw anything', 'Cook anything'],
      },
      { id: 'p4', kind: 'text', text: 'Your guess: what did they pick?' },
      { id: 'p5', kind: 'text', text: 'Name a small thing that reliably makes you happy — then guess theirs.' },
    ],
  },
  {
    id: 'q-ten-minute-sprint',
    title: 'Ten-minute parallel challenge',
    intro:
      'Same tasks, same ten minutes, done separately. Set a timer and go — then swap results and see how two minds tackled the same brief.',
    kind: 'challenge',
    topics: ['art', 'writing', 'people'],
    prompts: [
      { id: 'p1', kind: 'task', text: 'Draw the other person from memory in two minutes. Describe or photograph your drawing.' },
      { id: 'p2', kind: 'text', text: 'Write a six-word story about today.' },
      { id: 'p3', kind: 'task', text: 'Find the oldest object you can reach from where you are. What is it, and how old do you think it is?' },
      { id: 'p4', kind: 'text', text: 'Name the first song that comes into your head right now.' },
      { id: 'p5', kind: 'choice', text: 'How did that feel?', choices: ['Fun', 'Frantic', 'Weirdly calming', 'All of the above'] },
    ],
  },
  {
    id: 'q-two-person-zine',
    title: 'A zine in two halves',
    intro:
      "Make an eight-page zine together — four pages each — on a theme you pick together. Don't look at each other's pages until the end.",
    kind: 'project',
    topics: ['art', 'writing', 'craft'],
    prompts: [
      {
        id: 'p1',
        kind: 'choice',
        text: 'Choose your shared theme.',
        choices: ['Our street', 'Things that made us laugh this month', 'A field guide to an imaginary place', 'Instructions for a good day'],
      },
      { id: 'p2', kind: 'task', text: 'Make your four pages — draw, write or collage. Describe what you made.' },
      { id: 'p3', kind: 'text', text: 'Which of your pages are you proudest of, and why?' },
      { id: 'p4', kind: 'text', text: 'Before you see theirs: what do you think they made?' },
      { id: 'p5', kind: 'text', text: 'Your title for the finished zine:' },
    ],
  },
  {
    id: 'q-imaginary-playlist',
    title: "A playlist for a journey that doesn't exist",
    intro:
      'Build a soundtrack for an imaginary journey. Each of you picks your own songs for each stage, then you listen to each other’s and merge the best into one playlist.',
    kind: 'project',
    topics: ['music', 'people', 'sound'],
    prompts: [
      {
        id: 'p1',
        kind: 'choice',
        text: 'Where is the journey going?',
        choices: ['A night train across a continent', 'A slow walk to the sea', 'A road trip with no map', 'The walk home after a great day'],
      },
      { id: 'p2', kind: 'text', text: 'A song for setting off:' },
      { id: 'p3', kind: 'text', text: 'A song for the long middle stretch:' },
      { id: 'p4', kind: 'text', text: 'A song for arriving:' },
      { id: 'p5', kind: 'task', text: "Listen to the other person's three songs. For each, write one line about what it made you picture." },
    ],
  },
];
