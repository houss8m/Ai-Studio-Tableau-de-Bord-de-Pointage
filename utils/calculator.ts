
import { Punch, DailyRecord, Shift, AnomalyType, AppSettings } from '../types';
import { differenceInMinutes, getDay } from 'date-fns';

const SHIFTS: { [key: string]: Shift } = {
  morning: { name: 'Matin', startTime: '09:00', endTime: '18:00' },
  afternoon: { name: 'Après-midi', startTime: '14:00', endTime: '21:00' },
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const processPunches = (punches: Punch[], customShift?: Shift, settings?: AppSettings): DailyRecord[] => {
  if (punches.length === 0) return [];

  const groupedByEmployeeAndDate: { [key: string]: Punch[] } = {};

  punches.forEach(punch => {
    const dateKey = punch.dateTime.toISOString().split('T')[0];
    const key: string = `${punch.employeeId}-${dateKey}`;
    if (!groupedByEmployeeAndDate[key]) {
      groupedByEmployeeAndDate[key] = [];
    }
    groupedByEmployeeAndDate[key].push(punch);
  });

  const dailyRecords: DailyRecord[] = Object.values(groupedByEmployeeAndDate).map(dayPunches => {
    const sortedPunches = dayPunches.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const firstPunch = sortedPunches[0];
    const inPunches = sortedPunches.filter(p => p.state === 'C/In');
    const outPunches = sortedPunches.filter(p => p.state === 'C/Out');

    const firstIn = inPunches[0]?.dateTime ?? null;
    const lastOut = outPunches[outPunches.length - 1]?.dateTime ?? null;

    let shift: Shift;
    if (customShift && customShift.startTime && customShift.endTime) {
        shift = { ...customShift, name: 'Personnalisé'};
    } else if (firstIn && firstIn.getHours() < 12) {
      shift = SHIFTS.morning;
    } else {
      shift = SHIFTS.afternoon;
    }

    let latenessMinutes = 0;
    if (firstIn) {
      const shiftStartMinutes = timeToMinutes(shift.startTime);
      const arrivalMinutes = firstIn.getHours() * 60 + firstIn.getMinutes();
      latenessMinutes = Math.max(0, arrivalMinutes - shiftStartMinutes);
    }

    let earlyDepartureMinutes = 0;
    if (lastOut) {
      const shiftEndMinutes = timeToMinutes(shift.endTime);
      const departureMinutes = lastOut.getHours() * 60 + lastOut.getMinutes();
      earlyDepartureMinutes = Math.max(0, shiftEndMinutes - departureMinutes);
    }
    
    let anomaly = AnomalyType.NONE;
    if (sortedPunches.length === 1) {
      anomaly = AnomalyType.SINGLE_PUNCH;
    } else if (sortedPunches.length > 2) {
      anomaly = AnomalyType.MULTIPLE_PUNCHES;
    }

    let workedMinutes = 0;
    if (firstIn && lastOut) {
        workedMinutes = differenceInMinutes(lastOut, firstIn);

        if (settings?.deductLunchBreak) {
            for (let i = 0; i < sortedPunches.length - 1; i++) {
                const p1 = sortedPunches[i];
                const p2 = sortedPunches[i+1];
                if(p1.state === 'C/Out' && p2.state === 'C/In') {
                    const breakDuration = differenceInMinutes(p2.dateTime, p1.dateTime);
                    if (breakDuration > (settings.lunchBreakThreshold ?? 45)) {
                        workedMinutes -= breakDuration;
                    }
                }
            }
        }
    }
    
    let overtimeMinutes = 0;
    if(lastOut) {
        const shiftEndMinutes = timeToMinutes(shift.endTime);
        const departureMinutes = lastOut.getHours() * 60 + lastOut.getMinutes();
        overtimeMinutes = Math.max(0, departureMinutes - shiftEndMinutes);
    }

    return {
      employeeId: firstPunch.employeeId,
      employeeName: firstPunch.employeeName,
      date: firstPunch.dateTime.toISOString().split('T')[0],
      shift,
      punches: sortedPunches,
      firstIn,
      lastOut,
      latenessMinutes,
      earlyDepartureMinutes,
      anomaly,
      workedHours: workedMinutes > 0 ? workedMinutes / 60 : 0,
      overtimeMinutes
    };
  });

  return dailyRecords.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.employeeName.localeCompare(b.employeeName));
};
