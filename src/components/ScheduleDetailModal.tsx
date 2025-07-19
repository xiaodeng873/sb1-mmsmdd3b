import React, { useState } from 'react';
import { X, Users, Edit3, Trash2, Plus, Search, Calendar, User } from 'lucide-react';
import { usePatients, type ScheduleWithDetails } from '../context/PatientContext';
import { getReasonBadgeClass, getReasonIcon } from '../utils/reasonColors';

interface ScheduleDetailModalProps {
  schedule: ScheduleWithDetails;
  onClose: () => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ schedule, onClose }) => {
  const { patients, serviceReasons, addPatientToSchedule, updateScheduleDetail, deleteScheduleDetail, schedules } = usePatients();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddPatients, setShowAddPatients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatients, setSelectedPatients] = useState<{[key: number]: any}>({});

  // 獲取最新的排程資料
  const currentSchedule = schedules.find(s => s.排程id === schedule.排程id) || schedule;
  const existingPatientIds = currentSchedule.院友列表.map((p: any) => p.院友id);

  const filteredAvailablePatients = patients
    .filter(p => !existingPatientIds.includes(p.院友id))
    .filter(patient => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        patient.中文姓名.toLowerCase().includes(searchLower) ||
        patient.床號.toLowerCase().includes(searchLower) ||
        (patient.英文姓名?.toLowerCase().includes(searchLower) || false) ||
        patient.身份證號碼.toLowerCase().includes(searchLower)
      );
    });

  const handleEditItem = (item: any) => {
    setEditingItem({
      ...item,
      看診原因: [...item.看診原因] // 複製陣列
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    updateScheduleDetail(editingItem);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm('確定要從此排程中移除此院友嗎？')) {
      deleteScheduleDetail(itemId);
    }
  };

  const handleReasonChange = (reasons: string[]) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        看診原因: reasons
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (editingItem) {
      setEditingItem({
        ...editingItem,
        [field]: value
      });
    }
  };

  const handlePatientSelect = (patient: any) => {
    const isSelected = selectedPatients[patient.院友id];
    
    if (isSelected) {
      const { [patient.院友id]: _, ...rest } = selectedPatients;
      setSelectedPatients(rest);
    } else {
      setSelectedPatients(prev => ({
        ...prev,
        [patient.院友id]: {
          院友id: patient.院友id,
          院友: patient,
          症狀說明: '',
          備註: '',
          看診原因: []
        }
      }));
    }
  };

  const handleAddSelectedPatients = async () => {
    if (Object.keys(selectedPatients).length === 0) return;

    try {
      // Add each selected patient to the schedule
      for (const patient of Object.values(selectedPatients)) {
        await addPatientToSchedule(
          currentSchedule.排程id,
          (patient as any).院友id,
          (patient as any).症狀說明,
          (patient as any).備註,
          (patient as any).看診原因
        );
      }
    } catch (error) {
      console.error('Error adding patients to schedule:', error);
      alert('新增院友失敗，請重試');
      return;
    }

    setSelectedPatients({});
    setShowAddPatients(false);
    setSearchTerm('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">排程詳情</h2>
                <p className="text-sm text-gray-600">
                  {new Date(currentSchedule.到診日期).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Add Patients Section */}
          {!showAddPatients ? (
            <div className="mb-6">
              <button
                onClick={() => setShowAddPatients(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>新增院友到此排程</span>
              </button>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">新增院友</h3>
                <button
                  onClick={() => {
                    setShowAddPatients(false);
                    setSelectedPatients({});
                    setSearchTerm('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索院友姓名、床號、英文姓名或身份證號碼..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10 w-full"
                  />
                </div>
              </div>

              {/* Available Patients */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredAvailablePatients.length > 0 ? (
                  filteredAvailablePatients.map(patient => (
                    <div
                      key={patient.院友id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedPatients[patient.院友id] ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => handlePatientSelect(patient)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
                            {patient.院友相片 ? (
                              <img 
                                src={patient.院友相片} 
                                alt={patient.中文姓名} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{patient.床號} - {patient.中文姓名}</p>
                            <p className="text-sm text-gray-600">{patient.英文姓名}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!selectedPatients[patient.院友id]}
                          onChange={() => handlePatientSelect(patient)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      {selectedPatients[patient.院友id] && (
                        <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">看診原因</label>
                            <div className="flex flex-wrap gap-2">
                              {serviceReasons.map(reason => (
                                <label key={reason.原因id} className="flex items-center space-x-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedPatients[patient.院友id].看診原因.includes(reason.原因名稱)}
                                    onChange={(e) => {
                                      const currentReasons = selectedPatients[patient.院友id].看診原因;
                                      const newReasons = e.target.checked
                                        ? [...currentReasons, reason.原因名稱]
                                        : currentReasons.filter((r: string) => r !== reason.原因名稱);
                                      setSelectedPatients(prev => ({
                                        ...prev,
                                        [patient.院友id]: {
                                          ...prev[patient.院友id],
                                          看診原因: newReasons
                                        }
                                      }));
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">{reason.原因名稱}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 只有勾選申訴不適時才顯示症狀說明 */}
                          {selectedPatients[patient.院友id].看診原因.includes('申訴不適') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">症狀說明</label>
                              <textarea
                                value={selectedPatients[patient.院友id].症狀說明}
                                onChange={(e) => setSelectedPatients(prev => ({
                                  ...prev,
                                  [patient.院友id]: {
                                    ...prev[patient.院友id],
                                    症狀說明: e.target.value
                                  }
                                }))}
                                className="form-input text-sm"
                                rows={2}
                                placeholder="請描述症狀..."
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">備註</label>
                            <textarea
                              value={selectedPatients[patient.院友id].備註}
                              onChange={(e) => setSelectedPatients(prev => ({
                                ...prev,
                                [patient.院友id]: {
                                  ...prev[patient.院友id],
                                  備註: e.target.value
                                }
                              }))}
                              className="form-input text-sm"
                              rows={2}
                              placeholder="其他備註..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      {searchTerm ? '找不到符合條件的院友' : '所有院友都已加入此排程'}
                    </p>
                  </div>
                )}
              </div>

              {Object.keys(selectedPatients).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleAddSelectedPatients}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>新增 {Object.keys(selectedPatients).length} 位院友</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Current Patients List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              預約院友 ({currentSchedule.院友列表.length})
            </h3>

            {currentSchedule.院友列表.length > 0 ? (
              currentSchedule.院友列表.map((item: any) => (
                <div key={item.細項id} className="border rounded-lg p-4">
                  <div 
                    className="cursor-pointer" 
                    onDoubleClick={() => handleEditItem(item)}
                  >
                    {editingItem && editingItem.細項id === item.細項id ? (
                      /* Edit Mode */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
                              {item.院友.院友相片 ? (
                                <img 
                                  src={item.院友.院友相片} 
                                  alt={item.院友.中文姓名} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{item.院友.床號} - {item.院友.中文姓名}</p>
                              <p className="text-sm text-gray-600">{item.院友.英文姓名}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="btn-primary text-sm"
                            >
                              儲存
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className="btn-secondary text-sm"
                            >
                              取消
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="form-label">看診原因</label>
                            <div className="flex flex-wrap gap-2">
                              {serviceReasons.map(reason => (
                                <label key={reason.原因id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={editingItem.看診原因.includes(reason.原因名稱)}
                                    onChange={(e) => {
                                      const newReasons = e.target.checked
                                        ? [...editingItem.看診原因, reason.原因名稱]
                                        : editingItem.看診原因.filter((r: string) => r !== reason.原因名稱);
                                      handleReasonChange(newReasons);
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">{reason.原因名稱}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 只有勾選申訴不適時才顯示症狀說明 */}
                          {editingItem.看診原因.includes('申訴不適') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="form-label">症狀說明</label>
                                <textarea
                                  value={editingItem.症狀說明 || ''}
                                  onChange={(e) => handleFieldChange('症狀說明', e.target.value)}
                                  className="form-input text-sm"
                                  rows={2}
                                  placeholder="請描述症狀..."
                                />
                              </div>
                              <div>
                                <label className="form-label">備註</label>
                                <textarea
                                  value={editingItem.備註 || ''}
                                  onChange={(e) => handleFieldChange('備註', e.target.value)}
                                  className="form-input text-sm"
                                  rows={2}
                                  placeholder="其他備註..."
                                />
                              </div>
                            </div>
                          )}

                          {/* 如果沒有勾選申訴不適，備註獨立顯示 */}
                          {!editingItem.看診原因.includes('申訴不適') && (
                            <div>
                              <label className="form-label">備註</label>
                              <textarea
                                value={editingItem.備註 || ''}
                                onChange={(e) => handleFieldChange('備註', e.target.value)}
                                className="form-input text-sm"
                                rows={2}
                                placeholder="其他備註..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-center justify-between">
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
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.院友?.床號} - {item.院友?.中文姓名}</p>
                            <p className="text-sm text-gray-600">{item.院友?.英文姓名}</p>
                            <p className="text-xs text-gray-500">
                              {item.院友?.性別} | {item.院友?.身份證號碼}
                            </p>
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.看診原因.map((reason: string, index: number) => (
                                <span key={index} className={getReasonBadgeClass(reason)}>
                                  <span className="mr-1">{getReasonIcon(reason)}</span>
                                  {reason}
                                </span>
                              ))}
                              {item.看診原因.length === 0 && (
                                <span className="reason-badge reason-default">
                                  <span className="mr-1">❓</span>
                                  未設定原因
                                </span>
                              )}
                            </div>
                            {item.症狀說明 && (
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>症狀：</strong>{item.症狀說明}
                              </p>
                            )}
                            {item.備註 && (
                              <p className="text-sm text-gray-600">
                                <strong>備註：</strong>{item.備註}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="編輯"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.細項id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="移除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">此排程尚無院友</h3>
                <p className="text-gray-600 mb-4">點擊上方按鈕新增院友到此排程</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailModal;