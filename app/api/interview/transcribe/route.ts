import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

/**
 * Sanitizes transcription output by stripping audio descriptions
 * (e.g., "[noise]", "(background static)", "[silence]", etc.)
 */
function cleanTranscript(text: string): string {
  if (!text) return '';
  const cleaned = text
    // Remove bracketed or parenthesized sound tags: [noise], (laughter), [cough], etc.
    .replace(/\[(?:noise|background noise|silence|applause|laughter|cough|sigh|ambient|static|inaudible|unintelligible|sound|music|whispering)[^\]]*\]/gi, '')
    .replace(/\((?:noise|background noise|silence|applause|laughter|cough|sigh|ambient|static|inaudible|unintelligible|sound|music|whispering)[^)]*\)/gi, '')
    // Remove isolated standalone noise words
    .replace(/^\s*(?:noise|background noise|silence|inaudible|unintelligible)\.?\s*$/gi, '')
    .trim();

  // Known Whisper silence hallucinations when audio is empty / silent
  const lower = cleaned.toLowerCase().trim();
  const silenceHallucinations = [
    'thank you.',
    'thank you',
    'thanks.',
    'thanks',
    'thank you very much.',
    'thank you very much',
    'thanks for watching.',
    'thanks for watching',
    'thank you for watching.',
    'thank you for watching',
    'please like and subscribe.',
    'please subscribe.',
    'subscribe.',
    'bye.',
    'bye',
    'goodbye.',
    'you',
    '.',
  ];

  if (silenceHallucinations.includes(lower) || lower.startsWith('subtitles by')) {
    return '';
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided in request.' },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // OPTION 1: Groq Whisper API (Industry-standard STT, ultra-fast & free)
    // If user has GROQ_API_KEY, use whisper-large-v3-turbo for pristine accuracy
    // ──────────────────────────────────────────────────────────────────────────
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const groqForm = new FormData();
        groqForm.append('file', audioFile);
        groqForm.append('model', 'whisper-large-v3-turbo');
        groqForm.append('response_format', 'json');
        groqForm.append('language', 'en');

        const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: groqForm,
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const transcript = cleanTranscript(data.text || '');
          return NextResponse.json({ transcript, provider: 'groq-whisper' }, { status: 200 });
        }
        console.warn('Groq Whisper returned non-200, falling back to Gemini:', groqRes.status);
      } catch (groqErr) {
        console.warn('Groq Whisper request error, falling back:', groqErr);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // OPTION 2: OpenAI Whisper API (if OPENAI_API_KEY configured)
    // ──────────────────────────────────────────────────────────────────────────
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      try {
        const openaiForm = new FormData();
        openaiForm.append('file', audioFile);
        openaiForm.append('model', 'whisper-1');
        openaiForm.append('response_format', 'json');

        const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: openaiForm,
        });

        if (openaiRes.ok) {
          const data = await openaiRes.json();
          const transcript = cleanTranscript(data.text || '');
          return NextResponse.json({ transcript, provider: 'openai-whisper' }, { status: 200 });
        }
      } catch (openaiErr) {
        console.warn('OpenAI Whisper error, falling back:', openaiErr);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // OPTION 3: Google Gemini Multimodal Audio Transcription
    // Uses temperature 0.0 + strict anti-hallucination prompt + noise cleaner
    // ──────────────────────────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.' },
        { status: 500 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = audioFile.type || 'audio/webm';

    let lastError = 'Transcription failed.';
    let lastStatus = 500;

    for (const model of CANDIDATE_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Audio,
                    },
                  },
                  {
                    text: 'You are a precise, professional speech transcriber. Transcribe ONLY the clearly spoken English words in this audio clip. Do NOT describe sounds, silence, ambient noises, or background artifacts (never output [noise], [silence], [cough], (static), etc.). If the audio contains only silence, static, breathing, or background noise with no intelligible human speech, return an empty string (""). Preserve natural filler words (um, uh, like) ONLY when genuinely spoken by the speaker.',
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.0,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          const transcriptText = cleanTranscript(rawText);

          return NextResponse.json({ transcript: transcriptText, provider: model }, { status: 200 });
        }

        const errText = await geminiResponse.text();
        console.warn(`Model ${model} returned ${geminiResponse.status}:`, errText);
        lastStatus = geminiResponse.status >= 500 ? 502 : 400;
        lastError = `Gemini API error (${geminiResponse.status})`;
      } catch (networkErr: unknown) {
        console.warn(`Model ${model} fetch exception:`, networkErr);
      }
    }

    return NextResponse.json({ error: lastError }, { status: lastStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed.';
    console.error('Error transcribing audio:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
