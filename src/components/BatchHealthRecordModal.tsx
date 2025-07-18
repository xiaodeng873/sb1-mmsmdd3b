import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Heart, Activity, Droplets, Scale, User, Calendar, Clock } from 'lucide-react';
import { usePatients } from '../context/PatientContext';

interface BatchHealthRecordModalProps {
  onClose: () => void;
  recordType: '生命表徵' | '血糖控制' | '體重控制';
}

interface BatchRecord {
  id: string;
  院友id: string;
  記錄日期: string;
  記錄時間: string;
  血壓收縮壓?: string;
  血壓舒張壓?: string;
  脈搏?: string;
  體溫?: string;
  血含氧量?: string;
  呼吸頻率?: string;
  血糖值?: string;
  體重?: string;
  備註?: string;
  記錄人員?: string;
}

const BatchHealthRecordModal: React.FC<BatchHealthRecordModalProps> = ({ onClose, recordType }) => {
  const { patients, addHealthRecord } = usePatients();
  const [records, setRecords] = useState<BatchRecord[]>([
    {
      id: Date.now().toString(),
      院友id: '',
      記錄日期: new Date().toISOString().split('T')[0],
      記錄時間: new Date().toTimeString().slice(0, 5),
      備註: '',
      記錄人員: ''
    }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const recordsContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when records change
  useEffect(() => {
    if (recordsContainerRef.current) {
      recordsContainerRef.current.scrollTo({
        top: recordsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [records]);

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

  const addRecord = () => {
    const newRecord: BatchRecord = {
      id: Date.now().toString(),
      院友id: '',
      記錄日期: new Date().toISOString().split('T')[0],
      記錄時間: new Date().toTimeString().slice(0, 5),
      備註: '',
      記錄人員: ''
    };
    setRecords([...records, newRecord]);
  };

  const removeRecord = (id: string) => {
    if (records.length > 1) {
      setRecords(records.filter(record => record.id !== id));
    }
  };

  const updateRecord = (id: string, field: string, value: string) => {
    setRecords(records.map(record =>
      record.id === id ? { ...record, [field]: value } : record
    ));
  };

  const validateRecord = (record: BatchRecord): string[] => {
    const errors: string[] = [];

    if (!record.院友id) {
      errors.push('請選擇院友');
    }

    if (!record.記錄日期) {
      errors.push('請填寫記錄日期');
    }

    if (!record.記錄時間) {
      errors.push('請填寫記錄時間');
    }

    if (recordType === '生命表徵') {
      const hasVitalSign = record.血壓收縮壓 || record.血壓舒張壓 || record.脈搏 ||
        record.體溫 || record.血含氧量 || record.呼吸頻率;
      if (!hasVitalSign) {
        errors.push('至少需要填寫一項生命表徵數值');
      }
    } else if (recordType === '血糖控制') {
      if (!record.血糖值) {
        errors.push('請填寫血糖值');
      }
    } else if (recordType === '體重控制') {
      if (!record.體重) {
        errors.push('請填寫體重');
      }
    }

    return errors;
  };

  const handleBatchUpload = async () => {
    setIsUploading(true);
    setUploadResults(null);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const recordErrors = validateRecord(record);

        if (recordErrors.length > 0) {
          failedCount++;
          errors.push(`第 ${i + 1} 筆記錄：${recordErrors.join(', ')}`);
          continue;
        }

        try {
          const recordData = {
            院友id: parseInt(record.院友id),
            記錄日期: record.記錄日期,
            記錄時間: record.記錄時間,
            記錄類型: recordType,
            血壓收縮壓: record.血壓收縮壓 ? parseInt(record.血壓收縮壓) : null,
            血壓舒張壓: record.血壓舒張壓 ? parseInt(record.血壓舒張壓) : null,
            脈搏: record.脈搏 ? parseInt(record.脈搏) : null,
            體溫: record.體溫 ? parseFloat(record.體溫) : null,
            血含氧量: record.血含氧量 ? parseInt(record.血含氧量) : null,
            呼吸頻率: record.呼吸頻率 ? parseInt(record.呼吸頻率) : null,
            血糖值: record.血糖值 ? parseFloat(record.血糖值) : null,
            體重: record.體重 ? parseFloat(record.體重) : null,
            備註: record.備註 || null,
            記錄人員: record.記錄人員 || null
          };

          await addHealthRecord(recordData);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`第 ${i + 1} 筆記錄：儲存失敗 - ${error instanceof Error ? error.message : '未知錯誤'}`);
        }
      }

      setUploadResults({
        success: successCount,
        failed: failedCount,
        errors: errors
      });

      if (failedCount === 0) {
        setTimeout(() => {
          onClose();
        }, 3000);
      }

    } catch (error) {
      console.error('批量上傳失敗:', error);
      setUploadResults({
        success: successCount,
        failed: records.length - successCount,
        errors: ['批量上傳過程中發生錯誤，請重試']
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    let headers: string[] = ['院友床號', '院友姓名', '記錄日期', '記錄時間'];

    if (recordType === '生命表徵') {
      headers = [...headers, '血壓收縮壓', '血壓舒張壓', '脈搏', '體溫', '血含氧量', '呼吸頻率'];
    } else if (recordType === '血糖控制') {
      headers = [...headers, '血糖值'];
    } else if (recordType === '體重控制') {
      headers = [...headers, '體重'];
    }

    headers = [...headers, '備註', '記錄人員'];

    const exampleData = patients.slice(0, 3).map(patient => {
      let row = [
        patient.床號,
        patient.中文姓名,
        new Date().toISOString().split('T')[0],
        '08:00'
      ];

      if (recordType === '生命表徵') {
        row = [...row, '120', '80', '72', '36.5', '98', '18'];
      } else if (recordType === '血糖控制') {
        row = [...row, '5.5'];
      } else if (recordType === '體重控制') {
        row = [...row, '65.0'];
      }

      row = [...row, '', ''];
      return row;
    });

    const csvContent = [
      `"${recordType}批量上傳範本"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      '',
      headers.map(h => `"${h}"`).join(','),
      ...exampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recordType}批量上傳範本.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getTypeColor(recordType)} bg-opacity-10`}>
                {getTypeIcon(recordType)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">批量新增{recordType}記錄</h2>
                <p className="text-sm text-gray-600">一次新增多筆{recordType}記錄</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {uploadResults && (
            <div className={`mb-6 p-4 rounded-lg border ${
              uploadResults.failed === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {uploadResults.failed === 0 ? (
                  <div className="flex items-center text-green-800">
                    <Heart className="h-5 w-5 mr-2" />
                    <span className="font-medium">批量上傳完成！</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-800">
                    <Activity className="h-5 w-5 mr-2" />
                    <span className="font-medium">批量上傳部分完成</span>
                  </div>
                )}
              </div>
              <div className="text-sm">
                <p>成功：{uploadResults.success} 筆，失敗：{uploadResults.failed} 筆</p>
                {uploadResults.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">錯誤詳情：</p>
                    <ul className="list-disc list-inside space-y-1">
                      {uploadResults.errors.map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {uploadResults.failed === 0 && (
                <p className="text-sm text-green-600 mt-2">視窗將在 3 秒後自動關閉...</p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                記錄列表 ({records.length} 筆)
              </h3>
            </div>

            <div ref={recordsContainerRef} className="space-y-3 max-h-[400px] overflow-y-auto">
              {records.map((record, index) => (
                <div key={record.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">第 {index + 1} 筆記錄</h4>
                    {records.length > 1 && (
                      <button
                        onClick={() => removeRecord(record.id)}
                        className="text-red-600 hover:text-red-700"
                        title="刪除此記錄"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="form-label">
                        <User className="h-4 w-4 inline mr-1" />
                        院友 *
                      </label>
                      <select
                        value={record.院友id}
                        onChange={(e) => updateRecord(record.id, '院友id', e.target.value)}
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
                        value={record.記錄日期}
                        onChange={(e) => updateRecord(record.id, '記錄日期', e.target.value)}
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
                        value={record.記錄時間}
                        onChange={(e) => updateRecord(record.id, '記錄時間', e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                   
                    </div>
                  </div>

                  {recordType === '生命表徵' && (
                    <div className="space-y-4 mt-4">
                      {/* 第一行：收縮壓/舒張壓、脈搏、體溫 */}
                      <div className="grid grid-cols-1 md:grid-cols-3
                        gap-4">
                        <div>
                          <label className="form-label">血壓 (mmHg)</label>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              value={record.血壓收縮壓}
                              onChange={(e) => updateRecord(record.id, '血壓收縮壓', e.target.value)}
                              className="form-input"
                              placeholder="120"
                              min="0"
                              max="300"
                            />
                            <span className="flex items-center text-gray-500">/</span>
                            <input
                              type="number"
                              value={record.血壓舒張壓}
                              onChange={(e) => updateRecord(record.id, '血壓舒張壓', e.target.value)}
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
                            value={record.脈搏}
                            onChange={(e) => updateRecord(record.id, '脈搏', e.target.value)}
                            className="form-input"
                            placeholder="72"
                            min="0"
                            max="300"
                          />
                        </div>
                        <div>
                          <label className="form-label">體溫 (°C)</label>
                          <input
                            type="number"
                            value={record.體溫}
                            onChange={(e) => updateRecord(record.id, '體溫', e.target.value)}
                            className="form-input"
                            placeholder="36.5"
                            min="30"
                            max="45"
                            step="0.1"
                          />
                        </div>
                      </div>
                      
                      {/* 第二行：血含氧量、呼吸頻率、備註 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="form-label">血含氧量 (%)</label>
                          <input
                            type="number"
                            value={record.血含氧量}
                            onChange={(e) => updateRecord(record.id, '血含氧量', e.target.value)}
                            className="form-input"
                            placeholder="98"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <label className="form-label">呼吸頻率 (每分鐘)</label>
                          <input
                            type="number"
                            value={record.呼吸頻率}
                            onChange={(e) => updateRecord(record.id, '呼吸頻率', e.target.value)}
                            className="form-input"
                            placeholder="18"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <label className="form-label">備註</label>
                          <textarea
                            value={record.備註}
                            onChange={(e) => updateRecord(record.id, '備註', e.target.value)}
                            className="form-input"
                            rows={1}
                            placeholder="其他備註資訊..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {recordType === '血糖控制' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="form-label">血糖值 (mmol/L) *</label>
                        <input
                          type="number"
                          value={record.血糖值}
                          onChange={(e) => updateRecord(record.id, '血糖值', e.target.value)}
                          className="form-input"
                          placeholder="5.5"
                          min="0"
                          max="50"
                          step="0.1"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {recordType === '體重控制' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="form-label">體重 (kg) *</label>
                        <input
                          type="number"
                          value={record.體重}
                          onChange={(e) => updateRecord(record.id, '體重', e.target.value)}
                          className="form-input"
                          placeholder="65.0"
                          min="0"
                          max="300"
                          step="0.1"
                          required
                        />
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleBatchUpload}
              disabled={isUploading || records.length === 0}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>上傳中...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>一鍵上傳 ({records.length} 筆記錄)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={addRecord}
              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
              disabled={isUploading}
            >
              <Plus className="h-4 w-4" />
              <span>新增記錄</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchHealthRecordModal;