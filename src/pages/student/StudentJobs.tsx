import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { searchJobs, type JobResult, extractCompanyName, extractJobType, extractWorkType, type JobSearchParams } from '@/services/jobSearch';
import { recordActivity } from '@/services/activityTracker';
import { Loader2, Search, MapPin, Briefcase, Clock, ExternalLink, Bookmark, BookmarkCheck, FileText, Upload, Star, TrendingUp, ArrowLeft, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { JobApplicationForm, type JobApplicationData } from '@/components/JobApplicationForm';
import { analyzeResumeAndGetJobs, type ResumeAnalysisResult, type JobRecommendation } from '@/services/resumeAnalysis';
import { Progress } from '@/components/ui/progress';

interface SavedJob extends JobResult {
  savedAt: Date;
}

export default function StudentJobs() {
  const [showForm, setShowForm] = useState(false); // Don't show form by default, show tabs first
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [applicationData, setApplicationData] = useState<JobApplicationData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [jobRecommendations, setJobRecommendations] = useState<JobRecommendation[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const [searchParams, setSearchParams] = useState<JobSearchParams>({
    field: '',
    location: '',
    jobType: '',
    experienceLevel: '',
    workType: '',
  });

  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);

  // Load saved jobs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedJobs');
    if (saved) {
      setSavedJobs(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async () => {
    if (!searchParams.field || !searchParams.location) {
      alert('Please fill in Field and Location');
      return;
    }

    setLoading(true);
    setCurrentPage(1);

    try {
      const result = await searchJobs(searchParams, 1);
      setJobs(result.jobs);
      setTotalResults(result.totalResults);
    } catch (error) {
      console.error('Error searching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    const nextPage = currentPage + 1;
    setLoading(true);

    try {
      const result = await searchJobs(searchParams, (nextPage - 1) * 10 + 1);
      setJobs([...jobs, ...result.jobs]);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = (job: JobResult) => {
    const savedJob: SavedJob = {
      ...job,
      savedAt: new Date(),
    };

    const updated = [...savedJobs, savedJob];
    setSavedJobs(updated);
    localStorage.setItem('savedJobs', JSON.stringify(updated));

    // Record activity
    recordActivity('job_saved', { jobTitle: job.title, company: extractCompanyName(job) });
    window.dispatchEvent(new CustomEvent('activity-updated'));
  };

  const handleUnsaveJob = (jobLink: string) => {
    const updated = savedJobs.filter(j => {
      const link = j.apply_link || j.link;
      return link !== jobLink;
    });
    setSavedJobs(updated);
    localStorage.setItem('savedJobs', JSON.stringify(updated));
  };

  const isJobSaved = (jobLink: string) => {
    return savedJobs.some(j => {
      const link = j.apply_link || j.link;
      return link === jobLink;
    });
  };

  const handleFormSubmit = async (data: JobApplicationData) => {
    setAnalyzing(true);
    setApplicationData(data);

    try {
      // Build resume text from form data
      // Since client-side PDF text extraction is disabled/removed, we construct the text
      // from the structured form fields to ensure the analysis service has content to work with.
      let resumeText = data.resumeText || '';

      if (!resumeText) {
        resumeText = `
Name: ${data.fullName}
Email: ${data.email}
Phone: ${data.phone}
Location: ${data.location}
${data.summary ? `Summary: ${data.summary}` : ''}

Experience:
${data.experience.map(exp => `${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate})\n${exp.description}`).join('\n\n')}

Education:
${data.education.map(edu => `${edu.degree} in ${edu.field} from ${edu.institution} (${edu.startYear} - ${edu.endYear})`).join('\n')}

Skills: ${data.skills.join(', ')}

Certifications:
${data.certifications.map(cert => `${cert.name} from ${cert.issuer} (${cert.date})`).join('\n')}

Languages: ${data.languages.join(', ')}
        `.trim();
      }

      // Analyze resume and get job recommendations
      const result = await analyzeResumeAndGetJobs(
        data.resumeFile,
        resumeText,
        data.location
      );

      setAnalysisResult(result);
      setJobRecommendations(result.jobRecommendations);
      setFormSubmitted(true);
      setShowForm(false);

      // Record activity
      recordActivity('resume_analyzed', {
        hasResumeFile: !!data.resumeFile,
        skillsCount: data.skills.length,
        experienceCount: data.experience.length
      });
      window.dispatchEvent(new CustomEvent('activity-updated'));
    } catch (error) {
      console.error('Error analyzing resume:', error);
      alert(`Failed to analyze resume: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const JobCard = ({ job }: { job: JobResult }) => {
    const companyName = extractCompanyName(job);
    const jobType = extractJobType(job, searchParams);
    const workType = extractWorkType(job, searchParams);
    const applyLink = job.apply_link || job.link || '#';
    const saved = isJobSaved(applyLink);
    const jobLocation = job.location || searchParams.location;
    const jobDescription = job.description || job.snippet || 'No description available';
    const experienceLevel = job.experience_level || searchParams.experienceLevel;

    return (
      <Card className="hover:shadow-lg transition-all hover:scale-[1.02]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{job.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {companyName}
                </Badge>
                {job.industry && (
                  <Badge variant="outline">{job.industry}</Badge>
                )}
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {jobLocation}
                </Badge>
                <Badge variant="outline">{jobType}</Badge>
                <Badge variant={workType === 'Remote' ? 'default' : 'outline'}>
                  {workType}
                </Badge>
                {experienceLevel && (
                  <Badge variant="outline">{experienceLevel}</Badge>
                )}
                {job.salary_range && (
                  <Badge variant="secondary">{job.salary_range}</Badge>
                )}
              </div>
              {job.posted_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  {job.posted_date}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => saved ? handleUnsaveJob(applyLink) : handleSaveJob(job)}
            >
              {saved ? (
                <BookmarkCheck className="h-5 w-5 text-primary" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {jobDescription}
          </p>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 text-base py-6 hover:scale-105 transition-transform"
                  onClick={() => setSelectedJob(job)}
                >
                  View Details
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{job.title}</DialogTitle>
                  <DialogDescription>
                    {companyName} • {jobLocation}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Job Description</h4>
                    <p className="text-sm text-muted-foreground">{jobDescription}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{jobType}</Badge>
                    <Badge>{workType}</Badge>
                    {experienceLevel && (
                      <Badge>{experienceLevel}</Badge>
                    )}
                    {job.salary_range && (
                      <Badge variant="secondary">{job.salary_range}</Badge>
                    )}
                    {job.industry && (
                      <Badge variant="outline">{job.industry}</Badge>
                    )}
                  </div>
                  {job.posted_date && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Posted: {job.posted_date}
                    </div>
                  )}
                  <Button
                    className="w-full text-lg py-6 hover:scale-105 transition-transform"
                    onClick={() => window.open(applyLink, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Apply Now
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              className="flex-1 text-base py-6 hover:scale-105 transition-transform"
              onClick={() => window.open(applyLink, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Apply Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const location = useLocation();
  const navigate = useNavigate();

  const validTabs = useMemo(() => new Set(['search', 'saved', 'resume']), []);
  const initialHash = (location.hash || '').replace('#', '');
  const initialTab = validTabs.has(initialHash) ? (initialHash as 'search' | 'saved' | 'resume') : 'search';
  const [activeTab, setActiveTab] = useState<'search' | 'saved' | 'resume'>(initialTab);

  useEffect(() => {
    const h = (location.hash || '').replace('#', '');
    if (validTabs.has(h) && h !== activeTab) {
      setActiveTab(h as 'search' | 'saved' | 'resume');
    }
  }, [location.hash, activeTab, validTabs]);

  const handleTabChange = (value: string) => {
    if (!validTabs.has(value)) return;
    setActiveTab(value as 'search' | 'saved' | 'resume');
    // Update URL hash for shareable links
    navigate(`/student/jobs#${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {activeTab === 'search' && 'Job Search'}
            {activeTab === 'saved' && 'Saved Jobs'}
            {activeTab === 'resume' && 'Resume Analysis'}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === 'search' && 'Find your dream job with our comprehensive search tool'}
            {activeTab === 'saved' && 'View and manage your saved job opportunities'}
            {activeTab === 'resume' && (
              showForm
                ? 'Fill out your profile to get personalized job recommendations'
                : 'AI-powered job recommendations based on your resume'
            )}
          </p>
        </div>



        {/* Show Form - Only when user clicks to show it */}
        {showForm && !formSubmitted && activeTab === 'resume' && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Application Profile</CardTitle>
                  <CardDescription>
                    Complete your profile to get the best job recommendations. All fields are optional except Name, Email, and Phone.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Search
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <JobApplicationForm onSubmit={handleFormSubmit} loading={analyzing} />
            </CardContent>
          </Card>
        )}

        {/* Show Recommendations After Form Submission */}
        {formSubmitted && analysisResult && activeTab === 'resume' && (
          <div className="space-y-6 mb-6">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(true);
                setFormSubmitted(false);
                setAnalysisResult(null);
                setJobRecommendations([]);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>

            {/* Resume Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resume Analysis Summary</CardTitle>
                <CardDescription>AI-powered analysis of your resume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{analysisResult.summary}</p>
                </div>

                {analysisResult.strengths.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Strengths
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {analysisResult.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.improvements.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Areas for Improvement</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {analysisResult.improvements.map((improvement, idx) => (
                        <li key={idx}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Suggestions</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {analysisResult.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Top {jobRecommendations.length > 0 ? jobRecommendations.length : 'Job'} Recommendations
                </CardTitle>
                <CardDescription>
                  Jobs matched to your profile with AI-powered scoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyzing ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Analyzing resume and finding matching jobs...</p>
                    <p className="text-sm text-muted-foreground mt-2">This may take a minute</p>
                  </div>
                ) : jobRecommendations.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground">No job recommendations found yet.</p>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Try:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>Using the "Search Jobs" tab to find jobs manually</li>
                        <li>Adding more details to your profile (skills, experience)</li>
                        <li>Checking your location settings</li>
                      </ul>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setFormSubmitted(false);
                      }}
                    >
                      Go to Job Search
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobRecommendations.map((rec, index) => {
                      const job = rec.job;
                      const companyName = extractCompanyName(job);
                      const applyLink = job.apply_link || job.link || '#';

                      return (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <CardTitle className="text-lg">{job.title}</CardTitle>
                                  <Badge
                                    variant={rec.matchScore >= 80 ? "default" : rec.matchScore >= 60 ? "secondary" : "outline"}
                                    className="flex items-center gap-1"
                                  >
                                    <Star className="h-3 w-3" />
                                    {rec.matchScore}% Match
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {companyName}
                                  </Badge>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {job.location || 'Not specified'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="ml-2 shrink-0 h-8 w-8 p-0"
                                  onClick={() => isJobSaved(applyLink) ? handleUnsaveJob(applyLink) : handleSaveJob(job)}
                                >
                                  <Heart className={`h-5 w-5 ${isJobSaved(applyLink) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                                </Button>
                                <Button
                                  size="sm"
                                  className="ml-2 shrink-0"
                                  onClick={() => window.open(applyLink, '_blank', 'noopener,noreferrer')}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Apply Now
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Match Score</span>
                                <span className="text-xs font-semibold">{rec.matchScore}%</span>
                              </div>
                              <Progress value={rec.matchScore} className="h-2" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                              {rec.matchReason}
                            </p>
                            {rec.skillsMatch.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold mb-2">Matching Skills:</p>
                                <div className="flex flex-wrap gap-1">
                                  {rec.skillsMatch.map((skill, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {rec.missingSkills.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold mb-2 text-orange-600">Missing Skills:</p>
                                <div className="flex flex-wrap gap-1">
                                  {rec.missingSkills.map((skill, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs text-orange-600">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">


          {/* Search Tab */}
          <TabsContent value="search" className="space-y-6">
            {/* Search Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Search Filters</CardTitle>
                <CardDescription>Fill in the details to find relevant jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="field">Field / Job Role *</Label>
                    <Input
                      id="field"
                      placeholder="e.g., Software Developer"
                      value={searchParams.field}
                      onChange={(e) => setSearchParams({ ...searchParams, field: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Bengaluru"
                      value={searchParams.location}
                      onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type</Label>
                    <Select
                      value={searchParams.jobType}
                      onValueChange={(value) => setSearchParams({ ...searchParams, jobType: value })}
                    >
                      <SelectTrigger id="jobType">
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="Full Time">Full Time</SelectItem>
                        <SelectItem value="Part Time">Part Time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Temporary">Temporary</SelectItem>
                        <SelectItem value="Volunteer">Volunteer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience Level</Label>
                    <Select
                      value={searchParams.experienceLevel}
                      onValueChange={(value) => setSearchParams({ ...searchParams, experienceLevel: value })}
                    >
                      <SelectTrigger id="experience">
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                        <SelectItem value="Entry Level">Entry Level</SelectItem>
                        <SelectItem value="Associate">Associate</SelectItem>
                        <SelectItem value="Mid Senior Level">Mid Senior Level</SelectItem>
                        <SelectItem value="Director">Director</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workType">Work Type</Label>
                    <Select
                      value={searchParams.workType}
                      onValueChange={(value) => setSearchParams({ ...searchParams, workType: value })}
                    >
                      <SelectTrigger id="workType">
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="On-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Jobs
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Search Results */}
            {jobs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found {totalResults} jobs
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {jobs.map((job, index) => (
                    <JobCard key={index} job={job} />
                  ))}
                </div>
                {jobs.length < totalResults && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Jobs'
                    )}
                  </Button>
                )}
              </div>
            )}

            {jobs.length === 0 && !loading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Enter search criteria and click "Search Jobs" to find opportunities
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Saved Jobs Tab */}
          <TabsContent value="saved" className="space-y-4">
            {savedJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No saved jobs yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {savedJobs.map((job, index) => (
                  <JobCard key={index} job={job} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resume" className="space-y-6">
            {!showForm && !formSubmitted && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Fill out your profile to get AI-powered job recommendations based on your resume
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Start Application Form
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

