
import React from 'react';
import { DailyRecord, KPI } from '../types';
import { KPI_Card } from './KPI_Card';
import { LatenessTrendChart } from './charts/LatenessTrendChart';
import { TopLatenessChart } from './charts/TopLatenessChart';
import { AnomalyDistributionChart } from './charts/AnomalyDistributionChart';
import { ArrivalHeatmap } from './charts/ArrivalHeatmap';

interface DashboardProps {
    data: DailyRecord[];
    kpis: KPI;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, kpis }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <KPI_Card title="Taux de ponctualité" value={`${kpis.punctualityRate.toFixed(1)}%`} changeType={kpis.punctualityRate > 90 ? 'increase' : 'decrease'} />
                <KPI_Card title="Moyenne des retards" value={`${kpis.averageLateness.toFixed(1)} min`} />
                <KPI_Card title="Meilleur employé" value={kpis.bestEmployee?.name ?? 'N/A'} subValue={kpis.bestEmployee ? `${kpis.bestEmployee.value} min de retard` : ''}/>
                <KPI_Card title="Pire employé" value={kpis.worstEmployee?.name ?? 'N/A'} subValue={kpis.worstEmployee ? `${kpis.worstEmployee.value} min de retard` : ''} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendance des retards par jour</h3>
                    <LatenessTrendChart data={data} />
                </div>
                <div className="p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 des retardataires</h3>
                    <TopLatenessChart data={data} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition des anomalies</h3>
                    <AnomalyDistributionChart data={data} />
                </div>
                <div className="lg:col-span-2 p-4 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Heatmap des heures d'arrivée</h3>
                     <ArrivalHeatmap data={data} />
                </div>
            </div>
        </div>
    );
};
