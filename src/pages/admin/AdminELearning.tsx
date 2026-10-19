import { useCallback, useEffect, useMemo, useState } from 'react';
import { Video, ClipboardList, Ban, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { ElSession } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../composants/ui/ConfirmDialog';
import { StatusPill, fmtRange, EmptyState, AttendanceModal } from '../../composants/elearning/shared';
import ResourcesPanel from '../../composants/elearning/ResourcesPanel';

const FILTERS = ['all', 'live', 'scheduled', 'ended', 'cancelled', 'materials'] as const;

export default function AdminELearning() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [sessions, setSessions] = useState<ElSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all');
  const [attendanceFor, setAttendanceFor] = useState<ElSession | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<ElSession | null>(null);

  const load = useCallback(async () => {
    try { setSessions(await api.elSessions()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 30_000); return () => clearInterval(i); }, [load]);

  const rows = useMemo(() => filter === 'materials' ? [] : sessions.filter(s => filter === 'all' || s.status === filter), [sessions, filter]);
  const count = (k: string) => sessions.filter(s => s.status === k).length;
  const label = (k: typeof FILTERS[number]) => ({
    all: fr ? 'Tous' : 'All', live: fr ? 'En direct' : 'Live', scheduled: fr ? 'À venir' : 'Upcoming',
    ended: fr ? 'Terminés' : 'Completed', cancelled: fr ? 'Annulés' : 'Cancelled', materials: fr ? 'Supports de cours' : 'Materials',
  }[k]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">E-Learning</h1>
        <p className="text-sm text-slate-500">{fr ? 'Supervision des cours en ligne de l’établissement.' : 'Overview of online classes across the school.'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([['live', 'text-red-600'], ['scheduled', 'text-blue-600'], ['ended', 'text-slate-700'], ['cancelled', 'text-orange-600']] as const).map(([k, c]) => (
          <div key={k} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={`text-2xl font-bold ${c}`}>{count(k)}</p>
            <p className="text-xs text-slate-500">{label(k)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {FILTERS.map(f => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {label(f)}
          </button>
        ))}
      </div>

      {filter === 'materials' && <ResourcesPanel mode="admin" />}

      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {filter === 'materials' ? null : loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
        : rows.length === 0 ? <div className="bg-white rounded-xl border border-slate-200"><EmptyState icon={Video} title={fr ? 'Aucun cours en ligne' : 'No online classes'} /></div>
        : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">{fr ? 'Cours' : 'Class'}</th><th className="px-4 py-3">{fr ? 'Enseignant' : 'Teacher'}</th>
                  <th className="px-4 py-3">{fr ? 'Horaire' : 'Schedule'}</th><th className="px-4 py-3">{fr ? 'Statut' : 'Status'}</th>
                  <th className="px-4 py-3 text-right">{fr ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-medium text-slate-800">{s.title}</p><p className="text-xs text-slate-500">{s.subject_name} · {s.class_name}</p></td>
                    <td className="px-4 py-3 text-slate-600">{s.teacher_name}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtRange(s.starts_at, s.ends_at, lang)}</td>
                    <td className="px-4 py-3"><StatusPill status={s.effective_status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {(s.status === 'ended' || s.status === 'live') && (
                          <button onClick={() => setAttendanceFor(s)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1"><ClipboardList size={13} /> {fr ? 'Présence' : 'Attendance'}</button>
                        )}
                        {s.status === 'scheduled' && (
                          <button onClick={() => setConfirmCancel(s)} className="px-2.5 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1"><Ban size={13} /> {fr ? 'Annuler' : 'Cancel'}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {attendanceFor && <AttendanceModal session={attendanceFor} onClose={() => setAttendanceFor(null)} />}
      {confirmCancel && (
        <ConfirmDialog
          title={fr ? 'Annuler ce cours ?' : 'Cancel this class?'} message={confirmCancel.title}
          sub={`${confirmCancel.teacher_name} · ${fmtRange(confirmCancel.starts_at, confirmCancel.ends_at, lang)}`}
          confirmLabel={fr ? 'Annuler le cours' : 'Cancel class'} cancelLabel={fr ? 'Retour' : 'Keep'}
          onCancel={() => setConfirmCancel(null)}
          onConfirm={async () => {
            const s = confirmCancel; setConfirmCancel(null);
            try { await api.elCancel(s.id); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
          }}
        />
      )}
    </div>
  );
}
