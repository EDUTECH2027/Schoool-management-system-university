import { useState, useEffect, useCallback } from 'react';
import { Printer, Eye, GraduationCap, X, RefreshCw, BookOpen, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBranding } from '../context/BrandingContext';
import { api, type ClassRecord, type Student } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import { StatusBadge } from '../composants/ui/Badge';
import { clsx } from 'clsx';

// Raw DB response types (snake_case)
type TxEntry = {
  id: string; term_id: string; term_name: string; academic_year: string;
  subject_id: string; subject_name: string;
  ca_score: number; exam_score: number; total_score: number; credit_hours: number;
  grade: string; grade_points: number; remark: string | null;
};

type TxRecord = {
  id: string; student_id: string; student_name: string; student_number: string;
  class_name: string; grade_level_name: string;
  cumulative_gpa: number; total_credit_hours: number; total_quality_points: number;
  terms_included: number; status: string; generated_at: string | null;
  entries: TxEntry[];
};

type TermRaw = { id: string; name: string; is_current: number; academic_year_id: string; start_date: string; end_date: string };

type TermGroup = { termId: string; termName: string; academicYear: string; entries: TxEntry[]; termGpa: number; termCreditHours: number };

const gradeColor: Record<string, string> = {
  'A+': 'text-emerald-700', 'A': 'text-green-700', 'B': 'text-blue-700',
  'C':  'text-yellow-700',  'D': 'text-orange-700', 'F': 'text-red-700',
};

