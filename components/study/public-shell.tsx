'use client';

import Link from 'next/link';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight,
  Home,
  Layers3,
  LogIn,
  LogOut,
  Tags,
  UserRound,
  X,
} from 'lucide-react';

import { Topbar } from '@/components/ui/topbar';
import { Footer } from '@/components/ui/footer';
import { createClient } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { Category, DsaProblem, Topic } from '@/types';

const links = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
    exact: true,
  },
] as const;

type PublicShellProps = {
  children: ReactNode;
  categories?: Category[];
  topics?: Topic[];
  dsaTopics?: Array<{ id: string; name: string; slug: string }>;
  dsaProblems?: Array<Pick<DsaProblem, 'id' | 'topicId' | 'title' | 'slug' | 'difficulty'>>;
};

export function PublicShell(props: PublicShellProps) {
  return (
    <Suspense fallback={<div className="public-shell" />}>
      <PublicShellInner {...props} />
    </Suspense>
  );
}

function PublicShellInner({ children, categories = [], topics = [], dsaTopics = [], dsaProblems = [] }: PublicShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const confirm = useConfirm();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const activeCategory = categories.find((category) => {
    const categoryTopics = topics.filter((topic) => topic.categoryId === category.id);
    return pathname === `/study/category/${category.slug}` || categoryTopics.some((topic) => pathname === `/study/topic/${topic.slug}`);
  });
  const [expandedCategory, setExpandedCategory] = useState(activeCategory?.id ?? '');
  const [categoriesOpen, setCategoriesOpen] = useState(Boolean(activeCategory));

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthenticated(Boolean(data.session));
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setIsAuthenticated(Boolean(session));
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeCategory) setExpandedCategory(activeCategory.id);
  }, [activeCategory?.id]);

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  async function logout() {
    if (!(await confirm({ title: 'Log out?', message: 'Your current session will be ended.', confirmLabel: 'Log out', danger: true }))) return;
    await createClient().auth.signOut();
    setIsAuthenticated(false);
    closeMobileMenu();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="public-shell reference-dark">
      <Topbar
        onMenuClick={() => setMobileOpen((value) => !value)}
        mobileMenuOpen={mobileOpen}
      />

      {mobileOpen ? (
        <button
          type="button"
          className="public-mobile-backdrop"
          aria-label="Close navigation"
          onClick={closeMobileMenu}
        />
      ) : null}

      <aside
        className={`public-sidebar ${
          mobileOpen ? 'is-open' : ''
        }`}
        aria-label="Study navigation"
      >
        <div className="public-sidebar-top">
          <div className="public-nav-header">
            <span>LEARNING</span>

            <button
              type="button"
              className="public-sidebar-close"
              onClick={closeMobileMenu}
              aria-label="Close navigation"
            >
              <X size={17} strokeWidth={1.8} />
            </button>
          </div>

          <nav className="public-nav" aria-label="Study sections">
            {links.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return <Link href={href} key={label} className={`public-nav-link ${active ? 'active' : ''}`} onClick={closeMobileMenu}>
                <span className="public-nav-icon"><Icon size={15} strokeWidth={1.8} /></span>
                <span>{label}</span>
              </Link>;
            })}
          </nav>

          <div className="public-sidebar-section">
            {categories.length ? <button type="button" className="public-section-toggle" aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen((value) => !value)}><Tags size={14} /><span>Notes</span><ChevronRight size={14} /></button> : <Link href="/study" className={`public-section-toggle ${pathname.startsWith('/study') ? 'active' : ''}`} onClick={closeMobileMenu}><Tags size={14} /><span>Notes</span><ChevronRight size={14} /></Link>}
            {categoriesOpen && categories.length ? <div className="public-topic-nav">{categories.map((category) => {
              const categoryTopics = topics.filter((topic) => topic.categoryId === category.id);
              const expanded = expandedCategory === category.id;
              const toggleCategory = () => setExpandedCategory(expanded ? '' : category.id);
              return <div className={`public-topic-group ${expanded ? 'expanded' : ''}`} key={category.id}>
                <div className="public-topic-category-row"><Link href={`/study/category/${category.slug}`} className={`public-topic-category ${pathname === `/study/category/${category.slug}` ? 'active' : ''}`} onClick={closeMobileMenu}>{category.name}<span>{categoryTopics.length}</span></Link>{categoryTopics.length ? <button type="button" className="public-topic-toggle" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${category.name} topics`} aria-expanded={expanded} onClick={toggleCategory}><ChevronRight size={13} /></button> : null}</div>
                {expanded ? <div className="public-topic-items">{categoryTopics.map((topic) => <Link key={topic.id} href={`/study/topic/${topic.slug}`} className={`public-topic-link ${pathname === `/study/topic/${topic.slug}` ? 'active' : ''}`} onClick={closeMobileMenu}>{topic.title}</Link>)}</div> : null}
              </div>;
            })}</div> : null}
          </div>

          <Link href="/study/courses" className={`public-nav-link ${pathname.startsWith('/study/courses') ? 'active' : ''}`} onClick={closeMobileMenu}>
            <span className="public-nav-icon"><Layers3 size={15} strokeWidth={1.8} /></span>
            <span>Courses</span>
          </Link>

          <div className="public-sidebar-auth">
            {isAuthenticated ? <>
              <Link href="/profile" className="public-nav-link" onClick={closeMobileMenu}>
                <span className="public-nav-icon"><UserRound size={15} strokeWidth={1.8} /></span>
                <span>Profile</span>
              </Link>
              <button type="button" className="public-nav-link public-nav-button public-nav-logout" onClick={logout}>
                <span className="public-nav-icon"><LogOut size={15} strokeWidth={1.8} /></span>
                <span>Logout</span>
              </button>
            </> : <>
              <Link href="/login" className="public-nav-link" onClick={closeMobileMenu}>
                <span className="public-nav-icon"><LogIn size={15} strokeWidth={1.8} /></span>
                <span>Login</span>
              </Link>
              <Link href="/register" className="public-nav-link public-nav-register" onClick={closeMobileMenu}>
                <span className="public-nav-icon"><UserRound size={15} strokeWidth={1.8} /></span>
                <span>Register</span>
              </Link>
            </>}
          </div>
        </div>

      </aside>

      <div className="public-content">
        {children}
        <Footer />
      </div>
    </div>
  );
}