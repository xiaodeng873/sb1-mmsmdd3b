import React from 'react';
import { Calendar, Users, Pill, FileText, TrendingUp, Clock, CalendarCheck, CheckSquare, AlertTriangle, Activity, Droplets, Scale } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { Link } from 'react-router-dom';
import { isTaskOverdue, isTaskDueSoon, isTaskPendingToday, getTaskStatus } from '../utils/taskScheduler';
import HealthRecordModal from '../components/HealthRecordModal';

const Dashboard: React.FC = () => {
  const { patients, schedules, prescriptions, followUpAppointments, patientHealthTasks, loading, updatePatientHealthTask } = usePatients();
  const [showHealthModal, setShowHealthModal] = React.useState(false);
  const [selectedTaskForRecord, setSelectedTaskForRecord] = React.useState<any>(null);

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
  const todaySchedules = schedules.filter(s => 
    new Date(s.到診日期).toDateString() === new Date().toDateString()
  );

  const thisWeekSchedules = schedules.filter(s => {
    const scheduleDate = new Date(s.到診日期);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return scheduleDate >= weekStart && scheduleDate <= weekEnd;
  });

  const recentPrescriptions = prescriptions
    .sort((a, b) => new Date(b.處方日期).getTime() - new Date(a.處方日期).getTime())
    .slice(0, 5);

  const upcomingFollowUps = followUpAppointments
    .filter(a => (a.狀態 === '已安排' || a.狀態 === '尚未安排') && new Date(a.覆診日期) >= new Date())
    .sort((a, b) => new Date(a.覆診日期).getTime() - new Date(b.覆診日期).getTime())
    .slice(0, 5);

  // 任務統計
  const overdueTasks = patientHealthTasks.filter(task => isTaskOverdue(task));
  const pendingTasks = patientHealthTasks.filter(task => isTaskPendingToday(task));
  const dueSoonTasks = patientHealthTasks.filter(task => isTaskDueSoon(task));
  const urgentTasks = [...overdueTasks, ...pendingTasks, ...dueSoonTasks].slice(0, 5);

  const handleTaskClick = (task: any) => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    if (patient) {
      setSelectedTaskForRecord({
        task,
        patient,
        預設記錄類型: task.health_record_type
      });
      setShowHealthModal(true);
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

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const stats = [
    {
      title: '總院友數',
      value: patients.length,
      icon: Users,
      color: 'bg-blue-500',
      change: '+2 本月'
    },
    {
      title: '今日排程',
      value: todaySchedules.length,
      icon: Calendar,
      color: 'bg-green-500',
      change: `${todaySchedules.reduce((sum, s) => sum + s.院友列表.length, 0)} 位院友`
    },
   
    {
      title: '逾期任務',
      value: overdueTasks.length,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: `${pendingTasks.length} 未完成`
    }
  ];

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
        {/* Today's Schedule */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">今日排程</h2>
            <Link 
              to="/scheduling" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {todaySchedules.length > 0 ? (
              todaySchedules.map(schedule => (
                <div key={schedule.排程id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {new Date(schedule.到診日期).toLocaleDateString('zh-TW')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {schedule.院友列表.length} 位院友預約
                    </p>
                  </div>
                  <span className="status-badge status-scheduled">預約中</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>今日無排程</p>
              </div>
            )}
          </div>
        </div>

        {/* 緊急任務 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">緊急任務</h2>
            <Link 
              to="/tasks" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {urgentTasks.length > 0 ? (
              urgentTasks.map(task => {
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
                    <CalendarCheck className="h-5 w-5 text-indigo-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{patient?.中文姓名}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.覆診日期).toLocaleDateString('zh-TW')} 
                        {appointment.覆診時間 && ` ${appointment.覆診時間}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.覆診地點} - {appointment.覆診專科}
                      </p>
                    </div>
                    <span className="status-badge status-scheduled">待覆診</span>
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

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link 
            to="/scheduling" 
            className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">新增排程</p>
              <p className="text-sm text-gray-600">安排醫生到診</p>
            </div>
          </Link>
          <Link 
            to="/follow-up" 
            className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <CalendarCheck className="h-8 w-8 text-indigo-600" />
            <div>
              <p className="font-medium text-gray-900">覆診管理</p>
              <p className="text-sm text-gray-600">安排院友覆診</p>
            </div>
          </Link>
          <Link 
            to="/medication" 
            className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Pill className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">藥物登記</p>
              <p className="text-sm text-gray-600">掃描藥物標籤</p>
            </div>
          </Link>
          <Link 
            to="/tasks" 
            className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <CheckSquare className="h-8 w-8 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">任務管理</p>
              <p className="text-sm text-gray-600">設定健康檢查任務</p>
            </div>
          </Link>
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
        />
      )}
    </div>
  );
};

export default Dashboard;