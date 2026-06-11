import { Schedule } from '@/types';
import { employees } from './employees';
import { shiftTemplates } from './shiftTemplates';
import { addDays, startOfWeek, format } from 'date-fns';

function generateWeekSchedules(storeId: string, weekStart: Date): Schedule[] {
  const storeEmployees = employees.filter(e => e.storeId === storeId);
  const schedules: Schedule[] = [];
  const shiftTypes = ['morning', 'middle', 'evening', 'rest'] as const;

  storeEmployees.forEach((emp, empIdx) => {
    for (let day = 0; day < 7; day++) {
      const date = addDays(weekStart, day);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      let shiftIndex: number;
      if (day === 0 || day === 6) {
        shiftIndex = empIdx % 3;
      } else {
        shiftIndex = (empIdx + day) % 4;
      }
      
      const shiftType = shiftTypes[shiftIndex];
      const template = shiftTemplates.find(s => s.type === shiftType)!;
      const isSupport = empIdx % 7 === day % 7 && day < 5;

      schedules.push({
        id: `sched-${storeId}-${dateStr}-${emp.id}`,
        employeeId: emp.id,
        storeId: isSupport && day < 3 ? 'store-002' : storeId,
        date: dateStr,
        shiftType,
        startTime: template.startTime,
        endTime: template.endTime,
        isSupport,
        supportStoreId: isSupport ? (storeId === 'store-001' ? 'store-002' : 'store-001') : undefined,
        note: isSupport ? '跨店支援' : undefined,
      });
    }
  });

  return schedules;
}

const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 });

export const schedules: Schedule[] = [
  ...generateWeekSchedules('store-001', weekStart),
  ...generateWeekSchedules('store-002', weekStart),
  ...generateWeekSchedules('store-003', weekStart),
  ...generateWeekSchedules('store-004', weekStart),
  ...generateWeekSchedules('store-005', weekStart),
];

export function getSchedulesByStoreAndDate(storeId: string, date: string): Schedule[] {
  return schedules.filter(s => s.storeId === storeId && s.date === date);
}

export function getSchedulesByEmployee(employeeId: string, startDate: string, endDate: string): Schedule[] {
  return schedules.filter(s => 
    s.employeeId === employeeId && 
    s.date >= startDate && 
    s.date <= endDate
  );
}
