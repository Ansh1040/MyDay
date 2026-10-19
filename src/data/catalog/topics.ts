import type { Topic } from '../types';

// Fixed topic vocabulary. Content and UI reference these ids.
export const TOPICS: Topic[] = [
  { id: 'music', label: 'Music', blurb: 'Why sound moves us, and how to make it.' },
  { id: 'sound', label: 'Sound & listening', blurb: 'Noticing, recording and shaping sound.' },
  { id: 'mind', label: 'Mind & mood', blurb: 'Attention, emotion, habits and perception.' },
  { id: 'cities', label: 'Cities & places', blurb: 'How streets and spaces shape everyday life.' },
  { id: 'nature', label: 'Nature', blurb: 'Weather, animals, seasons and the outdoors.' },
  { id: 'plants', label: 'Plants', blurb: 'Growth, signals and the quiet lives of plants.' },
  { id: 'maps', label: 'Maps & navigation', blurb: 'How we find our way and represent the world.' },
  { id: 'science', label: 'Science', blurb: 'Experiments, systems and how things work.' },
  { id: 'math', label: 'Patterns & math', blurb: 'Randomness, shape, estimation and play.' },
  { id: 'art', label: 'Art & drawing', blurb: 'Seeing, sketching and visual thinking.' },
  { id: 'writing', label: 'Writing & stories', blurb: 'Words, narrative and voice.' },
  { id: 'language', label: 'Language', blurb: 'How words carry meaning across people.' },
  { id: 'history', label: 'History', blurb: 'How the past shows up in the present.' },
  { id: 'food', label: 'Food', blurb: 'Taste, cooking and food culture.' },
  { id: 'movement', label: 'Movement', blurb: 'Bodies, walking, balance and play.' },
  { id: 'code', label: 'Code & making', blurb: 'Programming, tinkering and tools.' },
  { id: 'philosophy', label: 'Ideas & philosophy', blurb: 'Big questions and different ways to see them.' },
  { id: 'people', label: 'People & conversation', blurb: 'Connection, listening and shared experience.' },
  { id: 'time', label: 'Time & routine', blurb: 'Habits, boredom, pace and change.' },
  { id: 'craft', label: 'Craft & hands-on', blurb: 'Building and fixing things with your hands.' },
];

export const topicLabel = (id: string) => TOPICS.find((t) => t.id === id)?.label ?? id;
