import { DatabaseBackup, Download, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { BackupDownload } from '@/components/admin/backup-download';

export default function BackupPage() {
  return <DashboardShell admin><h1 className="title">Database backup</h1><div className="backup-layout"><section className="surface card backup-card"><div className="backup-icon"><DatabaseBackup size={24} /></div><h2>Export current database</h2><p className="muted">The backup includes content, course links, learner progress, notes, assessments, DSA data and activity logs. Authentication secrets are never included.</p><BackupDownload /></section><aside className="surface card backup-info"><div><ShieldCheck size={18} /><strong>Admin only</strong><span>Only admin accounts can generate a backup.</span></div><div><Download size={18} /><strong>JSON format</strong><span>Keep the downloaded file in a secure location.</span></div></aside></div></DashboardShell>;
}