import { AlertTriangle, CalendarClock } from 'lucide-react';
import { acad } from '../../api/academics';
import { Badge, ErrorBox, PageHeader, Spinner, StatusBadge, fmtDate, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

export default function StudentExams() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const ex = useLoad(acad.myExams);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mes examens' : 'My exams'} subtitle={fr ? 'Calendrier des examens de vos cours inscrits et éligibilité' : 'Timetable for the courses you are registered in, and your eligibility'} onRefresh={() => void ex.reload()} />
      <ErrorBox message={ex.error} />
      {!ex.data ? <Spinner /> : ex.data.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">{fr ? 'Aucun examen planifié pour vos cours.' : 'No exams are scheduled for your courses yet.'}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {ex.data.map(e => (
            <article key={e.id} className={`bg-white rounded-xl border p-4 space-y-2 ${e.eligible === false ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="flex items-start gap-2"><div className="mr-auto min-w-0"><h3 className="font-semibold text-slate-800">{e.title}</h3><p className="text-xs text-slate-400 font-mono">{e.code} · {e.kind}</p></div>{e.date < today ? <Badge tone="slate">{fr ? 'passé' : 'past'}</Badge> : <StatusBadge status={e.status} />}</div>
              <p className="flex items-center gap-2 text-sm text-slate-700"><CalendarClock size={15} className="text-indigo-500" />{fmtDate(e.date, lang)} · {e.start_time}–{e.end_time}{e.room ? ` · ${e.room}` : ''}</p>
              {e.eligible === false && <div className="text-xs text-red-700 bg-red-50 rounded-lg p-2 flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{fr ? 'Vous n’êtes pas autorisé(e) à composer : ' : 'You are not cleared to sit this exam: '}{e.reasons?.map(r => r.message).join(' ')} {fr ? 'Contactez la scolarité.' : 'Contact the registry.'}</span></div>}
              {e.eligible === true && <p className="text-xs text-emerald-600">{fr ? 'Éligible' : 'Eligible'}</p>}
              {e.eligible === null && <p className="text-xs text-slate-400">{fr ? 'Liste des candidats pas encore publiée.' : 'Candidate list not published yet.'}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
