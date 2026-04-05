import { useState, useRef } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button, Modal } from '../../components/ui';
import { ParishionersTable } from '../../components/admin/ParishionersTable';

// ── Bulk Upload Modal ─────────────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'other_names', 'gender', 'date_of_birth',
  'mobile_number', 'email_address', 'marital_status', 'hometown', 'region', 'country',
].join(',');

function BulkUploadModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const client = useSDK();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = () => { setFile(null); setPreview([]); setResult(null); };

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const lines = (e.target?.result as string).split('\n').filter(Boolean);
      const rows = lines.slice(0, 6).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const downloadTemplate = () => {
    const blob = new Blob(
      [CSV_TEMPLATE_HEADERS + '\nJohn,Doe,,male,1990-01-15,+233200000000,john@email.com,single,Accra,Greater Accra,Ghana'],
      { type: 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'parishioners_template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await client.uploadParishionersCsv(file);
      const data = res.data ?? (res as unknown as { created: number; skipped: number; errors: string[] });
      setResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} parishioner${data.created !== 1 ? 's' : ''} imported`);
        onSaved();
      }
    } catch (err) {
      toastApiError(err, 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const previewHeaders = preview[0] ?? [];
  const previewRows = preview.slice(1);

  return (
    <Modal
      open={open} onClose={() => { onClose(); resetState(); }} size="xl"
      title="Bulk Import Parishioners"
      description="Upload a CSV file to import multiple parishioners at once"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs">
            Download template CSV
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { onClose(); resetState(); }} disabled={uploading}>Cancel</Button>
            <Button size="sm" isLoading={uploading} disabled={!file || !!result} onClick={handleUpload}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file ? 'border-[#4cb8d7]/60 bg-[#e6f7fb]/40' : 'border-border hover:border-navy/30 hover:bg-muted/30'
          }`}
        >
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-[#2d7d96]' : 'text-muted-foreground/40'}`} />
          {file ? (
            <div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground">Drop a CSV file here</p>
              <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
            </div>
          )}
        </div>

        <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Required columns</p>
          <p><span className="font-mono text-navy">first_name</span>, <span className="font-mono text-navy">last_name</span>, <span className="font-mono text-navy">gender</span> (male/female/other)</p>
          <p className="mt-0.5">Optional: <span className="font-mono">other_names, date_of_birth, mobile_number, email_address, marital_status, hometown, region, country</span></p>
        </div>

        {previewRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Preview — {previewRows.length} row{previewRows.length !== 1 ? 's' : ''} shown
            </p>
            <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {previewHeaders.map((h, i) => (
                      <th key={i} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/20">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[120px] truncate">{cell || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className={`rounded-lg px-4 py-3 text-sm ${result.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className="font-semibold text-foreground mb-1">Import complete</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-700 font-medium">{result.created} created</span>
              {result.skipped > 0 && <> · <span className="text-amber-700 font-medium">{result.skipped} skipped</span></>}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-red-700 list-disc list-inside">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminParishioners() {
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <>
      <ParishionersTable
        basePath="/admin/parishioners"
        addPath="/admin/parishioners/new"
        tokenKey="admin_token"
        showUnitFilter
        canAdd
        canMessage
        canWrite
        canExport
        accentColor="navy"
        extraHeaderButtons={
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <Upload className="w-3.5 h-3.5" /> Bulk Import
          </Button>
        }
      />
      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSaved={() => setBulkOpen(false)}
      />
    </>
  );
}
