# StudyHub

Dynamic learning platform built with Next.js, TypeScript, Tailwind, Supabase PostgreSQL/Auth, OpenRouter-compatible AI generation, Monaco Editor, Judge0-compatible code execution, Recharts and Mermaid.

## Key architecture

- Public learning is database-driven and readable without login.
- Login unlocks personal progress, schedules, notes, bookmarks, test history, DSA submissions and certificates.
- Admin is a CMS: categories, topics, courses, questions, tests, DSA topics/problems and AI drafts are managed from the dashboard.
- No topic-specific source files are required. Add hundreds of topics from the admin portal.
- Modules are intentionally not exposed or required by the application.
- Bulk JSON import is available for categories, topics, questions, tests, courses, DSA topics and DSA problems.

## Setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and add your Supabase URL/publishable key. Configure an AI provider key and Judge0 provider only when those features are needed.

Run `supabase/schema.sql` in the Supabase SQL Editor. The script creates the current tables/policies and adds the category-first topic model while keeping the old `study_modules` table only for migration compatibility. The UI no longer uses modules.

## JSON examples

Topics:
```json
[
  {
    "title": "What is HTML?",
    "slug": "what-is-html",
    "difficulty": "Beginner",
    "estimatedMinutes": 10,
    "summary": "...",
    "concept": "...",
    "explanation": "...",
    "mentalModel": "...",
    "realExample": "...",
    "codeExample": "",
    "codeLanguage": "html",
    "output": "",
    "commonMistakes": ["..."],
    "practiceTask": "...",
    "interviewQuestions": ["..."],
    "published": false
  }
]
```

Questions do not require a topic. Select a category in the admin UI if the questions belong to a category.

Courses use `categoryIds` and ordered `topicIds`.

DSA uses separate DSA topics, then problems can be bulk-imported against one selected DSA topic.

## Production notes

- Never put secret AI/provider keys in client code or commit `.env.local`.
- Code execution must use a sandboxed external runner; never execute arbitrary user code in the Next.js process.
- Review AI-generated content before publishing.

## Production hardening

1. Apply the complete base database schema, then apply every SQL file in `supabase/migrations/`.
2. Enable email verification and appropriate password/auth abuse protections in Supabase Auth.
3. Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, and `JUDGE0_API_KEY` server-only. Never expose them with `NEXT_PUBLIC_`.
4. Use HTTPS in production. The application sends HSTS and other security headers.
5. Run `npm ci`, `npm run build`, and a production smoke test before deployment.
6. For horizontally scaled deployments, put a distributed rate limiter in front of `/api/*`; the built-in limiter is a defense-in-depth fallback and is intentionally not treated as the sole abuse-control mechanism.
7. Apply `supabase/migrations/20260906_production_hardening.sql` so active test attempts and active certificates are protected by database-level uniqueness constraints.
