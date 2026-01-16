// Study Notes service with OpenRouter API integration

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

import type { StudyNote, ScrapeJob, NoteCategory, NoteStatus } from '@/data/studyNotes';
import { getDummyStudyNotes, initializeDummyNotes } from '@/data/dummyStudyNotes';

const STORAGE_KEY_NOTES = 'study_notes';
const STORAGE_KEY_JOBS = 'scrape_jobs';

// Initialize dummy notes if localStorage is empty
if (typeof window !== 'undefined') {
  initializeDummyNotes();
}

// Get all notes from localStorage
export function getStudyNotes(): StudyNote[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!stored || stored === '[]') {
      // Initialize with dummy notes if empty
      initializeDummyNotes();
      return getDummyStudyNotes();
    }
    return JSON.parse(stored);
  } catch {
    // If parsing fails, return dummy notes
    return getDummyStudyNotes();
  }
}

// Get note by ID
export function getStudyNoteById(noteId: string): StudyNote | null {
  const notes = getStudyNotes();
  return notes.find(note => note.id === noteId) || null;
}

// Save note to localStorage
export function saveStudyNote(note: StudyNote): void {
  const notes = getStudyNotes();
  const existingIndex = notes.findIndex(n => n.id === note.id);

  if (existingIndex >= 0) {
    notes[existingIndex] = { ...note, updatedAt: new Date().toISOString() };
  } else {
    notes.push({ ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  }

  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
}

// Delete note
export function deleteStudyNote(noteId: string): boolean {
  const notes = getStudyNotes();
  const filtered = notes.filter(n => n.id !== noteId);
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(filtered));
  return filtered.length < notes.length;
}

// Bookmark note
export function bookmarkNote(noteId: string, bookmarked: boolean): void {
  const notes = getStudyNotes();
  const note = notes.find(n => n.id === noteId);
  if (note) {
    note.bookmarked = bookmarked;
    saveStudyNote(note);
  }
}

// Rate note
export function rateNote(noteId: string, rating: 'up' | 'down' | null): void {
  const notes = getStudyNotes();
  const note = notes.find(n => n.id === noteId);
  if (note) {
    if (!note.rating) {
      note.rating = { up: 0, down: 0 };
    }
    if (!note.userRating) {
      note.userRating = null;
    }

    // Remove previous rating
    if (note.userRating === 'up') {
      note.rating.up = Math.max(0, note.rating.up - 1);
    } else if (note.userRating === 'down') {
      note.rating.down = Math.max(0, note.rating.down - 1);
    }

    // Add new rating
    if (rating === 'up') {
      note.rating.up += 1;
      note.userRating = 'up';
    } else if (rating === 'down') {
      note.rating.down += 1;
      note.userRating = 'down';
    } else {
      note.userRating = null;
    }

    saveStudyNote(note);
  }
}

// Search notes
export function searchStudyNotes(query: string, filters?: {
  category?: NoteCategory;
  stream?: string;
  semester?: number;
  subject?: string;
}): StudyNote[] {
  const notes = getStudyNotes();
  const lowerQuery = query.toLowerCase();

  return notes.filter(note => {
    // Text search
    const matchesQuery = !query ||
      note.title.toLowerCase().includes(lowerQuery) ||
      note.summary.toLowerCase().includes(lowerQuery) ||
      note.subject.toLowerCase().includes(lowerQuery) ||
      note.topics.some(topic => topic.toLowerCase().includes(lowerQuery));

    // Filter by category
    const matchesCategory = !filters?.category || note.category === filters.category;

    // Filter by stream
    const matchesStream = !filters?.stream || note.stream === filters.stream;

    // Filter by semester
    const matchesSemester = !filters?.semester || note.semester === filters.semester;

    // Filter by subject
    const matchesSubject = !filters?.subject || note.subject === filters.subject;

    return matchesQuery && matchesCategory && matchesStream && matchesSemester && matchesSubject;
  });
}

// Get bookmarked notes
export function getBookmarkedNotes(): StudyNote[] {
  return getStudyNotes().filter(note => note.bookmarked);
}

// Generate study note using OpenRouter API
export async function generateStudyNote(
  query: string,
  category: NoteCategory,
  stream?: string,
  semester?: number,
  subject?: string
): Promise<StudyNote | null> {
  try {
    const prompt = `You are an academic summarization assistant. Create a comprehensive study note from verified sources.

Task: Create a study note about: "${query}"
${subject ? `Subject: ${subject}` : ''}
${stream ? `Stream: ${stream}` : ''}
${semester ? `Semester: ${semester}` : ''}
Category: ${category}

Please create a structured study note with the following format:

{
  "title": "Clear and descriptive title",
  "summary": "2-4 line summary (50-150 words)",
  "sections": [
    {
      "heading": "Overview",
      "content": "Brief overview of the topic (100-200 words)"
    },
    {
      "heading": "Key Concepts",
      "content": "Main concepts explained clearly (150-250 words)"
    },
    {
      "heading": "Key Formulas",
      "content": "Important formulas with explanations (if applicable)"
    },
    {
      "heading": "Examples",
      "content": "Practical examples with solutions (2-3 examples)"
    },
    {
      "heading": "Common Mistakes",
      "content": "Common mistakes students make (if applicable)"
    }
  ],
  "flashcards": [
    {
      "question": "Question 1",
      "answer": "Answer 1"
    },
    {
      "question": "Question 2",
      "answer": "Answer 2"
    },
    {
      "question": "Question 3",
      "answer": "Answer 3"
    }
  ],
  "examples": [
    {
      "description": "Example description",
      "code": "Code example if applicable"
    }
  ],
  "mcqs": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Explanation of the correct answer"
    }
  ],
  "sources": [
    {
      "url": "https://example.com/topic",
      "title": "Source Title",
      "snippet": "Relevant snippet from source (200-400 words)",
      "domain": "example.com",
      "fetchedAt": "${new Date().toISOString()}",
      "confidence": 0.85
    }
  ]
}

IMPORTANT REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no extra text
2. The summary must be 50-150 words
3. Include at least 3 flashcards
4. Include at least 2-3 MCQs with correct answers
5. Provide practical examples
6. Ensure all content is accurate and educational
7. Use clear, concise language suitable for students
8. Include formulas if the topic requires them
9. Sources should be realistic educational URLs
10. Start your response directly with { and end with }

Return the JSON response now:`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Adapti-Learn';
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API error:', errorBody);
      throw new Error(`Failed to generate note: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // Parse JSON response
    let jsonContent = content;
    if (jsonContent.includes('```json')) {
      const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }
    } else if (jsonContent.includes('```')) {
      const codeMatch = jsonContent.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        jsonContent = codeMatch[1].trim();
      }
    }

    // Extract JSON
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const parsedData = JSON.parse(jsonContent);

    // Create StudyNote object
    const note: StudyNote = {
      title: parsedData.title || query,
      category,
      stream,
      semester,
      subject: subject || query,
      topics: extractTopics(query, subject),
      summary: parsedData.summary || '',
      content: parsedData.sections || [],
      flashcards: parsedData.flashcards || [],
      examples: parsedData.examples || [],
      mcqs: parsedData.mcqs || [],
      sources: parsedData.sources || [],
      rating: { up: 0, down: 0 },
      meta: {
        wordCount: countWords(parsedData.summary + (parsedData.sections || []).map((s: any) => s.content).join(' ')),
        readingTime: Math.ceil(countWords(parsedData.summary + (parsedData.sections || []).map((s: any) => s.content).join(' ')) / 200),
      },
      visibility: 'public',
      bookmarked: false,
      lastRefreshedAt: new Date().toISOString(),
    };

    return note;
  } catch (error) {
    console.error('Error generating study note:', error);
    return null;
  }
}

