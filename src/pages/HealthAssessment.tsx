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
  Upload
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
    
    // 日期篩選
    if (dateFilter && record.記錄日期 !== dateFilter) {
      return false;
    }
    
    const matchesSearch = patient?.中文姓名.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const calculateWeightChange = (currentWeight: number, patientId: number, currentDate: string): string => {
    // 找到同一院友的上一次體重記錄
    const patientWeightRecords = healthRecords
      .filter(r => r.院友id === patientId && r.體重 && r.記錄日期 !== currentDate)
      .sort((a, b) => new Date(`${b.記錄日期} ${b.記錄時間}`).getTime() - new Date(`${a.記錄日期} ${a.記錄時間}`).getTime());
    
    if (patientWeightRecords.length === 0) {
      return '首次記錄';
    }
    
    const lastWeight = patientWeightRecords[0].體重!;
    const difference = currentWeight - lastWeight;
    const percentage = ((difference / lastWeight) * 100);
    
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">狀況評估</h1>
        <div className="flex items-center space-x-2">
          <div className="relative group">
            <button className="btn-secondary flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>匯出 Excel</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => handleExportSelected('生命表徵')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Activity className="h-4 w-4 text-blue-600" />
                <span>生命表徵記錄表</span>
              </button>
              <button
                onClick={() => handleExportSelected('血糖控制')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Droplets className="h-4 w-4 text-red-600" />
                <span>血糖測試記錄表</span>
              </button>
              <button
                onClick={() => handleExportSelected('體重控制')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Scale className="h-4 w-4 text-green-600" />
                <span>體重記錄表</span>
              </button>
            </div>
          </div>
          
          <div className="relative group">
            <button className="btn-secondary flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>批量上傳</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => handleBatchUpload('生命表徵')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Activity className="h-4 w-4 text-blue-600" />
                <span>批量新增生命表徵</span>
              </button>
              <button
                onClick={() => handleBatchUpload('血糖控制')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Droplets className="h-4 w-4 text-red-600" />
                <span>批量新增血糖記錄</span>
              </button>
              <button
                onClick={() => handleBatchUpload('體重控制')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Scale className="h-4 w-4 text-green-600" />
                <span>批量新增體重記錄</span>
              </button>
            </div>
          </div>
          
          <button
            onClick={() => {
              setSelectedRecord(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>新增記錄</span>
          </button>
        </div>
      </div>



      {/* 搜索和篩選 */}
      <div className="card p-4">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索院友姓名、床號、記錄日期或備註..."
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
                title="按記錄日期篩選"
              />
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn-secondary flex items-center space-x-2 ${showAdvancedFilters ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>進階篩選</span>
              </button>
              
              {(searchTerm || selectedType !== 'all' || dateFilter) && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  <span>清除</span>
                </button>
              )}
            </div>
          </div>
          
          {/* 進階篩選面板 */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">記錄類型</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as RecordType)}
                    className="form-input"
                  >
                    <option value="all">所有類型</option>
                    <option value="生命表徵">生命表徵</option>
                    <option value="血糖控制">血糖控制</option>
                    <option value="體重控制">體重控制</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* 搜索結果統計 */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>顯示 {sortedRecords.length} / {healthRecords.length} 筆健康記錄</span>
            {(searchTerm || selectedType !== 'all' || dateFilter) && (
              <span className="text-blue-600">已套用篩選條件</span>
            )}
          </div>
        </div>
      </div>

      {/* 選擇控制 */}
      {sortedRecords.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedRows.size === sortedRecords.length ? '取消全選' : '全選'}
              </button>
            </div>
            <div className="text-sm text-gray-600">
              已選擇 {selectedRows.size} / {sortedRecords.length} 筆記錄
            </div>
          </div>
        </div>
      )}

      {/* 記錄表格 */}
      <div className="card overflow-hidden">
        {sortedRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === sortedRecords.length && sortedRecords.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <SortableHeader field="記錄日期">日期時間</SortableHeader>
                  <SortableHeader field="院友姓名">院友</SortableHeader>
                  <SortableHeader field="記錄類型">類型</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    生命表徵
                  </th>
                  <SortableHeader field="血糖值">血糖值</SortableHeader>
                  <SortableHeader field="體重">體重</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    備註
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(record.記錄id)}
                          onChange={() => handleSelectRow(record.記錄id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div>{new Date(record.記錄日期).toLocaleDateString('zh-TW')}</div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {record.記錄時間}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
                            {patient?.院友相片 ? (
                              <img 
                                src={patient.院友相片} 
                                alt={patient.中文姓名} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{patient?.中文姓名}</div>
                            <div className="text-xs text-gray-500">{patient?.床號}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRecordTypeColor(record.記錄類型)}`}>
                          {getRecordTypeIcon(record.記錄類型)}
                          <span className="ml-1">{record.記錄類型}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          {record.血壓收縮壓 && record.血壓舒張壓 && (
                            <div className="text-xs">血壓: {record.血壓收縮壓}/{record.血壓舒張壓} mmHg</div>
                          )}
                          {record.脈搏 && (
                            <div className="text-xs">脈搏: {record.脈搏} /min</div>
                          )}
                          {record.體溫 && (
                            <div className="text-xs">體溫: {record.體溫}°C</div>
                          )}
                          {record.血含氧量 && (
                            <div className="text-xs">血氧: {record.血含氧量}%</div>
                          )}
                          {record.呼吸頻率 && (
                            <div className="text-xs">呼吸: {record.呼吸頻率} /min</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.血糖值 ? `${record.血糖值} mmol/L` : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.體重 ? (
                          <div>
                            <div className="font-medium">{record.體重} kg</div>
                            {weightChange && weightChange !== '首次記錄' && weightChange !== '無變化' && (
                              <div className={`text-xs flex items-center ${
                                weightChange.startsWith('+') ? 'text-red-600' : 'text-green-600'
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
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {record.備註 || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編輯"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.記錄id)}
                            className="text-red-600 hover:text-red-900"
                            title="刪除"
                          >
                            <Trash2 className="h-4 w-4" />
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
            <Heart className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedType !== 'all' || dateFilter ? '找不到符合條件的記錄' : '暫無健康記錄'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType !== 'all' || dateFilter ? '請嘗試調整搜索條件' : '開始記錄院友的健康狀況'}
            </p>
            {!searchTerm && selectedType === 'all' && !dateFilter ? (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                新增健康記錄
              </button>
            ) : (
              <button
                onClick={clearFilters}
                className="btn-secondary"
              >
                清除所有篩選
              </button>
            )}
          </div>
        )}
      </div>

      {/* 模態框 */}
      {showModal && (
        <HealthRecordModal
          record={selectedRecord}
          onClose={() => {
            setShowModal(false);
            setSelectedRecord(null);
          }}
        />
      )}

      {/* 批量上傳模態框 */}
      {showBatchModal && (
        <BatchHealthRecordModal
          recordType={batchRecordType}
          onClose={() => setShowBatchModal(false)}
        />
      )}
    </div>
  );
};

export default HealthAssessment;