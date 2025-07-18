import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, Eye, Plus, Search, Filter, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  getTemplatesMetadata, 
  createTemplateMetadata, 
  deleteTemplateMetadata,
  uploadTemplateFile,
  deleteTemplateFile,
  getPublicTemplateUrl,
  type TemplateMetadata
} from '../lib/database';
import { 
  extractTemplateFormat,
  extractPrescriptionTemplateFormat,
  extractWaitingListTemplateFormat
} from '../utils/templateExtractors';

// Use TemplateMetadata from database.ts instead of local interface
type Template = TemplateMetadata & {
  fileSize: string; // Keep this for display purposes
};

const TemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // 載入範本列表
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templatesData = await getTemplatesMetadata();
      
      // Convert to display format
      const displayTemplates: Template[] = templatesData.map(template => ({
        ...template,
        fileSize: formatFileSize(template.file_size)
      }));
      
      setTemplates(displayTemplates);
    } catch (error) {
      console.error('載入範本失敗:', error);
      setUploadStatus({ type: 'error', message: '載入範本失敗' });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplateToSupabase = async (
    file: File, 
    baseTemplateType: string,
    variant?: string,
    extractedFormat: any
  ): Promise<boolean> => {
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = sanitizeFilename(file.name);
      const fileName = `${baseTemplateType}_${timestamp}_${sanitizedFileName}`;
      const storagePath = `${baseTemplateType}/${fileName}`;
      
      // Upload file to Supabase Storage
      const uploadedPath = await uploadTemplateFile(file, storagePath);
      if (!uploadedPath) {
        throw new Error('檔案上傳失敗');
      }

      // Create metadata record
      let displayName = getTemplateDisplayName(baseTemplateType);
      if (variant === 'oral') {
        displayName += ' (口服)';
      } else if (variant === 'topical') {
        displayName += ' (外用)';
      }
      
      const metadata = {
        name: displayName,
        type: baseTemplateType as 'waiting-list' | 'prescription' | 'medication-record' | 'consent-form',
        original_name: file.name,
        storage_path: uploadedPath,
        file_size: file.size,
        description: getTemplateDescription(baseTemplateType),
        extracted_format: extractedFormat
      };
      
      const createdTemplate = await createTemplateMetadata(metadata);
      if (!createdTemplate) {
        // If metadata creation fails, clean up uploaded file
        await deleteTemplateFile(uploadedPath);
        throw new Error('範本元數據建立失敗');
      }
      
      return true;
    } catch (error) {
      console.error('儲存範本到資料庫失敗:', error);
      throw error;
    }
  };


  const [dragActive, setDragActive] = useState(false);
  const [uploadType, setUploadType] = useState<'waiting-list' | 'prescription' | 'medication-record'>('waiting-list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Helper function to sanitize filename for storage
  const sanitizeFilename = (filename: string): string => {
    // Get file extension
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
    
    // Replace non-alphanumeric characters (except hyphens and underscores) with underscores
    const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, '_');
    
    return sanitizedName + extension;
  };

  const templateTypes = [
    { 
      id: 'waiting-list', 
      name: '院友候診記錄表', 
      description: '用於醫生到診前的院友候診記錄',
      icon: '📋',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      id: 'prescription', 
      name: 'VMO處方箋', 
      description: '標準VMO處方箋格式',
      icon: '💊',
      color: 'bg-green-100 text-green-800'
    },
    { 
      id: 'medication-record', 
      name: '個人備藥及給藥記錄', 
      description: '個人備藥及給藥執行記錄表',
      icon: '📝',
      color: 'bg-purple-100 text-purple-800'
    },
    { 
      id: 'consent-form', 
      name: '約束物品同意書', 
      description: '約束物品使用同意書範本',
      icon: '📄',
      color: 'bg-orange-100 text-orange-800'
    },
    { 
      id: 'vital-signs', 
      name: '生命表徵觀察記錄表', 
      description: '生命表徵觀察記錄表範本',
      icon: '💓',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      id: 'blood-sugar', 
      name: '血糖測試記錄表', 
      description: '血糖測試記錄表範本',
      icon: '🩸',
      color: 'bg-red-100 text-red-800'
    },
    { 
      id: 'weight-control', 
      name: '體重記錄表', 
      description: '體重記錄表範本',
      icon: '⚖️',
      color: 'bg-green-100 text-green-800'
    }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const validateFile = (file: File): { valid: boolean; message: string } => {
    // 檢查檔案類型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return { valid: false, message: '只支援 Excel (.xlsx, .xls) 或 CSV 檔案格式' };
    }

    // 檢查檔案大小 (10MB 限制)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, message: '檔案大小不能超過 10MB' };
    }

    return { valid: true, message: '' };
  };

  const handleFiles = async (files: FileList) => {
    setUploadStatus({ type: null, message: '' });

    for (const file of Array.from(files)) {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        setUploadStatus({ type: 'error', message: validation.message });
        continue;
      }

      try {
        if (uploadType === 'medication-record') {
          // Extract oral medication sheet format
          try {
            const oralTemplateFormat = await extractTemplateFormat(file, '口服藥物');
            await saveTemplateToSupabase(file, 'medication-record', 'oral', oralTemplateFormat);
          } catch (error) {
            console.warn('無法找到「口服藥物」工作表:', error);
          }
          
          // Extract topical medication sheet format
          try {
            const topicalTemplateFormat = await extractTemplateFormat(file, '外用藥物');
            await saveTemplateToSupabase(file, 'medication-record', 'topical', topicalTemplateFormat);
          } catch (error) {
            console.warn('無法找到「外用藥物」工作表:', error);
          }
        } else if (uploadType === 'prescription') {
          try {
            const prescriptionTemplateFormat = await extractPrescriptionTemplateFormat(file);
            await saveTemplateToSupabase(file, uploadType, undefined, prescriptionTemplateFormat);
          } catch (error) {
            console.error('提取處方箋範本格式失敗:', error);
            throw new Error('處方箋範本格式提取失敗');
          }
        } else if (uploadType === 'waiting-list') {
          try {
            const waitingListTemplateFormat = await extractWaitingListTemplateFormat(file);
            await saveTemplateToSupabase(file, uploadType, undefined, waitingListTemplateFormat);
          } catch (error) {
            console.error('提取候診記錄表範本格式失敗:', error);
            if (error instanceof Error && error.message.includes('儲存桶')) {
              throw new Error(`${error.message}\n\n請按照以下步驟建立儲存桶：\n1. 登入 Supabase Dashboard\n2. 選擇您的專案\n3. 點擊左側選單的 "Storage"\n4. 點擊 "+ New bucket"\n5. 輸入桶名稱: "templates"\n6. 設定為 Public bucket\n7. 點擊 "Create bucket"`);
            }
            throw new Error(`候診記錄表範本格式提取失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
          }
        } else if (['vital-signs', 'blood-sugar', 'weight-control'].includes(uploadType)) {
          try {
            const { extractHealthRecordTemplateFormat } = await import('../utils/healthRecordExcelGenerator');
            const healthRecordTemplateFormat = await extractHealthRecordTemplateFormat(file);
            await saveTemplateToSupabase(file, uploadType, undefined, healthRecordTemplateFormat);
          } catch (error) {
            console.error('提取健康記錄範本格式失敗:', error);
            throw new Error(`健康記錄範本格式提取失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
          }
        }
        
        // Reload templates from Supabase
        await loadTemplates();
        
        setUploadStatus({ 
          type: 'success', 
          message: `成功上傳 ${file.name} 作為 ${getTemplateDisplayName(uploadType)} 範本`
        });
      } catch (error) {
        setUploadStatus({ 
          type: 'error', 
          message: `上傳 ${file.name} 失敗：${error instanceof Error ? error.message : '未知錯誤'}` 
        });
      }
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result instanceof ArrayBuffer) {
          // 使用迭代方式轉換ArrayBuffer為base64，避免堆疊溢出
          const uint8Array = new Uint8Array(result);
          let binaryString = '';
          const chunkSize = 8192; // 每次處理8KB
          
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            binaryString += String.fromCharCode.apply(null, Array.from(chunk));
          }
          
          const base64 = btoa(binaryString);
          resolve(base64);
        } else {
          resolve(result as string);
        }
      };
      reader.onerror = () => {
        reject(new Error('檔案讀取失敗'));
      };
      
      if (file.type === 'text/csv') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTemplateDisplayName = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'waiting-list': '院友候診記錄表',
      'prescription': 'VMO處方箋',
      'medication-record': '個人備藥及給藥記錄'
    };
    return typeMap[type] || '未知範本';
  };

  const getTemplateDescription = (type: string): string => {
    const descMap: { [key: string]: string } = {
      'waiting-list': '醫生到診前院友候診記錄表格範本，包含院友基本資料、看診原因、症狀說明等欄位',
      'prescription': '標準VMO處方箋範本，含藥物名稱、劑量、用法用量等完整處方資訊',
      'medication-record': '個人備藥及給藥執行記錄表格範本，用於追蹤院友藥物使用情況',
      'consent-form': '約束物品使用同意書範本，記錄約束物品使用的同意與執行情況'
    };
    return descMap[type] || '自訂範本';
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDelete = async (id: number) => {
    const template = templates.find(t => t.id === id);
    
    if (confirm(`確定要刪除範本「${template?.name}」嗎？`)) {
      try {
        // Delete from Supabase Storage and Database
        const deleteFileSuccess = await deleteTemplateFile(template.storage_path);
        const deleteMetadataSuccess = await deleteTemplateMetadata(id);
        
        if (deleteFileSuccess && deleteMetadataSuccess) {
          await loadTemplates(); // Reload templates
          setUploadStatus({ type: 'success', message: '範本已成功刪除' });
        } else {
          throw new Error('刪除範本失敗');
        }
      } catch (error) {
        console.error('刪除範本失敗:', error);
        setUploadStatus({ 
          type: 'error', 
          message: '刪除範本失敗，請重試' 
        });
      }
    }
  };

  const handleDownload = (template: Template) => {
    if (template.storage_path) {
      // Download from Supabase Storage
      const url = getPublicTemplateUrl(template.storage_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.original_name;
      a.target = '_blank'; // Open in new tab for Supabase URLs
      a.click();
    } else {
      // 生成預設範本
      generateDefaultTemplate(template.type, template.name);
    }
  };

  const generateDefaultTemplate = (type: string, name: string) => {
    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'waiting-list':
        csvContent = generateWaitingListTemplate();
        filename = `院友候診記錄表_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'prescription':
        csvContent = generatePrescriptionTemplate();
        filename = `VMO處方箋_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'medication-record':
        csvContent = generateMedicationRecordTemplate();
        filename = `個人備藥及給藥記錄_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'consent-form':
        csvContent = generateConsentFormTemplate();
        filename = `約束物品同意書_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      default:
        alert('未知的範本類型');
        return;
    }

    // 下載 CSV 檔案
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateWaitingListTemplate = (): string => {
    const headers = [
      '床號', '中文姓名', '英文姓名', '性別', '身份證號碼', '出生日期', 
      '看診原因', '症狀說明', '藥物敏感', '不良藥物反應', '備註', '到診日期'
    ];
    
    return [
      `"院友候診記錄表"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      '',
      headers.map(h => `"${h}"`).join(','),
      // 範例資料
      '"A001","張三","ZHANG SAN","男","A123456789","1980-01-01","申訴不適","頭痛","無","無","","2024-01-15"',
      '"A002","李四","LI SI","女","B987654321","1975-05-10","年度體檢","","青黴素","皮疹","","2024-01-15"'
    ].join('\n');
  };

  const generatePrescriptionTemplate = (): string => {
    const headers = [
      '床號', '中文姓名', '處方日期', '藥物名稱', '劑型', '服用途徑', 
      '服用次數', '服用份量', '服用日數', '藥物來源', '需要時', '醫生簽名'
    ];
    
    return [
      `"VMO處方箋"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      '',
      headers.map(h => `"${h}"`).join(','),
      // 範例資料
      '"A001","張三","2024-01-15","Paracetamol","片劑","口服","每日3次","1粒","7天","樂善堂社區藥房","否",""',
      '"A002","李四","2024-01-15","Metformin","片劑","口服","每日2次","500mg","30天","樂善堂社區藥房","否",""'
    ].join('\n');
  };

  const generateMedicationRecordTemplate = (): string => {
    const headers = [
      '床號', '中文姓名', '藥物名稱', '劑型', '服用途徑', '服用次數', 
      '服用份量', '服用日數', '藥物來源', '需要時', '執行日期', '執行時間', 
      '執行人員', '備註'
    ];
    
    return [
      `"個人備藥及給藥記錄"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      '',
      headers.map(h => `"${h}"`).join(','),
      // 範例資料
      '"A001","張三","Paracetamol","片劑","口服","每日3次","1粒","7天","樂善堂社區藥房","否","2024-01-15","08:00","護士A",""',
      '"A001","張三","Paracetamol","片劑","口服","每日3次","1粒","7天","樂善堂社區藥房","否","2024-01-15","14:00","護士B",""'
    ].join('\n');
  };

  const generateConsentFormTemplate = (): string => {
    const headers = [
      '床號', '中文姓名', '英文姓名', '性別', '身份證號碼', '出生日期',
      '約束物品類型', '使用原因', '開始日期', '開始時間', '結束日期', '結束時間',
      '家屬同意', '家屬簽名', '家屬關係', '聯絡電話', '醫生指示', '醫生簽名',
      '護理人員', '執行時間', '觀察記錄', '備註'
    ];
    
    return [
      `"約束物品同意書"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      '',
      headers.map(h => `"${h}"`).join(','),
      // 範例資料
      '"A001","張三","ZHANG SAN","男","A123456789","1980-01-01","床欄","防跌倒","2024-01-15","08:00","2024-01-16","08:00","是","張家屬","兒子","0912345678","預防跌倒","王醫師","護士A","2024-01-15 08:00","院友配合良好","無異常"',
      '"A002","李四","LI SI","女","B987654321","1975-05-10","約束帶","躁動不安","2024-01-15","14:00","2024-01-15","18:00","是","李家屬","女兒","0987654321","安全考量","陳醫師","護士B","2024-01-15 14:00","院友情緒穩定","定時檢查"'
    ].join('\n');
  };

  const handlePreview = (template: Template) => {
    if (template.storage_path) {
      alert(`預覽功能開發中\n檔案：${template.original_name}\n大小：${template.fileSize}`);
    } else {
      alert(`這是系統預設的${template.name}範本\n點擊下載可獲取範本檔案`);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">範本管理</h1>
        <div className="flex items-center space-x-2">
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as any)}
            className="form-input"
          >
            {templateTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <label className="btn-primary flex items-center space-x-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span>上傳範本</span>
            <input
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 上傳狀態提示 */}
      {uploadStatus.type && (
        <div className={`p-4 rounded-lg border ${
          uploadStatus.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        </div>
      )}

      {/* 範本類型說明 */}

     

      {/* 搜索和篩選 */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索範本名稱、描述或檔案名稱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-input lg:w-48"
          >
            <option value="all">所有類型</option>
            {templateTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 範本列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">載入範本中...</p>
            </div>
          </div>
        ) : filteredTemplates.length > 0 ? (
          filteredTemplates.map(template => {
            const typeInfo = templateTypes.find(t => t.id === template.type);
            return (
              <div key={template.id} className="card p-6 hover-scale">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${typeInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                      <span className="text-xl">{typeInfo?.icon || '📄'}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-xs text-gray-500">{template.original_name}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="下載範本"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePreview(template)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      title="預覽範本"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="刪除範本"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{template.description}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{template.fileSize}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                      {typeInfo?.name || '未知類型'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      上傳日期: {new Date(template.upload_date).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <FileText className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' ? '找不到符合條件的範本' : '暫無範本'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all' ? '請嘗試調整搜索條件' : '開始上傳您的範本檔案'}
            </p>
            {!searchTerm && filterType === 'all' && (
              <label className="btn-primary cursor-pointer">
                上傳範本
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* 使用說明 */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">使用說明</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">1.</span>
            <span>選擇要上傳的範本類型，然後拖放或點擊上傳您的Excel/CSV檔案</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">2.</span>
            <span>系統會根據範本類型自動設定正確的欄位映射</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">3.</span>
            <span>在匯出功能中，系統會使用對應的範本格式生成檔案</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-medium text-blue-600">4.</span>
            <span>如果沒有上傳自訂範本，系統會使用預設格式</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateManagement;