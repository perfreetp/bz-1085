import { LeaveRequest } from '@/types';
import { employees } from './employees';
import { format, addDays, subDays } from 'date-fns';

const leaveTypes = ['annual', 'sick', 'personal', 'compensation', 'maternity', 'other'] as const;
const statuses = ['pending', 'approved', 'rejected'] as const;

const leaveTypeLabels: Record<string, string> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  compensation: '调休',
  maternity: '产假',
  other: '其他',
};

export { leaveTypeLabels };

function generateLeaveRequests(storeId: string): LeaveRequest[] {
  const storeEmployees = employees.filter(e => e.storeId === storeId);
  const requests: LeaveRequest[] = [];

  for (let i = 0; i < 12; i++) {
    const emp = storeEmployees[i % storeEmployees.length];
    const leaveType = leaveTypes[i % leaveTypes.length];
    const days = Math.floor(Math.random() * 5) + 1;
    const startDate = addDays(subDays(new Date(), Math.floor(Math.random() * 30)), i % 10);
    const endDate = addDays(startDate, days - 1);
    const status = statuses[i % 3];

    requests.push({
      id: `leave-${storeId}-${i + 1}`,
      employeeId: emp.id,
      storeId,
      leaveType,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      days,
      reason: leaveType === 'sick' ? '身体不适，需要休息' : leaveType === 'annual' ? '外出旅游休假' : '处理个人事务',
      status,
      createdAt: format(subDays(startDate, 2), 'yyyy-MM-dd HH:mm:ss'),
      managerComment: status !== 'pending' ? (status === 'approved' ? '同意，工作已安排交接' : '近期人手紧张，建议调整时间') : undefined,
      hrComment: status !== 'pending' ? (status === 'approved' ? '已审核通过，将从年假中扣除' : '未通过，请重新申请') : undefined,
    });
  }

  return requests;
}

export const leaveRequests: LeaveRequest[] = [
  ...generateLeaveRequests('store-001'),
  ...generateLeaveRequests('store-002'),
  ...generateLeaveRequests('store-003'),
  ...generateLeaveRequests('store-004'),
  ...generateLeaveRequests('store-005'),
];

export function getLeaveRequestsByStore(storeId: string, status?: string): LeaveRequest[] {
  return leaveRequests.filter(r => 
    r.storeId === storeId && (!status || r.status === status)
  );
}

export function getLeaveRequestsByEmployee(employeeId: string): LeaveRequest[] {
  return leaveRequests.filter(r => r.employeeId === employeeId);
}
