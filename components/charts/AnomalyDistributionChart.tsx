
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyRecord, AnomalyType } from '../../types';

interface ChartProps {
  data: DailyRecord[];
}

const COLORS = {
  [AnomalyType.SINGLE_PUNCH]: '#ef4444',
  [AnomalyType.MULTIPLE_PUNCHES]: '#f97316',
  [AnomalyType.NONE]: '#22c55e',
};

export const AnomalyDistributionChart: React.FC<ChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const anomalyCounts = {
      [AnomalyType.SINGLE_PUNCH]: 0,
      [AnomalyType.MULTIPLE_PUNCHES]: 0,
      [AnomalyType.NONE]: 0,
    };

    data.forEach(record => {
      anomalyCounts[record.anomaly]++;
    });

    return Object.entries(anomalyCounts).map(([name, value]) => ({ name, value }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as AnomalyType]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
