import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChatbotWidget } from "./components/ChatbotWidget";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentSignup from "./pages/student/StudentSignup";
import StudentLogin from "./pages/student/StudentLogin";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentAbout from "./pages/student/StudentAbout";
import StudentLearning from "./pages/student/StudentLearning";
import StudentCompetitiveExams from "./pages/student/StudentCompetitiveExams";
import StudentStudyNotes from "./pages/student/StudentStudyNotes";
import StudentPractice from "./pages/student/StudentPractice";
import StudentPodcasts from "./pages/student/StudentPodcasts";
import StudentJobs from "./pages/student/StudentJobs";
import StudentTimetable from "./pages/student/StudentTimetable";
import StudentProfile from "./pages/student/StudentProfile";
import StudentSettings from "./pages/student/StudentSettings";
import StudentExtension from "./pages/student/StudentExtension";

// Mentor Pages
import MentorSignup from "./pages/mentor/MentorSignup";
import MentorLogin from "./pages/mentor/MentorLogin";
import MentorDashboard from "./pages/mentor/MentorDashboard";
import MentorStudents from "./pages/mentor/MentorStudents";
import StudentDetailReport from "./pages/mentor/StudentDetailReport";

import { ThemeProvider } from "./components/theme-provider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <>
              <ChatbotWidget />
              <Routes>
                <Route path="/" element={<Index />} />

                {/* Student Routes */}
                <Route path="/student/signup" element={<StudentSignup />} />
                <Route path="/student/login" element={<StudentLogin />} />
                <Route
                  path="/student/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/about"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentAbout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/learning"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentLearning />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/competitive-exams"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentCompetitiveExams />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/study-notes"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentStudyNotes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/practice"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentPractice />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/podcasts"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentPodcasts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/extension"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentExtension />
                    </ProtectedRoute>
                  }
                />
                {/* Make jobs public so navbar click works even when not signed in */}
                <Route path="/student/jobs" element={<StudentJobs />} />
                <Route
                  path="/student/timetable"
                  element={
                    <ProtectedRoute allowedRoles={["student"]}>
                      <StudentTimetable />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute allowedRoles={["student", "mentor"]}>
                      <StudentProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/settings"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'mentor']}>
                      <StudentSettings />
                    </ProtectedRoute>
                  }
                />

                {/* Mentor Routes */}
                <Route path="/mentor/signup" element={<MentorSignup />} />
                <Route path="/mentor/login" element={<MentorLogin />} />
                <Route
                  path="/mentor/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['mentor']}>
                      <MentorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mentor/students"
                  element={
                    <ProtectedRoute allowedRoles={['mentor']}>
                      <MentorStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mentor/students/:studentId"
                  element={
                    <ProtectedRoute allowedRoles={['mentor']}>
                      <StudentDetailReport />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
