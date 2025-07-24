import React, { useState } from 'react';
import { X, CheckSquare, User, Calendar, Clock, Activity, Droplets, Scale, FileText, Stethoscope } from 'lucide-react';
import PatientAutocomplete from './PatientAutocomplete';
import { usePatients, type PatientHealthTask, type HealthTaskType, type FrequencyUnit } from '../context/PatientContext';
import { calculateNextDueDate } from '../utils/taskScheduler';

interface TaskModalProps {
  task?: PatientHealthTask;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  const { patients, addPatientHealthTask, updatePatientHealthTask } = usePatients();

  // 香港時區輔助函數
  const getHongKongDate = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // GMT+8
    return hongKongTime.toISOString().split('T')[0];
  };

  const getHongKongTime = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // GMT+8
    return hongKongTime.toISOString().split('T')[1].slice(0, 5);
  };

  const [formData, setFormData] = useState({
    patient_id: task?.patient_id || '',
    frequency_unit: task?.frequency_unit || 'monthly' as FrequencyUnit,
    frequency_value: task?.frequency_value || 12,
    health_record_type: task?.health_record_type || '生命表徵' as HealthTaskType,
    frequency_unit: task?.frequency_unit || 'weekly' as FrequencyUnit,
    frequency_value: task?.frequency_value || 1,
    health_record_type: task?.health_record_type || '年度體檢' as HealthTaskType,
    health_record_type: task?.health_record_type || '約束物品同意書' as HealthTaskType,
    frequency_unit: task?.frequency_unit || 'monthly' as FrequencyUnit,
    frequency_value: task?.frequency_value || 6,
    specific_times: task?.specific_times || [],
    specific_days_of_week: task?.specific_days_of_week || [],
    specific_days_of_month: task?.specific_days_of_month || [],
    notes: task?.notes || '',
    last_completed_at: task?.last_completed_at || '',
    start_date: task ? (task.last_completed_at ? new Date(task.last_completed_at).toISOString().split('T')[0] : '') : getHongKongDate(),
    start_time: task ? (task.last_completed_at ? new Date(task.last_completed_at).toTimeString().slice(0, 5) : '') : getHongKongTime()
  });
  const [newTime, setNewTime] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addTime = () => {
    if (newTime && !formData.specific_times.includes(newTime)) {
      setFormData(prev => ({
        ...prev,
        specific_times: [...prev.specific_times, newTime].sort()
      }));
      setNewTime('');
    }
  };

  const removeTime = (timeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      specific_times: prev.specific_times.filter(time => time !== timeToRemove)
    }));
  };

  const handleDayOfWeekChange = (day: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      specific_days_of_week: checked
        ? [...prev.specific_days_of_week, day].sort()
        : prev.specific_days_of_week.filter(d => d !== day)
    }));
  };

  const handleDayOfMonthChange = (day: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      specific_days_of_month: checked
        ? [...prev.specific_days_of_month, day].sort()
        : prev.specific_days_of_month.filter(d => d !== day)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      alert('請選擇院友');
      return;
    }

    try {
      // 準備基準日期時間
      let baseDateTime: Date | undefined;
      let lastCompletedAt: string | null = null;
      
      if (formData.start_date && formData.start_time) {
        baseDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
        lastCompletedAt = baseDateTime.toISOString();
      } else if (task?.last_completed_at) {
        baseDateTime = new Date(task.last_completed_at);
        lastCompletedAt = task.last_completed_at;
      }
      
      // 計算下次到期時間
      const mockTask: PatientHealthTask = {
        id: '',
        patient_id: parseInt(formData.patient_id),
        health_record_type: formData.health_record_type,
        frequency_unit: formData.frequency_unit,
        frequency_value: formData.frequency_value,
        specific_times: formData.specific_times,
        specific_days_of_week: formData.specific_days_of_week,
        specific_days_of_month: formData.specific_days_of_month,
        last_completed_at: lastCompletedAt,
        next_due_at: '',
        created_at: '',
        updated_at: ''
      };

      const nextDueAt = calculateNextDueDate(mockTask, baseDateTime);
      const taskData = {
        patient_id: parseInt(formData.patient_id),
        health_record_type: formData.health_record_type,
        frequency_unit: formData.frequency_unit,
        frequency_value: formData.frequency_value,
        specific_times: formData.specific_times,
        specific_days_of_week: formData.specific_days_of_week,
        specific_days_of_month: formData.specific_days_of_month,
        last_completed_at: lastCompletedAt,
        next_due_at: nextDueAt.toISOString(),
        notes: formData.notes || null
      };

      if (task) {
        await updatePatientHealthTask({
          ...task,
          ...taskData
        });
      } else {
        await addPatientHealthTask(taskData);
      }
      
      onClose();
    } catch (error) {
      console.error('儲存任務失敗:', error);
      alert('儲存任務失敗，請重試');
    }
  };

  const getTypeIcon = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-5 w-5" />;
      case '血糖控制': return <Droplets className="h-5 w-5" />;
      case '體重控制': return <Scale className="h-5 w-5" />;
      case '約束物品同意書': return <FileText className="h-5 w-5" />;
      case '年度體檢': return <Stethoscope className="h-5 w-5" />;
      default: return <CheckSquare className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return 'text-blue-600';
      case '血糖控制': return 'text-red-600';
      case '體重控制': return 'text-green-600';
      case '約束物品同意書': return 'text-white-600';
      case '年度體檢': return 'text-yellow-600';
      default: return 'text-purple-600';
    }
  };

  const dayNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getTypeColor(formData.health_record_type)} bg-opacity-10`}>
                {getTypeIcon(formData.health_record_type)}
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
          {/* 基本設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                <User className="h-4 w-4 inline mr-1" />
                院友 *
              </label>
              <PatientAutocomplete
                value={formData.patient_id}
                onChange={(patientId) => setFormData(prev => ({ ...prev, patient_id: patientId }))}
                placeholder="搜索院友..."
              />
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
                <optgroup label="監測任務">
                  <option value="生命表徵">生命表徵</option>
                  <option value="血糖控制">血糖控制</option>
                  <option value="體重控制">體重控制</option>
                </optgroup>
                <optgroup label="文件任務">
                  <option value="約束物品同意書">約束物品同意書</option>
                  <option value="年度體檢">年度體檢</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* 文件任務的上次醫生簽署日期 */}
          {(formData.health_record_type === '約束物品同意書' || formData.health_record_type === '年度體檢') && (
            <div>
              <label className="form-label">
                <Calendar className="h-4 w-4 inline mr-1" />
                上次醫生簽署日期
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                設定上次醫生簽署此文件的日期，系統將根據此日期計算下次到期時間
              </p>
            </div>
          )}

          {/* 監測任務的開始日期和時間 */}
          {(formData.health_record_type === '生命表徵' || formData.health_record_type === '血糖控制' || formData.health_record_type === '體重控制') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  開始日期
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  設定任務開始執行的日期
                </p>
              </div>
              
              <div>
                <label className="form-label">
                  <Clock className="h-4 w-4 inline mr-1" />
                  開始時間
                </label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="form-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  設定任務開始執行的時間
                </p>
              </div>
            </div>
          )}
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
                  <option value="daily">每天</option>
                  <option value="weekly">每週</option>
                  <option value="monthly">每月</option>
                </select>
              </div>

              <div>
                <label className="form-label">頻率數值 *</label>
                <input
                  type="number"
                  name="frequency_value"
                  value={formData.frequency_value}
                  onChange={handleChange}
                  className="form-input"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  例如：每 {formData.frequency_value} {
                    formData.frequency_unit === 'hourly' ? '小時' :
                    formData.frequency_unit === 'daily' ? '天' :
                    formData.frequency_unit === 'weekly' ? '週' : '月'
                  }
                </p>
              </div>
            </div>

            {/* 特定時間設定 */}
            {(formData.frequency_unit === 'daily' || formData.frequency_unit === 'weekly' || formData.frequency_unit === 'monthly') && 
             (formData.health_record_type === '生命表徵' || formData.health_record_type === '血糖控制' || formData.health_record_type === '體重控制') && (
              <div>
                <label className="form-label">
                  <Clock className="h-4 w-4 inline mr-1" />
                  特定時間
                </label>
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
                      onClick={addTime}
                      className="btn-secondary"
                      disabled={!newTime || formData.specific_times.includes(newTime)}
                    >
                      新增
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.specific_times.map(time => (
                      <span
                        key={time}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {time}
                        <button
                          type="button"
                          onClick={() => removeTime(time)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {formData.specific_times.length === 0 && (
                      <span className="text-sm text-gray-500">尚未設定特定時間</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 特定星期幾設定 */}
            {formData.frequency_unit === 'weekly' && 
             (formData.health_record_type === '生命表徵' || formData.health_record_type === '血糖控制' || formData.health_record_type === '體重控制') && (
              <div>
                <label className="form-label">特定星期幾</label>
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((dayName, index) => {
                    const dayValue = index + 1; // 1=週一, 7=週日
                    return (
                      <label key={dayValue} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.specific_days_of_week.includes(dayValue)}
                          onChange={(e) => handleDayOfWeekChange(dayValue, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{dayName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 特定日期設定 */}
            {formData.frequency_unit === 'monthly' && 
             (formData.health_record_type === '生命表徵' || formData.health_record_type === '血糖控制' || formData.health_record_type === '體重控制') && (
              <div>
                <label className="form-label">特定日期</label>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.specific_days_of_month.includes(day)}
                        onChange={(e) => handleDayOfMonthChange(day, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day}號</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 備註 */}
          <div>
            <label className="form-label">備註</label>
            <select
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              className="form-input"
            >
              <option value="">請選擇備註</option>
              <option value="服藥前">服藥前</option>
              <option value="注射前">注射前</option>
              <option value="定期">定期</option>
              <option value="特別關顧">特別關顧</option>
              <option value="社康">社康</option>
            </select>
          </div>

          {/* 提交按鈕 */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {task ? '更新任務' : '建立任務'}
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