// A deliberately tiny markdown subset for assistant replies: paragraphs, "-"/"*" and "1." lists, **bold**, *italic*, `code`,
// and "#" headings (rendered as bold). Everything is built with React elements — never innerHTML — so any markup, script
// or link the model (or anyone steering it) emits is displayed as plain text and cannot execute.
import type { ReactNode } from 'react';

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(INLINE).filter(p => p !== '').map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*\n]+\*\*$/.test(p)) return <strong key={key}>{p.slice(2, -2)}</strong>;
    if (/^`[^`\n]+`$/.test(p)) return <code key={key} className="px-1 py-0.5 rounded bg-slate-100 text-[0.85em] font-mono">{p.slice(1, -1)}</code>;
    if (/^\*[^*\s][^*\n]*\*$/.test(p) || /^_[^_\s][^_\n]*_$/.test(p)) return <em key={key}>{p.slice(1, -1)}</em>;
    return p;
  });
}

export default function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  return (
    <div className="space-y-2 break-words">
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        if (lines.every(l => /^\s*[-*•]\s+/.test(l))) return <ul key={bi} className="list-disc pl-5 space-y-0.5">{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ''), `${bi}-${i}`)}</li>)}</ul>;
        if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) return <ol key={bi} className="list-decimal pl-5 space-y-0.5">{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''), `${bi}-${i}`)}</li>)}</ol>;
        if (/^#{1,6}\s+/.test(block) && lines.length === 1) return <p key={bi} className="font-semibold">{inline(block.replace(/^#{1,6}\s+/, ''), `${bi}`)}</p>;
        return <p key={bi}>{lines.map((l, i) => <span key={i}>{i > 0 && <br />}{inline(l, `${bi}-${i}`)}</span>)}</p>;
      })}
    </div>
  );
}
