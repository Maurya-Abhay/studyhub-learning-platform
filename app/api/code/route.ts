import { NextResponse } from 'next/server';
import { getApiUser, rateLimit, rateLimitedResponse, readJson } from '@/lib/api-security';

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63, typescript: 74, python: 71, java: 62, cpp: 54, 'c++': 54,
  c: 50, csharp: 51, 'c#': 51, go: 60, rust: 73, kotlin: 78, php: 68,
};
const MAX_OUTPUT = 20_000;
const EXECUTION_TIMEOUT_MS = 20_000;

function judgeHeaders(apiUrl: string, apiKey?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey && apiUrl.includes('rapidapi.com')) {
    headers['x-rapidapi-key'] = apiKey;
    headers['x-rapidapi-host'] = new URL(apiUrl).host;
  } else if (apiKey) headers['X-Auth-Token'] = apiKey;
  return headers;
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

export async function POST(request: Request) {
  const { user } = await getApiUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const limit = rateLimit(request, { key: `code:${user.id}`, limit: 8, windowMs: 60_000 });
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfter);

  let body: { source?: unknown; stdin?: unknown; language?: unknown };
  try { body = await readJson(request, 80_000); }
  catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === 'REQUEST_TOO_LARGE' ? 'Request is too large.' : 'Invalid JSON body.' }, { status: 400 }); }
  const source = typeof body.source === 'string' ? body.source : '';
  const stdin = typeof body.stdin === 'string' ? body.stdin : '';
  const language = typeof body.language === 'string' ? body.language.toLowerCase().trim() : '';
  if (!source || source.length > 50_000 || stdin.length > 10_000) return NextResponse.json({ error: 'Code or input exceeds the allowed limit.' }, { status: 400 });
  if (!(language in LANGUAGE_IDS)) return NextResponse.json({ error: 'Unsupported programming language.' }, { status: 400 });

  const languageId = LANGUAGE_IDS[language];
  const apiUrl = (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/$/, '');
  const apiKey = process.env.JUDGE0_API_KEY;
  if (!apiKey && apiUrl.includes('rapidapi.com')) return NextResponse.json({ error: 'Code execution is temporarily unavailable.' }, { status: 503 });
  const executableSource = languageId === 62 && !/(^|\n)\s*import\s+java\./.test(source) ? `import java.util.*;\n${source}` : source;
  const headers = judgeHeaders(apiUrl, apiKey);

  try {
    const created = await fetchWithTimeout(`${apiUrl}/submissions?base64_encoded=false&wait=false`, { method: 'POST', headers, body: JSON.stringify({ source_code: executableSource, language_id: languageId, stdin }), cache: 'no-store' }, 8_000);
    const createdData = await created.json().catch(() => null);
    if (!created.ok || !createdData?.token) return NextResponse.json({ error: 'Code execution service is temporarily unavailable.' }, { status: 502 });
    let data = createdData;
    const started = Date.now();
    while (Date.now() - started < EXECUTION_TIMEOUT_MS && (!data.status || [1, 2].includes(Number(data.status.id)))) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const result = await fetchWithTimeout(`${apiUrl}/submissions/${encodeURIComponent(createdData.token)}/?base64_encoded=false`, { headers, cache: 'no-store' }, 5_000);
      if (!result.ok) return NextResponse.json({ error: 'Code execution service is temporarily unavailable.' }, { status: 502 });
      data = await result.json().catch(() => null);
      if (!data) return NextResponse.json({ error: 'Invalid response from code execution service.' }, { status: 502 });
    }
    if (!data?.status) return NextResponse.json({ error: 'Code execution timed out.' }, { status: 504 });
    const output = String(data.stdout || data.stderr || data.compile_output || data.message || '').slice(0, MAX_OUTPUT);
    return NextResponse.json({ output, status: data.status.description || 'Unknown', runtimeMs: Number(data.time || 0) * 1000, memoryKb: Number(data.memory || 0) });
  } catch {
    return NextResponse.json({ error: 'Code execution service is temporarily unavailable.' }, { status: 502 });
  }
}
