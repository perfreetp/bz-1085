import { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Copy, 
  RefreshCw,
  Users,
  Calendar,
  Store,
  ArrowLeftRight,
  Check
} from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { stores } from '@/data/stores';
import { getEmployeesByStore, getEmployeeById } from '@/data/employees';
import { shiftTemplates } from '@/data/shiftTemplates';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday, startOfWeek, addDays, subWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, getShiftColor, getShiftLabel } from '@/utils';
import type { ShiftType } from '@/types';

type ViewMode = 'month' | 'week';

export default function Schedule() {
  const { currentStoreId, currentRole, schedules, upsertSchedule, copyWeekSchedules } = useBusinessStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<ShiftType | null>(null);
  const [showShiftPanel, setShowShiftPanel] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const currentStore = stores.find(s => s.id === currentStoreId);
  const storeEmployees = getEmployeesByStore(currentStoreId);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const days = viewMode === 'month' ? monthDays : weekDays;

  const handlePrevPeriod = () => {
    setCurrentDate(prev => 
      viewMode === 'month' ? subMonths(prev, 1) : addDays(prev, -7)
    );
  };

  const handleNextPeriod = () => {
    setCurrentDate(prev => 
      viewMode === 'month' ? addMonths(prev, 1) : addDays(prev, 7)
    );
  };

  const handleCopyWeek = () => {
    const curWeekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const prevWeekStart = format(startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    copyWeekSchedules(currentStoreId, prevWeekStart, curWeekStart);
    showToast('已复制上周排班到本周');
  };

  const handleBatchSchedule = () => {
    if (!selectedShift) {
      showToast('请先选择班次模板');
      return;
    }
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    storeEmployees.forEach(emp => {
      for (let i = 0; i < 5; i++) {
        const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
        upsertSchedule(emp.id, currentStoreId, dateStr, selectedShift);
      }
    });
    showToast(`已为全部员工排 ${getShiftLabel(selectedShift)}（周一至周五）`);
  };

  const handleShiftClick = (employeeId: string, dateStr: string) => {
    if (!selectedShift) {
      showToast('请先在左侧选择班次模板');
      return;
    }
    upsertSchedule(employeeId, currentStoreId, dateStr, selectedShift);
    showToast(`已将 ${dateStr} 的班次设置为 ${getShiftLabel(selectedShift)}`);
  };

  const empSchedulesMap = useMemo(() => {
    const map: Record<string, Record<string, typeof schedules[0]>> = {};
    schedules.forEach(s => {
      if (!map[s.employeeId]) map[s.employeeId] = {};
      map[s.employeeId][s.date] = s;
    });
    return map;
  }, [schedules]);

  const getSwapWithName = (swapWithEmployeeId?: string): string => {
    if (!swapWithEmployeeId) return '';
    const emp = getEmployeeById(swapWithEmployeeId);
    return emp?.name || '';
  };

  const shiftStats = useMemo(() => {
    const startStr = format(days[0], 'yyyy-MM-dd');
    const endStr = format(days[days.length - 1], 'yyyy-MM-dd');
    const relevant = schedules.filter(s => s.storeId === currentStoreId && s.date >= startStr && s.date <= endStr);
    return {
      morning: relevant.filter(s => s.shiftType === 'morning').length,
      middle: relevant.filter(s => s.shiftType === 'middle').length,
      evening: relevant.filter(s => s.shiftType === 'evening').length,
      support: relevant.filter(s => s.isSupport).length,
    };
  }, [schedules, currentStoreId, days]);

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in text-sm font-medium">
          <Check size={16} />
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">员工班表</h1>
          <p className="text-gray-500 text-sm mt-1">{currentStore?.name} · 排班管理</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleCopyWeek}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Copy size={16} />
            复制上周
          </button>
          <button 
            onClick={handleBatchSchedule}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Users size={16} />
            批量排班
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2">
            <Plus size={16} />
            新增班次
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-all',
                  viewMode === 'week'
                    ? 'bg-white text-slate-800 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                周视图
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-all',
                  viewMode === 'month'
                    ? 'bg-white text-slate-800 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                月视图
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPeriod}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <span className="text-lg font-semibold text-gray-800 min-w-[140px] text-center">
                {viewMode === 'month' 
                  ? format(currentDate, 'yyyy年MM月', { locale: zhCN })
                  : `${format(weekDays[0], 'MM/dd', { locale: zhCN })} - ${format(weekDays[6], 'MM/dd', { locale: zhCN })}`
                }
              </span>
              <button
                onClick={handleNextPeriod}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="ml-2 px-3 py-1 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
              >
                今天
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeftRight size={16} />
              跨店支援
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw size={16} />
              临时换班
            </button>
          </div>
        </div>

        <div className="flex">
          {showShiftPanel && (
            <div className="w-48 border-r border-gray-100 p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">班次模板</h3>
              <div className="space-y-2">
                {shiftTemplates.map(shift => (
                  <button
                    key={shift.id}
                    onClick={() => setSelectedShift(selectedShift === shift.type ? null : shift.type)}
                    className={cn(
                      'w-full p-3 rounded-lg border-2 transition-all text-left',
                      selectedShift === shift.type
                        ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: shift.color }}
                      ></span>
                      <span className="font-medium text-sm text-gray-800">{shift.name}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {shift.startTime} - {shift.endTime}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 mb-2">提示：选择班次后点击日历格子进行排班</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">图例说明</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border-2 border-dashed border-purple-400 flex items-center justify-center">
                      <span className="text-[10px] text-purple-600 font-bold">调</span>
                    </div>
                    <span className="text-xs text-gray-500">调班生成</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded ring-2 ring-amber-400 ring-offset-1 bg-amber-50"></div>
                    <span className="text-xs text-gray-500">跨店支援</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4 w-48 sticky left-0 bg-gray-50 z-10">
                    <div className="flex items-center gap-2">
                      <Users size={16} />
                      员工
                    </div>
                  </th>
                  {days.map((day, idx) => (
                    <th 
                      key={idx} 
                      className={cn(
                        'text-center text-sm font-medium py-3 px-2 min-w-[90px]',
                        !isSameMonth(day, currentDate) && viewMode === 'month' ? 'text-gray-300 bg-gray-50/50' : 'text-gray-500',
                        isToday(day) && 'bg-cyan-50 text-cyan-600'
                      )}
                    >
                      <div className="font-medium">{format(day, 'd')}</div>
                      <div className="text-xs opacity-80">
                        {format(day, 'EEE', { locale: zhCN })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {storeEmployees.map(emp => {
                  const empMap = empSchedulesMap[emp.id] || {};
                  return (
                    <tr key={emp.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="py-3 px-4 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <img 
                            src={emp.avatar} 
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.position}</p>
                          </div>
                        </div>
                      </td>
                      {days.map((day, dayIdx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const sched = empMap[dateStr];
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const swapWithName = getSwapWithName(sched?.swapWithEmployeeId);
                        
                        return (
                          <td 
                            key={dayIdx} 
                            className={cn(
                              'py-2 px-1 text-center',
                              !isCurrentMonth && viewMode === 'month' && 'bg-gray-50/30',
                              isToday(day) && 'bg-cyan-50/30'
                            )}
                          >
                            {sched ? (
                              <div className="relative group">
                                <div
                                  onClick={() => handleShiftClick(emp.id, dateStr)}
                                  className={cn(
                                    'cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium border transition-all hover:shadow-sm relative',
                                    getShiftColor(sched.shiftType),
                                    sched.isSupport && 'ring-2 ring-amber-400 ring-offset-1',
                                    sched.isSwapGenerated && 'border-2 border-dashed border-purple-400'
                                  )}
                                >
                                  {sched.isSwapGenerated && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">
                                      调
                                    </div>
                                  )}
                                  <div>{getShiftLabel(sched.shiftType)}</div>
                                  <div className="text-[10px] opacity-70 mt-0.5">
                                    {sched.startTime.slice(0, 5)}
                                  </div>
                                  {sched.isSupport && (
                                    <div className="text-[10px] text-amber-600 mt-0.5">
                                      支援
                                    </div>
                                  )}
                                </div>
                                {sched.isSwapGenerated && swapWithName && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                                    与 {swapWithName} 调班
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div 
                                onClick={() => handleShiftClick(emp.id, dateStr)}
                                className={cn(
                                  'h-10 rounded-md border border-dashed cursor-pointer transition-all',
                                  selectedShift 
                                    ? 'border-cyan-300 bg-cyan-50/50 hover:bg-cyan-50' 
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                )}
                              ></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-cyan-600" />
            <h3 className="font-semibold text-gray-800">跨店支援</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            本月共 {shiftStats.support} 人次跨店支援
          </p>
          <button className="w-full py-2 text-sm text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors">
            管理支援排班
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} className="text-violet-600" />
            <h3 className="font-semibold text-gray-800">临时换班</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            本月共 {useBusinessStore.getState().swapRequests.filter(s => s.storeId === currentStoreId).length} 次换班申请
          </p>
          <button className="w-full py-2 text-sm text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors">
            查看换班记录
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-800">班次统计</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">早班</span>
              <span className="font-medium text-gray-700">{shiftStats.morning} 班</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">中班</span>
              <span className="font-medium text-gray-700">{shiftStats.middle} 班</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">晚班</span>
              <span className="font-medium text-gray-700">{shiftStats.evening} 班</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
