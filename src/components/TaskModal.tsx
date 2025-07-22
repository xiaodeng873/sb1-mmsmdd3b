import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Clock, User, Activity, Droplets, Scale, FileText, Stethoscope } from 'lucide-react';
import { usePatients, type PatientHealthTask, type HealthTaskType, type FrequencyUnit } from '../context/PatientContext';

interface TaskModalProps {
  task?: PatientHealthTask;
  onClose: () => void;
}

// 備註選項枚舉
const TASK_NOTES_OPTIONS = [
  { value: '服藥前', label: '服藥前' },
  { value: '注射前', label: '注射前' },
  { value: '定期', label: '定期' },
  { value: '特別關顧', label: '特別關顧' }
];

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  const { patients, addPatientHealthTask, updatePatientHealthTask } = usePatients();
  const [formData, setFormData] = useState({
    patient_id: task?.patient_id || '',
    health_record_type: task?.health_record_type || '生命表徵' as HealthTaskType,
    frequency_unit: task?.frequency_unit || 'daily' as FrequencyUnit,
    frequency_value: task?.frequency_value || 1,
    specific_times: task?.specific_times || [],
    specific_days_of_week: task?.specific_days_of_week || [],
    specific_days_of_month: task?.specific_days_of_month || [],
    next_due_at: task?.next_due_at || new Date().toISOString(),
    notes: task?.notes || ''
  });

  const [newTime, setNewTime] = useState('');
  const [newDayOfWeek, setNewDayOfWeek] = useState('');
  const [newDayOfMonth, setNewDayOfMonth] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addSpecificTime = () => {
    if (newTime && !formData.specific_times.includes(newTime)) {
      setFormData(prev => ({
        ...prev,
        specific_times: [...prev.specific_times, newTime].sort()
      }));
      setNewTime('');
    }
  };

  const removeSpecificTime = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specific_times: prev.specific_times.filter((_, i) => i !== index)
    }));
  };

  const addDayOfWeek = () => {
    const day = parseInt(newDayOfWeek);
    if (newDayOfWeek && !formData.specific_days_of_week.includes(day)) {
      setFormData(prev => ({
        ...prev,
        specific_days_of_week: [...prev.specific_days_of_week, day].sort()
      }));
      setNewDayOfWeek('');
    }
  };

  const removeDayOfWeek = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specific_days_of_week: prev.specific_days_of_week.filter((_, i) => i !== index)
    }));
  };

  const addDayOfMonth = () => {
    const day = parseInt(newDayOfMonth);
    if (newDayOfMonth && day >= 1 && day <= 31 && !formData.specific_days_of_month.includes(day)) {
      setFormData(prev => ({
        ...prev,
        specific_days_of_month: [...prev.specific_days_of_month, day].sort()
      }));
      setNewDayOfMonth('');
    }
  };

  const removeDayOfMonth = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specific_days_of_month: prev.specific_days_of_month.filter((_, i) => i !== index)
    }));
  };

  const calculateNextDueDate = () => {
    const now = new Date();
    const nextDue = new Date(now);

    switch (formData.frequency_unit) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + formData.frequency_value);
        if (formData.specific_times.length > 0) {
          const time = parseTimeString(formData.specific_times[0]);
          nextDue.setHours(time.hours, time.minutes, 0, 0);
        } else {
          nextDue.setHours(8, 0, 0, 0);
        }
        break;

      case 'weekly':
        if (formData.specific_days_of_week.length > 0) {
          const targetDay = formData.specific_days_of_week[0];
          const adjustedTargetDay = targetDay === 7 ? 0 : targetDay;
          const currentDay = nextDue.getDay();
          let dayDiff = adjustedTargetDay - currentDay;
          
          if (dayDiff <= 0) {
            dayDiff += 7;
          }
          
          nextDue.setDate(nextDue.getDate() + dayDiff + (formData.frequency_value - 1) * 7);
        } else {
          nextDue.setDate(nextDue.getDate() + formData.frequency_value * 7);
        }
        
        if (formData.specific_times.length > 0) {
          const time = parseTimeString(formData.specific_times[0]);
          nextDue.setHours(time.hours, time.minutes, 0, 0);
        } else {
          nextDue.setHours(8, 0, 0, 0);
        }
        break;

      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + formData.frequency_value);
        
        if (formData.specific_days_of_month.length > 0) {
          const targetDay = Math.min(formData.specific_days_of_month[0], new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate());
          nextDue.setDate(targetDay);
        }
        
        if (formData.specific_times.length > 0) {
          const time = parseTimeString(formData.specific_times[0]);
          nextDue.setHours(time.hours, time.minutes, 0, 0);
        } else {
          nextDue.setHours(8, 0, 0, 0);
        }
        break;
    }

    return nextDue.toISOString();
  };

  const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return {
        hours: parseInt(match[1]),
        minutes: parseInt(match[2])
      };
    }
    return { hours: 8, minutes: 0 };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id || !formData.health_record_type) {
      alert('請填寫所有必填欄位');
      return;
    }

    try {
      const taskData = {
        ...formData,
        patient_id: parseInt(formData.patient_id),
        next_due_at: task ? formData.next_due_at : calculateNextDueDate()
      };

      if (task) {
        await updatePatientHealthTask({
          ...taskData,
          id: task.id,
          created_at: task.created_at,
          updated_at: task.updated_at,
          last_completed_at: task.last_completed_at
        });
      } else {
        await addPatientHealthTask(taskData);
      }
      
      onClose();
    } catch (error) {
      console.error('儲存健康任務失敗:', error);
      alert('儲存健康任務失敗，請重試');
    }
  };

  const getTaskTypeIcon = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-5 w-5" />;
      case '血糖控制': return <Droplets className="h-5 w-5" />;
      case '體重控制': return <Scale className="h-5 w-5" />;
      case '約束物品同意書': return <FileText className="h-5 w-5" />;
      case '年度體檢': return <Stethoscope className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getTaskTypeColor = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return 'text-blue-600';
      case '血糖控制': return 'text-red-600';
      case '體重控制': return 'text-green-600';
      case '約束物品同意書': return 'text-orange-600';
      case '年度體檢': return 'text-purple-600';
      default: return 'text-blue-600';
    }
  };

  const isDocumentTask = (type: HealthTaskType) => {
    return type === '約束物品同意書' || type === '年度體檢';
  };

  const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六', '週日'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getTaskTypeColor(formData.health_record_type)} bg-opacity-10`}>
                {getTaskTypeIcon(formData.health_record_type)}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {task ? '編輯健康任務' : '新增健康任務'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                <User className="h-4 w-4 inline mr-1" />
                院友 *
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="">請選擇院友</option>
                {patients.map(patient => (
                  <option key={patient.院友id} value={patient.院友id}>
                    {patient.床號} - {patient.中文姓名}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">任務類型 *</label>
              <select
                name="health_record_type"
                value={formData.health_record_type}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="生命表徵">生命表徵</option>
                <option value="血糖控制">血糖控制</option>
                <option value="體重控制">體重控制</option>
                <option value="約束物品同意書">約束物品同意書</option>
                <option value="年度體檢">年度體檢</option>
              </select>
            </div>
          </div>

          {/* 頻率設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">頻率設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">頻率單位 *</label>
                <select
                  name="frequency_unit"
                  value={formData.frequency_unit}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="daily">每日</option>
                  <option value="weekly">每週</option>
                  <option value="monthly">每月</option>
                </select>
              </div>

              <div>
                <label className="form-label">頻率值 *</label>
                <input
                  type="number"
                  name="frequency_value"
                  value={formData.frequency_value}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* 特定時間設定 */}
            {!isDocumentTask(formData.health_record_type) && (
              <div>
                <label className="form-label">特定時間</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="form-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={addSpecificTime}
                      className="btn-secondary"
                      disabled={!newTime}
                    >
                      新增
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.specific_times.map((time, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {time}
                        <button
                          type="button"
                          onClick={() => removeSpecificTime(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 特定星期設定 */}
            {formData.frequency_unit === 'weekly' && !isDocumentTask(formData.health_record_type) && (
              <div>
                <label className="form-label">特定星期</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <select
                      value={newDayOfWeek}
                      onChange={(e) => setNewDayOfWeek(e.target.value)}
                      className="form-input flex-1"
                    >
                      <option value="">請選擇星期</option>
                      <option value="1">週一</option>
                      <option value="2">週二</option>
                      <option value="3">週三</option>
                      <option value="4">週四</option>
                      <option value="5">週五</option>
                      <option value="6">週六</option>
                      <option value="7">週日</option>
                    </select>
                    <button
                      type="button"
                      onClick={addDayOfWeek}
                      className="btn-secondary"
                      disabled={!newDayOfWeek}
                    >
                      新增
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.specific_days_of_week.map((day, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {dayNames[day === 7 ? 0 : day]}
                        <button
                          type="button"
                          onClick={() => removeDayOfWeek(index)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 特定日期設定 */}
            {formData.frequency_unit === 'monthly' && !isDocumentTask(formData.health_record_type) && (
              <div>
                <label className="form-label">特定日期</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newDayOfMonth}
                      onChange={(e) => setNewDayOfMonth(e.target.value)}
                      className="form-input flex-1"
                      min="1"
                      max="31"
                      placeholder="1-31"
                    />
                    <button
                      type="button"
                      onClick={addDayOfMonth}
                      className="btn-secondary"
                      disabled={!newDayOfMonth}
                    >
                      新增
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.specific_days_of_month.map((day, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                      >
                        {day}號
                        <button
                          type="button"
                          onClick={() => removeDayOfMonth(index)}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 下次到期時間 */}
          {task && (
            <div>
              <label className="form-label">
                <Calendar className="h-4 w-4 inline mr-1" />
                下次到期時間
              </label>
              <input
                type="datetime-local"
                name="next_due_at"
                value={formData.next_due_at.slice(0, 16)}
                onChange={(e) => setFormData(prev => ({ ...prev, next_due_at: e.target.value + ':00.000Z' }))}
                className="form-input"
              />
            </div>
          )}

          {/* 備註 */}
          <div>
            <label className="form-label">備註</label>
            <select
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">請選擇備註</option>
              {TASK_NOTES_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 提交按鈕 */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {task ? '更新任務' : '新增任務'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;