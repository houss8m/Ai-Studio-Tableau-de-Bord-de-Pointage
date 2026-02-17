
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyRecord } from '../../types';

interface ChartProps {
  data: DailyRecord[];
}

export const TopLatenessChart: React.FC<ChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const employeeLateness: { [name: string]: number } = {};

    data.forEach(record => {
      if (!employeeLateness[record.employeeName]) {
        employeeLateness[record.employeeName] = 0;
      }
      employeeLateness[record.employeeName] += record.latenessMinutes;
    });

    return Object.entries(employeeLateness)
      .map(([name, totalLateness]) => ({
        name,
        'Retard total (min)': totalLateness,
      }))
      .sort((a, b) => b['Retard total (min)'] - a['Retard total (min)'])
      .slice(0, 5);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={80} />
        <Tooltip />
        <Legend />
        <Bar dataKey="Retard total (min)" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};
