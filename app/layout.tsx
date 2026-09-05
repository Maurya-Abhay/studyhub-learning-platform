import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ToastProvider } from '@/components/ui/toast-provider';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-plex',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StudyHub — Learn, Practice, Master',
  description: 'A dynamic learning platform with courses, topic workspaces, tests and DSA practice.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={plex.variable}>
        <ThemeProvider><ConfirmProvider><ToastProvider>{children}</ToastProvider></ConfirmProvider></ThemeProvider>
      </body>
    </html>
  );
}
