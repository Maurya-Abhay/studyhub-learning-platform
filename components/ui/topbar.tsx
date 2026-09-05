'use client';

import Link from 'next/link';
import {
  BookOpen,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTheme } from '@/components/ui/theme-provider';
import { createClient } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/confirm-dialog';

type TopbarProps = {
  onMenuClick?: () => void;
  mobileMenuOpen?: boolean;
};

type SearchResults = {
  categories: Array<{ id: string; name: string; slug: string }>;
  topics: Array<{ id: string; title: string; slug: string; summary: string }>;
  courses: Array<{ id: string; title: string; slug: string; description: string }>;
  dsa: Array<{ id: string; title: string; slug: string; difficulty: string; pattern: string }>;
};

export function Topbar({
  onMenuClick,
  mobileMenuOpen = false,
}: TopbarProps) {
  const { theme, toggle } = useTheme();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthenticated(Boolean(data.session));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setIsAuthenticated(Boolean(session));
      },
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    if (!(await confirm({ title: 'Log out?', message: 'Your current session will be ended.', confirmLabel: 'Log out', danger: true }))) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    router.push('/login');
    router.refresh();
  }

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setSuggestions(null);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (response.ok) setSuggestions(await response.json());
      } catch {
        if (!controller.signal.aborted) setSuggestions(null);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const hasSuggestions = Boolean(suggestions && (suggestions.categories.length || suggestions.topics.length || suggestions.courses.length || suggestions.dsa.length));

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = query.trim();

    if (!value) {
      router.push('/study');
      return;
    }

    router.push(`/study?q=${encodeURIComponent(value)}`);
  }

  return (
    <header className="topbar">
      <div className="topbar-in container">
        {/* LEFT */}
        <div className="topbar-left">
          <Link
            href="/"
            className="brand topbar-brand"
            aria-label="StudyHub home"
          >
            <span className="brand-mark">
              <BookOpen size={16} strokeWidth={2} />
            </span>

            <span>StudyHub</span>
          </Link>
        </div>

        {/* CENTER */}
        <div className="topbar-center">
          <form
            className="topbar-search search"
            onSubmit={submitSearch}
            role="search"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setSuggestions(null);
            }}
          >
            <Search
              size={16}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics, courses..."
              aria-label="Search topics and courses"
            />

            <kbd className="search-shortcut">
              ⌘ K
            </kbd>
            {(searching || hasSuggestions || (suggestions && !hasSuggestions)) ? <div className="search-suggestions">
              {searching ? <div className="search-suggestion-status">Searching...</div> : null}
              {suggestions?.categories.length ? <div className="search-suggestion-group"><span>Categories</span>{suggestions.categories.slice(0, 3).map((item) => <Link key={item.id} href={`/study/category/${item.slug}`} className="search-suggestion" onClick={() => setSuggestions(null)}><strong>{item.name}</strong><small>Category</small></Link>)}</div> : null}
              {suggestions?.topics.length ? <div className="search-suggestion-group"><span>Topics</span>{suggestions.topics.slice(0, 5).map((item) => <Link key={item.id} href={`/study/topic/${item.slug}`} className="search-suggestion" onClick={() => setSuggestions(null)}><strong>{item.title}</strong><small>{item.summary || 'Open topic'}</small></Link>)}</div> : null}
              {suggestions?.courses.length ? <div className="search-suggestion-group"><span>Courses</span>{suggestions.courses.slice(0, 3).map((item) => <Link key={item.id} href={`/study/courses/${item.slug}`} className="search-suggestion" onClick={() => setSuggestions(null)}><strong>{item.title}</strong><small>Course</small></Link>)}</div> : null}
              {suggestions?.dsa.length ? <div className="search-suggestion-group"><span>DSA Problems</span>{suggestions.dsa.slice(0, 4).map((item) => <Link key={item.id} href={`/dsa/problem/${item.slug}`} className="search-suggestion" onClick={() => setSuggestions(null)}><strong>{item.title}</strong><small>{item.difficulty} · {item.pattern || 'DSA'}</small></Link>)}</div> : null}
              {!searching && suggestions && !hasSuggestions ? <div className="search-suggestion-status">No quick matches. Press Enter to see all results.</div> : null}
            </div> : null}
          </form>
        </div>

        {/* RIGHT */}
        <div className="topbar-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label={
              theme === 'dark'
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
          >
            {theme === 'dark' ? (
              <Sun size={17} strokeWidth={1.8} />
            ) : (
              <Moon size={17} strokeWidth={1.8} />
            )}
          </button>

          {isAuthenticated ? (
            <>
              <Link className="btn secondary small desktop-auth" href="/profile">
                <UserRound size={14} strokeWidth={1.8} />
                Profile
              </Link>
              <button
                type="button"
                className="btn secondary small desktop-auth"
                onClick={logout}
              >
                <LogOut size={14} strokeWidth={1.8} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                className="btn secondary small desktop-auth"
                href="/login"
              >
                <LogIn size={14} strokeWidth={1.8} />
                Login
              </Link>

              <Link
                className="btn primary small desktop-auth"
                href="/register"
              >
                <UserRound size={14} strokeWidth={1.8} />
                Register
              </Link>
            </>
          )}

          {onMenuClick ? (
            <button
              type="button"
              className="mobile-menu-trigger"
              onClick={onMenuClick}
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} strokeWidth={1.9} /> : <Menu size={18} strokeWidth={1.9} />}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}