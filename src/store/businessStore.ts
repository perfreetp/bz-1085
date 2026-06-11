import { create } from 'zustand';
import { stores } from '@/data/stores';
import { employees } from '@/data/employees';
import { shiftTemplates } from '@/data/shiftTemplates';
import { schedules as initialSchedules } from '@/data/schedules';
import { checkinRecords as initialCheckins } from '@/data/checkins';
import { exceptionTickets as initialTickets } from '@/data/exceptions';
import { leaveRequests as initialLeaves } from '@/data/leaves';
import { swapRequests as initialSwaps } from '@/data/swaps';
import { attendanceSummaries as initialSummaries, blacklistRules as initialRules } from '@/data/summaries';
import { format, subWeeks, startOfWeek, addDays, differenceInHours, parseISO } from 'date-fns';
import type {
  UserRole, Schedule, ShiftType, CheckinRecord, ExceptionTicket,
  LeaveRequest, LeaveType, SwapRequest, ApprovalRecord,
  AttendanceSummary, BlacklistRule, TicketStatus,
  ApprovalStatus, MonthAuditDetail, BonusImpactItem,
  ManualAdjustment, HandoffRecord, AdjustmentType,
  ApprovalBoardStat, SettlementPreview
} from '@/types';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function migrateLeavesStatus(arr: LeaveRequest[]): LeaveRequest[] {
  return arr.map(l => {
    if ((l.status as string) === 'pending') return { ...l, status: 'pending_store' as const };
    return l;
  });
}

function migrateSwapsStatus(arr: SwapRequest[]): SwapRequest[] {
  return arr.map(s => {
    if ((s.status as string) === 'pending') return { ...s, status: 'pending_store' as const };
    return s;
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function calcWorkDays(year: number, month: number): number {
  let workDays = 0;
  const totalDays = getDaysInMonth(year, month);
  for (let d = 1; d <= totalDays; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day >= 1 && day <= 5) workDays++;
  }
  return workDays;
}

const OVERDUE_HOURS = 24;

interface BusinessState {
  currentStoreId: string;
  currentRole: UserRole;
  schedules: Schedule[];
  checkinRecords: CheckinRecord[];
  exceptionTickets: ExceptionTicket[];
  leaveRequests: LeaveRequest[];
  swapRequests: SwapRequest[];
  approvalRecords: ApprovalRecord[];
  summaries: AttendanceSummary[];
  blacklistRules: BlacklistRule[];
  lockedMonths: string[];

  setCurrentStoreId: (id: string) => void;
  setCurrentRole: (role: UserRole) => void;

  upsertSchedule: (employeeId: string, storeId: string, date: string, shiftType: ShiftType, meta?: { isSwapGenerated?: boolean; swapRequestId?: string; swapWithEmployeeId?: string }) => void;
  copyWeekSchedules: (storeId: string, fromWeekStart: string, toWeekStart: string) => void;

  addLeaveRequest: (data: { employeeId: string; storeId: string; leaveType: LeaveType; startDate: string; endDate: string; days: number; reason: string }) => void;
  addSwapRequest: (data: { applicantId: string; targetId: string; storeId: string; applicantDate: string; targetDate: string; applicantShift: ShiftType; targetShift: ShiftType; reason: string }) => void;

  canApprove: (status: ApprovalStatus, approverRole: UserRole, request?: LeaveRequest | SwapRequest) => boolean;

  approveRequest: (sourceId: string, sourceType: 'leave' | 'swap' | 'exception', approverRole: UserRole, approverId?: string, approverName?: string) => boolean;
  rejectRequest: (sourceId: string, sourceType: 'leave' | 'swap' | 'exception', approverRole: UserRole, approverId?: string, approverName?: string, comment?: string) => boolean;
  batchApproveRequests: (sourceIds: string[], sourceType: 'leave' | 'swap' | 'exception', approverRole: UserRole) => number;

  urgeRequest: (sourceId: string, sourceType: 'leave' | 'swap') => boolean;
  handoffRequest: (sourceId: string, sourceType: 'leave' | 'swap', toHandlerId: string, toHandlerName: string, reason: string) => void;

  registerAbsent: (employeeId: string, storeId: string, date: string, reason: string) => void;
  createExceptionTicket: (data: { employeeId: string; storeId: string; type: ExceptionTicket['type']; date: string; description: string; priority: ExceptionTicket['priority'] }) => void;
  resolveTicket: (ticketId: string) => void;
  rejectTicket: (ticketId: string) => void;

  lockMonth: (storeId: string, year: number, month: number) => void;
  isMonthLocked: (storeId: string, year: number, month: number) => boolean;
  addManualAdjustment: (summaryId: string, type: AdjustmentType, amount: number, reason: string) => boolean;
  adjustBonus: (summaryId: string, bonus: number, fine: number, reason?: string) => boolean;
  recalculateSummaries: (storeId: string, year: number, month: number) => number;
  getMonthAuditDetail: (storeId: string, year: number, month: number) => MonthAuditDetail[];

  getApprovalBoardStats: () => ApprovalBoardStat[];
  getSettlementPreview: (storeId: string, year: number, month: number) => SettlementPreview;
  generateSettlementFiles: (storeId: string, year: number, month: number) => { name: string; content: string }[];

  toggleBlacklistRule: (ruleId: string) => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => {
  const rawSchedules = loadFromStorage<Schedule[]>('att_schedules', initialSchedules);
  const rawCheckins = loadFromStorage<CheckinRecord[]>('att_checkins', initialCheckins);
  const rawTickets = loadFromStorage<ExceptionTicket[]>('att_tickets', initialTickets);
  const rawLeaves = loadFromStorage<LeaveRequest[]>('att_leaves', initialLeaves);
  const rawSwaps = loadFromStorage<SwapRequest[]>('att_swaps', initialSwaps);
  const persistedApprovals = loadFromStorage<ApprovalRecord[]>('att_approvals', []);
  const persistedSummaries = loadFromStorage<AttendanceSummary[]>('att_summaries', initialSummaries);
  const persistedRules = loadFromStorage<BlacklistRule[]>('att_rules', initialRules);
  const persistedLocked = loadFromStorage<string[]>('att_locked', []);

  const persistedSchedules = rawSchedules;
  const persistedCheckins = rawCheckins;
  const persistedTickets = rawTickets;
  const persistedLeaves = migrateLeavesStatus(rawLeaves);
  const persistedSwaps = migrateSwapsStatus(rawSwaps);

  const persist = () => {
    const s = get();
    saveToStorage('att_schedules', s.schedules);
    saveToStorage('att_checkins', s.checkinRecords);
    saveToStorage('att_tickets', s.exceptionTickets);
    saveToStorage('att_leaves', s.leaveRequests);
    saveToStorage('att_swaps', s.swapRequests);
    saveToStorage('att_approvals', s.approvalRecords);
    saveToStorage('att_summaries', s.summaries);
    saveToStorage('att_rules', s.blacklistRules);
    saveToStorage('att_locked', s.lockedMonths);
  };

  const addApprovalRecord = (
    sourceId: string,
    sourceType: 'leave' | 'swap' | 'exception',
    approverRole: 'store_manager' | 'hr' | 'assistant_manager',
    approverId: string,
    approverName: string,
    result: ApprovalStatus,
    comment: string,
    approvals: ApprovalRecord[],
    action?: ApprovalRecord['action']
  ) => {
    approvals.push({
      id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId,
      sourceType,
      approverId,
      approverName,
      approverRole,
      result,
      comment,
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      action,
    });
  };

  const applySwapToSchedules = (swap: SwapRequest, schedules: Schedule[]): Schedule[] => {
    let next = [...schedules];
    const { applicantId, targetId, storeId, applicantDate, targetDate, applicantShift, targetShift } = swap;
    const tplA = shiftTemplates.find(t => t.type === applicantShift);
    const tplT = shiftTemplates.find(t => t.type === targetShift);

    const applicantIdx = next.findIndex(s => s.employeeId === applicantId && s.date === applicantDate);
    const targetIdx = next.findIndex(s => s.employeeId === targetId && s.date === targetDate);

    if (applicantIdx >= 0) {
      next[applicantIdx] = {
        ...next[applicantIdx],
        shiftType: targetShift,
        startTime: tplT?.startTime || '--',
        endTime: tplT?.endTime || '--',
        isSwapGenerated: true,
        swapRequestId: swap.id,
        swapWithEmployeeId: targetId,
      };
    } else {
      next.push({
        id: `sched-${storeId}-${applicantDate}-${applicantId}`,
        employeeId: applicantId,
        storeId,
        date: applicantDate,
        shiftType: targetShift,
        startTime: tplT?.startTime || '--',
        endTime: tplT?.endTime || '--',
        isSupport: false,
        isSwapGenerated: true,
        swapRequestId: swap.id,
        swapWithEmployeeId: targetId,
      });
    }

    if (targetIdx >= 0) {
      next[targetIdx] = {
        ...next[targetIdx],
        shiftType: applicantShift,
        startTime: tplA?.startTime || '--',
        endTime: tplA?.endTime || '--',
        isSwapGenerated: true,
        swapRequestId: swap.id,
        swapWithEmployeeId: applicantId,
      };
    } else {
      next.push({
        id: `sched-${storeId}-${targetDate}-${targetId}`,
        employeeId: targetId,
        storeId,
        date: targetDate,
        shiftType: applicantShift,
        startTime: tplA?.startTime || '--',
        endTime: tplA?.endTime || '--',
        isSupport: false,
        isSwapGenerated: true,
        swapRequestId: swap.id,
        swapWithEmployeeId: applicantId,
      });
    }

    return next;
  };

  const getRoleInfo = (role: UserRole, id?: string, name?: string): { roleId: string; roleName: string; approverRole: 'store_manager' | 'hr' | 'assistant_manager' } => {
    if (role === 'hr') {
      return { roleId: id || 'hr', roleName: name || '人事管理员', approverRole: 'hr' };
    }
    if (role === 'assistant_manager') {
      return { roleId: id || 'asm', roleName: name || '副店长', approverRole: 'assistant_manager' };
    }
    return { roleId: id || 'store_manager', roleName: name || '店长', approverRole: 'store_manager' };
  };

  const calcAdjustmentDelta = (type: AdjustmentType, amount: number): { deltaBonus: number; deltaFine: number } => {
    switch (type) {
      case 'bonus_add': return { deltaBonus: amount, deltaFine: 0 };
      case 'bonus_deduct': return { deltaBonus: -amount, deltaFine: 0 };
      case 'fine_add': return { deltaBonus: 0, deltaFine: amount };
      case 'fine_reduce': return { deltaBonus: 0, deltaFine: -amount };
    }
  };

  return {
    currentStoreId: stores[0].id,
    currentRole: 'hr' as UserRole,
    schedules: persistedSchedules,
    checkinRecords: persistedCheckins,
    exceptionTickets: persistedTickets,
    leaveRequests: persistedLeaves,
    swapRequests: persistedSwaps,
    approvalRecords: persistedApprovals,
    summaries: persistedSummaries,
    blacklistRules: persistedRules,
    lockedMonths: persistedLocked,

    setCurrentStoreId: (id) => set({ currentStoreId: id }),
    setCurrentRole: (role) => set({ currentRole: role }),

    canApprove: (status, approverRole, request) => {
      if (status === 'approved' || status === 'rejected') return false;

      if (request && request.currentHandlerId) {
        if (approverRole === 'assistant_manager') {
          return request.currentHandlerId !== 'store_manager';
        }
        if (approverRole === 'store_manager') {
          return request.currentHandlerId === 'store_manager';
        }
      }

      if (approverRole === 'hr') {
        return status === 'pending_hr';
      }
      if (approverRole === 'store_manager' || approverRole === 'assistant_manager') {
        return status === 'pending_store';
      }
      return false;
    },

    upsertSchedule: (employeeId, storeId, date, shiftType, meta) => {
      set(state => {
        const tpl = shiftTemplates.find(t => t.type === shiftType);
        const existing = state.schedules.find(
          s => s.employeeId === employeeId && s.date === date
        );
        let next: Schedule[];
        if (existing) {
          next = state.schedules.map(s =>
            s.id === existing.id
              ? { ...s, shiftType, startTime: tpl?.startTime || '--', endTime: tpl?.endTime || '--', ...meta }
              : s
          );
        } else {
          const newSched: Schedule = {
            id: `sched-${storeId}-${date}-${employeeId}`,
            employeeId,
            storeId,
            date,
            shiftType,
            startTime: tpl?.startTime || '--',
            endTime: tpl?.endTime || '--',
            isSupport: false,
            ...meta,
          };
          next = [...state.schedules, newSched];
        }
        return { schedules: next };
      });
      persist();
    },

    copyWeekSchedules: (storeId, fromWeekStart, toWeekStart) => {
      set(state => {
        const fromDate = new Date(fromWeekStart);
        const toDate = new Date(toWeekStart);
        const diffMs = toDate.getTime() - fromDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        const fromSchedules = state.schedules.filter(
          s => s.storeId === storeId && s.date >= fromWeekStart && s.date < format(addDays(new Date(fromWeekStart), 7), 'yyyy-MM-dd')
        );

        let next = [...state.schedules];
        fromSchedules.forEach(fs => {
          const fromDateObj = new Date(fs.date);
          const newDate = format(addDays(fromDateObj, diffDays), 'yyyy-MM-dd');
          const existIdx = next.findIndex(
            n => n.employeeId === fs.employeeId && n.date === newDate
          );
          const newSched: Schedule = {
            ...fs,
            id: `sched-${storeId}-${newDate}-${fs.employeeId}`,
            date: newDate,
          };
          if (existIdx >= 0) {
            next[existIdx] = newSched;
          } else {
            next.push(newSched);
          }
        });
        return { schedules: next };
      });
      persist();
    },

    addLeaveRequest: (data) => {
      const newLeave: LeaveRequest = {
        id: `leave-${Date.now()}`,
        ...data,
        status: 'pending_store',
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        reminderCount: 0,
        currentHandlerId: 'store_manager',
        currentHandlerName: '店长',
        handoffRecords: [],
      };
      set(state => ({ leaveRequests: [...state.leaveRequests, newLeave] }));
      persist();
    },

    addSwapRequest: (data) => {
      const newSwap: SwapRequest = {
        id: `swap-${Date.now()}`,
        ...data,
        status: 'pending_store',
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        reminderCount: 0,
        currentHandlerId: 'store_manager',
        currentHandlerName: '店长',
        handoffRecords: [],
      };
      set(state => ({ swapRequests: [...state.swapRequests, newSwap] }));
      persist();
    },

    approveRequest: (sourceId, sourceType, approverRole, approverId, approverName) => {
      const { canApprove } = get();
      const roleInfo = getRoleInfo(approverRole, approverId, approverName);
      let success = false;

      set(state => {
        let nextLeaves = [...state.leaveRequests];
        let nextSwaps = [...state.swapRequests];
        let nextTickets = [...state.exceptionTickets];
        let nextSchedules = [...state.schedules];
        const nextApprovals = [...state.approvalRecords];

        if (sourceType === 'leave') {
          const leave = nextLeaves.find(l => l.id === sourceId);
          if (!leave || !canApprove(leave.status, approverRole, leave)) return state;

          if (approverRole === 'store_manager' || approverRole === 'assistant_manager') {
            nextLeaves = nextLeaves.map(l =>
              l.id === sourceId ? {
                ...l,
                status: 'pending_hr' as const,
                managerComment: `${roleInfo.roleName}初审通过`,
                currentHandlerId: 'hr',
                currentHandlerName: '人事管理员',
              } : l
            );
            addApprovalRecord(sourceId, 'leave', roleInfo.approverRole, roleInfo.roleId, roleInfo.roleName, 'pending_hr', `${roleInfo.roleName}初审通过`, nextApprovals, 'approve');
            success = true;
          }
          if (approverRole === 'hr') {
            nextLeaves = nextLeaves.map(l =>
              l.id === sourceId ? {
                ...l,
                status: 'approved' as const,
                hrComment: '人事复核通过',
                currentHandlerId: undefined,
                currentHandlerName: undefined,
              } : l
            );
            addApprovalRecord(sourceId, 'leave', 'hr', 'hr', '人事管理员', 'approved', '人事复核通过', nextApprovals, 'approve');
            success = true;
          }
        }

        if (sourceType === 'swap') {
          const swap = nextSwaps.find(s => s.id === sourceId);
          if (!swap || !canApprove(swap.status, approverRole, swap)) return state;

          if (approverRole === 'store_manager' || approverRole === 'assistant_manager') {
            nextSwaps = nextSwaps.map(s =>
              s.id === sourceId ? {
                ...s,
                status: 'pending_hr' as const,
                managerComment: `${roleInfo.roleName}初审通过`,
                currentHandlerId: 'hr',
                currentHandlerName: '人事管理员',
              } : s
            );
            addApprovalRecord(sourceId, 'swap', roleInfo.approverRole, roleInfo.roleId, roleInfo.roleName, 'pending_hr', `${roleInfo.roleName}初审通过`, nextApprovals, 'approve');
            success = true;
          }
          if (approverRole === 'hr') {
            nextSwaps = nextSwaps.map(s =>
              s.id === sourceId ? {
                ...s,
                status: 'approved' as const,
                hrComment: '人事复核通过',
                currentHandlerId: undefined,
                currentHandlerName: undefined,
              } : s
            );
            addApprovalRecord(sourceId, 'swap', 'hr', 'hr', '人事管理员', 'approved', '人事复核通过', nextApprovals, 'approve');
            const approvedSwap = nextSwaps.find(s => s.id === sourceId);
            if (approvedSwap) {
              nextSchedules = applySwapToSchedules(approvedSwap, nextSchedules);
            }
            success = true;
          }
        }

        if (sourceType === 'exception') {
          nextTickets = nextTickets.map(t =>
            t.id === sourceId ? { ...t, status: 'resolved' as const, handler: roleInfo.roleName } : t
          );
          addApprovalRecord(sourceId, 'exception', roleInfo.approverRole, roleInfo.roleId, roleInfo.roleName, 'approved', '异常工单处理通过', nextApprovals, 'approve');
          success = true;
        }

        return {
          leaveRequests: nextLeaves,
          swapRequests: nextSwaps,
          exceptionTickets: nextTickets,
          schedules: nextSchedules,
          approvalRecords: nextApprovals,
        };
      });
      if (success) persist();
      return success;
    },

    rejectRequest: (sourceId, sourceType, approverRole, approverId, approverName, comment) => {
      const { canApprove } = get();
      const roleInfo = getRoleInfo(approverRole, approverId, approverName);
      const rejectComment = comment || `${roleInfo.roleName}审批拒绝`;
      let success = false;

      set(state => {
        let nextLeaves = [...state.leaveRequests];
        let nextSwaps = [...state.swapRequests];
        let nextTickets = [...state.exceptionTickets];
        const nextApprovals = [...state.approvalRecords];

        if (sourceType === 'leave') {
          const leave = nextLeaves.find(l => l.id === sourceId);
          if (!leave || !canApprove(leave.status, approverRole, leave)) return state;

          nextLeaves = nextLeaves.map(l =>
            l.id === sourceId ? {
              ...l,
              status: 'rejected' as const,
              ...(approverRole === 'hr' ? { hrComment: rejectComment } : { managerComment: rejectComment }),
              currentHandlerId: undefined,
              currentHandlerName: undefined,
            } : l
          );
          addApprovalRecord(sourceId, 'leave', roleInfo.approverRole, roleInfo.roleId, roleInfo.roleName, 'rejected', rejectComment, nextApprovals, 'reject');
          success = true;
        }

        if (sourceType === 'swap') {
          const swap = nextSwaps.find(s => s.id === sourceId);
          if (!swap || !canApprove(swap.status, approverRole, swap)) return state;

          nextSwaps = nextSwaps.map(s =>
            s.id === sourceId ? {
              ...s,
              status: 'rejected' as const,
              ...(approverRole === 'hr' ? { hrComment: rejectComment } : { managerComment: rejectComment }),
              currentHandlerId: undefined,
              currentHandlerName: undefined,
            } : s
          );
          addApprovalRecord(sourceId, 'swap', roleInfo.approverRole, roleInfo.roleId, roleInfo.roleName, 'rejected', rejectComment, nextApprovals, 'reject');
          success = true;
        }

        if (sourceType === 'exception') {
          nextTickets = nextTickets.map(t =>
            t.id === sourceId ? { ...t, status: 'rejected' as const, handler: roleInfo.roleName } : t
          );
          addApprovalRecord(sourceId, 'exception', roleInfo.approverRole, roleInfo.roleId, roleInfo.roleName, 'rejected', rejectComment, nextApprovals, 'reject');
          success = true;
        }

        return {
          leaveRequests: nextLeaves,
          swapRequests: nextSwaps,
          exceptionTickets: nextTickets,
          approvalRecords: nextApprovals,
        };
      });
      if (success) persist();
      return success;
    },

    batchApproveRequests: (sourceIds, sourceType, approverRole) => {
      const { approveRequest } = get();
      let count = 0;
      sourceIds.forEach(id => {
        if (approveRequest(id, sourceType, approverRole)) count++;
      });
      return count;
    },

    urgeRequest: (sourceId, sourceType) => {
      let success = false;
      set(state => {
        let nextLeaves = [...state.leaveRequests];
        let nextSwaps = [...state.swapRequests];
        const nextApprovals = [...state.approvalRecords];
        const now = new Date();

        if (sourceType === 'leave') {
          const leave = nextLeaves.find(l => l.id === sourceId);
          if (!leave || leave.status !== 'pending_store') return state;
          const created = parseISO(leave.createdAt);
          if (differenceInHours(now, created) < OVERDUE_HOURS) return state;

          nextLeaves = nextLeaves.map(l =>
            l.id === sourceId ? {
              ...l,
              reminderCount: (l.reminderCount || 0) + 1,
              lastReminderAt: format(now, 'yyyy-MM-dd HH:mm:ss'),
            } : l
          );
          addApprovalRecord(
            sourceId, 'leave', 'hr', 'hr', '人事管理员', leave.status,
            `人事发起催办（第${(leave.reminderCount || 0) + 1}次）`,
            nextApprovals,
            'urge'
          );
          success = true;
        }

        if (sourceType === 'swap') {
          const swap = nextSwaps.find(s => s.id === sourceId);
          if (!swap || swap.status !== 'pending_store') return state;
          const created = parseISO(swap.createdAt);
          if (differenceInHours(now, created) < OVERDUE_HOURS) return state;

          nextSwaps = nextSwaps.map(s =>
            s.id === sourceId ? {
              ...s,
              reminderCount: (s.reminderCount || 0) + 1,
              lastReminderAt: format(now, 'yyyy-MM-dd HH:mm:ss'),
            } : s
          );
          addApprovalRecord(
            sourceId, 'swap', 'hr', 'hr', '人事管理员', swap.status,
            `人事发起催办（第${(swap.reminderCount || 0) + 1}次）`,
            nextApprovals,
            'urge'
          );
          success = true;
        }

        return {
          leaveRequests: nextLeaves,
          swapRequests: nextSwaps,
          approvalRecords: nextApprovals,
        };
      });
      if (success) persist();
      return success;
    },

    handoffRequest: (sourceId, sourceType, toHandlerId, toHandlerName, reason) => {
      set(state => {
        let nextLeaves = [...state.leaveRequests];
        let nextSwaps = [...state.swapRequests];
        const nextApprovals = [...state.approvalRecords];
        const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const handoffRecord: HandoffRecord = {
          id: `handoff-${Date.now()}`,
          fromHandlerId: 'store_manager',
          fromHandlerName: '店长',
          toHandlerId,
          toHandlerName,
          reason,
          createdAt: now,
        };

        if (sourceType === 'leave') {
          nextLeaves = nextLeaves.map(l =>
            l.id === sourceId ? {
              ...l,
              currentHandlerId: toHandlerId,
              currentHandlerName: toHandlerName,
              handoffRecords: [...(l.handoffRecords || []), handoffRecord],
            } : l
          );
          addApprovalRecord(sourceId, 'leave', 'store_manager', 'store_manager', '店长', 'pending_store',
            `转交给${toHandlerName}：${reason}`, nextApprovals, 'handoff');
        }

        if (sourceType === 'swap') {
          nextSwaps = nextSwaps.map(s =>
            s.id === sourceId ? {
              ...s,
              currentHandlerId: toHandlerId,
              currentHandlerName: toHandlerName,
              handoffRecords: [...(s.handoffRecords || []), handoffRecord],
            } : s
          );
          addApprovalRecord(sourceId, 'swap', 'store_manager', 'store_manager', '店长', 'pending_store',
            `转交给${toHandlerName}：${reason}`, nextApprovals, 'handoff');
        }

        return {
          leaveRequests: nextLeaves,
          swapRequests: nextSwaps,
          approvalRecords: nextApprovals,
        };
      });
      persist();
    },

    registerAbsent: (employeeId, storeId, date, reason) => {
      const store = stores.find(s => s.id === storeId);
      const newRecord: CheckinRecord = {
        id: `checkin-${employeeId}-${date}-absent`,
        employeeId,
        storeId,
        date,
        checkInTime: undefined,
        checkOutTime: undefined,
        photo: '',
        location: store?.address || '',
        distance: 0,
        status: 'absent',
        isDistanceAbnormal: false,
        isPhotoAbnormal: false,
      };
      set(state => {
        const existing = state.checkinRecords.find(
          r => r.employeeId === employeeId && r.date === date
        );
        let next: CheckinRecord[];
        if (existing) {
          next = state.checkinRecords.map(r =>
            r.id === existing.id ? { ...r, status: 'absent' } : r
          );
        } else {
          next = [...state.checkinRecords, newRecord];
        }
        return { checkinRecords: next };
      });
      persist();
    },

    createExceptionTicket: (data) => {
      const newTicket: ExceptionTicket = {
        id: `ticket-${Date.now()}`,
        ...data,
        status: 'pending',
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };
      set(state => ({ exceptionTickets: [...state.exceptionTickets, newTicket] }));
      persist();
    },

    resolveTicket: (ticketId) => {
      const handler = get().currentRole === 'hr' ? '人事管理员' : (get().currentRole === 'assistant_manager' ? '副店长' : '店长');
      set(state => ({
        exceptionTickets: state.exceptionTickets.map(t =>
          t.id === ticketId ? { ...t, status: 'resolved' as const, handler } : t
        ),
      }));
      persist();
    },

    rejectTicket: (ticketId) => {
      const handler = get().currentRole === 'hr' ? '人事管理员' : (get().currentRole === 'assistant_manager' ? '副店长' : '店长');
      set(state => ({
        exceptionTickets: state.exceptionTickets.map(t =>
          t.id === ticketId ? { ...t, status: 'rejected' as const, handler } : t
        ),
      }));
      persist();
    },

    lockMonth: (storeId, year, month) => {
      const key = `${storeId}-${year}-${month}`;
      set(state => {
        if (state.lockedMonths.includes(key)) return state;
        return { lockedMonths: [...state.lockedMonths, key] };
      });
      persist();
    },

    isMonthLocked: (storeId, year, month) => {
      const key = `${storeId}-${year}-${month}`;
      return get().lockedMonths.includes(key);
    },

    addManualAdjustment: (summaryId, type, amount, reason) => {
      const { isMonthLocked, currentRole } = get();
      const summary = get().summaries.find(s => s.id === summaryId);
      if (!summary) return false;
      if (isMonthLocked(summary.storeId, summary.year, summary.month)) return false;
      if (amount <= 0) return false;

      const { deltaBonus, deltaFine } = calcAdjustmentDelta(type, amount);
      const operator = currentRole === 'hr' ? '人事管理员' : (currentRole === 'assistant_manager' ? '副店长' : '店长');

      set(state => {
        const nextSummaries = state.summaries.map(s => {
          if (s.id !== summaryId) return s;
          const adj: ManualAdjustment = {
            id: `adj-${Date.now()}`,
            type,
            amount,
            reason,
            operator,
            createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            deltaBonus,
            deltaFine,
          };
          const existingAdjustments = s.manualAdjustments || [];
          const newBonus = Math.max(0, (s.bonus || 0) + deltaBonus);
          const newFine = Math.max(0, (s.fine || 0) + deltaFine);
          return {
            ...s,
            bonus: newBonus,
            fine: newFine,
            manualAdjustments: [...existingAdjustments, adj],
          };
        });
        return { summaries: nextSummaries };
      });
      persist();
      return true;
    },

    adjustBonus: (summaryId, bonus, fine, reason = '手工调整') => {
      return get().addManualAdjustment(summaryId, 'bonus_add', Math.max(0, bonus - (get().summaries.find(s => s.id === summaryId)?.bonus || 0)), reason) ||
        get().addManualAdjustment(summaryId, 'fine_add', Math.max(0, fine - (get().summaries.find(s => s.id === summaryId)?.fine || 0)), reason);
    },

    recalculateSummaries: (storeId, year, month) => {
      if (get().isMonthLocked(storeId, year, month)) return 0;

      let affectedCount = 0;
      set(state => {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${getDaysInMonth(year, month)}`;

        const storeEmployees = employees.filter(e => e.storeId === storeId);
        const nextSummaries = [...state.summaries];

        storeEmployees.forEach(emp => {
          const empRecords = state.checkinRecords.filter(
            r => r.employeeId === emp.id && r.date >= monthStart && r.date <= monthEnd
          );
          const empLeaves = state.leaveRequests.filter(
            l => l.employeeId === emp.id && l.status === 'approved' && l.startDate >= monthStart && l.startDate <= monthEnd
          );

          const lateCount = empRecords.filter(r => r.status === 'late').length;
          const earlyLeaveCount = empRecords.filter(r => r.status === 'early_leave').length;
          const absentCount = empRecords.filter(r => r.status === 'absent').length;
          const leaveDays = empLeaves.reduce((sum, l) => sum + l.days, 0);
          const actualDays = empRecords.filter(r => r.status === 'normal' || r.status === 'late' || r.status === 'early_leave').length;

          const baseFine = absentCount * 100 + lateCount * 20 + earlyLeaveCount * 20;

          const existingIdx = nextSummaries.findIndex(
            s => s.employeeId === emp.id && s.year === year && s.month === month
          );
          if (existingIdx >= 0) {
            nextSummaries[existingIdx] = {
              ...nextSummaries[existingIdx],
              workDays: calcWorkDays(year, month),
              lateCount,
              earlyLeaveCount,
              absentCount,
              leaveDays,
              actualDays,
              fine: baseFine,
              bonus: 0,
              manualAdjustments: [],
            };
          } else {
            nextSummaries.push({
              id: `summary-${storeId}-${year}-${month}-${emp.id}`,
              employeeId: emp.id,
              storeId,
              year,
              month,
              workDays: calcWorkDays(year, month),
              actualDays,
              lateCount,
              earlyLeaveCount,
              absentCount,
              leaveDays,
              bonus: 0,
              fine: baseFine,
              isLocked: false,
              manualAdjustments: [],
            });
          }
          affectedCount++;
        });

        return { summaries: nextSummaries };
      });
      persist();
      return affectedCount;
    },

    getMonthAuditDetail: (storeId, year, month) => {
      const state = get();
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${getDaysInMonth(year, month)}`;

      const storeEmployees = employees.filter(e => e.storeId === storeId);
      const details: MonthAuditDetail[] = [];

      storeEmployees.forEach(emp => {
        const empRecords = state.checkinRecords.filter(
          r => r.employeeId === emp.id && r.date >= monthStart && r.date <= monthEnd
        );
        const empLeaves = state.leaveRequests.filter(
          l => l.employeeId === emp.id && l.status === 'approved' && l.startDate >= monthStart && l.startDate <= monthEnd
        );
        const empTickets = state.exceptionTickets.filter(
          t => t.employeeId === emp.id && t.date >= monthStart && t.date <= monthEnd && t.status !== 'rejected'
        );
        const absentRecords = empRecords.filter(r => r.status === 'absent');
        const lateRecords = empRecords.filter(r => r.status === 'late');
        const earlyLeaveRecords = empRecords.filter(r => r.status === 'early_leave');

        const summary = state.summaries.find(
          s => s.employeeId === emp.id && s.year === year && s.month === month
        );
        const manualAdjustments = summary?.manualAdjustments || [];

        const impactItems: BonusImpactItem[] = [];

        absentRecords.forEach(r => {
          impactItems.push({
            id: `impact-absent-${r.id}`,
            type: 'absent',
            date: r.date,
            description: '缺勤（扣¥100）',
            impactAmount: -100,
            sourceId: r.id,
            sourceType: '打卡记录',
          });
        });

        lateRecords.forEach(r => {
          impactItems.push({
            id: `impact-late-${r.id}`,
            type: 'late',
            date: r.date,
            description: '迟到（扣¥20）',
            impactAmount: -20,
            sourceId: r.id,
            sourceType: '打卡记录',
          });
        });

        earlyLeaveRecords.forEach(r => {
          impactItems.push({
            id: `impact-early-${r.id}`,
            type: 'early_leave',
            date: r.date,
            description: '早退（扣¥20）',
            impactAmount: -20,
            sourceId: r.id,
            sourceType: '打卡记录',
          });
        });

        manualAdjustments.forEach(adj => {
          const typeLabel = adj.type === 'bonus_add' ? '加奖'
            : adj.type === 'bonus_deduct' ? '扣回奖金'
            : adj.type === 'fine_add' ? '扣款' : '减免罚款';
          impactItems.push({
            id: `impact-manual-${adj.id}`,
            type: adj.deltaBonus > 0 || adj.type === 'bonus_add' ? 'manual_bonus' : 'manual_fine',
            date: adj.createdAt.slice(0, 10),
            description: `${typeLabel}：${adj.reason}（${adj.operator}）`,
            impactAmount: adj.deltaBonus + (-adj.deltaFine),
            sourceId: adj.id,
            sourceType: `手工调整（${adj.operator}）`,
          });
        });

        details.push({
          employeeId: emp.id,
          employeeName: emp.name,
          storeId,
          year,
          month,
          totalBonus: summary?.bonus || 0,
          totalFine: summary?.fine || 0,
          impactItems,
          approvedLeaves: empLeaves,
          resolvedExceptions: empTickets,
          absentRecords,
          lateRecords,
          earlyLeaveRecords,
          manualAdjustments,
        });
      });

      return details;
    },

    getApprovalBoardStats: () => {
      const state = get();
      const now = new Date();
      const stats: ApprovalBoardStat[] = stores.map(store => {
        const storeLeaves = state.leaveRequests.filter(l => l.storeId === store.id);
        const storeSwaps = state.swapRequests.filter(s => s.storeId === store.id);
        const allPending = [...storeLeaves, ...storeSwaps];

        let pendingStore = 0, pendingHr = 0, overdue = 0, urged = 0;

        allPending.forEach(req => {
          if (req.status === 'pending_store') pendingStore++;
          if (req.status === 'pending_hr') pendingHr++;
          const created = parseISO(req.createdAt);
          if ((req.status === 'pending_store' || req.status === 'pending_hr') &&
              differenceInHours(now, created) >= OVERDUE_HOURS) {
            overdue++;
          }
          if ((req.reminderCount || 0) > 0) urged++;
        });

        return {
          storeId: store.id,
          storeName: store.name,
          pendingStore,
          pendingHr,
          overdue,
          urged,
        };
      });
      return stats;
    },

    getSettlementPreview: (storeId, year, month) => {
      const state = get();
      const store = stores.find(s => s.id === storeId);
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${getDaysInMonth(year, month)}`;

      const storeSummaries = state.summaries.filter(s => s.storeId === storeId && s.year === year && s.month === month);
      const totalBonus = storeSummaries.reduce((sum, s) => sum + (s.bonus || 0), 0);
      const totalFine = storeSummaries.reduce((sum, s) => sum + (s.fine || 0), 0);

      const storeRecords = state.checkinRecords.filter(
        r => r.storeId === storeId && r.date >= monthStart && r.date <= monthEnd
      );
      const abnormalCount = storeRecords.filter(r => r.status === 'late' || r.status === 'early_leave' || r.status === 'absent').length;

      const storeTickets = state.exceptionTickets.filter(
        t => t.storeId === storeId && t.date >= monthStart && t.date <= monthEnd
      );

      return {
        storeId,
        storeName: store?.name || '',
        year,
        month,
        employeeCount: storeSummaries.length,
        totalBonus,
        totalFine,
        netPay: totalBonus - totalFine,
        abnormalCount,
        exceptionCount: storeTickets.length,
      };
    },

    generateSettlementFiles: (storeId, year, month) => {
      const state = get();
      const store = stores.find(s => s.id === storeId);
      const monthStr = `${year}年${month}月`;
      const auditDetails = state.getMonthAuditDetail(storeId, year, month);
      const preview = state.getSettlementPreview(storeId, year, month);
      const files: { name: string; content: string }[] = [];

      // 1. 门店汇总表
      let summaryContent = `${store?.name || ''} ${monthStr} 考勤门店汇总表\n`;
      summaryContent += '='.repeat(60) + '\n\n';
      summaryContent += `门店：${store?.name || ''}\n`;
      summaryContent += `月份：${monthStr}\n`;
      summaryContent += `员工数：${preview.employeeCount}\n`;
      summaryContent += `总奖金：¥${preview.totalBonus}\n`;
      summaryContent += `总罚款：¥${preview.totalFine}\n`;
      summaryContent += `实发奖扣：¥${preview.netPay}\n`;
      summaryContent += `异常打卡人次：${preview.abnormalCount}\n`;
      summaryContent += `异常工单数：${preview.exceptionCount}\n\n`;
      summaryContent += '员工明细汇总：\n';
      summaryContent += '-'.repeat(60) + '\n';
      summaryContent += '姓名\t出勤天数\t迟到\t早退\t缺勤\t请假\t奖金\t罚款\t实发\n';
      summaryContent += '-'.repeat(60) + '\n';
      auditDetails.forEach(d => {
        const summary = state.summaries.find(s => s.employeeId === d.employeeId && s.year === year && s.month === month);
        summaryContent += `${d.employeeName}\t${summary?.actualDays || 0}\t${summary?.lateCount || 0}\t${summary?.earlyLeaveCount || 0}\t${summary?.absentCount || 0}\t${summary?.leaveDays || 0}\t¥${d.totalBonus}\t¥${d.totalFine}\t¥${d.totalBonus - d.totalFine}\n`;
      });
      files.push({ name: `门店汇总表_${store?.name || ''}_${year}${month}.txt`, content: summaryContent });

      // 2. 员工明细（每个员工一个文件）
      auditDetails.forEach(d => {
        let empContent = `${d.employeeName} ${monthStr} 考勤明细\n`;
        empContent += '='.repeat(60) + '\n\n';
        empContent += `门店：${store?.name || ''}\n`;
        empContent += `员工：${d.employeeName}\n\n`;
        empContent += '一、打卡影响\n';
        d.absentRecords.forEach(r => empContent += `  ${r.date} 缺勤 -¥100\n`);
        d.lateRecords.forEach(r => empContent += `  ${r.date} 迟到 -¥20\n`);
        d.earlyLeaveRecords.forEach(r => empContent += `  ${r.date} 早退 -¥20\n`);
        empContent += '\n二、请假记录\n';
        d.approvedLeaves.forEach(l => empContent += `  ${l.startDate}~${l.endDate} ${l.leaveType} ${l.days}天\n`);
        empContent += '\n三、异常工单\n';
        d.resolvedExceptions.forEach(t => empContent += `  ${t.date} ${t.type} ${t.description} 状态:${t.status}\n`);
        empContent += '\n四、手工调整\n';
        d.manualAdjustments.forEach(adj => {
          const label = adj.type === 'bonus_add' ? '加奖' : adj.type === 'bonus_deduct' ? '扣回奖金' : adj.type === 'fine_add' ? '扣款' : '减免罚款';
          empContent += `  ${adj.createdAt} ${label} ¥${adj.amount} 原因:${adj.reason} 操作人:${adj.operator}\n`;
        });
        empContent += `\n\n合计：奖金 ¥${d.totalBonus}，罚款 ¥${d.totalFine}，实发 ¥${d.totalBonus - d.totalFine}\n`;
        files.push({ name: `员工明细_${d.employeeName}_${year}${month}.txt`, content: empContent });
      });

      // 3. 调整记录汇总
      let adjContent = `${store?.name || ''} ${monthStr} 手工调整记录\n`;
      adjContent += '='.repeat(60) + '\n\n';
      adjContent += '时间\t员工\t类型\t金额\t原因\t操作人\n';
      adjContent += '-'.repeat(60) + '\n';
      auditDetails.forEach(d => {
        d.manualAdjustments.forEach(adj => {
          const label = adj.type === 'bonus_add' ? '加奖' : adj.type === 'bonus_deduct' ? '扣回奖金' : adj.type === 'fine_add' ? '扣款' : '减免罚款';
          adjContent += `${adj.createdAt}\t${d.employeeName}\t${label}\t¥${adj.amount}\t${adj.reason}\t${adj.operator}\n`;
        });
      });
      files.push({ name: `调整记录汇总_${store?.name || ''}_${year}${month}.txt`, content: adjContent });

      // 4. 出勤证明打包
      auditDetails.forEach(d => {
        const emp = employees.find(e => e.id === d.employeeId);
        let certContent = `出 勤 证 明\n`;
        certContent += '='.repeat(60) + '\n\n';
        certContent += `兹证明 ${d.employeeName}（岗位：${emp?.position || ''}）系我司${store?.name || ''}员工。\n\n`;
        certContent += `${monthStr}出勤情况如下：\n`;
        certContent += `  应出勤天数：${state.summaries.find(s => s.employeeId === d.employeeId && s.year === year && s.month === month)?.workDays || 0}\n`;
        certContent += `  实际出勤：${state.summaries.find(s => s.employeeId === d.employeeId && s.year === year && s.month === month)?.actualDays || 0}\n`;
        certContent += `  迟到：${state.summaries.find(s => s.employeeId === d.employeeId && s.year === year && s.month === month)?.lateCount || 0}次\n`;
        certContent += `  早退：${state.summaries.find(s => s.employeeId === d.employeeId && s.year === year && s.month === month)?.earlyLeaveCount || 0}次\n`;
        certContent += `  缺勤：${state.summaries.find(s => s.employeeId === d.employeeId && s.year === year && s.month === month)?.absentCount || 0}次\n`;
        certContent += `  请假：${state.summaries.find(s => s.employeeId === d.employeeId && s.year === year && s.month === month)?.leaveDays || 0}天\n\n`;
        certContent += `月度奖扣：奖金 ¥${d.totalBonus}，罚款 ¥${d.totalFine}，实发 ¥${d.totalBonus - d.totalFine}\n\n`;
        certContent += `证明单位：${store?.name || ''}\n`;
        certContent += `出具日期：${format(new Date(), 'yyyy-MM-dd')}\n`;
        files.push({ name: `出勤证明_${d.employeeName}_${year}${month}.txt`, content: certContent });
      });

      return files;
    },

    toggleBlacklistRule: (ruleId) => {
      set(state => ({
        blacklistRules: state.blacklistRules.map(r =>
          r.id === ruleId ? { ...r, enabled: !r.enabled } : r
        ),
      }));
      persist();
    },
  };
});
