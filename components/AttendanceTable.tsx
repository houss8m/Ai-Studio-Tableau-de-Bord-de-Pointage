
import React, { useMemo } from 'react';
import { DailyRecord, AnomalyType, Punch } from '../types';
import { useAppStore } from '../store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db';
import { toast } from 'sonner';

interface AttendanceTableProps {
  dailyRecords: DailyRecord[];
}

const ShiftBadge: React.FC<{ shiftName: string }> = ({ shiftName }) => {
  const color = useMemo(() => {
    switch (shiftName.toLowerCase()) {
      case 'matin': return 'bg-sky-100 text-sky-800';
      case 'après-midi': return 'bg-amber-100 text-amber-800';
      case 'personnalisé': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, [shiftName]);

  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{shiftName}</span>;
};

const OvertimeBadge: React.FC<{ minutes: number }> = ({ minutes }) => {
    if (minutes <= 0) return null;
    const color = minutes > 60 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';
    return <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{minutes} min</span>
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ dailyRecords }) => {
    const { openModal, addHistory } = useAppStore();
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async (punchId: number) => {
            const punchToDelete = await db.punches.get(punchId);
            if(!punchToDelete) throw new Error("Pointage non trouvé");
            await db.punches.delete(punchId);
            return punchToDelete;
        },
        onSuccess: (deletedPunch) => {
            toast.success("Pointage supprimé");
            addHistory({ type: 'delete', data: deletedPunch! });
            queryClient.invalidateQueries({ queryKey: ['punches'] });
        },
        onError: (err) => toast.error(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`),
    });

    const handleDelete = (punch: Punch) => {
        if (punch.id && window.confirm("Êtes-vous sûr de vouloir supprimer ce pointage ?")) {
            deleteMutation.mutate(punch.id);
        }
    }
    
    const allPunches = useMemo(() => {
        return dailyRecords.flatMap(record => {
            const isAnomaly = record.anomaly !== AnomalyType.NONE;
            return record.punches.map(punch => {
                let lateness = 0;
                let earlyDeparture = 0;

                if (punch.state === 'C/In' && record.firstIn && punch.dateTime.getTime() === record.firstIn.getTime()) {
                    lateness = record.latenessMinutes;
                }
                if (punch.state === 'C/Out' && record.lastOut && punch.dateTime.getTime() === record.lastOut.getTime()) {
                    earlyDeparture = record.earlyDepartureMinutes;
                }
                
                const isLastOut = record.lastOut ? punch.dateTime.getTime() === record.lastOut.getTime() : false;

                return {
                    ...punch,
                    date: record.date,
                    shiftName: record.shift.name,
                    isAnomaly,
                    lateness,
                    earlyDeparture,
                    workedHours: record.workedHours,
                    overtimeMinutes: record.overtimeMinutes,
                    isLastOut,
                };
            });
        });
    }, [dailyRecords]);

    if (dailyRecords.length === 0) {
        return <div className="text-center py-10 text-gray-500">Aucune donnée à afficher.</div>
    }

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Heure</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retard / Départ Anticipé (min)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heures Travaillées</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {allPunches.map((punch) => (
                        <tr key={punch.uid} className={`${punch.isAnomaly ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{punch.employeeName}</div>
                                <div className="text-sm text-gray-500">ID: {punch.employeeId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>{new Date(punch.date).toLocaleDateString()}</div>
                                <div className="font-semibold">{punch.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {punch.state === 'C/In' 
                                    ? <span className="text-emerald-600">Entrée</span> 
                                    : <span className="text-red-600">Sortie</span>
                                }
                                {punch.manual && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1 rounded">M</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <ShiftBadge shiftName={punch.shiftName} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {punch.lateness > 0 && <span className="text-red-600 font-bold">Retard: {punch.lateness} min</span>}
                                {punch.earlyDeparture > 0 && <span className="text-orange-600 font-semibold">Départ anticipé: {punch.earlyDeparture} min</span>}
                                {punch.lateness === 0 && punch.earlyDeparture === 0 && '-'}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                                {punch.isLastOut && <span>{(punch.workedHours || 0).toFixed(2)}h</span>}
                                {punch.isLastOut && punch.overtimeMinutes > 0 && <OvertimeBadge minutes={punch.overtimeMinutes} />}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onClick={() => openModal('edit', punch)} className="text-indigo-600 hover:text-indigo-900">✏️</button>
                                <button onClick={() => handleDelete(punch)} className="ml-4 text-red-600 hover:text-red-900">🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
