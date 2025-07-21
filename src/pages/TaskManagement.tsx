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
  X,
  ChevronUp,
  ChevronDown,
  FileText,
  Stethoscope
} from 'lucide-react';
import { usePatients, type PatientHealthTask, type HealthTaskType, type FrequencyUnit } from '../context/PatientContext';
import TaskModal from '../components/TaskModal';
import { formatFrequencyDescription, getTaskStatus, isTaskOverdue, isTaskDueSoon, isTaskPendingToday, isDocumentTask } from '../utils/taskScheduler';
import PatientTooltip from '../components/PatientTooltip';

type SortField = 'patient_name' | 'health_record_type' | 'frequency' | 'next_due_at' | 'last_completed_at' | 'notes';
type SortDirection = 'asc' | 'desc';

interface AdvancedFilters {
  床號: string;
  中文姓名: string;
  health_record_type: string;
  frequency_unit: string;
  notes: string;
  startDate: string;
  endDate: string;
  status: string;
}

const TaskManagement: React.FC = () => {
  const { patientHealthTasks, patients, deletePatientHealthTask, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PatientHealthTask | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | HealthTaskType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due_soon' | 'pending' | 'scheduled'>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('next_due_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    床號: '',
    中文姓名: '',
    health_record_type: '',
    frequency_unit: '',
    notes: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

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
    
    // 日期區間篩選
    if (advancedFilters.startDate || advancedFilters.endDate) {
      const taskDate = new Date(task.next_due_at);
      if (advancedFilters.startDate && taskDate < new Date(advancedFilters.startDate)) {
        return false;
      }
      if (advancedFilters.endDate && taskDate > new Date(advancedFilters.endDate)) {
        return false;
      }
    }
    
    // 進階篩選
    if (advancedFilters.床號 && !patient?.床號.toLowerCase().includes(advancedFilters.床號.toLowerCase())) {
      return false;
    }
    if (advancedFilters.中文姓名 && !patient?.中文姓名.toLowerCase().includes(advancedFilters.中文姓名.toLowerCase())) {
      return false;
    }
    if (advancedFilters.health_record_type && task.health_record_type !== advancedFilters.health_record_type) {
      return false;
    }
    if (advancedFilters.frequency_unit && task.frequency_unit !== advancedFilters.frequency_unit) {
      return false;
    }
    if (advancedFilters.notes && !task.notes?.toLowerCase().includes(advancedFilters.notes.toLowerCase())) {
      return false;
    }
    if (advancedFilters.status && taskStatus !== advancedFilters.status) {
      return false;
    }
    
    // 搜索條件
    const matchesSearch = !searchTerm || 
      patient?.中文姓名.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.health_record_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatFrequencyDescription(task).toLowerCase().includes(searchTerm.toLowerCase());
    
    // 類型篩選
    const matchesType = filterType === 'all' || task.health_record_type === filterType;
    
    // 狀態篩選
    const matchesStatus = filterStatus === 'all' || taskStatus === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // 檢查是否有進階篩選條件
  const hasAdvancedFilters = () => {
    return Object.values(advancedFilters).some(value => value !== '');
  };

  const updateAdvancedFilter = (field: keyof AdvancedFilters, value: string) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setAdvancedFilters({
      床號: '',
      中文姓名: '',
      health_record_type: '',
      frequency_unit: '',
      notes: '',
      startDate: '',
      endDate: '',
      status: ''
    });
  };

  // 獲取所有唯一值的選項
  const getUniqueOptions = (field: string) => {
    const values = new Set<string>();
    patientHealthTasks.forEach(task => {
      let value = '';
      
      switch (field) {
        case 'frequency_unit':
          value = task.frequency_unit;
          break;
        default:
          return;
      }
      
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const patientA = patients.find(p => p.院友id === a.patient_id);
    const patientB = patients.find(p => p.院友id === b.patient_id);
    
    let valueA: string | number = '';
    let valueB: string | number = '';
    
    switch (sortField) {
      case 'patient_name':
        valueA = patientA?.中文姓名 || '';
        valueB = patientB?.中文姓名 || '';
        break;
      case 'health_record_type':
        valueA = a.health_record_type;
        valueB = b.health_record_type;
        break;
      case 'frequency':
        valueA = formatFrequencyDescription(a);
        valueB = formatFrequencyDescription(b);
        break;
      case 'next_due_at':
        valueA = new Date(a.next_due_at).getTime();
        valueB = new Date(b.next_due_at).getTime();
        break;
      case 'last_completed_at':
        valueA = a.last_completed_at ? new Date(a.last_completed_at).getTime() : 0;
        valueB = b.last_completed_at ? new Date(b.last_completed_at).getTime() : 0;
        break;
      case 'notes':
        valueA = a.notes || '';
        valueB = b.notes || '';
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

  const handleEdit = (task: PatientHealthTask) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const task = patientHealthTasks.find(t => t.id === id);
    const patient = patients.find(p => p.院友id === task?.patient_id);
    
    if (confirm(`確定要刪除 ${patient?.中文姓名} 的${task?.health_record_type}任務嗎？`)) {
      try {
        setDeletingIds(prev => new Set(prev).add(id));
        await deletePatientHealthTask(id);
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } catch (error) {
        alert('刪除任務失敗，請重試');
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRows.size === 0) {
      alert('請先選擇要刪除的記錄');
      return;
    }

    const selectedTasks = sortedTasks.filter(t => selectedRows.has(t.id));
    const confirmMessage = `確定要刪除 ${selectedRows.size} 個健康任務嗎？\n\n此操作無法復原。`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const deletingArray = Array.from(selectedRows);
    setDeletingIds(new Set(deletingArray));
    
    try {
      for (const taskId of deletingArray) {
        await deletePatientHealthTask(taskId);
      }
      setSelectedRows(new Set());
      alert(`成功刪除 ${deletingArray.length} 個健康任務`);
    } catch (error) {
      console.error('批量刪除健康任務失敗:', error);
      alert('批量刪除健康任務失敗，請重試');
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleSelectRow = (taskId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === sortedTasks.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedTasks.map(t => t.id)));
    }
  };

  const handleInvertSelection = () => {
    const newSelected = new Set<string>();
    sortedTasks.forEach(task => {
      if (!selectedRows.has(task.id)) {
        newSelected.add(task.id);
      }
    });
    setSelectedRows(newSelected);
  };

  const getTypeIcon = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-4 w-4" />;
      case '血糖控制': return <Droplets className="h-4 w-4" />;
      case '體重控制': return <Scale className="h-4 w-4" />;
      case '約束物品同意書': return <FileText className="h-4 w-4" />;
      case '年度體檢': return <Stethoscope className="h-4 w-4" />;
      default: return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: HealthTaskType) => {
    switch (type) {
      case '生命表徵': return 'bg-blue-100 text-blue-800';
      case '血糖控制': return 'bg-red-100 text-red-800';
      case '體重控制': return 'bg-green-100 text-green-800';
      case '約束物品同意書': return 'bg-white-100 text-white-800';
      case '年度體檢': return 'bg-yellow-100 text-yellow-800';
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
            <CheckCircle className="h-3 w-3 mr-1" />
            未完成
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock className="h-3 w-3 mr-1" />
            即將到期
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <CheckSquare className="h-3 w-3 mr-1" />
            排程中
          </span>
        );
    }
  };

  const scheduledTasks = patientHealthTasks.filter(task => getTaskStatus(task) === 'scheduled');

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

  const stats = {
    total: patientHealthTasks.length,
    overdue: patientHealthTasks.filter(task => isTaskOverdue(task)).length,
    pending: patientHealthTasks.filter(task => isTaskPendingToday(task)).length,
    dueSoon: patientHealthTasks.filter(task => getTaskStatus(task) === 'due_soon').length,
    vitalSigns: patientHealthTasks.filter(task => task.health_record_type === '生命表徵').length,
    bloodSugar: patientHealthTasks.filter(task => task.health_record_type === '血糖控制').length,
    weight: patientHealthTasks.filter(task => task.health_record_type === '體重控制').length,
    scheduled: scheduledTasks.length
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
              <p className="text-sm text-gray-600">未完成</p>
              <p className="text-2xl font-bold text-green-600">{stats.pending}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
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
              <p className="text-sm text-gray-600">排程中</p>
              <p className="text-2xl font-bold text-purple-600">{stats.scheduled}</p>
            </div>
            <CheckSquare className="h-8 w-8 text-purple-600" />
          </div>
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
                placeholder="搜索院友姓名、床號、任務類型、頻率或備註..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn-secondary flex items-center space-x-2 ${
                  showAdvancedFilters ? 'bg-blue-50 text-blue-700' : ''
                } ${hasAdvancedFilters() ? 'border-blue-300' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>進階篩選</span>
                {hasAdvancedFilters() && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    已套用
                  </span>
                )}
              </button>
              
              {(searchTerm || filterType !== 'all' || filterStatus !== 'all' || hasAdvancedFilters()) && (
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
          
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">進階篩選</h3>
              
              <div className="mb-4">
                <label className="form-label">到期日期區間</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={advancedFilters.startDate}
                    onChange={(e) => updateAdvancedFilter('startDate', e.target.value)}
                    className="form-input"
                    placeholder="開始日期"
                  />
                  <span className="text-gray-500">至</span>
                  <input
                    type="date"
                    value={advancedFilters.endDate}
                    onChange={(e) => updateAdvancedFilter('endDate', e.target.value)}
                    className="form-input"
                    placeholder="結束日期"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">床號</label>
                  <input
                    type="text"
                    value={advancedFilters.床號}
                    onChange={(e) => updateAdvancedFilter('床號', e.target.value)}
                    className="form-input"
                    placeholder="搜索床號..."
                  />
                </div>
                
                <div>
                  <label className="form-label">中文姓名</label>
                  <input
                    type="text"
                    value={advancedFilters.中文姓名}
                    onChange={(e) => updateAdvancedFilter('中文姓名', e.target.value)}
                    className="form-input"
                    placeholder="搜索姓名..."
                  />
                </div>
                
                <div>
                  <label className="form-label">任務類型</label>
                  <select
                    value={advancedFilters.health_record_type}
                    onChange={(e) => updateAdvancedFilter('health_record_type', e.target.value)}
                    className="form-input"
                  >
                    <option value="">所有類型</option>
                    <option value="生命表徵">生命表徵</option>
                    <option value="血糖控制">血糖控制</option>
                    <option value="體重控制">體重控制</option>
                    <option value="約束物品同意書">約束物品同意書</option>
                    <option value="年度體檢">年度體檢</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">頻率單位</label>
                  <select
                    value={advancedFilters.frequency_unit}
                    onChange={(e) => updateAdvancedFilter('frequency_unit', e.target.value)}
                    className="form-input"
                  >
                    <option value="">所有頻率</option>
                    <option value="daily">每日</option>
                    <option value="weekly">每週</option>
                    <option value="monthly">每月</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">狀態</label>
                  <select
                    value={advancedFilters.status}
                    onChange={(e) => updateAdvancedFilter('status', e.target.value)}
                    className="form-input"
                  >
                    <option value="">所有狀態</option>
                    <option value="overdue">逾期</option>
                    <option value="pending">未完成</option>
                    <option value="due_soon">即將到期</option>
                    <option value="scheduled">排程中</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">備註</label>
                  <input
                    type="text"
                    value={advancedFilters.notes}
                    onChange={(e) => updateAdvancedFilter('notes', e.target.value)}
                    className="form-input"
                    placeholder="搜索備註內容..."
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>顯示 {sortedTasks.length} / {patientHealthTasks.length} 個任務</span>
            {(searchTerm || filterType !== 'all' || filterStatus !== 'all' || hasAdvancedFilters()) && (
              <span className="text-blue-600">已套用篩選條件</span>
            )}
          </div>
        </div>
      </div>

      {/* 選取控制 */}
      {sortedTasks.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedRows.size === sortedTasks.length ? '取消全選' : '全選'}
              </button>
              <button
                onClick={handleInvertSelection}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                反選
              </button>
              {selectedRows.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                  disabled={deletingIds.size > 0}
                >
                  刪除選定任務 ({selectedRows.size})
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              已選擇 {selectedRows.size} / {sortedTasks.length} 個任務
            </div>
          </div>
        </div>
      )}

      {/* 任務列表 */}
      <div className="card overflow-hidden">
        {sortedTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === sortedTasks.length && sortedTasks.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <SortableHeader field="patient_name">院友</SortableHeader>
                  <SortableHeader field="health_record_type">任務類型</SortableHeader>
                  <SortableHeader field="frequency">頻率</SortableHeader>
                  <SortableHeader field="next_due_at">下次到期</SortableHeader>
                  <SortableHeader field="last_completed_at">最後完成</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <SortableHeader field="notes">備註</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTasks.map(task => {
                  const patient = patients.find(p => p.院友id === task.patient_id);
                  return (
                    <tr 
                      key={task.id} 
                      className={`hover:bg-gray-50 ${selectedRows.has(task.id) ? 'bg-blue-50' : ''}`}
                      onDoubleClick={() => handleEdit(task)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(task.id)}
                          onChange={() => handleSelectRow(task.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
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
                          <span>
                            {isDocumentTask(task.health_record_type)
                              ? new Date(task.next_due_at).toLocaleDateString('zh-TW')
                              : new Date(task.next_due_at).toLocaleString('zh-TW')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.last_completed_at ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>
                              {isDocumentTask(task.health_record_type)
                                ? new Date(task.last_completed_at).toLocaleDateString('zh-TW')
                                : new Date(task.last_completed_at).toLocaleString('zh-TW')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">尚未完成</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(task)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {task.notes || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(task)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編輯"
                            disabled={deletingIds.has(task.id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-red-600 hover:text-red-900"
                            title="刪除"
                            disabled={deletingIds.has(task.id)}
                          >
                            {deletingIds.has(task.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
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
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' || hasAdvancedFilters() ? '找不到符合條件的任務' : '暫無健康任務'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' || hasAdvancedFilters() ? '請嘗試調整搜索條件' : '開始為院友建立定期健康檢查任務'}
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && !hasAdvancedFilters() ? (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                新增任務
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