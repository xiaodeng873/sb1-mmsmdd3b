import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  Download,
  User,
  Clock,
  MapPin,
  Car,
  UserCheck,
  ChevronUp,
  ChevronDown,
  Copy,
  MessageSquare
} from 'lucide-react';
import { usePatients, type FollowUpAppointment } from '../context/PatientContext';
import FollowUpModal from '../components/FollowUpModal';
import PatientTooltip from '../components/PatientTooltip';

type SortField = '覆診日期' | '覆診時間' | '院友姓名' | '覆診地點' | '覆診專科' | '狀態' | '交通安排' | '陪診人員';
type SortDirection = 'asc' | 'desc';

interface AdvancedFilters {
  床號: string;
  中文姓名: string;
  覆診地點: string;
  覆診專科: string;
  交通安排: string;
  陪診人員: string;
  狀態: string;
  備註: string;
  startDate: string;
  endDate: string;
}

const FollowUpManagement: React.FC = () => {
  const { followUpAppointments, patients, deleteFollowUpAppointment, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<FollowUpAppointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('覆診日期');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    床號: '',
    中文姓名: '',
    覆診地點: '',
    覆診專科: '',
    交通安排: '',
    陪診人員: '',
    狀態: '',
    備註: '',
    startDate: '',
    endDate: ''
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

  const filteredAppointments = followUpAppointments.filter(appointment => {
    const patient = patients.find(p => p.院友id === appointment.院友id);
    
    if (advancedFilters.startDate || advancedFilters.endDate) {
      const appointmentDate = new Date(appointment.覆診日期);
      if (advancedFilters.startDate && appointmentDate < new Date(advancedFilters.startDate)) {
        return false;
      }
      if (advancedFilters.endDate && appointmentDate > new Date(advancedFilters.endDate)) {
        return false;
      }
    }
    
    if (advancedFilters.床號 && !patient?.床號.toLowerCase().includes(advancedFilters.床號.toLowerCase())) {
      return false;
    }
    if (advancedFilters.中文姓名 && !patient?.中文姓名.toLowerCase().includes(advancedFilters.中文姓名.toLowerCase())) {
      return false;
    }
    if (advancedFilters.覆診地點 && !appointment.覆診地點?.toLowerCase().includes(advancedFilters.覆診地點.toLowerCase())) {
      return false;
    }
    if (advancedFilters.覆診專科 && !appointment.覆診專科?.toLowerCase().includes(advancedFilters.覆診專科.toLowerCase())) {
      return false;
    }
    if (advancedFilters.交通安排 && !appointment.交通安排?.toLowerCase().includes(advancedFilters.交通安排.toLowerCase())) {
      return false;
    }
    if (advancedFilters.陪診人員 && !appointment.陪診人員?.toLowerCase().includes(advancedFilters.陪診人員.toLowerCase())) {
      return false;
    }
    if (advancedFilters.狀態 && appointment.狀態 !== advancedFilters.狀態) {
      return false;
    }
    if (advancedFilters.備註 && !appointment.備註?.toLowerCase().includes(advancedFilters.備註.toLowerCase())) {
      return false;
    }
    
    const matchesSearch = patient?.中文姓名.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.覆診地點?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.覆診專科?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.備註?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         new Date(appointment.覆診日期).toLocaleDateString('zh-TW').includes(searchTerm.toLowerCase()) ||
                         false;
    
    return matchesSearch;
  });

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
    setAdvancedFilters({
      床號: '',
      中文姓名: '',
      覆診地點: '',
      覆診專科: '',
      交通安排: '',
      陪診人員: '',
      狀態: '',
      備註: '',
      startDate: '',
      endDate: ''
    });
  };

  const getUniqueOptions = (field: string) => {
    const values = new Set<string>();
    followUpAppointments.forEach(appointment => {
      let value = '';
      
      switch (field) {
        case '覆診地點':
          value = appointment.覆診地點 || '';
          break;
        case '覆診專科':
          value = appointment.覆診專科 || '';
          break;
        case '交通安排':
          value = appointment.交通安排 || '';
          break;
        case '陪診人員':
          value = appointment.陪診人員 || '';
          break;
        default:
          return;
      }
      
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  };

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const patientA = patients.find(p => p.院友id === a.院友id);
    const patientB = patients.find(p => p.院友id === b.院友id);
    
    let valueA: string | number = '';
    let valueB: string | number = '';
    
    switch (sortField) {
      case '覆診日期':
        valueA = new Date(`${a.覆診日期} ${a.覆診時間 || '00:00'}`).getTime();
        valueB = new Date(`${b.覆診日期} ${b.覆診時間 || '00:00'}`).getTime();
        break;
      case '覆診時間':
        valueA = a.覆診時間 || '';
        valueB = b.覆診時間 || '';
        break;
      case '院友姓名':
        valueA = patientA?.中文姓名 || '';
        valueB = patientB?.中文姓名 || '';
        break;
      case '覆診地點':
        valueA = a.覆診地點 || '';
        valueB = b.覆診地點 || '';
        break;
      case '覆診專科':
        valueA = a.覆診專科 || '';
        valueB = b.覆診專科 || '';
        break;
      case '狀態':
        valueA = a.狀態;
        valueB = b.狀態;
        break;
      case '交通安排':
        valueA = a.交通安排 || '';
        valueB = b.交通安排 || '';
        break;
      case '陪診人員':
        valueA = a.陪診人員 || '';
        valueB = b.陪診人員 || '';
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

  const handleEdit = (appointment: FollowUpAppointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const appointment = followUpAppointments.find(a => a.覆診id === id);
    const patient = patients.find(p => p.院友id === appointment?.院友id);
    
    if (confirm(`確定要刪除 ${patient?.中文姓名} 在 ${appointment?.覆診日期} 的覆診安排嗎？`)) {
      try {
        setDeletingIds(prev => new Set(prev).add(id));
        await deleteFollowUpAppointment(id);
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } catch (error) {
        alert('刪除覆診安排失敗，請重試');
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

    const selectedAppointments = sortedAppointments.filter(a => selectedRows.has(a.覆診id));
    const confirmMessage = `確定要刪除 ${selectedRows.size} 筆覆診安排嗎？\n\n此操作無法復原。`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const deletingArray = Array.from(selectedRows);
    setDeletingIds(new Set(deletingArray));
    
    try {
      for (const appointmentId of deletingArray) {
        await deleteFollowUpAppointment(appointmentId);
      }
      setSelectedRows(new Set());
      alert(`成功刪除 ${deletingArray.length} 筆覆診安排`);
    } catch (error) {
      console.error('批量刪除覆診安排失敗:', error);
      alert('批量刪除覆診安排失敗，請重試');
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleSelectRow = (appointmentId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId);
    } else {
      newSelected.add(appointmentId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === sortedAppointments.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedAppointments.map(a => a.覆診id)));
    }
  };

  const handleInvertSelection = () => {
    const newSelected = new Set<string>();
    sortedAppointments.forEach(appointment => {
      if (!selectedRows.has(appointment.覆診id)) {
        newSelected.add(appointment.覆診id);
      }
    });
    setSelectedRows(newSelected);
  };

  const handleExportSelected = () => {
    const selectedAppointments = sortedAppointments.filter(a => selectedRows.has(a.覆診id));
    
    if (selectedAppointments.length === 0) {
      alert('請先選擇要匯出的記錄');
      return;
    }

    const exportData = selectedAppointments.map(appointment => {
      const patient = patients.find(p => p.院友id === appointment.院友id);
      return {
        床號: patient?.床號 || '',
        中文姓名: patient?.中文姓名 || '',
        覆診日期: new Date(appointment.覆診日期).toLocaleDateString('zh-TW'),
        出發時間: appointment.出發時間 || '',
        覆診時間: appointment.覆診時間 || '',
        覆診地點: appointment.覆診地點 || '',
        覆診專科: appointment.覆診專科 || '',
        交通安排: appointment.交通安排 || '',
        陪診人員: appointment.陪診人員 || '',
        狀態: appointment.狀態,
        備註: appointment.備註 || ''
      };
    });

    const headers = ['床號', '中文姓名', '覆診日期', '出發時間', '覆診時間', '覆診地點', '覆診專科', '交通安排', '陪診人員', '狀態', '備註'];
    const csvContent = [
      `"院友覆診表"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      `"總記錄數: ${exportData.length}"`,
      '',
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `院友覆診表_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateNotificationMessage = (appointment: FollowUpAppointment) => {
    const patient = patients.find(p => p.院友id === appointment.院友id);
    if (!patient || !appointment.覆診日期 || !appointment.覆診時間 || !appointment.覆診地點 || !appointment.覆診專科) {
      return '';
    }
    
    return `您好！這是善頤福群護老院C站的信息："${patient.中文姓名}"將於"${new Date(appointment.覆診日期).toLocaleDateString('zh-TW')}"的"${appointment.覆診時間}"，於"${appointment.覆診地點}"有"${appointment.覆診專科}"的治療安排。請問需要輪椅的士代步/陪診員嗎？請盡快告知您的安排，謝謝！`;
  };

  const copyNotificationMessage = (appointment: FollowUpAppointment) => {
    const message = generateNotificationMessage(appointment);
    if (message) {
      navigator.clipboard.writeText(message);
      alert('通知訊息已複製到剪貼簿');
    } else {
      alert('覆診資訊不完整，無法生成通知訊息');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '尚未安排': return 'bg-gray-100 text-red-600';
      case '已安排': return 'bg-blue-100 text-blue-800';
      case '已完成': return 'bg-green-100 text-green-800';
      case '改期': return 'bg-orange-100 text-orange-800';
      case '取消': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">覆診管理</h1>
        <div className="flex items-center space-x-2">
          {selectedRows.size > 0 && (
            <button
              onClick={handleExportSelected}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>匯出選定記錄</span>
            </button>
          )}
          <button
            onClick={() => {
              setSelectedAppointment(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>新增覆診安排</span>
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索院友姓名、床號、覆診日期、地點、專科或備註..."
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
              
              {(searchTerm || hasAdvancedFilters()) && (
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
                <label className="form-label">覆診日期區間</label>
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
                  <label className="form-label">覆診地點</label>
                  <input
                    list="location-options"
                    value={advancedFilters.覆診地點}
                    onChange={(e) => updateAdvancedFilter('覆診地點', e.target.value)}
                    className="form-input"
                    placeholder="選擇或輸入地點..."
                  />
                  <datalist id="location-options">
                    {getUniqueOptions('覆診地點').map(option => (
                      <option key={option} value={option} className={option === '尚未安排' ? 'text-red-600' : ''} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="form-label">覆診專科</label>
                  <input
                    list="specialty-options"
                    value={advancedFilters.覆診專科}
                    onChange={(e) => updateAdvancedFilter('覆診專科', e.target.value)}
                    className="form-input"
                    placeholder="選擇或輸入專科..."
                  />
                  <datalist id="specialty-options">
                    {getUniqueOptions('覆診專科').map(option => (
                      <option key={option} value={option} className={option === '尚未安排' ? 'text-red-600' : ''} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="form-label">交通安排</label>
                  <input
                    list="transport-options"
                    value={advancedFilters.交通安排}
                    onChange={(e) => updateAdvancedFilter('交通安排', e.target.value)}
                    className="form-input"
                    placeholder="選擇或輸入交通安排..."
                  />
                  <datalist id="transport-options">
                    {getUniqueOptions('交通安排').map(option => (
                      <option key={option} value={option} className={option === '尚未安排' ? 'text-red-600' : ''} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="form-label">陪診人員</label>
                  <input
                    list="companion-options"
                    value={advancedFilters.陪診人員}
                    onChange={(e) => updateAdvancedFilter('陪診人員', e.target.value)}
                    className="form-input"
                    placeholder="選擇或輸入陪診人員..."
                  />
                  <datalist id="companion-options">
                    {getUniqueOptions('陪診人員').map(option => (
                      <option key={option} value={option} className={option === '尚未安排' ? 'text-red-600' : ''} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="form-label">狀態</label>
                  <select
                    value={advancedFilters.狀態}
                    onChange={(e) => updateAdvancedFilter('狀態', e.target.value)}
                    className="form-input"
                  >
                    <option value="">所有狀態</option>
                    <option value="尚未安排" className="text-red-600">尚未安排</option>
                    <option value="已安排">已安排</option>
                    <option value="已完成">已完成</option>
                    <option value="改期">改期</option>
                    <option value="取消">取消</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">備註</label>
                  <input
                    type="text"
                    value={advancedFilters.備註}
                    onChange={(e) => updateAdvancedFilter('備註', e.target.value)}
                    className="form-input"
                    placeholder="搜索備註內容..."
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>顯示 {sortedAppointments.length} / {followUpAppointments.length} 筆覆診安排</span>
            {(searchTerm || hasAdvancedFilters()) && (
              <span className="text-blue-600">已套用篩選條件</span>
            )}
          </div>
        </div>
      </div>

      {sortedAppointments.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedRows.size === sortedAppointments.length ? '取消全選' : '全選'}
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
                  刪除選定記錄 ({selectedRows.size})
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              已選擇 {selectedRows.size} / {sortedAppointments.length} 筆記錄
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {sortedAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === sortedAppointments.length && sortedAppointments.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    院友
                  </th>
                  <SortableHeader field="覆診日期">覆診日期</SortableHeader>
                  <SortableHeader field="覆診時間">時間安排</SortableHeader>
                  <SortableHeader field="覆診地點">覆診地點</SortableHeader>
                  <SortableHeader field="覆診專科">覆診專科</SortableHeader>
                  <SortableHeader field="交通安排">交通安排</SortableHeader>
                  <SortableHeader field="陪診人員">陪診人員</SortableHeader>
                  <SortableHeader field="狀態">狀態</SortableHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAppointments.map(appointment => {
                  const patient = patients.find(p => p.院友id === appointment.院友id);
                  const notificationMessage = generateNotificationMessage(appointment);
                  
                  return (
                    <tr 
                      key={appointment.覆診id} 
                      className={`hover:bg-gray-50 ${selectedRows.has(appointment.覆診id) ? 'bg-blue-50' : ''}`}
                      onDoubleClick={() => handleEdit(appointment)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(appointment.覆診id)}
                          onChange={() => handleSelectRow(appointment.覆診id)}
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(appointment.覆診日期).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          {appointment.出發時間 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Clock className="h-3 w-3 mr-1" />
                              出發: {appointment.出發時間.slice(0, 5)}
                            </div>
                          )}
                          {appointment.覆診時間 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <CalendarCheck className="h-3 w-3 mr-1" />
                              覆診: {appointment.覆診時間.slice(0, 5)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          {appointment.覆診地點 || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.覆診專科 || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-1 text-gray-400" />
                          <span className={appointment.交通安排 === '尚未安排' ? 'text-red-600' : 'text-gray-900'}>
                            {appointment.交通安排 || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <UserCheck className="h-4 w-4 mr-1 text-gray-400" />
                          <span className={appointment.陪診人員 === '尚未安排' ? 'text-red-600' : 'text-gray-900'}>
                            {appointment.陪診人員 || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(appointment.狀態)}`}>
                          {appointment.狀態}
                        </span>
                        {appointment.備註 && (appointment.狀態 === '改期' || appointment.狀態 === '取消') && (
                          <div className="text-xs text-gray-500 mt-1" title={appointment.備註}>
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            {appointment.備註.length > 20 ? `${appointment.備註.substring(0, 20)}...` : appointment.備註}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {notificationMessage && (
                            <button
                              onClick={() => copyNotificationMessage(appointment)}
                              className="text-green-600 hover:text-green-900"
                              title="複製通知訊息"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(appointment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編輯"
                            disabled={deletingIds.has(appointment.覆診id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(appointment.覆診id)}
                            className="text-red-600 hover:text-red-900"
                            title="刪除"
                            disabled={deletingIds.has(appointment.覆診id)}
                          >
                            {deletingIds.has(appointment.覆診id) ? (
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
            <CalendarCheck className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || hasAdvancedFilters() ? '找不到符合條件的覆診安排' : '暫無覆診安排'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || hasAdvancedFilters() ? '請嘗試調整搜索條件' : '開始新增院友的覆診安排'}
            </p>
            {!searchTerm && !hasAdvancedFilters() ? (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                新增覆診安排
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
        <FollowUpModal
          appointment={selectedAppointment}
          onClose={() => {
            setShowModal(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
};

export default FollowUpManagement;