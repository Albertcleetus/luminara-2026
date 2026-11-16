// Poster theme (light, warm, brand red) with a few tech accents.

export const COLORS = {
  red: 0xe3262e,
  navy: 0x1d2b4f,
  teal: 0x1a9aa8,
  tech: 0x18b5c8, // tech accent (bright teal)
  orange: 0xf39200,
  gold: 0xf5b400,
  white: 0xffffff,
  cream: 0xfbf6f2,
  line: 0x9aa6c0
};

export const CSS = {
  red: '#E3262E',
  navy: '#1D2B4F',
  teal: '#1A9AA8',
  tech: '#18B5C8',
  orange: '#F39200',
  gold: '#F5B400',
  grey: '#8A8FA8',
  ink: '#33384D',
  white: '#FFFFFF',
  green: '#1FA971'
};

export const FONT = {
  head: 'Oswald, "Arial Narrow", sans-serif',
  body: 'Poppins, Arial, sans-serif',
  mono: '"Share Tech Mono", Consolas, monospace'
};

export const toCss = (n) => '#' + n.toString(16).padStart(6, '0');

// The six keywords, revealed in this order (clockwise from the top tile).
export const KEYWORDS = [
  { word: 'VISION', line: 'Seeing beyond today to shape the classrooms of tomorrow.', color: 0xe3262e },
  { word: 'INNOVATION', line: 'New ideas, new methods, and the courage to try them.', color: 0xf39200 },
  { word: 'SKILLS', line: 'Learning that turns knowledge into real-world ability.', color: 0x1a9aa8 },
  { word: 'TECHNOLOGY', line: 'Digital tools and AI as partners in every classroom.', color: 0x2e5aac },
  { word: 'INCLUSION', line: 'Quality education within reach of every learner in Kerala.', color: 0xc2185b },
  { word: 'EXCELLENCE', line: 'Raising the bar in teaching, research and character.', color: 0x6a3fa0 }
];

export const EVENT = {
  name: 'LUMINARA’26',
  subtitle: 'EDUCATIONAL CONCLAVE',
  tagline: 'REIMAGINING EDUCATION FOR A FUTURE-READY KERALA',
  series: 'MAR ANTONY CARDINAL PADIYARA COMMEMORATIVE LECTURE SERIES – V',
  date: 'NOVEMBER\n21, 2026',
  timeVenue: 'Time :  9.30 a.m. to 4.00 p.m.\nVenue :  HM Block, NIMIT',
  institute: 'NAIPUNNYA INSTITUTE OF MANAGEMENT\nAND INFORMATION TECHNOLOGY (NIMIT)',
  badges: ['UGC AUTONOMOUS', 'NAAC A++', 'AICTE APPROVED', 'ISO 9001:2015', 'KIRF RANKED']
};
