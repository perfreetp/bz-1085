import { ExceptionTicket } from '@/types';
import { employees } from './employees';
import { format, subDays } from 'date-fns';

const exceptionTypes = ['late', 'early_leave', 'absent', 'distance', 'photo', 'other'] as const;
const priorities = ['high', 'medium', 'low'] as const;
const statuses = ['pending', 'processing', 'resolved', 'rejected'] as const;

const descriptions: Record<string, string> = {
  late: '迟到超过30分钟，需核实原因',
  early_leave: '早退超过1小时，需核实原因',
  absent: '无故缺勤，联系不上本人',
  distance: '打卡距离超出门店范围500米',
  photo: '打卡照片无法识别为人脸',
  other: '其他异常情况',
};

function generateExceptionTickets(storeId: string): ExceptionTicket[] {
  const storeEmployees = employees.filter(e => e.storeId === storeId);
  const tickets: ExceptionTicket[] = [];

  for (let i = 0; i < 15; i++) {
    const emp = storeEmployees[i % storeEmployees.length];
    const daysAgo = Math.floor(Math.random() * 14);
    const date = subDays(new Date(), daysAgo);
    const type = exceptionTypes[i % exceptionTypes.length];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const statusIdx = i < 5 ? 0 : i < 10 ? 1 : i < 13 ? 2 : 3;
    const status = statuses[statusIdx];

    tickets.push({
      id: `ticket-${storeId}-${i + 1}`,
      employeeId: emp.id,
      storeId,
      type,
      date: format(date, 'yyyy-MM-dd'),
      description: descriptions[type],
      priority,
      status,
      appeal: i % 3 === 0 ? '因交通拥堵导致迟到，已提供证明' : undefined,
      createdAt: format(date, 'yyyy-MM-dd HH:mm:ss'),
      handler: status !== 'pending' ? (status === 'rejected' ? '李人事' : '张经理') : undefined,
    });
  }

  return tickets;
}

export const exceptionTickets: ExceptionTicket[] = [
  ...generateExceptionTickets('store-001'),
  ...generateExceptionTickets('store-002'),
  ...generateExceptionTickets('store-003'),
  ...generateExceptionTickets('store-004'),
  ...generateExceptionTickets('store-005'),
];

export function getTicketsByStore(storeId: string, status?: string): ExceptionTicket[] {
  return exceptionTickets.filter(t => 
    t.storeId === storeId && (!status || t.status === status)
  );
}

export function getTicketsByStatus(status: string): ExceptionTicket[] {
  return exceptionTickets.filter(t => t.status === status);
}

export const exceptionTypeLabels: Record<string, string> = {
  late: '迟到',
  early_leave: '早退',
  absent: '缺勤',
  distance: '距离异常',
  photo: '照片异常',
  other: '其他',
};
