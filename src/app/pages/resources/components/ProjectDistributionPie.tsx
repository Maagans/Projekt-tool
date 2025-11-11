import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatHours } from '../../../../utils/format';

export type ProjectDistributionItem = {
  id: string;
  label: string;
  value: number;
  percent: number;
  percentLabel: string;
  color: string;
};

type ProjectDistributionPieProps = {
  title: string;
  items: ProjectDistributionItem[];
  total: number;
  isLoading: boolean;
};

export const ProjectDistributionPie = ({ title, items, total, isLoading }: ProjectDistributionPieProps) => {
  const hasData = total > 0 && items.some((item) => item.value > 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <p className="text-xs text-slate-500">Total: {formatHours(total)} timer</p>
      </div>

      {isLoading ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Opdaterer fordeling...
        </div>
      ) : hasData ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="mx-auto h-64 w-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  {items.map((entry) => (
                    <Cell key={`${title}-${entry.id}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, payload) => {
                    if (!payload?.payload) return value;
                    const current = payload.payload as ProjectDistributionItem;
                    return [`${formatHours(Number(value))} t (${current.percentLabel})`, current.label];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="flex-1 space-y-2 text-sm text-slate-600">
            {items.map((item) => (
              <li
                key={`${title}-legend-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
                <span className="font-semibold text-slate-700">
                  {formatHours(item.value)} t • {item.percentLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Ingen projekter med registreret tid i perioden.
        </div>
      )}
    </div>
  );
};
