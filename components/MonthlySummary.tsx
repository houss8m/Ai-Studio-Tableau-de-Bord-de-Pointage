
import React, { useMemo } from 'react';
import { DailyRecord } from '../types';

interface MonthlySummaryProps {
    records: DailyRecord[];
}

interface SummaryData {
    employeeId: string;
    employeeName: string;
    daysWorked: number;
    totalHours: number;
    totalLateness: number;
    totalOvertime: number;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ records }) => {

    const summaryData = useMemo<SummaryData[]>(() => {
        const summaryMap = new Map<string, SummaryData>();
        records.forEach(r => {
            let entry = summaryMap.get(r.employeeId);
            if (!entry) {
                entry = {
                    employeeId: r.employeeId,
                    employeeName: r.employeeName,
                    daysWorked: 0,
                    totalHours: 0,
                    totalLateness: 0,
                    totalOvertime: 0,
                };
            }
            entry.daysWorked++;
            entry.totalHours += r.workedHours;
            entry.totalLateness += r.latenessMinutes;
            entry.totalOvertime += r.overtimeMinutes;
            summaryMap.set(r.employeeId, entry);
        });
        return Array.from(summaryMap.values()).sort((a,b) => a.employeeName.localeCompare(b.employeeName));
    }, [records]);

    const exportToCsv = () => {
        const headers = ['Nom Employé', 'Jours Travaillés', 'Heures Totales', 'Retards Cumulés (min)', 'Heures Sup. (min)'];
        const rows = summaryData.map(s => [
            s.employeeName,
            s.daysWorked,
            s.totalHours.toFixed(2),
            s.totalLateness,
            s.totalOvertime
        ]);
        let csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "cumuls-mensuels.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (records.length === 0) {
        return null;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">📊 Cumuls Mensuels</h3>
                <button onClick={exportToCsv} className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">Export CSV</button>
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jours Travaillés</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures Totales</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retards (min)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heures Sup. (min)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {summaryData.map(s => (
                            <tr key={s.employeeId}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{s.employeeName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{s.daysWorked}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{s.totalHours.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{s.totalLateness}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{s.totalOvertime}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
