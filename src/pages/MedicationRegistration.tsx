import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Pill,
  Edit,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import MedicationModal from '../components/MedicationModal';
import type { Prescription } from '../context/PatientContext';

const MedicationRegistration: React.FC = () => {
  const { patients, prescriptions, deletePrescription, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [residencyFilter, setResidencyFilter] = useState<'在住' | '已退住' | '全部'>('在住');

  // 篩選處方記錄
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(prescription => {
      const patient = patients.find(p => p.院友id === prescription.院友id);
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
        const matchesMedicationName = prescription.藥物名稱.toLowerCase().includes(searchLower);
        
        if (!matchesPatientName && !matchesBedNumber && !matchesMedicationName) {
          return false;
        }
      }

      // 院友篩選
      if (selectedPatient && prescription.院友id !== parseInt(selectedPatient)) {
        return false;
      }

      // 藥物來源篩選
      if (selectedSource && prescription.藥物來源 !== selectedSource) {
        return false;
      }

      // 日期範圍篩選
      if (startDate && prescription.處方日期 < startDate) {
        return false;
      }
      if (endDate && prescription.處方日期 > endDate) {
        return false;
      }

      return true;
    });
  }, [prescriptions, patients, searchTerm, selectedPatient, selectedSource, startDate, endDate, residencyFilter]);

  // 獲取所有藥物來源
  const medicationSources = useMemo(() => {
    const sources = new Set(prescriptions.map(p => p.藥物來源));
    return Array.from(sources).sort();
  }, [prescriptions]);

  // 處理編輯
  const handleEdit = (prescription: Prescription) => {
    setEditingPrescription(prescription);
    setShowModal(true);
  };

  // 處理刪除
  const handleDelete = async (id: number) => {
    if (window.confirm('確定要刪除這筆處方記錄嗎？')) {
      try {
        await deletePrescription(id);
      } catch (error) {
        alert('刪除失敗，請重試');
      }
    }
  };

  // 清除篩選
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPatient('');
    setSelectedSource('');
    setStartDate('');
    setEndDate('');
    setResidencyFilter('在住');
  };

  // 格式化服用時間
  const formatMedicationTimes = (times: string[] | undefined) => {
    if (!times || times.length === 0) return '-';
    return times.join(', ');
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
          <h1 className="text-2xl font-bold text-gray-900">藥物登記</h1>
          <p className="text-gray-600">管理院友處方藥物和用藥記錄</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>匯出</span>
          </button>
          <button
            onClick={() => {
              setEditingPrescription(undefined);
              setShowModal(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>新增處方</span>
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
                  placeholder="搜索院友姓名、床號或藥物名稱..."
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
              {(searchTerm || selectedPatient || selectedSource || startDate || endDate || residencyFilter !== '在住') && (
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
                <label className="form-label">藥物來源</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="form-input"
                >
                  <option value="">全部來源</option>
                  {medicationSources.map(source => (
                    <option key={source} value={source}>
                      {source}
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

      {/* 處方列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">處方記錄</h2>
            <span className="text-sm text-gray-500">共 {filteredPrescriptions.length} 筆記錄</span>
          </div>
        </div>

        {filteredPrescriptions.length === 0 ? (
          <div className="p-12 text-center">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">沒有找到符合條件的處方記錄</p>
            <p className="text-sm text-gray-400">嘗試調整搜索條件或新增處方</p>
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
                    藥物資訊
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    處方日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用法用量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    服用時間
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPrescriptions.map((prescription) => {
                  const patient = patients.find(p => p.院友id === prescription.院友id);
                  return (
                    <tr key={prescription.處方id} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {prescription.藥物名稱}
                        </div>
                        <div className="text-sm text-gray-500">
                          來源: {prescription.藥物來源}
                        </div>
                        {prescription.劑型 && (
                          <div className="text-sm text-gray-500">
                            劑型: {prescription.劑型}
                          </div>
                        )}
                        {prescription.需要時 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mt-1">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            需要時
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          {prescription.處方日期}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 space-y-1">
                          {prescription.服用途徑 && (
                            <div>途徑: {prescription.服用途徑}</div>
                          )}
                          {prescription.服用份量 && (
                            <div>份量: {prescription.服用份量}</div>
                          )}
                          {prescription.服用次數 && (
                            <div>次數: {prescription.服用次數}</div>
                          )}
                          {prescription.服用日數 && (
                            <div>日數: {prescription.服用日數}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatMedicationTimes(prescription.服用時間)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(prescription)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="編輯"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => prescription.處方id && handleDelete(prescription.處方id)}
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

      {/* 處方模態框 */}
      {showModal && (
        <MedicationModal
          prescription={editingPrescription}
          onClose={() => {
            setShowModal(false);
            setEditingPrescription(undefined);
          }}
        />
      )}
    </div>
  );
};

export default MedicationRegistration;