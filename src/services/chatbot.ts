import { generateChatResponse, GeminiContent } from './gemini';


export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ProfileSignals {
  recentSubjects: string[];
  mastery: Record<string, number>;
  weakConcepts: string[];
  quizAccuracy: number;
  dailyPlan: string;
  nextSession: string;
  timetableEntry: string;
  bookmarks: string[];
  recommendedVideos: string[];
  courseProgress: Record<string, string>;
  activityStreak: number;
  focusScore: number;
  extensionStats?: {
    topSites: string[];
    distractionTime: number;
    learningTime: number;
  };
}

export const EDUCATION_ONLY_RESPONSE = 'Out of context — I can only assist with educational questions.';

const BLOCKED_TOPICS = ['dating', 'relationship advice', 'romance', 'violence', 'weapon'];

export function isEducationalPrompt(prompt: string) {
  const lower = prompt.toLowerCase().trim();

  // Empty or very short prompts are not educational
  if (lower.length < 2) {
    return false;
  }

  // Block explicitly non-educational topics (very strict blocking only)
  // Only block if the prompt is clearly about these topics, not just mentions them
  const strictBlockedPatterns = [
    /^(dating|romance|relationship advice)/i,
    /violence|weapon|gun|knife/i,
  ];

  if (strictBlockedPatterns.some((pattern) => pattern.test(lower))) {
    return false;
  }

  // Allow everything else - let Gemini's system instruction handle filtering
  // This is more permissive and relies on Gemini's understanding of educational content
  // The system instruction already tells Gemini to only answer educational questions
  return true;
}

export async function sendChatToAssistant(
  prompt: string,
  history: ChatMessage[],
  profile: ProfileSignals
): Promise<string> {
  const startTime = Date.now();
  const isEducational = isEducationalPrompt(prompt);

  if (!isEducational) {
    return EDUCATION_ONLY_RESPONSE;
  }

  const systemInstruction = buildSystemInstruction(profile);

  // Convert ChatMessage history to GeminiContent[]
  const geminiHistory: GeminiContent[] = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Add the current user prompt to the history for the API call
  // Note: The UI usually adds the user message to its local state *before* calling this.
  // If 'history' already includes the current prompt, we shouldn't add it again.
  // Based on ChatbotWidget.tsx: setMessages((prev) => [...prev, userMessage]); then sendChatToAssistant(trimmed, [...messages, userMessage], ...)
  // So 'history' ALREADY contains the latest user message. We don't need to append it manually if it's there.

  // However, we need to ensure the structure is correct.
  // If the last message in history is the user's prompt, we are good.

  try {
    const response = await generateChatResponse(geminiHistory, systemInstruction);
    const responseTime = Date.now() - startTime;
    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const fallbackResponse = generateFallbackResponse(prompt, profile, error);
    console.error('Chatbot error', error);
    return fallbackResponse;
  }
}

function buildSystemInstruction(profile: ProfileSignals) {
  return `
You are "Study Coach", an education-only study assistant for Adapti-Learn.
RULES:
1. Only answer academic questions (subjects, coding, quizzes, projects, study plans, career readiness).
2. If the query is unrelated to education, respond with "${EDUCATION_ONLY_RESPONSE}".
3. Personalize guidance with the student's signals.
4. If productivity stats (extension data) are available, USE THEM to give feedback on focus/distraction.
5. Keep tone encouraging, concise, and structured.

Student snapshot:
- Recent subjects: ${profile.recentSubjects.join(', ')}
- Mastery: ${Object.entries(profile.mastery)
      .map(([k, v]) => `${k} ${v}%`)
      .join(' | ')}
- Weak concepts: ${profile.weakConcepts.join(', ')}
- Quiz accuracy: ${profile.quizAccuracy}%
- Daily goal: ${profile.dailyPlan}
- Next session: ${profile.nextSession} (Timetable: ${profile.timetableEntry})
- Activity Streak: ${profile.activityStreak} days
- Focus Score (Extension): ${profile.focusScore}%
${profile.extensionStats ? `
- Browser Activity:
  - Top Sites: ${profile.extensionStats.topSites.join(', ')}
  - Learning Time: ${Math.round(profile.extensionStats.learningTime / 60)} mins
  - Distraction Time: ${Math.round(profile.extensionStats.distractionTime / 60)} mins
` : ''}
`.trim();
}

function generateFallbackResponse(prompt: string, profile: ProfileSignals, error?: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  // Return the actual error for debugging purposes
  return `Service Error: ${errorMessage}. Please check API key and internet connection.`;
}


