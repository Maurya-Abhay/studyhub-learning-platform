'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardPaste, Eye, Upload } from 'lucide-react';

export function JsonBulkBox({
  endpoint,
  title,
  description,
  example,
  onImported,
  beforeSend,
  recordDefaults,
  syncFields,
}: {
  endpoint: string;
  title: string;
  description: string;
  example: string;
  onImported?: () => void;
  beforeSend?: (records: Record<string, unknown>[]) => Record<string, unknown>[];
  recordDefaults?: Record<string, unknown>;
  syncFields?: Record<string, unknown>;
}) {
  const [value, setValue] = useState(example);
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!syncFields) return;
    try {
      const parsed = JSON.parse(value);
        const records: unknown[] | null = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed.records) ? parsed.records : null;
      if (!records) return;
      setValue(JSON.stringify(records.map((record) => ({ ...(record as Record<string, unknown>), ...syncFields })), null, 2));
      setPreview(null);
    } catch {
      // Keep invalid user input untouched until it can be parsed.
    }
  }, [syncFields]);

  useEffect(() => {
    if (!endpoint.includes('kind=dsa')) return;
    function syncDsaTopic(event: Event) {
      const select = event.target as HTMLSelectElement;
      if (!select.matches('select') || !select.value) return;
      const label = select.previousElementSibling?.textContent ?? '';
      if (!label.includes('Topic for all imported problems')) return;
      try {
        const parsed = JSON.parse(value);
          const records: unknown[] | null = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed.records) ? parsed.records : null;
        if (!records) return;
        const updated = JSON.stringify(records.map((record) => ({ ...(record as Record<string, unknown>), topicId: select.value })), null, 2);
        if (updated !== value) {
          setValue(updated);
          setPreview(null);
        }
      } catch {
        return;
      }
    }
    document.addEventListener('change', syncDsaTopic);
    return () => document.removeEventListener('change', syncDsaTopic);
  }, [endpoint, value]);

  const prettyCount = useMemo(() => preview?.length ?? 0, [preview]);

  function parse() {
    setMessage('');
    try {
      const parsed = JSON.parse(value);
        const records: unknown[] | null = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed.records) ? parsed.records : null;
      if (!records) throw new Error('Paste a JSON array or an object containing items/records.');
      if (records.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('Every JSON item must be an object.');
      const normalizedRecords = records as Record<string, unknown>[];
      setPreview(beforeSend ? beforeSend(normalizedRecords) : normalizedRecords.map((record) => ({ ...record, ...recordDefaults })));
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : 'Invalid JSON.');
    }
  }

  async function importRecords() {
    if (!preview?.length) {
      parse();
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const records = beforeSend ? beforeSend(preview) : preview;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'bulk', records }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed.');
      setMessage(`${data.imported ?? records.length} records imported as saved database content.`);
      onImported?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface card json-bulk-box">
      <div className="section-head">
        <div>
          <div className="eyebrow"><ClipboardPaste size={13} /> Bulk JSON</div>
          <h2 className="title" style={{ fontSize: 21 }}>{title}</h2>
          <p className="small muted">{description}</p>
        </div>
        {preview ? <span className="chip active"><CheckCircle2 size={13} /> {prettyCount} ready</span> : null}
      </div>

      <textarea
        className="json-editor"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setPreview(null);
        }}
        spellCheck={false}
        aria-label="Bulk JSON input"
      />

      <div className="json-actions">
        <button type="button" className="btn secondary small" onClick={() => setValue(example)}>
          Reset example
        </button>
        <button type="button" className="btn secondary small" onClick={parse}>
          <Eye size={13} /> Preview
        </button>
        <button type="button" className="btn primary small" onClick={importRecords} disabled={busy}>
          <Upload size={13} /> {busy ? 'Importing...' : 'Import'}
        </button>
      </div>

      {preview ? (
        <pre className="json-preview">{JSON.stringify(preview, null, 2)}</pre>
      ) : null}

      {message ? <div className="notice" style={{ marginTop: 10 }}>{message}</div> : null}
    </section>
  );
}
