import React, { useState } from 'react';
import { Calendar, Plus, Edit3, Trash2, Download, Users, Eye, Settings, User, Search, Filter, X } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { exportCombinedScheduleToExcel } from '../utils/combinedScheduleExcelGenerator';
import ScheduleModal from '../components/ScheduleModal';
import PatientSelectModal from '../components/PatientSelectModal';
import ScheduleDetailModal from '../components/ScheduleDetailModal';
import { getReasonBadgeClass, getReasonIcon } from '../utils/reasonColors';

const Scheduling: React.FC = () => {
  const { schedules, deleteSchedule, patients, loading } = usePatients();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }
  const handleEdit = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowScheduleModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('確定要刪除此排程嗎？')) {
      deleteSchedule(id);
    }
  };

  const handleAddPatients = (scheduleId: number) => {
    setSelectedScheduleId(scheduleId);
    setShowPatientModal(true);
  };

  const handleViewDetails = (schedule: any) => {
    setSelectedSchedule(schedule);
    setShowDetailModal(true);
  };

  const handleDownloadForm = (schedule: any) => {
    handleExportScheduleToExcel(schedule);
  };

  const handleExportScheduleToExcel = async (schedule: any) => {
    try {
      // 使用新的合併匯出功能
      await exportCombinedScheduleToExcel(schedule);

    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗，請重試');
    }
  };

  // 進階搜索邏輯
  const filteredSchedules = schedules.filter(schedule => {
    // 日期篩選
    if (dateFilter && schedule.到診日期 !== dateFilter) {
      return false;
    }

    // 搜索條件
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      // 搜索排程日期
      const dateMatch = new Date(schedule.到診日期).toLocaleDateString('zh-TW').includes(searchLower);
      
      // 搜索院友資料
      const patientMatch = schedule.院友列表.some((item: any) => {
        const patient = item.院友;
        return (
          patient?.中文姓名?.toLowerCase().includes(searchLower) ||
          patient?.床號?.toLowerCase().includes(searchLower) ||
          patient?.英文姓名?.toLowerCase().includes(searchLower) ||
          item.症狀說明?.toLowerCase().includes(searchLower) ||
          item.備註?.toLowerCase().includes(searchLower)
        );
      });
      
      // 搜索看診原因
      const reasonMatch = schedule.院友列表.some((item: any) => 
        item.看診原因?.some((reason: string) => 
          reason.toLowerCase().includes(searchLower)
        )
      );
      
      if (!dateMatch && !patientMatch && !reasonMatch) {
        return false;
      }
    }

    // 看診原因篩選
    if (reasonFilter) {
      const hasReason = schedule.院友列表.some((item: any) => 
        item.看診原因?.includes(reasonFilter)
      );
      if (!hasReason) {
        return false;
      }
    }

    return true;
  });

  // 獲取所有看診原因選項
  const getAllReasons = () => {
    const reasons = new Set<string>();
    schedules.forEach(schedule => {
      schedule.院友列表.forEach((item: any) => {
        item.看診原因?.forEach((reason: string) => {
          reasons.add(reason);
        });
      });
    });
    return Array.from(reasons).sort();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setReasonFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">排程管理</h1>
        <button
          onClick={() => {
            setSelectedSchedule(null);
            setShowScheduleModal(true);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>新增排程</span>
        </button>
      </div>

      {/* 搜索和篩選區域 */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索排程日期、院友姓名、床號、症狀說明或看診原因..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          
          <div className="flex space-x-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="form-input lg:w-40"
              title="按日期篩選"
            />
            
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`btn-secondary flex items-center space-x-2 ${showAdvancedFilters ? 'bg-blue-50 text-blue-700' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span>進階篩選</span>
            </button>
            
            {(searchTerm || dateFilter || reasonFilter) && (
              <button
                onClick={clearFilters}
                className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                <span>清除</span>
              </button>
            )}
          </div>
        </div>
        
        {/* 進階篩選面板 */}
        {showAdvancedFilters && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">看診原因</label>
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="form-input"
                >
                  <option value="">所有原因</option>
                  {getAllReasons().map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* 搜索結果統計 */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            顯示 {filteredSchedules.length} / {schedules.length} 個排程
            {filteredSchedules.reduce((sum, s) => sum + s.院友列表.length, 0) !== schedules.reduce((sum, s) => sum + s.院友列表.length, 0) && 
              ` (${filteredSchedules.reduce((sum, s) => sum + s.院友列表.length, 0)} / ${schedules.reduce((sum, s) => sum + s.院友列表.length, 0)} 位院友)`
            }
          </span>
          {(searchTerm || dateFilter || reasonFilter) && (
            <span className="text-blue-600">已套用篩選條件</span>
          )}
        </div>
      </div>

      {/* Schedule List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredSchedules.length > 0 ? (
          filteredSchedules.map(schedule => (
            <div key={schedule.排程id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {new Date(schedule.到診日期).toLocaleDateString('zh-TW', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {schedule.院友列表.length} 位院友預約
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(schedule)}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <Settings className="h-4 w-4" />
                    <span>管理院友</span>
                  </button>
                  <button
                    onClick={() => handleDownloadForm(schedule)}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>下載表格</span>
                  </button>
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="btn-secondary flex items-center space-x-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>編輯</span>
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.排程id)}
                    className="btn-danger flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>刪除</span>
                  </button>
                </div>
              </div>

              {/* Patient List */}
              <div className="space-y-3">
                {schedule.院友列表.map((item: any) => (
                  <div key={item.細項id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
                        {item.院友?.院友相片 ? (
                          <img 
                            src={item.院友.院友相片} 
                            alt={item.院友.中文姓名} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.院友?.床號} {item.院友?.中文姓名}</p>
                        <p className="text-sm text-gray-600">{item.院友?.英文姓名}</p>
                        <p className="text-xs text-gray-500">
                          {item.院友?.性別} | {item.院友?.身份證號碼} | {item.院友?.出生日期}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {item.看診原因.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-end">
                              {item.看診原因.map((reason: string, index: number) => (
                                <span key={index} className={getReasonBadgeClass(reason)}>
                                  <span className="mr-1">{getReasonIcon(reason)}</span>
                                  {reason}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">未設定原因</span>
                          )}
                        </p>
                        {item.症狀說明 && (
                          <p className="text-xs text-gray-600">{item.症狀說明}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暫無排程</h3>
            <p className="text-gray-600 mb-4">開始新增醫生到診排程</p>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="btn-primary"
            >
              新增排程
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">找不到符合條件的排程</h3>
            <p className="text-gray-600 mb-4">請嘗試調整搜索條件或篩選設定</p>
            <button
              onClick={clearFilters}
              className="btn-secondary"
            >
              清除所有篩選
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedSchedule(null);
          }}
        />
      )}

      {showDetailModal && selectedSchedule && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSchedule(null);
          }}
        />
      )}

      {showPatientModal && selectedScheduleId && (
        <PatientSelectModal
          scheduleId={selectedScheduleId}
          onClose={() => {
            setShowPatientModal(false);
            setSelectedScheduleId(null);
          }}
        />
      )}
    </div>
  );
};

export default Scheduling;