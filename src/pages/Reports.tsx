import React, { useState } from 'react';
import { BarChart3, Download, Calendar, Users, Pill, FileText, Filter } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { exportWaitingListToExcel } from '../utils/waitingListExcelGenerator';
import { exportPrescriptionsToExcel } from '../utils/prescriptionExcelGenerator';

const Reports: React.FC = () => {
  const { patients, schedules, prescriptions, loading } = usePatients();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedReport, setSelectedReport] = useState('overview');

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
  const handleDownloadReport = (reportType: string) => {
    handleExportReportToExcel(reportType);
  };

  const handleExportReportToExcel = async (reportType: string) => {
    try {
      const reportData = getReportData(reportType);
      let exportData: any[] = [];
      let title = '';
      let filename = '';

      if (reportType === 'prescriptions') {
        title = `處方報表 (${dateRange.start} 至 ${dateRange.end})`;
        filename = `處方報表_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        exportData = (reportData as any[]).map(prescription => {
          const patient = patients.find(p => p.院友id === prescription.院友id);
          return {
            床號: patient?.床號 || '',
            中文姓名: patient?.中文姓名 || '',
            處方日期: prescription.處方日期,
            藥物名稱: prescription.藥物名稱,
            劑型: prescription.劑型 || '',
            服用途徑: prescription.服用途徑 || '',
            服用次數: prescription.服用次數 || '',
            服用份量: prescription.服用份量 || '',
            服用日數: prescription.服用日數 || '',
            藥物來源: prescription.藥物來源,
            需要時: prescription.需要時 || false
          };
        });
        
        await exportPrescriptionsToExcel(exportData, filename, title);
        
      } else if (reportType === 'schedules') {
        title = `排程報表 (${dateRange.start} 至 ${dateRange.end})`;
        filename = `排程報表_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        exportData = (reportData as any[]).flatMap(schedule => 
          schedule.院友列表.map((item: any) => ({
            床號: item.院友.床號,
            中文姓名: item.院友.中文姓名,
            英文姓名: item.院友.英文姓名,
            性別: item.院友.性別 || '',
            身份證號碼: item.院友.身份證號碼 || '',
            出生日期: item.院友.出生日期 ? new Date(item.院友.出生日期).toLocaleDateString('zh-TW') : '',
            看診原因: item.看診原因.join(', ') || '',
            症狀說明: item.症狀說明 || '',
            藥物敏感: item.院友.藥物敏感 || '無',
            不良藥物反應: item.院友.不良藥物反應 || '無',
            備註: item.備註 || '',
            到診日期: schedule.到診日期
          }))
        );
        
        await exportWaitingListToExcel(exportData, filename, title);
        
      } else {
        // 院友報表或總覽報表
        title = reportType === 'patients' ? '院友報表' : '總覽報表';
        filename = `${title}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        exportData = patients.map(patient => ({
          床號: patient.床號,
          中文姓名: patient.中文姓名,
          英文姓名: patient.英文姓名,
          性別: patient.性別 || '',
          身份證號碼: patient.身份證號碼 || '',
          出生日期: patient.出生日期 ? new Date(patient.出生日期).toLocaleDateString('zh-TW') : '',
          看診原因: '',
          症狀說明: '',
          藥物敏感: patient.藥物敏感 || '無',
          不良藥物反應: patient.不良藥物反應 || '無',
          備註: ''
        }));
        
        await exportWaitingListToExcel(exportData, filename, title);
      }


    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗，請重試');
    }
  };

  const getReportData = (reportType: string) => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    switch (reportType) {
      case 'schedules':
        return schedules.filter(s => {
          const scheduleDate = new Date(s.到診日期);
          return scheduleDate >= startDate && scheduleDate <= endDate;
        });
      case 'prescriptions':
        return prescriptions.filter(p => {
          const prescriptionDate = new Date(p.處方日期);
          return prescriptionDate >= startDate && prescriptionDate <= endDate;
        });
      case 'patients':
        return patients;
      default:
        return { patients, schedules, prescriptions };
    }
  };

  const filteredSchedules = schedules.filter(s => {
    const scheduleDate = new Date(s.到診日期);
    return scheduleDate >= new Date(dateRange.start) && scheduleDate <= new Date(dateRange.end);
  });

  const filteredPrescriptions = prescriptions.filter(p => {
    const prescriptionDate = new Date(p.處方日期);
    return prescriptionDate >= new Date(dateRange.start) && prescriptionDate <= new Date(dateRange.end);
  });

  const stats = {
    totalPatients: patients.length,
    totalSchedules: filteredSchedules.length,
    totalPrescriptions: filteredPrescriptions.length,
    patientsWithSchedules: filteredSchedules.reduce((sum, s) => sum + s.院友列表.length, 0)
  };

  const reportTypes = [
    { id: 'overview', name: '總覽報表', icon: BarChart3 },
    { id: 'schedules', name: '排程報表', icon: Calendar },
    { id: 'prescriptions', name: '處方報表', icon: Pill },
    { id: 'patients', name: '院友報表', icon: Users }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">報表查詢</h1>
        <button
          onClick={() => handleDownloadReport(selectedReport)}
          className="btn-primary flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>匯出報表</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700">日期範圍:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="form-input"
          />
          <span className="text-gray-500">至</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="form-input"
          />
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {reportTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedReport === type.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{type.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總院友數</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">排程數量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSchedules}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">處方數量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPrescriptions}</p>
            </div>
            <Pill className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">預約院友</p>
              <p className="text-2xl font-bold text-gray-900">{stats.patientsWithSchedules}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {reportTypes.find(t => t.id === selectedReport)?.name}
        </h2>
        
        {selectedReport === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">性別分布</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">男性</span>
                    <span className="text-sm font-medium">{patients.filter(p => p.性別 === '男').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">女性</span>
                    <span className="text-sm font-medium">{patients.filter(p => p.性別 === '女').length}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">看診原因統計</h3>
                <div className="space-y-2">
                  {['申訴不適', '約束物品同意書', '年度體檢', '其他'].map(reason => {
                    const count = filteredSchedules.reduce((sum, s) => 
                      sum + s.院友列表.filter(p => p.看診原因.includes(reason)).length, 0
                    );
                    return (
                      <div key={reason} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{reason}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'schedules' && (
          <div className="space-y-4">
            {filteredSchedules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">日期</th>
                      <th className="px-4 py-2 text-left">院友數量</th>
                      <th className="px-4 py-2 text-left">主要原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSchedules.map(schedule => (
                      <tr key={schedule.排程id}>
                        <td className="px-4 py-2">{new Date(schedule.到診日期).toLocaleDateString('zh-TW')}</td>
                        <td className="px-4 py-2">{schedule.院友列表.length}</td>
                        <td className="px-4 py-2">
                          {schedule.院友列表.map(p => p.看診原因).flat().join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">選定期間內無排程記錄</p>
            )}
          </div>
        )}

        {selectedReport === 'prescriptions' && (
          <div className="space-y-4">
            {filteredPrescriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">院友</th>
                      <th className="px-4 py-2 text-left">藥物名稱</th>
                      <th className="px-4 py-2 text-left">處方日期</th>
                      <th className="px-4 py-2 text-left">藥物來源</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPrescriptions.map(prescription => {
                      const patient = patients.find(p => p.院友id === prescription.院友id);
                      return (
                        <tr key={patient.院友id}>
                          <td className="px-4 py-2">{patient?.中文姓名}</td>
                          <td className="px-4 py-2">{prescription.藥物名稱}</td>
                          <td className="px-4 py-2">{new Date(prescription.處方日期).toLocaleDateString('zh-TW')}</td>
                          <td className="px-4 py-2">{prescription.藥物來源}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">選定期間內無處方記錄</p>
            )}
          </div>
        )}

        {selectedReport === 'patients' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">床號</th>
                    <th className="px-4 py-2 text-left">姓名</th>
                    <th className="px-4 py-2 text-left">性別</th>
                    <th className="px-4 py-2 text-left">年齡</th>
                    <th className="px-4 py-2 text-left">藥物敏感</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map(patient => {
                    const age = Math.floor((new Date().getTime() - new Date(patient.出生日期).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                    return (
                      <tr key={patient.院友ID}>
                        <td className="px-4 py-2">{patient.床號}</td>
                        <td className="px-4 py-2">{patient.中文姓名}</td>
                        <td className="px-4 py-2">{patient.性別}</td>
                        <td className="px-4 py-2">{age}歲</td>
                        <td className="px-4 py-2">{patient.藥物敏感 || '無'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;