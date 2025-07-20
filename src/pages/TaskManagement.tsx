import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  Clock,
  Calendar,
  User,
  Activity,
  Droplets,
  Scale,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { usePatients, type PatientHealthTask, type HealthTaskType, type FrequencyUnit } from '../context/PatientContext';
import TaskModal from '../components/TaskModal';
import { formatFrequencyDescription, getTaskStatus, isTaskOverdue, isTaskDueSoon } from '../utils/taskScheduler';
import PatientTooltip from '../components/PatientTooltip';

const TaskManagement: React.FC = () => {
  const { patientHealthTasks, patients, deletePatientHealthTask, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PatientHealthTask | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | HealthTaskType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due_soon' | 'pending' | 'upcoming'>('all');

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

  const filteredTasks = patientHealthTasks.filter(task => {
    const patient = patients.find(p => p.院友id === task.patient_id);
    const taskStatus = getTaskStatus(task);
    
    // 搜索條件
    const matchesSearch = !searchTerm || 
      patient?.中文姓名.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.health_record_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 類型篩選
    const matchesType = filterType === 'all' || task.health_record_type === filterType;
    
    // 狀態篩選
    const matchesStatus = filterStatus === 'all' || taskStatus === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleEdit = (task: PatientHealthTask) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const task = patientHealthTasks.find(t => t.id === id);
    const patient = patients.find(p => p.院友id === task?.patient_id);
    
    if (confirm(`確定要刪除 ${patient?.中文姓名} 的${task?.health_record_type}任務嗎？`)) {
      try {
        await deletePatientHealthTask(id);
      } catch (error) {
        alert('刪除任務失敗，請重試');
      }
    }
  };

  const getTypeIcon = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return 'bg-blue-100 text-blue-800';
      case '血糖控制': return 'bg-red-100 text-red-800';
      case '體重控制': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (task: PatientHealthTask) => {
    const status = getTaskStatus(task);
    
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            逾期
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Clock className="h-3 w-3 mr-1" />
            今日未完成
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock className="h-3 w-3 mr-1" />
            即將到期
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            正常
          </span>
        );
    }
  };

  const stats = {
    total: patientHealthTasks.length,
    overdue: patientHealthTasks.filter(task => isTaskOverdue(task)).length,
    pending: patientHealthTasks.filter(task => getTaskStatus(task) === 'pending').length,
    dueSoon: patientHealthTasks.filter(task => getTaskStatus(task) === 'due_soon').length,
    vitalSigns: patientHealthTasks.filter(task => task.health_record_type === '生命表徵').length,
    bloodSugar: patientHealthTasks.filter(task => task.health_record_type === '血糖控制').length,
    weight: patientHealthTasks.filter(task => task.health_record_type === '體重控制').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">任務管理</h1>
        <button
          onClick={() => {
            setSelectedTask(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>新增任務</span>
        </button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總任務數</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <CheckSquare className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">逾期任務</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">今日未完成</p>
              <p className="text-2xl font-bold text-green-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">即將到期</p>
              <p className="text-2xl font-bold text-orange-600">{stats.dueSoon}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">生命表徵</p>
              <p className="text-2xl font-bold text-blue-600">{stats.vitalSigns}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">血糖控制</p>
              <p className="text-2xl font-bold text-red-600">{stats.bloodSugar}</p>
            </div>
            <Droplets className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">體重控制</p>
              <p className="text-2xl font-bold text-green-600">{stats.weight}</p>
            </div>
            <Scale className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* 搜索和篩選 */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索院友姓名、床號或任務類型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="form-input lg:w-40"
            >
              <option value="all">所有類型</option>
              <option value="生命表徵">生命表徵</option>
              <option value="血糖控制">血糖控制</option>
              <option value="體重控制">體重控制</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'overdue' | 'due_soon' | 'pending' | 'upcoming')}
              className="form-input lg:w-40"
            >
              <option value="all">所有狀態</option>
              <option value="overdue">逾期</option>
              <option value="pending">今日未完成</option>
              <option value="due_soon">即將到期</option>
              <option value="upcoming">正常</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
          <span>顯示 {filteredTasks.length} / {patientHealthTasks.length} 個任務</span>
        </div>
      </div>

      {/* 任務列表 */}
      <div className="card overflow-hidden">
        {filteredTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    院友
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任務類型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    頻率
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    下次到期
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最後完成
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map(task => {
                  const patient = patients.find(p => p.院友id === task.patient_id);
                  return (
                    <tr 
                      key={task.id} 
                      className="hover:bg-gray-50"
                      onDoubleClick={() => handleEdit(task)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
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
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient ? (
                                <PatientTooltip patient={patient}>
                                  <span className="cursor-help hover:text-blue-600 transition-colors">
                                    {patient.中文姓名}
                                  </span>
                                </PatientTooltip>
                              ) : (
                                '-'
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{patient?.床號}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(task.health_record_type)}`}>
                            {getTypeIcon(task.health_record_type)}
                            <span className="ml-1">{task.health_record_type}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatFrequencyDescription(task)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(task.next_due_at).toLocaleString('zh-TW')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.last_completed_at ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{new Date(task.last_completed_at).toLocaleString('zh-TW')}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">尚未完成</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(task)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編輯"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
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
            <CheckSquare className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' ? '找不到符合條件的任務' : '暫無健康任務'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' ? '請嘗試調整搜索條件' : '開始為院友建立定期健康檢查任務'}
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                新增任務
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={selectedTask}
          onClose={() => {
            setShowModal(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};

export default TaskManagement;