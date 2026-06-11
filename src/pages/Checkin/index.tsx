import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Camera, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Eye,
  Download
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { stores } from '@/data/stores';
import { getCheckinRecordsByStore } from '@/data/checkins';
import { getEmployeesByStore } from '@/data/employees';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, getStatusColor, getStatusLabel } from '@/utils';

export default function Checkin() {
  const { currentStoreId } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  const currentStore = stores.find(s => s.id === currentStoreId);
  const employees = getEmployeesByStore(currentStoreId);
  let records = getCheckinRecordsByStore(currentStoreId, selectedDate);

  if (searchText) {
    records = records.filter(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      return emp?.name.includes(searchText);
    });
  }

  if (statusFilter !== 'all') {
    records = records.filter(r => r.status === statusFilter);
  }

  const abnormalCount = records.filter(r => r.isDistanceAbnormal || r.isPhotoAbnormal).length;

  const handleViewPhoto = (recordId: string) => {
    setSelectedRecord(selectedRecord === recordId ? null : recordId);
  };

  const handleRegisterAbsent = () => {
    alert('缺勤登记功能');
  };

  const handleExport = () => {
    alert('导出打卡记录');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">移动打卡记录</h1>
          <p className="text-gray-500 text-sm mt-1">{currentStore?.name} · 打卡核验</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRegisterAbsent}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <UserPlus size={16} />
            缺勤登记
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <Download size={16} />
            导出记录
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今日打卡</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{records.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">正常打卡</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {records.filter(r => r.status === 'normal').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">异常记录</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{abnormalCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待确认</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {records.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Eye size={24} className="text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索员工姓名..."
                className="w-64 h-9 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">全部状态</option>
                <option value="normal">正常</option>
                <option value="late">迟到</option>
                <option value="early_leave">早退</option>
                <option value="absent">缺勤</option>
                <option value="pending">待确认</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            共 {records.length} 条记录
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">员工</th>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">打卡照片</th>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">上班打卡</th>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">下班打卡</th>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">打卡地点</th>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">距离</th>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">状态</th>
                <th className="text-left text-sm font-medium text-gray-500 py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => {
                const emp = employees.find(e => e.id === record.employeeId);
                const isAbnormal = record.isDistanceAbnormal || record.isPhotoAbnormal;
                
                return (
                  <tr 
                    key={record.id} 
                    className={cn(
                      'border-t border-gray-100 hover:bg-gray-50 transition-colors',
                      isAbnormal && 'bg-red-50/30'
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={emp?.avatar} 
                          alt={emp?.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{emp?.name}</p>
                          <p className="text-xs text-gray-400">{emp?.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div 
                        className="relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => handleViewPhoto(record.id)}
                      >
                        <div className="w-full h-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                          <Camera size={20} className="text-cyan-500" />
                        </div>
                        {record.isPhotoAbnormal && (
                          <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <XCircle size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.checkInTime ? (
                        <div>
                          <span className={cn(
                            'text-sm font-medium',
                            record.status === 'late' ? 'text-amber-600' : 'text-gray-800'
                          )}>
                            {record.checkInTime}
                          </span>
                          {record.status === 'late' && (
                            <span className="text-xs text-amber-500 block">迟到</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {record.checkOutTime ? (
                        <div>
                          <span className={cn(
                            'text-sm font-medium',
                            record.status === 'early_leave' ? 'text-orange-600' : 'text-gray-800'
                          )}>
                            {record.checkOutTime}
                          </span>
                          {record.status === 'early_leave' && (
                            <span className="text-xs text-orange-500 block">早退</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">未打卡</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="max-w-[150px] truncate">{record.location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'text-sm font-medium',
                        record.isDistanceAbnormal ? 'text-red-600' : 'text-gray-700'
                      )}>
                        {record.distance}m
                      </span>
                      {record.isDistanceAbnormal && (
                        <div className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          距离异常
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'inline-flex px-2.5 py-1 text-xs font-medium rounded-full',
                        getStatusColor(record.status)
                      )}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewPhoto(record.id)}
                          className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors"
                          title="查看详情"
                        >
                          <Eye size={16} />
                        </button>
                        {isAbnormal && (
                          <button 
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="生成工单"
                          >
                            <AlertTriangle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Clock size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500">暂无打卡记录</p>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRecord(null)}>
          <div 
            className="bg-white rounded-2xl w-[500px] max-h-[90vh] overflow-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">打卡详情核验</h3>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>
            
            {(() => {
              const record = records.find(r => r.id === selectedRecord);
              const emp = employees.find(e => e.id === record?.employeeId);
              if (!record || !emp) return null;

              return (
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <img 
                      src={emp.avatar} 
                      alt={emp.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-800">{emp.name}</h4>
                      <p className="text-sm text-gray-500">{emp.position} · {currentStore?.name}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">打卡照片</p>
                    <div className="aspect-video bg-gradient-to-br from-cyan-50 to-blue-100 rounded-lg flex items-center justify-center">
                      <Camera size={48} className="text-cyan-300" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500">人脸核验</span>
                      <span className={cn(
                        'font-medium',
                        record.isPhotoAbnormal ? 'text-red-600' : 'text-emerald-600'
                      )}>
                        {record.isPhotoAbnormal ? '核验失败' : '核验通过'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">上班打卡</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {record.checkInTime || '--:--'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">下班打卡</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {record.checkOutTime || '--:--'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <MapPin size={14} />
                        打卡位置
                      </span>
                      <span className="text-gray-700 max-w-[200px] text-right truncate">
                        {record.location}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">距离门店</span>
                      <span className={cn(
                        'font-medium',
                        record.isDistanceAbnormal ? 'text-red-600' : 'text-gray-700'
                      )}>
                        {record.distance} 米
                        {record.isDistanceAbnormal && '（异常）'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">打卡状态</span>
                      <span className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-full',
                        getStatusColor(record.status)
                      )}>
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => {
                        alert('核验通过');
                        setSelectedRecord(null);
                      }}
                      className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                    >
                      核验通过
                    </button>
                    <button 
                      onClick={() => {
                        alert('已生成异常工单');
                        setSelectedRecord(null);
                      }}
                      className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                    >
                      生成工单
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
