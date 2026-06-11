import { useState, useMemo } from 'react';
import {
  BarChart3,
  Trophy,
  Lock,
  FileDown,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Download,
  Settings,
  Calendar,
  DollarSign,
  Users,
  Award,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  X,
  Search
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useBusinessStore } from '@/store/businessStore';
import { stores } from '@/data/stores';
import { getEmployeesByStore, employees } from '@/data/employees';
import { format } from 'date-fns';
import { cn } from '@/utils';

type SummaryTab = 'ranking' | 'calculation' | 'lock' | 'certificate' | 'blacklist';

export default function Summary() {
  const {
    currentStoreId,
    summaries,
    blacklistRules,
    lockedMonths,
    lockMonth,
    isMonthLocked,
    adjustBonus,
    toggleBlacklistRule
  } = useBusinessStore();

  const [activeTab, setActiveTab] = useState<SummaryTab>('ranking');
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [toast, setToast] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [adjustModal, setAdjustModal] = useState<{ summaryId: string; empName: string; bonus: number; fine: number } | null>(null);
  const [adjustBonusVal, setAdjustBonusVal] = useState(0);
  const [adjustFineVal, setAdjustFineVal] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const currentStore = stores.find(s => s.id === currentStoreId);

  const monthLocked = isMonthLocked(currentStoreId, currentYear, selectedMonth);

  const storeSummaries = useMemo(() =>
    summaries.filter(s => s.storeId === currentStoreId && s.month === selectedMonth),
    [summaries, currentStoreId, selectedMonth]
  );

  const rankings = useMemo(() => {
    const list = stores.map(store => {
      const storeS = summaries.filter(s => s.storeId === store.id && s.month === selectedMonth);
      const totalWorkDays = storeS.reduce((sum, s) => sum + s.workDays, 0);
      const totalActualDays = storeS.reduce((sum, s) => sum + s.actualDays, 0);
      const attendanceRate = totalWorkDays > 0 ? Math.round((totalActualDays / totalWorkDays) * 1000) / 10 : 0;
      const exceptionCount = storeS.reduce((sum, s) => sum + s.lateCount + s.earlyLeaveCount + s.absentCount, 0);
      const trends: Array<'up' | 'down' | 'stable'> = ['up', 'down', 'stable'];
      return {
        storeId: store.id,
        storeName: store.name,
        attendanceRate,
        exceptionCount,
        rank: 0,
        trend: trends[Math.floor(Math.random() * 3)]
      };
    });
    list.sort((a, b) => b.attendanceRate - a.attendanceRate);
    list.forEach((r, idx) => r.rank = idx + 1);
    return list;
  }, [summaries, selectedMonth]);

  const chartData = useMemo(() => {
    return stores.slice(0, 5).map(store => {
      const rank = rankings.find(r => r.storeId === store.id);
      return {
        name: store.name,
        出勤率: rank?.attendanceRate || 95,
        异常率: Math.round((rank?.exceptionCount || 5) * 1.5),
      };
    });
  }, [rankings]);

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      month: `${i + 1}月`,
      出勤率: 90 + Math.floor(Math.random() * 10),
      异常率: 5 + Math.floor(Math.random() * 5),
    }));
  }, []);

  const pieData = [
    { name: '正常出勤', value: 75, color: '#10b981' },
    { name: '迟到', value: 10, color: '#f59e0b' },
    { name: '早退', value: 5, color: '#f97316' },
    { name: '缺勤', value: 5, color: '#ef4444' },
    { name: '请假', value: 5, color: '#8b5cf6' },
  ];

  const tabs = [
    { key: 'ranking', label: '门店排行', icon: Trophy },
    { key: 'calculation', label: '奖扣计算', icon: DollarSign },
    { key: 'lock', label: '月末锁账', icon: Lock },
    { key: 'certificate', label: '出勤证明', icon: FileDown },
    { key: 'blacklist', label: '黑名单规则', icon: ShieldAlert },
  ];

  const handleLockMonth = () => {
    lockMonth(currentStoreId, currentYear, selectedMonth);
    showToast(`${selectedMonth}月考勤数据已锁定`);
  };

  const handleGenerateCertificate = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    const summary = storeSummaries.find(s => s.employeeId === empId);
    if (!emp) return;

    const storeName = currentStore?.name || '未知门店';
    const actualDays = summary?.actualDays ?? 0;
    const workDays = summary?.workDays ?? 22;
    const rate = workDays > 0 ? Math.round((actualDays / workDays) * 100) : 0;

    const content = [
      '═══════════════════════════════════',
      '          出 勤 证 明',
      '═══════════════════════════════════',
      '',
      `员工姓名：${emp.name}`,
      `所属门店：${storeName}`,
      `职    位：${emp.position}`,
      `证明月份：${currentYear}年${selectedMonth}月`,
      `应出勤天数：${workDays}天`,
      `实际出勤天数：${actualDays}天`,
      `出勤率：${rate}%`,
      `迟到次数：${summary?.lateCount ?? 0}次`,
      `早退次数：${summary?.earlyLeaveCount ?? 0}次`,
      `缺勤次数：${summary?.absentCount ?? 0}次`,
      `请假天数：${summary?.leaveDays ?? 0}天`,
      '',
      '特此证明。',
      '',
      `出具日期：${format(new Date(), 'yyyy年M月d日')}`,
      '═══════════════════════════════════',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `出勤证明_${emp.name}_${currentYear}年${selectedMonth}月.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已下载 ${emp.name} 的出勤证明`);
  };

  const handleOpenAdjust = (summaryId: string) => {
    const s = storeSummaries.find(item => item.id === summaryId);
    if (!s) return;
    const emp = employees.find(e => e.id === s.employeeId);
    setAdjustModal({ summaryId, empName: emp?.name || '', bonus: s.bonus, fine: s.fine });
    setAdjustBonusVal(s.bonus);
    setAdjustFineVal(s.fine);
  };

  const handleConfirmAdjust = () => {
    if (!adjustModal) return;
    adjustBonus(adjustModal.summaryId, adjustBonusVal, adjustFineVal);
    showToast(`已调整 ${adjustModal.empName} 的奖扣明细`);
    setAdjustModal(null);
  };

  const filteredEmployees = useMemo(() => {
    const emps = getEmployeesByStore(currentStoreId);
    if (!searchName.trim()) return emps;
    return emps.filter(e => e.name.includes(searchName.trim()));
  }, [currentStoreId, searchName]);

  const totalBonus = storeSummaries.reduce((sum, s) => sum + s.bonus, 0);
  const totalFine = storeSummaries.reduce((sum, s) => sum + s.fine, 0);
  const totalActualDays = storeSummaries.reduce((sum, s) => sum + s.actualDays, 0);
  const totalWorkDays = storeSummaries.reduce((sum, s) => sum + s.workDays, 0);

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in text-sm font-medium">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">调整奖扣 — {adjustModal.empName}</h3>
              <button onClick={() => setAdjustModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">奖金（元）</label>
                <input
                  type="number"
                  value={adjustBonusVal}
                  onChange={e => setAdjustBonusVal(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">罚款（元）</label>
                <input
                  type="number"
                  value={adjustFineVal}
                  onChange={e => setAdjustFineVal(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAdjustModal(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAdjust}
                className="px-4 py-2 text-sm text-white bg-cyan-500 rounded-lg hover:bg-cyan-600 transition-colors"
              >
                确认调整
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">总部汇总</h1>
          <p className="text-gray-500 text-sm mt-1">
            全门店考勤数据汇总与统计分析
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}月</option>
            ))}
          </select>
          <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2">
            <Download size={16} />
            导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总出勤天数</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{totalActualDays}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-blue-500" />
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
            <TrendingUp size={12} />
            较上月增长 3.2%
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均出勤率</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {totalWorkDays > 0 ? Math.round((totalActualDays / totalWorkDays) * 100) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Award size={24} className="text-emerald-500" />
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
            <TrendingUp size={12} />
            较上月提升 1.5%
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">考勤奖金</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">¥{totalBonus.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-amber-500" />
            </div>
          </div>
          <div className="mt-3 text-xs text-red-600 flex items-center gap-1">
            <TrendingDown size={12} />
            较上月减少 8%
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">罚款总额</p>
              <p className="text-2xl font-bold text-red-600 mt-1">¥{totalFine.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
          </div>
          <div className="mt-3 text-xs text-emerald-600 flex items-center gap-1">
            <TrendingDown size={12} />
            较上月减少 12%
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as SummaryTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all',
                  activeTab === tab.key
                    ? 'bg-cyan-50 text-cyan-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'ranking' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">门店出勤率排行</h3>
                <div className="space-y-3">
                  {rankings.map(store => (
                    <div
                      key={store.storeId}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl transition-all',
                        store.rank === 1 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200' :
                        store.rank === 2 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200' :
                        store.rank === 3 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200' :
                        'bg-gray-50 border border-gray-100'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
                        store.rank === 1 ? 'bg-amber-400 text-white' :
                        store.rank === 2 ? 'bg-gray-400 text-white' :
                        store.rank === 3 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-600'
                      )}>
                        {store.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{store.storeName}</span>
                          <span className="text-lg font-bold text-cyan-600">{store.attendanceRate}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                            style={{ width: `${store.attendanceRate}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className={cn(
                        'flex items-center gap-1 text-xs',
                        store.trend === 'up' ? 'text-emerald-600' :
                        store.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                      )}>
                        {store.trend === 'up' && <TrendingUp size={14} />}
                        {store.trend === 'down' && <TrendingDown size={14} />}
                        {store.trend === 'stable' && <span>—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">各门店出勤对比</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="出勤率" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="异常率" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">考勤状态分布</h3>
                  <div className="h-48 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-4">近6个月出勤率趋势</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="出勤率"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ fill: '#06b6d4', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="异常率"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ fill: '#f97316', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calculation' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">员工考勤奖扣明细</h3>
              <div className="flex gap-2 items-center">
                {monthLocked && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    <Lock size={12} />
                    已锁账
                  </span>
                )}
                <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                  重新计算
                </button>
                <button className="px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">
                  导出明细
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">员工</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">应出勤</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">实际出勤</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">迟到</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">早退</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">缺勤</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">请假</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">奖金</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">罚款</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {storeSummaries.slice(0, 10).map(summary => {
                    const emp = employees.find(e => e.id === summary.employeeId);
                    return (
                      <tr key={summary.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={emp?.avatar}
                              alt={emp?.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{emp?.name}</p>
                              <p className="text-xs text-gray-400">{emp?.position}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-700">{summary.workDays}天</td>
                        <td className="py-3 px-4 text-center text-sm text-gray-700">{summary.actualDays}天</td>
                        <td className="py-3 px-4 text-center text-sm text-amber-600">{summary.lateCount}次</td>
                        <td className="py-3 px-4 text-center text-sm text-orange-600">{summary.earlyLeaveCount}次</td>
                        <td className="py-3 px-4 text-center text-sm text-red-600">{summary.absentCount}次</td>
                        <td className="py-3 px-4 text-center text-sm text-violet-600">{summary.leaveDays}天</td>
                        <td className="py-3 px-4 text-center text-sm font-medium text-emerald-600">+¥{summary.bonus}</td>
                        <td className="py-3 px-4 text-center text-sm font-medium text-red-600">-¥{summary.fine}</td>
                        <td className="py-3 px-4 text-center">
                          {monthLocked ? (
                            <span className="text-sm text-gray-300 cursor-not-allowed">调整</span>
                          ) : (
                            <button
                              onClick={() => handleOpenAdjust(summary.id)}
                              className="text-sm text-cyan-600 hover:text-cyan-700"
                            >
                              调整
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'lock' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className={cn(
                'w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center',
                monthLocked ? 'bg-emerald-100' : 'bg-amber-100'
              )}>
                <Lock size={36} className={monthLocked ? 'text-emerald-600' : 'text-amber-600'} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {selectedMonth}月考勤数据
              </h3>
              <p className="text-gray-500 mb-6">
                {monthLocked
                  ? '本月考勤数据已锁定，不可修改'
                  : '当前数据未锁定，可继续调整'}
              </p>

              <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
                <h4 className="font-medium text-gray-700 mb-4">锁账说明</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• 锁账后当月考勤数据将不可修改</li>
                  <li>• 锁账后将同步薪资计算系统</li>
                  <li>• 如需修改已锁账数据，请联系管理员</li>
                  <li>• 建议在每月5号前完成上月锁账</li>
                </ul>
              </div>

              {!monthLocked ? (
                <button
                  onClick={handleLockMonth}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow flex items-center gap-2 mx-auto"
                >
                  <Lock size={18} />
                  确认锁账
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <Lock size={18} />
                  <span className="font-medium">已锁账</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'certificate' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">员工出勤证明</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索员工姓名..."
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  className="w-64 h-9 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">员工</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">入职日期</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">本月出勤</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">出勤率</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">状态</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.slice(0, 8).map(emp => {
                    const summary = storeSummaries.find(s => s.employeeId === emp.id);
                    const rate = summary && summary.workDays > 0
                      ? Math.round((summary.actualDays / summary.workDays) * 100)
                      : 95;

                    return (
                      <tr key={emp.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
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
                        <td className="py-3 px-4 text-center text-sm text-gray-700">{emp.joinDate}</td>
                        <td className="py-3 px-4 text-center text-sm text-gray-700">
                          {summary?.actualDays || 20}天
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-medium text-emerald-600">{rate}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            'inline-flex px-2.5 py-1 text-xs font-medium rounded-full',
                            emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            emp.status === 'blacklist' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {emp.status === 'active' ? '在职' : emp.status === 'blacklist' ? '黑名单' : '离职'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleGenerateCertificate(emp.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors"
                          >
                            <FileDown size={14} />
                            下载证明
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'blacklist' && (
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">黑名单规则</h3>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors">
                  <Settings size={14} />
                  管理规则
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {blacklistRules.map(rule => (
                  <div
                    key={rule.id}
                    className={cn(
                      'p-5 rounded-xl border transition-all',
                      rule.enabled
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-50 border-gray-100 opacity-70'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800">{rule.name}</h4>
                      <button
                        onClick={() => {
                          toggleBlacklistRule(rule.id);
                          showToast(rule.enabled ? `已关闭规则：${rule.name}` : `已开启规则：${rule.name}`);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {rule.enabled
                          ? <ToggleRight size={24} className="text-cyan-500" />
                          : <ToggleLeft size={24} />
                        }
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{rule.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>阈值：{rule.threshold}次</span>
                      <span>周期：{rule.period === 'month' ? '每月' : rule.period === 'quarter' ? '每季度' : '每年'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">黑名单人员</h3>
                <span className="text-sm text-red-600">
                  共 {employees.filter(e => e.status === 'blacklist').length} 人
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {employees.filter(e => e.status === 'blacklist').map(emp => {
                  const empStore = stores.find(s => s.id === emp.storeId);
                  return (
                    <div
                      key={emp.id}
                      className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.avatar}
                          alt={emp.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{emp.name}</span>
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                              黑名单
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{empStore?.name} · {emp.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">累计迟到 8 次</p>
                          <p className="text-xs text-gray-400">加入时间：2024-01-15</p>
                        </div>
                        <button className="text-sm text-cyan-600 hover:text-cyan-700">
                          移除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
