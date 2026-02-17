
import React, { useMemo } from 'react';
import { DailyRecord } from '../../types';

interface HeatmapProps {
  data: DailyRecord[];
}

const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

export const ArrivalHeatmap: React.FC<HeatmapProps> = ({ data }) => {
  const heatmapData = useMemo(() => {
    const grid = Array(7).fill(0).map(() => Array(14).fill(0));
    data.forEach(record => {
      if (record.firstIn) {
        const day = record.firstIn.getDay();
        const hour = record.firstIn.getHours();
        if (hour >= 7 && hour <= 20) {
          grid[day][hour - 7]++;
        }
      }
    });
    return grid;
  }, [data]);

  const maxVal = useMemo(() => Math.max(1, ...heatmapData.flat()), [heatmapData]);

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    const opacity = Math.min(1, 0.1 + value / maxVal * 0.9);
    return `bg-blue-500`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex">
        <div className="flex flex-col text-xs text-gray-500 pr-2 pt-6">
          {days.map(day => (
            <div key={day} className="h-8 flex items-center">{day}</div>
          ))}
        </div>
        <div className="flex-grow">
          <div className="flex text-xs text-gray-500 justify-around">
            {hours.map(hour => (
              <div key={hour} className="w-8 text-center">{hour}h</div>
            ))}
          </div>
          {heatmapData.map((row, dayIndex) => (
            <div key={dayIndex} className="flex justify-around">
              {row.map((value, hourIndex) => (
                 <div key={hourIndex} className="w-8 h-8 flex items-center justify-center group relative">
                    <div className={`w-full h-full rounded-sm ${getColor(value)}`} style={{opacity: value > 0 ? Math.min(1, 0.1 + value / maxVal * 0.9) : 1}} />
                    {value > 0 && <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {value} arrivée{value > 1 ? 's' : ''}
                    </div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
