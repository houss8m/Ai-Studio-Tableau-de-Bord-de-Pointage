
import React, { useMemo } from 'react';
import { DailyRecord, Shift } from '../types';

interface FiltersProps {
  dailyRecords: DailyRecord[];
  onFilterChange: (filters: any) => void;
  onCustomShiftChange: (shift: Shift) => void;
  customShift: Shift;
}

export const Filters: React.FC<FiltersProps> = ({ dailyRecords, onFilterChange, onCustomShiftChange, customShift }) => {

  const employees = useMemo(() => {
    const uniqueEmployees = new Map<string, string>();
    dailyRecords.forEach(r => uniqueEmployees.set(r.employeeId, r.employeeName));
    return Array.from(uniqueEmployees.entries()).map(([id, name]) => ({ id, name }));
  }, [dailyRecords]);

  const handleFilter = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFilterChange((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleShiftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCustomShiftChange({ ...customShift, [e.target.name]: e.target.value});
  }
  
  const inputStyles = "block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm";

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Basic Filters */}
        <input type="text" name="employeeName" placeholder="Rechercher par nom..." onChange={handleFilter} className={inputStyles} />
        <select name="employeeId" onChange={handleFilter} className={inputStyles}>
          <option value="">Tous les employés</option>
          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
        <div className="flex items-center space-x-2">
            <input type="date" name="startDate" onChange={handleFilter} className={inputStyles}/>
            <span className="text-gray-500">-</span>
            <input type="date" name="endDate" onChange={handleFilter} className={inputStyles}/>
        </div>

        {/* Custom Shift */}
        <details className="md:col-span-2 lg:col-span-1">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">Horaires personnalisés</summary>
            <div className="mt-2 flex items-center space-x-2 bg-gray-50 p-2 rounded-md">
                 <input type="time" name="startTime" value={customShift.startTime} onChange={handleShiftChange} className={inputStyles}/>
                <span className="text-gray-500">-</span>
                <input type="time" name="endTime" value={customShift.endTime} onChange={handleShiftChange} className={inputStyles}/>
            </div>
        </details>
      </div>
    </div>
  );
};
