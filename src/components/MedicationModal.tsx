import React, { useState } from 'react';
import { X, Pill } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { getMedicationTimeColorClass } from '../utils/medicationTimeColors';
import PatientAutocomplete from './PatientAutocomplete';

interface MedicationModalProps {
  prescription?: any;
  onClose: () => void;
}

const MedicationModal: React.FC<MedicationModalProps> = ({ prescription, onClose }) => {
  const { addPrescription, updatePrescription, patients } = usePatients();
  const [formData, setFormData] = useState({
    院友id: prescription?.院友id || '',
    藥物來源: prescription?.藥物來源 || '',
    處方日期: prescription?.處方日期 || getHongKongDate(),
    藥物名稱: prescription?.藥物名稱 || '',
    劑型: prescription?.劑型 || '',
    服用途徑: prescription?.服用途徑 || '',
    服用份量: prescription?.服用份量 || '',
    服用次數: prescription?.服用次數 || '',
    服用日數: prescription?.服用日數 || '',
    需要時: prescription?.需要時 || false,
    服用時間: prescription?.服用時間 ? (Array.isArray(prescription.服用時間) ? prescription.服用時間 : []) : []
  });
  const [selectedTime, setSelectedTime] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // 香港時區輔助函數
  const getHongKongDate = () => {
    const now = new Date();
    const hongKongTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // GMT+8
    return hongKongTime.toISOString().split('T')[0];
  };

  // Debug: 檢查初始資料
  console.log('Prescription data:', prescription);
  console.log('Initial 服用時間:', formData.服用時間);

  // 生成24小時制的所有半點時間選項
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        let displayHour = hour;
        let period = 'A';
        
        if (hour === 0) {
          displayHour = 12;
          period = 'A';
        } else if (hour === 12) {
          displayHour = 12;
          period = 'N';
        } else if (hour > 12) {
          displayHour = hour - 12;
          period = 'P';
        }
        
        const timeStr = minute === 0 
          ? `${displayHour}${period}`
          : `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
        
        times.push(timeStr);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();
  const filteredTimeOptions = timeOptions.filter(time =>
    time.toLowerCase().includes(timeInput.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addMedicationTime = () => {
    const timeToAdd = selectedTime || timeInput;
    if (timeToAdd && !formData.服用時間.includes(timeToAdd)) {
      setFormData(prev => ({
        ...prev,
        服用時間: [...prev.服用時間, timeToAdd].sort((a, b) => {
          // 簡單的時間排序邏輯
          const timeA = convertTimeToMinutes(a);
          const timeB = convertTimeToMinutes(b);
          return timeA - timeB;
        })
      }));
      setSelectedTime('');
      setTimeInput('');
      setShowTimeDropdown(false);
    }
  };

  const removeMedicationTime = (index: number) => {
    setFormData(prev => ({
      ...prev,
      服用時間: prev.服用時間.filter((_, i) => i !== index)
    }));
  };

  // 將時間字串轉換為分鐘數以便排序
  const convertTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([APN])$/);
    if (!match) return 0;
    
    let hour = parseInt(match[1]);
    const minute = parseInt(match[2] || '0');
    const period = match[3];
    
    if (period === 'A' && hour === 12) hour = 0;
    if (period === 'P' && hour !== 12) hour += 12;
    if (period === 'N') hour = 12;
    
    return hour * 60 + minute;
  };

  // 驗證服用時間數量與服用次數是否一致
  const validateMedicationTimes = () => {
    // 如果是「需要時」藥物，不需要驗證時間與次數的一致性
    if (formData.需要時) {
      return null;
    }
    
    const timesCount = formData.服用時間.length;
    const frequencyMatch = formData.服用次數.match(/(\d+)/);
    const expectedCount = frequencyMatch ? parseInt(frequencyMatch[1]) : 0;
    
    if (timesCount > 0 && expectedCount > 0 && timesCount !== expectedCount) {
      return `服用時間數量 (${timesCount}) 與服用次數 (${expectedCount}) 不符，建議檢查設定`;
    }
    return null;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const prescriptionData = {
        院友id: parseInt(formData.院友id),
        藥物來源: formData.藥物來源,
        處方日期: formData.處方日期,
        藥物名稱: formData.藥物名稱,
        劑型: formData.劑型,
        服用途徑: formData.服用途徑,
        服用份量: formData.服用份量,
        服用次數: formData.服用次數,
        服用日數: formData.服用日數,
        需要時: formData.需要時,
        服用時間: formData.服用時間
      };

      console.log('Saving prescription data:', prescriptionData);

      if (prescription) {
        await updatePrescription({
          處方id: prescription.處方id,
          ...prescriptionData
        });
      } else {
        await addPrescription(prescriptionData);
      }
      
      onClose();
    } catch (error) {
      console.error('儲存處方失敗:', error);
      alert('儲存處方失敗，請重試');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {prescription ? '編輯處方' : '新增處方'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">院友</label>
              <PatientAutocomplete
                value={formData.院友id}
                onChange={(patientId) => setFormData(prev => ({ ...prev, 院友id: patientId }))}
                placeholder="搜索院友..."
              />
            </div>

            <div>
              <label className="form-label">藥物來源</label>
              <input
                type="text"
                name="藥物來源"
                value={formData.藥物來源}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">藥物名稱</label>
            <input
              type="text"
              name="藥物名稱"
              value={formData.藥物名稱}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">處方日期</label>
              <input
                type="date"
                name="處方日期"
                value={formData.處方日期}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">服用時間</label>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      className="form-input"
                      placeholder="輸入時間 (例如: 8A, 12N, 6P)"
                      onFocus={() => setShowTimeDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTimeDropdown(false), 200)}
                    />
                    {showTimeDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredTimeOptions.map(time => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              setSelectedTime(time);
                              setTimeInput(time);
                              setShowTimeDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                          >
                            {time}
                          </button>
                        ))}
                        {filteredTimeOptions.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500">找不到符合的時間</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={addMedicationTime}
                    className="btn-secondary"
                    disabled={(!selectedTime && !timeInput) || formData.服用時間.includes(selectedTime || timeInput)}
                  >
                    新增
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.服用時間.map((time, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getMedicationTimeColorClass(time)}`}
                    >
                      {time}
                      <button
                        type="button"
                        onClick={() => removeMedicationTime(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {formData.服用時間.length === 0 && (
                    <span className="text-sm text-gray-500">尚未設定服用時間</span>
                  )}
                </div>
                
                {/* 驗證提示 */}
                {(() => {
                  const error = validateMedicationTimes();
                  return error && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                      <div className="flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>{error}</span>
                      </div>
                      <div className="text-xs text-orange-500 mt-1">
                        系統仍可儲存此處方，但建議檢查時間設定是否正確
                      </div>
                    </div>
                  );
                })()}
                
                {/* 需要時藥物的說明 */}
                {formData.需要時 && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    <div className="flex items-center space-x-1">
                      <span>ℹ️</span>
                      <span>此為「需要時」藥物，服用時間可由護理人員依院友需要決定</span>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">劑型</label>
              <input
                type="text"
                name="劑型"
                value={formData.劑型}
                onChange={handleChange}
                className="form-input"
                placeholder="如：片劑、膠囊、液體等"
              />
            </div>

            <div>
              <label className="form-label">服用途徑</label>
              <input
                list="route-options"
                name="服用途徑"
                value={formData.服用途徑}
                onChange={handleChange}
                className="form-input"
                placeholder="如：口服、外用等"
              />
              <datalist id="route-options">
                <option value="口服" />
                <option value="外用" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">服用份量</label>
              <input
                type="text"
                name="服用份量"
                value={formData.服用份量}
                onChange={handleChange}
                className="form-input"
                placeholder="如：1粒、5ml等"
              />
            </div>

            <div>
              <label className="form-label">服用次數</label>
              <input
                type="text"
                name="服用次數"
                value={formData.服用次數}
                onChange={handleChange}
                className="form-input"
                placeholder="如：每日3次、每8小時1次等"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">服用日數</label>
              <input
                type="text"
                name="服用日數"
                value={formData.服用日數}
                onChange={handleChange}
                className="form-input"
                placeholder="如：7天、14天"
              />
            </div>

            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="需要時"
                name="需要時"
                checked={formData.需要時}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="需要時" className="text-sm font-medium text-gray-700">
                需要時
              </label>
             </div>
          </div>


          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {prescription ? '更新處方' : '新增處方'}
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

export default MedicationModal;