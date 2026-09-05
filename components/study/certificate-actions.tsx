'use client';

import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useState } from 'react';

export function CertificateActions({ certificateCode }: { certificateCode: string }) {
  const [busy, setBusy] = useState(false);

  async function downloadCertificate() {
    const sheet = document.querySelector<HTMLElement>('.certificate-sheet');
    if (!sheet || busy) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(sheet, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const image = canvas.toDataURL('image/png');
      const width = 297;
      const height = width * (canvas.height / canvas.width);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [width, height] });
      pdf.addImage(image, 'PNG', 0, 0, width, height, undefined, 'FAST');
      pdf.save(`certificate-${certificateCode}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return <button className="btn secondary small" type="button" onClick={downloadCertificate} disabled={busy}><Download size={14} /> {busy ? 'Preparing...' : 'Download PDF'}</button>;
}
