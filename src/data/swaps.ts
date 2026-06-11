import { SwapRequest } from '@/types';
import { employees } from './employees';
import { format, addDays } from 'date-fns';

const statuses = ['pending_store', 'pending_hr', 'approved', 'rejected'] as const;
const shiftTypes = ['morning', 'middle', 'evening'] as const;

function generateSwapRequests(storeId: string): SwapRequest[] {
  const storeEmployees = employees.filter(e => e.storeId === storeId);
  const requests: SwapRequest[] = [];

  for (let i = 0; i < 8; i++) {
    const applicant = storeEmployees[i % storeEmployees.length];
    const target = storeEmployees[(i + 3) % storeEmployees.length];
    const applicantDate = addDays(new Date(), i + 1);
    const targetDate = addDays(new Date(), i + 2);
    const status = statuses[i % 4];

    requests.push({
      id: `swap-${storeId}-${i + 1}`,
      applicantId: applicant.id,
      targetId: target.id,
      storeId,
      applicantDate: format(applicantDate, 'yyyy-MM-dd'),
      targetDate: format(targetDate, 'yyyy-MM-dd'),
      applicantShift: shiftTypes[i % 3],
      targetShift: shiftTypes[(i + 1) % 3],
      reason: '个人事务需要调换班次，已与对方协商一致',
      status,
      createdAt: format(addDays(applicantDate, -3), 'yyyy-MM-dd HH:mm:ss'),
      managerComment: status !== 'pending_store' ? (status === 'rejected' ? '当日排班紧张，无法调换' : '同意，已确认双方协商一致') : undefined,
      hrComment: status === 'approved' ? '复核通过' : (status === 'rejected' ? '不同意，请重新安排' : undefined),
    });
  }

  return requests;
}

export const swapRequests: SwapRequest[] = [
  ...generateSwapRequests('store-001'),
  ...generateSwapRequests('store-002'),
  ...generateSwapRequests('store-003'),
  ...generateSwapRequests('store-004'),
  ...generateSwapRequests('store-005'),
];

export function getSwapRequestsByStore(storeId: string, status?: string): SwapRequest[] {
  return swapRequests.filter(r => 
    r.storeId === storeId && (!status || r.status === status)
  );
}
