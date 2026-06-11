import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, pattern: string = 'yyyy-MM-dd') {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: zhCN });
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    normal: '正常',
    late: '迟到',
    early_leave: '早退',
    absent: '缺勤',
    pending: '待确认',
    pending_store: '待店长审批',
    pending_hr: '待人事复核',
    approved: '已通过',
    rejected: '已拒绝',
    processing: '处理中',
    resolved: '已解决',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    normal: 'bg-green-100 text-green-700',
    late: 'bg-yellow-100 text-yellow-700',
    early_leave: 'bg-orange-100 text-orange-700',
    absent: 'bg-red-100 text-red-700',
    pending: 'bg-blue-100 text-blue-700',
    pending_store: 'bg-amber-100 text-amber-700',
    pending_hr: 'bg-cyan-100 text-cyan-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    processing: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-700',
  };
  return colors[priority] || colors.low;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority] || priority;
}

export function getShiftColor(shiftType: string): string {
  const colors: Record<string, string> = {
    morning: 'bg-sky-100 text-sky-700 border-sky-200',
    middle: 'bg-violet-100 text-violet-700 border-violet-200',
    evening: 'bg-orange-100 text-orange-700 border-orange-200',
    rest: 'bg-gray-100 text-gray-500 border-gray-200',
    custom: 'bg-teal-100 text-teal-700 border-teal-200',
  };
  return colors[shiftType] || colors.custom;
}

export function getShiftLabel(shiftType: string): string {
  const labels: Record<string, string> = {
    morning: '早班',
    middle: '中班',
    evening: '晚班',
    rest: '休息',
    custom: '自定义',
  };
  return labels[shiftType] || shiftType;
}

export function getLeaveTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    annual: '年假',
    sick: '病假',
    personal: '事假',
    compensation: '调休',
    maternity: '产假',
    other: '其他',
  };
  return labels[type] || type;
}
