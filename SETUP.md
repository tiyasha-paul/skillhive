# SkillHive Setup & Installation Guide

This guide will help you set up and run the complete SkillHive platform, including the frontend, AI services, and the podcast audio server.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js**: v18 or higher ([Download](https://nodejs.org/))
2. **Git**: ([Download](https://git-scm.com/))
3. **Supabase Account**: For authentication and database ([Sign up](https://supabase.com/))
4. **yt-dlp**: Required for the Podcast/Audio feature.
   - **Windows**: `winget install yt-dlp` OR download `.exe` from [GitHub](https://github.com/yt-dlp/yt-dlp/releases) and add to PATH.
   - **Mac**: `brew install yt-dlp`
   - **Linux**: `sudo apt install yt-dlp` or `pip install yt-dlp`

## Installation Steps

### 1. Clone the Repository
```bash
git clone <YOUR_REPOSITORY_URL>
cd ml-kolkata
```

### 2. Install Project Dependencies
```bash
npm install
```
*This installs all required packages including React, Vite, and PDF.js.*

### 3. Configure Environment Variables
Create a file named `.env` in the root directory and add the following keys. 

> **Important**: Never commit this file to Git.

```env
# ------------------------------
# Supabase Configuration (Required for Auth & Data)
# ------------------------------
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# ------------------------------
# AI Services (Required for Resume Analysis & Quizzes)
# ------------------------------
# Get key from: https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your_gemini_api_key

# ------------------------------
# Optional Integrations
# ------------------------------
# YouTube Data API (For tailored video recommendations)
VITE_YOUTUBE_API_KEY=your_youtube_api_key

# OpenRouter (For legacy Chatbot if enabled)
VITE_OPENROUTER_API_KEY=your_openrouter_key

# JSearch API (For Real-Time Job Listings)
# Subscribe to Basic Plan (Free) at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
VITE_JSEARCH_API_KEY=your_rapidapi_key
```

### 4. Set Up Supabase Database
1. Go to your [Supabase Dashboard](https://app.supabase.com/).
2. Navigate to **SQL Editor**.
3. Run the migration scripts found in the `supabase/migrations/` folder of this project (in order).
   - This sets up the `profiles`, `timetable_sessions`, and other required tables.
4. Go to **Authentication > Settings** and ensure "Email" provider is enabled.
5. Add `http://localhost:8080` (or your local port) to the **Redirect URLs**.

---

## Running the Application

SkillHive consists of two parts running simultaneously:
1. **Frontend**: The React application.
2. **Audio Server**: The backend service for converting YouTube videos to audio podcasts.

### Option A: Run Everything (Recommended)
We have a convenient script to run both at once:

```bash
npm run dev:full
```
*This will start the Audio Server on port 3001 and the Frontend on port 8080.*

### Option B: Run Separately
If you prefer separate terminals:

**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Terminal 2 (Audio Server):**
```bash
npm run server:audio
```

---

## Verification

1. **Frontend**: Open `http://localhost:8080` (or your local port).
2. **Login**: Create a student account and log in.
3. **Resume Analysis**: Go to **Jobs**, upload a PDF resume. It should extract text and show recommendations.
4. **Podcasts**: Go to **Podcasts**, paste a YouTube link (e.g., a TED Talk). Click convert.
   - *If `yt-dlp` is installed correctly, it should start playing audio.*
5. **Timetable**: Check the Timetable page to see the calendar view.

## Troubleshooting

- **Audio not playing?**
  - Check if `yt-dlp` is installed: Run `yt-dlp --version` in your terminal.
  - Check if Audio Server is running (Terminal should show "Server running on port 3001").

- **Resume Upload failing?**
  - Ensure `VITE_GEMINI_API_KEY` is set in `.env`.
  - Check browser console for errors.

- **"Vite" command not found?**
  - Run `npm install` again to ensure dev dependencies are installed.

---

**Happy Learning with SkillHive!**
