import type { Profile } from '../../api/academics';
import { useLanguage } from '../../i18n/LanguageContext';
import { Badge, Stat, StatusBadge, fmtDate } from './ui';

/** One student's whole academic picture. Used by the student's own dashboard and by administrators. */
export default function ProfileCard({ p }: { p: Profile }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const cum = p.performance.cumulative;
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div className="mr-auto min-w-0"><h2 className="text-lg font-bold text-slate-800">{p.student.name}</h2><p className="text-sm text-slate-500">{p.student.matricule} · {p.student.programme ?? '—'} · {p.student.level ?? p.student.class_name ?? '—'}</p><p className="text-xs text-slate-400">{[p.student.faculty, p.student.department].filter(Boolean).join(' › ')}</p></div>
        <StatusBadge status={p.student.academic_status} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={fr ? 'GPA cumulé' : 'Cumulative GPA'} value={cum ? String(cum.gpa) : '—'} sub={cum ? `${cum.totalCreditHours} ${fr ? 'crédits' : 'credits'}` : (fr ? 'aucun résultat publié' : 'no published results')} />
        <Stat label={fr ? 'Crédits inscrits (semestre)' : 'Credits registered (semester)'} value={String(p.credits_registered)} sub={p.term?.name} />
        <Stat label={fr ? 'Assiduité' : 'Attendance'} value={p.attendance.rate != null ? `${p.attendance.rate}%` : '—'} sub={`${p.attendance.absent} ${fr ? 'absences' : 'absences'}`} tone={p.attendance.rate != null && p.attendance.rate < 75 ? 'warn' : undefined} />
        {p.finance && <Stat label={fr ? 'Solde scolarité' : 'Fee balance'} value={p.finance.balance.toLocaleString()} sub={`${fr ? 'payé' : 'paid'} ${p.finance.paid.toLocaleString()}`} tone={p.finance.balance > 0 ? 'warn' : 'good'} />}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">{fr ? 'Cours du semestre' : 'Courses this semester'}</h3>
          {p.registered_courses.length ? <ul className="divide-y divide-slate-100 text-sm">{p.registered_courses.map(c => <li key={c.id} className="py-2 flex items-center gap-2"><span className="font-mono text-xs text-slate-400">{c.code}</span><span className="text-slate-800 mr-auto">{c.course}</span><span className="text-xs text-slate-400">{c.credits} cr</span>{c.status !== 'registered' && <StatusBadge status={c.status} />}</li>)}</ul> : <p className="text-sm text-slate-400">{fr ? 'Aucune inscription' : 'No registrations'}</p>}
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3">{fr ? 'Résultats par semestre' : 'Results by semester'}</h3>
          {p.performance.by_term.length ? <ul className="divide-y divide-slate-100 text-sm">{p.performance.by_term.map((t, i) => <li key={i} className="py-2 flex items-center gap-2"><span className="text-slate-800 mr-auto">{t.academic_year} · {t.term}</span><span className="text-xs text-slate-400">{t.courses} {fr ? 'cours' : 'courses'}</span><Badge tone="indigo">GPA {t.gpa}</Badge></li>)}</ul> : <p className="text-sm text-slate-400">{fr ? 'Aucun résultat publié' : 'No published results'}</p>}
        </section>
      </div>
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">{fr ? 'Historique de parcours' : 'Enrolment history'}</h3>
        {p.enrollment_history.length ? <ol className="space-y-2 text-sm">{p.enrollment_history.map(h => <li key={h.id} className="border-l-2 border-indigo-200 pl-3"><p className="font-medium text-slate-800">{h.class_name ?? '—'} <span className="text-slate-400 font-normal">· {h.programme_name ?? ''} {h.level_name ?? ''}</span></p><p className="text-xs text-slate-500">{fmtDate(h.started_at, lang)} → {h.ended_at ? fmtDate(h.ended_at, lang) : (fr ? 'en cours' : 'current')}{h.reason ? ` · ${h.reason}` : ''}</p></li>)}</ol> : <p className="text-sm text-slate-400">—</p>}
      </section>
    </div>
  );
}
