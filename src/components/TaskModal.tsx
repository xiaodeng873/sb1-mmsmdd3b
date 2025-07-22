import React, { useState } from 'react';
import { X, CheckSquare, User, Calendar, Clock, Activity, Droplets, Scale, FileText, Stethoscope } from 'lucide-react';
import { usePatients, type PatientHealthTask, type HealthTaskType, type FrequencyUnit } from '../context/PatientContext';
import { calculateNextDueDate } from '../utils/taskScheduler';

interface TaskModalProps {
  task?: PatientHealthTask;
  onClose: () => void;
}

// 備註枚舉類型
type TaskRemark = "服藥前" | "注射前" | "定期" | "特別關顧";

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
    notes: task?.notes || '',
    remarks: (task?.notes && ["服藥前", "注射前", "定期", "特別關顧"].includes(task.notes)) ? task.notes as TaskRemark : "定期" as TaskRemark
  });

  const [newTime, setNewTime] = useState('');
  const [newDay, setNewDay] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const removeTime = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specific_times: prev.specific_times.filter((_, i) => i !== index)
    }));
  };

  const addDay = () => {
    const dayNum = parseInt(newDay);
    if (dayNum >= 1 && dayNum <= 7 && !formData.specific_days_of_week.includes(dayNum)) {
      setFormData(prev => ({
        ...prev,
        specific_days_of_week: [...prev.specific_days_of_week, dayNum].sort()
      }));
      setNewDay('');
    }
  };

  const removeDay = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specific_days_of_week: prev.specific_days_of_week.filter((_, i) => i !== index)
    }));
  };

  const addDate = () => {
    const dateNum = parseInt(newDate);
    if (dateNum >= 1 && dateNum <= 31 && !formData.specific_days_of_month.includes(dateNum)) {
      setFormData(prev => ({
        ...prev,
        specific_days_of_month: [...prev.specific_days_of_month, dateNum].sort()
      }));
      setNewDate('');
    }
  };

  const removeDate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specific_days_of_month: prev.specific_days_of_month.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      alert('請選擇院友');
      return;
    }

    try {
      // Calculate next due date
      const baseDate = new Date();
      const tempTask = {
        ...formData,
        id: '',
        created_at: '',
        updated_at: '',
        last_completed_at: null
      };
      
      const nextDueAt = calculateNextDueDate(tempTask, baseDate);
      
      const taskData = {
        patient_id: parseInt(formData.patient_id),
        health_record_type: formData.health_record_type,
        frequency_unit: formData.frequency_unit,
        frequency_value: formData.frequency_value,
        specific_times: formData.specific_times,
        specific_days_of_week: formData.specific_days_of_week,
        specific_days_of_month: formData.specific_days_of_month,
        next_due_at: nextDueAt.toISOString(),
        notes: formData.remarks, // 使用備註作為 notes
        last_completed_at: task?.last_completed_at || null
      };

      if (task) {
        await updatePatientHealthTask({
          ...taskData,
          id: task.id,
          created_at: task.created_at,
          updated_at: task.updated_at
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

  const getTypeIcon = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      case '約束物品同意書': return <FileText className="h-4 w-4" />;
      case '年度體檢': return <Stethoscope className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return 'text-blue-600';
      case '血糖控制': return 'text-red-600';
      case '體重控制': return 'text-green-600';
      case '約束物品同意書': return 'text-orange-600';
      case '年度體檢': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getDayName = (day: number) => {
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return days[day === 7 ? 0 : day];
  };

  const isDocumentTask = (taskType: HealthTaskType) => {
    return taskType === '約束物品同意書' || taskType === '年度體檢';
  };

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

          {/* 備註 */}
          <div>
            <label className="form-label">備註 *</label>
            <select
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="定期">定期</option>
              <option value="服藥前">服藥前</option>
              <option value="注射前">注射前</option>
              <option value="特別關顧">特別關顧</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              此備註將顯示在今日任務的監測任務項目右上角
            </p>
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
              </div>
            </div>

            {/* 特定時間設定（僅監測任務） */}
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
                      onClick={addTime}
                      className="btn-secondary"
                      disabled={!newTime || formData.specific_times.includes(newTime)}
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
                          onClick={() => removeTime(index)}
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

            {/* 特定星期設定（僅週頻率且監測任務） */}
            {formData.frequency_unit === 'weekly' && !isDocumentTask(formData.health_record_type) && (
              <div>
                <label className="form-label">特定星期</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value)}
                      className="form-input flex-1"
                    >
                      <option value="">選擇星期</option>
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
                      onClick={addDay}
                      className="btn-secondary"
                      disabled={!newDay || formData.specific_days_of_week.includes(parseInt(newDay))}
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
                        {getDayName(day)}
                        <button
                          type="button"
                          onClick={() => removeDay(index)}
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

            {/* 特定日期設定（僅月頻率且監測任務） */}
            {formData.frequency_unit === 'monthly' && !isDocumentTask(formData.health_record_type) && (
              <div>
                <label className="form-label">特定日期</label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="form-input flex-1"
                      min="1"
                      max="31"
                      placeholder="1-31"
                    />
                    <button
                      type="button"
                      onClick={addDate}
                      className="btn-secondary"
                      disabled={!newDate || formData.specific_days_of_month.includes(parseInt(newDate))}
                    >
                      新增
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.specific_days_of_month.map((date, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                      >
                        {date}號
                        <button
                          type="button"
                          onClick={() => removeDate(index)}
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