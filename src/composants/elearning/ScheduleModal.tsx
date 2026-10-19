import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { ElCourse, ElSession } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import { toLocalInput } from './shared';

interface Props {
  courses: ElCourse[];
  editing?: ElSession | null;
  presetCourse?: ElCourse | null;
  onClose: () => void;
  onSaved: (s: ElSession) => void;
}

const field = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function ScheduleModal({ courses, editing, presetCourse, onClose, onSaved }: Props) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';

  const [courseKey, setCourseKey] = useState(
    editing ? `${editing.class_id}|${editing.subject_name}` : presetCourse ? `${presetCourse.class_id}|${presetCourse.subject_name}` : '',
  );
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [start, setStart] = useState(() => toLocalInput(editing ? editing.starts_at : Math.ceil((Date.now() + 3_600_000) / 900_000) * 900_000));
  const [end, setEnd] = useState(() => toLocalInput(editing ? editing.ends_at : Math.ceil((Date.now() + 3_600_000) / 900_000) * 900_000 + 3_600_000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // keep the class length when the start moves
  const onStart = (v: string) => {
    const len = new Date(end).getTime() - new Date(start).getTime();
    setStart(v);
    if (v && len > 0) setEnd(toLocalInput(new Date(new Date(v).getTime() + len)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!editing && !courseKey) return setError(fr ? 'Choisissez un cours' : 'Please choose a course');
    if (!title.trim()) return setError(fr ? 'Le titre est obligatoire' : 'A title is required');
    const starts_at = new Date(start).toISOString();
    const ends_at = new Date(end).toISOString();
    setBusy(true);
    try {
      let saved: ElSession;
      if (editing) {
        saved = await api.elUpdateSession(editing.id, { title, description, starts_at, ends_at });
      } else {
        const [class_id, ...rest] = courseKey.split('|');
        saved = await api.elCreateSession({ class_id, subject_name: rest.join('|'), title, description, starts_at, ends_at });
      }
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" onSubmit={submit} onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">
            {editing ? (fr ? 'Reprogrammer / modifier le cours' : 'Edit / reschedule class') : (fr ? 'Programmer un cours en ligne' : 'Schedule an online class')}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Cours' : 'Course'}</label>
              <select value={courseKey} onChange={e => setCourseKey(e.target.value)} className={field} required>
                <option value="">{fr ? '— Sélectionner —' : '— Select —'}</option>
                {courses.map(c => (
                  <option key={`${c.class_id}|${c.subject_name}`} value={`${c.class_id}|${c.subject_name}`}>
                    {c.subject_name} — {c.class_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Titre' : 'Class title'}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={150} className={field} placeholder={fr ? 'ex. Chapitre 3 — Algèbre linéaire' : 'e.g. Chapter 3 — Linear algebra'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Description (facultatif)' : 'Description (optional)'}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={1000} className={field} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Début' : 'Starts'}</label>
              <input type="datetime-local" value={start} onChange={e => onStart(e.target.value)} className={field} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Fin' : 'Ends'}</label>
              <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className={field} required />
            </div>
          </div>
          <p className="text-xs text-slate-500">{fr ? 'Les heures sont affichées dans votre fuseau horaire.' : 'Times are shown in your local time zone.'}</p>
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">{fr ? 'Annuler' : 'Cancel'}</button>
          <button type="submit" disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />}{editing ? (fr ? 'Enregistrer' : 'Save changes') : (fr ? 'Programmer' : 'Schedule class')}
          </button>
        </div>
      </form>
    </div>
  );
}
