'use client';

import Link from 'next/link';
import { BarChart3, Bell, BookOpen, CalendarDays, ChevronRight, DatabaseBackup, FileText, LayoutDashboard, ListChecks, LogOut, Users, BrainCircuit, Award, FolderKanban, Sparkles, Route, UserRound } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Topbar } from '@/components/ui/topbar';
import type { Category, Topic } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/confirm-dialog';

const userLinks = [
  ['/dashboard','Overview',LayoutDashboard], ['/dashboard/roadmap','Roadmap',Route], ['/dashboard/schedule','Schedule',CalendarDays], ['/dashboard/progress','Progress',BarChart3],
  ['/dashboard/notes','Notes',FileText], ['/dashboard/bookmarks','Bookmarks',BookOpen], ['/dashboard/tests','Tests',ListChecks],
  ['/dashboard/certificates','Certificates',Award], ['/dashboard/notifications','Notifications',Bell], ['/dashboard/dsa','DSA',BrainCircuit], ['/dashboard/courses','Courses',FolderKanban],
] as const;

const adminLinks = [
  ['/admin','Overview',LayoutDashboard], ['/admin/categories','Categories',FolderKanban],
  ['/admin/topics','Topics',BookOpen], ['/admin/courses','Courses',FolderKanban], ['/admin/roadmaps','Roadmaps',Route], ['/admin/questions','Questions',ListChecks],
  ['/admin/tests','Tests',ListChecks], ['/admin/dsa','DSA Problems',BrainCircuit], ['/admin/users','Users',Users],
  ['/admin/certificates','Certificates',Award], ['/admin/backup','Database backup',DatabaseBackup], ['/admin/ai','AI Studio',Sparkles],
] as const;

const adminPageLabels: Record<string, string> = {
  '/admin': 'Dashboard',
  '/profile': 'Profile', '/admin/profile': 'Profile',
  '/admin/categories': 'Categories',
  '/admin/topics': 'Topics',
  '/admin/courses': 'Courses',
  '/admin/roadmaps': 'Roadmaps',
  '/admin/questions': 'Questions',
  '/admin/tests': 'Tests',
  '/admin/dsa': 'DSA Problems',
  '/admin/users': 'Users',
  '/admin/certificates': 'Certificates',
  '/admin/backup': 'Database backup',
  '/admin/ai': 'AI Studio',
};

