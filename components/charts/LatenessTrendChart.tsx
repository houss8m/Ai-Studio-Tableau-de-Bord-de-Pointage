
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyRecord } from '../../types';

interface ChartProps {
  data: DailyRecord[];
}

export const LatenessTrendChart: React.FC<ChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const dailyLateness: { [date: string]: { totalLateness: number; count: number } } = {};

    data.forEach(record => {
      if (!dailyLateness[record.date]) {
        dailyLateness[record.date] = { totalLateness: 0, count: 0 };
      }
      if (record.latenessMinutes > 0) {
        dailyLateness[record.date].totalLateness += record.latenessMinutes;
      }
      dailyLateness[record.date].count++;
    });

    return Object.entries(dailyLateness)
      .map(([date, { totalLateness, count }]) => ({
        date,
        'Retard moyen (min)': count > 0 ? totalLateness / count : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Retard moyen (min)" stroke="#ef4444" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};
