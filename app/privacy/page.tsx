import { PublicShell } from '@/components/study/public-shell';

export const metadata = {
  title: 'Privacy Policy | StudyHub',
  description: 'How StudyHub handles account, learning and usage information.',
};

export default function PrivacyPage() {
  return <PublicShell>
    <main className="page legal-page">
      <div className="container">
        <header className="legal-header">
          <div className="eyebrow">Legal</div>
          <h1 className="title">Privacy Policy</h1>
          <p className="subtitle">Last updated: September 6, 2026</p>
        </header>

        <article className="surface card legal-card">
          <h2>What we collect</h2>
          <p>StudyHub collects the information needed to provide the learning service, such as your name, email address, account details, course progress, notes, bookmarks, schedules and test activity.</p>
          <p>Public pages can be viewed without an account. We do not need personal information to show published learning content.</p>

          <h2>How we use information</h2>
          <ul>
            <li>To sign you in and keep your account secure.</li>
            <li>To save progress, notes, schedules, bookmarks and certificates.</li>
            <li>To provide course, test and coding features you choose to use.</li>
            <li>To maintain, troubleshoot and improve the platform.</li>
          </ul>

          <h2>Sharing and storage</h2>
          <p>We do not sell your personal information. Account and learning data is stored with our service providers only as needed to operate StudyHub, authenticate users and store application data.</p>
          <p>Your private learning data is intended to be available only to you and authorized administrators who need it to operate the service.</p>

          <h2>Cookies and sessions</h2>
          <p>StudyHub uses authentication cookies and session storage required to keep you signed in and protect private pages. Optional analytics or advertising cookies are not required for the core learning experience.</p>

          <h2>Your choices</h2>
          <p>You can stop using the service at any time. For account-data questions or deletion requests, contact the StudyHub administrator through the account support channel provided by your organization.</p>

          <h2>Policy updates</h2>
          <p>We may update this policy when the service changes. The latest version will always be available on this page with its update date.</p>
        </article>
      </div>
    </main>
  </PublicShell>;
}
