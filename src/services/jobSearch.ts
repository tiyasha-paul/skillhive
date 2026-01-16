// Gemini API service for job search

import { generateGeminiText } from './gemini';

export interface JobSearchParams {
  field: string;
  location: string;
  jobType?: string;
  experienceLevel?: string;
  workType?: string;
}

export interface JobResult {
  title: string;
  company: string;
  location: string;
  type: string; // Full Time, Part Time, Contract, etc.
  work_type: string; // Remote, Hybrid, On-site
  description: string;
  apply_link: string;
  experience_level?: string;
  salary_range?: string;
  industry?: string;
  posted_date?: string;
  // Keep legacy fields for backward compatibility
  link?: string;
  snippet?: string;
  displayLink?: string;
}

export async function searchJobs(params: JobSearchParams, startIndex: number = 1): Promise<{
  jobs: JobResult[];
  totalResults: number;
}> {
  // 1. Try JSearch API if key is configured
  const JSEARCH_API_KEY = import.meta.env.VITE_JSEARCH_API_KEY;
  if (JSEARCH_API_KEY) {
    try {
      console.log('[JobSearch] using Real-time JSearch API');
      let query = `${params.field} in ${params.location}`;
      if (params.jobType) query += ` ${params.jobType}`;
      if (params.experienceLevel) query += ` ${params.experienceLevel}`;

      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${Math.ceil(startIndex / 10)}&num_pages=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': JSEARCH_API_KEY,
          'x-rapidapi-host': 'jsearch.p.rapidapi.com'
        }
      });

      if (!response.ok) throw new Error(`JSearch API error: ${response.status}`);

      const data = await response.json();
      const jobList = data.data || [];

      // Map JSearch response to our JobResult interface
      const mappedJobs: JobResult[] = jobList.map((j: any) => ({
        title: j.job_title,
        company: j.employer_name,
        location: j.job_city ? `${j.job_city}, ${j.job_country}` : (j.job_country || 'Remote'),
        type: j.job_employment_type || 'Full Time',
        work_type: j.job_is_remote ? 'Remote' : 'On-site',
        description: j.job_description,
        apply_link: j.job_apply_link,
        experience_level: params.experienceLevel, // JSearch doesn't always return this cleanly, fallback to search param
        salary_range: j.job_min_salary ? `${j.job_min_salary}-${j.job_max_salary} ${j.job_salary_currency}` : undefined,
        industry: j.job_job_title,
        posted_date: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc).toLocaleDateString() : 'Recently',
        link: j.job_apply_link,
        snippet: j.job_description ? j.job_description.substring(0, 200) + '...' : '',
        displayLink: j.employer_website || j.employer_name
      }));

      return {
        jobs: mappedJobs,
        totalResults: mappedJobs.length > 0 ? 100 : 0 // JSearch doesn't always give total, assume more if data exists
      };

    } catch (error) {
      console.error('[JobSearch] JSearch API failed, falling back to AI simulation:', error);
      // Fallthrough to Gemini simulation
    }
  }

  // 2. Fallback to Gemini AI Simulation
  try {
    // Build structured query for OpenRouter
    let query = `${params.field} jobs in ${params.location}`;
    // ... rest of existing Gemini logic ...

    if (params.jobType && params.jobType !== '') {
      query += ` for ${params.jobType}`;
    }

    if (params.workType && params.workType !== '') {
      query += ` ${params.workType}`;
    }

    if (params.experienceLevel && params.experienceLevel !== '') {
      query += ` ${params.experienceLevel}`;
    }

    // Create prompt for Gemini to search and return structured job data
    const prompt = `You are a job search assistant. Generate realistic job openings based on the search query and return them in a structured JSON format.

Search Query: "${query}"

Generate realistic job postings that would be found on reputable job sites like LinkedIn, Indeed, Naukri, Glassdoor, AngelList, and company career pages. Return a JSON array of job listings with the following structure:

{
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country or Remote",
      "type": "Full Time" or "Part Time" or "Contract" or "Temporary" or "Volunteer",
      "work_type": "Remote" or "Hybrid" or "On-site",
      "description": "2-3 line job description snippet",
      "apply_link": "A realistic URL format like https://www.linkedin.com/jobs/view/123456 or https://www.naukri.com/job/123456 or https://company.com/careers/job-id",
      "experience_level": "Entry Level" or "Mid Senior Level" or "Director" (if available),
      "salary_range": "Salary range if available (e.g., ₹5,00,000 - ₹10,00,000)",
      "industry": "Industry name if available",
      "posted_date": "Date or 'X days ago' if available"
    }
  ]
}

IMPORTANT REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no extra text
2. Generate at least 15-20 diverse job listings
3. Include jobs from different companies and industries
4. Make the jobs realistic and relevant to the search query
5. Use realistic company names (mix of well-known and smaller companies)
6. Include various locations, work types, and experience levels
7. Make sure job descriptions are detailed and relevant

Return the JSON response now:`;

    try {
      const content = await generateGeminiText(prompt);

      // Parse JSON response - handle markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }

      // Try to extract JSON if there's extra text
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }

      const parsedData = JSON.parse(jsonContent);
      const jobs: JobResult[] = parsedData.jobs || [];

      // Ensure backward compatibility - map new fields to old ones
      const mappedJobs = jobs.map(job => ({
        ...job,
        link: job.apply_link || job.link,
        snippet: job.description || job.snippet,
        displayLink: job.company || job.displayLink,
      }));

      console.log(`[JobSearch] Found ${mappedJobs.length} jobs for query: ${query}`);

      return {
        jobs: mappedJobs,
        totalResults: mappedJobs.length,
      };
    } catch (error) {
      console.error('Error searching jobs with Gemini:', error);
      // Return some default jobs if API fails
      const defaultJobs: JobResult[] = [
        {
          title: `${params.field} - ${params.location}`,
          company: 'Tech Company',
          location: params.location,
          type: params.jobType || 'Full Time',
          work_type: params.workType || 'On-site',
          description: `Looking for ${params.field} in ${params.location}. Apply now!`,
          apply_link: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(params.field)}&location=${encodeURIComponent(params.location)}`,
          experience_level: params.experienceLevel || 'Entry Level',
          salary_range: 'Competitive',
          industry: 'Technology',
          posted_date: 'Recently',
          link: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(params.field)}&location=${encodeURIComponent(params.location)}`,
          snippet: `Looking for ${params.field} in ${params.location}. Apply now!`,
        }
      ];

      return {
        jobs: defaultJobs,
        totalResults: defaultJobs.length,
      };
    }
  } catch (error) {
    console.error('Error in searchJobs function:', error);
    // Return empty jobs array if everything fails
    return {
      jobs: [],
      totalResults: 0,
    };
  }
}

