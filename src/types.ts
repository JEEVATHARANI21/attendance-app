export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type ShiftType = 'DAY' | 'SHIFT' | 'NIGHT';

export interface User {
  id: string;
  name: string;
  role: Role;
  position: string;
  department?: string;
  baseSalary?: number;
  shiftType?: ShiftType;
  shiftTiming?: string;
  lunchTime?: string;
  shortBreak?: string;
  faceEnrolled?: boolean;
  faceData?: string;
  advanceAmount?: number;
  avatar?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  clockIn: Date;
  clockOut?: Date;
  location: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  penalty: number;
  shift: ShiftType;
  synced?: boolean;
}

export interface AppNotification {
  id: string;
  type: 'ALERT' | 'APPROVAL' | 'UPDATE';
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  targetRole?: Role[];
}

export interface PayrollRecord {
  id: string;
  userId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  total: number;
  status: 'PAID' | 'PENDING';
}