export function DashboardShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const confirm = useConfirm();
  const isAdmin = admin || pathname.startsWith('/admin');
  const links = isAdmin ? adminLinks : userLinks;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLinkActive = (href: string) => href === (isAdmin ? '/admin' : '/dashboard') ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const [libraryOpen, setLibraryOpen] = useState(pathname.startsWith('/dashboard/notes'));
  const [dsaOpen, setDsaOpen] = useState(pathname.startsWith('/dashboard/dsa'));
  const [expandedCategory, setExpandedCategory] = useState('');
  const [expandedDsaTopic, setExpandedDsaTopic] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [dsaTopics, setDsaTopics] = useState<Array<{ id: string; name: string }>>([]);
  const [dsaProblems, setDsaProblems] = useState<Array<{ id: string; topicId?: string; title: string; slug: string }>>([]);

  async function logout() {
    if (!(await confirm({ title: 'Log out?', message: 'Your current session will be ended.', confirmLabel: 'Log out', danger: true }))) return;
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  useEffect(() => {
    setMobileNavOpen(false);
    setLibraryOpen(pathname.startsWith('/dashboard/notes'));
    setDsaOpen(pathname.startsWith('/dashboard/dsa'));
  }, [pathname]);

  useEffect(() => {
    if (isAdmin || !libraryOpen || categories.length) return;
    fetch('/api/study-library').then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      setCategories(data.categories ?? []);
      setTopics(data.topics ?? []);
    }).catch(() => undefined);
  }, [categories.length, isAdmin, libraryOpen]);

  useEffect(() => {
    if (isAdmin || !dsaOpen || dsaTopics.length) return;
    fetch('/api/dsa-library').then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      setDsaTopics(data.topics ?? []);
      setDsaProblems(data.problems ?? []);
    }).catch(() => undefined);
  }, [dsaOpen, dsaTopics.length, isAdmin]);

  return (
    <div className={`dashboard-frame ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      <Topbar onMenuClick={() => setMobileNavOpen((value) => !value)} mobileMenuOpen={mobileNavOpen} />
      <div className="dashboard-shell">
        {mobileNavOpen ? <button type="button" className="dashboard-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
        <aside className="dashboard-nav" aria-label={isAdmin ? 'Admin navigation' : 'Learning navigation'}>
          <div className="dashboard-nav-title">{isAdmin ? 'CONTROL CENTER' : 'MY LEARNING'}</div>
          <div className="side-list">
            {links.map(([href, label, Icon]) => <div key={href} className="dashboard-side-entry">
              <div className="dashboard-side-row">
                <Link href={href} className={`side-link ${isLinkActive(href) ? 'active' : ''}`}>
                  <Icon size={15} /><span>{label}</span>
                </Link>
                {!isAdmin && label === 'Notes' ? <button type="button" className={`dashboard-side-toggle ${libraryOpen ? 'expanded' : ''}`} onClick={() => setLibraryOpen((value) => !value)} aria-label={`${libraryOpen ? 'Collapse' : 'Expand'} notes topics`} aria-expanded={libraryOpen}><ChevronRight size={14} /></button> : null}
                {!isAdmin && label === 'DSA' ? <button type="button" className={`dashboard-side-toggle ${dsaOpen ? 'expanded' : ''}`} onClick={() => setDsaOpen((value) => !value)} aria-label={`${dsaOpen ? 'Collapse' : 'Expand'} DSA topics`} aria-expanded={dsaOpen}><ChevronRight size={14} /></button> : null}
              </div>
              {!isAdmin && label === 'Notes' && libraryOpen ? <div className="dashboard-library-nav">
                {categories.map((category) => {
                  const categoryTopics = topics.filter((topic) => topic.categoryId === category.id);
                  const expanded = expandedCategory === category.id;
                  return <div className={`dashboard-library-category ${expanded ? 'expanded' : ''}`} key={category.id}>
                    <button type="button" className="dashboard-category-row" onClick={() => setExpandedCategory(expanded ? '' : category.id)}><span>{category.name}</span><small>{categoryTopics.length}</small><ChevronRight size={12} /></button>
                    {expanded && <div className="dashboard-topic-items">{categoryTopics.map((topic) => <Link href={`/dashboard/notes?topic=${encodeURIComponent(topic.slug)}`} key={topic.id} className="dashboard-topic-link">{topic.title}</Link>)}</div>}
                  </div>;
                })}
              </div> : null}
              {!isAdmin && label === 'DSA' && dsaOpen ? <div className="dashboard-library-nav">
                {dsaTopics.map((dsaTopic) => {
                  const topicProblems = dsaProblems.filter((problem) => problem.topicId === dsaTopic.id);
                  const expanded = expandedDsaTopic === dsaTopic.id;
                  return <div className={`dashboard-library-category ${expanded ? 'expanded' : ''}`} key={dsaTopic.id}>
                    <button type="button" className="dashboard-category-row" onClick={() => setExpandedDsaTopic(expanded ? '' : dsaTopic.id)}><span>{dsaTopic.name}</span><small>{topicProblems.length}</small><ChevronRight size={12} /></button>
                    {expanded && <div className="dashboard-topic-items">{topicProblems.map((problem) => <Link href={`/dashboard/dsa?problem=${encodeURIComponent(problem.slug)}`} key={problem.id} className="dashboard-topic-link">{problem.title}</Link>)}</div>}
                  </div>;
                })}
              </div> : null}
            </div>)}
          </div>
          <Link href={isAdmin ? '/admin/profile' : '/profile'} className={`dashboard-sidebar-profile ${pathname === '/profile' || pathname === '/admin/profile' ? 'active' : ''}`}>
            <UserRound size={15} />
            <span>Profile</span>
          </Link>
          <button type="button" className="dashboard-sidebar-logout" onClick={logout}>
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </aside>
        <main className={`dashboard-main ${!isAdmin && pathname !== '/dashboard' ? 'learner-page' : ''} ${pathname.startsWith('/admin/') ? 'admin-compact-page' : ''} ${pathname === '/profile' || pathname === '/admin/profile' ? 'profile-page' : ''} ${pathname === '/admin/categories' ? 'category-page' : ''} ${['/admin/topics', '/admin/courses', '/admin/roadmaps', '/admin/questions', '/admin/tests', '/admin/dsa'].includes(pathname) ? 'admin-manager-page' : ''}`}>
          {(isAdmin || pathname === '/profile') && adminPageLabels[pathname] ? <div className="portal-breadcrumb">{pathname === '/admin' ? 'Dashboard' : `Dashboard / ${adminPageLabels[pathname]}`}</div> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
