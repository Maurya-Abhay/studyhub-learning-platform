import Link from 'next/link';
export default function NotFound(){return <main className="auth-wrap"><div className="surface auth-card"><div className="eyebrow">404</div><h1 className="title">Page not found.</h1><p className="subtitle">The content you are looking for does not exist or is not published.</p><Link className="btn primary" href="/study">Back to study</Link></div></main>}
