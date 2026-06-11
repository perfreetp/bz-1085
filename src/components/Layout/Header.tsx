import { Bell, Search, Settings, User } from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';

export default function Header() {
  const { currentRole, setCurrentRole } = useBusinessStore();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索员工、门店..."
            className="w-80 h-9 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setCurrentRole('store_manager')}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              currentRole === 'store_manager'
                ? 'bg-white text-slate-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            店长视角
          </button>
          <button
            onClick={() => setCurrentRole('hr')}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              currentRole === 'hr'
                ? 'bg-white text-slate-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            人事视角
          </button>
        </div>

        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings size={20} />
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-lg transition-shadow">
          <User size={18} />
        </div>
      </div>
    </header>
  );
}
