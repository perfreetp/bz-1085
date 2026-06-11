import { useState } from 'react';
import { 
  CheckSquare, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
  User
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { stores } from '@/data/stores';
import { leaveRequests, leaveTypeLabels } from '@/data/leaves';
import { swapRequests } from '@/data/swaps';
import { exceptionTickets, exceptionTypeLabels } from '@/data/exceptions';
import { employees } from '@/data/employees';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, getStatusColor, getStatusLabel, getShiftLabel } from '@/utils';
import type { ApprovalStatus } from '@/types';

type ApprovalTab = 'pending' | 'approved' | 'rejected';
type ApprovalType = 'all' | 'leave' | 'swap' | 'exception';

interface ApprovalItem {
  id: string;
  type: 'leave' | 'swap' | 'exception';
  title: string;
  subtitle: string;
  applicant: string;
  applicantAvatar: string;
  status: ApprovalStatus;
  createdAt: string;
  detail: string;
}

export default function Approval() {
  const { currentStoreId, currentRole } = useAppStore();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending');
  const [typeFilter, setTypeFilter] = useState<ApprovalType>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  const currentStore = stores.find(s => s.id === currentStoreId);

  const pendingLeaves = leaveRequests.filter(r => r.storeId === currentStoreId && r.status === 'pending');
  const pendingSwaps = swapRequests.filter(r => r.storeId === currentStoreId && r.status === 'pending');
  const pendingTickets = exceptionTickets.filter(t => t.storeId === currentStoreId && (t.status === 'pending' || t.status === 'processing'));

  const approvedLeaves = leaveRequests.filter(r => r.storeId === currentStoreId && r.status === 'approved');
  const approvedSwaps = swapRequests.filter(r => r.storeId === currentStoreId && r.status === 'approved');
  const resolvedTickets = exceptionTickets.filter(t => t.storeId === currentStoreId && t.status === 'resolved');

  const rejectedLeaves = leaveRequests.filter(r => r.storeId === currentStoreId && r.status === 'rejected');
  const rejectedSwaps = swapRequests.filter(r => r.storeId === currentStoreId && r.status === 'rejected');
  const rejectedTickets = exceptionTickets.filter(t => t.storeId === currentStoreId && t.status === 'rejected');

  const buildApprovalList = (status: ApprovalTab): ApprovalItem[] => {
    const list: ApprovalItem[] = [];
    let leaves: typeof leaveRequests;
    let swaps: typeof swapRequests;
    let tickets: typeof exceptionTickets;

    if (status === 'pending') {
      leaves = pendingLeaves;
      swaps = pendingSwaps;
      tickets = pendingTickets;
    } else if (status === 'approved') {
      leaves = approvedLeaves;
      swaps = approvedSwaps;
      tickets = resolvedTickets;
    } else {
      leaves = rejectedLeaves;
      swaps = rejectedSwaps;
      tickets = rejectedTickets;
    }

    if (typeFilter === 'all' || typeFilter === 'leave') {
      leaves.forEach(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        list.push({
          id: `leave-${r.id}`,
          type: 'leave',
          title: `${leaveTypeLabels[r.leaveType]}申请`,
          subtitle: `${r.startDate} ~ ${r.endDate}（${r.days}天）`,
          applicant: emp?.name || '',
          applicantAvatar: emp?.avatar || '',
          status: r.status as ApprovalStatus,
          createdAt: r.createdAt,
          detail: r.reason,
        });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'swap') {
      swaps.forEach(r => {
        const emp = employees.find(e => e.id === r.applicantId);
        const target = employees.find(e => e.id === r.targetId);
        list.push({
          id: `swap-${r.id}`,
          type: 'swap',
          title: `调班申请`,
          subtitle: `${r.applicantDate} ↔ ${r.targetDate}（与${target?.name}对调）`,
          applicant: emp?.name || '',
          applicantAvatar: emp?.avatar || '',
          status: r.status as ApprovalStatus,
          createdAt: r.createdAt,
          detail: r.reason,
        });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'exception') {
      tickets.forEach(t => {
        const emp = employees.find(e => e.id === t.employeeId);
        list.push({
          id: `ticket-${t.id}`,
          type: 'exception',
          title: `${exceptionTypeLabels[t.type]}异常`,
          subtitle: `${t.date}`,
          applicant: emp?.name || '',
          applicantAvatar: emp?.avatar || '',
          status: (t.status === 'resolved' ? 'approved' : t.status === 'rejected' ? 'rejected' : 'pending') as ApprovalStatus,
          createdAt: t.createdAt,
          detail: t.description,
        });
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const approvalList = buildApprovalList(activeTab);

  const tabs = [
    { key: 'pending', label: '待审批', count: pendingLeaves.length + pendingSwaps.length + pendingTickets.length },
    { key: 'approved', label: '已通过', count: approvedLeaves.length + approvedSwaps.length + resolvedTickets.length },
    { key: 'rejected', label: '已拒绝', count: rejectedLeaves.length + rejectedSwaps.length + rejectedTickets.length },
  ];

  const typeFilters = [
    { key: 'all', label: '全部' },
    { key: 'leave', label: '请假', icon: FileText },
    { key: 'swap', label: '调班', icon: RefreshCw },
    { key: 'exception', label: '异常', icon: AlertTriangle },
  ];

  const selectedItem = approvalList.find(item => item.id === selectedId);

  const handleApprove = () => {
    alert('已通过审批');
    setSelectedId(null);
  };

  const handleReject = () => {
    alert('已拒绝审批');
    setSelectedId(null);
  };

  const handleBatchApprove = () => {
    alert(`已批量通过 ${approvalList.length} 条审批`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">审批中心</h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentStore?.name} · {currentRole === 'hr' ? '人事复核' : '店长初审'}
          </p>
        </div>
        {activeTab === 'pending' && approvalList.length > 0 && (
          <button 
            onClick={handleBatchApprove}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <CheckSquare size={16} />
            批量通过
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待我审批</p>
              <p className="text-2xl font-bold text-amber-600">
                {pendingLeaves.length + pendingSwaps.length + pendingTickets.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已通过</p>
              <p className="text-2xl font-bold text-emerald-600">
                {approvedLeaves.length + approvedSwaps.length + resolvedTickets.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <XCircle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已拒绝</p>
              <p className="text-2xl font-bold text-red-600">
                {rejectedLeaves.length + rejectedSwaps.length + rejectedTickets.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
              <CheckSquare size={24} className="text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">审批通过率</p>
              <p className="text-2xl font-bold text-violet-600">
                {Math.round(((approvedLeaves.length + approvedSwaps.length + resolvedTickets.length) / 
                  ((approvedLeaves.length + approvedSwaps.length + resolvedTickets.length) + 
                   (rejectedLeaves.length + rejectedSwaps.length + rejectedTickets.length) || 1)) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-200 -mx-4 px-4 -mt-4 pt-4">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as ApprovalTab)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.key
                      ? 'border-cyan-500 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4">
              {typeFilters.map(filter => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.key}
                    onClick={() => setTypeFilter(filter.key as ApprovalType)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all',
                      typeFilter === filter.key
                        ? 'bg-cyan-50 text-cyan-600 font-medium'
                        : 'text-gray-500 hover:bg-gray-100'
                    )}
                  >
                    {Icon && <Icon size={14} />}
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {approvalList.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50',
                  selectedId === item.id && 'bg-cyan-50/50 border-l-4 border-l-cyan-500'
                )}
              >
                <div className="flex items-start gap-3">
                  <img 
                    src={item.applicantAvatar} 
                    alt={item.applicant}
                    className="w-10 h-10 rounded-full object-cover mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{item.applicant}</span>
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        item.type === 'leave' && 'bg-blue-100 text-blue-600',
                        item.type === 'swap' && 'bg-violet-100 text-violet-600',
                        item.type === 'exception' && 'bg-amber-100 text-amber-600',
                      )}>
                        {item.type === 'leave' ? '请假' : item.type === 'swap' ? '调班' : '异常'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      提交时间：{item.createdAt}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn(
                      'inline-flex px-2.5 py-1 text-xs font-medium rounded-full',
                      getStatusColor(item.status)
                    )}>
                      {getStatusLabel(item.status)}
                    </span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {approvalList.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckSquare size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500">暂无{activeTab === 'pending' ? '待审批' : activeTab === 'approved' ? '已通过' : '已拒绝'}记录</p>
            </div>
          )}
        </div>

        {selectedItem && (
          <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">审批详情</h3>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[500px]">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedItem.applicantAvatar} 
                  alt={selectedItem.applicant}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-medium text-gray-800">{selectedItem.applicant}</h4>
                  <p className="text-sm text-gray-500">
                    {selectedItem.type === 'leave' ? '请假申请' : selectedItem.type === 'swap' ? '调班申请' : '异常工单'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">申请类型</span>
                  <span className="text-sm font-medium text-gray-800">{selectedItem.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">时间</span>
                  <span className="text-sm font-medium text-gray-800">{selectedItem.subtitle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">状态</span>
                  <span className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-full',
                    getStatusColor(selectedItem.status)
                  )}>
                    {getStatusLabel(selectedItem.status)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <MessageSquare size={14} />
                  申请说明
                </p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {selectedItem.detail}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-800 mb-3">审批流程</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={12} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">提交申请</span>
                        <span className="text-xs text-gray-400">{selectedItem.createdAt}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">申请人提交</p>
                    </div>
                    <CheckCircle size={16} className="text-emerald-500" />
                  </div>
                  <div className="flex gap-3">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      selectedItem.status === 'pending' ? 'bg-amber-100' : 'bg-emerald-100'
                    )}>
                      <User size={12} className={selectedItem.status === 'pending' ? 'text-amber-600' : 'text-emerald-600'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">店长初审</span>
                        <span className="text-xs text-gray-400">
                          {selectedItem.status === 'pending' ? '待审批' : '已审批'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">门店店长</p>
                    </div>
                    {selectedItem.status !== 'pending' && (
                      selectedItem.status === 'approved' 
                        ? <CheckCircle size={16} className="text-emerald-500" />
                        : <XCircle size={16} className="text-red-500" />
                    )}
                  </div>
                  {currentRole === 'hr' && (
                    <div className="flex gap-3">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                        selectedItem.status === 'pending' ? 'bg-gray-100' : 'bg-emerald-100'
                      )}>
                        <User size={12} className={selectedItem.status === 'pending' ? 'text-gray-400' : 'text-emerald-600'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">人事复核</span>
                          <span className="text-xs text-gray-400">
                            {selectedItem.status === 'pending' ? '待审批' : '已审批'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">总部人事</p>
                      </div>
                      {selectedItem.status !== 'pending' && (
                        selectedItem.status === 'approved' 
                          ? <CheckCircle size={16} className="text-emerald-500" />
                          : <XCircle size={16} className="text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedItem.status === 'pending' && (
              <div className="p-5 border-t border-gray-100 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">审批意见</label>
                  <textarea 
                    value={approvalComment}
                    onChange={e => setApprovalComment(e.target.value)}
                    rows={3}
                    placeholder="请输入审批意见（选填）"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  ></textarea>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle size={16} />
                    通过
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle size={16} />
                    拒绝
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
