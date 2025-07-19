import React, { useState } from 'react';
import { 
  Heart, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  Activity,
  Droplets,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  User,
  ChevronUp,
  ChevronDown,
  Download,
  Upload,
  X 
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import HealthRecordModal from '../components/HealthRecordModal';
import BatchHealthRecordModal from '../components/BatchHealthRecordModal';
import { exportHealthRecordsToExcel, type HealthRecordExportData } from '../utils/healthRecordExcelGenerator';

type RecordType = '生命表徵' | '血糖控制' | '體重控制' | 'all';
type SortField = '記錄日期' | '記錄時間' | '院友姓名' | '記錄類型' | '體重' | '血糖值' | '血壓';
type SortDirection = 'asc' | 'desc';

const HealthAssessment: React.FC = () => {
  const { healthRecords, patients, loading, deleteHealthRecord } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<RecordType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('記錄日期');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchRecordType, setBatchRecordType] = useState<'生命表徵' | '血糖控制' | '體重控制'>('生命表徵');
  const [dateFilter, setDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  const filteredRecords = healthRecords.filter(record => {
    const patient = patients.find(p => p.院友id === record.院友id);
    if (dateFilter && record.記錄日期 !== dateFilter) {
      return false;
    }
    const matchesSearch = patient?.中文姓名?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.床號?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.備註?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         new Date(record.記錄日期).toLocaleDateString('zh-TW').includes(searchTerm.toLowerCase()) ||
                         false;
    const matchesType = selectedType === 'all' || record.記錄類型 === selectedType;
    return matchesSearch && matchesType;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const patientA = patients.find(p => p.院友id === a.院友id);
    const patientB = patients.find(p => p.院友id === b.院友id);

    let valueA: string | number = '';
    let valueB: string | number = '';

    switch (sortField) {
      case '記錄日期':
        valueA = new Date(`${a.記錄日期} ${a.記錄時間}`).getTime();
        valueB = new Date(`${b.記錄日期} ${b.記錄時間}`).getTime();
        break;
      case '記錄時間':
        valueA = a.記錄時間;
        valueB = b.記錄時間;
        break;
      case '院友姓名':
        valueA = patientA?.中文姓名 || '';
        valueB = patientB?.中文姓名 || '';
        break;
      case '記錄類型':
        valueA = a.記錄類型;
        valueB = b.記錄類型;
        break;
      case '體重':
        valueA = a.體重 || 0;
        valueB = b.體重 || 0;
        break;
      case '血糖值':
        valueA = a.血糖值 || 0;
        valueB = b.血糖值 || 0;
        break;
      case '血壓':
        valueA = (a.血壓收縮壓 || 0) + (a.血壓舒張壓 || 0);
        valueB = (b.血壓收縮壓 || 0) + (b.血壓舒張壓 || 0);
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

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const record = healthRecords.find(r => r.記錄id === id);
    const patient = patients.find(p => p.院友id === record?.院友id);

    if (confirm(`確定要刪除 ${patient?.中文姓名} 在 ${record?.記錄日期} ${record?.記錄時間} 的${record?.記錄類型}記錄嗎？`)) {
      try {
        await deleteHealthRecord(id);
      } catch (error) {
        alert('刪除記錄失敗，請重試');
      }
    }
  };

  const handleSelectRow = (recordId: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === sortedRecords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedRecords.map(r => r.記錄id)));
    }
  };

  const handleExportSelected = async (recordType: '生命表徵' | '血糖控制' | '體重控制') => {
    const filteredByType = sortedRecords.filter(record => record.記錄類型 === recordType);
    const selectedRecords = selectedRows.size > 0 
      ? filteredByType.filter(r => selectedRows.has(r.記錄id))
      : filteredByType;

    if (selectedRecords.length === 0) {
      alert(`沒有${recordType}記錄可匯出`);
      return;
    }

    try {
      const exportData: HealthRecordExportData[] = selectedRecords.map(record => {
        const patient = patients.find(p => p.院友id === record.院友id);
        return {
          記錄id: record.記錄id,
          床號: patient?.床號 || '',
          中文姓名: patient?.中文姓名 || '',
          記錄日期: record.記錄日期,
          記錄時間: record.記錄時間,
          記錄類型: record.記錄類型,
          血壓收縮壓: record.血壓收縮壓,
          血壓舒張壓: record.血壓舒張壓,
          脈搏: record.脈搏,
          體溫: record.體溫,
          血含氧量: record.血含氧量,
          呼吸頻率: record.呼吸頻率,
          血糖值: record.血糖值,
          體重: record.體重,
          備註: record.備註,
          記錄人員: record.記錄人員
        };
      });

      await exportHealthRecordsToExcel(exportData, recordType);

    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗，請重試');
    }
  };

  const handleBatchUpload = (recordType: '生命表徵' | '血糖控制' | '體重控制') => {
    setBatchRecordType(recordType);
    setShowBatchModal(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setDateFilter('');
  };

  // 修正版：以同一院友所有有體重值的記錄中，最早的那筆（且排除當前日期）的體重作為比對標準
  const calculateWeightChange = (currentWeight: number, patientId: number, currentDate: string): string => {
    const records = healthRecords
      .filter(r => r.院友id === patientId && r.體重 && r.記錄日期 !== currentDate)
      .map(r => ({
        ...r,
        dateTime: new Date(`${r.記錄日期} ${r.記錄時間}`)
      }));

    if (records.length === 0) {
      return '首次記錄';
    }

    // 找到最早有體重的記錄
    records.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const firstWeight = records[0].體重;

    const difference = currentWeight - firstWeight;
    const percentage = firstWeight !== 0 ? (difference / firstWeight) * 100 : 0;

    if (Math.abs(percentage) < 0.1) {
      return '無變化';
    }
    const sign = difference > 0 ? '+' : '';
    return `${sign}${difference.toFixed(1)}kg (${sign}${percentage.toFixed(1)}%)`;
  };

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case '生命表徵': return 'bg-blue-100 text-blue-800';
      case '血糖控制': return 'bg-red-100 text-red-800';
      case '體重控制': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  // 統計數據
  const stats = {
    total: healthRecords.length,
    vitalSigns: healthRecords.filter(r => r.記錄類型 === '生命表徵').length,
    bloodSugar: healthRecords.filter(r => r.記錄類型 === '血糖控制').length,
    weight: healthRecords.filter(r => r.記錄類型 === '體重控制').length,
    today: healthRecords.filter(r => r.記錄日期 === new Date().toISOString().split('T')[0]).length
  };

  return (
    <div className="space-y-6">
      {/* ...（略，與你的原有設計一致）... */}
      <div className="card overflow-hidden">
        {sortedRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* ...略... */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRecords.map(record => {
                  const patient = patients.find(p => p.院友id === record.院友id);
                  const weightChange = record.體重 ? calculateWeightChange(record.體重, record.院友id, record.記錄日期) : null;
                  return (
                    <tr 
                      key={record.記錄id} 
                      className={`hover:bg-gray-50 ${selectedRows.has(record.記錄id) ? 'bg-blue-50' : ''}`}
                    >
                      {/* ...略... */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.體重 ? (
                          <div>
                            <div className="font-medium">{record.體重} kg</div>
                            {weightChange && weightChange !== '首次記錄' && weightChange !== '無變化' && (
                              <div className={`text-xs flex items-center ${
                                weightChange.startsWith('+') ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {weightChange.startsWith('+') ? 
                                  <TrendingUp className="h-3 w-3 mr-1" /> : 
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                }
                                {weightChange}
                              </div>
                            )}
                            {weightChange === '無變化' && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <Minus className="h-3 w-3 mr-1" />
                                {weightChange}
                              </div>
                            )}
                            {weightChange === '首次記錄' && (
                              <div className="text-xs text-blue-600">{weightChange}</div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      {/* ...略... */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // ...略...
          null
        )}
      </div>
      {/* ...其餘內容維持不變... */}
    </div>
  );
};

export default HealthAssessment;
