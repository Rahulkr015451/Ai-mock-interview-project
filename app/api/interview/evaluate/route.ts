import { NextRequest, NextResponse } from 'next/server';

export interface EvaluateRequestBody {
  question_text?: string;
  user_answer_transcript?: string;
}

export interface EvaluateResponseData {
  technical_accuracy_score: number;
  confidence_score: number;
  constructive_feedback: string;
  suggested_answer: string;
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured on the server.' },
        { status: 500 }
      );
    }

    let body: EvaluateRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload in request body.' },
        { status: 400 }
      );
    }

    const { question_text, user_answer_transcript } = body;

    if (!question_text || typeof question_text !== 'string' || !question_text.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid "question_text" parameter in request body.' },
        { status: 400 }
      );
    }

    if (!user_answer_transcript || typeof user_answer_transcript !== 'string' || !user_answer_transcript.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid "user_answer_transcript" parameter in request body.' },
        { status: 400 }
      );
    }

    const promptText = `You are an expert technical interviewer evaluating a candidate's spoken response to an interview question.

### Question:
"${question_text.trim()}"

### Candidate Spoken Answer Transcript:
"${user_answer_transcript.trim()}"

### Instructions:
Evaluate the response and return a JSON object adhering strictly to the following criteria:
1. "technical_accuracy_score": Integer between 0 and 100. Evaluate technical correctness, core fundamentals, accuracy, and clarity of the candidate's answer to the given question.
2. "confidence_score": Integer between 0 and 100. Carefully analyze the spoken transcript for delivery confidence and communication fluency. Actively check for excessive filler words (e.g. "um", "uh", "ah", "like", "you know", "sort of", "i mean", "right"), excessive hesitations, or fragmented grammar. Heavily penalize frequent filler words or broken grammar.
3. "constructive_feedback": Provide detailed, encouraging, and actionable feedback highlighting what the candidate explained well, any missing fundamentals or inaccuracies, and tips on verbal delivery and filler word reduction.
4. "suggested_answer": Provide an exemplary, crystal-clear, and comprehensive model answer that represents what a top-tier candidate would say in an actual interview. Make it structured, easy to understand, and include key concepts and practical context.`;

    let lastError = 'Failed to evaluate answer.';
    let lastStatus = 500;

    for (const model of CANDIDATE_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: promptText }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  technical_accuracy_score: {
                    type: 'INTEGER',
                    description: 'Technical accuracy score from 0 to 100.',
                  },
                  confidence_score: {
                    type: 'INTEGER',
                    description: 'Confidence score from 0 to 100 based on fluency and filler word deduction.',
                  },
                  constructive_feedback: {
                    type: 'STRING',
                    description: 'Constructive feedback on content and communication.',
                  },
                  suggested_answer: {
                    type: 'STRING',
                    description: 'Exemplary suggested answer to the question.',
                  },
                },
                required: [
                  'technical_accuracy_score',
                  'confidence_score',
                  'constructive_feedback',
                  'suggested_answer',
                ],
              },
            },
          }),
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (rawText) {
            const evaluationResult: EvaluateResponseData = JSON.parse(rawText);
            return NextResponse.json(evaluationResult, { status: 200 });
          }
        }

        const errorText = await geminiResponse.text();
        console.warn(`Evaluation model ${model} failed (${geminiResponse.status}):`, errorText);
        lastStatus = geminiResponse.status >= 500 ? 502 : 400;
        lastError = `Gemini API error (${geminiResponse.status})`;
      } catch (networkErr: unknown) {
        console.warn(`Evaluation model ${model} fetch exception:`, networkErr);
      }
    }

    return NextResponse.json({ error: lastError }, { status: lastStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Error evaluating interview answer:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
