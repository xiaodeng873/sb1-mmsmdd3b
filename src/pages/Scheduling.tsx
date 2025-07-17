import React, { useState } from 'react';
import { Calendar, Plus, Edit3, Trash2, Download, Users, Eye, Settings, User } from 'lucide-react';
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

      {/* Schedule List */}
      <div className="grid grid-cols-1 gap-6">
        {schedules.length > 0 ? (
          schedules.map(schedule => (
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
        ) : (
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