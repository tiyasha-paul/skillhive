import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Zap, Target, Map, ChevronRight } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === 'student') {
        navigate('/student/dashboard');
      } else if (userRole === 'mentor') {
        navigate('/mentor/dashboard');
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0f1e] selection:bg-primary/20 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-700/50 dark:border-white/10 bg-[#1a1f2e]/70 dark:bg-slate-800/80 text-white backdrop-blur-xl shadow-md transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <GraduationCap className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SkillHive</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="hidden md:flex text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white"
              onClick={() => navigate('/student/login')}
            >
              Log in
            </Button>
            <Button
              className="text-sm font-bold rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-md"
              onClick={() => navigate('/student/signup')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center overflow-hidden bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-white transition-colors duration-300">
          {/* Ambient Glows */}
          <div className="absolute top-[10%] left-[-5%] w-[40rem] h-[40rem] bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[-5%] w-[40rem] h-[40rem] bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" />

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-6 animate-fade-in transition-colors">
                <GraduationCap size={14} />
                <span>The Complete Student Ecosystem</span>
              </div>

              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-8 animate-fade-in leading-[1.1]">
                Master Your Studies <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-500 transition-all">Launch Your Career</span>
              </h2>

              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in [animation-delay:0.2s] transition-colors">
                From <strong>distraction-free learning</strong> and <strong>smart practice</strong> to <strong>AI resume analysis</strong> and <strong>real-time job matching</strong>, SkillHive powers every step of your journey.
              </p>

              <div className="flex justify-center items-center animate-fade-in [animation-delay:0.4s]">
                <Button
                  size="lg"
                  className="rounded-full px-10 h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.2)] dark:shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all group border-none text-white"
                  onClick={() => navigate('/student/signup')}
                >
                  Start Your Journey
                  <ChevronRight size={24} className="ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose SkillHive Section */}
        <section id="features" className="py-20 bg-white dark:bg-[#070b14] relative overflow-hidden text-slate-900 dark:text-white border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
          <div className="absolute inset-0 opacity-[0.01] dark:opacity-[0.02] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] -z-10" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <h3 className="text-4xl md:text-5xl font-bold mb-6">Why Choose SkillHive?</h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed transition-colors">
                Everything you need to succeed in university and beyond, integrated into one intelligent platform.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              <FeatureCard
                icon={Zap}
                title="Distraction-Free Learning"
                subtitle="Smart Video Filters"
                description="Our AI blocks non-educational content, giving you a clean, focused environment to watch curated lectures and tutorials."
              />
              <FeatureCard
                icon={Target}
                title="Smart Practice"
                subtitle="Identify & Fix Weaknesses"
                description="Take quizzes to detect weak spots, track your accuracy, and receive instant study recommendations to improve."
              />
              <FeatureCard
                icon={Map}
                title="Career Launchpad"
                subtitle="Resume AI & Job Search"
                description="Find real-time jobs and use our AI to analyze your resume against them, getting match scores and actionable feedback."
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