// Helper function to extract topics from query
function extractTopics(query: string, subject?: string): string[] {
  const topics: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Common topic keywords
  const topicKeywords = [
    'normalization', 'sql', 'erd', 'transaction', 'indexing',
    'tree', 'graph', 'sorting', 'searching', 'algorithm',
    'process', 'thread', 'scheduling', 'memory', 'deadlock',
    'network', 'protocol', 'tcp', 'udp', 'http',
    'thermodynamics', 'fluid', 'mechanics', 'heat', 'transfer',
    'circuit', 'signal', 'filter', 'amplifier', 'oscillator',
  ];

  topicKeywords.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      topics.push(keyword);
    }
  });

  if (subject) {
    topics.push(subject);
  }

  return topics.length > 0 ? topics : [query];
}

// Helper function to count words
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

// Create scrape job
export function createScrapeJob(
  query: string,
  category: NoteCategory,
  stream?: string,
  semester?: number,
  subject?: string,
  userId?: string
): ScrapeJob {
  const job: ScrapeJob = {
    id: crypto.randomUUID(),
    query,
    category,
    stream,
    semester,
    subject,
    status: 'pending',
    initiatedBy: userId,
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const jobs = getScrapeJobs();
  jobs.push(job);
  localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));

  return job;
}

// Get scrape jobs
export function getScrapeJobs(): ScrapeJob[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_JOBS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Update scrape job status
export function updateScrapeJobStatus(jobId: string, status: NoteStatus, resultNoteId?: string): void {
  const jobs = getScrapeJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job) {
    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (resultNoteId) {
      job.resultNoteId = resultNoteId;
    }
    localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
  }
}

// Process scrape job (generate note)
export async function processScrapeJob(jobId: string): Promise<StudyNote | null> {
  const jobs = getScrapeJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return null;

  updateScrapeJobStatus(jobId, 'processing');

  try {
    const note = await generateStudyNote(
      job.query,
      job.category,
      job.stream,
      job.semester,
      job.subject
    );

    if (note) {
      saveStudyNote(note);
      updateScrapeJobStatus(jobId, 'completed', note.id);
      return note;
    } else {
      updateScrapeJobStatus(jobId, 'failed');
      return null;
    }
  } catch (error) {
    console.error('Error processing scrape job:', error);
    updateScrapeJobStatus(jobId, 'failed');
    return null;
  }
}

