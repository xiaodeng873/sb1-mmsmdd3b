import React, { useState } from 'react';
import { Camera, Upload, Pill, Plus, Edit3, Trash2, Search, Download, ChevronUp, ChevronDown, Filter, X } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import MedicationModal from '../components/MedicationModal';
import { createWorkbook, saveExcelFile, extractTemplateFormat } from '../utils/medicationRecordExcelGenerator';
import { getMedicationTemplatesFromSupabase } from '../utils/medicationRecordExcelGenerator';
import { exportPrescriptionsToExcel } from '../utils/prescriptionExcelGenerator';
import OCRModal from '../components/OCRModal';
import { getMedicationTimeColorClass } from '../utils/medicationTimeColors';
import PatientTooltip from '../components/PatientTooltip';

type SortField = '床號' | '中文姓名' | '處方日期' | '藥物名稱' | '劑型' | '服用途徑' | '服用次數' | '服用份量' | '服用日數' | '藥物來源';
type SortDirection = 'asc' | 'desc';

interface FilterOption {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  value: string;
  label: string;
}
const MedicationRegistration: React.FC = () => {
  const { prescriptions, patients, loading, deletePrescription } = usePatients();
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>('處方日期');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    床號: '',
    中文姓名: '',
    藥物名稱: '',
    劑型: '',
    服用途徑: '',
    藥物來源: '',
    需要時: '',
    記錄人員: '',
    備註: '',
    startDate: '',
    endDate: ''
  });

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

  const filteredPrescriptions = prescriptions.filter(prescription => {
    const patient = patients.find(p => p.院友id === prescription.院友id);
    
    // 日期篩選
    if (dateFilter && prescription.處方日期 !== dateFilter) {
      return false;
    }
    
    // 日期區間篩選
    if (advancedFilters.startDate || advancedFilters.endDate) {
      const prescriptionDate = new Date(prescription.處方日期);
      if (advancedFilters.startDate && prescriptionDate < new Date(advancedFilters.startDate)) {
        return false;
      }
      if (advancedFilters.endDate && prescriptionDate > new Date(advancedFilters.endDate)) {
        return false;
      }
    }
    
    // 進階篩選
    if (advancedFilters.床號 && !patient?.床號.toLowerCase().includes(advancedFilters.床號.toLowerCase())) {
      return false;
    }
    if (advancedFilters.中文姓名 && !patient?.中文姓名.toLowerCase().includes(advancedFilters.中文姓名.toLowerCase())) {
      return false;
    }
    if (advancedFilters.藥物名稱 && !prescription.藥物名稱.toLowerCase().includes(advancedFilters.藥物名稱.toLowerCase())) {
      return false;
    }
    if (advancedFilters.劑型 && !prescription.劑型?.toLowerCase().includes(advancedFilters.劑型.toLowerCase())) {
      return false;
    }
    if (advancedFilters.服用途徑 && !prescription.服用途徑?.toLowerCase().includes(advancedFilters.服用途徑.toLowerCase())) {
      return false;
    }
    if (advancedFilters.藥物來源 && !prescription.藥物來源.toLowerCase().includes(advancedFilters.藥物來源.toLowerCase())) {
      return false;
    }
    if (advancedFilters.需要時) {
      const isAsNeeded = prescription.需要時;
      if (advancedFilters.需要時 === '是' && !isAsNeeded) return false;
      if (advancedFilters.需要時 === '否' && isAsNeeded) return false;
    }
    
    // 搜索條件
    let matchesSearch = true;
    if (searchTerm) {
      matchesSearch = prescription.藥物名稱.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (patient?.中文姓名.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         new Date(prescription.處方日期).toLocaleDateString('zh-TW').includes(searchTerm.toLowerCase()) ||
                         prescription.劑型?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.服用途徑?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.藥物來源.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.服用次數?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prescription.服用份量?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    // 篩選條件
    let matchesFilters = true;
    if (filters.length > 0) {
      matchesFilters = filters.every(filter => {
        let fieldValue = '';
        
        switch (filter.field) {
          case '床號':
            fieldValue = patient?.床號 || '';
            break;
          case '中文姓名':
            fieldValue = patient?.中文姓名 || '';
            break;
          case '藥物名稱':
            fieldValue = prescription.藥物名稱;
            break;
          case '劑型':
            fieldValue = prescription.劑型 || '';
            break;
          case '服用途徑':
            fieldValue = prescription.服用途徑 || '';
            break;
          case '藥物來源':
            fieldValue = prescription.藥物來源;
            break;
          case '需要時':
            fieldValue = prescription.需要時 ? '是' : '否';
            break;
          case '處方日期':
            fieldValue = prescription.處方日期;
            break;
          default:
            return true;
        }
        
        const filterValue = filter.value.toLowerCase();
        const compareValue = fieldValue.toLowerCase();
        
        switch (filter.operator) {
          case 'equals':
            return compareValue === filterValue;
          case 'contains':
            return compareValue.includes(filterValue);
          case 'startsWith':
            return compareValue.startsWith(filterValue);
          case 'endsWith':
            return compareValue.endsWith(filterValue);
          case 'greaterThan':
            if (filter.field === '處方日期') {
              return new Date(fieldValue) > new Date(filter.value);
            }
            return fieldValue > filter.value;
          case 'lessThan':
            if (filter.field === '處方日期') {
              return new Date(fieldValue) < new Date(filter.value);
            }
            return fieldValue < filter.value;
          default:
            return true;
        }
      });
    }
    
    return matchesSearch && matchesFilters;
  });

  // 檢查是否有進階篩選條件
  const hasAdvancedFilters = () => {
    return Object.values(advancedFilters).some(value => value !== '');
  };

  const updateAdvancedFilter = (field: string, value: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 獲取所有唯一值的選項
  const getUniqueOptions = (field: string) => {
    const values = new Set<string>();
    prescriptions.forEach(prescription => {
      let value = '';
      
      switch (field) {
        case '劑型':
          value = prescription.劑型 || '';
          break;
        case '服用途徑':
          value = prescription.服用途徑 || '';
          break;
        case '藥物來源':
          value = prescription.藥物來源;
          break;
        default:
          return;
      }
      
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const sortedPrescriptions = [...filteredPrescriptions].sort((a, b) => {
    const patientA = patients.find(p => p.院友id === a.院友id);
    const patientB = patients.find(p => p.院友id === b.院友id);
    
    let valueA: string | number = '';
    let valueB: string | number = '';
    
    switch (sortField) {
      case '床號':
        valueA = patientA?.床號 || '';
        valueB = patientB?.床號 || '';
        break;
      case '中文姓名':
        valueA = patientA?.中文姓名 || '';
        valueB = patientB?.中文姓名 || '';
        break;
      case '處方日期':
        valueA = new Date(a.處方日期).getTime();
        valueB = new Date(b.處方日期).getTime();
        break;
      case '藥物名稱':
        valueA = a.藥物名稱;
        valueB = b.藥物名稱;
        break;
      case '劑型':
        valueA = a.劑型 || '';
        valueB = b.劑型 || '';
        break;
      case '服用途徑':
        valueA = a.服用途徑 || '';
        valueB = b.服用途徑 || '';
        break;
      case '服用次數':
        valueA = a.服用次數 || '';
        valueB = b.服用次數 || '';
        break;
      case '服用份量':
        valueA = a.服用份量 || '';
        valueB = b.服用份量 || '';
        break;
      case '服用日數':
        valueA = a.服用日數 || '';
        valueB = b.服用日數 || '';
        break;
      case '藥物來源':
        valueA = a.藥物來源;
        valueB = b.藥物來源;
        break;
      case '需要時':
        valueA = a.需要時 ? 1 : 0;
        valueB = b.需要時 ? 1 : 0;
        break;
    }
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    } else {
      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (prescription: any) => {
    setSelectedPrescription(prescription);
    setShowMedicationModal(true);
  };

  const handleDelete = async (prescriptionId: number) => {
    const prescription = prescriptions.find(p => p.處方id === prescriptionId);
    const patient = patients.find(p => p.院友id === prescription?.院友id);
    
    const confirmMessage = `確定要刪除以下處方記錄嗎？\n\n院友：${patient?.中文姓名} (${patient?.床號})\n藥物：${prescription?.藥物名稱}\n日期：${new Date(prescription?.處方日期 || '').toLocaleDateString('zh-TW')}`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(prescriptionId));
    
    try {
      await deletePrescription(prescriptionId);
      // 如果刪除的項目在選中列表中，也要移除
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(prescriptionId);
        return newSet;
      });
    } catch (error) {
      console.error('刪除處方失敗:', error);
      alert('刪除處方失敗，請重試');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(prescriptionId);
        return newSet;
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.size === 0) {
      alert('請先選擇要刪除的記錄');
      return;
    }

    const selectedPrescriptions = sortedPrescriptions.filter(p => selectedRows.has(p.處方id));
    const confirmMessage = `確定要刪除 ${selectedRows.size} 筆處方記錄嗎？\n\n此操作無法復原。`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const deletingArray = Array.from(selectedRows);
    setDeletingIds(new Set(deletingArray));
    
    try {
      // 逐一刪除選中的處方
      for (const prescriptionId of deletingArray) {
        await deletePrescription(prescriptionId);
      }
      
      // 清空選中狀態
      setSelectedRows(new Set());
      alert(`成功刪除 ${deletingArray.length} 筆處方記錄`);
    } catch (error) {
      console.error('批量刪除處方失敗:', error);
      alert('批量刪除處方失敗，請重試');
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleOCRScan = () => {
    setShowOCRModal(true);
  };

  const handleCameraCapture = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setShowOCRModal(true);
    } else {
      alert('此設備不支援拍照功能，請使用上傳功能');
    }
  };

  const handleSelectRow = (prescriptionId: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(prescriptionId)) {
      newSelected.delete(prescriptionId);
    } else {
      newSelected.add(prescriptionId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === sortedPrescriptions.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedPrescriptions.map(p => p.處方id)));
    }
  };

  const handleInvertSelection = () => {
    const newSelected = new Set<number>();
    sortedPrescriptions.forEach(prescription => {
      if (!selectedRows.has(prescription.處方id)) {
        newSelected.add(prescription.處方id);
      }
    });
    setSelectedRows(newSelected);
  };

  const handleExportSelected = () => {
    const selectedPrescriptions = sortedPrescriptions.filter(p => selectedRows.has(p.處方id));
    
    if (selectedPrescriptions.length === 0) {
      alert('請先選擇要匯出的記錄');
      return;
    }

    handleExportToExcel(selectedPrescriptions, 'medication');
  };

  const handleExportToExcel = async (prescriptions: any[], templateType: 'medication' | 'schedule') => {
    if (!prescriptions || !Array.isArray(prescriptions)) {
      console.error('處方資料無效或未定義:', prescriptions);
      alert('無法匯出：處方資料無效');
      return;
    }

    try {
      let filename: string;
      
      if (templateType === 'medication') {
        // 從 Supabase 載入口服和外用藥物範本
        const { oralTemplate, topicalTemplate } = await getMedicationTemplatesFromSupabase();
        
        if (!oralTemplate && !topicalTemplate) {
          alert('找不到藥物記錄範本，請先在範本管理中上傳「個人備藥及給藥記錄」範本');
          return;
        }
        
        // 按院友和服用途徑分組處方
        const groupedPrescriptions: { [key: string]: any[] } = {};
        
        prescriptions.forEach(prescription => {
          const patient = patients.find(p => p.院友id === prescription.院友id);
          if (!patient) return;
          
          const route = prescription.服用途徑 || '口服'; // 預設為口服
          const key = `${patient.院友id}_${route}`;
          
          if (!groupedPrescriptions[key]) {
            groupedPrescriptions[key] = [];
          }
          groupedPrescriptions[key].push({
            ...prescription,
            patient: patient
          });
        });
        
        // 構建工作表配置
        const sheetsConfig: any[] = [];
        
        Object.entries(groupedPrescriptions).forEach(([key, prescriptionGroup]) => {
          const [patientId, route] = key.split('_');
          const patient = prescriptionGroup[0].patient;
          
          let template: any | undefined;
          let routeLabel: string;
          
          if (route === '外用' && topicalTemplate) {
            template = topicalTemplate;
            routeLabel = '(外用)';
          } else if (route === '口服' && oralTemplate) {
            template = oralTemplate;
            routeLabel = '(口服)';
          } else if (oralTemplate) {
            // For other routes, use oral template but with specific route label
            template = oralTemplate;
            routeLabel = `(${route})`;
          }
          
          if (template) {
            sheetsConfig.push({
              name: `${patient.床號}${patient.中文姓名}${routeLabel}`,
              template: template,
              patient: patient,
              prescriptions: prescriptionGroup
            });
          }
        });
        
        if (sheetsConfig.length === 0) {
          alert('沒有可匯出的資料或找不到對應的範本');
          return;
        }
        
        // 決定檔案名稱
        const uniquePatients = [...new Set(Object.keys(groupedPrescriptions).map(key => key.split('_')[0]))];
        if (uniquePatients.length === 1) {
          const patient = sheetsConfig[0].patient;
          filename = `個人備藥及給藥記錄_${patient.床號}_${patient.中文姓名}.xlsx`;
        } else {
          filename = `個人備藥及給藥記錄(${uniquePatients.length}名院友).xlsx`;
        }
        
        // 創建工作簿並匯出
        const workbook = await createWorkbook(sheetsConfig);
        await saveExcelFile(workbook, filename);
        
      } else {
        // 處理處方箋匯出
        const exportData = prescriptions.map(prescription => {
          const patient = patients.find(p => p.院友id === prescription.院友id);
          return {
            床號: patient?.床號 || '',
            中文姓名: patient?.中文姓名 || '',
            處方日期: prescription.處方日期,
            藥物名稱: prescription.藥物名稱,
            劑型: prescription.劑型,
            服用途徑: prescription.服用途徑,
            服用次數: prescription.服用次數,
            服用份量: prescription.服用份量,
            服用日數: prescription.服用日數,
            藥物來源: prescription.藥物來源,
            需要時: prescription.需要時
          };
        });
        
        filename = `VMO處方箋_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // 使用處方箋匯出功能
        await exportPrescriptionsToExcel(exportData, filename, '處方記錄');
      }

    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗，請重試');
    }
  };

  const addFilter = () => {
    const newFilter: FilterOption = {
      id: Date.now().toString(),
      field: '藥物名稱',
      operator: 'contains',
      value: '',
      label: ''
    };
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<FilterOption>) => {
    setFilters(filters.map(filter => 
      filter.id === id ? { ...filter, ...updates } : filter
    ));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(filter => filter.id !== id));
  };

  const clearAllFilters = () => {
    setFilters([]);
    setSearchTerm('');
    setDateFilter('');
    setAdvancedFilters({
      床號: '',
      中文姓名: '',
      藥物名稱: '',
      劑型: '',
      服用途徑: '',
      藥物來源: '',
      需要時: '',
      記錄人員: '',
      備註: '',
      startDate: '',
      endDate: ''
    });
  };

  const getFieldOptions = () => [
    { value: '床號', label: '床號' },
    { value: '中文姓名', label: '中文姓名' },
    { value: '藥物名稱', label: '藥物名稱' },
    { value: '劑型', label: '劑型' },
    { value: '服用途徑', label: '服用途徑' },
    { value: '藥物來源', label: '藥物來源' },
    { value: '需要時', label: '需要時' },
    { value: '處方日期', label: '處方日期' }
  ];

  const getOperatorOptions = () => [
    { value: 'contains', label: '包含' },
    { value: 'equals', label: '等於' },
    { value: 'startsWith', label: '開始於' },
    { value: 'endsWith', label: '結束於' },
    { value: 'greaterThan', label: '大於' },
    { value: 'lessThan', label: '小於' }
  ];

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">藥物登記</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleOCRScan}
            className="btn-secondary flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>上傳掃描</span>
          </button>
          <button
            onClick={() => {
              setSelectedPrescription(null);
              setShowMedicationModal(true);
            }}
            className="btn-secondary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>手動登記</span>
          </button>
          <button
            onClick={handleExportSelected}
            className="btn-primary flex items-center space-x-2"
            disabled={selectedRows.size === 0}
          >
            <Download className="h-4 w-4" />
            <span>匯出選定記錄</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索藥物名稱、院友姓名、床號、處方日期、劑型、服用途徑、藥物來源、服用次數、服用份量..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-input lg:w-40"
                title="按處方日期篩選"
              />
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn-secondary flex items-center space-x-2 ${
                  showAdvancedFilters ? 'bg-blue-50 text-blue-700' : ''
                } ${hasAdvancedFilters() ? 'border-blue-300' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>進階篩選</span>
                {hasAdvancedFilters() && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    已套用
                  </span>
                )}
              </button>
              
              {(searchTerm || dateFilter || filters.length > 0 || hasAdvancedFilters()) && (
                <button
                  onClick={clearAllFilters}
                  className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  <span>清除</span>
                </button>
              )}
            </div>
          </div>
          
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">進階篩選</h3>
              
              <div className="mb-4">
                <label className="form-label">處方日期區間</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={advancedFilters.startDate}
                    onChange={(e) => updateAdvancedFilter('startDate', e.target.value)}
                    className="form-input"
                    placeholder="開始日期"
                  />
                  <span className="text-gray-500">至</span>
                  <input
                    type="date"
                    value={advancedFilters.endDate}
                    onChange={(e) => updateAdvancedFilter('endDate', e.target.value)}
                    className="form-input"
                    placeholder="結束日期"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">床號</label>
                  <input
                    type="text"
                    value={advancedFilters.床號}
                    onChange={(e) => updateAdvancedFilter('床號', e.target.value)}
                    className="form-input"
                    placeholder="搜索床號..."
                  />
                </div>
                
                <div>
                  <label className="form-label">中文姓名</label>
                  <input
                    type="text"
                    value={advancedFilters.中文姓名}
                    onChange={(e) => updateAdvancedFilter('中文姓名', e.target.value)}
                    className="form-input"
                    placeholder="搜索姓名..."
                  />
                </div>
                
                <div>
                  <label className="form-label">藥物名稱</label>
                  <input
                    type="text"
                    value={advancedFilters.藥物名稱}
                    onChange={(e) => updateAdvancedFilter('藥物名稱', e.target.value)}
                    className="form-input"
                    placeholder="搜索藥物名稱..."
                  />
                </div>
                
                <div>
                  <label className="form-label">劑型</label>
                  <input
                    list="dosage-form-options"
                    value={advancedFilters.劑型}
                    onChange={(e) => updateAdvancedFilter('劑型', e.target.value)}
                    className="form-input"
                    placeholder="選擇或輸入劑型..."
                  />
                  <datalist id="dosage-form-options">
                    {getUniqueOptions('劑型').map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="form-label">服用途徑</label>
                  <input
                    list="route-options"
                    value={advancedFilters.服用途徑}
                    onChange={(e) => updateAdvancedFilter('服用途徑', e.target.value)}
                    className="form-input"
                    placeholder="選擇或輸入服用途徑..."
                  />
                  <datalist id="route-options">
                    {getUniqueOptions('服用途徑').map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="form-label">藥物來源</label>
                  <input
                    list="source-options"
                    value={advancedFilters.藥物來源}
                    onChange={(e) => updateAdvancedFilter('藥物來源', e.target.value)}
                    className="form-input"
                    placeholder="選擇或輸入藥物來源..."
                  />
                  <datalist id="source-options">
                    {getUniqueOptions('藥物來源').map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="form-label">需要時</label>
                  <select
                    value={advancedFilters.需要時}
                    onChange={(e) => updateAdvancedFilter('需要時', e.target.value)}
                    className="form-input"
                  >
                    <option value="">所有類型</option>
                    <option value="是">需要時</option>
                    <option value="否">定服</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`btn-secondary flex items-center space-x-2 ${showFilterPanel ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>自訂篩選</span>
                {filters.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {filters.length}
                  </span>
                )}
              </button>
              {(filters.length > 0 || hasAdvancedFilters()) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  清除所有篩選
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              顯示 {filteredPrescriptions.length} / {prescriptions.length} 筆處方記錄
              {(searchTerm || dateFilter || filters.length > 0 || hasAdvancedFilters()) && (
                <span className="text-blue-600 ml-2">已套用篩選條件</span>
              )}
            </div>
          </div>
          
          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">自訂篩選條件</h3>
                <button
                  onClick={addFilter}
                  className="btn-secondary text-sm flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>新增條件</span>
                </button>
              </div>
              
              {filters.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  點擊「新增條件」來建立篩選條件
                </p>
              ) : (
                <div className="space-y-3">
                  {filters.map((filter, index) => (
                    <div key={filter.id} className="flex items-center space-x-2 bg-white p-3 rounded border">
                      {index > 0 && (
                        <span className="text-sm text-gray-500 font-medium">且</span>
                      )}
                      
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                        className="form-input text-sm flex-1"
                      >
                        {getFieldOptions().map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                        className="form-input text-sm flex-1"
                      >
                        {getOperatorOptions().map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      
                      {filter.field === '處方日期' ? (
                        <input
                          type="date"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          className="form-input text-sm flex-1"
                        />
                      ) : filter.field === '需要時' ? (
                        <select
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          className="form-input text-sm flex-1"
                        >
                          <option value="">請選擇</option>
                          <option value="是">是</option>
                          <option value="否">否</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          className="form-input text-sm flex-1"
                          placeholder="輸入篩選值..."
                        />
                      )}
                      
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="移除此條件"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selection Controls */}
      {sortedPrescriptions.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedRows.size === sortedPrescriptions.length ? '取消全選' : '全選'}
              </button>
              <button
                onClick={handleInvertSelection}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                反選
              </button>
              {selectedRows.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                  disabled={deletingIds.size > 0}
                >
                  刪除選定記錄 ({selectedRows.size})
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              已選擇 {selectedRows.size} / {sortedPrescriptions.length} 筆記錄
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {sortedPrescriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === sortedPrescriptions.length && sortedPrescriptions.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <SortableHeader field="中文姓名">院友</SortableHeader>
                  <SortableHeader field="處方日期">處方日期</SortableHeader>
                  <SortableHeader field="藥物名稱">藥物名稱</SortableHeader>
                  <SortableHeader field="劑型">劑型</SortableHeader>
                  <SortableHeader field="需要時">需要時</SortableHeader>
                  <SortableHeader field="服用途徑">服用途徑</SortableHeader>
                  <SortableHeader field="服用次數">服用次數</SortableHeader>
                  <SortableHeader field="服用份量">服用份量</SortableHeader>
                  <SortableHeader field="服用日數">服用日數</SortableHeader>
                  <SortableHeader field="藥物來源">藥物來源</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    服用時間
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPrescriptions.map(prescription => {
                  const patient = patients.find(p => p.院友id === prescription.院友id);
                  return (
                    <tr 
                      key={prescription.處方id} 
                      className={`hover:bg-gray-50 ${selectedRows.has(prescription.處方id) ? 'bg-blue-50' : ''}`}
                     onDoubleClick={() => handleEdit(prescription)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(prescription.處方id)}
                          onChange={() => handleSelectRow(prescription.處方id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
                            {patient?.院友相片 ? (
                              <img 
                                src={patient.院友相片} 
                                alt={patient.中文姓名} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient ? (
                                <PatientTooltip patient={patient}>
                                  <span className="cursor-help hover:text-blue-600 transition-colors">
                                    {patient.中文姓名}
                                  </span>
                                </PatientTooltip>
                              ) : (
                                '-'
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{patient?.床號}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(prescription.處方日期).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {prescription.藥物名稱}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prescription.劑型 || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prescription.需要時 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {prescription.需要時 ? '需要時' : '定服'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prescription.服用途徑 || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prescription.服用次數 || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prescription.服用份量 || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prescription.服用日數 || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {prescription.藥物來源}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-wrap gap-1">
                          {(prescription.服用時間 && Array.isArray(prescription.服用時間)) ? prescription.服用時間.map((time, index) => (
                            <span key={index} className={`inline-flex items-center px-2 py-1 rounded text-xs border ${getMedicationTimeColorClass(time)}`}>
                              {time}
                            </span>
                          )) : null}
                          {(!prescription.服用時間 || !Array.isArray(prescription.服用時間) || prescription.服用時間.length === 0) && (
                            <span className="text-gray-500">未設定</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(prescription)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編輯"
                            disabled={deletingIds.has(prescription.處方id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prescription.處方id)}
                            className="text-red-600 hover:text-red-900"
                            title="刪除"
                            disabled={deletingIds.has(prescription.處方id)}
                          >
                            {deletingIds.has(prescription.處方id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Pill className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || dateFilter || filters.length > 0 || hasAdvancedFilters() ? '找不到符合條件的處方' : '暫無處方記錄'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || dateFilter || filters.length > 0 || hasAdvancedFilters() ? '請嘗試調整搜索條件' : '開始掃描藥物標籤或手動登記'}
            </p>
            {!searchTerm && !dateFilter && filters.length === 0 && !hasAdvancedFilters() ? (
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleCameraCapture}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>拍照掃描</span>
                </button>
                <button
                  onClick={() => setShowMedicationModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>手動登記</span>
                </button>
              </div>
            ) : (
              <button
                onClick={clearAllFilters}
                className="btn-secondary"
              >
                清除所有篩選
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showMedicationModal && (
        <MedicationModal
          prescription={selectedPrescription}
          onClose={() => {
            setShowMedicationModal(false);
            setSelectedPrescription(null);
          }}
        />
      )}

      {showOCRModal && (
        <OCRModal
          onClose={() => setShowOCRModal(false)}
          onResult={(data) => {
            setShowOCRModal(false);
            console.log('OCR Result:', data);
          }}
        />
      )}
    </div>
  );
};

export default MedicationRegistration;