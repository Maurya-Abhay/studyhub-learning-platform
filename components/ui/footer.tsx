import Link from 'next/link';
import { BookOpen, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <BookOpen size={15} strokeWidth={2} />
            </span>
            StudyHub
          </Link>

          <p className="small footer-description">
            Structured learning, practical exercises and progress that stays
            visible.
          </p>
        </div>

        <div className="footer-links" aria-label="Footer navigation">
          <Link href="/study">
            Notes
            <ArrowUpRight size={13} />
          </Link>

          <Link href="/study/courses">
            Courses
            <ArrowUpRight size={13} />
          </Link>

          <Link href="/login">
            Login
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </footer>
  );
}