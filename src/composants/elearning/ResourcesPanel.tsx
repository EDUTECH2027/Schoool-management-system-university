import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Link2, Download, Eye, Trash2, Plus, X, Loader2, FolderOpen, ExternalLink } from 'lucide-react';
import { api } from '../../api/client';
import type { ElCourse, ElResource, ElSession } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import { EmptyState } from './shared';
import RefreshButton from '../ui/RefreshButton';

const ALLOWED = '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.png,.jpg,.jpeg,.gif,.mp4,.webm,.mp3';
const PREVIEWABLE = /\.(pdf|png|jpe?g|gif|mp4|webm|mp3|txt)$/i;
const MAX_MB = 10;
const field = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const fmtSize = (b: number | null) => !b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

interface Props {
  mode: 'teacher' | 'student' | 'admin';
  courses?: ElCourse[];        // teacher: the courses they may upload to
  sessions?: ElSession[];      // teacher: to attach a material to a class
  filter?: { class_id?: string; subject_name?: string };
  compact?: boolean;
}

export default function ResourcesPanel({ mode, courses = [], sessions = [], filter, compact }: Props) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [items, setItems] = useState<ElResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<ElResource | null>(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try { setItems(await api.elResources(filter)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); throw e; }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const grouped = useMemo(() => {
    const m = new Map<string, ElResource[]>();
    for (const r of items) {
      const k = `${r.subject_name}${r.class_name ? ` — ${r.class_name}` : ''}`;
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()];
  }, [items]);

  const open = async (r: ElResource, download: boolean) => {
    if (r.kind === 'link' && r.url) { window.open(r.url, '_blank', 'noopener,noreferrer'); return; }
    setBusyId(r.id); setError('');
    const preview = !download && PREVIEWABLE.test(r.original_name ?? '');
    const win = preview ? window.open('', '_blank') : null;   // open synchronously so popup blockers allow it
    try {
      const blob = await api.elResourceBlob(r.id, preview);
      const url = URL.createObjectURL(blob);
      if (win) { win.location.href = url; }
      else { const a = document.createElement('a'); a.href = url; a.download = r.original_name ?? r.title; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { win?.close(); setError(e instanceof Error ? e.message : 'Could not open file'); }
    finally { setBusyId(''); }
  };

  return (
    <div className="space-y-4">
      {/* Refresh sits first, in the same place as in every gallery */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RefreshButton onRefresh={load} />
        {mode === 'teacher' && (
          <button onClick={() => setAdding(true)} disabled={!courses.length}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            <Plus size={16} /> {fr ? 'Partager un support' : 'Share Materials'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
        : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState icon={FolderOpen} title={fr ? 'Aucun support de cours' : 'No course materials yet'}
              hint={mode === 'teacher' ? (fr ? 'Partagez des PDF, présentations ou liens avec vos étudiants.' : 'Share PDFs, slides or links with your students.') : undefined} />
          </div>
        ) : grouped.map(([course, list]) => (
          <section key={course}>
            {!compact && <h3 className="text-sm font-semibold text-slate-600 mb-2">{course}</h3>}
            <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {list.map(r => (
                <li key={r.id} className="p-3 flex flex-wrap items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    {r.kind === 'link' ? <Link2 size={17} /> : <FileText size={17} />}
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.topic && <span className="inline-block bg-slate-100 text-slate-600 rounded px-1.5 mr-2">{r.topic}</span>}
                      {r.kind === 'file' ? `${r.original_name ?? ''} · ${fmtSize(r.size_bytes)} · ` : ''}
                      {new Date(r.created_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}
                      {mode !== 'teacher' && r.teacher_name ? ` · ${r.teacher_name}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {r.kind === 'link' ? (
                      <button onClick={() => open(r, false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1"><ExternalLink size={13} /> {fr ? 'Ouvrir' : 'Open'}</button>
                    ) : (
                      <>
                        {PREVIEWABLE.test(r.original_name ?? '') && (
                          <button onClick={() => open(r, false)} disabled={busyId === r.id} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1"><Eye size={13} /> {fr ? 'Aperçu' : 'Preview'}</button>
                        )}
                        <button onClick={() => open(r, true)} disabled={busyId === r.id} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                          {busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {fr ? 'Télécharger' : 'Download'}
                        </button>
                      </>
                    )}
                    {mode !== 'student' && (
                      <button onClick={() => setDel(r)} aria-label="Delete" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {adding && <ShareModal courses={courses} sessions={sessions} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load().catch(() => {}); }} />}
      {del && (
        <ConfirmDialog title={fr ? 'Supprimer ce support ?' : 'Delete this material?'} message={del.title}
          sub={fr ? 'Les étudiants n’y auront plus accès.' : 'Students will lose access to it.'}
          confirmLabel={fr ? 'Supprimer' : 'Delete'} cancelLabel={fr ? 'Annuler' : 'Cancel'}
          onCancel={() => setDel(null)}
          onConfirm={async () => { const r = del; setDel(null); try { await api.elDeleteResource(r.id); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } }} />
      )}
    </div>
  );
}

function ShareModal({ courses, sessions, onClose, onSaved }: { courses: ElCourse[]; sessions: ElSession[]; onClose: () => void; onSaved: () => void }) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [courseKey, setCourseKey] = useState(courses.length === 1 ? `${courses[0].class_id}|${courses[0].subject_name}` : '');
  const [kind, setKind] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [classId, ...rest] = courseKey.split('|');
  const subject = rest.join('|');
  const courseSessions = sessions.filter(s => s.class_id === classId && s.subject_name === subject && s.status !== 'cancelled');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!courseKey) return setError(fr ? 'Choisissez un cours' : 'Please choose a course');
    if (!title.trim()) return setError(fr ? 'Le titre est obligatoire' : 'A title is required');
    if (kind === 'file' && !file) return setError(fr ? 'Choisissez un fichier' : 'Please choose a file');
    if (kind === 'file' && file && file.size > MAX_MB * 1024 * 1024) return setError(fr ? `Fichier trop volumineux (max ${MAX_MB} Mo)` : `File too large (max ${MAX_MB} MB)`);
    if (kind === 'link' && !/^https?:\/\//i.test(url)) return setError(fr ? 'Le lien doit commencer par http(s)://' : 'The link must start with http(s)://');
    const f = new FormData();
    f.append('class_id', classId); f.append('subject_name', subject); f.append('title', title.trim());
    if (topic.trim()) f.append('topic', topic.trim());
    if (sessionId) f.append('session_id', sessionId);
    if (kind === 'file' && file) f.append('file', file); else f.append('url', url);
    setBusy(true);
    try { await api.elUploadResource(f); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{fr ? 'Partager un support de cours' : 'Share course material'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <select value={courseKey} onChange={e => { setCourseKey(e.target.value); setSessionId(''); }} className={field} required>
            <option value="">{fr ? '— Cours —' : '— Course —'}</option>
            {courses.map(c => <option key={`${c.class_id}|${c.subject_name}`} value={`${c.class_id}|${c.subject_name}`}>{c.subject_name} — {c.class_name}</option>)}
          </select>
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm" role="tablist">
            {(['file', 'link'] as const).map(k => (
              <button type="button" key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
                className={`flex-1 py-2 ${kind === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {k === 'file' ? (fr ? 'Fichier' : 'File') : (fr ? 'Lien externe' : 'External link')}
              </button>
            ))}
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={150} className={field} placeholder={fr ? 'Titre (ex. Cours 1 — Introduction)' : 'Title (e.g. Lecture 1 — Introduction)'} />
          <input value={topic} onChange={e => setTopic(e.target.value)} maxLength={80} className={field} placeholder={fr ? 'Thème / chapitre (facultatif)' : 'Topic / chapter (optional)'} />
          {kind === 'file'
            ? <div>
                <input type="file" accept={ALLOWED} onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />
                <p className="text-xs text-slate-500 mt-1">PDF, PowerPoint, Word, Excel, images, MP4/WebM, MP3, ZIP · max {MAX_MB} MB</p>
              </div>
            : <input value={url} onChange={e => setUrl(e.target.value)} className={field} placeholder="https://…" inputMode="url" />}
          {courseSessions.length > 0 && (
            <select value={sessionId} onChange={e => setSessionId(e.target.value)} className={field}>
              <option value="">{fr ? 'Associer à un cours en ligne (facultatif)' : 'Attach to a class session (optional)'}</option>
              {courseSessions.map(s => <option key={s.id} value={s.id}>{s.title} · {new Date(s.starts_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}</option>)}
            </select>
          )}
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">{fr ? 'Annuler' : 'Cancel'}</button>
          <button type="submit" disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />}{fr ? 'Partager' : 'Share'}
          </button>
        </div>
      </form>
    </div>
  );
}
