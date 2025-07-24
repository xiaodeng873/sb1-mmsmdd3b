import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Activity, 
  Calendar,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Heart,
  Home,
  Banknote,
  User
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { formatSocialWelfare } from '../utils/patientUtils';

const Reports: React.FC = () => {
  const { patients, healthRecords, prescriptions, followUpAppointments, loading } = usePatients();
  const [selectedDateRange, setSelectedDateRange] = useState('30');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedResidencyStatus, setSelectedResidencyStatus] = useState<'在住' | '已退住' | '全部'>('在住');

  // 根據篩選條件獲取院友
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      if (selectedResidencyStatus !== '全部' && patient.在住狀態 !== selectedResidencyStatus) {
        return false;
      }
      return true;
    });
  }, [patients, selectedResidencyStatus]);

  // 院友統計
  const patientStats = useMemo(() => {
    const total = filteredPatients.length;
    const genderStats = filteredPatients.reduce((acc, patient) => {
      acc[patient.性別] = (acc[patient.性別] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const nursingLevelStats = filteredPatients.reduce((acc, patient) => {
      const level = patient.護理等級 || '未設定';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const admissionTypeStats = filteredPatients.reduce((acc, patient) => {
      const type = patient.入住類型 || '未設定';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const socialWelfareStats = filteredPatients.reduce((acc, patient) => {
      if (patient.社會福利?.主要類型) {
        const mainType = patient.社會福利.主要類型;
        acc[mainType] = (acc[mainType] || 0) + 1;
        
        // 如果是公共福利金計劃，也統計子類型
        if (mainType === '公共福利金計劃' && patient.社會福利.子類型) {
          const subType = patient.社會福利.子類型;
          acc[subType] = (acc[subType] || 0) + 1;
        }
      } else {
        acc['無'] = (acc['無'] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      genderStats,
      nursingLevelStats,
      admissionTypeStats,
      socialWelfareStats
    };
  }, [filteredPatients]);

  // 健康記錄統計
  const healthRecordStats = useMemo(() => {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(selectedDateRange));

    const recentRecords = healthRecords.filter(record => {
      const recordDate = new Date(record.記錄日期);
      return recordDate >= dateLimit;
    });

    const typeStats = recentRecords.reduce((acc, record) => {
      acc[record.記錄類型] = (acc[record.記錄類型] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: recentRecords.length,
      typeStats
    };
  }, [healthRecords, selectedDateRange]);

  // 處方統計
  const prescriptionStats = useMemo(() => {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(selectedDateRange));

    const recentPrescriptions = prescriptions.filter(prescription => {
      const prescriptionDate = new Date(prescription.處方日期);
      return prescriptionDate >= dateLimit;
    });

    const sourceStats = recentPrescriptions.reduce((acc, prescription) => {
      acc[prescription.藥物來源] = (acc[prescription.藥物來源] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: recentPrescriptions.length,
      sourceStats
    };
  }, [prescriptions, selectedDateRange]);

  // 覆診統計
  const followUpStats = useMemo(() => {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(selectedDateRange));

    const recentAppointments = followUpAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.覆診日期);
      return appointmentDate >= dateLimit;
    });

    const statusStats = recentAppointments.reduce((acc, appointment) => {
      const status = appointment.狀態 || '尚未安排';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: recentAppointments.length,
      statusStats
    };
  }, [followUpAppointments, selectedDateRange]);

  // 獲取護理等級顏色
  const getNursingLevelColor = (level: string) => {
    switch (level) {
      case '全護理': return 'bg-red-500';
      case '半護理': return 'bg-yellow-500';
      case '自理': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // 獲取入住類型顏色
  const getAdmissionTypeColor = (type: string) => {
    switch (type) {
      case '私位': return 'bg-blue-500';
      case '買位': return 'bg-purple-500';
      case '院舍卷': return 'bg-green-500';
      case '暫住': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // 獲取記錄類型顏色
  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case '生命表徵': return 'bg-blue-500';
      case '血糖控制': return 'bg-red-500';
      case '體重控制': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // 渲染統計圖表
  const renderBarChart = (data: Record<string, number>, getColor: (key: string) => string, title: string) => {
    const maxValue = Math.max(...Object.values(data));
    const entries = Object.entries(data).sort(([,a], [,b]) => b - a);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-600 text-right">{key}:</div>
              <div className="flex-1 flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className={`h-4 rounded-full ${getColor(key)} transition-all duration-500`}
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 text-right">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">報表查詢</h1>
          <p className="text-gray-600">查看院友管理和健康監測統計報表</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>匯出報表</span>
          </button>
        </div>
      </div>

      {/* 篩選控制 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="form-label">統計時間範圍</label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="form-input"
              >
                <option value="7">過去 7 天</option>
                <option value="30">過去 30 天</option>
                <option value="90">過去 90 天</option>
                <option value="365">過去一年</option>
              </select>
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
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">院友狀態</label>
                  <select
                    value={selectedResidencyStatus}
                    onChange={(e) => setSelectedResidencyStatus(e.target.value as '在住' | '已退住' | '全部')}
                    className="form-input"
                  >
                    <option value="在住">僅在住</option>
                    <option value="已退住">僅已退住</option>
                    <option value="全部">全部</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 總覽統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {selectedResidencyStatus === '全部' ? '總院友數' : 
                 selectedResidencyStatus === '在住' ? '在住院友' : '已退住院友'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{patientStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">健康記錄</p>
              <p className="text-2xl font-bold text-gray-900">{healthRecordStats.total}</p>
              <p className="text-xs text-gray-500">過去 {selectedDateRange} 天</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">處方記錄</p>
              <p className="text-2xl font-bold text-gray-900">{prescriptionStats.total}</p>
              <p className="text-xs text-gray-500">過去 {selectedDateRange} 天</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">覆診安排</p>
              <p className="text-2xl font-bold text-gray-900">{followUpStats.total}</p>
              <p className="text-xs text-gray-500">過去 {selectedDateRange} 天</p>
            </div>
          </div>
        </div>
      </div>

      {/* 院友統計圖表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 性別分布 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            性別分布
          </h3>
          <div className="space-y-3">
            {Object.entries(patientStats.genderStats).map(([gender, count]) => (
              <div key={gender} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{gender}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${gender === '男' ? 'bg-blue-500' : 'bg-pink-500'}`}
                      style={{ width: `${(count / patientStats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 護理等級分布 */}
        {renderBarChart(
          patientStats.nursingLevelStats, 
          getNursingLevelColor, 
          '護理等級分布'
        )}
      </div>

      {/* 更多統計圖表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入住類型分布 */}
        {renderBarChart(
          patientStats.admissionTypeStats, 
          getAdmissionTypeColor, 
          '入住類型分布'
        )}

        {/* 健康記錄類型分布 */}
        {renderBarChart(
          healthRecordStats.typeStats, 
          getRecordTypeColor, 
          `健康記錄類型分布 (過去 ${selectedDateRange} 天)`
        )}
      </div>

      {/* 社會福利統計 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Banknote className="h-5 w-5 mr-2" />
          社會福利分布
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(patientStats.socialWelfareStats).map(([type, count]) => (
            <div key={type} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{type}</span>
                <span className="text-lg font-bold text-blue-600">{count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(count / patientStats.total) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((count / patientStats.total) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 處方來源和覆診狀態統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 處方來源統計 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            處方來源統計 (過去 {selectedDateRange} 天)
          </h3>
          <div className="space-y-3">
            {Object.entries(prescriptionStats.sourceStats).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{source}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-purple-500 h-3 rounded-full"
                      style={{ width: `${(count / prescriptionStats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 覆診狀態統計 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            覆診狀態統計 (過去 {selectedDateRange} 天)
          </h3>
          <div className="space-y-3">
            {Object.entries(followUpStats.statusStats).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{status}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-orange-500 h-3 rounded-full"
                      style={{ width: `${(count / followUpStats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;