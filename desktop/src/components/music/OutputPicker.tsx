import { useOutputs, type OutputKind } from '../../audio/output';
import { Select } from '../ui/Select';
import Icon, { type IconName } from '../ui/Icon';
import { cn } from '../../lib/cn';

const KIND_ICON: Record<OutputKind, IconName> = {
  default: 'output',
  speaker: 'speaker',
  headphones: 'headphones',
  bluetooth: 'bluetooth',
  hdmi: 'output',
};

function useOutputOptions() {
  const outputs = useOutputs();
  const options = outputs.devices.map((d) => ({
    value: d.id,
    label: d.name,
    detail: d.detail,
    icon: KIND_ICON[d.kind],
  }));
  return { ...outputs, options };
}

/** The output icon left of the volume slider (bottom player, Now Playing). Hidden where it can't switch. */
export function OutputButton({ size = 32, className }: { size?: 28 | 32 | 40; className?: string }) {
  const { support, options, current, select, refresh } = useOutputOptions();
  if (support === 'none') return null;
  const dim = { 28: 'ib-28', 32: 'ib-32', 40: 'w-10 h-10' }[size];
  return (
    <Select
      ariaLabel={`Audio output: ${current.name}`}
      tip="Audio output"
      align="end"
      value={current.id}
      options={options}
      onChange={(id) => void select(id)}
      onOpen={() => void refresh()}
      className={cn('ib', dim, current.id && 'text-acc', className)}
      renderTrigger={() => <Icon name={KIND_ICON[current.kind]} size={size === 40 ? 18 : 16} />}
    />
  );
}

/** Now Playing / Audio screen card: the current device, opening the same list. */
export function OutputCard({ className }: { className?: string }) {
  const { support, options, current, select, refresh } = useOutputOptions();
  if (support === 'none') return null;
  return (
    <Select
      ariaLabel={`Audio output: ${current.name}`}
      value={current.id}
      options={options}
      onChange={(id) => void select(id)}
      onOpen={() => void refresh()}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg bg-s2/70 border border-ln2 cursor-pointer text-left hover:bg-s3 min-w-[220px] max-w-[320px]',
        className,
      )}
      renderTrigger={({ open }) => (
        <>
          <Icon name={KIND_ICON[current.kind]} size={18} className="text-acc flex-none" />
          <span className="flex flex-col grow min-w-0">
            <span className="text-label-l text-t1 truncate">{current.name}</span>
            <span className="text-label-s text-t3 truncate">{current.detail}</span>
          </span>
          <Icon
            name="chevron-down"
            size={16}
            className={cn('text-t3 flex-none transition-transform duration-150', open && 'rotate-180')}
          />
        </>
      )}
    />
  );
}
