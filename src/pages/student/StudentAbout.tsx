import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Linkedin } from 'lucide-react';

export default function StudentAbout() {
  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* About This Project Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              About SkillHive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                SkillHive is an AI-powered Adaptive Learning Ecosystem that evolves with you. Unlike traditional platforms, it treats every student as unique, analyzing strengths, weaknesses, and learning patterns in real-time to create a truly personalized education path.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Beyond just quizzes, we integrate a complete suite of productivity and career tools. From distraction-free studying with our browser extension to intelligent resume analysis and job search assistance, SkillHive bridges the gap between academic mastery and professional readiness.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're mastering complex engineering topics via smart video recommendations or organizing your day with our synced timetable, SkillHive provides the clarity, precision, and intelligence needed to excel in today's competitive landscape.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Key Capabilities Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              Key Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid md:grid-cols-2 gap-4 list-none space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">Personalized analytics that identify and strengthen weak areas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">Curated video recommendations for efficient concept mastery</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">Automated study notes to streamline revision</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">Focused learning environment with distraction blocking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">Seamless organization with synchronized daily goals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">Career-readiness tools including resume analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">Comprehensive student tracking for mentors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">24/7 Academic support via context-aware AI</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Developed By Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              Developed By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Developer 1: Anurag Dey */}
              <Card className="bg-white/80 dark:bg-card border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">1. Anurag Dey</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <a
                      href="https://github.com/anuragcode-16"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      anuragcode-16
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href="https://www.linkedin.com/in/anurag-dey-67533a304/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      LinkedIn
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Developer 2: Tiyasha Paul */}
              <Card className="bg-white/80 dark:bg-card border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">2. Tiyasha Paul</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <a
                      href="https://github.com/tiyasha-paul"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      tiyasha-paul
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href="https://www.linkedin.com/in/tiyasha-p-7319b6253/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      LinkedIn
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Developer 3: Ojsweenee Saha */}
              <Card className="bg-white/80 dark:bg-card border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">3. Ojsweenee Saha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <a
                      href="https://github.com/ojsweenee"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      ojsweenee
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href="https://github.com/ojsweenee"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      LinkedIn
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

