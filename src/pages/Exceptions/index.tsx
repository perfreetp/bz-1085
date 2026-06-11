import { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  User,
  Calendar,
  MessageSquare,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { stores } from '@/data/stores';
import { getEmployeesByStore, employees } from '@/data/employees';
import { format } from 'date-fns';
import { cn, getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel } from '@/utils';
import { exceptionTypeLabels } from '@/data/exceptions';
import type { TicketStatus, ExceptionType } from '@/types';

export default function Exceptions() {
  const { currentStoreId, exceptionTickets, resolveTicket, rejectTicket, createExceptionTicket } = useBusinessStore();
  const [activeTab, setActiveTab] = useState<TicketStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExceptionType | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    type: 'other' as ExceptionType,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  const currentStore = stores.find(s => s.id === currentStoreId);
  const storeEmployees = getEmployeesByStore(currentStoreId);

  let tickets = exceptionTickets.filter(t => t.storeId === currentStoreId);

  if (activeTab !== 'all') {
    tickets = tickets.filter(t => t.status === activeTab);
  }

  if (typeFilter !== 'all') {
    tickets = tickets.filter(t => t.type === typeFilter);
  }

  if (searchText) {
    tickets = tickets.filter(t => {
      const emp = storeEmployees.find(e => e.id === t.employeeId);
      return emp?.name.includes(searchText) || t.description.includes(searchText);
    });
  }

  const storeTickets = exceptionTickets.filter(t => t.storeId === currentStoreId);

  const tabs = [
    { key: 'all', label: '全部', count: tickets.length },
    { key: 'pending', label: '待处理', count: storeTickets.filter(t => t.status === 'pending').length },
    { key: 'processing', label: '处理中', count: storeTickets.filter(t => t.status === 'processing').length },
    { key: 'resolved', label: '已解决', count: storeTickets.filter(t => t.status === 'resolved').length },
    { key: 'rejected', label: '已驳回', count: storeTickets.filter(t => t.status === 'rejected').length },
  ];

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);
  const selectedEmployee = selectedTicketData
    ? storeEmployees.find(e => e.id === selectedTicketData.employeeId)
    : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleResolve = (ticketId: string) => {
    resolveTicket(ticketId);
    showToast('工单已通过');
    setSelectedTicket(null);
  };

  const handleReject = (ticketId: string) => {
    rejectTicket(ticketId);
    showToast('工单已驳回');
    setSelectedTicket(null);
  };

  const submitCreateTicket = () => {
    if (!createForm.employeeId || !createForm.description.trim()) {
      showToast('请填写完整的工单信息');
      return;
    }
    createExceptionTicket({
      employeeId: createForm.employeeId,
      storeId: currentStoreId,
      type: createForm.type,
      date: createForm.date,
      description: createForm.description,
      priority: createForm.priority,
    });
    setShowCreateModal(false);
    setCreateForm({
      employeeId: '',
      type: 'other',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      priority: 'medium',
    });
    showToast('异常工单已创建');
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
          <h1 className="text-2xl font-bold text-gray-800">异常工单</h1>
          <p className="text-gray-500 text-sm mt-1">{currentStore?.name} · 异常处理</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Filter size={16} />
            高级筛选
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <AlertTriangle size={16} />
            新建工单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-bold text-amber-600">
                {storeTickets.filter(t => t.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">处理中</p>
              <p className="text-2xl font-bold text-blue-600">
                {storeTickets.filter(t => t.status === 'processing').length}
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
              <p className="text-sm text-gray-500">已解决</p>
              <p className="text-2xl font-bold text-emerald-600">
                {storeTickets.filter(t => t.status === 'resolved').length}
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
              <p className="text-sm text-gray-500">高优先级</p>
              <p className="text-2xl font-bold text-red-600">
                {storeTickets.filter(t => t.priority === 'high').length}
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
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
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

            <div className="flex items-center gap-3 mt-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="搜索员工或描述..."
                  className="w-full h-9 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ExceptionType | 'all')}
                className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">全部类型</option>
                {Object.entries(exceptionTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {tickets.map(ticket => {
              const emp = storeEmployees.find(e => e.id === ticket.employeeId);
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className={cn(
                    'p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50',
                    selectedTicket === ticket.id && 'bg-cyan-50/50 border-l-4 border-l-cyan-500'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={emp?.avatar}
                      alt={emp?.name}
                      className="w-10 h-10 rounded-full object-cover mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{emp?.name}</span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          getPriorityColor(ticket.priority)
                        )}>
                          {getPriorityLabel(ticket.priority)}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                          {exceptionTypeLabels[ticket.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{ticket.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {ticket.date}
                        </span>
                        <span className={cn(
                          'flex items-center gap-1',
                          getStatusColor(ticket.status)
                        )}>
                          {getStatusLabel(ticket.status)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>

          {tickets.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500">暂无异常工单</p>
            </div>
          )}
        </div>

        {selectedTicketData && selectedEmployee && (
          <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">工单详情</h3>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[600px]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedEmployee.avatar}
                  alt={selectedEmployee.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-medium text-gray-800">{selectedEmployee.name}</h4>
                  <p className="text-sm text-gray-500">{selectedEmployee.position}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">异常类型</span>
                  <span className="text-sm font-medium text-gray-800">
                    {exceptionTypeLabels[selectedTicketData.type]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">异常日期</span>
                  <span className="text-sm font-medium text-gray-800">{selectedTicketData.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">优先级</span>
                  <span className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-full',
                    getPriorityColor(selectedTicketData.priority)
                  )}>
                    {getPriorityLabel(selectedTicketData.priority)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">当前状态</span>
                  <span className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-full',
                    getStatusColor(selectedTicketData.status)
                  )}>
                    {getStatusLabel(selectedTicketData.status)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-800 mb-2">异常描述</p>
                <p className="text-sm text-gray-600">{selectedTicketData.description}</p>
              </div>

              {selectedTicketData.appeal && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <MessageSquare size={14} />
                    员工申诉
                  </p>
                  <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg">
                    {selectedTicketData.appeal}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-800 mb-3">处理记录</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={12} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">系统自动</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(selectedTicketData.createdAt), 'MM-dd HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">检测到异常，自动生成工单</p>
                    </div>
                  </div>
                  {selectedTicketData.handler && (
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User size={12} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{selectedTicketData.handler}</span>
                          <span className="text-xs text-gray-400">今天 10:30</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {selectedTicketData.status === 'resolved' ? '已核实情况，作正常处理' : '正在核实中'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(selectedTicketData.status === 'pending' || selectedTicketData.status === 'processing') && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleResolve(selectedTicketData.id)}
                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle size={16} />
                    通过
                  </button>
                  <button
                    onClick={() => handleReject(selectedTicketData.id)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle size={16} />
                    驳回
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">异常类型分布</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ArrowUp size={14} className="text-red-500" />
            较上月上升 12%
          </div>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {Object.entries(exceptionTypeLabels).map(([key, label]) => {
            const count = storeTickets.filter(t => t.type === key).length;
            const total = storeTickets.length;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={key} className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
                <p className="text-xs text-gray-400 mt-1">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div
            className="bg-white rounded-2xl w-[480px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">新建异常工单</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择员工</label>
                <select
                  value={createForm.employeeId}
                  onChange={e => setCreateForm(f => ({ ...f, employeeId: e.target.value }))}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">请选择员工</option>
                  {storeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">异常类型</label>
                <select
                  value={createForm.type}
                  onChange={e => setCreateForm(f => ({ ...f, type: e.target.value as ExceptionType }))}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {Object.entries(exceptionTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">异常日期</label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={e => setCreateForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                <select
                  value={createForm.priority}
                  onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">异常描述</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="请输入异常描述..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={submitCreateTicket}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  创建工单
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
