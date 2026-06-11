import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  MapPin, 
  AlertTriangle, 
  FileText, 
  CheckSquare, 
  BarChart3,
  Store
} from 'lucide-react';
import { cn } from '@/utils';
import { useBusinessStore } from '@/store/businessStore';
import { stores } from '@/data/stores';

const navItems = [
  { path: '/dashboard', label: '门店看板', icon: LayoutDashboard },
  { path: '/schedule', label: '员工班表', icon: CalendarDays },
  { path: '/checkin', label: '移动打卡记录', icon: MapPin },
  { path: '/exceptions', label: '异常工单', icon: AlertTriangle },
  { path: '/leave', label: '请假调班', icon: FileText },
  { path: '/approval', label: '审批中心', icon: CheckSquare },
  { path: '/summary', label: '总部汇总', icon: BarChart3 },
];

export default function Sidebar() {
  const { currentStoreId, setCurrentStoreId, currentRole } = useBusinessStore();
  const currentStore = stores.find(s => s.id === currentStoreId);

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-20">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Store size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold">考勤管理系统</h1>
            <p className="text-xs text-slate-400">连锁门店版</p>
          </div>
        </div>
      </div>

      {currentRole === 'hr' && (
        <div className="px-4 py-3 border-b border-slate-700">
          <label className="text-xs text-slate-400 mb-1 block">当前门店</label>
          <select
            value={currentStoreId}
            onChange={(e) => setCurrentStoreId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      )}

      {currentRole !== 'hr' && currentStore && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-xs text-slate-400">当前门店</p>
          <p className="text-sm font-medium text-white">{currentStore.name}</p>
        </div>
      )}

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-l-2 border-cyan-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-sm font-bold">
            {currentRole === 'hr' ? 'HR' : '店'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {currentRole === 'hr' ? '人事管理员' : currentStore?.manager}
            </p>
            <p className="text-xs text-slate-400">
              {currentRole === 'hr' ? '总部人事' : '门店店长'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
