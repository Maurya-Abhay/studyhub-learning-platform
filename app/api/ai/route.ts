import { NextResponse } from 'next/server';
import { getApiAdmin, rateLimit, rateLimitedResponse, readJson } from '@/lib/api-security';

const baseFields = ['concept','explanation','mentalModel','realExample','codeExample','codeLanguage','output','commonMistakes','practiceTask','interviewQuestions','quickRevision','resources'];
const ALLOWED_KINDS = new Set(['topic','dsa','quiz','test','topic-outline','roadmap']);

function systemPrompt(kind: string) {
  if (kind === 'dsa') return 'You create accurate educational DSA drafts. Return ONLY a JSON object with: title, summary, problem, examples, constraints, hint, bruteForce, optimized, timeComplexity, spaceComplexity, starterCode, solution, testCases. Use Java. testCases must be an array of objects with stdin and expected.';
  if (kind === 'quiz') return 'You create assessment drafts. Return ONLY a JSON object with a questions array. Each question has prompt, type, options, answer, explanation.';
  if (kind === 'test') return 'You create a complete assessment draft. Return ONLY a JSON object with title, description, durationMinutes, passingScore, unlockDays, requiredProgress, and a questions array. Each question has prompt, type, options, answer, explanation.';
  if (kind === 'topic-outline') return 'You create a course outline. Return ONLY a JSON object with a topics array. Each topic has title, slug, summary, difficulty, estimatedMinutes.';
  if (kind === 'roadmap') return 'You design a structured learning roadmap for students. Return ONLY a JSON object with: title, slug, description, categoryNames, estimatedWeeks, milestones.';
  return `You create original, accurate study content. Return ONLY a JSON object with these fields: ${baseFields.join(', ')}. Use null for code fields when code is not appropriate. commonMistakes and interviewQuestions must be arrays. resources must be an array of useful official documentation URLs or source labels.`;
}

function parseModelJson(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) { try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {} }
    return null;
  }
}

export async function POST(request: Request) {
  const { supabase, user, response } = await getApiAdmin();
  if (response) return response;
  const limit = rateLimit(request, { key: `ai:${user!.id}`, limit: 5, windowMs: 60_000 });
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfter);
  let body: { title?: unknown; kind?: unknown; instruction?: unknown };
  try { body = await readJson(request, 12_000); } catch { return NextResponse.json({ error: 'Invalid or oversized request.' }, { status: 400 }); }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const kind = typeof body.kind === 'string' ? body.kind.trim() : '';
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!title || !ALLOWED_KINDS.has(kind) || !instruction || title.length > 200 || instruction.length > 4_000) return NextResponse.json({ error: 'Valid title, type and instruction are required.' }, { status: 400 });
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI generation is temporarily unavailable.' }, { status: 503 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let res: Response;
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, 'X-Title': 'StudyHub' },
        body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct', messages: [{ role: 'user', content: `${systemPrompt(kind)}\nTitle: ${title}\nInstruction: ${instruction}\nReturn only valid JSON.` }], temperature: 0.3, max_tokens: 5000 }),
        cache: 'no-store', signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }
    const data = await res.json().catch(() => null);
    if (!res.ok) return NextResponse.json({ error: 'AI provider request failed.' }, { status: 502 });
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') return NextResponse.json({ error: 'AI provider returned an invalid response.' }, { status: 502 });
    const parsed = parseModelJson(text);
    if (parsed === null) return NextResponse.json({ error: 'AI returned invalid JSON. Please regenerate.' }, { status: 502 });
    const { error: logError } = await supabase.from('ai_generations').insert({ admin_user_id: user!.id, kind, title, instruction, output: parsed, status: 'draft' });
    if (logError) console.error('AI generation audit write failed', logError.code);
    return NextResponse.json({ content: parsed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'AI generation is temporarily unavailable.' }, { status: 502 });
  }
}
