
export interface Punch {
  id?: number; // Optional because it's auto-incremented by IndexedDB
  uid: string; // Unique ID for each punch
  employeeId: string;
  employeeName: string;
  dateTime: Date;
  state: 'C/In' | 'C/Out';
  originalRecord: string;
  manual?: boolean;
}

export interface Shift {
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export enum AnomalyType {
  SINGLE_PUNCH = 'Pointage Unique',
  MULTIPLE_PUNCHES = 'Pointages Multiples',
  NONE = 'Aucune',
}

export interface DailyRecord {
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  shift: Shift;
  punches: Punch[];
  firstIn: Date | null;
  lastOut: Date | null;
  latenessMinutes: number;
  earlyDepartureMinutes: number;
  workedHours: number; // in hours
  overtimeMinutes: number;
  anomaly: AnomalyType;
}

export interface KPI {
  punctualityRate: number;
  averageLateness: number;
  absenteeismRate: number;
  bestEmployee: { name: string; value: number } | null;
  worstEmployee: { name: string; value: number } | null;
}

export interface AppSettings {
    id?: number;
    deductLunchBreak: boolean;
    lunchBreakThreshold: number; // in minutes
    holidays: string[]; // dates in 'YYYY-MM-DD' format
}