// Helper function to extract company name from job
export function extractCompanyName(job: JobResult): string {
  // Use the company field if available (from OpenRouter)
  if (job.company) {
    return job.company;
  }

  // Fallback to extracting from displayLink or link
  if (job.displayLink) {
    const domain = job.displayLink;
    const company = domain
      .replace('www.', '')
      .replace('.com', '')
      .replace('.in', '')
      .replace('.co', '')
      .split('.')[0];
    return company.charAt(0).toUpperCase() + company.slice(1);
  }

  if (job.link) {
    try {
      const url = new URL(job.link);
      const domain = url.hostname;
      const company = domain
        .replace('www.', '')
        .replace('.com', '')
        .replace('.in', '')
        .replace('.co', '')
        .split('.')[0];
      return company.charAt(0).toUpperCase() + company.slice(1);
    } catch {
      return 'Company';
    }
  }

  return 'Company';
}

// Helper function to extract job type
export function extractJobType(job: JobResult, params: JobSearchParams): string {
  // Use the type field if available (from OpenRouter)
  if (job.type) {
    return job.type;
  }
  return params.jobType || 'Full Time';
}

// Helper function to determine work type
export function extractWorkType(job: JobResult, params: JobSearchParams): string {
  // Use the work_type field if available (from OpenRouter)
  if (job.work_type) {
    return job.work_type;
  }

  // Fallback to extracting from text
  const text = ((job.title || '') + ' ' + (job.snippet || '') + ' ' + (job.description || '')).toLowerCase();

  if (text.includes('remote') || text.includes('work from home')) {
    return 'Remote';
  }
  if (text.includes('hybrid')) {
    return 'Hybrid';
  }
  return params.workType || 'On-site';
}
