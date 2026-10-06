'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export interface SavedResponseRecord {
  id: string;
  session_id?: string | null;
  role?: string;
  question_text: string;
  user_answer_transcript: string;
  technical_accuracy_score: number;
  confidence_score: number;
  constructive_feedback: string;
  suggested_answer: string;
  created_at: string;
}

export default function AnalyticsDashboard() {
  const [records, setRecords] = useState<SavedResponseRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    let supabaseRecords: SavedResponseRecord[] = [];

    try {
      // Fetch from Supabase interview_responses
      const { data: responsesData, error: respErr } = await supabase
        .from('interview_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!respErr && responsesData && responsesData.length > 0) {
        // Fetch session roles if available
        const { data: sessionsData } = await supabase
          .from('interview_sessions')
          .select('id, role');

        const sessionRoleMap = new Map<string, string>();
        if (sessionsData) {
          sessionsData.forEach((s: { id: string; role: string }) => {
            sessionRoleMap.set(s.id, s.role);
          });
        }

        supabaseRecords = responsesData.map((item: SavedResponseRecord) => ({
          ...item,
          role: item.session_id ? sessionRoleMap.get(item.session_id) || 'Frontend Developer' : 'Frontend Developer',
        }));
      }
    } catch (err) {
      console.info('Supabase fetch notice:', err);
    }

    // Fallback/Merge with localStorage records
    let localRecords: SavedResponseRecord[] = [];
    try {
      const stored = localStorage.getItem('ai_interview_history');
      if (stored) {
        localRecords = JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    // Combine Supabase & local records, dedup by ID
    const combinedMap = new Map<string, SavedResponseRecord>();
    supabaseRecords.forEach((r) => combinedMap.set(r.id || String(r.created_at), r));
    localRecords.forEach((r) => {
      const key = r.id || String(r.created_at);
      if (!combinedMap.has(key)) {
        combinedMap.set(key, r);
      }
    });

    const finalRecords = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setRecords(finalRecords);
    setLoading(false);
  };

  const filteredRecords = records.filter(
    (r) => selectedRoleFilter === 'All' || (r.role || 'Frontend Developer') === selectedRoleFilter
  );

  // Analytics Metrics Calculations
  const totalSessions = filteredRecords.length;
  const avgTechnical = totalSessions
    ? Math.round(filteredRecords.reduce((acc, r) => acc + (r.technical_accuracy_score || 0), 0) / totalSessions)
    : 0;
  const avgConfidence = totalSessions
    ? Math.round(filteredRecords.reduce((acc, r) => acc + (r.confidence_score || 0), 0) / totalSessions)
    : 0;

  const rolesAvailable = Array.from(new Set(records.map((r) => r.role || 'Frontend Developer')));

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans text-slate-100">
      {/* Top Header & Navigation */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 rounded-full">
              Analytics Center
            </span>
            <span className="text-xs text-slate-400">Supabase Connected</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-2 tracking-tight">
            User Interview Performance Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Historical evaluations, confidence tracking, and technical accuracy trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-900/30 flex items-center gap-2"
          >
            <span>🎙️</span> Go to Interview Room
          </Link>
        </div>
      </header>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Technical Performance Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">🎯</span>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
              Technical Accuracy
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              <strong className="text-white">Technical Performance:</strong> Overall Metric
            </h3>
            <div className="text-4xl font-extrabold text-white mt-2">
              {avgTechnical}<span className="text-lg font-normal text-slate-400">/100</span>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
              style={{ width: `${avgTechnical}%` }}
            />
          </div>
        </div>

        {/* Confidence Tracker Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">🎙️</span>
            <span className="text-xs font-medium text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-500/30">
              Speech Fluency
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              <strong className="text-white">Confidence Tracker:</strong> Delivery & Grammar
            </h3>
            <div className="text-4xl font-extrabold text-white mt-2">
              {avgConfidence}<span className="text-lg font-normal text-slate-400">/100</span>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-400 h-full transition-all duration-500"
              style={{ width: `${avgConfidence}%` }}
            />
          </div>
        </div>

        {/* Total Sessions Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl">📝</span>
            <span className="text-xs font-medium text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/30">
              Evaluation History
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              <strong className="text-white">Total Completed Sessions:</strong> Completed
            </h3>
            <div className="text-4xl font-extrabold text-white mt-2">
              {totalSessions} <span className="text-lg font-normal text-slate-400">Evaluations</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Persisted in Supabase database & local session store.
          </div>
        </div>
      </div>

      {/* Role Filter & Content Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>📜</span> Evaluation History Records
        </h2>

        {rolesAvailable.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter by Role:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="All">All Roles</option>
              {rolesAvailable.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* History Records List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
          <svg className="animate-spin h-6 w-6 mx-auto text-indigo-400 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading evaluation metrics from Supabase database...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
          <p className="text-slate-300 font-medium text-base">No interview evaluations found yet.</p>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Complete your first voice or text interview session to see real-time AI technical metrics and confidence tracking here!
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md"
          >
            Start Your First Interview
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRecords.map((item, idx) => (
            <div
              key={item.id || idx}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 transition-all hover:border-slate-700"
            >
              {/* Top Card Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    {item.role || 'Frontend Developer'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent Session'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-emerald-400">
                    <strong className="text-slate-300">Technical Performance:</strong> {item.technical_accuracy_score}/100
                  </span>
                  <span className="text-indigo-400">
                    <strong className="text-slate-300">Confidence Tracker:</strong> {item.confidence_score}/100
                  </span>
                </div>
              </div>

              {/* Question & Transcript */}
              <div>
                <h3 className="text-base font-bold text-white mb-2">
                  Question: &ldquo;{item.question_text}&rdquo;
                </h3>
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-400 block mb-1">Spoken Candidate Transcript:</strong>
                  &ldquo;{item.user_answer_transcript}&rdquo;
                </div>
              </div>

              {/* Feedback & Suggested Model Answer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-1">
                  <strong className="text-indigo-300 font-semibold block uppercase tracking-wider mb-1">
                    Constructive Feedback:
                  </strong>
                  <p className="text-slate-300 leading-relaxed">{item.constructive_feedback}</p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-1">
                  <strong className="text-emerald-300 font-semibold block uppercase tracking-wider mb-1">
                    Suggested Answer:
                  </strong>
                  <p className="text-slate-300 leading-relaxed">{item.suggested_answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
