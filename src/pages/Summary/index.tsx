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
  Search,
  Eye,
  RefreshCw,
  ClipboardList,
  FileText,
  AlertCircle,
  Edit3,
  PieChart as PieChartIcon,
  ChevronRight
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
import { cn, getStatusColor, getStatusLabel, getLeaveTypeLabel } from '@/utils';
import type { MonthAuditDetail } from '@/types';

type SummaryTab = 'ranking' | 'calculation' | 'lock' | 'certificate' | 'blacklist';
type DrawerTab = 'clockIn' | 'leave' | 'exception' | 'adjustment' | 'summary';

const DRAWER_TABS: { key: DrawerTab; label: string; icon: typeof Calendar }[] = [
  { key: 'clockIn', label: '打卡影响', icon: AlertTriangle },
  { key: 'leave', label: '请假记录', icon: Calendar },
  { key: 'exception', label: '异常工单', icon: AlertCircle },
  { key: 'adjustment', label: '手工调整', icon: Edit3 },
  { key: 'summary', label: '汇总核对', icon: PieChartIcon },
];

export default function Summary() {
  const {
    currentStoreId,
    summaries,
    blacklistRules,
    lockedMonths,
    currentRole,
    lockMonth,
    isMonthLocked,
    adjustBonus,
    toggleBlacklistRule,
    recalculateSummaries,
    getMonthAuditDetail
  } = useBusinessStore();

  const [activeTab, setActiveTab] = useState<SummaryTab>('ranking');
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [toast, setToast] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [bonusSearchName, setBonusSearchName] = useState('');
  const [adjustModal, setAdjustModal] = useState<{ summaryId: string; empName: string; bonus: number; fine: number } | null>(null);
  const [adjustBonusVal, setAdjustBonusVal] = useState(0);
  const [adjustFineVal, setAdjustFineVal] = useState(0);
  const [auditModal, setAuditModal] = useState<MonthAuditDetail | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState<MonthAuditDetail | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('clockIn');

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

  const filteredStoreSummaries = useMemo(() => {
    if (!bonusSearchName.trim()) return storeSummaries;
    return storeSummaries.filter(s => {
      const emp = employees.find(e => e.id === s.employeeId);
      return emp?.name.includes(bonusSearchName.trim());
    });
  }, [storeSummaries, bonusSearchName]);

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

  const handleRecalculate = () => {
    if (monthLocked) return;
    setIsRecalculating(true);
    setTimeout(() => {
      const affected = recalculateSummaries(currentStoreId, currentYear, selectedMonth);
      setIsRecalculating(false);
      if (storeSummaries.length === 0) {
        showToast(`已生成${affected}人的月度奖扣明细`);
      } else {
        showToast(`${selectedMonth}月奖扣数据已重新计算`);
      }
    }, 500);
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

  const handleOpenAudit = (employeeId: string) => {
    const auditDetails = getMonthAuditDetail(currentStoreId, currentYear, selectedMonth);
    const detail = auditDetails.find(d => d.employeeId === employeeId);
    if (detail) {
      setAuditModal(detail);
    }
  };

  const handleOpenDrawer = (employeeId: string) => {
    const auditDetails = getMonthAuditDetail(currentStoreId, currentYear, selectedMonth);
    const detail = auditDetails.find(d => d.employeeId === employeeId);
    if (detail) {
      setDrawerDetail(detail);
      setDrawerTab('clockIn');
      setDrawerOpen(true);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerDetail(null), 300);
  };

  const sortedImpactItems = useMemo(() => {
    if (!auditModal) return [];
    return [...auditModal.impactItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [auditModal]);

  const sortedLeaves = useMemo(() => {
    if (!auditModal) return [];
    return [...auditModal.approvedLeaves].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [auditModal]);

  const sortedExceptions = useMemo(() => {
    if (!auditModal) return [];
    return [...auditModal.resolvedExceptions].sort((a, b) => a.date.localeCompare(b.date));
  }, [auditModal]);

  const drawerAbsentRecords = useMemo(() => {
    if (!drawerDetail) return [];
    return [...drawerDetail.absentRecords].sort((a, b) => a.date.localeCompare(b.date));
  }, [drawerDetail]);

  const drawerLateRecords = useMemo(() => {
    if (!drawerDetail) return [];
    return [...drawerDetail.lateRecords].sort((a, b) => a.date.localeCompare(b.date));
  }, [drawerDetail]);

  const drawerEarlyRecords = useMemo(() => {
    if (!drawerDetail) return [];
    return [...drawerDetail.earlyLeaveRecords].sort((a, b) => a.date.localeCompare(b.date));
  }, [drawerDetail]);

  const drawerLeaves = useMemo(() => {
    if (!drawerDetail) return [];
    return [...drawerDetail.approvedLeaves].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [drawerDetail]);

  const drawerExceptions = useMemo(() => {
    if (!drawerDetail) return [];
    return [...drawerDetail.resolvedExceptions].sort((a, b) => a.date.localeCompare(b.date));
  }, [drawerDetail]);

  const drawerAdjustments = useMemo(() => {
    if (!drawerDetail) return [];
    return [...drawerDetail.manualAdjustments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [drawerDetail]);

  const autoCalculate = useMemo(() => {
    if (!drawerDetail) return { amount: 0, breakdown: [] as string[] };
    const absent = drawerDetail.absentRecords.length * 100;
    const late = drawerDetail.lateRecords.length * 20;
    const early = drawerDetail.earlyLeaveRecords.length * 20;
    const breakdown: string[] = [];
    if (drawerDetail.absentRecords.length > 0) breakdown.push(`缺勤${drawerDetail.absentRecords.length}次×¥100`);
    if (drawerDetail.lateRecords.length > 0) breakdown.push(`迟到${drawerDetail.lateRecords.length}次×¥20`);
    if (drawerDetail.earlyLeaveRecords.length > 0) breakdown.push(`早退${drawerDetail.earlyLeaveRecords.length}次×¥20`);
    return { amount: absent + late + early, breakdown };
  }, [drawerDetail]);

  const manualTotal = useMemo(() => {
    if (!drawerDetail) return { bonus: 0, fine: 0, breakdown: [] as string[] };
    let bonus = 0;
    let fine = 0;
    const breakdown: string[] = [];
    drawerDetail.manualAdjustments.forEach(adj => {
      if (adj.type === 'bonus') {
        bonus += adj.amount;
        breakdown.push(`加奖：${adj.reason} +¥${adj.amount}`);
      } else {
        fine += adj.amount;
        breakdown.push(`扣款：${adj.reason} -¥${adj.amount}`);
      }
    });
    return { bonus, fine, net: bonus - fine, breakdown };
  }, [drawerDetail]);

  const finalPayout = useMemo(() => {
    if (!drawerDetail) return { amount: 0, breakdown: [] as string[] };
    const totalBonus = drawerDetail.totalBonus;
    const totalFine = drawerDetail.totalFine;
    return {
      amount: totalBonus - totalFine,
      breakdown: [`总奖金 +¥${totalBonus}`, `总罚款 -¥${totalFine}`]
    };
  }, [drawerDetail]);

  const filteredEmployees = useMemo(() => {
    const emps = getEmployeesByStore(currentStoreId);
    if (!searchName.trim()) return emps;
    return emps.filter(e => e.name.includes(searchName.trim()));
  }, [currentStoreId, searchName]);

  const totalBonus = storeSummaries.reduce((sum, s) => sum + s.bonus, 0);
  const totalFine = storeSummaries.reduce((sum, s) => sum + s.fine, 0);
  const totalActualDays = storeSummaries.reduce((sum, s) => sum + s.actualDays, 0);
  const totalWorkDays = storeSummaries.reduce((sum, s) => sum + s.workDays, 0);

  const exceptionTypeLabel: Record<string, string> = {
    late: '迟到申诉',
    early_leave: '早退申诉',
    absent: '缺勤申诉',
    distance: '距离异常',
    photo: '照片异常',
    other: '其他异常',
  };

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

      {auditModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  奖扣反查明细 — {auditModal.employeeName}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {currentYear}年{selectedMonth}月
                </p>
              </div>
              <button onClick={() => setAuditModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  缺勤记录
                  <span className="text-xs text-gray-400 font-normal">（每条扣款 -¥100）</span>
                </h4>
                {auditModal.absentRecords.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                    本月无缺勤记录
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditModal.absentRecords.map(record => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between px-4 py-3 bg-red-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor('absent'))}>
                            {getStatusLabel('absent')}
                          </span>
                          <span className="text-sm text-gray-700">{record.date}</span>
                        </div>
                        <span className="text-sm font-medium text-red-600">-¥100</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  迟到记录
                  <span className="text-xs text-gray-400 font-normal">（每条扣款 -¥20）</span>
                </h4>
                {sortedImpactItems.filter(i => i.type === 'late').length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                    本月无迟到记录
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sortedImpactItems.filter(i => i.type === 'late').map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 bg-amber-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor('late'))}>
                            {getStatusLabel('late')}
                          </span>
                          <span className="text-sm text-gray-700">{item.date}</span>
                        </div>
                        <span className="text-sm font-medium text-amber-600">-¥20</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-orange-500" />
                  早退记录
                  <span className="text-xs text-gray-400 font-normal">（每条扣款 -¥20）</span>
                </h4>
                {sortedImpactItems.filter(i => i.type === 'early_leave').length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                    本月无早退记录
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sortedImpactItems.filter(i => i.type === 'early_leave').map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 bg-orange-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor('early_leave'))}>
                            {getStatusLabel('early_leave')}
                          </span>
                          <span className="text-sm text-gray-700">{item.date}</span>
                        </div>
                        <span className="text-sm font-medium text-orange-600">-¥20</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar size={16} className="text-violet-500" />
                  已审批请假
                </h4>
                {sortedLeaves.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                    本月无已审批请假
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sortedLeaves.map(leave => (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between px-4 py-3 bg-violet-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
                            {getLeaveTypeLabel(leave.leaveType)}
                          </span>
                          <span className="text-sm text-gray-700">
                            {leave.startDate} 至 {leave.endDate}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{leave.days}天</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Settings size={16} className="text-cyan-500" />
                  已处理异常工单
                </h4>
                {sortedExceptions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                    本月无已处理异常工单
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sortedExceptions.map(ticket => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between px-4 py-3 bg-cyan-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor(ticket.status))}>
                            {getStatusLabel(ticket.status)}
                          </span>
                          <div>
                            <p className="text-sm text-gray-700">{ticket.date}</p>
                            <p className="text-xs text-gray-400">{ticket.description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{ticket.handler || '已处理'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 p-5 bg-gray-50">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">总奖金</p>
                  <p className="text-xl font-bold text-emerald-600">+¥{auditModal.totalBonus}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">总罚款</p>
                  <p className="text-xl font-bold text-red-600">-¥{auditModal.totalFine}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">实发奖扣</p>
                  <p className={cn(
                    'text-xl font-bold',
                    auditModal.totalBonus - auditModal.totalFine >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {auditModal.totalBonus - auditModal.totalFine >= 0 ? '+' : ''}¥{auditModal.totalBonus - auditModal.totalFine}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {drawerDetail && (
        <>
          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
              drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            onClick={handleCloseDrawer}
          />
          <div
            className={cn(
              'fixed top-0 right-0 h-full z-50 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col',
              drawerOpen ? 'translate-x-0' : 'translate-x-full'
            )}
            style={{ width: '60%' }}
          >
            {monthLocked && (
              <div className="bg-blue-500 text-white px-5 py-2.5 flex items-center gap-2 text-sm font-medium">
                <CheckCircle size={16} />
                已锁账，以下数据不可变更
              </div>
            )}

            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <ClipboardList size={20} className="text-cyan-500" />
                  {drawerDetail.employeeName} - {currentYear}年{selectedMonth}月 月度对账
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  对账编号：{drawerDetail.employeeId}-{currentYear}{String(selectedMonth).padStart(2, '0')}
                </p>
              </div>
              <button onClick={handleCloseDrawer} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="border-b border-gray-100 px-5">
              <div className="flex gap-1">
                {DRAWER_TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setDrawerTab(tab.key)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-all -mb-px',
                        drawerTab === tab.key
                          ? 'border-cyan-500 text-cyan-600 font-medium'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {drawerTab === 'clockIn' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500" />
                        缺勤记录
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-normal">
                          {drawerAbsentRecords.length}条 · 每条-¥100
                        </span>
                      </h4>
                      <span className="text-sm font-bold text-red-600">
                        合计 -¥{drawerAbsentRecords.length * 100}
                      </span>
                    </div>
                    {drawerAbsentRecords.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl text-sm text-gray-400">
                        <AlertTriangle size={32} className="mx-auto mb-2 text-gray-300" />
                        本月无缺勤记录，表现优秀！
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full">
                          <thead className="bg-red-50">
                            <tr>
                              <th className="text-left text-xs font-medium text-red-600 py-2.5 px-4">日期</th>
                              <th className="text-left text-xs font-medium text-red-600 py-2.5 px-4">类型</th>
                              <th className="text-center text-xs font-medium text-red-600 py-2.5 px-4">影响金额</th>
                              <th className="text-right text-xs font-medium text-red-600 py-2.5 px-4">来源打卡ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drawerAbsentRecords.map(r => (
                              <tr key={r.id} className="border-t border-gray-100 hover:bg-red-50/50">
                                <td className="py-3 px-4 text-sm text-gray-700">{r.date}</td>
                                <td className="py-3 px-4">
                                  <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor('absent'))}>
                                    {getStatusLabel('absent')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-sm font-medium text-red-600">-¥100</td>
                                <td className="py-3 px-4 text-right text-xs text-gray-400 font-mono">{r.id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-500" />
                        迟到记录
                        <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-normal">
                          {drawerLateRecords.length}条 · 每条-¥20
                        </span>
                      </h4>
                      <span className="text-sm font-bold text-amber-600">
                        合计 -¥{drawerLateRecords.length * 20}
                      </span>
                    </div>
                    {drawerLateRecords.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl text-sm text-gray-400">
                        <AlertTriangle size={32} className="mx-auto mb-2 text-gray-300" />
                        本月无迟到记录，守时标兵！
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full">
                          <thead className="bg-amber-50">
                            <tr>
                              <th className="text-left text-xs font-medium text-amber-600 py-2.5 px-4">日期</th>
                              <th className="text-left text-xs font-medium text-amber-600 py-2.5 px-4">类型</th>
                              <th className="text-center text-xs font-medium text-amber-600 py-2.5 px-4">影响金额</th>
                              <th className="text-right text-xs font-medium text-amber-600 py-2.5 px-4">来源打卡ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drawerLateRecords.map(r => (
                              <tr key={r.id} className="border-t border-gray-100 hover:bg-amber-50/50">
                                <td className="py-3 px-4 text-sm text-gray-700">{r.date}</td>
                                <td className="py-3 px-4">
                                  <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor('late'))}>
                                    {getStatusLabel('late')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-sm font-medium text-amber-600">-¥20</td>
                                <td className="py-3 px-4 text-right text-xs text-gray-400 font-mono">{r.id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-orange-500" />
                        早退记录
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-normal">
                          {drawerEarlyRecords.length}条 · 每条-¥20
                        </span>
                      </h4>
                      <span className="text-sm font-bold text-orange-600">
                        合计 -¥{drawerEarlyRecords.length * 20}
                      </span>
                    </div>
                    {drawerEarlyRecords.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl text-sm text-gray-400">
                        <AlertTriangle size={32} className="mx-auto mb-2 text-gray-300" />
                        本月无早退记录，敬业爱岗！
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full">
                          <thead className="bg-orange-50">
                            <tr>
                              <th className="text-left text-xs font-medium text-orange-600 py-2.5 px-4">日期</th>
                              <th className="text-left text-xs font-medium text-orange-600 py-2.5 px-4">类型</th>
                              <th className="text-center text-xs font-medium text-orange-600 py-2.5 px-4">影响金额</th>
                              <th className="text-right text-xs font-medium text-orange-600 py-2.5 px-4">来源打卡ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drawerEarlyRecords.map(r => (
                              <tr key={r.id} className="border-t border-gray-100 hover:bg-orange-50/50">
                                <td className="py-3 px-4 text-sm text-gray-700">{r.date}</td>
                                <td className="py-3 px-4">
                                  <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor('early_leave'))}>
                                    {getStatusLabel('early_leave')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-sm font-medium text-orange-600">-¥20</td>
                                <td className="py-3 px-4 text-right text-xs text-gray-400 font-mono">{r.id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'leave' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar size={16} className="text-violet-500" />
                      已审批请假记录
                      <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-normal">
                        共{drawerLeaves.length}条
                      </span>
                    </h4>
                  </div>
                  {drawerLeaves.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl text-sm text-gray-400">
                      <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
                      本月无已审批请假
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full">
                        <thead className="bg-violet-50">
                          <tr>
                            <th className="text-left text-xs font-medium text-violet-600 py-2.5 px-4">类型</th>
                            <th className="text-left text-xs font-medium text-violet-600 py-2.5 px-4">开始日期</th>
                            <th className="text-left text-xs font-medium text-violet-600 py-2.5 px-4">结束日期</th>
                            <th className="text-center text-xs font-medium text-violet-600 py-2.5 px-4">天数</th>
                            <th className="text-center text-xs font-medium text-violet-600 py-2.5 px-4">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drawerLeaves.map(leave => (
                            <tr key={leave.id} className="border-t border-gray-100 hover:bg-violet-50/50">
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
                                  {getLeaveTypeLabel(leave.leaveType)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">{leave.startDate}</td>
                              <td className="py-3 px-4 text-sm text-gray-700">{leave.endDate}</td>
                              <td className="py-3 px-4 text-center text-sm font-medium text-gray-700">{leave.days}天</td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                  <CheckCircle size={12} />
                                  已审批通过
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'exception' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <AlertCircle size={16} className="text-cyan-500" />
                      异常工单记录
                      <span className="text-xs bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded-full font-normal">
                        共{drawerExceptions.length}条
                      </span>
                    </h4>
                  </div>
                  {drawerExceptions.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl text-sm text-gray-400">
                      <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                      本月无异常工单
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full">
                        <thead className="bg-cyan-50">
                          <tr>
                            <th className="text-left text-xs font-medium text-cyan-600 py-2.5 px-4">日期</th>
                            <th className="text-left text-xs font-medium text-cyan-600 py-2.5 px-4">类型</th>
                            <th className="text-left text-xs font-medium text-cyan-600 py-2.5 px-4">描述</th>
                            <th className="text-center text-xs font-medium text-cyan-600 py-2.5 px-4">状态</th>
                            <th className="text-right text-xs font-medium text-cyan-600 py-2.5 px-4">处理人</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drawerExceptions.map(ticket => (
                            <tr key={ticket.id} className="border-t border-gray-100 hover:bg-cyan-50/50">
                              <td className="py-3 px-4 text-sm text-gray-700">{ticket.date}</td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 text-xs font-medium bg-cyan-100 text-cyan-700 rounded-full">
                                  {exceptionTypeLabel[ticket.type] || ticket.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{ticket.description}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full', getStatusColor(ticket.status))}>
                                  {getStatusLabel(ticket.status)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right text-sm text-gray-500">{ticket.handler || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'adjustment' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Edit3 size={16} className="text-amber-500" />
                      手工调整记录
                      <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-normal">
                        共{drawerAdjustments.length}条
                      </span>
                    </h4>
                    {!monthLocked && (
                      <button
                        onClick={() => {
                          const summary = storeSummaries.find(s => s.employeeId === drawerDetail?.employeeId);
                          if (summary) handleOpenAdjust(summary.id);
                          handleCloseDrawer();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        <Edit3 size={12} />
                        新增调整
                      </button>
                    )}
                  </div>
                  {drawerAdjustments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl text-sm text-gray-400">
                      <Edit3 size={40} className="mx-auto mb-3 text-gray-300" />
                      本月无手工调整记录
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full">
                        <thead className="bg-amber-50">
                          <tr>
                            <th className="text-left text-xs font-medium text-amber-600 py-2.5 px-4">调整时间</th>
                            <th className="text-left text-xs font-medium text-amber-600 py-2.5 px-4">类型</th>
                            <th className="text-center text-xs font-medium text-amber-600 py-2.5 px-4">金额</th>
                            <th className="text-left text-xs font-medium text-amber-600 py-2.5 px-4">原因</th>
                            <th className="text-right text-xs font-medium text-amber-600 py-2.5 px-4">操作人</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drawerAdjustments.map(adj => (
                            <tr key={adj.id} className="border-t border-gray-100 hover:bg-amber-50/50">
                              <td className="py-3 px-4 text-sm text-gray-700 whitespace-nowrap">{adj.createdAt}</td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  'px-2.5 py-1 text-xs font-medium rounded-full',
                                  adj.type === 'bonus'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                )}>
                                  {adj.type === 'bonus' ? '加奖' : '扣款'}
                                </span>
                              </td>
                              <td className={cn(
                                'py-3 px-4 text-center text-sm font-bold',
                                adj.type === 'bonus' ? 'text-emerald-600' : 'text-red-600'
                              )}>
                                {adj.type === 'bonus' ? '+' : '-'}¥{adj.amount}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{adj.reason}</td>
                              <td className="py-3 px-4 text-right text-sm text-gray-500">{adj.operator}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'summary' && drawerDetail && (
                <div className="space-y-6">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <PieChartIcon size={16} className="text-cyan-500" />
                    月度对账汇总
                  </h4>

                  <div className="grid grid-cols-3 gap-5">
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <BarChart3 size={16} className="text-gray-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">系统自动计算</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-800 mb-3">
                        -¥{autoCalculate.amount}
                      </p>
                      <div className="space-y-1.5 border-t border-gray-200 pt-3">
                        {autoCalculate.breakdown.length === 0 ? (
                          <p className="text-xs text-gray-400">无打卡影响</p>
                        ) : (
                          autoCalculate.breakdown.map((b, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{b}</span>
                              <ChevronRight size={12} className="text-gray-300" />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center">
                          <Edit3 size={16} className="text-amber-700" />
                        </div>
                        <p className="text-sm font-medium text-amber-700">手工调整合计</p>
                      </div>
                      <p className={cn(
                        'text-3xl font-bold mb-3',
                        (manualTotal.net || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {(manualTotal.net || 0) >= 0 ? '+' : ''}¥{(manualTotal.net || 0)}
                      </p>
                      <div className="space-y-1.5 border-t border-amber-200 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-emerald-600">加奖合计</span>
                          <span className="font-medium text-emerald-600">+¥{manualTotal.bonus || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-red-600">扣款合计</span>
                          <span className="font-medium text-red-600">-¥{manualTotal.fine || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-cyan-200 rounded-lg flex items-center justify-center">
                          <DollarSign size={16} className="text-cyan-700" />
                        </div>
                        <p className="text-sm font-medium text-cyan-700">最终应发</p>
                      </div>
                      <p className={cn(
                        'text-3xl font-bold mb-3',
                        finalPayout.amount >= 0 ? 'text-cyan-600' : 'text-red-600'
                      )}>
                        {finalPayout.amount >= 0 ? '+' : ''}¥{finalPayout.amount}
                      </p>
                      <div className="space-y-1.5 border-t border-cyan-200 pt-3">
                        {finalPayout.breakdown.map((b, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{b}</span>
                            <ChevronRight size={12} className="text-cyan-200" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                      <FileText size={15} className="text-gray-500" />
                      计算公式说明
                    </h5>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-start gap-3">
                        <span className="w-2 h-2 mt-2 rounded-full bg-gray-400 flex-shrink-0" />
                        <p>
                          <span className="font-medium text-gray-700">系统自动计算：</span>
                          缺勤次数×¥100 + 迟到次数×¥20 + 早退次数×¥20
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-2 h-2 mt-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <p>
                          <span className="font-medium text-gray-700">手工调整合计：</span>
                          所有加奖金额之和 - 所有扣款金额之和
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="w-2 h-2 mt-2 rounded-full bg-cyan-400 flex-shrink-0" />
                        <p>
                          <span className="font-medium text-gray-700">最终应发：</span>
                          月度总奖金 - 月度总罚款（含自动计算和手工调整）
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-cyan-50 rounded-xl p-5 border border-cyan-100">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} className="text-cyan-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-cyan-700">
                        <p className="font-medium mb-1">对账确认</p>
                        <p className="text-cyan-600 text-xs leading-relaxed">
                          请仔细核对上述各项明细数据。如无异议，请点击"月末锁账"确认月度对账完成。
                          锁账后所有数据将不可修改，如需调整请联系管理员解锁。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
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
                <button
                  onClick={handleRecalculate}
                  disabled={monthLocked || isRecalculating}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5',
                    monthLocked || isRecalculating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <RefreshCw size={14} className={isRecalculating ? 'animate-spin' : ''} />
                  重新计算
                </button>
                <button className="px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors">
                  导出明细
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索员工姓名..."
                  value={bonusSearchName}
                  onChange={e => setBonusSearchName(e.target.value)}
                  className="w-64 h-9 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
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
                  {filteredStoreSummaries.map(summary => {
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
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenAudit(summary.employeeId)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-cyan-600 bg-cyan-50 rounded hover:bg-cyan-100 transition-colors"
                            >
                              <Eye size={12} />
                              反查
                            </button>
                            {monthLocked ? (
                              <span className="text-xs text-gray-300 cursor-not-allowed">调整</span>
                            ) : (
                              <button
                                onClick={() => handleOpenAdjust(summary.id)}
                                className="text-xs text-cyan-600 hover:text-cyan-700"
                              >
                                调整
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenDrawer(summary.employeeId)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-violet-600 bg-violet-50 rounded hover:bg-violet-100 transition-colors"
                            >
                              <ClipboardList size={12} />
                              对账
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStoreSummaries.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-sm text-gray-400">
                        暂无匹配的员工数据
                        {!monthLocked && storeSummaries.length === 0 && (
                          <div className="mt-3">
                            <button
                              onClick={handleRecalculate}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 transition-colors"
                            >
                              <RefreshCw size={14} />
                              点击生成本月奖扣明细
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
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

