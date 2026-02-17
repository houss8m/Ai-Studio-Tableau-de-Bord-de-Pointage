
import React from 'react';

interface KPI_CardProps {
  title: string;
  value: string;
  subValue?: string;
  changeType?: 'increase' | 'decrease';
}

export const KPI_Card: React.FC<KPI_CardProps> = ({ title, value, subValue, changeType }) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
            <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
                 {subValue && (
                     <p className="ml-2 text-sm text-gray-500">{subValue}</p>
                 )}
            </div>
          </div>
          {changeType && (
            <div className="flex-shrink-0">
              {changeType === 'increase' ? (
                <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
