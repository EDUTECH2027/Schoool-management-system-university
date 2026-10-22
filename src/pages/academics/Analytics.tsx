import { useMemo, useState, type ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import { analytics, type Filters } from '../../api/analytics';
import { Card, ColumnChart, Donut, Empty, Kpi, LineChart, PALETTE, RankBars, nf } from '../../composants/analytics/charts';
import { ErrorBox, PageHeader, Spinner, Table, Tabs, btnGhost, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import { useAuth } from '../../context/AuthContext';

type Tab = 'overview' | 'academics' | 'attendance' | 'exams' | 'finance' | 'trends';

const METHOD_FR: Record<string, string> = { orange_money: 'Orange Money', mtn_momo: 'MTN MoMo', stripe: 'Carte (Stripe)', bank_transfer: 'Virement bancaire' };
const METHOD_EN: Record<string, string> = { orange_money: 'Orange Money', mtn_momo: 'MTN MoMo', stripe: 'Card (Stripe)', bank_transfer: 'Bank transfer' };
const GENDER: Record<string, [string, string]> = { male: ['Male', 'Hommes'], female: ['Female', 'Femmes'], other: ['Other', 'Autre'], unspecified: ['Unspecified', 'Non précisé'] };
const OUTCOME: Record<string, [string, string]> = { promoted: ['Promoted', 'Admis'], carryover: ['Carry-over', 'Admis avec dettes'], repeat: ['Repeat', 'Redouble'], probation: ['Probation', 'Probation'], eligible_graduation: ['Graduation eligible', 'Diplômable'] };
const APPEAL: Record<string, [string, string]> = { submitted: ['Submitted', 'Soumises'], under_review: ['Under review', 'En examen'], upheld: ['Upheld', 'Acceptées'], rejected: ['Rejected', 'Rejetées'] };
const REASON: Record<string, [string, string]> = { attendance: ['Attendance below minimum', 'Assiduité insuffisante'], fees: ['Fees outstanding', 'Frais impayés'], unspecified: ['Unspecified', 'Non précisé'] };

function Section({ title, children }: { title: string; children: ReactNode }) { return <div className="space-y-3"><h2 className="sr-only">{title}</h2>{children}</div>; }

export default function Analytics() {
  const fr = useFr();
  const lang = fr ? 'fr' : 'en';
  const { user } = useAuth();
  const financeOnly = user?.role === 'finance_officer';
  const canFinance = financeOnly || user?.role === 'super_admin' || user?.role === 'head_teacher';
  const [tab, setTab] = useState<Tab>(financeOnly ? 'finance' : 'overview');
  const [f, setF] = useState<Filters>({});
  const [threshold, setThreshold] = useState(75);
  const [force, setForce] = useState(0);   // bumped by "Refresh" → bypasses the server cache once
  const opts = useLoad(() => analytics.filters(), []);
  const [err, setErr] = useState('');

  const year = opts.data?.years.find(y => y.id === f.academic_year_id);
  const termOptions = year ? year.terms : opts.data?.years.flatMap(y => y.terms.map(t => ({ ...t, name: `${y.label} · ${t.name}` }))) ?? [];
  const set = (patch: Filters) => setF(prev => ({ ...prev, ...patch }));
  const refresh = force > 0;

  const tabs = useMemo(() => {
    const all: { id: Tab; label: string }[] = [
      { id: 'overview', label: fr ? 'Vue d’ensemble' : 'Overview' }, { id: 'academics', label: fr ? 'Résultats' : 'Academics' },
      { id: 'attendance', label: fr ? 'Assiduité' : 'Attendance' }, { id: 'exams', label: 'Exams' }, { id: 'finance', label: fr ? 'Finances' : 'Finance' }, { id: 'trends', label: fr ? 'Tendances' : 'Trends' },
    ];
    return all.filter(t => (financeOnly ? t.id === 'finance' : t.id !== 'finance' || canFinance));
  }, [fr, financeOnly, canFinance]);

  const exportCsv = async (name: string, table: string, extra: Record<string, string | number | undefined> = {}) => {
    try { setErr(''); await analytics.exportCsv(name, table, f, extra); } catch (e) { setErr(msg(e)); }
  };
  const Export = ({ name, table, extra }: { name: string; table: string; extra?: Record<string, string | number | undefined> }) => (
    <button className={`${btnGhost} !px-2 !py-1 text-xs`} onClick={() => void exportCsv(name, table, extra)} aria-label={`CSV ${table}`}><Download size={13} /> CSV</button>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Statistiques de direction' : 'Executive analytics'} subtitle={fr ? 'Indicateurs calculés sur les résultats publiés' : 'Figures computed from published results'} onRefresh={() => setForce(n => n + 1)}>
        <button className={`${btnGhost} print:hidden`} onClick={() => window.print()}><Printer size={14} /> {fr ? 'Imprimer' : 'Print'}</button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-end gap-3 print:hidden" role="search" aria-label={fr ? 'Filtres' : 'Filters'}>
        <label className="text-xs text-slate-500 flex flex-col gap-1">{fr ? 'Année académique' : 'Academic year'}
          <select className={`${input} w-44`} value={f.academic_year_id ?? ''} onChange={e => setF({ academic_year_id: e.target.value || undefined, programme_id: f.programme_id })}>
            <option value="">{fr ? 'Toutes' : 'All'}</option>{opts.data?.years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">{fr ? 'Semestre' : 'Semester'}
          <select className={`${input} w-48`} value={f.term_id ?? ''} onChange={e => set({ term_id: e.target.value || undefined })}>
            <option value="">{fr ? 'Tous' : 'All'}</option>{termOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">{fr ? 'Filière' : 'Programme'}
          <select className={`${input} w-56 max-w-full`} value={f.programme_id ?? ''} onChange={e => set({ programme_id: e.target.value || undefined })}>
            <option value="">{fr ? 'Toutes' : 'All'}</option>{opts.data?.programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        {(f.academic_year_id || f.term_id || f.programme_id) && <button className={btnGhost} onClick={() => setF({})}>{fr ? 'Réinitialiser' : 'Reset'}</button>}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <ErrorBox message={err} />
      <div className="hidden print:block text-sm text-slate-500">{fr ? 'Filtres' : 'Filters'}: {[year?.label, termOptions.find(t => t.id === f.term_id)?.name, opts.data?.programmes.find(p => p.id === f.programme_id)?.name].filter(Boolean).join(' · ') || (fr ? 'aucun' : 'none')}</div>

      {tab === 'overview' && <OverviewTab key={`o${force}`} f={f} lang={lang} fr={fr} refresh={refresh} Export={Export} />}
      {tab === 'academics' && <AcademicsTab key={`a${force}`} f={f} lang={lang} fr={fr} refresh={refresh} Export={Export} />}
      {tab === 'attendance' && <AttendanceTab key={`t${force}`} f={f} lang={lang} fr={fr} refresh={refresh} Export={Export} threshold={threshold} setThreshold={setThreshold} />}
      {tab === 'exams' && <ExamsTab key={`e${force}`} f={f} lang={lang} fr={fr} refresh={refresh} Export={Export} />}
      {tab === 'finance' && canFinance && <FinanceTab key={`f${force}`} f={f} lang={lang} fr={fr} refresh={refresh} Export={Export} />}
      {tab === 'trends' && <TrendsTab key={`r${force}`} f={f} lang={lang} fr={fr} refresh={refresh} Export={Export} />}
    </div>
  );
}

interface TabProps { f: Filters; lang: string; fr: boolean; refresh: boolean; Export: (p: { name: string; table: string; extra?: Record<string, string | number | undefined> }) => ReactNode }
const label = (map: Record<string, [string, string]>, k: string, fr: boolean) => (map[k] ? map[k][fr ? 1 : 0] : k.replace(/_/g, ' '));
function Frame<T>({ load, children }: { load: { data: T | null; error: string; loading: boolean }; children: (d: T) => ReactNode }) {
  if (load.error) return <ErrorBox message={load.error} />;
  if (!load.data) return <Spinner />;
  return <div className={load.loading ? 'opacity-60 transition-opacity' : ''}>{children(load.data)}</div>;
}
const Stamp = ({ d, fr }: { d: { generated_at: string; cached: boolean; compute_ms: number }; fr: boolean }) => (
  <p className="text-xs text-slate-400 print:block">{fr ? 'Calculé le' : 'Computed'} {new Date(d.generated_at).toLocaleString(fr ? 'fr-FR' : 'en-GB')}{d.cached ? (fr ? ' (cache)' : ' (cached)') : ` · ${d.compute_ms} ms`}</p>
);

function OverviewTab({ f, lang, fr, refresh, Export }: TabProps) {
  const load = useLoad(() => analytics.overview(f, refresh), [JSON.stringify(f)]);
  return (
    <Frame load={load}>{d => (
      <Section title={fr ? 'Vue d’ensemble' : 'Overview'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label={fr ? 'Étudiants' : 'Students'} value={nf(d.students.total, lang)} sub={`${nf(d.students.active, lang)} ${fr ? 'actifs' : 'active'} · ${nf(d.students.graduated, lang)} ${fr ? 'diplômés' : 'graduated'}`} />
          <Kpi label={fr ? 'Enseignants' : 'Lecturers'} value={nf(d.lecturers.active, lang)} sub={`${nf(d.lecturers.total, lang)} ${fr ? 'au total' : 'in total'}`} />
          <Kpi label={fr ? 'Cours ouverts' : 'Courses offered'} value={nf(d.courses_offered.total, lang)} sub={`${nf(d.courses_offered.open, lang)} ${fr ? 'ouverts à l’inscription' : 'open for registration'}`} />
          <Kpi label={fr ? 'Demandes d’exception' : 'Exception requests'} value={nf(d.pending_exception_requests, lang)} tone={d.pending_exception_requests ? 'warn' : undefined} sub={fr ? 'en attente de décision' : 'awaiting a decision'} />
          <Kpi label={fr ? 'Notes à valider' : 'Results to validate'} value={nf(d.results_awaiting_validation.submitted, lang)} tone={d.results_awaiting_validation.submitted ? 'warn' : undefined} sub={`${nf(d.results_awaiting_validation.approved_not_published, lang)} ${fr ? 'à publier' : 'to publish'}`} />
          <Kpi label={fr ? 'Réclamations ouvertes' : 'Open appeals'} value={nf(d.open_grade_appeals, lang)} />
          <Kpi label={fr ? 'Demandes de service' : 'Service requests'} value={nf(d.open_service_requests, lang)} sub={fr ? 'ouvertes' : 'open'} />
          <Kpi label={fr ? 'Retirés / suspendus' : 'Withdrawn / suspended'} value={`${nf(d.students.withdrawn, lang)} / ${nf(d.students.suspended, lang)}`} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={fr ? 'Étudiants actifs par genre' : 'Active students by gender'} actions={<Export name="overview" table="by_gender" />}>
            {d.students.by_gender.length ? <Donut lang={lang} ariaLabel={fr ? 'Répartition par genre' : 'Gender split'} centre={{ value: nf(d.students.active, lang), label: fr ? 'actifs' : 'active' }} slices={d.students.by_gender.map(g => ({ label: label(GENDER, g.label, fr), value: g.n }))} /> : <Empty text="—" />}
          </Card>
          <Card title={fr ? 'Étudiants actifs par filière' : 'Active students by programme'} actions={<Export name="overview" table="by_programme" />}>
            {d.students.by_programme.length ? <RankBars lang={lang} digits={0} ariaLabel={fr ? 'Étudiants par filière' : 'Students by programme'} rows={d.students.by_programme.map(p => ({ label: p.label, value: p.n }))} /> : <Empty text="—" />}
          </Card>
          <Card title={fr ? 'Étudiants actifs par niveau' : 'Active students by level'} actions={<Export name="overview" table="by_level" />}>
            {d.students.by_level.length ? <ColumnChart lang={lang} ariaLabel={fr ? 'Étudiants par niveau' : 'Students by level'} data={d.students.by_level.map(l => ({ label: l.label, value: l.n }))} valueLabel={fr ? 'Étudiants' : 'Students'} colors={d.students.by_level.map((_, i) => PALETTE[i % PALETTE.length])} /> : <Empty text="—" />}
          </Card>
          <Card title={fr ? 'Inscriptions par semestre' : 'Registrations per semester'} actions={<Export name="overview" table="registrations" />}>
            {d.registrations.length ? (<>
              <ColumnChart lang={lang} ariaLabel={fr ? 'Étudiants inscrits par semestre' : 'Registered students per semester'} data={d.registrations.map(r => ({ label: `${r.academic_year} ${r.term}`, value: r.students }))} valueLabel={fr ? 'Étudiants inscrits' : 'Registered students'} />
              <Table min={360} head={[fr ? 'Semestre' : 'Semester', fr ? 'Inscriptions' : 'Registrations', fr ? 'Crédits moy.' : 'Avg credits']}>
                {d.registrations.map(r => <tr key={r.term_id}><td className="px-4 py-2">{r.academic_year} · {r.term}</td><td className="px-4 py-2">{nf(r.registrations, lang)}</td><td className="px-4 py-2">{nf(r.avg_credits, lang, 1)}</td></tr>)}
              </Table>
            </>) : <Empty text={fr ? 'Aucune inscription' : 'No registrations'} />}
          </Card>
        </div>
        <Stamp d={d} fr={fr} />
      </Section>
    )}</Frame>
  );
}

function AcademicsTab({ f, lang, fr, refresh, Export }: TabProps) {
  const load = useLoad(() => analytics.academics(f, refresh), [JSON.stringify(f)]);
  return (
    <Frame load={load}>{d => (
      <Section title={fr ? 'Résultats' : 'Academics'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label={fr ? 'Taux de réussite' : 'Pass rate'} value={d.summary.pass_rate === null ? '—' : `${nf(d.summary.pass_rate, lang, 1)}%`} tone={d.summary.pass_rate !== null && d.summary.pass_rate < 60 ? 'bad' : 'good'} sub={`${nf(d.summary.passed, lang)} / ${nf(d.summary.marks, lang)} ${fr ? 'notes' : 'marks'}`} />
          <Kpi label={fr ? 'GPA moyen' : 'Mean GPA'} value={nf(d.summary.mean_gpa, lang, 2)} sub={`${fr ? 'médian' : 'median'} ${nf(d.summary.median_gpa, lang, 2)}`} />
          <Kpi label={fr ? 'Étudiants notés' : 'Students graded'} value={nf(d.summary.students_with_gpa, lang)} />
          <Kpi label={fr ? 'Réclamations' : 'Appeals'} value={nf(d.appeals.total, lang)} sub={`${nf(d.appeals.open, lang)} ${fr ? 'ouvertes' : 'open'} · ${d.appeals.upheld_rate === null ? '—' : `${nf(d.appeals.upheld_rate, lang, 0)}%`} ${fr ? 'acceptées' : 'upheld'}`} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={fr ? 'Taux de réussite par semestre' : 'Pass rate per semester'} actions={<Export name="academics" table="pass_by_term" />}>
            {d.pass_by_term.length ? <ColumnChart lang={lang} unit="%" digits={1} yMax={100} ariaLabel={fr ? 'Taux de réussite par semestre' : 'Pass rate per semester'} data={d.pass_by_term.map(t => ({ label: `${t.academic_year} ${t.term}`, value: t.pass_rate }))} valueLabel={fr ? 'Réussite (%)' : 'Pass rate (%)'} colors={d.pass_by_term.map(() => PALETTE[1])} /> : <Empty text={fr ? 'Aucune note publiée' : 'No published marks'} />}
          </Card>
          <Card title={fr ? 'Taux de réussite par filière' : 'Pass rate per programme'} actions={<Export name="academics" table="pass_by_programme" />}>
            {d.pass_by_programme.length ? <RankBars lang={lang} unit="%" max={100} ariaLabel={fr ? 'Réussite par filière' : 'Pass rate by programme'} color={PALETTE[1]} rows={d.pass_by_programme.map(p => ({ label: p.programme, value: p.pass_rate, hint: `n=${p.n}` }))} /> : <Empty text="—" />}
          </Card>
          <Card title={fr ? 'Distribution des notes' : 'Grade distribution'} actions={<Export name="academics" table="grade_distribution" />}>
            {d.grade_distribution.length ? <ColumnChart lang={lang} ariaLabel={fr ? 'Distribution des notes' : 'Grade distribution'} data={d.grade_distribution.map(g => ({ label: g.grade, value: g.n }))} colors={d.grade_distribution.map((g, i) => (g.grade === 'F' ? PALETTE[3] : PALETTE[i % 3 === 0 ? 0 : 5]))} valueLabel={fr ? 'Notes' : 'Marks'} /> : <Empty text="—" />}
          </Card>
          <Card title={fr ? 'Histogramme des GPA' : 'GPA distribution'} subtitle={fr ? 'Nombre d’étudiants par tranche de 0,5' : 'Students per 0.5-point band'} actions={<Export name="academics" table="gpa_histogram" />}>
            <ColumnChart lang={lang} ariaLabel={fr ? 'Histogramme des GPA' : 'GPA histogram'} data={d.gpa_histogram.map(b => ({ label: b.label, value: b.n }))} colors={d.gpa_histogram.map(() => PALETTE[0])} valueLabel={fr ? 'Étudiants' : 'Students'} />
          </Card>
          <Card title={fr ? 'Cours les plus difficiles' : 'Hardest courses'} subtitle={fr ? `Au moins ${d.min_sample} notes` : `At least ${d.min_sample} marks`} actions={<Export name="academics" table="hardest_courses" />}>
            {d.hardest_courses.length ? <RankBars lang={lang} unit="%" max={100} color={PALETTE[3]} ariaLabel={fr ? 'Cours les plus difficiles' : 'Hardest courses'} rows={d.hardest_courses.map(c => ({ label: `${c.code} · ${c.name}`, value: c.pass_rate, hint: `n=${c.n}` }))} /> : <Empty text={fr ? 'Échantillon trop petit' : 'Sample too small'} />}
          </Card>
          <Card title={fr ? 'Cours les plus faciles' : 'Easiest courses'} subtitle={fr ? `Au moins ${d.min_sample} notes` : `At least ${d.min_sample} marks`} actions={<Export name="academics" table="easiest_courses" />}>
            {d.easiest_courses.length ? <RankBars lang={lang} unit="%" max={100} color={PALETTE[1]} ariaLabel={fr ? 'Cours les plus faciles' : 'Easiest courses'} rows={d.easiest_courses.map(c => ({ label: `${c.code} · ${c.name}`, value: c.pass_rate, hint: `n=${c.n}` }))} /> : <Empty text={fr ? 'Échantillon trop petit' : 'Sample too small'} />}
          </Card>
          <Card title={fr ? 'Réclamations par statut' : 'Appeals by status'}>
            {d.appeals.total ? <Donut lang={lang} ariaLabel={fr ? 'Réclamations par statut' : 'Appeals by status'} centre={{ value: nf(d.appeals.total, lang), label: fr ? 'total' : 'total' }} slices={Object.entries(d.appeals.by_status).map(([k, v]) => ({ label: label(APPEAL, k, fr), value: v }))} /> : <Empty text="—" />}
          </Card>
          <Card title={fr ? 'Décisions de passage' : 'Progression outcomes'}>
            {d.progression.total ? <Donut lang={lang} ariaLabel={fr ? 'Décisions de passage' : 'Progression outcomes'} centre={{ value: nf(d.progression.total, lang), label: fr ? 'décisions' : 'decisions' }} slices={d.progression.by_outcome.map(o => ({ label: label(OUTCOME, o.outcome, fr), value: o.n }))} /> : <Empty text="—" />}
          </Card>
        </div>
        <Card title={fr ? 'Réussite par cours' : 'Pass rate per course'} actions={<Export name="academics" table="pass_by_course" />}>
          <Table min={560} head={[fr ? 'Cours' : 'Course', fr ? 'Notes' : 'Marks', fr ? 'Réussis' : 'Passed', fr ? 'Réussite' : 'Pass rate', fr ? 'Moyenne' : 'Average']} empty={d.pass_by_course.length ? undefined : '—'}>
            {d.pass_by_course.map(c => <tr key={c.subject_id}><td className="px-4 py-2"><span className="font-mono text-xs text-slate-500">{c.code}</span> {c.name}</td><td className="px-4 py-2">{c.n}</td><td className="px-4 py-2">{c.passed}</td><td className="px-4 py-2 font-medium">{nf(c.pass_rate, lang, 1)}%</td><td className="px-4 py-2">{nf(c.avg_score, lang, 1)}</td></tr>)}
          </Table>
        </Card>
        <Stamp d={d} fr={fr} />
      </Section>
    )}</Frame>
  );
}

function AttendanceTab({ f, lang, fr, refresh, Export, threshold, setThreshold }: TabProps & { threshold: number; setThreshold: (n: number) => void }) {
  const [draft, setDraft] = useState(String(threshold));
  const load = useLoad(() => analytics.attendance(f, threshold, refresh), [JSON.stringify(f), threshold]);
  return (
    <Frame load={load}>{d => (
      <Section title={fr ? 'Assiduité' : 'Attendance'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label={fr ? 'Taux de présence' : 'Attendance rate'} value={d.overall.rate === null ? '—' : `${nf(d.overall.rate, lang, 1)}%`} tone={d.overall.rate !== null && d.overall.rate < d.threshold ? 'bad' : 'good'} sub={`${nf(d.overall.records, lang)} ${fr ? 'enregistrements' : 'records'}`} />
          <Kpi label={fr ? 'Absences' : 'Absences'} value={nf(d.overall.absent, lang)} sub={`${nf(d.overall.excused, lang)} ${fr ? 'excusées' : 'excused'}`} />
          <Kpi label={fr ? 'Retards' : 'Late'} value={nf(d.overall.late, lang)} />
          <Kpi label={fr ? `Étudiants < ${d.threshold}%` : `Students < ${d.threshold}%`} value={nf(d.below_threshold.count, lang)} tone={d.below_threshold.count ? 'warn' : 'good'} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={fr ? 'Présence par classe' : 'Attendance by class'} subtitle={fr ? 'Les plus faibles d’abord' : 'Lowest first'} actions={<Export name="attendance" table="by_class" />}>
            {d.by_class.length ? <RankBars lang={lang} unit="%" max={100} color={PALETTE[4]} ariaLabel={fr ? 'Présence par classe' : 'Attendance by class'} rows={d.by_class.slice(0, 15).map(c => ({ label: c.class_name, value: c.rate, hint: c.programme }))} /> : <Empty text={fr ? 'Aucune présence enregistrée' : 'No attendance recorded'} />}
          </Card>
          <Card title={fr ? 'Présence par filière' : 'Attendance by programme'} actions={<Export name="attendance" table="by_programme" />}>
            {d.by_programme.length ? <RankBars lang={lang} unit="%" max={100} color={PALETTE[4]} ariaLabel={fr ? 'Présence par filière' : 'Attendance by programme'} rows={d.by_programme.map(p => ({ label: p.programme, value: p.rate, hint: `${p.students} ${fr ? 'étud.' : 'students'}` }))} /> : <Empty text="—" />}
          </Card>
        </div>
        <Card title={fr ? 'Étudiants sous le seuil' : 'Students below threshold'} subtitle={fr ? `Taux < ${d.threshold}% (au moins ${d.min_records} enregistrements)` : `Rate < ${d.threshold}% (at least ${d.min_records} records)`}
          actions={<div className="flex items-center gap-2"><label className="text-xs text-slate-500 flex items-center gap-1">{fr ? 'Seuil' : 'Threshold'}
            <input type="number" min={1} max={100} className={`${input} w-20 !py-1`} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => { const n = Math.min(100, Math.max(1, Number(draft) || 75)); setDraft(String(n)); setThreshold(n); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></label>
            <Export name="attendance" table="below_threshold" extra={{ threshold: d.threshold }} /></div>}>
          <Table min={560} head={[fr ? 'Étudiant' : 'Student', 'Matricule', fr ? 'Classe' : 'Class', fr ? 'Enreg.' : 'Records', fr ? 'Taux' : 'Rate']} empty={d.below_threshold.students.length ? undefined : (fr ? 'Aucun étudiant sous le seuil' : 'No student below the threshold')}>
            {d.below_threshold.students.map(s => <tr key={s.student_id}><td className="px-4 py-2">{s.name}</td><td className="px-4 py-2 text-slate-500">{s.matricule ?? '—'}</td><td className="px-4 py-2 text-slate-500">{s.class_name ?? '—'}</td><td className="px-4 py-2">{s.records}</td><td className="px-4 py-2 font-medium text-red-600">{nf(s.rate, lang, 1)}%</td></tr>)}
          </Table>
          {d.below_threshold.count > d.below_threshold.students.length && <p className="text-xs text-slate-400 mt-2">{fr ? `Affichage des ${d.below_threshold.students.length} plus faibles sur ${d.below_threshold.count}.` : `Showing the lowest ${d.below_threshold.students.length} of ${d.below_threshold.count}.`}</p>}
        </Card>
        <Stamp d={d} fr={fr} />
      </Section>
    )}</Frame>
  );
}

function ExamsTab({ f, lang, fr, refresh, Export }: TabProps) {
  const load = useLoad(() => analytics.exams(f, refresh), [JSON.stringify(f)]);
  return (
    <Frame load={load}>{d => (
      <Section title="Exams">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label={fr ? 'Sessions' : 'Sessions'} value={nf(d.totals.sessions, lang)} />
          <Kpi label={fr ? 'Candidats' : 'Candidates'} value={nf(d.totals.candidates, lang)} sub={`${nf(d.totals.students, lang)} ${fr ? 'étudiants' : 'students'}`} />
          <Kpi label={fr ? 'Non éligibles' : 'Ineligible'} value={nf(d.totals.ineligible, lang)} tone={d.totals.ineligible ? 'warn' : 'good'} sub={d.totals.ineligible_rate === null ? undefined : `${nf(d.totals.ineligible_rate, lang, 1)}%`} />
          <Kpi label={fr ? 'Dérogations' : 'Overrides'} value={nf(d.totals.overridden, lang)} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={fr ? 'Éligibilité des candidats' : 'Candidate eligibility'}>
            {d.totals.candidates ? <Donut lang={lang} ariaLabel={fr ? 'Éligibilité' : 'Eligibility'} centre={{ value: nf(d.totals.candidates, lang), label: fr ? 'candidats' : 'candidates' }} slices={[{ label: fr ? 'Éligibles' : 'Eligible', value: d.totals.eligible, color: PALETTE[1] }, { label: fr ? 'Non éligibles' : 'Ineligible', value: d.totals.ineligible, color: PALETTE[3] }]} /> : <Empty text={fr ? 'Aucun candidat' : 'No candidates'} />}
          </Card>
          <Card title={fr ? 'Motifs de non-éligibilité' : 'Ineligibility reasons'} actions={<Export name="exams" table="ineligible_by_reason" />}>
            {d.ineligible_by_reason.length ? <RankBars lang={lang} digits={0} color={PALETTE[3]} ariaLabel={fr ? 'Motifs' : 'Reasons'} rows={d.ineligible_by_reason.map(r => ({ label: REASON[r.code] ? label(REASON, r.code, fr) : r.message ?? r.code, value: r.n }))} /> : <Empty text="—" />}
          </Card>
        </div>
        <Card title={fr ? 'Sessions d’examen' : 'Exam sessions'} actions={<Export name="exams" table="sessions" />}>
          <Table min={680} head={[fr ? 'Examen' : 'Exam', 'Date', fr ? 'Candidats' : 'Candidates', fr ? 'Éligibles' : 'Eligible', fr ? 'Non éligibles' : 'Ineligible', fr ? 'Présents' : 'Present']} empty={d.sessions.length ? undefined : '—'}>
            {d.sessions.map(s => <tr key={s.exam_id}><td className="px-4 py-2"><span className="font-mono text-xs text-slate-500">{s.code}</span> {s.title}</td><td className="px-4 py-2 text-slate-500">{s.date}</td><td className="px-4 py-2">{s.candidates}</td><td className="px-4 py-2">{s.eligible}</td><td className="px-4 py-2">{s.ineligible}</td><td className="px-4 py-2">{s.present}</td></tr>)}
          </Table>
        </Card>
        <Stamp d={d} fr={fr} />
      </Section>
    )}</Frame>
  );
}

function FinanceTab({ f, lang, fr, refresh, Export }: TabProps) {
  const load = useLoad(() => analytics.finance(f, refresh), [JSON.stringify(f)]);
  const M = fr ? METHOD_FR : METHOD_EN;
  return (
    <Frame load={load}>{d => (
      <Section title={fr ? 'Finances' : 'Finance'}>
        <p className="text-xs text-slate-500">{fr ? 'Montants en' : 'Amounts in'} {d.currency}. {fr ? 'Les frais annulés (waived) sont exclus. Le semestre ne filtre pas les frais.' : 'Waived fees are excluded. The semester filter does not apply to fees.'}</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi label={fr ? 'Dû' : 'Due'} value={nf(d.totals.due, lang)} />
          <Kpi label={fr ? 'Encaissé' : 'Collected'} value={nf(d.totals.collected, lang)} tone="good" />
          <Kpi label={fr ? 'Restant dû' : 'Outstanding'} value={nf(d.totals.outstanding, lang)} tone={d.totals.outstanding ? 'warn' : 'good'} sub={`${nf(d.totals.students_with_balance, lang)} ${fr ? 'étudiants' : 'students'}`} />
          <Kpi label={fr ? 'En retard' : 'Overdue'} value={nf(d.totals.overdue, lang)} tone={d.totals.overdue ? 'bad' : 'good'} />
          <Kpi label={fr ? 'Taux de recouvrement' : 'Collection rate'} value={d.totals.collection_rate === null ? '—' : `${nf(d.totals.collection_rate, lang, 1)}%`} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={fr ? 'Dû et encaissé par mois d’échéance' : 'Due vs collected by due month'} actions={<Export name="finance" table="by_month" />}>
            {d.by_month.length ? <LineChart lang={lang} digits={0} ariaLabel={fr ? 'Dû et encaissé par mois' : 'Due vs collected by month'} labels={d.by_month.map(m => m.month)} series={[{ name: fr ? 'Dû' : 'Due', values: d.by_month.map(m => m.due), color: PALETTE[0] }, { name: fr ? 'Encaissé' : 'Collected', values: d.by_month.map(m => m.collected), color: PALETTE[1] }, { name: fr ? 'En retard' : 'Overdue', values: d.by_month.map(m => m.overdue), color: PALETTE[3] }]} /> : <Empty text={fr ? 'Aucun frais' : 'No fees'} />}
          </Card>
          <Card title={fr ? 'Moyens de paiement' : 'Payment methods'} subtitle={fr ? 'Transactions en ligne confirmées' : 'Confirmed online transactions'} actions={<Export name="finance" table="payment_methods" />}>
            {d.payment_methods.length ? <Donut lang={lang} ariaLabel={fr ? 'Moyens de paiement' : 'Payment methods'} centre={{ value: nf(d.payment_methods.reduce((x, m) => x + m.n, 0), lang), label: 'tx' }} slices={d.payment_methods.map(m => ({ label: M[m.method] ?? m.method, value: m.amount }))} /> : <Empty text={fr ? 'Aucune transaction confirmée' : 'No confirmed transactions'} />}
            {d.manual_payment_methods.length > 0 && <p className="text-xs text-slate-500 mt-3">{fr ? 'Paiements enregistrés manuellement' : 'Manually recorded'}: {d.manual_payment_methods.map(m => `${m.method} ${nf(m.amount, lang)}`).join(' · ')}</p>}
          </Card>
          <Card title={fr ? 'Recouvrement par filière' : 'Collection by programme'} actions={<Export name="finance" table="by_programme" />}>
            {d.by_programme.length ? <RankBars lang={lang} unit="%" max={100} ariaLabel={fr ? 'Recouvrement par filière' : 'Collection by programme'} color={PALETTE[1]} rows={d.by_programme.map(p => ({ label: p.programme, value: p.collection_rate, hint: `${nf(p.outstanding, lang)} ${fr ? 'restant' : 'outstanding'}` }))} /> : <Empty text="—" />}
          </Card>
          <Card title={fr ? 'Encaissements reçus par mois' : 'Cash received by month'} actions={<Export name="finance" table="cash_received_by_month" />}>
            {d.cash_received_by_month.length ? <ColumnChart lang={lang} ariaLabel={fr ? 'Encaissements par mois' : 'Cash received by month'} data={d.cash_received_by_month.map(m => ({ label: m.month, value: m.received }))} colors={d.cash_received_by_month.map(() => PALETTE[1])} valueLabel={fr ? 'Reçu' : 'Received'} /> : <Empty text="—" />}
          </Card>
        </div>
        <Stamp d={d} fr={fr} />
      </Section>
    )}</Frame>
  );
}

function TrendsTab({ f, lang, fr, refresh, Export }: TabProps) {
  const load = useLoad(() => analytics.trends(f, refresh), [JSON.stringify(f)]);
  const delta = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${nf(v, lang, d)}`);
  return (
    <Frame load={load}>{d => (
      <Section title={fr ? 'Tendances' : 'Trends'}>
        {d.series.length < 1 ? <Empty text={fr ? 'Aucun semestre' : 'No semesters'} /> : (
          <>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card title={fr ? 'Réussite et présence (%)' : 'Pass rate & attendance (%)'} actions={<Export name="trends" table="series" />}>
                <LineChart lang={lang} unit="%" yMin={0} yMax={100} ariaLabel={fr ? 'Réussite et présence par semestre' : 'Pass rate and attendance per semester'} labels={d.series.map(s => s.label)} series={[{ name: fr ? 'Réussite' : 'Pass rate', values: d.series.map(s => s.pass_rate), color: PALETTE[1] }, { name: fr ? 'Présence' : 'Attendance', values: d.series.map(s => s.attendance_rate), color: PALETTE[4] }]} />
              </Card>
              <Card title={fr ? 'GPA moyen' : 'Mean GPA'}>
                <LineChart lang={lang} digits={2} yMin={0} ariaLabel={fr ? 'GPA moyen par semestre' : 'Mean GPA per semester'} labels={d.series.map(s => s.label)} series={[{ name: 'GPA', values: d.series.map(s => s.mean_gpa), color: PALETTE[0] }]} />
              </Card>
              <Card title={fr ? 'Étudiants inscrits' : 'Registered students'}>
                <ColumnChart lang={lang} ariaLabel={fr ? 'Étudiants inscrits par semestre' : 'Registered students per semester'} data={d.series.map(s => ({ label: s.label, value: s.registered_students }))} colors={d.series.map(() => PALETTE[0])} valueLabel={fr ? 'Étudiants' : 'Students'} />
              </Card>
            </div>
            <Card title={fr ? 'Semestre après semestre' : 'Term over term'}>
              <Table min={720} head={[fr ? 'Semestre' : 'Semester', fr ? 'Inscrits' : 'Registered', fr ? 'Réussite %' : 'Pass %', 'GPA', fr ? 'Présence %' : 'Attendance %', fr ? 'Δ réussite' : 'Δ pass', 'Δ GPA']}>
                {d.series.map(s => <tr key={s.term_id}><td className="px-4 py-2">{s.label}</td><td className="px-4 py-2">{s.registered_students}</td><td className="px-4 py-2">{nf(s.pass_rate, lang, 1)}</td><td className="px-4 py-2">{nf(s.mean_gpa, lang, 2)}</td><td className="px-4 py-2">{nf(s.attendance_rate, lang, 1)}</td><td className="px-4 py-2">{delta(s.change?.pass_rate)}</td><td className="px-4 py-2">{delta(s.change?.mean_gpa, 2)}</td></tr>)}
              </Table>
            </Card>
          </>
        )}
        <Stamp d={d} fr={fr} />
      </Section>
    )}</Frame>
  );
}
