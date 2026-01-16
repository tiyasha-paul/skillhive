# SkillHive: AI-Powered Adaptive Learning & Career Assistant

SkillHive is an intelligent learning platform that adapts to each student's pace, identifies learning gaps, and provides personalized recommendations using AI. It combines dynamic quiz generation, adaptive practice, explainable resume analysis, and a focused learning environment.

![SkillHive Landing Page](public/landing-page-preview.png)

## Key Features

### Adaptive Learning
- **Distraction-Free Learning Features**: Smart Video Filter that automatically blocks non-educational content using AI, ensuring focused study sessions.
- **Dynamic Quizzes**: AI-generated questions (MCQs) powered by Google Gemini, tailored to specific concepts.
- **Weak Area Detection**: Automatically identifies struggle areas and tags concepts for review.
- **Personalized Recommendations**: YouTube video suggestions based on performance and learning gaps.

### Career Assistance
- **Smart Resume Analysis**: Upload a resume (PDF) or fill out a profile to get instant AI feedback on strengths, improvements, and match scores.
- **Real-Time Job Matching**: Integration with JSearch API to fetch live job listings from LinkedIn, Indeed, and more.
- **AI Gap Analysis**: Detailed reasoning for why a job is a good fit and what skills might be missing.

### Learning Tools
- **AI Study Coach**: A built-in chatbot that provides instant study help, answers questions, and explains complex topics using Gemini.
- **SkillHive Browser Extension**: A Chrome extension that integrates with your browser to block distractions and keep you focused on your study goals.
- **Podcast Mode**: Convert educational YouTube videos into audio-only podcasts for on-the-go learning.
- **Personal Knowledge Base**: Create and organize study notes, including AI-generated summaries from videos and custom flashcards.
- **Interactive Timetable**: Manage classes and study sessions.
- **Progress Tracking**: Track daily activity streaks and visualize learning habits.

### Architecture
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Shadcn UI.
- **Backend/Services**: 
  - **Audio Server**: Node.js Express server for YouTube audio extraction.
  - **AI Integration**: Google Gemini (via API) for reasoning and content generation.
  - **Job Data**: JSearch API (RapidAPI) for real-time job listings.
  - **Database**: Supabase for user profiles, progress tracking, and authentication.

---

## Getting Started

**For complete installation and usage instructions, please read [SETUP.md](./SETUP.md).**

The setup guide covers:
- Prerequisites (Node.js, Supabase, yt-dlp).
- detailed Environment Variable configuration.
- How to run the Development Server and Audio Backend.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
