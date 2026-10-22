// Hand-written, dependency-free SVG charts. Every chart is an <svg role="img"> with a <title>/<desc> and a visually-hidden
// data table, uses currentColor / Tailwind classes so it follows light & dark mode, and prints cleanly.
import { useId, type ReactNode } from 'react';

export const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#14b8a6', '#ec4899'];
export const nf = (n: number | null | undefined, lang = 'en', digits = 0) => (n === null || n === undefined ? '—' : n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: digits }));
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function Card({ title, subtitle, actions, children, className = '' }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 p-4 break-inside-avoid ${className}`}>
      <div className="flex items-start gap-2 mb-3">
        <div className="mr-auto min-w-0"><h2 className="text-sm font-semibold text-slate-800">{title}</h2>{subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}</div>
        {actions && <div className="print:hidden shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-800';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 break-inside-avoid">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold mt-1 ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export const Empty = ({ text }: { text: string }) => <p className="text-sm text-slate-400 py-6 text-center">{text}</p>;

/** Screen-reader fallback: the numbers behind a chart. */
function SrTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
      {items.map(i => <li key={i.label} className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />{i.label}</li>)}
    </ul>
  );
}

/** Ranked horizontal bars: HTML labels (always legible) + an SVG bar per row. */
export function RankBars({ rows, max, ariaLabel, color = PALETTE[0], unit = '', lang = 'en', digits = 1 }: { rows: { label: string; value: number | null; hint?: string }[]; max?: number; ariaLabel: string; color?: string; unit?: string; lang?: string; digits?: number }) {
  const top = max ?? Math.max(1, ...rows.map(r => r.value ?? 0));
  return (
    <div role="group" aria-label={ariaLabel}>
      <ul className="space-y-2">
        {rows.map(r => {
          const pct = r.value === null ? 0 : Math.max(0, Math.min(100, (r.value / top) * 100));
          return (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-xs"><span className="text-slate-700 truncate" title={r.label}>{r.label}</span><span className="text-slate-800 font-medium whitespace-nowrap">{nf(r.value, lang, digits)}{r.value !== null && unit}{r.hint && <span className="text-slate-400 font-normal"> · {r.hint}</span>}</span></div>
              <svg className="w-full h-2 mt-1" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="2" rx="1" className="fill-slate-200 dark:fill-slate-700" /><rect width={pct} height="2" rx="1" fill={color} /></svg>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Vertical bars (also used as the histogram with `gap` = 0.08). */
export function ColumnChart({ data, ariaLabel, unit = '', lang = 'en', digits = 0, height = 190, yMax, colors, valueLabel = 'Value' }: { data: { label: string; value: number | null }[]; ariaLabel: string; unit?: string; lang?: string; digits?: number; height?: number; yMax?: number; colors?: string[]; valueLabel?: string }) {
  const id = useId();
  const n = data.length;
  const W = Math.max(320, n * 46), H = height, padL = 34, padB = 34, padT = 14, padR = 6;
  const max = yMax ?? Math.max(1, ...data.map(d => d.value ?? 0));
  const bw = (W - padL - padR) / Math.max(1, n);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, 0.5, 1].map(f => f * max);
  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-labelledby={`${id}t`} viewBox={`0 0 ${W} ${H}`} style={{ minWidth: Math.min(W, 560), maxWidth: Math.max(W, 760) }} className="w-full h-auto text-slate-500">
        <title id={`${id}t`}>{ariaLabel}</title>
        {ticks.map(t => (<g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-current text-slate-200 dark:text-slate-700" strokeWidth="1" /><text x={padL - 4} y={y(t) + 3} textAnchor="end" fontSize="10" className="fill-current">{nf(t, lang, max < 10 ? 1 : 0)}</text></g>))}
        {data.map((d, i) => {
          const v = d.value ?? 0, x = padL + i * bw + bw * 0.12, w = bw * 0.76;
          return (
            <g key={`${d.label}-${i}`}>
              <rect x={x} y={y(v)} width={w} height={Math.max(0, H - padB - y(v))} rx="2" fill={colors?.[i] ?? PALETTE[0]}><title>{`${d.label}: ${nf(d.value, lang, digits)}${unit}`}</title></rect>
              <text x={x + w / 2} y={y(v) - 3} textAnchor="middle" fontSize="10" className="fill-current text-slate-800">{d.value === null ? '' : nf(d.value, lang, digits)}</text>
              <text x={x + w / 2} y={H - padB + 13} textAnchor="middle" fontSize="10" className="fill-current">{clip(d.label, Math.max(5, Math.floor(bw / 5.5)))}</text>
            </g>
          );
        })}
      </svg>
      <SrTable caption={ariaLabel} head={['Label', valueLabel]} rows={data.map(d => [d.label, d.value === null ? '—' : `${nf(d.value, lang, digits)}${unit}`])} />
    </div>
  );
}

/** Multi-series line chart over shared x labels; null values break the line. */
export function LineChart({ labels, series, ariaLabel, unit = '', lang = 'en', digits = 1, height = 210, yMin, yMax }: { labels: string[]; series: { name: string; values: (number | null)[]; color?: string }[]; ariaLabel: string; unit?: string; lang?: string; digits?: number; height?: number; yMin?: number; yMax?: number }) {
  const id = useId();
  const n = labels.length;
  const W = Math.max(360, n * 70), H = height, padL = 44, padB = 34, padT = 14, padR = 14;
  const all = series.flatMap(s => s.values).filter((v): v is number => v !== null);
  const lo = yMin ?? Math.min(0, ...(all.length ? all : [0])), hi = yMax ?? Math.max(1, ...(all.length ? all : [1]));
  const x = (i: number) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo || 1));
  const ticks = [0, 0.5, 1].map(f => lo + f * (hi - lo));
  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-labelledby={`${id}t`} viewBox={`0 0 ${W} ${H}`} style={{ minWidth: Math.min(W, 560), maxWidth: Math.max(W, 760) }} className="w-full h-auto text-slate-500">
        <title id={`${id}t`}>{ariaLabel}</title>
        {ticks.map(t => (<g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-current text-slate-200 dark:text-slate-700" strokeWidth="1" /><text x={padL - 5} y={y(t) + 3} textAnchor="end" fontSize="10" className="fill-current">{nf(t, lang, hi - lo < 10 ? 1 : 0)}</text></g>))}
        {labels.map((l, i) => <text key={`${l}-${i}`} x={x(i)} y={H - padB + 14} textAnchor="middle" fontSize="10" className="fill-current">{clip(l, 14)}</text>)}
        {series.map((s, si) => {
          const color = s.color ?? PALETTE[si % PALETTE.length];
          const segs: string[] = []; let cur = '';
          s.values.forEach((v, i) => { if (v === null) { if (cur) segs.push(cur); cur = ''; } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
          if (cur) segs.push(cur);
          return (
            <g key={s.name}>
              {segs.map((d, i) => <path key={i} d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />)}
              {s.values.map((v, i) => v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill={color}><title>{`${s.name} · ${labels[i]}: ${nf(v, lang, digits)}${unit}`}</title></circle>)}
            </g>
          );
        })}
      </svg>
      <Legend items={series.map((s, i) => ({ label: s.name, color: s.color ?? PALETTE[i % PALETTE.length] }))} />
      <SrTable caption={ariaLabel} head={['Period', ...series.map(s => s.name)]} rows={labels.map((l, i) => [l, ...series.map(s => (s.values[i] === null ? '—' : `${nf(s.values[i], lang, digits)}${unit}`))])} />
    </div>
  );
}

/** Donut with a centre label; slices below 0 are ignored. */
export function Donut({ slices, ariaLabel, centre, lang = 'en', size = 150 }: { slices: { label: string; value: number; color?: string }[]; ariaLabel: string; centre?: { value: string; label: string }; lang?: string; size?: number }) {
  const id = useId();
  const data = slices.filter(s => s.value > 0);
  const total = data.reduce((x, s) => x + s.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg role="img" aria-labelledby={`${id}t`} viewBox="0 0 140 140" width={size} height={size} className="shrink-0 text-slate-800">
        <title id={`${id}t`}>{ariaLabel}</title>
        <circle cx="70" cy="70" r={R} fill="none" strokeWidth="20" className="stroke-slate-200 dark:stroke-slate-700" />
        {total > 0 && data.map((s, i) => {
          const len = (s.value / total) * C, off = -acc; acc += len;
          return <circle key={s.label} cx="70" cy="70" r={R} fill="none" strokeWidth="20" stroke={s.color ?? PALETTE[i % PALETTE.length]} strokeDasharray={`${Math.max(0, len - (data.length > 1 ? 1.5 : 0))} ${C}`} strokeDashoffset={off} transform="rotate(-90 70 70)"><title>{`${s.label}: ${nf(s.value, lang)} (${nf((s.value / total) * 100, lang, 1)}%)`}</title></circle>;
        })}
        {centre && (<g textAnchor="middle" className="fill-current"><text x="70" y="68" fontSize="20" fontWeight="700">{centre.value}</text><text x="70" y="84" fontSize="9" className="text-slate-500">{centre.label}</text></g>)}
      </svg>
      <div className="min-w-0">
        <Legend items={data.map((s, i) => ({ label: `${s.label} — ${nf(s.value, lang)} (${nf((s.value / total) * 100, lang, 0)}%)`, color: s.color ?? PALETTE[i % PALETTE.length] }))} />
      </div>
      <SrTable caption={ariaLabel} head={['Label', 'Value']} rows={data.map(s => [s.label, s.value])} />
    </div>
  );
}
