// FIX: Changed the Dexie import from a named import (`{ Dexie }`) to a default import (`Dexie`).
// The Dexie constructor class is the default export of the 'dexie' package. The original import
// was likely grabbing a type definition instead of the class, which caused methods like `.version()`
// and `.transaction()` to be unrecognized on the subclass.
import Dexie, { Table } from 'dexie';
import { Punch, AppSettings } from './types';

/**
 * Database class for managing employee attendance data using Dexie.
 * We extend Dexie and define the schema inside the constructor to ensure
 * proper type inheritance and initialization.
 */
export class EmployeeAttendanceDB extends Dexie {
  // Define table properties with the Table type.
  punches!: Table<Punch, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('EmployeeAttendanceDB');
    
    // Defining the schema within the constructor is the standard and recommended pattern 
    // for Dexie with TypeScript to ensure that 'this' is correctly typed as a Dexie instance.
    this.version(1).stores({
      // Table configuration:
      // '++id' for an auto-incrementing primary key.
      // '&[employeeId+dateTime]' for a unique composite index to prevent duplicate records.
      // 'employeeId' for filtering by employee.
      // 'dateTime' index is added to allow sorting by date/time.
      punches: '++id, &[employeeId+dateTime], employeeId, dateTime',
      settings: '++id',
    });
  }
}

// Create a singleton instance of the database to be shared across the application.
export const db = new EmployeeAttendanceDB();