export type NoteCategory = 'college' | 'competitive' | 'personal' | 'video_note';
export type NoteStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface NoteSource {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  fetchedAt: string;
  confidence?: number;
}

export interface NoteSection {
  heading: string;
  content: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface NoteExample {
  description: string;
  code?: string;
}

export interface MCQ {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface StudyNote {
  id?: string;
  title: string;
  category: NoteCategory;
  stream?: string; // CSE, ECE, etc.
  semester?: number;
  subject: string;
  topics: string[];
  videoUrl?: string;
  videoId?: string;
  summary: string;
  content: NoteSection[];
  flashcards: Flashcard[];
  examples: NoteExample[];
  mcqs: MCQ[];
  sources: NoteSource[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRefreshedAt?: string;
  rating?: {
    up: number;
    down: number;
  };
  meta?: {
    wordCount: number;
    readingTime: number; // in minutes
  };
  visibility?: 'public' | 'private';
  bookmarked?: boolean;
  userRating?: 'up' | 'down' | null;
}

export interface ScrapeJob {
  id?: string;
  query: string;
  category: NoteCategory;
  stream?: string;
  semester?: number;
  subject?: string;
  status: NoteStatus;
  initiatedBy?: string;
  resultNoteId?: string;
  logs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// College subjects for study notes
export const collegeSubjects = {
  'CSE': {
    'Semester 3': [
      'Data Structures',
      'Digital Logic & Computer Organization',
      'Discrete Mathematics',
      'Object Oriented Programming (OOPs)',
      'Operating Systems',
      'Computer Networks (Intro)',
    ],
    'Semester 4': [
      'Database Management Systems',
      'Design & Analysis of Algorithms',
      'Software Engineering',
      'Microprocessors & Microcontrollers',
      'Theory of Computation',
      'Probability & Statistics',
    ],
  },
  'ECE': {
    'Semester 3': [
      'Analog Electronic Circuits',
      'Digital Electronics',
      'Network Theory',
      'Signals & Systems',
      'Electronic Devices',
    ],
    'Semester 4': [
      'Electromagnetic Theory',
      'Microprocessors & Microcontrollers',
      'Communication Systems – I',
      'Linear Integrated Circuits',
      'Probability Theory & Random Processes',
    ],
  },
  'Civil Engineering': {
    'Semester 3': [
      'Strength of Materials – I',
      'Fluid Mechanics',
      'Surveying – I',
      'Engineering Geology',
      'Building Materials',
    ],
    'Semester 4': [
      'Strength of Materials – II',
      'Concrete Technology',
      'Structural Analysis – I',
      'Surveying – II',
      'Hydraulics & Hydraulic Machines',
    ],
  },
  'Mechanical Engineering': {
    'Semester 3': [
      'Engineering Thermodynamics',
      'Fluid Mechanics',
      'Manufacturing Processes – I',
      'Strength of Materials',
      'Kinematics of Machines',
    ],
    'Semester 4': [
      'Applied Thermodynamics',
      'Dynamics of Machines',
      'Heat & Mass Transfer',
      'Manufacturing Processes – II',
      'Machine Drawing',
    ],
  },
};

// Competitive exam topics
export const competitiveExamTopics = {
  'GATE': {
    'CSE': [
      'Data Structures & Algorithms',
      'Operating Systems',
      'Database Management Systems',
      'Computer Networks',
      'Theory of Computation',
      'Compiler Design',
      'Computer Organization',
    ],
    'ECE': [
      'Analog Electronics',
      'Digital Electronics',
      'Signals & Systems',
      'Communication Systems',
      'Electromagnetic Theory',
      'Control Systems',
    ],
    'EE': [
      'Power Systems',
      'Electrical Machines',
      'Control Systems',
      'Power Electronics',
      'Signals & Systems',
    ],
    'ME': [
      'Thermodynamics',
      'Fluid Mechanics',
      'Machine Design',
      'Manufacturing',
      'Heat Transfer',
    ],
  },
  'UPSC': [
    'GS Paper 1 - History',
    'GS Paper 1 - Geography',
    'GS Paper 2 - Polity',
    'GS Paper 2 - Governance',
    'GS Paper 3 - Economy',
    'GS Paper 3 - Science & Technology',
    'GS Paper 4 - Ethics',
    'Current Affairs',
  ],
  'CAT': [
    'Quantitative Aptitude',
    'Logical Reasoning',
    'Verbal Ability',
    'Data Interpretation',
  ],
  'GRE': [
    'Verbal Reasoning',
    'Quantitative Reasoning',
    'Analytical Writing',
    'Vocabulary',
  ],
  'GMAT': [
    'Integrated Reasoning',
    'Analytical Writing',
    'Quantitative',
    'Verbal',
  ],
};

