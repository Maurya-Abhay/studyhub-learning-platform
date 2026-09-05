import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, rateLimitedResponse, readJson } from '@/lib/api-security';

type TestCase = { input?: string; stdin?: string; output?: string; expected?: string };

type Body = { action?: unknown; problemId?: unknown; source?: unknown };

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function getJudgeHeaders(apiUrl: string, key?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiUrl.includes('rapidapi.com') && key) {
    headers['x-rapidapi-key'] = key;
    headers['x-rapidapi-host'] = new URL(apiUrl).host;
  } else if (key) headers['X-Auth-Token'] = key;
  return headers;
}

function parseCases(value: unknown): TestCase[] {
  if (Array.isArray(value)) return value as TestCase[];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as TestCase[] : [];
  } catch {
    return [];
  }
}

function prepareJavaSource(source: string) {
  const javaSource = /(^|\n)\s*import\s+java\./.test(source) ? source : `import java.util.*;\n${source}`;
  if (/\bclass\s+Main\b/.test(javaSource) && /static\s+void\s+main\s*\(/.test(javaSource)) return javaSource;

  return `${javaSource}
class Main {
  public static void main(String[] args) throws Exception {
    String input = new String(System.in.readAllBytes()).trim();
    String[] lines = input.isEmpty() ? new String[0] : input.split("\\\\R");
    java.lang.reflect.Method method = null;
    for (java.lang.reflect.Method candidate : Solution.class.getDeclaredMethods()) {
      if (!candidate.isSynthetic()) {
        method = candidate;
        break;
      }
    }
    if (method == null) throw new IllegalArgumentException("Solution must define a method.");
    Class<?>[] types = method.getParameterTypes();
    Object[] values = new Object[types.length];
    for (int i = 0; i < types.length; i++) values[i] = parse(lines[i], types[i]);
    Object result = method.invoke(java.lang.reflect.Modifier.isStatic(method.getModifiers()) ? null : new Solution(), values);
    if (result instanceof int[]) System.out.print(java.util.Arrays.toString((int[]) result));
    else if (result instanceof long[]) System.out.print(java.util.Arrays.toString((long[]) result));
    else if (result instanceof Object[]) System.out.print(java.util.Arrays.deepToString((Object[]) result));
    else if (result != null) System.out.print(result);
  }

  static Object parse(String value, Class<?> type) {
    String text = value.trim();
    if (type == int.class || type == Integer.class) return Integer.parseInt(text);
    if (type == long.class || type == Long.class) return Long.parseLong(text);
    if (type == double.class || type == Double.class) return Double.parseDouble(text);
    if (type == boolean.class || type == Boolean.class) return Boolean.parseBoolean(text);
    if (type == String.class) return text.replaceAll("^\\\"|\\\"$", "");
    if (type == int[].class) {
      text = text.replaceAll("^[\\\\[\\\\]]|[\\\\[\\\\]]$", "").trim();
      if (text.isEmpty()) return new int[0];
      String[] parts = text.split(",");
      int[] result = new int[parts.length];
      for (int i = 0; i < parts.length; i++) result[i] = Integer.parseInt(parts[i].trim());
      return result;
    }
    throw new IllegalArgumentException("Unsupported parameter type: " + type.getName());
  }
}
`;
}

function comparableOutput(value: string) {
  return value.trim().replace(/\s+/g, '');
}

async function execute(apiUrl: string, key: string | undefined, source: string, stdin: string) {
  const baseUrl = apiUrl.replace(/\/$/, '');
  const javaSource = prepareJavaSource(source);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: getJudgeHeaders(apiUrl, key),
      body: JSON.stringify({ language_id: 62, source_code: javaSource, stdin }),
      cache: 'no-store', signal: controller.signal,
    });
  } finally { clearTimeout(timer); }
  let data = await response.json();
  if (!response.ok) throw new Error(data?.message || data?.error || 'Code runner request failed.');
  for (let attempt = 0; attempt < 30 && (!data.status || [1, 2].includes(Number(data.status.id))); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5_000); let result: Response; try { result = await fetch(`${baseUrl}/submissions/${encodeURIComponent(data.token)}/?base64_encoded=false`, { headers: getJudgeHeaders(apiUrl, key), cache: 'no-store', signal: controller.signal }); } finally { clearTimeout(timer); }
    if (!result.ok) throw new Error(`Judge0 result request failed (${result.status}).`);
    data = await result.json();
  }
  if (!data.status) throw new Error('Judge0 timed out before returning a result.');
  return { output: String(data.stdout ?? data.stderr ?? data.compile_output ?? data.message ?? ''), status: String(data.status?.description ?? 'Unknown'), runtimeMs: Number(data.time ?? 0) * 1000, memoryKb: Number(data.memory ?? 0) };
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuth();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const limiter = rateLimit(request, { key: `dsa:${user.id}`, limit: 6, windowMs: 60_000 });
  if (!limiter.allowed) return rateLimitedResponse(limiter.retryAfter);
  let body: Body;
  try { body = await readJson<Body>(request, 80_000); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const action = body.action === 'submit' ? 'submit' : 'run';
  const problemId = typeof body.problemId === 'string' ? body.problemId : '';
  const source = typeof body.source === 'string' ? body.source : '';
  if (!problemId || !source) return NextResponse.json({ error: 'problemId and source are required.' }, { status: 400 });
  if (source.length > 50000) return NextResponse.json({ error: 'Code is too large.' }, { status: 400 });

  const { data: problem, error } = await supabase.from('dsa_problems').select('id,test_cases').eq('id', problemId).eq('published', true).maybeSingle();
  if (error || !problem) return NextResponse.json({ error: 'Problem not found.' }, { status: 404 });

  const apiUrl = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
  const key = process.env.JUDGE0_API_KEY;
  if (action === 'run' && !key && apiUrl.includes('rapidapi.com')) return NextResponse.json({ error: 'Judge0 provider key is not configured.' }, { status: 503 });

  try {
    const cases = parseCases(problem.test_cases);
    if (action === 'run') {
      if (!cases.length) return NextResponse.json({ error: 'No test cases are configured for this problem.' }, { status: 409 });
      const testCase = cases[0];
      const stdin = String(testCase.stdin ?? testCase.input ?? '');
      const result = await execute(apiUrl, key, source, stdin);
      return NextResponse.json({ ...result, output: result.output.slice(0, 20_000), accepted: result.status === 'Accepted' });
    }

    if (!cases.length) return NextResponse.json({ error: 'No test cases are configured for this problem.' }, { status: 409 });

    let passed = 0;
    let last = { output: '', status: 'Unknown', runtimeMs: 0, memoryKb: 0 };
    for (const testCase of cases.slice(0, 15)) {
      const stdin = String(testCase.stdin ?? testCase.input ?? '');
      const expected = String(testCase.expected ?? testCase.output ?? '').trim();
      last = await execute(apiUrl, key, source, stdin);
      if (last.status === 'Accepted' && (!expected || comparableOutput(last.output) === comparableOutput(expected))) passed += 1;
    }
    const accepted = passed === Math.min(cases.length, 15);
    const { data: submission, error: submissionError } = await supabase.from('dsa_submissions').insert({
      user_id: user.id,
      problem_id: problem.id,
      language: 'java',
      source_code: source,
      status: accepted ? 'accepted' : 'rejected',
      score: Math.round((passed / Math.max(1, Math.min(cases.length, 15))) * 100),
      runtime_ms: Math.round(last.runtimeMs),
      memory_kb: Math.round(last.memoryKb),
    }).select('id,status,score,runtime_ms,memory_kb,created_at').single();
    if (submissionError) return NextResponse.json({ error: submissionError.message }, { status: 400 });
    return NextResponse.json({ accepted, passed, total: Math.min(cases.length, 15), submission });
  } catch {
    return NextResponse.json({ error: 'Code execution service is temporarily unavailable.' }, { status: 502 });
  }
}
