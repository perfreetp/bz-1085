import { useState, useEffect, useCallback, useMemo } from 'react';
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
  User,
  Store as StoreIcon,
  Filter,
  ChevronDown,
  Square,
  CheckSquare as CheckSquareFilled,
  Bell,
  ArrowRightLeft,
  X,
  HelpCircle,
} from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { stores } from '@/data/stores';
import { employees } from '@/data/employees';
import { leaveTypeLabels } from '@/data/leaves';
import { exceptionTypeLabels } from '@/data/exceptions';
import { cn, getStatusColor, getStatusLabel, getShiftLabel } from '@/utils';
import type { ApprovalStatus, UserRole, ApprovalAction } from '@/types';
import { differenceInHours, parseISO } from 'date-fns';

type ApprovalTab = 'pending' | 'approved' | 'rejected';
type ApprovalType = 'all' | 'leave' | 'swap' | 'exception';
type StageFilter = 'all' | 'pending_store' | 'pending_hr';

interface ApprovalItem {
  id: string;
  sourceId: string;
  type: 'leave' | 'swap' | 'exception';
  storeId: string;
  title: string;
  subtitle: string;
  applicant: string;
  applicantAvatar: string;
  status: ApprovalStatus;
  createdAt: string;
  detail: string;
  managerComment?: string;
  hrComment?: string;
  reminderCount?: number;
  handoffRecords?: Array<{
    id: string;
    fromHandlerName: string;
    toHandlerName: string;
    reason: string;
    createdAt: string;
  }>;
}

interface AssistantManager {
  id: string;
  name: string;
}

const ASSISTANT_MANAGERS: AssistantManager[] = [
  { id: 'asm-001', name: '李明-副店长' },
  { id: 'asm-002', name: '王芳-副店长' },
];

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}

