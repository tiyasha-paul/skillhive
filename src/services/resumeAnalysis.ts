// Resume Analysis Service using Gemini API for job recommendations

import { generateGeminiText, extractTextFromPDF } from './gemini';
import { searchJobs, type JobResult } from './jobSearch';

export interface ResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills?: string[];
  certifications?: string[];
}

export interface JobRecommendation {
  job: JobResult;
  matchScore: number;
  matchReason: string;
  skillsMatch: string[];
  missingSkills: string[];
}

export interface ResumeAnalysisResult {
  resumeData: ResumeData;
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  jobRecommendations: JobRecommendation[];
}

/**
 * Analyze resume text and extract structured data
 */
export async function analyzeResumeText(resumeText: string): Promise<ResumeData> {
  const prompt = `Analyze the following resume text and extract structured information. Return ONLY valid JSON, no markdown, no code blocks.

Resume Text:
${resumeText}

Extract and return a JSON object with this structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number if available",
  "location": "City, State/Country",
  "summary": "Professional summary or objective",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start Date - End Date",
      "description": "Job description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "Graduation Year"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "certifications": ["cert1", "cert2"]
}

Return ONLY the JSON object:`;

  try {
    const response = await generateGeminiText(prompt);

    // Clean response (remove markdown code blocks if any)
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    const resumeData: ResumeData = JSON.parse(cleanedResponse);
    return resumeData;
  } catch (error) {
    console.error('Error analyzing resume:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to analyze resume: ${errorMessage}`);
  }
}

/**
 * Get job recommendations based on resume
 */
export async function getJobRecommendations(
  resumeData: ResumeData,
  location?: string,
  maxJobs: number = 20
): Promise<JobRecommendation[]> {
  // Build search query from resume data
  const skills = resumeData.skills?.join(' ') || '';
  const experience = resumeData.experience?.[0]?.title || resumeData.experience?.[0]?.company || '';
  const searchQuery = `${experience} ${skills}`.trim() || 'software developer';

  // Search for jobs
  const searchLocation = location || resumeData.location || 'India';
  const jobSearchParams = {
    field: experience || 'Software Developer',
    location: searchLocation,
    jobType: '',
    experienceLevel: '',
    workType: '',
  };

  console.log('[ResumeAnalysis] Searching for jobs with params:', jobSearchParams);

  try {
    const { jobs } = await searchJobs(jobSearchParams, 1);

    console.log(`[ResumeAnalysis] Found ${jobs.length} jobs, analyzing matches...`);

    if (jobs.length === 0) {
      console.warn('[ResumeAnalysis] No jobs found, returning empty recommendations');
      return [];
    }

    // Analyze each job and calculate match score (limit to avoid too many API calls)
    const recommendations: JobRecommendation[] = [];
    const jobsToAnalyze = jobs.slice(0, Math.min(maxJobs, jobs.length));

    // Process jobs in batches to avoid overwhelming the API
    for (let i = 0; i < jobsToAnalyze.length; i++) {
      const job = jobsToAnalyze[i];
      try {
        const match = await calculateJobMatch(resumeData, job);
        recommendations.push(match);
        console.log(`[ResumeAnalysis] Analyzed job ${i + 1}/${jobsToAnalyze.length}: ${job.title} - Match: ${match.matchScore}%`);

        // Small delay to avoid rate limiting
        if (i < jobsToAnalyze.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[ResumeAnalysis] Error analyzing job ${job.title}:`, error);
        // Add job with default match score if analysis fails
        recommendations.push({
          job,
          matchScore: 50,
          matchReason: 'Unable to analyze match - showing job anyway',
          skillsMatch: [],
          missingSkills: [],
        });
      }
    }

    // Sort by match score (highest first)
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[ResumeAnalysis] Returning ${recommendations.length} job recommendations`);
    return recommendations.slice(0, maxJobs);
  } catch (error) {
    console.error('[ResumeAnalysis] Error getting job recommendations:', error);
    // Return empty array if search fails completely
    return [];
  }
}

/**
 * Calculate job match score using Gemini
 */
async function calculateJobMatch(resumeData: ResumeData, job: JobResult): Promise<JobRecommendation> {
  const resumeSkills = resumeData.skills?.join(', ') || 'Not specified';
  const resumeExperience = resumeData.experience?.map(exp => `${exp.title} at ${exp.company}`).join('; ') || 'Not specified';
  const jobDescription = job.description || job.snippet || '';

  const prompt = `Analyze how well this resume matches the job posting. Return ONLY valid JSON.

Resume Skills: ${resumeSkills}
Resume Experience: ${resumeExperience}
Job Title: ${job.title}
Job Description: ${jobDescription}

Return a JSON object with this structure:
{
  "matchScore": 85,
  "matchReason": "Strong match because...",
  "skillsMatch": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"]
}

matchScore should be 0-100.
Return ONLY the JSON object:`;

  try {
    const response = await generateGeminiText(prompt);

    // Clean response
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    const matchData = JSON.parse(cleanedResponse);

    return {
      job,
      matchScore: matchData.matchScore || 0,
      matchReason: matchData.matchReason || 'Match analysis unavailable',
      skillsMatch: matchData.skillsMatch || [],
      missingSkills: matchData.missingSkills || [],
    };
  } catch (error) {
    console.error('Error calculating job match:', error);
    // Return default match if analysis fails
    return {
      job,
      matchScore: 50,
      matchReason: 'Unable to analyze match',
      skillsMatch: [],
      missingSkills: [],
    };
  }
}

/**
 * Complete resume analysis with job recommendations
 */
export async function analyzeResumeAndGetJobs(
  resumeFile: File | null,
  resumeText: string,
  userLocation?: string
): Promise<ResumeAnalysisResult> {
  let finalResumeText = resumeText || '';

  // Extract text from PDF if available
  if (resumeFile) {
    try {
      console.log('Attempting to extract text from PDF...');
      const pdfText = await extractTextFromPDF(resumeFile);
      if (pdfText && pdfText.trim().length > 0) {
        finalResumeText += `\n\n=== CONTENT EXTRACTED FROM RESUME PDF ===\n${pdfText}`;
        console.log('Successfully extracted text from PDF');
      }
    } catch (error) {
      console.error('Failed to extract text from PDF:', error);
      // Continue with just the structured data
    }
  }

  if (!finalResumeText.trim()) {
    if (resumeFile) {
      return {
        resumeData: {} as ResumeData,
        summary: 'Resume uploaded but text extraction failed and no manual details provided.',
        strengths: [],
        improvements: [],
        suggestions: ['Please fill in the profile details manually.'],
        jobRecommendations: [],
      };
    }
    throw new Error('Please provide resume text or upload a resume file');
  }

  // Analyze resume structure
  const resumeData = await analyzeResumeText(finalResumeText);

  // Get comprehensive analysis
  const analysisPrompt = `Analyze this resume and provide detailed feedback. Return ONLY valid JSON.

Resume Text:
${finalResumeText}

Return a JSON object with this structure:
{
  "summary": "Brief professional summary",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Return ONLY the JSON object:`;

  try {
    const analysisResponse = await generateGeminiText(analysisPrompt);

    // Clean response
    let cleanedResponse = analysisResponse.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    const analysis = JSON.parse(cleanedResponse);

    // Get job recommendations
    console.log('[ResumeAnalysis] Getting job recommendations...');
    const jobRecommendations = await getJobRecommendations(resumeData, userLocation, 20);

    console.log(`[ResumeAnalysis] Analysis complete. Found ${jobRecommendations.length} job recommendations.`);

    return {
      resumeData,
      summary: analysis.summary || 'Resume analysis completed',
      strengths: analysis.strengths || [],
      improvements: analysis.improvements || [],
      suggestions: analysis.suggestions || [],
      jobRecommendations,
    };
  } catch (error) {
    console.error('[ResumeAnalysis] Error in complete resume analysis:', error);
    // Return partial results if job recommendations fail
    if (error instanceof Error && error.message.includes('job')) {
      // If only job recommendations failed, return analysis without jobs
      return {
        resumeData: {} as ResumeData,
        summary: 'Resume analysis completed, but job recommendations could not be loaded. Please try the search tab.',
        strengths: [],
        improvements: [],
        suggestions: ['Try using the job search tab to find jobs manually'],
        jobRecommendations: [],
      };
    }
    throw error;
  }
}

