import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, Zap, Target, Map, ChevronRight, BookOpen, Pencil, Lightbulb, Scroll, Users,
  Laptop, Coffee, Brain, Star, Sparkles, Rocket, Code, Palette, Calculator, Microscope,
  Globe, Atom, Dna, Briefcase, Award, Music, Gamepad
} from "lucide-react";
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
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 text-slate-900 dark:text-white backdrop-blur-xl shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <GraduationCap className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">SkillHive</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="hidden md:flex text-sm font-semibold text-slate-700 dark:text-white/90 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
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
          {/* Ambient Glows - Reduced opacity to let icons pop */}
          <div className="absolute top-[10%] left-[-5%] w-[40rem] h-[40rem] bg-blue-600/5 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[-5%] w-[40rem] h-[40rem] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />

          {/* Super Dense, Vibrant Floating Doodle Icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Top Area */}
            <GraduationCap className="absolute top-[2%] left-[2%] w-16 h-16 text-blue-600/40 dark:text-blue-400/20 -rotate-12 animate-bounce [animation-duration:4s]" />
            <BookOpen className="absolute top-[8%] left-[18%] w-10 h-10 text-indigo-600/40 dark:text-indigo-400/20 rotate-6 animate-pulse [animation-duration:3s]" />
            <Pencil className="absolute top-[4%] left-[35%] w-8 h-8 text-purple-600/40 dark:text-purple-400/20 -rotate-45 animate-bounce [animation-duration:5s]" />
            <Atom className="absolute top-[3%] left-[55%] w-12 h-12 text-teal-600/40 dark:text-teal-400/20 animate-spin [animation-duration:15s]" />
            <Brain className="absolute top-[6%] right-[25%] w-14 h-14 text-rose-600/40 dark:text-rose-400/20 rotate-12 animate-bounce [animation-duration:6s]" />
            <Lightbulb className="absolute top-[2%] right-[10%] w-12 h-12 text-yellow-600/40 dark:text-yellow-400/20 -rotate-6 animate-pulse [animation-duration:4s]" />
            <Zap className="absolute top-[12%] right-[2%] w-8 h-8 text-amber-600/40 dark:text-amber-400/20 rotate-12 animate-bounce [animation-duration:3.5s]" />

            {/* Upper Middle Area */}
            <Scroll className="absolute top-[20%] left-[5%] w-10 h-10 text-emerald-600/40 dark:text-emerald-400/20 -rotate-6 animate-bounce [animation-duration:5.5s]" />
            <Code className="absolute top-[18%] left-[25%] w-8 h-8 text-cyan-600/40 dark:text-cyan-400/20 rotate-12 animate-pulse [animation-duration:2.5s]" />
            <Globe className="absolute top-[15%] left-[45%] w-10 h-10 text-blue-600/40 dark:text-blue-400/20 -rotate-12 animate-spin [animation-duration:20s]" />
            <Target className="absolute top-[18%] right-[35%] w-10 h-10 text-red-600/40 dark:text-red-400/20 rotate-45 animate-bounce [animation-duration:4.5s]" />
            <Rocket className="absolute top-[22%] right-[15%] w-12 h-12 text-orange-600/40 dark:text-orange-400/20 -rotate-6 animate-bounce [animation-duration:6.5s]" />
            <Map className="absolute top-[25%] right-[5%] w-8 h-8 text-green-600/40 dark:text-green-400/20 rotate-12 animate-pulse [animation-duration:5s]" />

            {/* Middle Area */}
            <Users className="absolute top-[35%] left-[2%] w-12 h-12 text-pink-600/40 dark:text-pink-400/20 rotate-6 animate-bounce [animation-duration:7s]" />
            <Music className="absolute top-[32%] left-[15%] w-8 h-8 text-violet-600/40 dark:text-violet-400/20 -rotate-12 animate-bounce [animation-duration:4s]" />
            <Gamepad className="absolute top-[38%] left-[28%] w-10 h-10 text-lime-600/40 dark:text-lime-400/20 rotate-12 animate-pulse [animation-duration:3s]" />
            <Palette className="absolute top-[34%] right-[28%] w-10 h-10 text-fuchsia-600/40 dark:text-fuchsia-400/20 -rotate-6 animate-bounce [animation-duration:5s]" />
            <Microscope className="absolute top-[38%] right-[10%] w-12 h-12 text-indigo-600/40 dark:text-indigo-400/20 rotate-12 animate-bounce [animation-duration:6s]" />
            <Dna className="absolute top-[30%] right-[45%] w-8 h-8 text-sky-600/40 dark:text-sky-400/20 -rotate-45 animate-pulse [animation-duration:4s]" />

            {/* Lower Middle Area */}
            <Laptop className="absolute bottom-[40%] left-[8%] w-10 h-10 text-sky-600/40 dark:text-sky-400/20 -rotate-6 animate-bounce [animation-duration:5.5s]" />
            <Calculator className="absolute bottom-[35%] left-[22%] w-8 h-8 text-teal-600/40 dark:text-teal-400/20 rotate-12 animate-pulse [animation-duration:3.5s]" />
            <Coffee className="absolute bottom-[38%] left-[38%] w-10 h-10 text-amber-700/40 dark:text-amber-500/20 animate-bounce [animation-duration:4.5s]" />
            <Briefcase className="absolute bottom-[32%] right-[35%] w-10 h-10 text-slate-600/40 dark:text-slate-400/20 rotate-12 animate-bounce [animation-duration:6.5s]" />
            <Award className="absolute bottom-[36%] right-[18%] w-12 h-12 text-yellow-600/40 dark:text-yellow-400/20 -rotate-6 animate-pulse [animation-duration:5s]" />
            <Star className="absolute bottom-[42%] right-[5%] w-8 h-8 text-purple-600/40 dark:text-purple-400/20 animate-spin [animation-duration:8s]" />

            {/* Bottom Area */}
            <GraduationCap className="absolute bottom-[15%] left-[2%] w-14 h-14 text-blue-600/40 dark:text-blue-400/20 rotate-12 animate-bounce [animation-duration:7.5s]" />
            <BookOpen className="absolute bottom-[8%] left-[15%] w-10 h-10 text-indigo-600/40 dark:text-indigo-400/20 -rotate-6 animate-pulse [animation-duration:4.5s]" />
            <Pencil className="absolute bottom-[18%] left-[30%] w-8 h-8 text-fuchsia-600/40 dark:text-fuchsia-400/20 rotate-45 animate-bounce [animation-duration:5.5s]" />
            <Atom className="absolute bottom-[5%] left-[40%] w-12 h-12 text-cyan-600/40 dark:text-cyan-400/20 animate-spin [animation-duration:12s]" />
            <Target className="absolute bottom-[12%] right-[40%] w-10 h-10 text-red-600/40 dark:text-red-400/20 rotate-12 animate-bounce [animation-duration:6s]" />
            <Lightbulb className="absolute bottom-[5%] right-[25%] w-12 h-12 text-yellow-600/40 dark:text-yellow-400/20 rotate-6 animate-pulse [animation-duration:3s]" />
            <Sparkles className="absolute bottom-[15%] right-[8%] w-10 h-10 text-purple-600/40 dark:text-purple-400/20 animate-pulse" />

            {/* Filler Stars and Dots for Density */}
            <Star className="absolute top-[12%] left-[30%] w-3 h-3 text-slate-400/50 animate-pulse [animation-duration:2s]" />
            <Star className="absolute top-[8%] right-[45%] w-4 h-4 text-slate-400/50 animate-pulse [animation-duration:3s]" />
            <Star className="absolute bottom-[25%] left-[15%] w-3 h-3 text-slate-400/50 animate-pulse [animation-duration:4s]" />
            <Star className="absolute bottom-[20%] right-[30%] w-4 h-4 text-slate-400/50 animate-pulse [animation-duration:2.5s]" />
            <div className="absolute top-[45%] left-[5%] w-1 h-1 bg-slate-400/50 rounded-full animate-pulse" />
            <div className="absolute top-[50%] right-[5%] w-2 h-2 bg-slate-400/50 rounded-full animate-pulse" />
            <div className="absolute bottom-[30%] left-[50%] w-1 h-1 bg-slate-400/50 rounded-full animate-pulse" />
          </div>

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
