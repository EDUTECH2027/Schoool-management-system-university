import { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, X, Loader2 } from 'lucide-react';
import { api, mediaUrl } from '../../api/client';
import type { Student } from '../../api/client';

type StudentDoc = NonNullable<Student['documents']>[number];

export default function StudentProfile() {
  const [student, setStudent] = useState<Student | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.portalStudentProfile().then(setStudent).catch(() => {}); }, []);

  const handleFilePick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const created = await api.portalStudentUploadDocument(file, uploadTitle.trim() || undefined);
      setStudent(prev => prev ? { ...prev, documents: [created, ...(prev.documents ?? [])] } : prev);
      setUploadTitle('');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (doc: StudentDoc) => {
    setDeletingId(doc.id);
    try {
      await api.portalStudentDeleteDocument(doc.id);
      setStudent(prev => prev ? { ...prev, documents: (prev.documents ?? []).filter(d => d.id !== doc.id) } : prev);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Delete failed');
    }
    setDeletingId(null);
  };

  if (!student) return <div className="text-slate-500">Loading…</div>;

  const rows: [string, string][] = [
    ['Student No.', student.student_number],
    ['Full Name', `${student.first_name} ${student.last_name}`],
    ['Date of Birth', student.date_of_birth ?? '—'],
    ['Gender', student.gender ?? '—'],
    ['Speciality', student.class_name ?? '—'],
    ['Grade Level', student.grade_level_name ?? '—'],
    ['Admission Date', student.admission_date ?? '—'],
    ['Address', student.address ?? '—'],
    ['Guardian', student.guardian_name ?? '—'],
    ['Guardian Phone', student.guardian_phone ?? '—'],
    ['Relationship', student.guardian_relationship ?? '—'],
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Profile</h1>

      {/* Photo + identity banner */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden
          ${student.gender === 'female' ? 'bg-pink-200 text-pink-700' : 'bg-blue-200 text-blue-700'}`}>
          {student.photo_url
            ? <img src={mediaUrl(student.photo_url)} alt="" className="w-full h-full object-cover" />
            : <>{student.first_name[0]}{student.last_name[0]}</>}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{student.first_name} {student.last_name}</h3>
          <p className="text-slate-500 text-sm font-mono">{student.student_number}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center px-5 py-3.5">
            <span className="w-44 text-sm text-slate-500 shrink-0">{label}</span>
            <span className="text-sm text-slate-800 dark:text-slate-200">{value}</span>
          </div>
        ))}
      </div>

      {/* Documents — registration files plus anything the student attaches themselves */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Documents</p>

        {!!student.documents?.length && (
          <div className="space-y-1.5 mb-3">
            {student.documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/40 rounded-lg px-3 py-2"
              >
                <FileText size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                <a
                  href={mediaUrl(doc.file_url)} target="_blank" rel="noreferrer"
                  className="flex-1 min-w-0 truncate text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  {doc.title}
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  title="Remove"
                  className="shrink-0 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                >
                  {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add attachment row */}
        <div className="flex items-center gap-2 border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
          <input
            type="text"
            value={uploadTitle}
            onChange={e => setUploadTitle(e.target.value)}
            placeholder="Document title (optional)"
            disabled={uploading}
            className="flex-1 py-1.5 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={e => handleFilePick(e.target.files?.[0])}
            disabled={uploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
            {uploading ? 'Uploading…' : 'Add Attachment'}
          </button>
        </div>
        {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
      </div>
    </div>
  );
}
