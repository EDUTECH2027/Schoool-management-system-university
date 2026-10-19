import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Zap, Play, Pencil, Ban, ClipboardList, Users, BookOpen, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../api/client';
import type { ElCourse, ElSession } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../composants/ui/ConfirmDialog';
import ScheduleModal from '../../composants/elearning/ScheduleModal';
import { StatusPill, fmtRange, EmptyState, AttendanceModal, useNow } from '../../composants/elearning/shared';
import ResourcesPanel from '../../composants/elearning/ResourcesPanel';

type Tab = 'upcoming' | 'completed' | 'cancelled' | 'materials';
const BASE = '/teacher/e-learning';

export default function TeacherELearning() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const nav = useNavigate();
  const now = useNow();

  const [courses, setCourses] = useState<ElCourse[]>([]);
  const [sessions, setSessions] = useState<ElSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('upcoming');
  const [modal, setModal] = useState<{ editing?: ElSession; preset?: ElCourse } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<ElSession | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<ElSession | null>(null);
  const [busyId, setBusyId] = useState('');
  const [instantFor, setInstantFor] = useState(false);
  const [instantKey, setInstantKey] = useState('');
  const [instantTitle, setInstantTitle] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api.elCourses(), api.elSessions()]);
      setCourses(c); setSessions(s); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const live = sessions.filter(s => s.status === 'live');
  const groups = useMemo(() => ({
    upcoming: sessions.filter(s => s.status === 'scheduled').sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    completed: sessions.filter(s => s.status === 'ended'),
    cancelled: sessions.filter(s => s.status === 'cancelled'),
  }), [sessions]);

  const run = async (s: ElSession, fn: () => Promise<unknown>) => {
    setBusyId(s.id); setError('');
    try { await fn(); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusyId(''); }
  };

  const start = (s: ElSession) => run(s, async () => { await api.elStart(s.id); nav(`${BASE}/room/${s.id}`); });

  const startInstant = async () => {
    const [class_id, ...rest] = instantKey.split('|');
    if (!class_id) return;
    setError('');
    try {
      const s = await api.elCreateSession({ class_id, subject_name: rest.join('|'), title: instantTitle.trim() || (fr ? 'Cours en direct' : 'Live class'), instant: true });
      nav(`${BASE}/room/${s.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  };

  const canStart = (s: ElSession) => now >= new Date(s.starts_at).getTime() - 15 * 60_000 && now <= new Date(s.ends_at).getTime();

  const list = tab === 'materials' ? [] : groups[tab];
  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: fr ? 'À venir' : 'Upcoming' },
    { key: 'completed', label: fr ? 'Terminés' : 'Completed' },
    { key: 'cancelled', label: fr ? 'Annulés' : 'Cancelled' },
    { key: 'materials', label: fr ? 'Supports de cours' : 'Materials' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">E-Learning</h1>
          <p className="text-sm text-slate-500">{fr ? 'Donnez vos cours en ligne à vos étudiants.' : 'Teach your students online.'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setInstantFor(true)} disabled={!courses.length}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2">
            <Zap size={16} /> {fr ? 'Cours instantané' : 'Start instant class'}
          </button>
          <button onClick={() => setModal({})} disabled={!courses.length}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            <Plus size={16} /> {fr ? 'Programmer un cours' : 'Create Class'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : (
        <>
          {live.map(s => (
            <div key={s.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <StatusPill status="live" />
                <p className="font-semibold text-slate-800 mt-1 truncate">{s.title}</p>
                <p className="text-sm text-slate-600">{s.subject_name} · {s.class_name}</p>
              </div>
              <button onClick={() => nav(`${BASE}/room/${s.id}`)} className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 flex items-center gap-2">
                <Video size={16} /> {fr ? 'Retourner en classe' : 'Return to classroom'}
              </button>
            </div>
          ))}

          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Mes cours' : 'My courses'}</h2>
            {courses.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200">
                <EmptyState icon={BookOpen} title={fr ? 'Aucun cours assigné' : 'No courses assigned yet'}
                  hint={fr ? 'Demandez à l’administration de vous affecter à une classe dans l’emploi du temps.' : 'Ask the administration to assign you to a class in the timetable.'} />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {courses.map(c => (
                  <button key={`${c.class_id}|${c.subject_name}`} onClick={() => setModal({ preset: c })}
                    className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-400 hover:shadow-sm transition">
                    <p className="font-semibold text-slate-800">{c.subject_name}</p>
                    <p className="text-sm text-slate-500">{c.class_name}</p>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Users size={12} /> {c.student_count ?? 0} {fr ? 'étudiants' : 'students'}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <div role="tablist" className="flex gap-1 border-b border-slate-200 mb-3">
              {tabs.map(t => (
                <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                  className={clsx('px-4 py-2 text-sm font-medium -mb-px border-b-2', tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                  {t.label} {t.key !== 'materials' && <span className="text-xs text-slate-400">({groups[t.key].length})</span>}
                </button>
              ))}
            </div>

            {tab === 'materials' ? <ResourcesPanel mode="teacher" courses={courses} sessions={sessions} /> : list.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200">
                <EmptyState icon={Video} title={fr ? 'Aucun cours ici' : 'No classes here'}
                  hint={tab === 'upcoming' ? (fr ? 'Programmez votre premier cours en ligne.' : 'Schedule your first online class.') : undefined} />
              </div>
            ) : (
              <ul className="space-y-3">
                {list.map(s => (
                  <li key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill status={s.effective_status} />
                        <span className="text-xs text-slate-500">{s.subject_name} · {s.class_name}</span>
                      </div>
                      <p className="font-semibold text-slate-800 mt-1">{s.title}</p>
                      <p className="text-sm text-slate-500">{fmtRange(s.starts_at, s.ends_at, lang)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.status === 'scheduled' && (
                        <>
                          <button onClick={() => start(s)} disabled={!canStart(s) || busyId === s.id}
                            title={canStart(s) ? '' : (fr ? 'Disponible 15 min avant le début' : 'Available 15 minutes before start')}
                            className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-40 flex items-center gap-1.5">
                            {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {fr ? 'Démarrer' : 'Start class'}
                          </button>
                          <button onClick={() => setModal({ editing: s })} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><Pencil size={14} /> {fr ? 'Modifier' : 'Edit'}</button>
                          <button onClick={() => setConfirmCancel(s)} className="px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 flex items-center gap-1.5"><Ban size={14} /> {fr ? 'Annuler' : 'Cancel'}</button>
                        </>
                      )}
                      {s.status === 'live' && (
                        <button onClick={() => nav(`${BASE}/room/${s.id}`)} className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-1.5"><Video size={14} /> {fr ? 'Entrer' : 'Enter'}</button>
                      )}
                      {(s.status === 'ended' || s.status === 'live') && (
                        <button onClick={() => setAttendanceFor(s)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><ClipboardList size={14} /> {fr ? 'Présence' : 'Attendance'}</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {modal && (
        <ScheduleModal courses={courses} editing={modal.editing} presetCourse={modal.preset}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {attendanceFor && <AttendanceModal session={attendanceFor} onClose={() => setAttendanceFor(null)} />}
      {confirmCancel && (
        <ConfirmDialog
          title={fr ? 'Annuler ce cours ?' : 'Cancel this class?'}
          message={`“${confirmCancel.title}” — ${fmtRange(confirmCancel.starts_at, confirmCancel.ends_at, lang)}`}
          sub={fr ? 'Les étudiants ne pourront plus le rejoindre.' : 'Students will no longer be able to join it.'}
          confirmLabel={fr ? 'Annuler le cours' : 'Cancel class'} cancelLabel={fr ? 'Retour' : 'Keep'}
          onCancel={() => setConfirmCancel(null)}
          onConfirm={() => { const s = confirmCancel; setConfirmCancel(null); run(s, () => api.elCancel(s.id)); }}
        />
      )}
      {instantFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setInstantFor(false)}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-slate-800">{fr ? 'Démarrer un cours maintenant' : 'Start a class now'}</h2>
            <select value={instantKey} onChange={e => setInstantKey(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">{fr ? '— Cours —' : '— Course —'}</option>
              {courses.map(c => <option key={`${c.class_id}|${c.subject_name}`} value={`${c.class_id}|${c.subject_name}`}>{c.subject_name} — {c.class_name}</option>)}
            </select>
            <input value={instantTitle} onChange={e => setInstantTitle(e.target.value)} placeholder={fr ? 'Titre (facultatif)' : 'Title (optional)'} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setInstantFor(false)} className="px-4 py-2 text-sm rounded-lg border border-slate-300">{fr ? 'Annuler' : 'Cancel'}</button>
              <button onClick={startInstant} disabled={!instantKey} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white font-medium disabled:opacity-50">{fr ? 'Démarrer' : 'Start now'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