export default function Approval() {
  const {
    currentStoreId,
    currentRole,
    leaveRequests,
    swapRequests,
    exceptionTickets,
    approvalRecords,
    approveRequest,
    rejectRequest,
    batchApproveRequests,
    canApprove,
    urgeRequest,
    handoffRequest,
  } = useBusinessStore();

  const [activeTab, setActiveTab] = useState<ApprovalTab>('pending');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<ApprovalType>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);

  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [handoffItem, setHandoffItem] = useState<ApprovalItem | null>(null);
  const [handoffTargetId, setHandoffTargetId] = useState('');
  const [handoffReason, setHandoffReason] = useState('');

  const approverRole = currentRole === 'hr' ? 'hr' as const : 'store_manager' as const;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const getDisabledReason = (status: ApprovalStatus, role: UserRole): string => {
    if (role === 'hr') {
      if (status === 'pending_store') return '待店长初审，不可直接操作';
      if (status === 'approved' || status === 'rejected') return '该申请已完成审批';
    }
    if (role === 'store_manager') {
      if (status === 'pending_hr') return '待人事复核，不可再操作';
      if (status === 'approved' || status === 'rejected') return '该申请已完成审批';
    }
    return '';
  };

  const isUrgent = (item: ApprovalItem): boolean => {
    if (item.status !== 'pending_store') return false;
    if (item.type === 'exception') return false;
    const hours = differenceInHours(new Date(), parseISO(item.createdAt));
    return hours >= 24;
  };

  const stageOptions = useMemo(() => {
    const options: { key: StageFilter; label: string }[] = [
      { key: 'all', label: '全部环节' },
    ];
    if (currentRole === 'store_manager' || currentRole === 'hr') {
      options.push({ key: 'pending_store', label: '待店长审批' });
    }
    if (currentRole === 'hr') {
      options.push({ key: 'pending_hr', label: '待人事复核' });
    }
    return options;
  }, [currentRole]);

  const buildApprovalList = useCallback((status: ApprovalTab): ApprovalItem[] => {
    const list: ApprovalItem[] = [];

    const filterByStore = (itemStoreId: string): boolean => {
      if (storeFilter === 'all') return true;
      return itemStoreId === storeFilter;
    };

    const filterByStage = (itemStatus: ApprovalStatus): boolean => {
      if (status !== 'pending') return true;
      if (stageFilter === 'all') return true;
      return itemStatus === stageFilter;
    };

    let leaves = leaveRequests;
    let swaps = swapRequests;
    let tickets = exceptionTickets;

    if (status === 'pending') {
      leaves = leaveRequests.filter(r => r.status === 'pending_store' || r.status === 'pending_hr');
      swaps = swapRequests.filter(r => r.status === 'pending_store' || r.status === 'pending_hr');
      tickets = exceptionTickets.filter(t => t.status === 'pending' || t.status === 'processing');
    } else if (status === 'approved') {
      leaves = leaveRequests.filter(r => r.status === 'approved');
      swaps = swapRequests.filter(r => r.status === 'approved');
      tickets = exceptionTickets.filter(t => t.status === 'resolved');
    } else {
      leaves = leaveRequests.filter(r => r.status === 'rejected');
      swaps = swapRequests.filter(r => r.status === 'rejected');
      tickets = exceptionTickets.filter(t => t.status === 'rejected');
    }

    if (typeFilter === 'all' || typeFilter === 'leave') {
      leaves.forEach(r => {
        if (!filterByStore(r.storeId)) return;
        if (!filterByStage(r.status)) return;
        const emp = employees.find(e => e.id === r.employeeId);
        list.push({
          id: `leave-${r.id}`,
          sourceId: r.id,
          type: 'leave',
          storeId: r.storeId,
          title: `${leaveTypeLabels[r.leaveType]}申请`,
          subtitle: `${r.startDate} ~ ${r.endDate}（${r.days}天）`,
          applicant: emp?.name || '',
          applicantAvatar: emp?.avatar || '',
          status: r.status,
          createdAt: r.createdAt,
          detail: r.reason,
          managerComment: r.managerComment,
          hrComment: r.hrComment,
          reminderCount: r.reminderCount,
          handoffRecords: r.handoffRecords,
        });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'swap') {
      swaps.forEach(r => {
        if (!filterByStore(r.storeId)) return;
        if (!filterByStage(r.status)) return;
        const emp = employees.find(e => e.id === r.applicantId);
        const target = employees.find(e => e.id === r.targetId);
        list.push({
          id: `swap-${r.id}`,
          sourceId: r.id,
          type: 'swap',
          storeId: r.storeId,
          title: `调班申请`,
          subtitle: `${r.applicantDate}（${getShiftLabel(r.applicantShift)}） ↔ ${r.targetDate}（${getShiftLabel(r.targetShift)}）（与${target?.name}对调）`,
          applicant: emp?.name || '',
          applicantAvatar: emp?.avatar || '',
          status: r.status,
          createdAt: r.createdAt,
          detail: r.reason,
          managerComment: r.managerComment,
          hrComment: r.hrComment,
          reminderCount: r.reminderCount,
          handoffRecords: r.handoffRecords,
        });
      });
    }

    if (typeFilter === 'all' || typeFilter === 'exception') {
      tickets.forEach(t => {
        if (!filterByStore(t.storeId)) return;
        const mappedStatus: ApprovalStatus =
          t.status === 'resolved' ? 'approved' :
          t.status === 'rejected' ? 'rejected' : 'pending_store';
        if (!filterByStage(mappedStatus) && status === 'pending') return;
        const emp = employees.find(e => e.id === t.employeeId);
        list.push({
          id: `ticket-${t.id}`,
          sourceId: t.id,
          type: 'exception',
          storeId: t.storeId,
          title: `${exceptionTypeLabels[t.type]}异常`,
          subtitle: `${t.date}`,
          applicant: emp?.name || '',
          applicantAvatar: emp?.avatar || '',
          status: mappedStatus,
          createdAt: t.createdAt,
          detail: t.description,
        });
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leaveRequests, swapRequests, exceptionTickets, typeFilter, storeFilter, stageFilter]);

  const approvalList = buildApprovalList(activeTab);

  const pendingList = useMemo(() => buildApprovalList('pending'), [buildApprovalList]);
  const approvedList = useMemo(() => buildApprovalList('approved'), [buildApprovalList]);
  const rejectedList = useMemo(() => buildApprovalList('rejected'), [buildApprovalList]);

  const selectableItems = useMemo(() => {
    if (activeTab !== 'pending') return [];
    return approvalList.filter(item => canApprove(item.status, approverRole));
  }, [approvalList, activeTab, approverRole, canApprove]);

  const allSelected = selectableItems.length > 0 && selectableItems.every(item => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0;

  const currentStore = stores.find(s => s.id === (storeFilter === 'all' ? currentStoreId : storeFilter));

  const tabs = [
    { key: 'pending', label: '待审批', count: pendingList.length },
    { key: 'approved', label: '已通过', count: approvedList.length },
    { key: 'rejected', label: '已拒绝', count: rejectedList.length },
  ];

  const typeFilters = [
    { key: 'all', label: '全部类型' },
    { key: 'leave', label: '请假', icon: FileText },
    { key: 'swap', label: '调班', icon: RefreshCw },
    { key: 'exception', label: '异常', icon: AlertTriangle },
  ];

  const selectedItem = approvalList.find(item => item.id === selectedId);

  useEffect(() => {
    if (selectedId) {
      const found = approvalList.some(item => item.id === selectedId);
      if (!found) {
        setSelectedId(null);
        setApprovalComment('');
      }
    }
  }, [approvalList, selectedId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, storeFilter, typeFilter, stageFilter]);

  const handleToggleSelect = (itemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableItems.map(item => item.id)));
    }
  };

  const handleApprove = () => {
    if (!selectedItem) return;
    if (!canApprove(selectedItem.status, approverRole)) return;
    const ok = approveRequest(selectedItem.sourceId, selectedItem.type, approverRole);
    if (ok) {
      showToast(`${selectedItem.type === 'leave' ? '请假' : selectedItem.type === 'swap' ? '调班' : '异常'}申请已通过`);
      setSelectedId(null);
      setApprovalComment('');
    }
  };

  const handleReject = () => {
    if (!selectedItem) return;
    if (!canApprove(selectedItem.status, approverRole)) return;
    const ok = rejectRequest(selectedItem.sourceId, selectedItem.type, approverRole, approvalComment || undefined);
    if (ok) {
      showToast(`${selectedItem.type === 'leave' ? '请假' : selectedItem.type === 'swap' ? '调班' : '异常'}申请已拒绝`);
      setSelectedId(null);
      setApprovalComment('');
    }
  };

  const handleBatchApprove = () => {
    if (selectedIds.size === 0) return;

    const selectedItems = approvalList.filter(item => selectedIds.has(item.id));

    const itemsByType: Record<string, ApprovalItem[]> = {
      leave: [],
      swap: [],
      exception: [],
    };

    selectedItems.forEach(item => {
      if (canApprove(item.status, approverRole)) {
        itemsByType[item.type].push(item);
      }
    });

    let totalCount = 0;
    (['leave', 'swap', 'exception'] as const).forEach(type => {
      const items = itemsByType[type];
      if (items.length > 0) {
        const sourceIds = items.map(item => item.sourceId);
        const count = batchApproveRequests(sourceIds, type, approverRole);
        totalCount += count;
      }
    });

    showToast(`已批量通过 ${totalCount} 条审批`);
    setSelectedIds(new Set());
    setSelectedId(null);
    setApprovalComment('');
  };

  const handleUrge = (item: ApprovalItem) => {
    if (item.type === 'exception') return;
    const ok = urgeRequest(item.sourceId, item.type as 'leave' | 'swap');
    if (ok) {
      showToast('催办成功，已通知店长');
    }
  };

  const handleOpenHandoff = (item: ApprovalItem) => {
    setHandoffItem(item);
    setHandoffTargetId('');
    setHandoffReason('');
    setHandoffModalOpen(true);
  };

  const handleConfirmHandoff = () => {
    if (!handoffItem || !handoffTargetId || !handoffReason.trim()) return;
    const target = ASSISTANT_MANAGERS.find(a => a.id === handoffTargetId);
    if (!target) return;
    handoffRequest(
      handoffItem.sourceId,
      handoffItem.type as 'leave' | 'swap',
      target.id,
      target.name,
      handoffReason.trim()
    );
    showToast(`已转交给${target.name}`);
    setHandoffModalOpen(false);
    setHandoffItem(null);
    setHandoffTargetId('');
    setHandoffReason('');
  };

  type TimelineStep = {
    label: string;
    role: string;
    done: boolean;
    approved?: boolean;
    time?: string;
    comment?: string;
    action?: ApprovalAction;
  };

  const getApprovalTimeline = (item: ApprovalItem): TimelineStep[] => {
    const timeline: TimelineStep[] = [];

    timeline.push({
      label: '提交申请',
      role: '申请人提交',
      done: true,
      approved: true,
      time: item.createdAt,
    });

    const itemRecords = approvalRecords.filter(
      r => r.sourceId === item.sourceId && r.sourceType === item.type
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const extraSteps: TimelineStep[] = [];
    itemRecords.forEach(r => {
      if (r.action === 'urge') {
        extraSteps.push({
          label: `催办（第${item.reminderCount || 1}次）`,
          role: r.approverName,
          done: true,
          approved: true,
          time: r.createdAt,
          comment: r.comment,
          action: 'urge',
        });
      }
      if (r.action === 'handoff') {
        extraSteps.push({
          label: '转交审批',
          role: r.approverName,
          done: true,
          approved: true,
          time: r.createdAt,
          comment: r.comment,
          action: 'handoff',
        });
      }
    });

    const managerApproval = itemRecords.find(
      r => r.approverRole === 'store_manager' && (r.action === 'approve' || r.action === 'reject')
    );
    const asstManagerApproval = itemRecords.find(
      r => r.approverRole === 'assistant_manager' && (r.action === 'approve' || r.action === 'reject')
    );
    const storeApproval = managerApproval || asstManagerApproval;

    if (storeApproval) {
      timeline.push({
        label: '店长初审',
        role: storeApproval.approverName,
        done: true,
        approved: storeApproval.result !== 'rejected',
        time: storeApproval.createdAt,
        comment: storeApproval.comment,
      });
    } else if (item.status === 'pending_store') {
      timeline.push({
        label: '店长初审',
        role: '门店店长',
        done: false,
      });
    } else if (item.status === 'rejected') {
      timeline.push({
        label: '店长初审',
        role: '门店店长',
        done: true,
        approved: false,
      });
    } else {
      timeline.push({
        label: '店长初审',
        role: '门店店长',
        done: true,
        approved: true,
      });
    }

    const hrApproval = itemRecords.find(
      r => r.approverRole === 'hr' && (r.action === 'approve' || r.action === 'reject')
    );
    if (hrApproval) {
      timeline.push({
        label: '人事复核',
        role: '总部人事',
        done: true,
        approved: hrApproval.result === 'approved',
        time: hrApproval.createdAt,
        comment: hrApproval.comment,
      });
    } else if (item.status === 'pending_hr') {
      timeline.push({
        label: '人事复核',
        role: '总部人事',
        done: false,
      });
    } else if (item.status === 'approved') {
      timeline.push({
        label: '人事复核',
        role: '总部人事',
        done: true,
        approved: true,
      });
    } else if (item.status === 'rejected') {
      const managerRejected = storeApproval?.result === 'rejected';
      if (!managerRejected) {
        timeline.push({
          label: '人事复核',
          role: '总部人事',
          done: true,
          approved: false,
        });
      }
    }

    extraSteps.forEach(step => {
      if (step.time) {
        const stepTime = new Date(step.time).getTime();
        let insertIdx = timeline.length;
        for (let i = 0; i < timeline.length; i++) {
          const tTime = timeline[i].time ? new Date(timeline[i].time).getTime() : 0;
          if (stepTime < tTime) {
            insertIdx = i;
            break;
          }
        }
        timeline.splice(insertIdx, 0, step);
      }
    });

    return timeline;
  };

  const getStoreLabel = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || storeId;
  };

  const renderTimelineIcon = (step: TimelineStep) => {
    if (step.action === 'urge') {
      return (
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-orange-100">
          <Bell size={12} className="text-orange-600" />
        </div>
      );
    }
    if (step.action === 'handoff') {
      return (
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-purple-100">
          <ArrowRightLeft size={12} className="text-purple-600" />
        </div>
      );
    }
    return (
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        step.done && step.approved && 'bg-emerald-100',
        step.done && step.approved === false && 'bg-red-100',
        !step.done && 'bg-gray-100',
      )}>
        <User size={12} className={cn(
          step.done && step.approved && 'text-emerald-600',
          step.done && step.approved === false && 'text-red-600',
          !step.done && 'text-gray-400',
        )} />
      </div>
    );
  };

  const renderTimelineBadge = (step: TimelineStep) => {
    if (step.action === 'urge') {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">已催办</span>;
    }
    if (step.action === 'handoff') {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">已转交</span>;
    }
    if (step.done) {
      return step.approved
        ? <CheckCircle size={16} className="text-emerald-500" />
        : <XCircle size={16} className="text-red-500" />;
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
          <h1 className="text-2xl font-bold text-gray-800">审批中心</h1>
          <p className="text-gray-500 text-sm mt-1">
            {currentStore?.name} · {currentRole === 'hr' ? '人事复核' : '店长初审'}
          </p>
        </div>
        {activeTab === 'pending' && someSelected && (
          <button
            onClick={handleBatchApprove}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <CheckSquare size={16} />
            批量通过（{selectedIds.size}）
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
                {pendingList.filter(item => canApprove(item.status, approverRole)).length}
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
                {approvedList.length}
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
                {rejectedList.length}
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
                {Math.round((approvedList.length /
                  ((approvedList.length + rejectedList.length) || 1)) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 -mx-4 px-4 -mt-4 pt-4">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key as ApprovalTab); setSelectedId(null); setApprovalComment(''); }}
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

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <button
                  onClick={() => { setStoreDropdownOpen(!storeDropdownOpen); setStageDropdownOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[140px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <StoreIcon size={14} className="text-gray-400" />
                    <span className="text-gray-700">
                      {storeFilter === 'all' ? '全部门店' : getStoreLabel(storeFilter)}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {storeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => { setStoreFilter('all'); setStoreDropdownOpen(false); }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors',
                        storeFilter === 'all' && 'bg-cyan-50 text-cyan-600 font-medium'
                      )}
                    >
                      全部门店
                    </button>
                    {stores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => { setStoreFilter(store.id); setStoreDropdownOpen(false); }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors',
                          storeFilter === store.id && 'bg-cyan-50 text-cyan-600 font-medium'
                        )}
                      >
                        {store.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {typeFilters.map(filter => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setTypeFilter(filter.key as ApprovalType)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all',
                        typeFilter === filter.key
                          ? 'bg-white text-cyan-600 font-medium shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      {Icon && <Icon size={14} />}
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'pending' && (
                <div className="relative">
                  <button
                    onClick={() => { setStageDropdownOpen(!stageDropdownOpen); setStoreDropdownOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[140px] justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-gray-400" />
                      <span className="text-gray-700">
                        {stageOptions.find(o => o.key === stageFilter)?.label || '全部环节'}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {stageDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {stageOptions.map(option => (
                        <button
                          key={option.key}
                          onClick={() => { setStageFilter(option.key); setStageDropdownOpen(false); }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors',
                            stageFilter === option.key && 'bg-cyan-50 text-cyan-600 font-medium'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeTab === 'pending' && selectableItems.length > 0 && (
              <div className="flex items-center gap-3 py-2 border-t border-gray-100 -mx-4 px-4 -mb-4">
                <button
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-600 transition-colors"
                >
                  {allSelected ? (
                    <CheckSquareFilled size={18} className="text-cyan-500" />
                  ) : (
                    <Square size={18} className="text-gray-300" />
                  )}
                  <span>全选可审批项</span>
                </button>
                <span className="text-xs text-gray-400">
                  共 {selectableItems.length} 项可审批
                </span>
              </div>
            )}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {approvalList.map(item => {
              const canHandle = canApprove(item.status, approverRole);
              const isSelected = selectedIds.has(item.id);
              const disabledReason = !canHandle ? getDisabledReason(item.status, currentRole) : '';
              const urgent = isUrgent(item);
              const showUrge = currentRole === 'hr' && urgent;
              const showHandoff = currentRole === 'store_manager' && canHandle && item.type !== 'exception';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                  }}
                  className={cn(
                    'p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50',
                    selectedId === item.id && 'bg-cyan-50/50 border-l-4 border-l-cyan-500',
                    isSelected && 'bg-blue-50/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {activeTab === 'pending' && canHandle && (
                      <div
                        className="mt-0.5 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(item.id);
                        }}
                      >
                        {isSelected ? (
                          <CheckSquareFilled size={18} className="text-cyan-500" />
                        ) : (
                          <Square size={18} className="text-gray-300" />
                        )}
                      </div>
                    )}
                    <img
                      src={item.applicantAvatar}
                      alt={item.applicant}
                      className="w-10 h-10 rounded-full object-cover mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-gray-800">{item.applicant}</span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          item.type === 'leave' && 'bg-blue-100 text-blue-600',
                          item.type === 'swap' && 'bg-violet-100 text-violet-600',
                          item.type === 'exception' && 'bg-amber-100 text-amber-600',
                        )}>
                          {item.type === 'leave' ? '请假' : item.type === 'swap' ? '调班' : '异常'}
                        </span>
                        {currentRole === 'hr' && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                            {getStoreLabel(item.storeId)}
                          </span>
                        )}
                        {item.reminderCount && item.reminderCount > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-orange-50 text-orange-600 rounded-full font-medium">
                            已催办{item.reminderCount}次
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">
                          提交时间：{item.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className={cn(
                          'inline-flex px-2.5 py-1 text-xs font-medium rounded-full',
                          getStatusColor(item.status)
                        )}>
                          {getStatusLabel(item.status)}
                        </span>
                        {showUrge && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUrge(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                          >
                            <Bell size={12} />
                            催办
                          </button>
                        )}
                        {showHandoff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenHandoff(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-sm"
                          >
                            <ArrowRightLeft size={12} />
                            转交
                          </button>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              );
            })}
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

        {selectedItem && (() => {
          const canHandleSelected = canApprove(selectedItem.status, approverRole);
          const disabledReasonSelected = !canHandleSelected ? getDisabledReason(selectedItem.status, currentRole) : '';

          return (
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
                    <span className="text-sm text-gray-500">门店</span>
                    <span className="text-sm font-medium text-gray-800">{getStoreLabel(selectedItem.storeId)}</span>
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

                {selectedItem.managerComment && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-800 mb-2">店长意见</p>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">{selectedItem.managerComment}</p>
                  </div>
                )}

                {selectedItem.hrComment && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-800 mb-2">人事意见</p>
                    <p className="text-sm text-gray-600 bg-violet-50 p-3 rounded-lg">{selectedItem.hrComment}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-800 mb-3">审批流程</p>
                  <div className="space-y-3">
                    {getApprovalTimeline(selectedItem).map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        {renderTimelineIcon(step)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">{step.label}</span>
                            {step.done && !step.action && (
                              <span className="text-xs text-gray-400">
                                {step.approved ? '已通过' : step.approved === false ? '已拒绝' : '已审批'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{step.role}</p>
                          {step.time && <p className="text-xs text-gray-400 mt-0.5">{step.time}</p>}
                          {step.comment && (
                            <p className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded">{step.comment}</p>
                          )}
                        </div>
                        {renderTimelineBadge(step)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {activeTab === 'pending' && (
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
                    {canHandleSelected ? (
                      <>
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
                      </>
                    ) : (
                      <Tooltip text={disabledReasonSelected}>
                        <div className="flex gap-3 w-full">
                          <button
                            disabled
                            className="flex-1 py-2.5 bg-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={16} />
                            通过
                          </button>
                          <button
                            disabled
                            className="flex-1 py-2.5 bg-gray-200 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-1"
                          >
                            <XCircle size={16} />
                            拒绝
                          </button>
                          <HelpCircle size={16} className="text-gray-400 self-center flex-shrink-0" />
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {handoffModalOpen && handoffItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[440px] max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-lg">转交审批</h3>
              <button
                onClick={() => {
                  setHandoffModalOpen(false);
                  setHandoffItem(null);
                  setHandoffTargetId('');
                  setHandoffReason('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={handoffItem.applicantAvatar}
                    alt={handoffItem.applicant}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{handoffItem.applicant}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{handoffItem.title} · {handoffItem.subtitle}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  转交对象 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {ASSISTANT_MANAGERS.map(am => (
                    <label
                      key={am.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        handoffTargetId === am.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        name="handoffTarget"
                        value={am.id}
                        checked={handoffTargetId === am.id}
                        onChange={() => setHandoffTargetId(am.id)}
                        className="sr-only"
                      />
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        handoffTargetId === am.id
                          ? 'border-purple-500'
                          : 'border-gray-300'
                      )}>
                        {handoffTargetId === am.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{am.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">同店副店长</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  转交原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={handoffReason}
                  onChange={e => setHandoffReason(e.target.value)}
                  rows={3}
                  placeholder="请输入转交原因"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => {
                  setHandoffModalOpen(false);
                  setHandoffItem(null);
                  setHandoffTargetId('');
                  setHandoffReason('');
                }}
                className="flex-1 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmHandoff}
                disabled={!handoffTargetId || !handoffReason.trim()}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors',
                  handoffTargetId && handoffReason.trim()
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <ArrowRightLeft size={16} />
                确认转交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
