'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// ─── Web Speech API TypeScript definitions ───────────────────────────────────

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvaluationResult {
  technical_accuracy_score: number;
  confidence_score: number;
  constructive_feedback: string;
  suggested_answer: string;
}

type InputMode = 'webSpeech' | 'recording' | 'typing';
type SessionState = 'Idle' | 'Listening...' | 'Recording...' | 'Transcribing...' | 'Processing...';

// ─── 10 Roles × 10 Foundational / Basic Questions Bank ───────────────────────

const MOCK_QUESTIONS: Record<string, string[]> = {
  'Frontend Developer': [
    'What is the difference between let, const, and var in JavaScript?',
    'What is the CSS Box Model, and what are its main components?',
    'Explain the difference between == and === in JavaScript.',
    'What are semantic HTML elements, and why are they important for accessibility and SEO?',
    'What is the Document Object Model (DOM), and how does JavaScript manipulate it?',
    'What are React props and state, and what is the key difference between them?',
    'What is the purpose of the useEffect hook in React and when does it run?',
    'Explain the difference between synchronous and asynchronous code in JavaScript.',
    'What is responsive web design, and how do CSS media queries work?',
    'What is LocalStorage, and how does it differ from SessionStorage and cookies?',
  ],
  'Backend Developer': [
    'What is an API, and what does REST stand for?',
    'Explain the difference between HTTP GET and POST methods.',
    'What is the difference between a SQL (relational) database and a NoSQL database?',
    'What are common HTTP status codes like 200, 400, 404, and 500?',
    'What is an ORM (Object-Relational Mapping), and why do developers use it?',
    'Explain the concept of database indexing and why it is useful for performance.',
    'What is the difference between authentication and authorization?',
    'What is middleware in a backend framework like Express or Django?',
    'What are environment variables, and why should sensitive credentials never be hardcoded?',
    'What is a primary key and a foreign key in a relational database table?',
  ],
  'Fullstack Engineer': [
    'What happens in the browser from the moment you type a URL until the webpage displays?',
    'How does a frontend client communicate with a backend server in a typical web application?',
    'What is CORS (Cross-Origin Resource Sharing), and why do browsers enforce it?',
    'What is JSON, and why is it the standard format for exchanging web data?',
    'Explain what a CRUD application is and what its four operations stand for.',
    'What is the difference between client-side validation and server-side validation?',
    'What is Git, and what is the difference between git pull and git fetch?',
    'What is a Single Page Application (SPA), and how does it differ from a traditional multi-page website?',
    'Explain how user sessions and cookies work to keep a user logged in.',
    'What is web caching, and how does it improve overall application performance?',
  ],
  'Python Developer': [
    'What are the core differences between a list and a tuple in Python?',
    'What is a Python dictionary, and how do key-value lookups work?',
    'Explain the difference between mutable and immutable data types in Python.',
    'What is a function in Python, and how do *args and **kwargs work?',
    'What is a Python virtual environment (venv), and why should every project use one?',
    'Explain how error handling works using try, except, and finally blocks in Python.',
    'What are list comprehensions in Python, and can you give a simple example?',
    'What is the difference between the "is" keyword and the "==" operator in Python?',
    'What are Python modules and packages, and how do you import code across files?',
    'Explain the difference between local scope and global scope in Python functions.',
  ],
  'Java Developer': [
    'What are the four fundamental principles of Object-Oriented Programming (OOP) in Java?',
    'What is the difference between the JDK, JRE, and JVM in Java?',
    'What is the difference between the "==" operator and the ".equals()" method in Java?',
    'Explain the difference between an Array and an ArrayList in Java.',
    'What is method overloading versus method overriding in Java?',
    'What does the "static" keyword mean when applied to variables and methods?',
    'What is the purpose of the "final" keyword when applied to variables, methods, and classes?',
    'Explain how exception handling works using try-catch-finally in Java.',
    'What is an Interface in Java, and how does it differ from an Abstract Class?',
    'What is Garbage Collection in Java, and how does it manage computer memory automatically?',
  ],
  'DevOps & Cloud Engineer': [
    'What is DevOps, and what is the primary goal of a CI/CD pipeline?',
    'What is Docker, and what is the difference between a Docker image and a running container?',
    'What is cloud computing, and what are IaaS, PaaS, and SaaS?',
    'What is Git version control, and how does branching help collaborative software development?',
    'Explain what Infrastructure as Code (IaC) is and why tools like Terraform are used.',
    'What is a reverse proxy (such as NGINX), and what are its common benefits?',
    'What is the difference between horizontal scaling and vertical scaling of servers?',
    'What is Kubernetes at a high level, and what is a Kubernetes Pod?',
    'What is the purpose of application monitoring, health checks, and centralized logging?',
    'What is an SSL/TLS certificate, and why is HTTPS encryption mandatory for modern websites?',
  ],
  'Data Analyst & SQL': [
    'What is the difference between the WHERE clause and the HAVING clause in SQL?',
    'Explain the difference between an INNER JOIN and a LEFT JOIN in SQL.',
    'What are common SQL aggregate functions (like COUNT, SUM, AVG), and how is GROUP BY used?',
    'What is the purpose of the ORDER BY and LIMIT clauses in a SQL query?',
    'What is a NULL value in a database, and how do you check for it in SQL queries?',
    'Explain the difference between a primary key and a UNIQUE constraint.',
    'What is the difference between mean, median, and mode in descriptive statistics?',
    'What is data cleaning, and why is it the most critical step before performing analysis?',
    'What is the goal of data visualization, and when would you choose a bar chart over a line chart?',
    'What is a CSV file, and why is it one of the most widely used formats for tabular data?',
  ],
  'QA & Software Tester': [
    'What is the difference between manual testing and automated testing?',
    'What is the difference between functional testing and non-functional testing?',
    'Explain what regression testing is and when it should be executed in a release cycle.',
    'What is the difference between bug severity and bug priority?',
    'What are the essential components that make up a clear, actionable bug report?',
    'What is unit testing, and how does it differ from integration testing?',
    'What is boundary value analysis in test case design?',
    'What is smoke testing, and how does it differ from sanity testing?',
    'What is User Acceptance Testing (UAT), and who typically performs it?',
    'What is a test plan, and what are test cases in software quality assurance?',
  ],
  'Mobile App Developer': [
    'What is the difference between native mobile development and cross-platform mobile frameworks?',
    'What is the mobile application lifecycle (e.g. active, paused, background, terminated)?',
    'What is an APK file on Android or an IPA file on iOS?',
    'How do mobile apps store user data locally on a smartphone (e.g. SQLite, AsyncStorage)?',
    'How do mobile applications fetch remote data asynchronously from a backend API?',
    'What are mobile push notifications, and how do they reach a user device?',
    'What are mobile app permissions, and why must apps ask for user consent to access the camera or microphone?',
    'What are density-independent pixels (dp/pt), and why are they necessary across different screen sizes?',
    'How should a mobile application handle offline state when an internet connection is unavailable?',
    'What is state management in mobile apps, and why is it needed as an app grows in complexity?',
  ],
  'Cybersecurity Fundamentals': [
    'What is the CIA Triad (Confidentiality, Integrity, Availability) in information security?',
    'What is a phishing attack, and what are common signs that an email is malicious?',
    'Explain the difference between symmetric encryption and asymmetric encryption.',
    'What is Multi-Factor Authentication (MFA), and why is it superior to relying only on passwords?',
    'What is a firewall, and how does it protect a private network from unauthorized access?',
    'What is a SQL Injection (SQLi) vulnerability, and how can developers prevent it?',
    'What is Cross-Site Scripting (XSS), and how does it affect web browser security?',
    'Explain the difference between a security vulnerability, a threat, and a risk.',
    'What is ransomware, and what is the most reliable defense against catastrophic data loss?',
    'What is the Principle of Least Privilege (PoLP) in identity and access management?',
  ],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InterviewRoom() {
  const [role, setRole] = useState<string>('Frontend Developer');
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [status, setStatus] = useState<SessionState>('Idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcriptProvider, setTranscriptProvider] = useState<string | null>(null);

  // Track completed questions for current role
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, Set<number>>>({});

  // Audio preview URL to listen back to the recorded clip
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  // Microphones
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Input mode
  const [inputMode, setInputMode] = useState<InputMode>('typing');
  const [webSpeechAvailable, setWebSpeechAvailable] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Live microphone audio visualizer level (0 - 100)
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Evaluation states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<string>('');
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);

  // Refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const evaluationSectionRef = useRef<HTMLDivElement | null>(null);

  const questions = MOCK_QUESTIONS[role] || MOCK_QUESTIONS['Frontend Developer'];
  const currentQuestion = questions[questionIndex] || questions[0];

  // ─── Enumerate Microphones ────────────────────────────────────────────────
  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (mics.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(mics[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate audio devices:', err);
    }
  }, [selectedDeviceId]);

  // ─── Cleanup helper for AudioContext and Analyser ─────────────────────────
  const cleanupAudioAnalyser = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch { /* ignore */ }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ─── Probe Web Speech API on mount ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    refreshAudioDevices();

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setWebSpeechAvailable(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setStatus('Listening...');
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            finalText += text + ' ';
          } else {
            interimText += text;
          }
        }

        if (finalText) setTranscript((prev) => prev + finalText);
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Web Speech error:', event.error);
        if (event.error === 'network') {
          setWebSpeechAvailable(false);
          setInputMode('typing');
        } else if (event.error === 'not-allowed') {
          setErrorMessage(
            'Microphone access denied. Please allow microphone permissions in browser and reload.'
          );
        }
        setStatus('Idle');
        setIsListening(false);
      };

      recognition.onend = () => {
        setStatus('Idle');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setWebSpeechAvailable(true);
    } catch {
      setWebSpeechAvailable(false);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      cleanupAudioAnalyser();
    };
  }, [cleanupAudioAnalyser, refreshAudioDevices]);

  // ─── Web Speech toggle ─────────────────────────────────────────────────────
  const toggleWebSpeech = useCallback(async () => {
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setIsListening(false);
      setStatus('Idle');
      return;
    }

    setErrorMessage(null);
    setEvaluation(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMessage('Microphone access is required.');
      return;
    }

    try {
      setInputMode('webSpeech');
      recognitionRef.current?.start();
    } catch (err) {
      console.error('Web Speech start error:', err);
      setStatus('Idle');
    }
  }, [isListening]);

  // ─── MediaRecorder-based recording with Hardware DSP & Audio Meter ─────────
  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setEvaluation(null);
    setTranscriptProvider(null);

    let stream: MediaStream;
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
              echoCancellation: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              autoGainControl: true,
            },
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);
      refreshAudioDevices();
    } catch {
      setErrorMessage('Microphone access is required. Please check that your microphone is connected and unmuted.');
      return;
    }

    mediaStreamRef.current = stream;
    audioChunksRef.current = [];

    // Set up Web Audio API visualizer
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolumeMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolumeMeter);
      };
      animFrameRef.current = requestAnimationFrame(updateVolumeMeter);
    } catch (visErr) {
      console.warn('Audio visualizer error:', visErr);
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      cleanupAudioAnalyser();

      if (audioChunksRef.current.length === 0) {
        setStatus('Idle');
        setIsRecording(false);
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      const playbackUrl = URL.createObjectURL(audioBlob);
      setRecordedAudioUrl(playbackUrl);

      setStatus('Transcribing...');
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${mimeType.includes('webm') ? 'webm' : 'mp4'}`);

        const res = await fetch('/api/interview/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Transcription failed.');
        }

        if (data.transcript && data.transcript.trim()) {
          setTranscript((prev) => (prev ? prev + ' ' : '') + data.transcript.trim());
          if (data.provider) {
            setTranscriptProvider(data.provider);
          }
        } else {
          setErrorMessage(
            'No clear voice detected in your recording. Use the "🎧 Listen to Recording" player below to verify if your microphone captured sound, or choose a different microphone above.'
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transcription failed.';
        setErrorMessage(msg);
      } finally {
        setStatus('Idle');
        setIsRecording(false);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setInputMode('recording');
    setIsRecording(true);
    setStatus('Recording...');
  }, [cleanupAudioAnalyser, refreshAudioDevices, selectedDeviceId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.requestData();
      } catch { /* ignore */ }
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ─── Submit answer for AI evaluation & Reveal Perfect Answer ──────────────
  const handleSubmitAnswer = async () => {
    const fullAnswer = (transcript + ' ' + interimTranscript).trim();
    if (!fullAnswer) {
      setErrorMessage('Please type, paste, or record an answer before submitting.');
      return;
    }

    if (isListening) {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setIsListening(false);
    }
    if (isRecording) stopRecording();

    setIsSubmitting(true);
    setStatus('Processing...');
    setErrorMessage(null);
    setSubmittedAnswer(fullAnswer);

    try {
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: currentQuestion,
          user_answer_transcript: fullAnswer,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to evaluate answer.');

      const evalResult = data as EvaluationResult;
      setEvaluation(evalResult);

      // Mark this question as answered in progress tracker
      setAnsweredQuestions((prev) => {
        const currentSet = new Set(prev[role] || []);
        currentSet.add(questionIndex);
        return { ...prev, [role]: currentSet };
      });

      // Save to Supabase and LocalStorage
      await saveEvaluationToDatabase(role, currentQuestion, fullAnswer, evalResult);

      // Smooth scroll to the revealed evaluation & perfect answer
      setTimeout(() => {
        evaluationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Evaluation failed.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
      setStatus('Idle');
    }
  };

  // ─── Copy Perfect Answer Helper ───────────────────────────────────────────
  const handleCopyAnswer = async () => {
    if (!evaluation?.suggested_answer) return;
    try {
      await navigator.clipboard.writeText(evaluation.suggested_answer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 2500);
    } catch { /* ignore */ }
  };

  // ─── Persist evaluation ────────────────────────────────────────────────────
  const saveEvaluationToDatabase = async (
    targetRole: string,
    questionText: string,
    answerTranscript: string,
    result: EvaluationResult
  ) => {
    const recordId = crypto.randomUUID?.() ?? String(Date.now());
    const createdAt = new Date().toISOString();

    const newRecord = {
      id: recordId,
      role: targetRole,
      question_text: questionText,
      user_answer_transcript: answerTranscript,
      technical_accuracy_score: result.technical_accuracy_score,
      confidence_score: result.confidence_score,
      constructive_feedback: result.constructive_feedback,
      suggested_answer: result.suggested_answer,
      created_at: createdAt,
    };

    try {
      const { data: sessionData } = await supabase
        .from('interview_sessions')
        .insert([{ role: targetRole, created_at: createdAt }])
        .select()
        .single();

      await supabase.from('interview_responses').insert([
        {
          id: recordId,
          session_id: sessionData?.id || null,
          question_text: questionText,
          user_answer_transcript: answerTranscript,
          technical_accuracy_score: result.technical_accuracy_score,
          confidence_score: result.confidence_score,
          constructive_feedback: result.constructive_feedback,
          suggested_answer: result.suggested_answer,
          created_at: createdAt,
        },
      ]);
    } catch (dbErr) {
      console.info('Supabase insert notice:', dbErr);
    }

    try {
      const existing = JSON.parse(localStorage.getItem('ai_interview_history') || '[]');
      existing.unshift(newRecord);
      localStorage.setItem('ai_interview_history', JSON.stringify(existing));
    } catch { /* ignore */ }
  };

  // ─── Question Navigation Helpers ──────────────────────────────────────────
  const handleClearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setEvaluation(null);
    setErrorMessage(null);
    setTranscriptProvider(null);
    setRecordedAudioUrl(null);
    setSubmittedAnswer('');
  };

  const handleNextQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      handleClearTranscript();
    }
  };

  const handlePrevQuestion = () => {
    if (questionIndex > 0) {
      setQuestionIndex((prev) => prev - 1);
      handleClearTranscript();
    }
  };

  const handleSelectQuestion = (index: number) => {
    setQuestionIndex(index);
    handleClearTranscript();
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setQuestionIndex(0);
    handleClearTranscript();
  };

  const isBusy = isSubmitting || status === 'Transcribing...';
  const roleAnsweredCount = answeredQuestions[role]?.size || 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans text-slate-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 text-xs font-semibold tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 rounded-full uppercase">
                AI Technical Interviewer
              </span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                10 Fundamental Questions per Track
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              Interactive Interview Room
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl">
              Answer essential technical interview questions. Receive instant scoring, feedback, and the <strong className="text-emerald-300">revealed perfect model answer</strong>.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 min-w-[240px]">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-2 shadow-md"
            >
              📊 View Analytics Dashboard
            </Link>

            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="role-select" className="text-xs font-medium text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Select Track ({Object.keys(MOCK_QUESTIONS).length} Roles)</span>
                <span className="text-[10px] text-emerald-400 font-mono">{roleAnsweredCount}/10 completed</span>
              </label>
              <select
                id="role-select"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={isBusy || isRecording || isListening}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all disabled:opacity-50 cursor-pointer shadow-inner"
              >
                {Object.keys(MOCK_QUESTIONS).map((r) => (
                  <option key={r} value={r} className="bg-slate-900 text-slate-100">
                    {r} (10 Questions)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* ── 10 Question Quick Selector Bar ───────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Questions:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {questions.map((_, idx) => {
              const isCurrent = idx === questionIndex;
              const isDone = answeredQuestions[role]?.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectQuestion(idx)}
                  disabled={isBusy || isRecording || isListening}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-md'
                      : isDone
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/80'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                  } disabled:opacity-40`}
                  title={`Question ${idx + 1}${isDone ? ' (Evaluated)' : ''}`}
                >
                  {idx + 1}
                  {isDone && !isCurrent && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handlePrevQuestion}
            disabled={questionIndex === 0 || isBusy || isRecording || isListening}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            &larr; Prev
          </button>
          <span className="text-xs text-slate-400 font-mono px-2">
            {questionIndex + 1} / {questions.length}
          </span>
          <button
            onClick={handleNextQuestion}
            disabled={questionIndex === questions.length - 1 || isBusy || isRecording || isListening}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left: Question Card ─────────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-500/20">
                  {role} &bull; Q{questionIndex + 1} of 10
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Core Fundamentals
                </span>
              </div>

              <div className="min-h-[140px] flex items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                  &ldquo;{currentQuestion}&rdquo;
                </h2>
              </div>
            </div>

            {/* Status & Live Audio Indicator */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={status} />
                {inputMode === 'recording' && isRecording && (
                  <RecordingTimer />
                )}
              </div>

              {/* Real-time Mic Activity Bar when Recording */}
              {isRecording && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      Live Mic Input
                    </span>
                    <span className={`font-mono text-xs font-semibold ${
                      audioLevel > 15 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {audioLevel > 15 ? '🎤 Voice Detected' : '🤫 Low Volume / Muted'}
                    </span>
                  </div>
                  {/* Visualizer audio bars */}
                  <div className="flex items-center gap-1 h-5 w-full bg-slate-900 rounded-lg px-2 overflow-hidden">
                    {[12, 24, 40, 65, 85, 95, 75, 55, 35, 20, 15, 10].map((baseHeight, idx) => {
                      const scaledHeight = Math.max(15, Math.min(100, (audioLevel / 100) * baseHeight * 1.5));
                      return (
                        <div
                          key={idx}
                          className={`flex-1 rounded-sm transition-all duration-75 ${
                            audioLevel > 15 ? 'bg-gradient-to-t from-emerald-500 to-teal-300' : 'bg-slate-700'
                          }`}
                          style={{ height: `${scaledHeight}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Microphone Device Selector (if multiple mics exist) */}
              {audioDevices.length > 1 && (
                <div className="pt-2">
                  <label htmlFor="mic-select" className="text-[11px] font-medium text-slate-400 block mb-1">
                    Select Microphone:
                  </label>
                  <select
                    id="mic-select"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={isRecording}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                  >
                    {audioDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Answer + Controls ────────────────────────────────── */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1 bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col shadow-xl">
            {/* Title bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-200">Your Answer</h3>
                {transcriptProvider && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300">
                    Transcribed via {transcriptProvider}
                  </span>
                )}
              </div>
              <button
                onClick={handleClearTranscript}
                disabled={isBusy || isRecording || isListening || (!transcript && !interimTranscript)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
              >
                Clear
              </button>
            </div>

            {/* Textarea */}
            <div className={`relative flex-1 min-h-[160px] max-h-[240px] overflow-y-auto rounded-xl p-4 text-sm leading-relaxed transition-all ${
              isRecording
                ? 'bg-rose-950/20 border-2 border-rose-500/40 shadow-lg shadow-rose-950/20'
                : 'bg-slate-950/80 border border-slate-800/90 focus-within:ring-2 focus-within:ring-indigo-500/50'
            }`}>
              <textarea
                ref={textareaRef}
                value={transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '')}
                onChange={(e) => { setTranscript(e.target.value); setInterimTranscript(''); }}
                placeholder="Type your response directly, or click 'Record & Transcribe' to speak your answer..."
                disabled={isRecording}
                className="w-full h-full min-h-[140px] bg-transparent resize-none focus:outline-none text-slate-200 placeholder-slate-500 leading-relaxed disabled:opacity-60"
              />
            </div>

            {/* Audio Playback Diagnostic Bar */}
            {recordedAudioUrl && (
              <div className="mt-3 p-3 bg-slate-950/90 border border-indigo-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
                  <span>🎧</span>
                  <span>Audio Playback:</span>
                  <span className="text-slate-400 text-[11px]">(Listen to verify your mic)</span>
                </div>
                <audio src={recordedAudioUrl} controls className="h-8 max-w-full sm:max-w-xs" />
              </div>
            )}

            {/* Error / info messages */}
            {errorMessage && (
              <div className="mt-3 p-3 bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-200 text-xs leading-relaxed">
                <span className="font-semibold text-amber-300">ℹ️ Notice: </span>
                {errorMessage}
              </div>
            )}

            {/* ── Voice Input Controls ────────────────────────────────── */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Option A: Record & Transcribe */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isBusy || isListening}
                    className="px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="6" />
                    </svg>
                    Record &amp; Transcribe
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-5 py-3 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2.5 animate-pulse"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    Stop Recording
                  </button>
                )}

                {/* Option B: Chrome Web Speech */}
                {webSpeechAvailable && (
                  <button
                    onClick={toggleWebSpeech}
                    disabled={isBusy || isRecording}
                    className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 disabled:opacity-40 ${
                      isListening
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 animate-pulse'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {isListening ? 'Stop Live Speech' : 'Live Speech (Chrome)'}
                  </button>
                )}

                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  Whisper Large v3 active
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Speak or type your answer, then submit to receive an AI grade and reveal the <strong className="text-emerald-300">expert perfect answer</strong>.
              </p>
            </div>

            {/* ── Submit Button ───────────────────────────────────────── */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {questionIndex < questions.length - 1 ? `Next up: Q${questionIndex + 2}` : 'Final question in track'}
              </span>

              <button
                onClick={handleSubmitAnswer}
                disabled={isBusy || isRecording || (!transcript.trim() && !interimTranscript.trim())}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Evaluating &amp; Generating Perfect Answer...
                  </>
                ) : (
                  <>
                    Submit &amp; Reveal Perfect Answer
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revealed Evaluation & Perfect Answer Section ────────────────── */}
      {evaluation && (
        <section ref={evaluationSectionRef} className="space-y-6 pt-4">
          {/* ── 🏆 SHOWCASE: Perfect Model Answer Revealed ──────────────── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/90 border-2 border-emerald-500/50 p-6 sm:p-8 shadow-2xl shadow-emerald-950/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/40 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-xl border border-emerald-500/30">
                    🏆
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-extrabold text-white tracking-tight">
                        Perfect Answer Revealed
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                        Gold Standard
                      </span>
                    </div>
                    <p className="text-xs text-emerald-200/70">
                      Here is the ideal, expert-level response expected for this question.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAnswer}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-md"
                  >
                    {copiedAnswer ? (
                      <>
                        <span>✓</span> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Perfect Answer
                      </>
                    )}
                  </button>

                  {questionIndex < questions.length - 1 && (
                    <button
                      onClick={handleNextQuestion}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center gap-1"
                    >
                      Next Question &rarr;
                    </button>
                  )}
                </div>
              </div>

              {/* The Model Answer Text Content */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-5 sm:p-6 text-slate-100 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal shadow-inner">
                {evaluation.suggested_answer}
              </div>

              {/* Answer Comparison Drawer (Your Transcript vs Model Answer) */}
              {submittedAnswer && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Your Submitted Answer:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                    &ldquo;{submittedAnswer}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Score Cards & Constructive Feedback ─────────────────────── */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                📊 AI Evaluation &amp; Performance Metrics
              </h4>
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  ✓ Saved to Supabase
                </span>
                <Link href="/dashboard" className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 underline">
                  View Analytics →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScoreCard
                title="Technical Accuracy"
                score={evaluation.technical_accuracy_score}
                description="Core fundamentals, conceptual correctness, and clarity."
                icon="🎯"
              />
              <ScoreCard
                title="Confidence & Delivery"
                score={evaluation.confidence_score}
                description="Fluency, verbal flow, grammar, and minimal filler words."
                icon="🎙️"
              />
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-2">
              <h5 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                💡 Constructive Interviewer Feedback
              </h5>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                {evaluation.constructive_feedback}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SessionState }) {
  const config: Record<SessionState, { bg: string; text: string; dot: string; animate?: boolean }> = {
    'Idle':           { bg: 'bg-slate-800/80 border-slate-700', text: 'text-slate-400', dot: 'bg-slate-500' },
    'Listening...':   { bg: 'bg-emerald-950/90 border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400', animate: true },
    'Recording...':   { bg: 'bg-rose-950/90 border-rose-500/40', text: 'text-rose-400', dot: 'bg-rose-400', animate: true },
    'Transcribing...':{ bg: 'bg-indigo-950/90 border-indigo-500/40', text: 'text-indigo-300', dot: 'bg-indigo-400', animate: true },
    'Processing...':  { bg: 'bg-indigo-950/90 border-indigo-500/40', text: 'text-indigo-300', dot: 'bg-indigo-400', animate: true },
  };

  const c = config[status];

  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 ${c.bg} ${c.text} ${c.animate ? 'animate-pulse' : ''}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function RecordingTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="text-xs text-rose-400 font-mono tabular-nums">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

function ScoreCard({ title, score, description, icon }: { title: string; score: number; description: string; icon: string }) {
  const color = score >= 80 ? 'emerald' : score >= 60 ? 'amber' : 'rose';
  const gradient = score >= 80 ? 'from-emerald-500 to-teal-400' : score >= 60 ? 'from-amber-500 to-yellow-400' : 'from-rose-500 to-red-400';

  return (
    <div className={`p-5 rounded-xl border border-${color}-500/40 bg-${color}-950/30 flex flex-col justify-between space-y-4`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xl mb-1 block">{icon}</span>
          <h4 className="text-sm font-bold text-white">{title}</h4>
        </div>
        <div className="text-3xl font-extrabold tracking-tight">
          {score}<span className="text-sm text-slate-400 font-normal">/100</span>
        </div>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
        <div className={`h-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      <p className="text-xs text-slate-400 leading-normal">{description}</p>
    </div>
  );
}
