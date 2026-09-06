import { PublicShell } from '@/components/study/public-shell';

export const metadata = {
  title: 'Terms and Conditions | StudyHub',
  description: 'Terms for using the StudyHub learning platform.',
};

export default function TermsPage() {
  return <PublicShell>
    <main className="page legal-page">
      <div className="container">
        <header className="legal-header">
          <div className="eyebrow">Legal</div>
          <h1 className="title">Terms and Conditions</h1>
          <p className="subtitle">Last updated: September 6, 2026</p>
        </header>

        <article className="surface card legal-card">
          <h2>Using StudyHub</h2>
          <p>StudyHub provides educational content, courses, practice problems and progress tools. By using the platform, you agree to use it lawfully and follow these terms.</p>

          <h2>Your account</h2>
          <p>You are responsible for keeping your login details private and for activity performed through your account. Provide accurate information and tell the administrator if you believe your account has been accessed without permission.</p>

          <h2>Learning content</h2>
          <p>StudyHub content is provided for learning and practice. You may use it for personal educational purposes, but you may not copy, resell, redistribute or present the content as your own without permission.</p>
          <p>Practice results, certificates and progress records may depend on the accuracy and availability of the platform.</p>

          <h2>Acceptable behavior</h2>
          <ul>
            <li>Do not attempt to bypass authentication or access another person’s data.</li>
            <li>Do not upload malicious code, harmful content or material you do not have permission to use.</li>
            <li>Do not abuse, overload, scrape or disrupt the service.</li>
            <li>Do not use certificates or assessment results deceptively.</li>
          </ul>

          <h2>Availability and changes</h2>
          <p>Features, content and availability may change as StudyHub is maintained. We may suspend access when needed for security, maintenance or a violation of these terms.</p>

          <h2>Disclaimer</h2>
          <p>StudyHub is an educational tool and does not guarantee a particular academic, employment or examination outcome. Use the content with your own judgment and verify important information independently.</p>

          <h2>Contact</h2>
          <p>Questions about these terms should be directed to the StudyHub administrator or support contact provided by your organization.</p>
        </article>
      </div>
    </main>
  </PublicShell>;
}
