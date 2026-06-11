import { Store } from '@/types';

export const stores: Store[] = [
  {
    id: 'store-001',
    name: '朝阳门店',
    address: '北京市朝阳区朝阳门外大街18号',
    manager: '张经理',
    lat: 39.9219,
    lng: 116.4436,
    employeeCount: 12,
    createdAt: '2023-01-15',
    assistantManagers: [
      { id: 'asm-001-1', name: '李明-副店长' },
      { id: 'asm-001-2', name: '王芳-副店长' },
    ],
  },
  {
    id: 'store-002',
    name: '海淀店',
    address: '北京市海淀区中关村大街27号',
    manager: '李店长',
    lat: 39.9836,
    lng: 116.3165,
    employeeCount: 15,
    createdAt: '2023-03-20',
    assistantManagers: [
      { id: 'asm-002-1', name: '陈刚-副店长' },
      { id: 'asm-002-2', name: '赵丽-副店长' },
    ],
  },
  {
    id: 'store-003',
    name: '西城店',
    address: '北京市西城区西单北大街120号',
    manager: '王店长',
    lat: 39.9154,
    lng: 116.3728,
    employeeCount: 10,
    createdAt: '2023-06-10',
    assistantManagers: [
      { id: 'asm-003-1', name: '孙浩-副店长' },
      { id: 'asm-003-2', name: '周敏-副店长' },
    ],
  },
  {
    id: 'store-004',
    name: '东城店',
    address: '北京市东城区王府井大街138号',
    manager: '赵店长',
    lat: 39.9147,
    lng: 116.4108,
    employeeCount: 14,
    createdAt: '2023-09-05',
    assistantManagers: [
      { id: 'asm-004-1', name: '吴强-副店长' },
      { id: 'asm-004-2', name: '郑雪-副店长' },
    ],
  },
  {
    id: 'store-005',
    name: '丰台店',
    address: '北京市丰台区丰台北路18号',
    manager: '刘店长',
    lat: 39.8589,
    lng: 116.2872,
    employeeCount: 8,
    createdAt: '2024-01-20',
    assistantManagers: [
      { id: 'asm-005-1', name: '冯磊-副店长' },
    ],
  },
];
