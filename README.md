# 🎙️ AI Technical Mock Interviewer

An AI-powered technical mock interview platform that simulates real technical interview rounds with continuous voice transcription, instant AI grading, delivery confidence analysis, and **revealed perfect model answers**.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Groq Whisper**, **Google Gemini**, and **Supabase**.

---

## ✨ Features

- 🎙️ **Studio-Grade Voice Transcription**:
  - Powered by **Groq Whisper Large v3 Turbo** (~500ms lightning transcription).
  - Seamless fallbacks to **Gemini Multimodal Audio** and browser-native **Web Speech API**.
  - Built-in silence hallucination filter to ensure pristine transcripts.
- 🎛️ **Hardware Microphone Diagnostics**:
  - Acoustic echo cancellation and auto-gain control.
  - **Live Audio Input Visualizer**: Real-time equalizer meter confirming speech detection.
  - **Microphone Device Picker**: Choose between internal, headset, or USB microphones.
  - **🎧 Audio Playback Bar**: Listen to your recording immediately to verify audio clarity.
- 🎯 **10 Professional Tracks (100 Core Questions)**:
  - **Frontend Developer** (10 questions)
  - **Backend Developer** (10 questions)
  - **Fullstack Engineer** (10 questions)
  - **Python Developer** (10 questions)
  - **Java Developer** (10 questions)
  - **DevOps & Cloud Engineer** (10 questions)
  - **Data Analyst & SQL** (10 questions)
  - **QA & Software Tester** (10 questions)
  - **Mobile App Developer** (10 questions)
  - **Cybersecurity Fundamentals** (10 questions)
- 🏆 **Revealed Perfect Model Answer**:
  - Instant reveal of the **Gold Standard** expert response upon submission.
  - Side-by-side comparison drawer with your answer.
  - One-click **"Copy Perfect Answer"** button.
- 📊 **Multidimensional AI Scoring (Google Gemini)**:
  - **Technical Accuracy Score (0–100)**: Evaluates conceptual correctness and depth.
  - **Confidence & Delivery Score (0–100)**: Detects verbal pauses, hesitations, and filler words (*"um"*, *"like"*, *"you know"*).
  - **Constructive Feedback**: Actionable recommendations on communication and missing concepts.
- 📈 **Persistent Analytics Dashboard**:
  - Full interview history stored in **Supabase** with local storage resilience.
  - Track-by-track filtering and performance trend trackers.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (Dark Glassmorphism UI) |
| **Speech-to-Text** | Groq Whisper Large v3 Turbo / Web Speech API |
| **LLM & Evaluation**| Google Gemini (JSON Structured Mode) |
| **Database** | Supabase (PostgreSQL) |
| **Audio Processing**| Web Audio API (`AudioContext`, `AnalyserNode`) & `MediaRecorder` |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Rahulkr015451/Ai-mock-interview-project.git
cd Ai-mock-interview-project
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory (refer to `.env.example`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API Key (Get at https://aistudio.google.com/apikey)
GEMINI_API_KEY=your-gemini-api-key

# Groq API Key (Get free key at https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_groq_api_key
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗂️ Project Structure

```
├── app/
│   ├── api/
│   │   ├── interview/
│   │   │   ├── evaluate/
│   │   │   │   └── route.ts        # Gemini evaluation endpoint (JSON mode)
│   │   │   └── transcribe/
│   │   │       └── route.ts        # Whisper (Groq) & Gemini audio transcription
│   ├── dashboard/
│   │   └── page.tsx                # Performance analytics dashboard
│   ├── globals.css                 # Global styles and Tailwind tokens
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Main Interview Room page
├── components/
│   └── InterviewRoom.tsx           # Interactive room: mic recorder, visualizer, questions & answers
├── lib/
│   └── supabaseClient.ts           # Supabase client initialization
├── .env.example                    # Environment variable template
└── README.md                       # Project documentation
```

---

## 📊 Database Schema (Supabase)

If setting up your own Supabase project, create the following tables:

```sql
-- Sessions table
CREATE TABLE interview_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responses table
CREATE TABLE interview_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  user_answer_transcript TEXT NOT NULL,
  technical_accuracy_score INT NOT NULL,
  confidence_score INT NOT NULL,
  constructive_feedback TEXT NOT NULL,
  suggested_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
