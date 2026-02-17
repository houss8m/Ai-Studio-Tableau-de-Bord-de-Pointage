
import { Punch } from '../types';

// Parses DD-MM-YYYY HH:MM format
const parseCustomDate = (dateString: string): Date | null => {
  const parts = dateString.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/);
  if (!parts) return null;
  const [, day, month, year, hours, minutes] = parts;
  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);
};

// Parses date from DD/MM/YYYY and time from HH:mm
const parseSummaryDateTime = (dateStr: string, timeStr: string): Date | null => {
    const dateParts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const time = timeStr.trim();
    if (!dateParts || !time || !/(\d{2}):(\d{2})/.test(time)) return null;
    
    const [, day, month, year] = dateParts;
    return new Date(`${year}-${month}-${day}T${time}:00`);
};

export const parseTxtFile = (content: string): Punch[] => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const punches: Punch[] = [];

  lines.forEach((line, index) => {
    const parts = line.split(/\s+/).filter(p => p);
    if (parts.length >= 4) {
      // Assuming format: AC-No Name ... Time State
      // Example: 123 John Doe ... 01-09-2023 09:05 C/In
      const employeeId = parts[0];
      const state = parts[parts.length - 1];
      const time = parts[parts.length - 2];
      const date = parts[parts.length - 3];
      const dateTimeStr = `${date} ${time}`;
      const dateTime = parseCustomDate(dateTimeStr);

      // Name could be multiple parts
      const name = parts.slice(1, parts.length - 3).join(' ');

      if (employeeId && name && dateTime && (state === 'C/In' || state === 'C/Out')) {
        punches.push({
          // FIX: Changed `id` to `uid` to match the Punch interface. `id` is a number for the DB, `uid` is a string.
          uid: `punch-${Date.now()}-${index}`,
          employeeId,
          employeeName: name,
          dateTime,
          state,
          originalRecord: line,
        });
      }
    }
  });

  return punches;
};


const parsePunchFormat = (dataRows: HTMLTableRowElement[]): Punch[] => {
    const punches: Punch[] = [];
    // Indices based on observed format for individual punches
    const idIndex = 0;
    const nameIndex = 2;
    const timeIndex = 3;
    const stateIndex = 4;

    dataRows.forEach((row, index) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length > stateIndex) {
            try {
                const employeeId = cells[idIndex]?.textContent?.trim() ?? '';
                const employeeName = cells[nameIndex]?.textContent?.trim() ?? '';
                const dateTimeStr = cells[timeIndex]?.textContent?.trim() ?? '';
                const stateText = cells[stateIndex]?.textContent?.trim() ?? '';
                
                let state: 'C/In' | 'C/Out' | null = null;
                if (stateText.toLowerCase().includes('in')) {
                    state = 'C/In';
                } else if (stateText.toLowerCase().includes('out')) {
                    state = 'C/Out';
                }

                const dateTime = parseCustomDate(dateTimeStr);

                if (employeeId && employeeName && dateTime && state) {
                    punches.push({
                        // FIX: Changed `id` to `uid` to match the Punch interface. `id` is a number for the DB, `uid` is a string.
                        uid: `punch-${Date.now()}-${index}`,
                        employeeId,
                        employeeName,
                        dateTime,
                        state,
                        originalRecord: row.innerText,
                    });
                }
            } catch (error) {
                console.error('Error parsing HTML row (punch format):', row.innerText, error);
            }
        }
    });
    return punches;
};

const parseSummaryFormat = (dataRows: HTMLTableRowElement[]): Punch[] => {
    const punches: Punch[] = [];
    // Indices based on observed format for daily summaries
    const idIndex = 0;
    const nameIndex = 2;
    const startTimeIndex = 3;
    const endTimeIndex = 4;
    const dateIndex = 11;

    dataRows.forEach((row, index) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length > dateIndex) {
            try {
                const employeeId = cells[idIndex]?.textContent?.trim() ?? '';
                const employeeName = cells[nameIndex]?.textContent?.trim() ?? '';
                const dateStr = cells[dateIndex]?.textContent?.trim() ?? '';
                const startTimeStr = cells[startTimeIndex]?.textContent?.trim() ?? '';
                const endTimeStr = cells[endTimeIndex]?.textContent?.trim() ?? '';

                if (employeeId && employeeName && dateStr) {
                    const startDateTime = parseSummaryDateTime(dateStr, startTimeStr);
                    if (startDateTime) {
                        punches.push({
                            // FIX: Changed `id` to `uid` to match the Punch interface. `id` is a number for the DB, `uid` is a string.
                            uid: `punch-${Date.now()}-${index}-in`,
                            employeeId,
                            employeeName,
                            dateTime: startDateTime,
                            state: 'C/In',
                            originalRecord: row.innerText,
                        });
                    }

                    const endDateTime = parseSummaryDateTime(dateStr, endTimeStr);
                    if (endDateTime) {
                         punches.push({
                            // FIX: Changed `id` to `uid` to match the Punch interface. `id` is a number for the DB, `uid` is a string.
                            uid: `punch-${Date.now()}-${index}-out`,
                            employeeId,
                            employeeName,
                            dateTime: endDateTime,
                            state: 'C/Out',
                            originalRecord: row.innerText,
                        });
                    }
                }
            } catch (error) {
                console.error('Error parsing HTML row (summary format):', row.innerText, error);
            }
        }
    });
    return punches;
};

export const parseHtmlFile = (content: string): Punch[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tr'));
  if (rows.length < 2) return [];

  const headerCells = Array.from(rows[0].querySelectorAll('td, th'));
  const headerTexts = headerCells.map(cell => cell.textContent?.trim().toLowerCase() ?? '');
  
  const dataRows = rows.slice(1);

  // Check for summary format first as it's more specific
  if (headerTexts.includes('start time') && headerTexts.includes('end time')) {
    return parseSummaryFormat(dataRows);
  } 
  // Fallback to punch format
  else {
    return parsePunchFormat(dataRows);
  }
};
