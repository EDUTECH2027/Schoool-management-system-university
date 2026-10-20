import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { acad, type Band, type ProgressionRules, type Settings } from '../../api/academics';
import { ErrorBox, Field, PageHeader, Spinner, Tabs, btnGhost, btnPrimary, input, msg, useFr, useLoad } from '../../composants/academics/ui';

export default function AcademicSettings() {
  const fr = useFr();
  const [tab, setTab] = useState<'grading' | 'exams' | 'progression'>('grading');
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Règles académiques' : 'Academic rules'} subtitle={fr ? 'Barème, conditions d’examen et règles de passage — modifiables sans toucher au code' : 'Grading scale, exam eligibility and progression rules — editable without touching code'} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'grading', label: fr ? 'Barème de notation' : 'Grading scheme' }, { id: 'exams', label: fr ? 'Conditions d’examen' : 'Exam eligibility' }, { id: 'progression', label: fr ? 'Passage & diplôme' : 'Progression & graduation' }]} />
      {tab === 'grading' ? <Grading /> : <Rules mode={tab} />}
    </div>
  );
}

function Grading() {
  const fr = useFr();
  const s = useLoad(acad.scheme);
  const [f, setF] = useState<{ name: string; ca: string; exam: string; pass: string; cap: string; bands: Band[]; reason: string } | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  useEffect(() => { if (s.data) setF({ name: s.data.name, ca: String(s.data.ca_weight), exam: String(s.data.exam_weight), pass: String(s.data.pass_mark), cap: s.data.resit_cap == null ? '' : String(s.data.resit_cap), bands: s.data.bands.map(b => ({ ...b })), reason: '' }); }, [s.data]);
  if (!f) return s.error ? <ErrorBox message={s.error} /> : <Spinner />;
  const sum = Number(f.ca) + Number(f.exam);
  const setBand = (i: number, patch: Partial<Band>) => setF(x => x && ({ ...x, bands: x.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const save = async () => {
    setErr(''); setOk('');
    try {
      await acad.saveScheme({ id: null, name: f.name, ca_weight: Number(f.ca), exam_weight: Number(f.exam), pass_mark: Number(f.pass), resit_cap: f.cap === '' ? null : Number(f.cap), bands: f.bands.map(b => ({ grade: b.grade, min_score: Number(b.min_score), points: Number(b.points), remark: b.remark || null, is_pass: b.is_pass !== false })), reason: f.reason || undefined });
      setOk(fr ? 'Barème enregistré. Les totaux et notes sont recalculés à partir de maintenant.' : 'Scheme saved. Totals and grades use it from now on.'); void s.reload();
    } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-4 max-w-3xl">
      {s.data?.built_in && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{fr ? 'Barème par défaut intégré — enregistrez-le pour le personnaliser.' : 'Built-in default scheme — save it to customise.'}</p>}
      <div className="bg-white rounded-xl border border-slate-200 p-5 grid sm:grid-cols-4 gap-3">
        <Field label={fr ? 'Poids CA (%)' : 'CA weight (%)'}><input type="number" className={`${input} w-full`} value={f.ca} onChange={e => setF({ ...f, ca: e.target.value })} /></Field>
        <Field label={fr ? 'Poids examen (%)' : 'Exam weight (%)'}><input type="number" className={`${input} w-full`} value={f.exam} onChange={e => setF({ ...f, exam: e.target.value })} /></Field>
        <Field label={fr ? 'Note de passage' : 'Pass mark'}><input type="number" className={`${input} w-full`} value={f.pass} onChange={e => setF({ ...f, pass: e.target.value })} /></Field>
        <Field label={fr ? 'Plafond de rattrapage' : 'Resit cap'} hint={fr ? 'Vide = aucun' : 'Empty = none'}><input type="number" className={`${input} w-full`} value={f.cap} onChange={e => setF({ ...f, cap: e.target.value })} /></Field>
        {sum !== 100 && <p className="sm:col-span-4 text-sm text-red-600">{fr ? `Les poids doivent totaliser 100 (actuellement ${sum}).` : `Weights must add up to 100 (currently ${sum}).`}</p>}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center mb-3"><h2 className="font-semibold text-slate-800 mr-auto">{fr ? 'Mentions' : 'Grade bands'}</h2><button className={btnGhost} onClick={() => setF({ ...f, bands: [...f.bands, { grade: '', min_score: 0, points: 0, is_pass: true }] })}><Plus size={14} /> {fr ? 'Ajouter' : 'Add'}</button></div>
        <div className="space-y-2">
          {[...f.bands.entries()].sort((a, b) => Number(b[1].min_score) - Number(a[1].min_score)).map(([i, b]) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <input aria-label="Grade" className={`${input} w-20`} placeholder={fr ? 'Note' : 'Grade'} value={b.grade} onChange={e => setBand(i, { grade: e.target.value })} />
              <label className="text-xs text-slate-500 flex items-center gap-1">≥ <input aria-label="Min score" type="number" className={`${input} w-20`} value={b.min_score} onChange={e => setBand(i, { min_score: e.target.value as unknown as number })} /></label>
              <label className="text-xs text-slate-500 flex items-center gap-1">{fr ? 'pts' : 'pts'} <input aria-label="Points" type="number" step="0.1" className={`${input} w-20`} value={b.points} onChange={e => setBand(i, { points: e.target.value as unknown as number })} /></label>
              <input aria-label="Remark" className={`${input} flex-1 min-w-[8rem]`} placeholder={fr ? 'Mention (ex. Très bien)' : 'Remark (e.g. Excellent)'} value={b.remark ?? ''} onChange={e => setBand(i, { remark: e.target.value })} />
              <label className="text-xs text-slate-500 flex items-center gap-1"><input type="checkbox" checked={b.is_pass !== false} onChange={e => setBand(i, { is_pass: e.target.checked })} /> {fr ? 'validé' : 'pass'}</label>
              <button aria-label="Remove band" className="text-slate-400 hover:text-red-600" onClick={() => setF({ ...f, bands: f.bands.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
      <Field label={fr ? 'Motif du changement (journalisé)' : 'Reason for the change (logged)'}><input className={`${input} w-full`} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></Field>
      <ErrorBox message={err} />{ok && <p className="text-sm text-emerald-600">{ok}</p>}
      <button className={btnPrimary} disabled={sum !== 100} onClick={save}>{fr ? 'Enregistrer le barème' : 'Save scheme'}</button>
    </div>
  );
}

const RULE_LABELS: Record<keyof ProgressionRules, [string, string, string]> = {
  promote_min_gpa: ['GPA minimum pour être admis', 'Minimum year GPA to be promoted', 'gpa'],
  max_carryover_courses: ['Dettes autorisées (cours à repasser)', 'Maximum carry-over courses', 'n'],
  probation_gpa_below: ['Probation si GPA annuel inférieur à', 'Probation when year GPA is below', 'gpa'],
  graduation_min_gpa: ['GPA cumulé minimum pour être diplômé', 'Minimum cumulative GPA to graduate', 'gpa'],
  graduation_max_outstanding: ['Cours non validés tolérés au diplôme', 'Outstanding courses allowed at graduation', 'n'],
  resit_min_total: ['Total minimum pour le rattrapage', 'Minimum total to qualify for a resit', 'n'],
};

function Rules({ mode }: { mode: 'exams' | 'progression' }) {
  const fr = useFr();
  const st = useLoad(acad.settings);
  const [f, setF] = useState<Settings | null>(null); const [reason, setReason] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  useEffect(() => { if (st.data) setF(JSON.parse(JSON.stringify(st.data))); }, [st.data]);
  if (!f) return st.error ? <ErrorBox message={st.error} /> : <Spinner />;
  const save = async () => {
    setErr(''); setOk('');
    try {
      await acad.saveSettings(mode === 'exams'
        ? { exam_min_attendance_pct: f.exam_min_attendance_pct === null || String(f.exam_min_attendance_pct) === '' ? null : Number(f.exam_min_attendance_pct), exam_fee_rule: f.exam_fee_rule, exam_min_paid_pct: Number(f.exam_min_paid_pct), reason: reason || undefined }
        : { progression: Object.fromEntries(Object.entries(f.progression).map(([k, v]) => [k, Number(v)])) as unknown as ProgressionRules, reason: reason || undefined });
      setOk(fr ? 'Règles enregistrées.' : 'Rules saved.'); void st.reload();
    } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {mode === 'exams' ? (
          <>
            <Field label={fr ? 'Assiduité minimale pour composer (%)' : 'Minimum attendance to sit exams (%)'} hint={fr ? 'Vide = non exigée. Basée sur les présences du semestre.' : 'Empty = not required. Based on the semester’s attendance records.'}><input type="number" min={0} max={100} className={`${input} w-40`} value={f.exam_min_attendance_pct ?? ''} onChange={e => setF({ ...f, exam_min_attendance_pct: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            <Field label={fr ? 'Condition de scolarité' : 'Tuition condition'}>
              <select className={`${input} w-full`} value={f.exam_fee_rule} onChange={e => setF({ ...f, exam_fee_rule: e.target.value as Settings['exam_fee_rule'] })}>
                <option value="none">{fr ? 'Aucune' : 'None'}</option><option value="no_overdue">{fr ? 'Aucun impayé échu' : 'No overdue fees'}</option><option value="min_paid_pct">{fr ? 'Pourcentage minimum payé' : 'Minimum % paid'}</option>
              </select>
            </Field>
            {f.exam_fee_rule === 'min_paid_pct' && <Field label={fr ? 'Pourcentage minimum payé (%)' : 'Minimum paid (%)'}><input type="number" min={0} max={100} className={`${input} w-40`} value={f.exam_min_paid_pct} onChange={e => setF({ ...f, exam_min_paid_pct: Number(e.target.value) })} /></Field>}
            <p className="text-xs text-slate-400">{fr ? 'Un étudiant non éligible peut être réintégré au cas par cas avec un motif journalisé.' : 'An ineligible student can be reinstated case by case with a logged reason.'}</p>
          </>
        ) : (
          (Object.keys(RULE_LABELS) as (keyof ProgressionRules)[]).map(k => (
            <Field key={k} label={RULE_LABELS[k][fr ? 0 : 1]}><input type="number" min={0} step={RULE_LABELS[k][2] === 'gpa' ? 0.1 : 1} className={`${input} w-40`} value={f.progression[k]} onChange={e => setF({ ...f, progression: { ...f.progression, [k]: e.target.value as unknown as number } })} /></Field>
          ))
        )}
      </div>
      <Field label={fr ? 'Motif du changement (journalisé)' : 'Reason for the change (logged)'}><input className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
      <ErrorBox message={err} />{ok && <p className="text-sm text-emerald-600">{ok}</p>}
      <button className={btnPrimary} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button>
    </div>
  );
}
