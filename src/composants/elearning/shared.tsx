import { useEffect, useState } from 'react';
import { Radio, CalendarClock, CheckCircle2, XCircle, Clock, X, Users, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../api/client';
import type { ElSession, ElAttendanceReport } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';

type Eff = ElSession['effective_status'];

const STYLE: Record<Eff, { cls: string; icon: typeof Radio; en: string; fr: string }> = {
  live:      { cls: 'bg-red-100 text-red-700',        icon: Radio,         en: 'Live',      fr: 'En direct' },
  scheduled: { cls: 'bg-blue-100 text-blue-700',      icon: CalendarClock, en: 'Upcoming',  fr: 'À venir' },
  ended:     { cls: 'bg-slate-100 text-slate-600',    icon: CheckCircle2,  en: 'Completed', fr: 'Terminé' },
  cancelled: { cls: 'bg-orange-100 text-orange-700',  icon: XCircle,       en: 'Cancelled', fr: 'Annulé' },
  missed:    { cls: 'bg-yellow-100 text-yellow-700',  icon: Clock,         en: 'Not held',  fr: 'Non tenu' },
};

export function StatusPill({ status }: { status: Eff }) {
  const { lang } = useLanguage();
  const s = STYLE[status];
  const Icon = s.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', s.cls)}>
      <Icon size={12} className={status === 'live' ? 'animate-pulse' : ''} />
      {lang === 'fr' ? s.fr : s.en}
    </span>
  );
}

// Dates are stored in UTC and rendered in the viewer's own time zone.
export function fmtRange(startIso: string, endIso: string, lang: string) {
  const loc = lang === 'fr' ? 'fr-FR' : 'en-GB';
  const s = new Date(startIso), e = new Date(endIso);
  const day = s.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const t = (d: Date) => d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${t(s)} – ${t(e)}`;
}

export function fmtDuration(secs: number) {
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

// ISO <-> <input type="datetime-local"> (local time, no zone)
export function toLocalInput(iso: string | number | Date) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Re-render every `ms` so "starts in…" / Join availability stay accurate.
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return now;
}

export function EmptyState({ icon: Icon, title, hint }: { icon: typeof Radio; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4 text-slate-500">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3"><Icon size={26} className="text-slate-400" /></div>
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm mt-1 max-w-sm">{hint}</p>}
    </div>
  );
}

export function AttendanceModal({ session, onClose }: { session: ElSession; onClose: () => void }) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [data, setData] = useState<ElAttendanceReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.elAttendance(session.id).then(setData).catch(e => setError(e.message));
  }, [session.id]);

  const students = data?.attendees.filter(a => a.role === 'student') ?? [];
  const time = (iso: string) => new Date(iso).toLocaleTimeString(fr ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-800 truncate">{fr ? 'Présence' : 'Attendance'} — {session.title}</h2>
            <p className="text-sm text-slate-500">{fmtRange(session.starts_at, session.ends_at, lang)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5">
          {!data && !error && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {data && (
            <>
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <Users size={16} /> {students.length} / {data.enrolled_count} {fr ? 'étudiants présents' : 'students attended'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-500 border-b">
                      <th className="py-2 pr-3">{fr ? 'Nom' : 'Name'}</th><th className="py-2 pr-3">{fr ? 'Matricule' : 'Matricule'}</th>
                      <th className="py-2 pr-3">{fr ? 'Arrivée' : 'Joined'}</th><th className="py-2">{fr ? 'Durée' : 'Time in class'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map(a => (
                      <tr key={a.user_id}>
                        <td className="py-2 pr-3 font-medium text-slate-800">{a.name}{a.online && <span className="ml-2 text-xs text-green-600">● {fr ? 'en ligne' : 'online'}</span>}</td>
                        <td className="py-2 pr-3 text-slate-500">{a.student_number ?? '—'}</td>
                        <td className="py-2 pr-3 text-slate-500">{time(a.first_joined_at)}</td>
                        <td className="py-2 text-slate-700">{fmtDuration(a.total_seconds)}</td>
                      </tr>
                    ))}
                    {students.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-400">{fr ? 'Aucun étudiant n’a rejoint' : 'No student joined this class'}</td></tr>}
                  </tbody>
                </table>
              </div>
              {data.absent.length > 0 && session.status === 'ended' && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">{fr ? 'Absents' : 'Absent'} ({data.absent.length})</h3>
                  <ul className="text-sm text-slate-600 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                    {data.absent.map(a => <li key={a.student_id}>{a.name} <span className="text-slate-400">· {a.student_number}</span></li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
