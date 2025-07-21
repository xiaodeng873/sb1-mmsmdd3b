```typescript
import React, { useState, useEffect } from 'react';
import { X, Heart, Activity, Droplets, Scale, User, Calendar, Clock } from 'lucide-react';
import { usePatients } from '../context/PatientContext';

interface HealthRecordModalProps {
  record?: any;
  onClose: () => void;
  onTaskCompleted?: () => void;
}

const HealthRecordModal: React.FC<HealthRecordModalProps> = ({ record, onClose, onTaskCompleted }) => {
  const { patients, addHealthRecord, updateHealthRecord, healthRecords } = usePatients();
  const [formData, setFormData] = useState({
    院友id: record?.院友id || '',
    記錄日期: record?.記錄日期 || new Date().toISOString().split('T')[0],
    記錄時間: record?.記錄時間 || new Date().toTimeString().slice(0, 5),
    記錄類型: record?.記錄類型 || '生命表徵',
    血壓收縮壓: record?.血壓收縮壓 || '',
    血壓舒張壓: record?.血壓舒張壓 || '',
    脈搏: record?.脈搏 || '',
    體溫: record?.體溫 || '',
    血含氧量: record?.血含氧量 || '',
    呼吸頻率: record?.呼吸頻率 || '',
    血糖值: record?.血糖值 || '',
    體重: record?.體重 || '',
    備註: record?.備註 || '',
    記錄人員: record?.記錄人員 || ''
  });

  const [weightChange, setWeightChange] = useState<string>('');

  useEffect(() => {
    if (formData.體重 && formData.院友id && formData.記錄類型 === '體重控制') {
      calculateWeightChange();
    }
  }, [formData.體重, formData.院友id, formData.記錄類型]);

  const calculateWeightChange = () => {
    if (!formData.體重 || !formData.院友id) {
      setWeightChange('');
      return;
    }

    const currentWeight = parseFloat(formData.體重);
    if (isNaN(currentWeight)) {
      setWeightChange('');
      return;
    }

    const patientWeightRecords = healthRecords
      .filter(r => 
        r.院友id === parseInt(formData.院友id) && 
        r.體重 && 
        (record ? r.記錄id !== record.記錄id : true)
      )
      .sort((a, b) => new Date(`${b.記錄日期} ${b.記錄時間}`).getTime() - new Date(`${a.記錄日期} ${a.記錄時間}`).getTime());
    
    if (patientWeightRecords.length === 0) {
      setWeightChange('首次記錄');
      return;
    }
    
    const lastWeight = parseFloat(patientWeightRecords[0].體重);
    const difference = currentWeight - lastWeight;
    const percentage = (difference / lastWeight) * 100;
    
    if (Math.abs(percentage) < 0.1) {
      setWeightChange('無變化');
      return;
    }
    
    const sign = difference > 0 ? '+' : '';
    setWeightChange(`${sign}${difference.toFixed(1)}kg (${sign}${percentage.toFixed(1)}%)`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.院友id || !formData.記錄日期 || !formData.記錄時間 || !formData.記錄類型) {
      alert('請填寫所有必填欄位');
      return;
    }

    if (formData.記錄類型 === '生命表徵') {
      if (!formData.血壓收縮壓 && !formData.血壓舒張壓 && !formData.脈搏 && !formData.體溫 && !formData.血含氧量 && !formData.呼吸頻率) {
        alert('生命表徵記錄至少需要填寫一項數值');
        return;
      }
    } else if (formData.記錄類型 === '血糖控制') {
      if (!formData.血糖值) {
        alert('血糖控制記錄需要填寫血糖值');
        return;
      }
    } else if (formData.記錄類型 === '體重控制') {
      if (!formData.體重) {
        alert('體重控制記錄需要填寫體重');
        return;
      }
    }

    try {
      const recordData = {
        院友id: parseInt(formData.院友id),
        記錄日期: formData.記錄日期,
        記錄時間: formData.記錄時間,
        記錄類型: formData.記錄類型 as '生命表徵' | '血糖控制' | '體重控制',
        血壓收縮壓: formData.血壓收縮壓 ? parseInt(formData.血壓收縮壓) : null,
        血壓舒張壓: formData.血壓舒張壓 ? parseInt(formData.血壓舒張壓) : null,
        脈搏: formData.脈搏 ? parseInt(formData.脈搏) : null,
        體溫: formData.體溫 ? parseFloat(formData.體溫) : null,
        血含氧量: formData.血含氧量 ? parseInt(formData.血含氧量) : null,
        呼吸頻率: formData.呼吸頻率 ? parseInt(formData.呼吸頻率) : null,
        血糖值: formData.血糖值 ? parseFloat(formData.血糖值) : null,
        體重: formData.體重 ? parseFloat(formData.體重) : null,
        備註: formData.備註 || null,
        記錄人員: formData.記錄人員 || null
      };

      if (record && record.記錄id) {
        await updateHealthRecord({ ...recordData, 記錄id: parseInt(record.記錄id) });
      } else {
        // For new records, omit 記錄id to let Supabase auto-generate it
        await addHealthRecord(recordData);
      }
      
      if (onTaskCompleted) onTaskCompleted();
      onClose();
    } catch (error) {
      console.error('儲存健康記錄失敗:', error);
      alert('儲存健康記錄失敗，請重試');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-5 w-5" />;
      case '血糖控制': return <Droplets className="h-5 w-5" />;
      case '體重控制': return <Scale className="h-5 w-5" />;
      default: return <Heart className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '生命表徵': return 'text-blue-600';
      case '血糖控制': return 'text-red-600';
      case '體重控制': return 'text-green-600';
      default: return 'text-purple-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getTypeColor(formData.記錄類型)} bg-opacity-10`}>
                {getTypeIcon(formData.記錄類型)}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {record ? '編輯健康記錄' : '新增健康記錄'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">
                <User className="h-4 w-4 inline mr-1" />
                院友 *
              </label>
              <select
                name="院友id"
                value={formData.院友id}
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
              <label className="form-label">
                <Calendar className="h-4 w-4 inline mr-1" />
                記錄日期 *
              </label>
              <input
                type="date"
                name="記錄日期"
                value={formData.記錄日期}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">
                <Clock className="h-4 w-4 inline mr-1" />
                記錄時間 *
              </label>
              <input
                type="time"
                name="記錄時間"
                value={formData.記錄時間}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">記錄類型 *</label>
              <select
                name="記錄類型"
                value={formData.記錄類型}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="生命表徵">生命表徵</option>
                <option value="血糖控制">血糖控制</option>
                <option value="體重控制">體重控制</option>
              </select>
            </div>
          </div>

          {formData.記錄類型 === '生命表徵' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-blue-600 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                生命表徵數據
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">血壓 (mmHg)</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        name="血壓收縮壓"
                        value={formData.血壓收縮壓}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="120"
                        min="0"
                        max="300"
                      />
                      <span className="flex items-center text-gray-500">/</span>
                      <input
                        type="number"
                        name="血壓舒張壓"
                        value={formData.血壓舒張壓}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="80"
                        min="0"
                        max="200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">脈搏 (每分鐘)</label>
                    <input
                      type="number"
                      name="脈搏"
                      value={formData.脈搏}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="60-100"
                      min="0"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="form-label">體溫 (°C)</label>
                    <input
                      type="number"
                      name="體溫"
                      value={formData.體溫}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="36.5"
                      min="30"
                      max="45"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">血含氧量 (%)</label>
                    <input
                      type="number"
                      name="血含氧量"
                      value={formData.血含氧量}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="95-100"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="form-label">呼吸頻率 (每分鐘)</label>
                    <input
                      type="number"
                      name="呼吸頻率"
                      value={formData.呼吸頻率}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="12-20"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="form-label">備註</label>
                    <textarea
                      name="備註"
                      value={formData.備註}
                      onChange={handleChange}
                      className="form-input"
                      rows={1}
                      placeholder="其他備註資訊..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {formData.記錄類型 === '血糖控制' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-red-600 flex items-center">
                <Droplets className="h-5 w-5 mr-2" />
                血糖控制數據
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">血糖值 (mmol/L) *</label>
                  <input
                    type="number"
                    name="血糖值"
                    value={formData.血糖值}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="4.0-7.0"
                    min="0"
                    max="50"
                    step="0.1"
                    required={formData.記錄類型 === '血糖控制'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    正常範圍：空腹 4.0-6.1，餐後 4.4-7.8
                  </p>
                </div>
              </div>
            </div>
          )}

          {formData.記錄類型 === '體重控制' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-green-600 flex items-center">
                <Scale className="h-5 w-5 mr-2" />
                體重控制數據
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">體重 (kg) *</label>
                  <input
                    type="number"
                    name="體重"
                    value={formData.體重}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="50.0"
                    min="0"
                    max="300"
                    step="0.1"
                    required={formData.記錄類型 === '體重控制'}
                  />
                </div>
                
                {weightChange && (
                  <div>
                    <label className="form-label">與上次比較</label>
                    <div className={`p-3 rounded-lg border ${
                      weightChange.startsWith('+') ? 'bg-red-50 border-red-200 text-red-800' :
                      weightChange.startsWith('-') ? 'bg-green-50 border-green-200 text-green-800' :
                      'bg-gray-50 border-gray-200 text-gray-800'
                    }`}>
                      <div className="font-medium">{weightChange}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {record ? '更新記錄' : '新增記錄'}
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

export default HealthRecordModal;
```

### Changes Made
1. **Removed `記錄id` for New Records**: In the `handleSubmit` function, the `recordData` object no longer includes `記錄id` when creating a new record (`addHealthRecord`). This allows Supabase to auto-generate the `記錄id` if the column is configured as a serial or identity column.
   ```typescript
   if (record && record.記錄id) {
     await updateHealthRecord({ ...recordData, 記錄id: parseInt(record.記錄id) });
   } else {
     await addHealthRecord(recordData); // Omit 記錄id for new records
   }
   ```
   Previously, the code included `...(record && { 記錄id: parseInt(record.記錄id) })` in `recordData`, which could result in `記錄id` being `undefined` or `null` for new records, causing the error.

2. **Kept Update Logic Intact**: For updating existing records, the `記錄id` is included in the `recordData` to ensure Supabase knows which record to update.

### Additional Considerations
- **Database Schema**: Verify that the `記錄id` column in your Supabase table (`健康記錄主表`) is set to auto-increment (e.g., `SERIAL` or `INTEGER GENERATED ALWAYS AS IDENTITY`). You can check this in the Supabase dashboard under Table Editor or by running the following SQL query in the SQL Editor:
  ```sql
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = '健康記錄主表' AND column_name = '記錄id';
  ```
  If `column_default` is something like `nextval('健康記錄主表_記錄id_seq'::regclass)`, the column is auto-incrementing, and you should not include `記錄id` when inserting new records.

- **Manual ID Generation (if needed)**: If `記錄id` is not auto-generated by the database, you need to generate a unique ID for new records. For example, you could query the maximum existing `記錄id` and increment it:
  ```typescript
  const getNextRecordId = async () => {
    const { data } = await supabase
      .from('健康記錄主表')
      .select('記錄id')
      .order('記錄id', { ascending: false })
      .limit(1);
    return data && data.length > 0 ? data[0].記錄id + 1 : 1;
  };
  ```
  Then, modify the `handleSubmit` function to include the generated ID for new records:
  ```typescript
  if (record && record.記錄id) {
    await updateHealthRecord({ ...recordData, 記錄id: parseInt(record.記錄id) });
  } else {
    const newRecordId = await getNextRecordId();
    await addHealthRecord({ ...recordData, 記錄id: newRecordId });
  }
  ```
  Note: This approach requires the `supabase` client to be available in your `PatientContext`. Replace `supabase` with the appropriate client instance from your context.

- **PatientContext Functions**: Ensure that `addHealthRecord` and `updateHealthRecord` in your `PatientContext` are correctly implemented to handle the Supabase API calls. For example:
  ```typescript
  // In PatientContext.tsx
  const addHealthRecord = async (data: any) => {
    const { error } = await supabase.from('健康記錄主表').insert([data]);
    if (error) throw error;
  };

  const updateHealthRecord = async (data: any) => {
    const { error } = await supabase
      .from('健康記錄主表')
      .update(data)
      .eq('記錄id', data.記錄id);
    if (error) throw error;
  };
  ```

- **Error Handling**: The current error handling logs the error and shows an alert. Consider adding more specific error messages to help diagnose issues:
  ```typescript
  catch (error: any) {
    console.error('儲存健康記錄失敗:', error);
    alert(`儲存健康記錄失敗: ${error.message || '請重試'}`);
  }
  ```

### Next Steps
1. **Check Supabase Schema**: Confirm whether `記錄id` is auto-incrementing. If it is, the provided code should work. If not, implement manual ID generation as described.
2. **Test the Component**: Test both creating and updating records to ensure the error is resolved.
3. **Inspect PatientContext**: Verify that `addHealthRecord` does not expect a `記錄id` in the payload for new records unless explicitly required by your schema.
4. **Debugging**: If the error persists, log the `recordData` object before calling `addHealthRecord` to confirm its contents:
   ```typescript
   console.log('Submitting recordData:', recordData);
   ```

If you confirm that `記錄id` is not auto-generated and need help implementing manual ID generation, or if you encounter other issues, please provide additional details about your Supabase schema or `PatientContext` implementation.