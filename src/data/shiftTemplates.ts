import { ShiftTemplate } from '@/types';

export const shiftTemplates: ShiftTemplate[] = [
  {
    id: 'shift-morning',
    name: '早班',
    type: 'morning',
    startTime: '08:00',
    endTime: '16:00',
    color: '#0ea5e9',
  },
  {
    id: 'shift-middle',
    name: '中班',
    type: 'middle',
    startTime: '12:00',
    endTime: '20:00',
    color: '#8b5cf6',
  },
  {
    id: 'shift-evening',
    name: '晚班',
    type: 'evening',
    startTime: '16:00',
    endTime: '24:00',
    color: '#f97316',
  },
  {
    id: 'shift-rest',
    name: '休息',
    type: 'rest',
    startTime: '--',
    endTime: '--',
    color: '#6b7280',
  },
];

export function getShiftTemplate(type: string): ShiftTemplate | undefined {
  return shiftTemplates.find(s => s.type === type);
}
