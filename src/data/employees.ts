import { Employee } from '@/types';

const avatarUrls = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=10',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=11',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=12',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=13',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=14',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=15',
];

const positions = ['店员', '资深店员', '副店长', '店长', '收银员', '理货员'];

const employeeNames = [
  '张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵敏', '黄磊',
  '周杰', '吴婷', '徐明', '孙丽', '马超', '朱琳', '胡军', '郭涛',
  '何欣', '高峰', '林燕', '罗勇',
];

function generateEmployees(storeId: string, count: number, startIndex: number): Employee[] {
  const employees: Employee[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (startIndex + i) % employeeNames.length;
    employees.push({
      id: `emp-${storeId}-${i + 1}`,
      storeId,
      name: employeeNames[idx],
      position: positions[i % positions.length],
      phone: `138${String(10000000 + startIndex * 100 + i).slice(-8)}`,
      avatar: avatarUrls[idx % avatarUrls.length],
      status: i === count - 1 && Math.random() > 0.8 ? 'blacklist' : 'active',
      joinDate: `202${2 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      annualLeaveDays: 10,
      sickLeaveDays: 5,
      compLeaveDays: 3,
      usedAnnualLeave: Math.floor(Math.random() * 5),
      usedSickLeave: Math.floor(Math.random() * 3),
      usedCompLeave: Math.floor(Math.random() * 2),
    });
  }
  return employees;
}

export const employees: Employee[] = [
  ...generateEmployees('store-001', 12, 0),
  ...generateEmployees('store-002', 15, 12),
  ...generateEmployees('store-003', 10, 27),
  ...generateEmployees('store-004', 14, 37),
  ...generateEmployees('store-005', 8, 51),
];

export function getEmployeesByStore(storeId: string): Employee[] {
  return employees.filter(emp => emp.storeId === storeId);
}

export function getEmployeeById(id: string): Employee | undefined {
  return employees.find(emp => emp.id === id);
}
