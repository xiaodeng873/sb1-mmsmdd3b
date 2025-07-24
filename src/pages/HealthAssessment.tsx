import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Activity, 
  Droplets, 
  Scale, 
  Heart,
  Edit,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import HealthRecordModal from '../components/HealthRecordModal';
import type { HealthRecord } from '../context/PatientContext';

const HealthAssessment: React.FC = () => {
  const { patients, healthRecords, deleteHealthRecord, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [residencyFilter, setResidencyFilter] = useState<'在住' | '已退住' | '全部'>('在住');

  // 篩選健康記錄
  const filteredRecords = useMemo(() => {
    return healthRecords.filter(record => {
      const patient = patients.find(p => p.院友id === record.院友id);
      if (!patient) return false;

      // 根據在住狀態篩選
      if (residencyFilter !== '全部' && patient.在住狀態 !== residencyFilter) {
        return false;
      }

      // 搜索條件
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesPatientName = patient.中文姓名.toLowerCase().includes(searchLower);
        const matchesBedNumber = patient.床號.toLowerCase().includes(searchLower);
        const matchesNotes = record.備註?.toLowerCase().includes(searchLower) || false;
        
        if (!matchesPatientName && !matchesBedNumber && !matchesNotes) {
          return false;
        }
      }

      // 記錄類型篩選
      if (selectedType && record.記錄類型 !== selectedType) {
        return false;
      }

      // 院友篩選
      if (selectedPatient && record.院友id !== parseInt(selectedPatient)) {
        return false;
      }

      // 日期範圍篩選
      if (startDate && record.記錄日期 < startDate) {
        return false;
      }
      if (endDate && record.記錄日期 > endDate) {
        return false;
      }

      return true;
    });
  }, [healthRecords, patients, searchTerm, selectedType, selectedPatient, startDate, endDate, residencyFilter]);

  // 獲取記錄類型圖標
  const getTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-5 w-5" />;
      case '血糖控制': return <Droplets className="h-5 w-5" />;
      case '體重控制': return <Scale className="h-5 w-5" />;
      default: return <Heart className="h-5 w-5" />;
    }
  };

  // 獲取記錄類型顏色
  const getTypeColor = (type: string) => {
    switch (type) {
      case '生命表徵': return 'text-blue-600 bg-blue-100';
      case '血糖控制': return 'text-red-600 bg-red-100';
      case '體重控制': return 'text-green-600 bg-green-100';
      default: return 'text-purple-600 bg-purple-100';
    }
  };

  // 處理編輯
  const handleEdit = (record: HealthRecord) => {
    setEditingRecord(record);
    setShowModal(true);
  };

  // 處理刪除
  const handleDelete = async (id: number) => {
    if (window.confirm('確定要刪除這筆健康記錄嗎？')) {
      try {
        await deleteHealthRecord(id);
      } catch (error) {
        alert('刪除失敗，請重試');
      }
    }
  };

  // 清除篩選
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedPatient('');
    setStartDate('');
    setEndDate('');
    setResidencyFilter('在住');
  };

  // 格式化數值顯示
  const formatValue = (value: number | null | undefined, unit: string) => {
    return value ? `${value}${unit}` : '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作按鈕 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">健康評估</h1>
          <p className="text-gray-600">管理院友健康記錄和監測數據</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>匯出</span>
          </button>
          <button
            onClick={() => {
              setEditingRecord(undefined);
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* 基本搜索 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="搜索院友姓名、床號或備註..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn-secondary flex items-center space-x-2 ${showAdvancedFilters ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>進階篩選</span>
                {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {(searchTerm || selectedType || selectedPatient || startDate || endDate || residencyFilter !== '在住') && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary text-red-600 hover:bg-red-50"
                >
                  清除篩選
                </button>
              )}
            </div>
          </div>

          {/* 進階篩選 */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="form-label">記錄類型</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="form-input"
                >
                  <option value="">全部類型</option>
                  <option value="生命表徵">生命表徵</option>
                  <option value="血糖控制">血糖控制</option>
                  <option value="體重控制">體重控制</option>
                </select>
              </div>

              <div>
                <label className="form-label">院友</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="form-input"
                >
                  <option value="">全部院友</option>
                  {patients
                    .filter(p => residencyFilter === '全部' || p.在住狀態 === residencyFilter)
                    .map(patient => (
                    <option key={patient.院友id} value={patient.院友id}>
                      {patient.床號} - {patient.中文姓名}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">開始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">結束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">在住狀態</label>
                <select
                  value={residencyFilter}
                  onChange={(e) => setResidencyFilter(e.target.value as '在住' | '已退住' | '全部')}
                  className="form-input"
                >
                  <option value="在住">僅在住</option>
                  <option value="已退住">僅已退住</option>
                  <option value="全部">全部</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 記錄列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">健康記錄</h2>
            <span className="text-sm text-gray-500">共 {filteredRecords.length} 筆記錄</span>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">沒有找到符合條件的健康記錄</p>
            <p className="text-sm text-gray-400">嘗試調整搜索條件或新增記錄</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    院友資訊
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    記錄類型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    記錄時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    主要數據
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    備註
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => {
                  const patient = patients.find(p => p.院友id === record.院友id);
                  return (
                    <tr key={record.記錄id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-lg mr-3">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient?.中文姓名 || '未知'}
                            </div>
                            <div className="text-sm text-gray-500">
                              床號: {patient?.床號 || '-'}
                            </div>
                            {patient?.在住狀態 === '已退住' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                                已退住
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(record.記錄類型)}`}>
                          {getTypeIcon(record.記錄類型)}
                          <span className="ml-2">{record.記錄類型}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {record.記錄日期}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          {record.記錄時間}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {record.記錄類型 === '生命表徵' && (
                            <div className="space-y-1">
                              {(record.血壓收縮壓 || record.血壓舒張壓) && (
                                <div>血壓: {record.血壓收縮壓 || '-'}/{record.血壓舒張壓 || '-'} mmHg</div>
                              )}
                              {record.脈搏 && <div>脈搏: {record.脈搏} bpm</div>}
                              {record.體溫 && <div>體溫: {record.體溫}°C</div>}
                              {record.血含氧量 && <div>血氧: {record.血含氧量}%</div>}
                            </div>
                          )}
                          {record.記錄類型 === '血糖控制' && record.血糖值 && (
                            <div>血糖: {record.血糖值} mmol/L</div>
                          )}
                          {record.記錄類型 === '體重控制' && record.體重 && (
                            <div>體重: {record.體重} kg</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {record.備註 || '-'}
                        </div>
                        {record.記錄人員 && (
                          <div className="text-xs text-gray-400 mt-1">
                            記錄人: {record.記錄人員}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="編輯"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => record.記錄id && handleDelete(record.記錄id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
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
        )}
      </div>

      {/* 健康記錄模態框 */}
      {showModal && (
        <HealthRecordModal
          record={editingRecord}
          onClose={() => {
            setShowModal(false);
            setEditingRecord(undefined);
          }}
        />
      )}
    </div>
  );
};

export default HealthAssessment;