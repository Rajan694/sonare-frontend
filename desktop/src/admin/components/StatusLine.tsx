import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export function StatusLine({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  const Glyph = ok ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Glyph size={16} className={cn('flex-none', ok ? 'text-acc' : 'text-red')} aria-hidden />
      <span className="text-label-l text-t1 flex-none">{label}</span>
      <span className={cn('text-label-m flex-none', ok ? 'text-t2' : 'text-red')}>{ok ? 'Up' : 'Down'}</span>
      {detail && <span className="text-mono-s text-t3 truncate">{detail}</span>}
    </div>
  );
}
