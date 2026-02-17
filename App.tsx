
import React, { useMemo, useCallback } from 'react';
import { DailyRecord, Punch, Shift, KPI, AppSettings } from './types';
import { processPunches } from './utils/calculator';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { AttendanceTable } from './components/AttendanceTable';
import { Filters } from './components/Filters';
import { CsvIcon } from './components/icons/CsvIcon';
import { PdfIcon } from './components/icons/PdfIcon';
import { FullscreenIcon } from './components/icons/FullscreenIcon';
import { ExitFullscreenIcon } from './components/icons/ExitFullscreenIcon';
import { useQuery } from '@tanstack/react-query';
import { db } from './db';
import { useAppStore } from './store';
import { Toaster, toast } from 'sonner';
import { PunchModal } from './components/modals/PunchModal';
import { ConfirmClearModal } from './components/modals/ConfirmClearModal';
import { Settings } from './components/Settings';
import { MonthlySummary } from './components/MonthlySummary';
import { isWeekend, addDays } from 'date-fns';

const App: React.FC = () => {
    const { filters, setFilters, openModal, history, popHistory } = useAppStore();
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [isProcessingFile, setIsProcessingFile] = React.useState(false);

    const { data: punches = [], isLoading: isLoadingPunches, isFetching } = useQuery<Punch[]>({
        queryKey: ['punches'],
        queryFn: () => db.punches.orderBy('dateTime').toArray(),
    });
    
    const { data: settings } = useQuery<AppSettings>({
        queryKey: ['settings'],
        queryFn: async () => (await db.settings.toCollection().first()) || { deductLunchBreak: true, lunchBreakThreshold: 45, holidays: [] }
    });

    const [customShift, setCustomShift] = React.useState<Shift>({ name: 'Personnalisé', startTime: '', endTime: ''});

    const dailyRecords = useMemo(() => {
        if (punches.length === 0) return [];
        return processPunches(punches, customShift, settings);
    }, [punches, customShift, settings]);
    
    const filteredRecords = useMemo(() => {
        return dailyRecords.filter(record => {
            const recordDate = new Date(record.date);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            return (
                (filters.employeeName === '' || record.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase())) &&
                (filters.employeeId === '' || record.employeeId === filters.employeeId) &&
                (!startDate || recordDate >= startDate) &&
                (!endDate || recordDate <= endDate)
            );
        });
    }, [dailyRecords, filters]);

    const kpis: KPI = useMemo(() => {
        const recordCount = filteredRecords.length;
        if (recordCount === 0) return { punctualityRate: 0, averageLateness: 0, absenteeismRate: 0, bestEmployee: null, worstEmployee: null };

        const onTimeCount = filteredRecords.filter(r => r.latenessMinutes === 0).length;
        const totalLateness = filteredRecords.reduce((sum, r) => sum + r.latenessMinutes, 0);
        
        let absenteeismRate = 0;
        if(filters.startDate && filters.endDate) {
            const employeeIds = [...new Set(punches.map(p => p.employeeId))];
            const start = new Date(filters.startDate);
            const end = new Date(filters.endDate);
            let totalWorkDays = 0;
            let totalAbsences = 0;
            
            for(let d = start; d <= end; d = addDays(d, 1)) {
                if(!isWeekend(d) && !settings?.holidays.includes(d.toISOString().split('T')[0])) {
                    totalWorkDays++;
                }
            }

            if(totalWorkDays > 0 && employeeIds.length > 0) {
                 employeeIds.forEach(id => {
                    for(let d = start; d <= end; d = addDays(d, 1)) {
                         if(!isWeekend(d) && !settings?.holidays.includes(d.toISOString().split('T')[0])) {
                             const hasRecord = dailyRecords.some(r => r.employeeId === id && r.date === d.toISOString().split('T')[0]);
                             if(!hasRecord) totalAbsences++;
                         }
                    }
                 });
                absenteeismRate = (totalAbsences / (totalWorkDays * employeeIds.length)) * 100;
            }
        }
        
        const employeeLateness: { [name: string]: { total: number, count: number } } = {};
        filteredRecords.forEach(r => {
            if(!employeeLateness[r.employeeName]) employeeLateness[r.employeeName] = { total: 0, count: 0 };
            employeeLateness[r.employeeName].total += r.latenessMinutes;
            employeeLateness[r.employeeName].count++;
        });

        const employeeAverages = Object.entries(employeeLateness).map(([name, data]) => ({ name, value: data.total }));
        employeeAverages.sort((a,b) => a.value - b.value);
        
        return {
            punctualityRate: (onTimeCount / recordCount) * 100,
            averageLateness: recordCount > 0 ? totalLateness / recordCount : 0,
            absenteeismRate,
            bestEmployee: employeeAverages[0] || null,
            worstEmployee: employeeAverages[employeeAverages.length - 1] || null,
        };

    }, [filteredRecords, dailyRecords, punches, filters.startDate, filters.endDate, settings]);

    const toggleFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    }, []);

    const exportToCsv = useCallback(() => {
        if (filteredRecords.length === 0) {
            toast.info("Aucune donnée à exporter.");
            return;
        }
        const headers = ['ID Employé', 'Nom Employé', 'Date', 'Heure', 'Type', 'Retard (min)', 'Départ Anticipé (min)'];
        
        const rows = filteredRecords.flatMap(record => 
            record.punches.map(punch => {
                let lateness = 0;
                let earlyDeparture = 0;
                if (punch.state === 'C/In' && record.firstIn && punch.dateTime.getTime() === record.firstIn.getTime()) {
                    lateness = record.latenessMinutes;
                }
                if (punch.state === 'C/Out' && record.lastOut && punch.dateTime.getTime() === record.lastOut.getTime()) {
                    earlyDeparture = record.earlyDepartureMinutes;
                }
                return [
                    `"${punch.employeeId}"`,
                    `"${punch.employeeName}"`,
                    `"${new Date(record.date).toLocaleDateString()}"`,
                    `"${punch.dateTime.toLocaleTimeString()}"`,
                    `"${punch.state}"`,
                    lateness,
                    earlyDeparture
                ].join(',');
            })
        );

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "details-pointages.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Export CSV réussi.");
    }, [filteredRecords]);

    const exportToPdf = useCallback(() => {
        if (filteredRecords.length === 0) {
            toast.info("Aucune donnée à exporter.");
            return;
        }
        const doc = new (window as any).jspdf.jsPDF();
        const tableColumn = ['ID', 'Nom', 'Date', 'Heure', 'Type', 'Retard', 'Départ Anticipé'];
        const tableRows: any[] = [];

        filteredRecords.forEach(record => {
            record.punches.forEach(punch => {
                 let lateness = 0;
                let earlyDeparture = 0;
                if (punch.state === 'C/In' && record.firstIn && punch.dateTime.getTime() === record.firstIn.getTime()) {
                    lateness = record.latenessMinutes;
                }
                if (punch.state === 'C/Out' && record.lastOut && punch.dateTime.getTime() === record.lastOut.getTime()) {
                    earlyDeparture = record.earlyDepartureMinutes;
                }

                const punchData = [
                    punch.employeeId,
                    punch.employeeName,
                    new Date(record.date).toLocaleDateString(),
                    punch.dateTime.toLocaleTimeString(),
                    punch.state,
                    lateness > 0 ? `${lateness} min` : '-',
                    earlyDeparture > 0 ? `${earlyDeparture} min` : '-',
                ];
                tableRows.push(punchData);
            });
        });

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });
        doc.text("Détails des pointages", 14, 15);
        doc.save("details-pointages.pdf");
        toast.success("Export PDF réussi.");
    }, [filteredRecords]);


    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <Toaster richColors />
            <PunchModal allPunches={punches} />
            <ConfirmClearModal />

            <header className="bg-white shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord de Pointage</h1>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => openModal('add')} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">➕ Ajouter un pointage</button>
                        <button onClick={exportToCsv} className="p-2 rounded-full hover:bg-gray-200" title="Exporter CSV"><CsvIcon className="w-5 h-5 text-gray-600" /></button>
                        <button onClick={exportToPdf} className="p-2 rounded-full hover:bg-gray-200" title="Exporter PDF"><PdfIcon className="w-5 h-5 text-gray-600" /></button>
                        <button onClick={toggleFullscreen} className="p-2 rounded-full hover:bg-gray-200" title="Plein écran">
                            {isFullscreen ? <ExitFullscreenIcon className="w-5 h-5 text-gray-600" /> : <FullscreenIcon className="w-5 h-5 text-gray-600" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <FileUpload onProcessing={setIsProcessingFile}/>

                {(isLoadingPunches || isFetching || isProcessingFile) && <div className="text-center py-10">Chargement des données...</div>}

                {!isLoadingPunches && !isProcessingFile && punches.length > 0 && (
                    <>
                        <Filters dailyRecords={dailyRecords} onFilterChange={setFilters} customShift={customShift} onCustomShiftChange={setCustomShift}/>
                        <Dashboard data={filteredRecords} kpis={kpis} />
                        <MonthlySummary records={filteredRecords} />
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">Détails des pointages</h2>
                            <AttendanceTable dailyRecords={filteredRecords} />
                        </div>
                        <Settings />
                    </>
                )}

                 {!isLoadingPunches && !isProcessingFile && punches.length === 0 && (
                     <div className="text-center py-20 bg-white rounded-lg shadow">
                         <h2 className="text-xl font-semibold text-gray-700">Bienvenue !</h2>
                         <p className="mt-2 text-gray-500">Commencez par importer un fichier de pointage pour analyser les données.</p>
                         <div className="mt-6"><Settings /></div>
                     </div>
                 )}
            </main>
        </div>
    );
};

export default App;
