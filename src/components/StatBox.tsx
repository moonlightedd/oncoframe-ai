interface StatBoxProps {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'navy' | 'teal' | 'amber' | 'red';
}

export default function StatBox({ label, value, sublabel, color = 'navy' }: StatBoxProps) {
  const colorMap = {
    navy: 'bg-navy-50 border-navy-100 text-navy-500',
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-lg p-4 border ${colorMap[color]}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color].split(' ').pop()}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
  );
}
