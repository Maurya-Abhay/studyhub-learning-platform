'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

export function BackupDownload() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function download() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/backup');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to create backup.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `studyhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create backup.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="backup-action"><button type="button" className="btn primary" onClick={download} disabled={busy}><Download size={15} />{busy ? 'Preparing backup...' : 'Download backup'}</button>{message && <span className="small muted">{message}</span>}</div>;
}