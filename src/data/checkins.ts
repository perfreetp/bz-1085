import { CheckinRecord } from '@/types';
import { employees } from './employees';
import { format, subDays } from 'date-fns';

function generateCheckinRecords(storeId: string, days: number): CheckinRecord[] {
  const storeEmployees = employees.filter(e => e.storeId === storeId);
  const records: CheckinRecord[] = [];
  const photoBase = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face';

  for (let d = 0; d < days; d++) {
    const date = subDays(new Date(), d);
    const dateStr = format(date, 'yyyy-MM-dd');

    storeEmployees.forEach((emp, idx) => {
      const random = Math.random();
      let status: CheckinRecord['status'] = 'normal';
      let isDistanceAbnormal = false;
      let isPhotoAbnormal = false;
      let checkInTime: string | undefined;
      let checkOutTime: string | undefined;
      let distance = Math.floor(Math.random() * 200) + 10;

      if (random < 0.75) {
        status = 'normal';
        checkInTime = `08:${String(Math.floor(Math.random() * 15) + 45).padStart(2, '0')}`;
        checkOutTime = `16:${String(Math.floor(Math.random() * 30) + 10).padStart(2, '0')}`;
      } else if (random < 0.88) {
        status = 'late';
        checkInTime = `08:${String(Math.floor(Math.random() * 30) + 30).padStart(2, '0')}`;
        checkOutTime = `16:${String(Math.floor(Math.random() * 30) + 10).padStart(2, '0')}`;
        if (Math.random() > 0.5) {
          isDistanceAbnormal = true;
          distance = Math.floor(Math.random() * 500) + 300;
        }
      } else if (random < 0.93) {
        status = 'early_leave';
        checkInTime = `08:${String(Math.floor(Math.random() * 15) + 45).padStart(2, '0')}`;
        checkOutTime = `15:${String(Math.floor(Math.random() * 50) + 10).padStart(2, '0')}`;
      } else if (random < 0.97) {
        status = 'absent';
        distance = Math.floor(Math.random() * 2000) + 1000;
        isDistanceAbnormal = true;
      } else {
        status = 'pending';
        isPhotoAbnormal = true;
        checkInTime = `08:${String(Math.floor(Math.random() * 20) + 40).padStart(2, '0')}`;
      }

      if (d === 0 && idx % 3 === 0) {
        checkOutTime = undefined;
        if (status === 'absent') status = 'pending';
      }

      records.push({
        id: `checkin-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        storeId,
        date: dateStr,
        checkInTime,
        checkOutTime,
        photo: `${photoBase}&sig=${emp.id}${dateStr}`,
        location: `北京市${storeId === 'store-001' ? '朝阳区' : storeId === 'store-002' ? '海淀区' : '西城区'}某某街道`,
        distance,
        status,
        isDistanceAbnormal,
        isPhotoAbnormal,
      });
    });
  }

  return records;
}

export const checkinRecords: CheckinRecord[] = [
  ...generateCheckinRecords('store-001', 7),
  ...generateCheckinRecords('store-002', 7),
  ...generateCheckinRecords('store-003', 7),
  ...generateCheckinRecords('store-004', 7),
  ...generateCheckinRecords('store-005', 7),
];

export function getCheckinRecordsByStore(storeId: string, date?: string): CheckinRecord[] {
  return checkinRecords.filter(r => 
    r.storeId === storeId && (!date || r.date === date)
  );
}

export function getCheckinRecordsByEmployee(employeeId: string): CheckinRecord[] {
  return checkinRecords.filter(r => r.employeeId === employeeId);
}

export function getTodayCheckinStats(storeId: string) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecords = checkinRecords.filter(r => r.storeId === storeId && r.date === todayStr);
  const total = todayRecords.length;
  const normal = todayRecords.filter(r => r.status === 'normal').length;
  const late = todayRecords.filter(r => r.status === 'late').length;
  const absent = todayRecords.filter(r => r.status === 'absent').length;
  const earlyLeave = todayRecords.filter(r => r.status === 'early_leave').length;
  const pending = todayRecords.filter(r => r.status === 'pending').length;
  const distanceAbnormal = todayRecords.filter(r => r.isDistanceAbnormal).length;

  return { total, normal, late, absent, earlyLeave, pending, distanceAbnormal };
}