// Groups a flat entries[] list by term and sorts chronologically using the
// reference terms list (entries only carry a term_id + labels, not a date).
function groupByTerm(entries: TxEntry[], terms: TermRaw[]): TermGroup[] {
  const groups = new Map<string, TxEntry[]>();
  entries.forEach(e => {
    if (!groups.has(e.term_id)) groups.set(e.term_id, []);
    groups.get(e.term_id)!.push(e);
  });
  return [...groups.entries()]
    .map(([termId, es]) => {
      const totalCreditHours = es.reduce((s, e) => s + e.credit_hours, 0);
      const totalQualityPoints = es.reduce((s, e) => s + e.grade_points * e.credit_hours, 0);
      return {
        termId, termName: es[0].term_name, academicYear: es[0].academic_year, entries: es,
        termGpa: totalCreditHours > 0 ? Math.round((totalQualityPoints / totalCreditHours) * 100) / 100 : 0,
        termCreditHours: totalCreditHours,
        startDate: terms.find(t => t.id === termId)?.start_date ?? '',
      };
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map(({ startDate: _startDate, ...rest }) => rest);
}

function termLabel(name: string, lang: 'en' | 'fr') {
  const n = name === 'first' ? 1 : name === 'second' ? 2 : 3;
  return lang === 'fr' ? `Trimestre ${n}` : `Term ${n}`;
}

// ── Printable transcript ────────────────────────────────────────────────────
function PrintCard({ tx, terms }: { tx: TxRecord; terms: TermRaw[] }) {
  const { lang } = useLanguage();
  const { schoolInfo, logoUrl } = useBranding();
  const groups = groupByTerm(tx.entries, terms);

  return (
    <div className="bg-white" style={{ fontFamily: 'serif', maxWidth: '210mm', margin: '0 auto', padding: '16mm 14mm' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
        {logoUrl ? (
          <img src={logoUrl} alt="logo" className="w-16 h-16 object-contain mx-auto mb-2" />
        ) : (
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <GraduationCap size={28} className="text-white" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">{schoolInfo.name}</h1>
        <p className="text-slate-600 text-sm italic">{schoolInfo.motto}</p>
        <p className="text-slate-500 text-xs mt-1">{schoolInfo.address} · {schoolInfo.phone}</p>
        <div className="mt-3 bg-indigo-700 text-white text-sm font-bold py-1.5 px-4 rounded inline-block uppercase tracking-widest">
          {lang === 'fr' ? 'RELEVÉ DE NOTES OFFICIEL' : 'OFFICIAL TRANSCRIPT'}
        </div>
      </div>

      {/* Student info grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
        <div className="space-y-1.5">
          {([
            [lang === 'fr' ? 'Nom complet' : 'Full Name',    tx.student_name],
            [lang === 'fr' ? 'Matricule'   : 'Adm. No.',     tx.student_number],
            [lang === 'fr' ? 'Classe'      : 'Class',        tx.class_name],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-slate-500 w-36 shrink-0">{label} :</span>
              <span className="font-semibold text-slate-900">{val}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {([
            [lang === 'fr' ? 'Date de génération' : 'Generated', tx.generated_at ? new Date(tx.generated_at).toLocaleDateString() : '—'],
            [lang === 'fr' ? 'Semestres inclus'   : 'Terms Included', String(tx.terms_included)],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex gap-2">
              <span className="text-slate-500 w-36 shrink-0">{label} :</span>
              <span className="font-semibold text-slate-900">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* One table per term */}
      {groups.map(g => (
        <div key={g.termId} className="mb-5">
          <p className="text-sm font-bold text-slate-700 mb-1.5">{termLabel(g.termName, lang)} · {g.academicYear}</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-2 font-semibold">{lang === 'fr' ? 'Cours' : 'Course'}</th>
                <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Séq 1' : 'Seq 1'}</th>
                <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Séq 2' : 'Seq 2'}</th>
                <th className="text-center px-3 py-2 font-semibold">Total /100</th>
                <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Crédits' : 'Credit Hrs'}</th>
                <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Note' : 'Grade'}</th>
                <th className="text-center px-3 py-2 font-semibold">{lang === 'fr' ? 'Points' : 'Grade Pts'}</th>
              </tr>
            </thead>
            <tbody>
              {g.entries.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td className="px-3 py-2 font-medium text-slate-800">{e.subject_name}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{e.ca_score}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{e.exam_score}</td>
                  <td className="px-3 py-2 text-center font-bold text-slate-900">{e.total_score}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{e.credit_hours}</td>
                  <td className={clsx('px-3 py-2 text-center font-bold', gradeColor[e.grade] ?? 'text-slate-700')}>{e.grade}</td>
                  <td className="px-3 py-2 text-center text-slate-700">{e.grade_points.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50" style={{ borderTop: '2px solid #4f46e5' }}>
                <td className="px-3 py-2 font-bold text-slate-800" colSpan={4}>
                  {lang === 'fr' ? 'Moyenne du semestre' : 'Term GPA'}
                </td>
                <td className="px-3 py-2 text-center font-bold text-indigo-700">{g.termCreditHours}</td>
                <td className="px-3 py-2 text-center font-bold text-indigo-700" colSpan={2}>{g.termGpa.toFixed(2)} / 4.0</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ))}

      {/* Summary boxes */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div className="border border-slate-300 rounded p-3 text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{lang === 'fr' ? 'Moyenne cumulative' : 'Cumulative GPA'}</p>
          <p className="text-2xl font-bold text-indigo-700">{tx.cumulative_gpa.toFixed(2)}<span className="text-sm">/4.0</span></p>
        </div>
        <div className="border border-slate-300 rounded p-3 text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{lang === 'fr' ? 'Total crédits' : 'Total Credit Hours'}</p>
          <p className="text-2xl font-bold text-slate-800">{tx.total_credit_hours}</p>
        </div>
        <div className="border border-slate-300 rounded p-3 text-center">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{lang === 'fr' ? 'Semestres' : 'Terms Included'}</p>
          <p className="text-2xl font-bold text-slate-800">{tx.terms_included}</p>
        </div>
      </div>

      {/* Signature */}
      <div className="flex justify-center text-sm border-t border-slate-300 pt-4">
        <div className="text-center w-48">
          <div className="border-b border-slate-400 h-8 mb-1" />
          <p className="text-slate-500 text-xs">{lang === 'fr' ? 'Registraire (Signature)' : 'Registrar (Signature)'}</p>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-slate-400 border-t border-slate-200 pt-2">
        <p>{lang === 'fr' ? 'Document officiel' : 'Official Document'} · {schoolInfo.name}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Transcripts() {
  const { t, lang } = useLanguage();
  const { schoolInfo } = useBranding();

  const [classes,     setClasses]     = useState<ClassRecord[]>([]);
  const [terms,       setTerms]       = useState<TermRaw[]>([]);
  const [classId,     setClassId]     = useState('');
  const [students,    setStudents]    = useState<Student[]>([]);
  const [transcripts, setTranscripts] = useState<TxRecord[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [previewTx,   setPreviewTx]   = useState<TxRecord | null>(null);
  const [printList,   setPrintList]   = useState<TxRecord[] | null>(null);

  // Load classes and terms (terms are reference data only now — used to sort
  // entries chronologically, there's no term selector anymore).
  useEffect(() => {
    Promise.all([api.getClasses(), api.getTerms()])
      .then(([cls, tms]) => {
        setClasses(cls);
        setTerms(tms as TermRaw[]);
        if (cls.length > 0) setClassId(cls[0].id);
      })
      .catch(console.error);
  }, []);

  // Reload transcripts whenever the class selection changes
  const loadCards = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const data = await api.getTranscripts({ classId });
      setTranscripts(data as unknown as TxRecord[]);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [classId]);

  useEffect(() => { loadCards(); }, [loadCards]);

  // Load students for the selected class
  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    api.getStudents({ classId })
      .then(ss => setStudents(ss as Student[]))
      .catch(console.error);
  }, [classId]);

  const [generateMsg, setGenerateMsg] = useState('');

  const handleGenerate = async () => {
    if (!classId) return;
    setGenerating(true);
    setGenerateMsg('');
    try {
      const result = await api.generateTranscripts({ classId });
      setGenerateMsg(
        lang === 'fr'
          ? `${result.generated} relevé(s) généré(s).`
          : `${result.generated} transcript(s) generated.`
      );
      await loadCards();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerateMsg(lang === 'fr' ? `Erreur : ${msg}` : `Error: ${msg}`);
      console.error(err);
    }
    setGenerating(false);
  };

  const handlePrint = (txs: TxRecord[]) => {
    setPrintList(txs);
    setTimeout(() => {
      window.print();
      setPrintList(null);
    }, 300);
  };

  const handleDownloadPdf = () => {
    const cards = studentRows.filter(r => r.tx !== null).map(r => r.tx!);
    if (cards.length === 0) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const X = 14;
    const W = 182;
    const PAGE_H = 297;
    const BOTTOM_MARGIN = 20;

    cards.forEach((tx, idx) => {
      if (idx > 0) doc.addPage();
      let y = 14;

      // ── School header ─────────────────────────────────────────
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(schoolInfo.name.toUpperCase(), X + W / 2, y, { align: 'center' });
      y += 6;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      if (schoolInfo.motto) { doc.text(schoolInfo.motto, X + W / 2, y, { align: 'center' }); y += 5; }
      doc.setFont('helvetica', 'normal');
      doc.text(`${schoolInfo.address || ''}  ·  ${schoolInfo.phone || ''}`, X + W / 2, y, { align: 'center' });
      y += 4;

      doc.setDrawColor(203, 213, 225);
      doc.line(X, y, X + W, y);
      y += 4;

      doc.setFillColor(79, 70, 229);
      doc.roundedRect(X, y, W, 8, 1.5, 1.5, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(lang === 'fr' ? 'RELEVÉ DE NOTES OFFICIEL' : 'OFFICIAL TRANSCRIPT', X + W / 2, y + 5.2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 12;

      // ── Student info grid ─────────────────────────────────────
      doc.setFontSize(8.5);
      const leftRows: [string, string][] = [
        [lang === 'fr' ? 'Nom complet' : 'Full Name',  tx.student_name   ],
        [lang === 'fr' ? 'Matricule'   : 'Adm. No.',   tx.student_number ],
        [lang === 'fr' ? 'Classe'      : 'Class',       tx.class_name     ],
      ];
      const rightRows: [string, string][] = [
        [lang === 'fr' ? 'Date de génération' : 'Generated', tx.generated_at ? new Date(tx.generated_at).toLocaleDateString() : '—'],
        [lang === 'fr' ? 'Semestres inclus'   : 'Terms Included', String(tx.terms_included)],
      ];
      leftRows.forEach(([label, val], i) => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(`${label} :`, X, y + i * 5.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
        doc.text(String(val || ''), X + 36, y + i * 5.5);
      });
      rightRows.forEach(([label, val], i) => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(`${label} :`, X + W / 2 + 2, y + i * 5.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42);
        doc.text(String(val || ''), X + W / 2 + 40, y + i * 5.5);
      });
      y += 3 * 5.5 + 6;

      // ── One table per term ──────────────────────────────────────
      const groups = groupByTerm(tx.entries, terms);
      groups.forEach(g => {
        if (y > PAGE_H - BOTTOM_MARGIN - 30) { doc.addPage(); y = 14; }

        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
        doc.text(`${termLabel(g.termName, lang)} · ${g.academicYear}`, X, y);
        doc.setTextColor(0, 0, 0);
        y += 3;

        autoTable(doc, {
          startY: y,
          head: [[
            lang === 'fr' ? 'Cours'   : 'Course',
            lang === 'fr' ? 'Séq 1'  : 'Seq 1',
            lang === 'fr' ? 'Séq 2'  : 'Seq 2',
            'Total /100',
            lang === 'fr' ? 'Crédits' : 'Credit Hrs',
            lang === 'fr' ? 'Note'    : 'Grade',
            lang === 'fr' ? 'Points'  : 'Grade Pts',
          ]],
          body: g.entries.map(e => [
            e.subject_name || '', e.ca_score ?? 0, e.exam_score ?? 0,
            e.total_score ?? 0, e.credit_hours ?? 0, e.grade || '', e.grade_points.toFixed(1),
          ]),
          foot: [[
            { content: lang === 'fr' ? 'Moyenne du semestre' : 'Term GPA', colSpan: 4,
              styles: { fontStyle: 'bold', fillColor: [238, 242, 255], textColor: [79, 70, 229] } },
            { content: `${g.termCreditHours}`,
              styles: { fontStyle: 'bold', halign: 'center', fillColor: [238, 242, 255], textColor: [79, 70, 229] } },
            { content: `${g.termGpa.toFixed(2)}/4.0`, colSpan: 2,
              styles: { fontStyle: 'bold', halign: 'center', fillColor: [238, 242, 255], textColor: [79, 70, 229] } },
          ]],
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
          bodyStyles: { fontSize: 8 },
          footStyles: { fontSize: 8.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 50, halign: 'left' },
            1: { halign: 'center', cellWidth: 18 },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
            6: { halign: 'center' },
          },
          margin: { left: X, right: X },
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      });

      // ── Summary boxes ─────────────────────────────────────────
      if (y > PAGE_H - BOTTOM_MARGIN - 45) { doc.addPage(); y = 14; }
      const BW = (W - 8) / 3;
      const BH = 18;

      const drawBox = (bx: number, title: string, value: string, vc?: [number, number, number]) => {
        doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252);
        doc.roundedRect(bx, y, BW, BH, 1, 1, 'FD');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
        doc.text(title, bx + BW / 2, y + 5, { align: 'center' });
        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(vc ?? ([30, 41, 59] as [number, number, number])));
        doc.text(value, bx + BW / 2, y + 13, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      };

      drawBox(X,              lang === 'fr' ? 'MOYENNE CUMULATIVE' : 'CUMULATIVE GPA',
        `${tx.cumulative_gpa.toFixed(2)}/4.0`, [79, 70, 229]);
      drawBox(X + BW + 4,     lang === 'fr' ? 'TOTAL CRÉDITS' : 'TOTAL CREDIT HOURS',
        `${tx.total_credit_hours}`);
      drawBox(X + (BW + 4)*2, lang === 'fr' ? 'SEMESTRES' : 'TERMS INCLUDED',
        `${tx.terms_included}`);

      y += BH + 10;

      // ── Signature ─────────────────────────────────────────────
      doc.setDrawColor(203, 213, 225);
      doc.line(X, y, X + W, y);
      y += 10;
      const sx = X + W / 2;
      doc.setDrawColor(148, 163, 184);
      doc.line(sx - 25, y + 8, sx + 25, y + 8);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(lang === 'fr' ? 'Registraire (Signature)' : 'Registrar (Signature)', sx, y + 13, { align: 'center' });
      y += 20;

      // ── Footer ────────────────────────────────────────────────
      doc.setDrawColor(203, 213, 225); doc.line(X, y, X + W, y); y += 4;
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
      doc.text(`${lang === 'fr' ? 'Document officiel' : 'Official Document'} · ${schoolInfo.name}`,
        X + W / 2, y, { align: 'center' });
    });

    const fname = `transcripts-${(selectedClass?.name ?? 'class').replace(/\s+/g, '-')}.pdf`.toLowerCase();
    doc.save(fname);
  };

  const selectedClass = classes.find(c => c.id === classId);

  // Merge: one row per student in the class; attach their transcript if it exists
  const studentRows = students.map(s => ({
    student: s,
    tx: transcripts.find(tx => tx.student_id === s.id) ?? null,
  }));

  return (
    <>
      {/* Print-only overlay — hidden on screen, shown when window.print() fires */}
      {printList && (
        <div className="print-only">
          {printList.map((tx, i) => (
            <div key={tx.id} style={i < printList.length - 1 ? { pageBreakAfter: 'always' } : undefined}>
              <PrintCard tx={tx} terms={terms} />
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewTx && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-8 px-4"
          onClick={e => { if (e.target === e.currentTarget) setPreviewTx(null); }}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <p className="font-semibold text-slate-800">{previewTx.student_name}</p>
                <p className="text-xs text-slate-400">{previewTx.class_name}</p>
                <p className="text-xs mt-0.5 font-semibold text-indigo-700">
                  {lang === 'fr' ? 'Moyenne cumulative' : 'Cumulative GPA'}: {previewTx.cumulative_gpa.toFixed(2)}/4.0
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint([previewTx])}
                  className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Printer size={14} /> {lang === 'fr' ? 'Imprimer' : 'Print'}
                </button>
                <button onClick={() => setPreviewTx(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[80vh] p-2">
              <PrintCard tx={previewTx} terms={terms} />
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="space-y-5 no-print">

        {/* Controls bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.assessments.class}</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={generating || !classId}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                {generating
                  ? (lang === 'fr' ? 'Génération…' : 'Generating…')
                  : (lang === 'fr' ? 'Générer les relevés' : 'Generate Transcripts')}
              </button>

              {transcripts.length > 0 && (
                <>
                  <button
                    onClick={() => handlePrint(studentRows.filter(r => r.tx !== null).map(r => r.tx!))}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Printer size={14} />
                    {lang === 'fr'
                      ? `Imprimer tout (${transcripts.length})`
                      : `Print All (${transcripts.length})`}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    {lang === 'fr' ? 'Télécharger PDF' : 'Download PDF'}
                  </button>
                </>
              )}
            </div>
          </div>

          {selectedClass && (
            <p className="text-xs text-slate-400 mt-2">
              {selectedClass.name}
              {students.length > 0 && ` · ${students.length} ${lang === 'fr' ? 'élèves' : 'students'}`}
              {transcripts.length > 0 && ` · ${transcripts.length} ${lang === 'fr' ? 'relevés générés' : 'transcripts generated'}`}
            </p>
          )}
          {generateMsg && (
            <p className={`text-xs mt-1 font-medium ${generateMsg.startsWith('Error') || generateMsg.startsWith('Erreur') ? 'text-red-600' : 'text-emerald-600'}`}>
              {generateMsg}
            </p>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={28} className="text-slate-300" />
            </div>
            <h3 className="text-slate-600 font-semibold mb-1">
              {lang === 'fr' ? 'Aucun élève dans cette classe' : 'No students in this class'}
            </h3>
          </div>
        ) : (
          <div className="space-y-3">
            {studentRows.map(({ student, tx }) => {
              const initials = `${student.first_name[0] ?? ''}${student.last_name[0] ?? ''}`.toUpperCase();
              const fullName = `${student.first_name} ${student.last_name}`;

              if (!tx) {
                return (
                  <div key={student.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 opacity-70">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0 text-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700">{fullName}</p>
                      <p className="text-slate-400 text-xs">{student.student_number}</p>
                    </div>
                    <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-3 py-1 whitespace-nowrap">
                      {lang === 'fr' ? 'Relevé non généré' : 'Not generated'}
                    </span>
                  </div>
                );
              }

              const groups = groupByTerm(tx.entries, terms);
              const latest = groups[groups.length - 1];

              return (
                <div key={tx.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Student identity */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 text-sm">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{tx.student_name}</h3>
                        <p className="text-slate-400 text-xs">{tx.student_number} · {tx.class_name}</p>
                        <p className="text-slate-400 text-xs">
                          {tx.terms_included} {lang === 'fr' ? 'semestre(s) inclus' : 'term(s) included'}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <p className="text-2xl font-bold text-indigo-600">{tx.cumulative_gpa.toFixed(2)}</p>
                        <p className="text-xs text-slate-400">{lang === 'fr' ? 'Moyenne cumulative' : 'Cumulative GPA'}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{tx.total_credit_hours}</p>
                        <p className="text-xs text-slate-400">{lang === 'fr' ? 'Crédits' : 'Credit Hrs'}</p>
                      </div>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>

                  {/* Most recent term's grade strip */}
                  {latest && latest.entries.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <p className="text-xs text-slate-400 mb-1">{termLabel(latest.termName, lang)} · {latest.academicYear}</p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 uppercase tracking-wide">
                            {latest.entries.map(e => (
                              <th key={e.subject_id} className="text-center px-2 py-1 font-medium">
                                {e.subject_name?.split(' ')[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {latest.entries.map(e => (
                              <td key={e.subject_id} className="text-center px-2 py-1">
                                <span className={clsx('font-bold', gradeColor[e.grade] ?? 'text-slate-700')}>{e.grade}</span>
                                <span className="text-slate-400 ml-1">{e.total_score}</span>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setPreviewTx(tx)}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <Eye size={14} /> {t.transcripts.preview}
                    </button>
                    <button
                      onClick={() => handlePrint([tx])}
                      className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors ml-auto"
                    >
                      <Printer size={14} /> {t.transcripts.printTranscript}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
