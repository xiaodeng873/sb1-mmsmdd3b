import React from 'react';
import { Calendar, Users, Pill, FileText, TrendingUp, Clock, CalendarCheck, CheckSquare, AlertTriangle, Activity, Droplets, Scale, User, Stethoscope } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { Link } from 'react-router-dom';
import { isTaskOverdue, isTaskDueSoon, isTaskPendingToday, getTaskStatus, isDocumentTask, isMonitoringTask } from '../utils/taskScheduler';
import HealthRecordModal from '../components/HealthRecordModal';

const Dashboard: React.FC = () => {
  const { patients, schedules, prescriptions, followUpAppointments, patientHealthTasks, healthRecords, loading, updatePatientHealthTask } = usePatients();
  const [showHealthModal, setShowHealthModal] = React.useState(false);
  const [selectedTaskForRecord, setSelectedTaskForRecord] = React.useState<any>(null);
  const [showDocumentTaskModal, setShowDocumentTaskModal] = React.useState(false);
  const [selectedDocumentTask, setSelectedDocumentTask] = React.useState<any>(null);

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
  
  // 最近排程：今天及未來最多5個排程
  const recentSchedules = schedules
    .filter(s => new Date(s.到診日期) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.到診日期).getTime() - new Date(b.到診日期).getTime())
    .slice(0, 5);

  // 近期監測：最近5個健康記錄
  const recentHealthRecords = healthRecords
    .sort((a, b) => new Date(`${b.記錄日期} ${b.記錄時間}`).getTime() - new Date(`${a.記錄日期} ${a.記錄時間}`).getTime())
    .slice(0, 10);

  const recentPrescriptions = prescriptions
    .sort((a, b) => new Date(b.處方日期).getTime() - new Date(a.處方日期).getTime())
    .slice(0, 5);

  const upcomingFollowUps = followUpAppointments
    .filter(a => new Date(a.覆診日期) >= new Date())
    .sort((a, b) => new Date(a.覆診日期).getTime() - new Date(b.覆診日期).getTime())
    .slice(0, 5);

  // 任務統計
  const monitoringTasks = patientHealthTasks.filter(task => isMonitoringTask(task.health_record_type));
  const documentTasks = patientHealthTasks.filter(task => isDocumentTask(task.health_record_type));
  
  const overdueMonitoringTasks = monitoringTasks.filter(task => isTaskOverdue(task));
  const pendingMonitoringTasks = monitoringTasks.filter(task => isTaskPendingToday(task));
  const dueSoonMonitoringTasks = monitoringTasks.filter(task => isTaskDueSoon(task));
  const urgentMonitoringTasks = [...overdueMonitoringTasks, ...pendingMonitoringTasks, ...dueSoonMonitoringTasks].slice(0, 10);
  
  const overdueDocumentTasks = documentTasks.filter(task => isTaskOverdue(task));
  const pendingDocumentTasks = documentTasks.filter(task => isTaskPendingToday(task));
  const dueSoonDocumentTasks = documentTasks.filter(task => isTaskDueSoon(task));
  const urgentDocumentTasks = [...overdueDocumentTasks, ...pendingDocumentTasks, ...dueSoonDocumentTasks].slice(0, 10);

  const handleTaskClick = (task: any) => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    if (patient) {
      const dueDate = new Date(task.next_due_at);
      setSelectedTaskForRecord({
        task,
        patient,
        預設記錄類型: task.health_record_type
      });
      setShowHealthModal(true);
    }
  };

  const handleDocumentTaskClick = (task: any) => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    if (patient) {
      setSelectedDocumentTask({
        task,
        patient
      });
      setShowDocumentTaskModal(true);
    }
  };
  const handleTaskCompleted = async (taskId: string) => {
    const task = patientHealthTasks.find(t => t.id === taskId);
    if (task) {
      const now = new Date();
      const { calculateNextDueDate } = await import('../utils/taskScheduler');
      const nextDueAt = calculateNextDueDate(task, now);
      
      await updatePatientHealthTask({
        ...task,
        last_completed_at: now.toISOString(),
        next_due_at: nextDueAt.toISOString()
      });
    }
    setShowHealthModal(false);
    setSelectedTaskForRecord(null);
  };

  const handleDocumentTaskCompleted = async (taskId: string, newSignatureDate: string) => {
    const task = patientHealthTasks.find(t => t.id === taskId);
    if (task) {
      const { calculateNextDueDate } = await import('../utils/taskScheduler');
      const nextDueAt = calculateNextDueDate({
        ...task,
        last_completed_at: newSignatureDate
      });
      
      await updatePatientHealthTask({
        ...task,
        last_completed_at: newSignatureDate,
        next_due_at: nextDueAt.toISOString()
      });
    }
    setShowDocumentTaskModal(false);
    setSelectedDocumentTask(null);
  };
  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      case '約束物品同意書': return <FileText className="h-4 w-4" />;
      case '年度體檢': return <Stethoscope className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getHealthRecordIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4 text-blue-600" />;
      case '血糖控制': return <Droplets className="h-4 w-4 text-red-600" />;
      case '體重控制': return <Scale className="h-4 w-4 text-green-600" />;
      default: return <CheckSquare className="h-4 w-4 text-gray-600" />;
    }
  };
  const stats = [
  ]; 

  const getHealthRecordData = (record: any) => {
    switch (record.記錄類型) {
      case '生命表徵':
        const vitals = [];
        if (record.血壓收縮壓 && record.血壓舒張壓) vitals.push(`血壓 ${record.血壓收縮壓}/${record.血壓舒張壓}`);
        if (record.脈搏) vitals.push(`脈搏 ${record.脈搏}`);
        if (record.體溫) vitals.push(`體溫 ${record.體溫}°C`);
        if (record.血含氧量) vitals.push(`血氧 ${record.血含氧量}%`);
        return vitals.join(', ') || '無數據';
      case '血糖控制':
        return record.血糖值 ? `${record.血糖值} mmol/L` : '無數據';
      case '體重控制':
        return record.體重 ? `${record.體重} kg` : '無數據';
      default:
        return '無數據';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '尚未安排': return 'bg-red-100 text-red-800';
      case '已安排': return 'bg-blue-100 text-blue-800';
      case '已完成': return 'bg-green-100 text-green-800';
      case '改期': return 'bg-orange-100 text-orange-800';
      case '取消': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">系統總覽</h1>
        <div className="text-sm text-gray-500">
          最後更新: {new Date().toLocaleString('zh-TW')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card p-6 hover-scale">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* 監測任務 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">監測任務</h2>
            <Link 
              to="/tasks" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {urgentMonitoringTasks.length > 0 ? (
              urgentMonitoringTasks.map(task => {
                const patient = patients.find(p => p.院友id === task.patient_id);
                const status = getTaskStatus(task);
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className={`p-2 rounded-full ${
                      status === 'overdue' ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                      {getTaskTypeIcon(task.health_record_type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                      <p className="text-sm text-gray-600">{task.health_record_type}</p>
                      {task.notes && (
                        <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(task.next_due_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                    <span className={`status-badge ${
                      status === 'overdue' ? 'bg-red-100 text-red-800' : 
                      status === 'pending' ? 'bg-green-100 text-green-800' :
                      status === 'due_soon' ? 'bg-orange-100 text-orange-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {status === 'overdue' ? '逾期' : 
                       status === 'pending' ? '未完成' :
                       status === 'due_soon' ? '即將到期' :
                       '排程中'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>無待處理任務</p>
              </div>
            )}
          </div>
        </div>
               {/* Upcoming Follow-ups */}
        {/* 文件任務 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">文件任務</h2>
            <Link 
              to="/tasks" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {urgentDocumentTasks.length > 0 ? (
              urgentDocumentTasks.map(task => {
                const patient = patients.find(p => p.院友id === task.patient_id);
                const status = getTaskStatus(task);
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleDocumentTaskClick(task)}
                  >
                    <div className={`p-2 rounded-full ${
                      status === 'overdue' ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                      {getTaskTypeIcon(task.health_record_type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                      <p className="text-sm text-gray-600">{task.health_record_type}</p>
                      {task.notes && (
                        <p className="text-xs text-gray-500 mt-1">{task.notes}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        到期: {new Date(task.next_due_at).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <span className={`status-badge ${
                      status === 'overdue' ? 'bg-red-100 text-red-800' : 
                      status === 'pending' ? 'bg-green-100 text-green-800' :
                      status === 'due_soon' ? 'bg-orange-100 text-orange-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {status === 'overdue' ? '逾期' : 
                       status === 'pending' ? '未完成' :
                       status === 'due_soon' ? '即將到期' :
                       '排程中'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>無待處理文件任務</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 近期監測 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">近期監測</h2>
            <Link 
              to="/health" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {recentHealthRecords.length > 0 ? (
              recentHealthRecords.map(record => {
                const patient = patients.find(p => p.院友id === record.院友id);
                return (
                  <div key={record.記錄id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
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
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                        <span className="text-xs text-gray-500">({patient?.床號})</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {getHealthRecordIcon(record.記錄類型)}
                        <p className="text-sm text-gray-600">{record.記錄類型}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {getHealthRecordData(record)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(record.記錄日期).toLocaleDateString('zh-TW')} {record.記錄時間.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>暫無監測記錄</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">近期覆診</h2>
            <Link 
              to="/follow-up" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingFollowUps.length > 0 ? (
              upcomingFollowUps.map(appointment => {
                const patient = patients.find(p => p.院友id === appointment.院友id);
                return (
                  <div key={appointment.覆診id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
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
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                        <span className="text-xs text-gray-500">({patient?.床號})</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.覆診日期).toLocaleDateString('zh-TW')} 
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.覆診地點} - {appointment.覆診專科}
                      </p>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(appointment.狀態)}`}>
                      {appointment.狀態}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarCheck className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>近期無覆診安排</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 健康記錄模態框 */}
      {showHealthModal && selectedTaskForRecord && (
        <HealthRecordModal
          record={{
            院友id: selectedTaskForRecord.patient.院友id,
            記錄類型: selectedTaskForRecord.預設記錄類型
          }}
          onClose={() => {
            setShowHealthModal(false);
            setSelectedTaskForRecord(null);
          }}
          onTaskCompleted={() => handleTaskCompleted(selectedTaskForRecord.task.id)}
          defaultRecordDate={(() => {
            const dateObj = new Date(selectedTaskForRecord.task.next_due_at);
            const year = dateObj.getFullYear();
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const day = dateObj.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
          })()}
          defaultRecordTime={(() => {
            const dateObj = new Date(selectedTaskForRecord.task.next_due_at);
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          })()}
        />
      )}

      {/* 文件任務模態框 */}
      {showDocumentTaskModal && selectedDocumentTask && (
        <DocumentTaskModal
          task={selectedDocumentTask.task}
          patient={selectedDocumentTask.patient}
          onClose={() => {
            setShowDocumentTaskModal(false);
            setSelectedDocumentTask(null);
          }}
          onTaskCompleted={handleDocumentTaskCompleted}
        />
      )}
    </div>
  );
};

// 文件任務模態框組件
const DocumentTaskModal: React.FC<{
  task: any;
  patient: any;
  onClose: () => void;
  onTaskCompleted: (taskId: string, newSignatureDate: string) => void;
}> = ({ task, patient, onClose, onTaskCompleted }) => {
  const [signatureDate, setSignatureDate] = React.useState(
    task.last_completed_at ? new Date(task.last_completed_at).toISOString().split('T')[0] : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureDate) {
      alert('請選擇醫生簽署日期');
      return;
    }
    onTaskCompleted(task.id, new Date(signatureDate).toISOString());
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case '約束物品同意書': return <FileText className="h-6 w-6 text-orange-600" />;
      case '年度體檢': return <Stethoscope className="h-6 w-6 text-purple-600" />;
      default: return <CheckSquare className="h-6 w-6 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getTaskIcon(task.health_record_type)}
            <h2 className="text-xl font-semibold text-gray-900">更新文件任務</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center">
              {patient.院友相片 ? (
                <img 
                  src={patient.院友相片} 
                  alt={patient.中文姓名} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{patient.中文姓名}</p>
              <p className="text-sm text-gray-600">床號: {patient.床號}</p>
              <p className="text-sm text-gray-600">任務: {task.health_record_type}</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">
              <Calendar className="h-4 w-4 inline mr-1" />
              醫生簽署日期 *
            </label>
            <input
              type="date"
              value={signatureDate}
              onChange={(e) => setSignatureDate(e.target.value)}
              className="form-input"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              請輸入醫生簽署此文件的日期，系統將根據此日期計算下次到期時間
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>當前狀態：</strong>
              {task.last_completed_at ? 
                `上次簽署: ${new Date(task.last_completed_at).toLocaleDateString('zh-TW')}` : 
                '尚未簽署'
              }
            </p>
            <p className="text-sm text-blue-800">
              <strong>下次到期：</strong>{new Date(task.next_due_at).toLocaleDateString('zh-TW')}
            </p>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              更新簽署日期
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 添加必要的 import
import { X } from 'lucide-react';

export default Dashboard;