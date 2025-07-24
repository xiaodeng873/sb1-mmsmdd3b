import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  Calendar, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Clock,
  CheckCircle,
  Heart,
  Droplets,
  Scale,
  Plus
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import HealthRecordModal from '../components/HealthRecordModal';

const Dashboard: React.FC = () => {
  const { 
    patients, 
    healthRecords, 
    prescriptions, 
    followUpAppointments, 
    patientHealthTasks,
    loading 
  } = usePatients();
  
  const [showHealthRecordModal, setShowHealthRecordModal] = useState(false);

  // 統計數據
  const totalPatients = patients.filter(p => p.在住狀態 === '在住').length;
  const totalHealthRecords = healthRecords.length;
  const totalPrescriptions = prescriptions.length;
  const upcomingAppointments = followUpAppointments.filter(
    apt => apt.狀態 === '已安排' && new Date(apt.覆診日期) >= new Date()
  ).length;

  // 今日任務統計
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = patientHealthTasks.filter(task => 
    task.next_due_at && task.next_due_at.split('T')[0] === today
  );

  // 最近健康記錄
  const recentHealthRecords = healthRecords
    .slice(0, 5)
    .map(record => {
      const patient = patients.find(p => p.院友id === record.院友id);
      return { ...record, patientName: patient?.中文姓名 || '未知' };
    });

  // 即將到期的任務
  const upcomingTasks = patientHealthTasks
    .filter(task => {
      const dueDate = new Date(task.next_due_at);
      const now = new Date();
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .slice(0, 5)
    .map(task => {
      const patient = patients.find(p => p.院友id === task.patient_id);
      return { ...task, patientName: patient?.中文姓名 || '未知' };
    });

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      default: return <Heart className="h-4 w-4" />;
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case '生命表徵': return 'text-blue-600 bg-blue-100';
      case '血糖控制': return 'text-red-600 bg-red-100';
      case '體重控制': return 'text-green-600 bg-green-100';
      default: return 'text-purple-600 bg-purple-100';
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
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
          <p className="text-gray-600">院友健康管理系統概覽</p>
        </div>
        <button
          onClick={() => setShowHealthRecordModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>快速記錄</span>
        </button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">在住院友</p>
              <p className="text-2xl font-bold text-gray-900">{totalPatients}</p>
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
              <p className="text-2xl font-bold text-gray-900">{totalHealthRecords}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">處方記錄</p>
              <p className="text-2xl font-bold text-gray-900">{totalPrescriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">即將覆診</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingAppointments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日任務 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">今日任務</h2>
              <span className="text-sm text-gray-500">{todayTasks.length} 項任務</span>
            </div>
          </div>
          <div className="p-6">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">今日沒有待辦任務</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayTasks.slice(0, 5).map((task) => {
                  const patient = patients.find(p => p.院友id === task.patient_id);
                  return (
                    <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-white rounded-lg">
                        {getTaskTypeIcon(task.health_record_type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                        <p className="text-sm text-gray-600">{task.health_record_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(task.next_due_at).toLocaleTimeString('zh-TW', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        {task.notes && (
                          <p className="text-xs text-gray-500">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 最近健康記錄 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">最近健康記錄</h2>
          </div>
          <div className="p-6">
            {recentHealthRecords.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暫無健康記錄</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentHealthRecords.map((record) => (
                  <div key={record.記錄id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`p-2 rounded-lg ${getRecordTypeColor(record.記錄類型)}`}>
                      {getTaskTypeIcon(record.記錄類型)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{record.patientName}</p>
                      <p className="text-sm text-gray-600">{record.記錄類型}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{record.記錄日期}</p>
                      <p className="text-xs text-gray-500">{record.記錄時間}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 即將到期任務 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">即將到期任務</h2>
            <span className="text-sm text-gray-500">未來 7 天</span>
          </div>
        </div>
        <div className="p-6">
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">未來 7 天沒有即將到期的任務</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTasks.map((task) => {
                const dueDate = new Date(task.next_due_at);
                const now = new Date();
                const diffTime = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-2 rounded-lg ${getRecordTypeColor(task.health_record_type)}`}>
                        {getTaskTypeIcon(task.health_record_type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.patientName}</p>
                        <p className="text-sm text-gray-600">{task.health_record_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {dueDate.toLocaleDateString('zh-TW')}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        diffDays === 0 ? 'bg-red-100 text-red-800' :
                        diffDays <= 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {diffDays === 0 ? '今天' : `${diffDays} 天後`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 健康記錄模態框 */}
      {showHealthRecordModal && (
        <HealthRecordModal
          onClose={() => setShowHealthRecordModal(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;