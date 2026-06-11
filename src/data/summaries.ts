import { AttendanceSummary, StoreRanking, BlacklistRule } from '@/types';
import { employees } from './employees';
import { stores } from './stores';

function generateSummaries(storeId: string, year: number, month: number): AttendanceSummary[] {
  const storeEmployees = employees.filter(e => e.storeId === storeId);
  const summaries: AttendanceSummary[] = [];
  const workDays = 22;

  storeEmployees.forEach((emp, idx) => {
    const lateCount = Math.floor(Math.random() * 5);
    const earlyLeaveCount = Math.floor(Math.random() * 3);
    const absentCount = Math.floor(Math.random() * 2);
    const leaveDays = Math.floor(Math.random() * 4);
    const actualDays = workDays - absentCount - leaveDays;
    const bonus = actualDays >= 20 ? 300 : actualDays >= 18 ? 100 : 0;
    const fine = (lateCount * 20) + (earlyLeaveCount * 15) + (absentCount * 100);

    summaries.push({
      id: `summary-${storeId}-${year}-${month}-${emp.id}`,
      employeeId: emp.id,
      storeId,
      year,
      month,
      workDays,
      actualDays,
      lateCount,
      earlyLeaveCount,
      absentCount,
      leaveDays,
      bonus,
      fine,
      isLocked: month < new Date().getMonth() + 1,
    });
  });

  return summaries;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export const attendanceSummaries: AttendanceSummary[] = [
  ...generateSummaries('store-001', currentYear, currentMonth - 1),
  ...generateSummaries('store-002', currentYear, currentMonth - 1),
  ...generateSummaries('store-003', currentYear, currentMonth - 1),
  ...generateSummaries('store-004', currentYear, currentMonth - 1),
  ...generateSummaries('store-005', currentYear, currentMonth - 1),
];

export function getStoreRankings(month: number): StoreRanking[] {
  const rankings: StoreRanking[] = stores.map(store => {
    const storeSummaries = attendanceSummaries.filter(
      s => s.storeId === store.id && s.month === month
    );
    const totalWorkDays = storeSummaries.reduce((sum, s) => sum + s.workDays, 0);
    const totalActualDays = storeSummaries.reduce((sum, s) => sum + s.actualDays, 0);
    const attendanceRate = totalWorkDays > 0 ? Math.round((totalActualDays / totalWorkDays) * 1000) / 10 : 0;
    const exceptionCount = storeSummaries.reduce((sum, s) => sum + s.lateCount + s.earlyLeaveCount + s.absentCount, 0);

    return {
      storeId: store.id,
      storeName: store.name,
      attendanceRate,
      exceptionCount,
      rank: 0,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as StoreRanking['trend'],
    };
  });

  rankings.sort((a, b) => b.attendanceRate - a.attendanceRate);
  rankings.forEach((r, idx) => r.rank = idx + 1);

  return rankings;
}

export const blacklistRules: BlacklistRule[] = [
  {
    id: 'rule-1',
    name: '月迟到五次',
    type: 'late_count',
    threshold: 5,
    period: 'month',
    description: '当月迟到累计达5次，自动加入黑名单',
    enabled: true,
  },
  {
    id: 'rule-2',
    name: '月缺勤三次',
    type: 'absent_count',
    threshold: 3,
    period: 'month',
    description: '当月缺勤累计达3次，自动加入黑名单',
    enabled: true,
  },
  {
    id: 'rule-3',
    name: '连续旷工三天',
    type: 'continuous_absent',
    threshold: 3,
    period: 'month',
    description: '连续旷工3天及以上，自动加入黑名单',
    enabled: true,
  },
];

export function getSummariesByStore(storeId: string, month?: number): AttendanceSummary[] {
  return attendanceSummaries.filter(s => 
    s.storeId === storeId && (!month || s.month === month)
  );
}
