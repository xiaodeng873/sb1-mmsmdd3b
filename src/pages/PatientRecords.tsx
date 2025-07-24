import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Edit, 
  Trash2, 
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  LogOut,
  RotateCcw,
  Heart,
  Shield,
  Home,
  Banknote
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import PatientModal from '../components/PatientModal';
import { calculateResidencyPeriod, formatSocialWelfare } from '../utils/patientUtils';
import type { Patient } from '../context/PatientContext';

const PatientRecords: React.FC = () => {
  const { patients, deletePatient, dischargePatient, cancelDischarge, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedNursingLevel, setSelectedNursingLevel] = useState<string>('');
  const [selectedAdmissionType, setSelectedAdmissionType] = useState<string>('');
  const [selectedResidencyStatus, setSelectedResidencyStatus] = useState<string>('在住');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargingPatient, setDischargingPatient] = useState<Patient | null>(null);
  const [dischargeDate, setDischargeDate] = useState('');

  // 篩選院友
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      // 搜索條件
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = patient.中文姓名.toLowerCase().includes(searchLower);
        const matchesEnglishName = patient.英文姓名?.toLowerCase().includes(searchLower) || false;
        const matchesBedNumber = patient.床號.toLowerCase().includes(searchLower);
        const matchesIdNumber = patient.身份證號碼?.toLowerCase().includes(searchLower) || false;
        
        if (!matchesName && !matchesEnglishName && !matchesBedNumber && !matchesIdNumber) {
          return false;
        }
      }

      // 性別篩選
      if (selectedGender && patient.性別 !== selectedGender) {
        return false;
      }

      // 護理等級篩選
      if (selectedNursingLevel && patient.護理等級 !== selectedNursingLevel) {
        return false;
      }

      // 入住類型篩選
      if (selectedAdmissionType && patient.入住類型 !== selectedAdmissionType) {
        return false;
      }

      // 在住狀態篩選
      if (selectedResidencyStatus !== '全部') {
        const status = patient.在住狀態 || '在住';
        if (status !== selectedResidencyStatus) {
          return false;
        }
      }

      return true;
    });
  }, [patients, searchTerm, selectedGender, selectedNursingLevel, selectedAdmissionType, selectedResidencyStatus]);

  // 處理編輯
  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setShowModal(true);
  };

  // 處理刪除
  const handleDelete = async (id: number) => {
    if (window.confirm('確定要刪除這位院友的記錄嗎？此操作無法復原。')) {
      try {
        await deletePatient(id);
      } catch (error) {
        alert('刪除失敗，請重試');
      }
    }
  };

  // 處理退住
  const handleDischarge = (patient: Patient) => {
    setDischargingPatient(patient);
    setDischargeDate(new Date().toISOString().split('T')[0]);
    setShowDischargeModal(true);
  };

  // 確認退住
  const confirmDischarge = async () => {
    if (!dischargingPatient || !dischargeDate) return;

    try {
      await dischargePatient(dischargingPatient.院友id, dischargeDate);
      setShowDischargeModal(false);
      setDischargingPatient(null);
      setDischargeDate('');
    } catch (error) {
      alert('退住操作失敗，請重試');
    }
  };

  // 處理取消退住
  const handleCancelDischarge = async (patient: Patient) => {
    if (window.confirm('確定要取消退住，恢復此院友的在住狀態嗎？')) {
      try {
        await cancelDischarge(patient.院友id);
      } catch (error) {
        alert('取消退住失敗，請重試');
      }
    }
  };

  // 清除篩選
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGender('');
    setSelectedNursingLevel('');
    setSelectedAdmissionType('');
    setSelectedResidencyStatus('在住');
  };

  // 獲取護理等級顏色
  const getNursingLevelColor = (level?: string) => {
    switch (level) {
      case '全護理': return 'bg-red-100 text-red-800';
      case '半護理': return 'bg-yellow-100 text-yellow-800';
      case '自理': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 獲取入住類型顏色
  const getAdmissionTypeColor = (type?: string) => {
    switch (type) {
      case '私位': return 'bg-blue-100 text-blue-800';
      case '買位': return 'bg-purple-100 text-purple-800';
      case '院舍卷': return 'bg-green-100 text-green-800';
      case '暫住': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 獲取在住狀態顏色
  const getResidencyStatusColor = (status?: string) => {
    switch (status) {
      case '在住': return 'bg-green-100 text-green-800';
      case '已退住': return 'bg-gray-100 text-gray-800';
      default: return 'bg-green-100 text-green-800';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">院友記錄</h1>
          <p className="text-gray-600">管理院友基本資料和入住資訊</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>匯出</span>
          </button>
          <button
            onClick={() => {
              setEditingPatient(undefined);
              setShowModal(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>新增院友</span>
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
                  placeholder="搜索院友姓名、床號或身份證號碼..."
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
              {(searchTerm || selectedGender || selectedNursingLevel || selectedAdmissionType || selectedResidencyStatus !== '在住') && (
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
                <label className="form-label">性別</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="form-input"
                >
                  <option value="">全部性別</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>

              <div>
                <label className="form-label">護理等級</label>
                <select
                  value={selectedNursingLevel}
                  onChange={(e) => setSelectedNursingLevel(e.target.value)}
                  className="form-input"
                >
                  <option value="">全部等級</option>
                  <option value="全護理">全護理</option>
                  <option value="半護理">半護理</option>
                  <option value="自理">自理</option>
                </select>
              </div>

              <div>
                <label className="form-label">入住類型</label>
                <select
                  value={selectedAdmissionType}
                  onChange={(e) => setSelectedAdmissionType(e.target.value)}
                  className="form-input"
                >
                  <option value="">全部類型</option>
                  <option value="私位">私位</option>
                  <option value="買位">買位</option>
                  <option value="院舍卷">院舍卷</option>
                  <option value="暫住">暫住</option>
                </select>
              </div>

              <div>
                <label className="form-label">在住狀態</label>
                <select
                  value={selectedResidencyStatus}
                  onChange={(e) => setSelectedResidencyStatus(e.target.value)}
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

      {/* 院友列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">院友列表</h2>
            <span className="text-sm text-gray-500">共 {filteredPatients.length} 位院友</span>
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">沒有找到符合條件的院友</p>
            <p className="text-sm text-gray-400">嘗試調整搜索條件或新增院友</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredPatients.map((patient) => (
              <div key={patient.院友id} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                {/* 院友基本資訊 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{patient.中文姓名}</h3>
                      <p className="text-sm text-gray-600">床號: {patient.床號}</p>
                      {patient.英文姓名 && (
                        <p className="text-sm text-gray-500">{patient.英文姓名}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResidencyStatusColor(patient.在住狀態)}`}>
                    {patient.在住狀態 || '在住'}
                  </span>
                </div>

                {/* 院友詳細資訊 */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">性別:</span>
                    <span className="text-sm font-medium text-gray-900">{patient.性別}</span>
                  </div>

                  {patient.出生日期 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">出生日期:</span>
                      <span className="text-sm font-medium text-gray-900">{patient.出生日期}</span>
                    </div>
                  )}

                  {patient.入住日期 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">入住日期:</span>
                      <span className="text-sm font-medium text-gray-900">{patient.入住日期}</span>
                    </div>
                  )}

                  {patient.退住日期 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">退住日期:</span>
                      <span className="text-sm font-medium text-gray-900">{patient.退住日期}</span>
                    </div>
                  )}

                  {(patient.入住日期 || patient.退住日期) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">居住期:</span>
                      <span className="text-sm font-medium text-blue-600">
                        {calculateResidencyPeriod(patient.入住日期, patient.退住日期)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 標籤區域 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {patient.護理等級 && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getNursingLevelColor(patient.護理等級)}`}>
                      <Heart className="h-3 w-3 mr-1" />
                      {patient.護理等級}
                    </span>
                  )}

                  {patient.入住類型 && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAdmissionTypeColor(patient.入住類型)}`}>
                      <Home className="h-3 w-3 mr-1" />
                      {patient.入住類型}
                    </span>
                  )}

                  {patient.社會福利 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      <Banknote className="h-3 w-3 mr-1" />
                      {formatSocialWelfare(patient.社會福利)}
                    </span>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(patient)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      title="編輯"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(patient.院友id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded"
                      title="刪除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex space-x-2">
                    {patient.在住狀態 === '已退住' ? (
                      <button
                        onClick={() => handleCancelDischarge(patient)}
                        className="btn-secondary text-sm flex items-center space-x-1"
                        title="取消退住"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>取消退住</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDischarge(patient)}
                        className="btn-secondary text-sm flex items-center space-x-1 text-orange-600 hover:bg-orange-50"
                        title="退住"
                      >
                        <LogOut className="h-3 w-3" />
                        <span>退住</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 院友模態框 */}
      {showModal && (
        <PatientModal
          patient={editingPatient}
          onClose={() => {
            setShowModal(false);
            setEditingPatient(undefined);
          }}
        />
      )}

      {/* 退住確認模態框 */}
      {showDischargeModal && dischargingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              確認退住
            </h3>
            <p className="text-gray-600 mb-4">
              確定要為 <strong>{dischargingPatient.中文姓名}</strong> (床號: {dischargingPatient.床號}) 辦理退住嗎？
            </p>
            <div className="mb-6">
              <label className="form-label">
                <Calendar className="h-4 w-4 inline mr-1" />
                退住日期 *
              </label>
              <input
                type="date"
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmDischarge}
                disabled={!dischargeDate}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確認退住
              </button>
              <button
                onClick={() => {
                  setShowDischargeModal(false);
                  setDischargingPatient(null);
                  setDischargeDate('');
                }}
                className="btn-secondary flex-1"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecords;