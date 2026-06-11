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
import { format, subWeeks, startOfWeek, addDays } from 'date-fns';
import type {
  UserRole, Schedule, ShiftType, CheckinRecord, ExceptionTicket,
  LeaveRequest, LeaveType, SwapRequest, ApprovalRecord,
  AttendanceSummary, BlacklistRule, TicketStatus
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

  upsertSchedule: (employeeId: string, storeId: string, date: string, shiftType: ShiftType) => void;
  copyWeekSchedules: (storeId: string, fromWeekStart: string, toWeekStart: string) => void;

  addLeaveRequest: (data: { employeeId: string; storeId: string; leaveType: LeaveType; startDate: string; endDate: string; days: number; reason: string }) => void;
  addSwapRequest: (data: { applicantId: string; targetId: string; storeId: string; applicantDate: string; targetDate: string; applicantShift: ShiftType; targetShift: ShiftType; reason: string }) => void;

  approveRequest: (sourceId: string, sourceType: 'leave' | 'swap' | 'exception', approverRole: 'store_manager' | 'hr') => void;
  rejectRequest: (sourceId: string, sourceType: 'leave' | 'swap' | 'exception', approverRole: 'store_manager' | 'hr', comment?: string) => void;

  registerAbsent: (employeeId: string, storeId: string, date: string, reason: string) => void;
  createExceptionTicket: (data: { employeeId: string; storeId: string; type: ExceptionTicket['type']; date: string; description: string; priority: ExceptionTicket['priority'] }) => void;
  resolveTicket: (ticketId: string) => void;
  rejectTicket: (ticketId: string) => void;

  lockMonth: (storeId: string, year: number, month: number) => void;
  isMonthLocked: (storeId: string, year: number, month: number) => boolean;
  adjustBonus: (summaryId: string, bonus: number, fine: number) => void;
  toggleBlacklistRule: (ruleId: string) => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => {
  const persistedSchedules = loadFromStorage<Schedule[]>('att_schedules', initialSchedules);
  const persistedCheckins = loadFromStorage<CheckinRecord[]>('att_checkins', initialCheckins);
  const persistedTickets = loadFromStorage<ExceptionTicket[]>('att_tickets', initialTickets);
  const persistedLeaves = loadFromStorage<LeaveRequest[]>('att_leaves', initialLeaves);
  const persistedSwaps = loadFromStorage<SwapRequest[]>('att_swaps', initialSwaps);
  const persistedApprovals = loadFromStorage<ApprovalRecord[]>('att_approvals', []);
  const persistedSummaries = loadFromStorage<AttendanceSummary[]>('att_summaries', initialSummaries);
  const persistedRules = loadFromStorage<BlacklistRule[]>('att_rules', initialRules);
  const persistedLocked = loadFromStorage<string[]>('att_locked', []);

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

    upsertSchedule: (employeeId, storeId, date, shiftType) => {
      set(state => {
        const tpl = shiftTemplates.find(t => t.type === shiftType);
        const existing = state.schedules.find(
          s => s.employeeId === employeeId && s.date === date
        );
        let next: Schedule[];
        if (existing) {
          next = state.schedules.map(s =>
            s.id === existing.id
              ? { ...s, shiftType, startTime: tpl?.startTime || '--', endTime: tpl?.endTime || '--' }
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
        status: 'pending',
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };
      set(state => ({ leaveRequests: [...state.leaveRequests, newLeave] }));
      persist();
    },

    addSwapRequest: (data) => {
      const newSwap: SwapRequest = {
        id: `swap-${Date.now()}`,
        ...data,
        status: 'pending',
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };
      set(state => ({ swapRequests: [...state.swapRequests, newSwap] }));
      persist();
    },

    approveRequest: (sourceId, sourceType, approverRole) => {
      set(state => {
        let nextLeaves = [...state.leaveRequests];
        let nextSwaps = [...state.swapRequests];
        let nextTickets = [...state.exceptionTickets];
        const nextApprovals = [...state.approvalRecords];

        const approverName = approverRole === 'store_manager' ? '店长' : '人事管理员';

        if (sourceType === 'leave') {
          const leave = nextLeaves.find(l => l.id === sourceId);
          if (!leave) return state;

          if (approverRole === 'store_manager') {
            nextLeaves = nextLeaves.map(l =>
              l.id === sourceId ? { ...l, status: 'approved' as const, managerComment: '店长初审通过' } : l
            );
            const relatedSwaps = nextSwaps.filter(s => s.status === 'pending');
            if (leave.status === 'pending') {
              // pending -> store_manager approved, still needs hr
              nextLeaves = nextLeaves.map(l =>
                l.id === sourceId ? { ...l, status: 'pending' as const, managerComment: '店长初审通过' } : l
              );
            }
          }
          if (approverRole === 'hr') {
            nextLeaves = nextLeaves.map(l =>
              l.id === sourceId ? { ...l, status: 'approved' as const, hrComment: '人事复核通过' } : l
            );
          }
        }

        if (sourceType === 'swap') {
          if (approverRole === 'store_manager') {
            nextSwaps = nextSwaps.map(s =>
              s.id === sourceId ? { ...s, status: 'approved' as const, managerComment: '店长初审通过' } : s
            );
          }
          if (approverRole === 'hr') {
            nextSwaps = nextSwaps.map(s =>
              s.id === sourceId ? { ...s, status: 'approved' as const, hrComment: '人事复核通过' } : s
            );
          }
        }

        if (sourceType === 'exception') {
          nextTickets = nextTickets.map(t =>
            t.id === sourceId ? { ...t, status: 'resolved' as const, handler: approverName } : t
          );
        }

        nextApprovals.push({
          id: `approval-${Date.now()}`,
          sourceId,
          sourceType,
          approverId: approverRole,
          approverName,
          approverRole,
          result: 'approved',
          comment: `${approverName}审批通过`,
          createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        });

        return {
          leaveRequests: nextLeaves,
          swapRequests: nextSwaps,
          exceptionTickets: nextTickets,
          approvalRecords: nextApprovals,
        };
      });
      persist();
    },

    rejectRequest: (sourceId, sourceType, approverRole, comment) => {
      set(state => {
        let nextLeaves = [...state.leaveRequests];
        let nextSwaps = [...state.swapRequests];
        let nextTickets = [...state.exceptionTickets];
        const nextApprovals = [...state.approvalRecords];

        const approverName = approverRole === 'store_manager' ? '店长' : '人事管理员';
        const rejectComment = comment || `${approverName}审批拒绝`;

        if (sourceType === 'leave') {
          nextLeaves = nextLeaves.map(l =>
            l.id === sourceId ? {
              ...l,
              status: 'rejected' as const,
              ...(approverRole === 'store_manager' ? { managerComment: rejectComment } : { hrComment: rejectComment }),
            } : l
          );
        }
        if (sourceType === 'swap') {
          nextSwaps = nextSwaps.map(s =>
            s.id === sourceId ? {
              ...s,
              status: 'rejected' as const,
              ...(approverRole === 'store_manager' ? { managerComment: rejectComment } : { hrComment: rejectComment }),
            } : s
          );
        }
        if (sourceType === 'exception') {
          nextTickets = nextTickets.map(t =>
            t.id === sourceId ? { ...t, status: 'rejected' as const, handler: approverName } : t
          );
        }

        nextApprovals.push({
          id: `approval-${Date.now()}`,
          sourceId,
          sourceType,
          approverId: approverRole,
          approverName,
          approverRole,
          result: 'rejected',
          comment: rejectComment,
          createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        });

        return {
          leaveRequests: nextLeaves,
          swapRequests: nextSwaps,
          exceptionTickets: nextTickets,
          approvalRecords: nextApprovals,
        };
      });
      persist();
    },

    registerAbsent: (employeeId, storeId, date, reason) => {
      const emp = employees.find(e => e.id === employeeId);
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
      set(state => ({
        exceptionTickets: state.exceptionTickets.map(t =>
          t.id === ticketId ? { ...t, status: 'resolved' as const, handler: get().currentRole === 'hr' ? '人事管理员' : '店长' } : t
        ),
      }));
      persist();
    },

    rejectTicket: (ticketId) => {
      set(state => ({
        exceptionTickets: state.exceptionTickets.map(t =>
          t.id === ticketId ? { ...t, status: 'rejected' as const, handler: get().currentRole === 'hr' ? '人事管理员' : '店长' } : t
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

    adjustBonus: (summaryId, bonus, fine) => {
      set(state => ({
        summaries: state.summaries.map(s =>
          s.id === summaryId ? { ...s, bonus, fine } : s
        ),
      }));
      persist();
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
