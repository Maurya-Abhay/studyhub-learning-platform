import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Code2,
  Search,
  Sparkles,
} from 'lucide-react';

import { getStudyLibrary } from '@/lib/study-data';
import { CategoryCard } from '@/components/study/category-card';
import { getDsaNavigationProblems, getDsaTopics } from '@/lib/dsa-data';
import { PublicShell } from '@/components/study/public-shell';
import { CourseCard } from '@/components/study/course-card';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const [{ categories, topics, error }, dsaTopics, { problems: dsaProblems }] = await Promise.all([
    getStudyLibrary(),
    getDsaTopics(),
    getDsaNavigationProblems(),
  ]);

  let resolvedFeaturedCourses: Array<{id:string;title:string;slug:string;description:string;access_type:string;price:number}> = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const { data } = await (await createClient()).from('courses').select('id,title,slug,description,access_type,price').eq('published', true).order('created_at', { ascending: false }).limit(4);
    resolvedFeaturedCourses = data ?? [];
  }

  const totalMinutes = topics.reduce(
    (total, topic) => total + (topic.estimatedMinutes ?? 0),
    0,
  );

  const learningHours =
    totalMinutes > 0 ? Math.max(1, Math.round(totalMinutes / 60)) : 0;

  return (
    <PublicShell categories={categories} topics={topics} dsaTopics={dsaTopics} dsaProblems={dsaProblems}>
      <main className="page">
        {/* HERO */}
        <section className="hero">
          <div className="container">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="eyebrow">
                  <Sparkles size={13} strokeWidth={1.8} />
                  Structured learning workspace
                </div>

                <h1>
                  Learn.
                  <span className="gradient"> Practice.</span>
                  <br />
                  Master.
                </h1>

                <p className="subtitle hero-subtitle">
                  Learn through structured courses, focused topics and
                  practical coding. Everything stays organized in one place.
                </p>

                <div className="hero-search-wrap">
                  <form className="search hero-search" action="/study" method="get">
                    <Search size={17} aria-hidden="true" />
                    <input name="q" type="search" placeholder="Search topics, courses or anything..." aria-label="Search topics and courses" />
                    <kbd>⌘ K</kbd>
                  </form>
                </div>
              </div>

              <div className="hero-visual" aria-hidden="true">
                <div className="hero-visual-glow" />

                <div className="hero-visual-content">
                  <img className="learning-illustration-image" src="/learning-illustration.svg" alt="Student learning with a laptop, books and a globe" />
                </div>


              </div>
            </div>

            {/* STATS */}
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-icon">
                  <BookOpen size={17} />
                </div>

                <div>
                  <div className="stat-num">{categories.length}</div>
                  <div className="stat-label">Published categories</div>
                </div>
              </div>


              <div className="stat">
                <div className="stat-icon">
                  <Code2 size={17} />
                </div>

                <div>
                  <div className="stat-num">{topics.length}</div>
                  <div className="stat-label">Published topics</div>
                </div>
              </div>

              <div className="stat">
                <div className="stat-icon">
                  <Sparkles size={17} />
                </div>

                <div>
                  <div className="stat-num">
                    {learningHours}
                    <span>h</span>
                  </div>
                  <div className="stat-label">Estimated learning time</div>
                </div>
              </div>

              <div className="stat">
                <div className="stat-icon">
                  <BrainCircuit size={17} />
                </div>

                <div>
                  <div className="stat-num">{dsaProblems.length}</div>
                  <div className="stat-label">DSA problems</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">Explore categories</div>

                <h2 className="title">
                  Choose what you want to learn
                </h2>

                <p className="subtitle">
                  Browse published learning paths and continue from exactly
                  where you want to start.
                </p>
              </div>

              <Link className="btn secondary small" href="/study">
                View all
                <ArrowRight size={14} />
              </Link>
            </div>

            {error ? (
              <div className="surface empty">
                <div className="empty-icon">
                  <Search size={17} />
                </div>

                <div>
                  <strong>Study library unavailable</strong>
                  <p>
                    Connect Supabase and publish learning content to populate
                    this section.
                  </p>
                </div>
              </div>
            ) : categories.length ? (
              <div className="grid-3 category-grid">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    item={category}
                  />
                ))}
              </div>
            ) : (
              <div className="surface empty">
                <div className="empty-icon">
                  <BookOpen size={17} />
                </div>

                <div>
                  <strong>No published categories yet</strong>
                  <p>
                    Categories created from the admin panel will appear here
                    automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FEATURED COURSES */}
        <section className="section section-tight">
          <div className="container">
            <div className="section-head">
              <div><div className="eyebrow">Featured learning paths</div><h2 className="title">Start with a course, not a blank page.</h2><p className="subtitle">Admin-published courses automatically appear here, with the same source of truth used across learner and admin views.</p></div>
              <Link className="btn secondary small" href="/study/courses">Browse courses <ArrowRight size={14}/></Link>
            </div>
            {resolvedFeaturedCourses.length ? <div className="course-card-grid">{resolvedFeaturedCourses.map(course => <CourseCard key={course.id} course={course}/>)}</div> : <div className="surface empty"><strong>No courses published yet.</strong><p>Publish a course from the admin workspace and it will appear here automatically.</p></div>}
          </div>
        </section>

        {/* VALUE STRIP */}
        <section className="section section-tight">
          <div className="container">
            <div className="learning-strip">
              <div className="learning-strip-item">
                <div className="learning-strip-icon">
                  <BookOpen size={16} />
                </div>

                <div>
                  <strong>Learn at your pace</strong>
                  <span>Structured topics with a clear path forward.</span>
                </div>
              </div>

              <div className="learning-strip-divider" />

              <div className="learning-strip-item">
                <div className="learning-strip-icon">
                  <Code2 size={16} />
                </div>

                <div>
                  <strong>Practice when it matters</strong>
                  <span>Code exercises only where hands-on work belongs.</span>
                </div>
              </div>

              <div className="learning-strip-divider" />

              <div className="learning-strip-item">
                <div className="learning-strip-icon">
                  <Sparkles size={16} />
                </div>

                <div>
                  <strong>Track your progress</strong>
                  <span>Save progress, complete courses and earn certificates.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </PublicShell>
  );
}