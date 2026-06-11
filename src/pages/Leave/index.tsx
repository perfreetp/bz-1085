import { useState } from 'react';
import { 
  FileText, 
  Clock as ClockIcon,
  Plus,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  X,
  User,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { stores } from '@/data/stores';
import { leaveTypeLabels } from '@/data/leaves';
import { getEmployeesByStore, employees } from '@/data/employees';
import { shiftTemplates } from '@/data/shiftTemplates';
import { format } from 'date-fns';
import { cn, getStatusColor, getStatusLabel, getShiftLabel, getLeaveTypeLabel } from '@/utils';
import type { LeaveType, ShiftType, LeaveRequest, SwapRequest } from '@/types';

type TabType = 'leave' | 'swap' | 'quota';
type DetailType = 'leave' | 'swap' | null;

export default function Leave() {
  const { currentStoreId, leaveRequests, swapRequests, approvalRecords, addLeaveRequest, addSwapRequest } = useBusinessStore();
  const [activeTab, setActiveTab] = useState<TabType>('leave');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [detailType, setDetailType] = useState<DetailType>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'annual' as LeaveType,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });
  const [swapForm, setSwapForm] = useState({
    targetEmployeeId: '',
    targetDate: format(new Date(), 'yyyy-MM-dd'),
    applicantShift: 'morning' as ShiftType,
    targetShift: 'morning' as ShiftType,
    reason: '',
  });

  const currentStore = stores.find(s => s.id === currentStoreId);
  const storeEmployees = getEmployeesByStore(currentStoreId);
  const storeLeaves = leaveRequests.filter(r => r.storeId === currentStoreId);
  const storeSwaps = swapRequests.filter(r => r.storeId === currentStoreId);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSubmitLeave = () => {
    if (!leaveForm.reason.trim()) {
      showToast('请填写请假原因');
      return;
    }
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const firstEmp = storeEmployees[0];
    if (!firstEmp) return;
    addLeaveRequest({
      employeeId: firstEmp.id,
      storeId: currentStoreId,
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      days,
      reason: leaveForm.reason,
    });
    setShowLeaveModal(false);
    setLeaveForm({ leaveType: 'annual', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), reason: '' });
    showToast('请假申请已提交，等待审批');
  };

  const handleSubmitSwap = () => {
    if (!swapForm.targetEmployeeId) {
      showToast('请选择调换员工');
      return;
    }
    if (!swapForm.reason.trim()) {
      showToast('请填写调班原因');
      return;
    }
    const firstEmp = storeEmployees[0];
    if (!firstEmp) return;
    addSwapRequest({
      applicantId: firstEmp.id,
      targetId: swapForm.targetEmployeeId,
      storeId: currentStoreId,
      applicantDate: format(new Date(), 'yyyy-MM-dd'),
      targetDate: swapForm.targetDate,
      applicantShift: swapForm.applicantShift,
      targetShift: swapForm.targetShift,
      reason: swapForm.reason,
    });
    setShowSwapModal(false);
    setSwapForm({ targetEmployeeId: '', targetDate: format(new Date(), 'yyyy-MM-dd'), applicantShift: 'morning', targetShift: 'morning', reason: '' });
    showToast('调班申请已提交，等待审批');
  };

  const handleViewLeaveDetail = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setDetailType('leave');
  };

  const handleViewSwapDetail = (swap: SwapRequest) => {
    setSelectedSwap(swap);
    setDetailType('swap');
  };

  const closeDetail = () => {
    setDetailType(null);
    setSelectedLeave(null);
    setSelectedSwap(null);
  };

  const getApprovalRecords = (sourceId: string, sourceType: 'leave' | 'swap') => {
    return approvalRecords
      .filter(r => r.sourceId === sourceId && r.sourceType === sourceType)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const getApproverRoleLabel = (role: string) => {
    return role === 'store_manager' ? '店长' : '人事管理员';
  };

  const tabs = [
    { key: 'leave', label: '请假申请', icon: FileText },
    { key: 'swap', label: '调班申请', icon: RefreshCw },
    { key: 'quota', label: '假期额度', icon: ClockIcon },
  ];

  const renderDetailContent = () => {
    if (detailType === 'leave' && selectedLeave) {
      const emp = employees.find(e => e.id === selectedLeave.employeeId);
      const records = getApprovalRecords(selectedLeave.id, 'leave');
      
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">请假申请详情</h3>
            <span className={cn('inline-flex px-3 py-1 text-xs font-medium rounded-full', getStatusColor(selectedLeave.status))}>
              {getStatusLabel(selectedLeave.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">申请人</p>
              <div className="flex items-center gap-2">
                <img src={emp?.avatar} alt={emp?.name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{emp?.name}</p>
                  <p className="text-xs text-gray-400">{emp?.position}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">请假类型</p>
              <p className="text-sm font-medium text-gray-800">{getLeaveTypeLabel(selectedLeave.leaveType)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">开始日期</p>
              <p className="text-sm font-medium text-gray-800">{selectedLeave.startDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">结束日期</p>
              <p className="text-sm font-medium text-gray-800">{selectedLeave.endDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">请假天数</p>
              <p className="text-sm font-medium text-gray-800">{selectedLeave.days} 天</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">提交时间</p>
              <p className="text-sm font-medium text-gray-800">{selectedLeave.createdAt}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">请假原因</p>
            <p className="text-sm text-gray-700">{selectedLeave.reason}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-cyan-500" />
              审批流程
            </h4>
            <div className="relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              <div className="space-y-4">
                <div className="flex gap-3 relative">
                  <div className="w-7 h-7 rounded-full bg-cyan-100 flex items-center justify-center z-10 flex-shrink-0">
                    <User size={14} className="text-cyan-600" />
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">提交申请</span>
                      <span className="text-xs text-gray-400">{selectedLeave.createdAt}</span>
                    </div>
                    <p className="text-xs text-gray-500">员工提交请假申请</p>
                  </div>
                </div>

                {records.length === 0 ? (
                  <div className="flex gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center z-10 flex-shrink-0">
                      <Clock size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">等待审批</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedLeave.status === 'pending_store' ? '等待店长审批' : 
                         selectedLeave.status === 'pending_hr' ? '等待人事复核' : '审批流程已结束'}
                      </p>
                    </div>
                  </div>
                ) : (
                  records.map((record, index) => (
                    <div key={record.id} className="flex gap-3 relative">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0',
                        record.result === 'rejected' ? 'bg-red-100' : 'bg-green-100'
                      )}>
                        {record.result === 'rejected' ? (
                          <XCircle size={14} className="text-red-600" />
                        ) : (
                          <CheckCircle2 size={14} className="text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            {getApproverRoleLabel(record.approverRole)}审批
                          </span>
                          <span className="text-xs text-gray-400">{record.createdAt}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor(record.result))}>
                            {record.result === 'rejected' ? '已拒绝' : 
                             record.result === 'approved' ? '已通过' : '待处理'}
                          </span>
                        </div>
                        {record.comment && (
                          <div className="flex items-start gap-1.5 mt-2">
                            <MessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-600">{record.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {records.length > 0 && selectedLeave.status !== 'approved' && selectedLeave.status !== 'rejected' && (
                  <div className="flex gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center z-10 flex-shrink-0">
                      <Clock size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">等待下一环节</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedLeave.status === 'pending_store' ? '等待店长审批' : '等待人事复核'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (detailType === 'swap' && selectedSwap) {
      const applicant = employees.find(e => e.id === selectedSwap.applicantId);
      const target = employees.find(e => e.id === selectedSwap.targetId);
      const records = getApprovalRecords(selectedSwap.id, 'swap');
      
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">调班申请详情</h3>
            <span className={cn('inline-flex px-3 py-1 text-xs font-medium rounded-full', getStatusColor(selectedSwap.status))}>
              {getStatusLabel(selectedSwap.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">申请人</p>
              <div className="flex items-center gap-2">
                <img src={applicant?.avatar} alt={applicant?.name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{applicant?.name}</p>
                  <p className="text-xs text-gray-400">{applicant?.position}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">调换人</p>
              <div className="flex items-center gap-2">
                <img src={target?.avatar} alt={target?.name} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{target?.name}</p>
                  <p className="text-xs text-gray-400">{target?.position}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">申请人日期</p>
              <p className="text-sm font-medium text-gray-800">{selectedSwap.applicantDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">调换人日期</p>
              <p className="text-sm font-medium text-gray-800">{selectedSwap.targetDate}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">申请人班次</p>
              <p className="text-sm font-medium text-gray-800">{getShiftLabel(selectedSwap.applicantShift)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">调换人班次</p>
              <p className="text-sm font-medium text-gray-800">{getShiftLabel(selectedSwap.targetShift)}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">调班原因</p>
            <p className="text-sm text-gray-700">{selectedSwap.reason}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-violet-500" />
              审批流程
            </h4>
            <div className="relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>
              <div className="space-y-4">
                <div className="flex gap-3 relative">
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center z-10 flex-shrink-0">
                    <User size={14} className="text-violet-600" />
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">提交申请</span>
                      <span className="text-xs text-gray-400">{selectedSwap.createdAt}</span>
                    </div>
                    <p className="text-xs text-gray-500">员工提交调班申请</p>
                  </div>
                </div>

                {records.length === 0 ? (
                  <div className="flex gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center z-10 flex-shrink-0">
                      <Clock size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">等待审批</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedSwap.status === 'pending_store' ? '等待店长审批' : 
                         selectedSwap.status === 'pending_hr' ? '等待人事复核' : '审批流程已结束'}
                      </p>
                    </div>
                  </div>
                ) : (
                  records.map((record) => (
                    <div key={record.id} className="flex gap-3 relative">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0',
                        record.result === 'rejected' ? 'bg-red-100' : 'bg-green-100'
                      )}>
                        {record.result === 'rejected' ? (
                          <XCircle size={14} className="text-red-600" />
                        ) : (
                          <CheckCircle2 size={14} className="text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800">
                            {getApproverRoleLabel(record.approverRole)}审批
                          </span>
                          <span className="text-xs text-gray-400">{record.createdAt}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor(record.result))}>
                            {record.result === 'rejected' ? '已拒绝' : 
                             record.result === 'approved' ? '已通过' : '待处理'}
                          </span>
                        </div>
                        {record.comment && (
                          <div className="flex items-start gap-1.5 mt-2">
                            <MessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-600">{record.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {records.length > 0 && selectedSwap.status !== 'approved' && selectedSwap.status !== 'rejected' && (
                  <div className="flex gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center z-10 flex-shrink-0">
                      <Clock size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">等待下一环节</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedSwap.status === 'pending_store' ? '等待店长审批' : '等待人事复核'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in text-sm font-medium">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">请假调班</h1>
          <p className="text-gray-500 text-sm mt-1">{currentStore?.name} · 请假与调班管理</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'leave' && (
            <button 
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Plus size={16} />
              提交请假
            </button>
          )}
          {activeTab === 'swap' && (
            <button 
              onClick={() => setShowSwapModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
            >
              <Plus size={16} />
              提交调班
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all',
                    activeTab === tab.key
                      ? 'bg-white text-slate-800 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'leave' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">申请人</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">请假类型</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">开始日期</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">结束日期</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">天数</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">原因</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">状态</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {storeLeaves.map(request => {
                  const emp = employees.find(e => e.id === request.employeeId);
                  return (
                    <tr key={request.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={emp?.avatar} alt={emp?.name} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{emp?.name}</p>
                            <p className="text-xs text-gray-400">{emp?.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4"><span className="text-sm text-gray-800 font-medium">{leaveTypeLabels[request.leaveType]}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-gray-700">{request.startDate}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-gray-700">{request.endDate}</span></td>
                      <td className="py-3 px-4"><span className="text-sm font-medium text-gray-800">{request.days} 天</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-gray-600 max-w-[150px] truncate block">{request.reason}</span></td>
                      <td className="py-3 px-4">
                        <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-full', getStatusColor(request.status))}>
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => handleViewLeaveDetail(request)}
                          className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                        >
                          详情 <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {storeLeaves.length === 0 && (
              <div className="py-12 text-center text-gray-500">暂无请假记录</div>
            )}
          </div>
        )}

        {activeTab === 'swap' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">申请人</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">调换人</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">调换日期</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">班次调换</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">原因</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">状态</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {storeSwaps.map(request => {
                  const applicant = employees.find(e => e.id === request.applicantId);
                  const target = employees.find(e => e.id === request.targetId);
                  return (
                    <tr key={request.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={applicant?.avatar} alt={applicant?.name} className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm font-medium text-gray-800">{applicant?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={target?.avatar} alt={target?.name} className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm font-medium text-gray-800">{target?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><span className="text-sm text-gray-700">{request.targetDate}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-gray-600">{getShiftLabel(request.applicantShift)} → {getShiftLabel(request.targetShift)}</span></td>
                      <td className="py-3 px-4"><span className="text-sm text-gray-600 max-w-[150px] truncate block">{request.reason}</span></td>
                      <td className="py-3 px-4">
                        <span className={cn('inline-flex px-2.5 py-1 text-xs font-medium rounded-full', getStatusColor(request.status))}>
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => handleViewSwapDetail(request)}
                          className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                        >
                          详情 <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {storeSwaps.length === 0 && (
              <div className="py-12 text-center text-gray-500">暂无调班记录</div>
            )}
          </div>
        )}

        {activeTab === 'quota' && (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6 mb-8">
              {[
                { type: 'annual', label: '年假', total: 10, used: storeLeaves.filter(l => l.leaveType === 'annual' && l.status === 'approved').reduce((s, l) => s + l.days, 0), color: 'cyan' },
                { type: 'sick', label: '病假', total: 5, used: storeLeaves.filter(l => l.leaveType === 'sick' && l.status === 'approved').reduce((s, l) => s + l.days, 0), color: 'emerald' },
                { type: 'compensation', label: '调休', total: 3, used: storeLeaves.filter(l => l.leaveType === 'compensation' && l.status === 'approved').reduce((s, l) => s + l.days, 0), color: 'violet' },
              ].map(item => {
                const remaining = Math.max(0, item.total - item.used);
                const percentage = item.total > 0 ? Math.min((item.used / item.total) * 100, 100) : 0;
                return (
                  <div key={item.type} className="bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-800">{item.label}</span>
                      <span className="text-2xl font-bold text-gray-800">{remaining}<span className="text-sm font-normal text-gray-500 ml-1">天</span></span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', item.color === 'cyan' && 'bg-cyan-500', item.color === 'emerald' && 'bg-emerald-500', item.color === 'violet' && 'bg-violet-500')} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>已用 {item.used} 天</span>
                      <span>总额度 {item.total} 天</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <h3 className="font-semibold text-gray-800 mb-4">员工假期额度</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">员工</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">年假</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">病假</th>
                    <th className="text-center text-sm font-medium text-gray-500 py-3 px-4">调休</th>
                  </tr>
                </thead>
                <tbody>
                  {storeEmployees.slice(0, 8).map(emp => (
                    <tr key={emp.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                          <div><p className="text-sm font-medium text-gray-800">{emp.name}</p><p className="text-xs text-gray-400">{emp.position}</p></div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-700">{emp.annualLeaveDays - emp.usedAnnualLeave} / {emp.annualLeaveDays} 天</td>
                      <td className="py-3 px-4 text-center text-sm text-gray-700">{emp.sickLeaveDays - emp.usedSickLeave} / {emp.sickLeaveDays} 天</td>
                      <td className="py-3 px-4 text-center text-sm text-gray-700">{emp.compLeaveDays - emp.usedCompLeave} / {emp.compLeaveDays} 天</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLeaveModal(false)}>
          <div className="bg-white rounded-2xl w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-800">提交请假申请</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">请假类型</label>
                <select value={leaveForm.leaveType} onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                  {Object.entries(leaveTypeLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">开始日期</label>
                  <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">结束日期</label>
                  <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">请假原因</label>
                <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={4} placeholder="请输入请假原因..." className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">取消</button>
              <button onClick={handleSubmitLeave} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow">提交申请</button>
            </div>
          </div>
        </div>
      )}

      {showSwapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSwapModal(false)}>
          <div className="bg-white rounded-2xl w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-800">提交调班申请</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">调换员工</label>
                <select value={swapForm.targetEmployeeId} onChange={e => setSwapForm({ ...swapForm, targetEmployeeId: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">请选择调换员工</option>
                  {storeEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">调换日期</label>
                <input type="date" value={swapForm.targetDate} onChange={e => setSwapForm({ ...swapForm, targetDate: e.target.value })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">我的班次</label>
                  <select value={swapForm.applicantShift} onChange={e => setSwapForm({ ...swapForm, applicantShift: e.target.value as ShiftType })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="morning">早班</option><option value="middle">中班</option><option value="evening">晚班</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">对方班次</label>
                  <select value={swapForm.targetShift} onChange={e => setSwapForm({ ...swapForm, targetShift: e.target.value as ShiftType })} className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="morning">早班</option><option value="middle">中班</option><option value="evening">晚班</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">调班原因</label>
                <textarea value={swapForm.reason} onChange={e => setSwapForm({ ...swapForm, reason: e.target.value })} rows={4} placeholder="请输入调班原因..." className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowSwapModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">取消</button>
              <button onClick={handleSubmitSwap} className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow">提交申请</button>
            </div>
          </div>
        </div>
      )}

      {detailType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeDetail}>
          <div className="bg-white rounded-2xl w-[560px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between z-10">
              <div></div>
              <button onClick={closeDetail} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {renderDetailContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
