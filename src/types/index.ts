export type ShiftType = 'morning' | 'middle' | 'evening' | 'rest' | 'custom';

export type CheckinStatus = 'normal' | 'late' | 'early_leave' | 'absent' | 'pending';

export type ExceptionType = 'late' | 'early_leave' | 'absent' | 'distance' | 'photo' | 'other';

export type LeaveType = 'annual' | 'sick' | 'personal' | 'compensation' | 'maternity' | 'other';

export type ApprovalStatus = 'pending_store' | 'pending_hr' | 'approved' | 'rejected';

export type TicketStatus = 'pending' | 'processing' | 'resolved' | 'rejected';

export type Priority = 'high' | 'medium' | 'low';

export type UserRole = 'store_manager' | 'hr' | 'employee';

export interface Store {
  id: string;
  name: string;
  address: string;
  manager: string;
  lat: number;
  lng: number;
  employeeCount: number;
  createdAt: string;
}

export interface Employee {
  id: string;
  storeId: string;
  name: string;
  position: string;
  phone: string;
  avatar: string;
  status: 'active' | 'inactive' | 'blacklist';
  joinDate: string;
  annualLeaveDays: number;
  sickLeaveDays: number;
  compLeaveDays: number;
  usedAnnualLeave: number;
  usedSickLeave: number;
  usedCompLeave: number;
}

export interface Schedule {
  id: string;
  employeeId: string;
  storeId: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  isSupport: boolean;
  supportStoreId?: string;
  note?: string;
  isSwapGenerated?: boolean;
  swapRequestId?: string;
  swapWithEmployeeId?: string;
}

export interface CheckinRecord {
  id: string;
  employeeId: string;
  storeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  photo: string;
  location: string;
  distance: number;
  status: CheckinStatus;
  isDistanceAbnormal: boolean;
  isPhotoAbnormal: boolean;
}

export interface ExceptionTicket {
  id: string;
  employeeId: string;
  storeId: string;
  type: ExceptionType;
  date: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  appeal?: string;
  createdAt: string;
  handler?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  storeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
  managerComment?: string;
  hrComment?: string;
  currentHandlerId?: string;
  currentHandlerName?: string;
  reminderCount?: number;
  lastReminderAt?: string;
  handoffRecords?: HandoffRecord[];
}

export interface SwapRequest {
  id: string;
  applicantId: string;
  targetId: string;
  storeId: string;
  applicantDate: string;
  targetDate: string;
  applicantShift: ShiftType;
  targetShift: ShiftType;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
  managerComment?: string;
  hrComment?: string;
  currentHandlerId?: string;
  currentHandlerName?: string;
  reminderCount?: number;
  lastReminderAt?: string;
  handoffRecords?: HandoffRecord[];
}

export interface HandoffRecord {
  id: string;
  fromHandlerId: string;
  fromHandlerName: string;
  toHandlerId: string;
  toHandlerName: string;
  reason: string;
  createdAt: string;
}

export type ApprovalAction = 'approve' | 'reject' | 'urge' | 'handoff';

export interface ApprovalRecord {
  id: string;
  sourceId: string;
  sourceType: 'leave' | 'swap' | 'exception';
  approverId: string;
  approverName: string;
  approverRole: 'store_manager' | 'hr' | 'assistant_manager';
  result: ApprovalStatus;
  comment: string;
  createdAt: string;
  action?: ApprovalAction;
}

export interface AttendanceSummary {
  id: string;
  employeeId: string;
  storeId: string;
  year: number;
  month: number;
  workDays: number;
  actualDays: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentCount: number;
  leaveDays: number;
  bonus: number;
  fine: number;
  isLocked: boolean;
  manualAdjustments?: ManualAdjustment[];
}

export interface ManualAdjustment {
  id: string;
  type: 'bonus' | 'fine';
  amount: number;
  reason: string;
  operator: string;
  createdAt: string;
}

export interface StoreRanking {
  storeId: string;
  storeName: string;
  attendanceRate: number;
  exceptionCount: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

export interface BlacklistRule {
  id: string;
  name: string;
  type: 'late_count' | 'absent_count' | 'continuous_absent';
  threshold: number;
  period: 'month' | 'quarter' | 'year';
  description: string;
  enabled: boolean;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  color: string;
}

export interface BonusImpactItem {
  id: string;
  type: 'absent' | 'late' | 'early_leave' | 'leave' | 'exception' | 'manual_bonus' | 'manual_fine';
  date: string;
  description: string;
  impactAmount: number;
  sourceId: string;
  sourceType: string;
}

export interface MonthAuditDetail {
  employeeId: string;
  employeeName: string;
  storeId: string;
  year: number;
  month: number;
  totalBonus: number;
  totalFine: number;
  impactItems: BonusImpactItem[];
  approvedLeaves: LeaveRequest[];
  resolvedExceptions: ExceptionTicket[];
  absentRecords: CheckinRecord[];
  lateRecords: CheckinRecord[];
  earlyLeaveRecords: CheckinRecord[];
  manualAdjustments: ManualAdjustment[];
}
