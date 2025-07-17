import React, { useState, useRef, useEffect } from 'react';
import {
  X, Plus, Trash2, Upload, Download,
  Heart, Activity, Droplets, Scale,
  User, Calendar, Clock
} from 'lucide-react';
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
      記錄時間: new Date().toTimeString().substring(0, 5),
      備註: '',
      記錄人員: ''
    }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // 滾動到最底的參考元素
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [records.length]);

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
      記錄時間: new Date().toTimeString().substring(0, 5),
      備註: '',
      記錄人員: ''
    };
    setRecords(prev => [...prev, newRecord]);
  };

  const removeRecord = (id: string) => {
    if (records.length > 1) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const updateRecord = (id: string, field: string, value: string) => {
    setRecords(prev =>
      prev.map(record => record.id === id ? { ...record, [field]: value } : record)
    );
  };

  const validateRecord = (record: BatchRecord): string[] => {
    const errors: string[] = [];
    if (!record.院友id) errors.push('請選擇院友');
    if (!record.記錄日期) errors.push('請填寫記錄日期');
    if (!record.記錄時間) errors.push('請填寫記錄時間');

    if (recordType === '生命表徵' &&
      !(
        record.血壓收縮壓 || record.血壓舒張壓 || record.脈搏 ||
        record.體溫 || record.血含氧量 || record.呼吸頻率
      )
    ) {
      errors.push('至少需一項生命表徵數值');
    }

    if (recordType === '血糖控制' && !record.血糖值) {
      errors.push('請填寫血糖值');
    }

    if (recordType === '體重控制' && !record.體重) {
      errors.push('請填寫體重');
    }

    return errors;
  };

  const handleBatchUpload = async () => {
    setIsUploading(true);
    setUploadResults(null);

    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const validationErrors = validateRecord(record);

      if (validationErrors.length > 0) {
        failed++;
        errors.push(`第 ${i + 1} 筆：${validationErrors.join(', ')}`);
        continue;
      }

      try {
        const payload = {
          院友id: parseInt(record.院友id),
          記錄類型: recordType,
          記錄日期: record.記錄日期,
          記錄時間: record.記錄時間,
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

        await addHealthRecord(payload);
        success++;
      } catch (e: any) {
        failed++;
        errors.push(`第 ${i + 1} 筆：儲存失敗 - ${e.message || '未知錯誤'}`);
      }
    }

    setUploadResults({ success, failed, errors });
    setIsUploading(false);

    if (failed === 0) {
      setTimeout(() => onClose(), 3000);
    }
  };

  const downloadTemplate = () => {
    const headers = ['院友床號', '院友姓名', '記錄日期', '記錄時間'];
    if (recordType === '生命表徵')
      headers.push('血壓收縮壓', '血壓舒張壓', '脈搏', '體溫', '血含氧量', '呼吸頻率');
    if (recordType === '血糖控制') headers.push('血糖值');
    if (recordType === '體重控制') headers.push('體重');
    headers.push('備註', '記錄人員');

    const rows = patients.slice(0, 3).map(p => {
      const base = [p.床號, p.中文姓名, new Date().toISOString().split('T')[0], '08:00'];
      if (recordType === '生命表徵') base.push('120', '80', '72', '36.5', '98', '18');
      if (recordType === '血糖控制') base.push('5.5');
      if (recordType === '體重控制') base.push('65.0');
      base.push('', '');
      return base;
    });

    const csv = [
      `${recordType}批量上傳範本`,
      `生成日期: ${new Date().toLocaleDateString('zh-TW')}`,
      '',
      headers.join(','),
      ...rows.map(r => r.map(f => `"${f}"`).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recordType}批量上傳範本.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getTypeColor(recordType)} bg-opacity-10`}>
              {getTypeIcon(recordType)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">批量新增{recordType}記錄</h2>
              <p className="text-sm text-gray-600">一次新增多筆{recordType}記錄</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={downloadTemplate} className="btn-secondary flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>下載範本</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {uploadResults && (
            <div className={`mb-4 p-4 rounded border ${uploadResults.failed === 0 ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
              <div className="font-medium mb-1">
                {uploadResults.failed === 0 ? '✅ 所有記錄成功上傳' : '⚠️ 部分記錄上傳失敗'}
              </div>
              <div>成功：{uploadResults.success} 筆　失敗：{uploadResults.failed} 筆</div>
              {uploadResults.errors.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm text-red-600 space-y-1">
                  {uploadResults.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                </ul>
              )}
              {uploadResults.failed === 0 && (
                <p className="text-green-600 text-sm mt-2">系統將於 3 秒後自動關閉此視窗。</p>
              )}
            </div>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {records.map((record, index) => (
              <div key={record.id} className="border p-4 rounded bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">第 {index + 1} 筆記錄</div>
                  {records.length > 1 && (
                    <button onClick={() => removeRecord(record.id)} className="text-red-600 hover:underline">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* 這裡保留原本的欄位結構 */}
                {/* ... 這裡省略輸入欄位，保有你的項目內容，例如 select、input、textarea ... */}
              </div>
            ))}
            {/* 新增記錄後自動滾動進入可視區塊 */}
            <div ref={listEndRef} />
          </div>

          {/* 底部操作區：左 - 一鍵上傳 / 右 - 新增記錄 */}
          <div className="mt-6 flex space-x-3 border-t pt-4">
            <button
              onClick={handleBatchUpload}
              disabled={isUploading}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin h-4 w-4 rounded-full border-t-2 border-white" />
                  <span>上傳中...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>一鍵上傳（{records.length} 筆）</span>
                </>
              )}
            </button>
            <button
              onClick={addRecord}
              disabled={isUploading}
              type="button"
              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
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
