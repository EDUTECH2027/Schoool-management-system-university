import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, BookOpen, Loader2, Clock, History, FolderOpen } from 'lucide-react';
import { api } from '../../api/client';
import type { ElCourse, ElSession } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import { StatusPill, fmtRange, EmptyState, useNow } from '../../composants/elearning/shared';
import ResourcesPanel from '../../composants/elearning/ResourcesPanel';

const BASE = '/student/e-learning';

export default function StudentELearning() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const nav = useNavigate();
  const now = useNow(15_000);

  const [courses, setCourses] = useState<ElCourse[]>([]);
  const [sessions, setSessions] = useState<ElSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api.elCourses(), api.elSessions()]);
      setCourses(c); setSessions(s); setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30_000); return () => clearInterval(i); }, [load]);

  const live = sessions.filter(s => s.status === 'live');
  const upcoming = useMemo(() => sessions.filter(s => s.status === 'scheduled' && new Date(s.ends_at).getTime() > now)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)), [sessions, now]);
  const past = sessions.filter(s => s.status === 'ended' || s.status === 'cancelled').slice(0, 20);

  const startsIn = (iso: string) => {
    const m = Math.round((new Date(iso).getTime() - now) / 60_000);
    if (m <= 0) return fr ? 'Devrait commencer' : 'Due to start';
    if (m < 60) return fr ? `Dans ${m} min` : `In ${m} min`;
    if (m < 1440) return fr ? `Dans ${Math.round(m / 60)} h` : `In ${Math.round(m / 60)} h`;
    return '';
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">E-Learning</h1>
        <p className="text-sm text-slate-500">{fr ? 'Rejoignez vos cours en ligne.' : 'Join your online classes.'}</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {live.map(s => (
        <div key={s.id} className="bg-gradient-to-r from-red-50 to-white border border-red-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <StatusPill status="live" />
            <p className="text-lg font-bold text-slate-800 mt-1">{s.title}</p>
            <p className="text-sm text-slate-600">{s.subject_name} · {s.teacher_name}</p>
          </div>
          <button onClick={() => nav(`${BASE}/room/${s.id}`)}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center gap-2 shadow-sm">
            <Video size={18} /> {fr ? 'Rejoindre le cours' : 'Join Class'}
          </button>
        </div>
      ))}

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2"><Clock size={14} /> {fr ? 'Prochains cours' : 'Upcoming classes'}</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState icon={Video} title={fr ? 'Aucun cours à venir' : 'No upcoming classes'} hint={fr ? 'Vos enseignants vous préviendront ici dès qu’un cours est programmé.' : 'Classes your teachers schedule will appear here.'} />
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map(s => (
              <li key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{s.subject_name} · {s.teacher_name}</p>
                  <p className="font-semibold text-slate-800">{s.title}</p>
                  <p className="text-sm text-slate-500">{fmtRange(s.starts_at, s.ends_at, lang)}</p>
                  {s.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.description}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600 font-medium mb-1">{startsIn(s.starts_at)}</p>
                  <button disabled className="px-4 py-2 rounded-lg bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed"
                    title={fr ? 'Disponible quand l’enseignant démarre le cours' : 'Available once the teacher starts the class'}>
                    {fr ? 'En attente de l’enseignant' : 'Waiting for teacher'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2"><BookOpen size={14} /> {fr ? 'Mes cours' : 'My courses'}</h2>
        {courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200"><EmptyState icon={BookOpen} title={fr ? 'Aucun cours' : 'No courses yet'} hint={fr ? 'Vous n’êtes inscrit à aucune classe.' : 'You are not enrolled in a class with scheduled courses.'} /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.map(c => (
              <div key={`${c.class_id}|${c.subject_name}`} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-800">{c.subject_name}</p>
                <p className="text-sm text-slate-500">{c.teacher_name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2"><FolderOpen size={14} /> {fr ? 'Supports de cours' : 'Course materials'}</h2>
        <ResourcesPanel mode="student" />
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2"><History size={14} /> {fr ? 'Cours passés' : 'Past classes'}</h2>
          <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {past.map(s => (
              <li key={s.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.subject_name} · {fmtRange(s.starts_at, s.ends_at, lang)}</p>
                </div>
                <StatusPill status={s.effective_status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
