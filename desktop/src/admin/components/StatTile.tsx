export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-s1 border border-ln rounded-lg px-5 py-4 min-w-0">
      <div className="text-label-m text-t3">{label}</div>
      <div className="text-display-m text-t1 mt-1 truncate">{value}</div>
      {note && <div className="text-label-s text-t3 mt-1 truncate">{note}</div>}
    </div>
  );
}
