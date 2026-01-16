// Google Gemini API service for AI responses

// Read API key from Vite env. You must set VITE_GEMINI_API_KEY in your .env file.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Use v1beta endpoint with a modern Flash model.
// You requested Gemini 2.x Flash; update GEMINI_MODEL if your key supports 2.5.
// Examples: 'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-2.5-flash'.
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface ResumeAnalysis {
  suggestions: string[];
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface ChatMessagePart {
  text: string;
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: ChatMessagePart[];
}

export interface GeminiSystemInstruction {
  parts: ChatMessagePart[];
}

export interface GeminiRequest {
  contents: GeminiContent[];
  system_instruction?: GeminiSystemInstruction;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Core function to call Gemini API with full chat history and system instruction.
 */
export async function generateChatResponse(
  history: GeminiContent[],
  systemInstruction: string,
  retries = 2
): Promise<string> {
  console.log('[Gemini Service] Starting chat request...');

  if (!GEMINI_API_KEY) {
    console.error('[Gemini Service] API Key is missing!');
    throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  const requestBody: GeminiRequest = {
    contents: history,
    system_instruction: {
      parts: [{ text: systemInstruction }]
    }
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Gemini Service] Error body:', errorBody);
        let errorData;
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { error: { message: errorBody } };
        }

        // Handle 429 (Quota Exceeded) specifically
        if (response.status === 429) {
          const errorMessage = errorData?.error?.message || 'Quota exceeded';
          throw new Error(
            `Gemini API quota exceeded. Please check your billing and quota limits. Error: ${errorMessage}`
          );
        }

        if (response.status === 503) {
          throw new Error('Service Unavailable');
        }

        throw new Error(`Gemini API error: ${response.status}. ${errorBody.substring(0, 200)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        throw new Error('Empty response from Gemini.');
      }
      return text;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`Gemini API error, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Failed to generate response after retries.');
}

// Legacy function for backward compatibility or simple text generation
export async function generateGeminiText(prompt: string, retries = 2): Promise<string> {
  const history: GeminiContent[] = [{
    role: 'user',
    parts: [{ text: prompt }]
  }];
  // Pass an empty system instruction for legacy calls
  return generateChatResponse(history, '', retries);
}

// Keep backward compatibility aliases
export async function generateOpenRouterText(prompt: string): Promise<string> {
  return generateGeminiText(prompt);
}

export const generateChatGPTText = generateGeminiText;

export async function analyzeResume(resumeText: string, jobDescription?: string): Promise<ResumeAnalysis> {
  try {
    const prompt = jobDescription
      ? `Analyze this resume and provide suggestions for applying to this job:
Job Description: ${jobDescription}
Resume Text:
${resumeText}
Please provide:
1. Key strengths that match the job requirements
2. Areas for improvement
3. Specific suggestions to enhance the resume for this job
4. A brief summary of the resume
Format your response as a structured analysis.`
      : `Analyze this resume and provide suggestions:
Resume Text:
${resumeText}
Please provide:
1. Key strengths
2. Areas for improvement
3. Specific suggestions to enhance the resume
4. A brief summary
Format your response as a structured analysis.`;

    const text = await generateGeminiText(prompt);
    return parseGeminiResponse(text);
  } catch (error) {
    console.error('Error analyzing resume:', error);
    return {
      suggestions: ['Unable to analyze resume. Please try again.'],
      strengths: [],
      improvements: [],
      summary: 'Analysis unavailable.',
    };
  }
}

function parseGeminiResponse(text: string): ResumeAnalysis {
  const lines = text.split('\n').filter(line => line.trim());
  const strengths: string[] = [];
  const improvements: string[] = [];
  const suggestions: string[] = [];
  let summary = '';
  let currentSection = '';

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('strength') || lowerLine.includes('strong')) {
      currentSection = 'strengths';
    } else if (lowerLine.includes('improvement') || lowerLine.includes('weakness') || lowerLine.includes('area for')) {
      currentSection = 'improvements';
    } else if (lowerLine.includes('suggestion') || lowerLine.includes('recommendation')) {
      currentSection = 'suggestions';
    } else if (lowerLine.includes('summary') || lowerLine.includes('overview')) {
      currentSection = 'summary';
    } else if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./)) {
      const cleanLine = line.replace(/^[-•\d.\s]+/, '').trim();
      if (currentSection === 'strengths' && cleanLine) strengths.push(cleanLine);
      else if (currentSection === 'improvements' && cleanLine) improvements.push(cleanLine);
      else if (currentSection === 'suggestions' && cleanLine) suggestions.push(cleanLine);
    } else if (currentSection === 'summary' && line.trim()) {
      summary += line.trim() + ' ';
    }
  }

  return {
    suggestions: suggestions.length > 0 ? suggestions : ['Review your resume for grammar and formatting.'],
    strengths: strengths.length > 0 ? strengths : ['Your resume has been submitted for analysis.'],
    improvements: improvements.length > 0 ? improvements : ['Consider adding more specific achievements.'],
    summary: summary.trim() || text.substring(0, 200),
  };
}

import * as pdfjsLib from 'pdfjs-dist';

// Extract text from PDF using PDF.js
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF file. Please ensure it is a valid PDF.');
  }
}

/**
 * Validates if the search query is related to educational topics.
 * Returns true if educational, false otherwise.
 */
export async function validateSearchQuery(query: string): Promise<boolean> {
  const prompt = `Is the search query "${query}" related to educational topics, engineering, science, technology, math, career development, or general knowledge? 
  
  Reply with strictly "YES" or "NO".`;

  try {
    const response = await generateGeminiText(prompt);
    const cleanResponse = response.trim().toUpperCase();
    return cleanResponse.includes('YES');
  } catch (error) {
    console.error('Error validating search query:', error);
    // If validation fails (e.g., API error), default to allowing the search to be safe
    return true;
  }
}
