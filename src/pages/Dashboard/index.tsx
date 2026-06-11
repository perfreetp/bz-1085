import { useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getTodayCheckinStats } from '@/data/checkins';
import { exceptionTickets, exceptionTypeLabels } from '@/data/exceptions';
import { getEmployeesByStore } from '@/data/employees';
import { schedules } from '@/data/schedules';
import { stores } from '@/data/stores';
import { format, startOfWeek, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, getShiftColor, getShiftLabel, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  gradient: string;
  iconBg: string;
}

function StatCard({ title, value, icon: Icon, trend, trendValue, gradient, iconBg }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 ${gradient} text-white shadow-lg relative overflow-hidden`}>
      <div className="absolute right-4 top-4 opacity-20">
        <Icon size={60} />
      </div>
      <div className="relative z-10">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
          <Icon size={20} />
        </div>
        <p className="text-sm opacity-90 mb-1">{title}</p>
        <p className="text-3xl font-bold mb-2">{value}</p>
        {trend && trendValue && (
          <div className="flex items-center gap-1 text-xs">
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendValue} 较昨日</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentStoreId } = useAppStore();
  const currentStore = stores.find(s => s.id === currentStoreId);
  const stats = getTodayCheckinStats(currentStoreId);
  const employees = getEmployeesByStore(currentStoreId);
  const pendingTickets = exceptionTickets.filter(
    t => t.storeId === currentStoreId && (t.status === 'pending' || t.status === 'processing')
  ).slice(0, 5);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekSchedules = useMemo(() => {
    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    return schedules.filter(
      s => s.storeId === currentStoreId && s.date >= startStr && s.date <= endStr
    );
  }, [currentStoreId, weekStart]);

  const attendanceRate = stats.total > 0 
    ? Math.round(((stats.normal + stats.late * 0.5) / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">门店看板</h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentStore?.name} · {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Calendar size={16} />
            今日
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow">
            导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <StatCard
          title="应到人数"
          value={stats.total}
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          iconBg="bg-white/20"
          trend="down"
          trendValue="-2"
        />
        <StatCard
          title="实到人数"
          value={stats.normal + stats.late + stats.pending}
          icon={UserCheck}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          iconBg="bg-white/20"
          trend="up"
          trendValue="+3"
        />
        <StatCard
          title="缺勤人数"
          value={stats.absent}
          icon={UserX}
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          iconBg="bg-white/20"
          trend="down"
          trendValue="-1"
        />
        <StatCard
          title="迟到人数"
          value={stats.late}
          icon={Clock}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          iconBg="bg-white/20"
          trend="up"
          trendValue="+2"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">异常预警</h2>
            <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">
              {pendingTickets.length} 条待处理
            </span>
          </div>
          <div className="space-y-3">
            {pendingTickets.map(ticket => {
              const emp = employees.find(e => e.id === ticket.employeeId);
              return (
                <div 
                  key={ticket.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                >
                  <img 
                    src={emp?.avatar} 
                    alt={emp?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{emp?.name}</span>
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        getPriorityColor(ticket.priority)
                      )}>
                        {getPriorityLabel(ticket.priority)}优先级
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {exceptionTypeLabels[ticket.type]} · {ticket.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'px-2.5 py-1 text-xs rounded-full',
                      getStatusColor(ticket.status)
                    )}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{ticket.date}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all">
                    处理
                  </button>
                </div>
              );
            })}
          </div>
          <button className="w-full mt-4 py-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium">
            查看全部异常 →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">出勤概览</h2>
          </div>
          
          <div className="text-center py-4">
            <div className="relative w-36 h-36 mx-auto mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke="#f3f4f6"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${attendanceRate * 3.77} 377`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">{attendanceRate}%</span>
                <span className="text-xs text-gray-500">出勤率</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">正常出勤</span>
                <span className="font-medium text-gray-800">{stats.normal} 人</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">迟到</span>
                <span className="font-medium text-amber-600">{stats.late} 人</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">早退</span>
                <span className="font-medium text-orange-600">{stats.earlyLeave} 人</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">缺勤</span>
                <span className="font-medium text-red-600">{stats.absent} 人</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">距离异常</span>
                <span className="font-medium text-purple-600">{stats.distanceAbnormal} 人</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">本周排班概览</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin size={14} />
            <span>{currentStore?.name}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-gray-500 pb-3 pr-4 w-32">员工</th>
                {weekDays.map((day) => (
                  <th key={day.toISOString()} className="text-center text-sm font-medium text-gray-500 pb-3 min-w-[90px]">
                    <div>{format(day, 'MM/dd')}</div>
                    <div className="text-xs text-gray-400">
                      {format(day, 'EEE', { locale: zhCN })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 6).map(emp => (
                <tr key={emp.id} className="border-t border-gray-100">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <img 
                        src={emp.avatar} 
                        alt={emp.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.position}</p>
                      </div>
                    </div>
                  </td>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const sched = weekSchedules.find(s => s.employeeId === emp.id && s.date === dateStr);
                    return (
                      <td key={dateStr} className="py-3 text-center">
                        {sched && (
                          <span className={cn(
                            'inline-block px-2 py-1 text-xs rounded-md border',
                            getShiftColor(sched.shiftType)
                          )}>
                            {getShiftLabel(sched.shiftType)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded bg-sky-100 border border-sky-200"></span>
              早班
            </span>
            <span className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded bg-violet-100 border border-violet-200"></span>
              中班
            </span>
            <span className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span>
              晚班
            </span>
            <span className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></span>
              休息
            </span>
          </div>
          <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
            查看完整班表 →
          </button>
        </div>
      </div>
    </div>
  );
}
