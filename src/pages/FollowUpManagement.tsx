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

const FollowUpManagement: React.FC = () => {
  const { followUpAppointments, patients, deleteFollowUpAppointment, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<FollowUpAppointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('覆診日期');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dateFilter, setDateFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
    
    // 日期篩選
    if (dateFilter && appointment.覆診日期 !== dateFilter) {
      return false;
    }
    
    const matchesSearch = patient?.中文姓名.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient?.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.覆診地點?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.覆診專科?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.備註?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         new Date(appointment.覆診日期).toLocaleDateString('zh-TW').includes(searchTerm.toLowerCase()) ||
                         false;
    const matchesStatus = filterStatus === '' || appointment.狀態 === filterStatus;
    const matchesLocation = filterLocation === '' || appointment.覆診地點 === filterLocation;
    return matchesSearch && matchesStatus && matchesLocation;
  });

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
        await deleteFollowUpAppointment(id);
      } catch (error) {
        alert('刪除覆診安排失敗，請重試');
      }
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

    // Create CSV content
    const headers = ['床號', '中文姓名', '覆診日期', '出發時間', '覆診時間', '覆診地點', '覆診專科', '交通安排', '陪診人員', '狀態', '備註'];
    const csvContent = [
      `"院友覆診表"`,
      `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"`,
      `"總記錄數: ${exportData.length}"`,
      '',
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `院友覆診表_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterLocation('');
    setDateFilter('');
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
      case '尚未安排': return 'bg-gray-100 text-gray-800';
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

  // 獲取唯一的覆診地點列表
  const uniqueLocations = Array.from(new Set(followUpAppointments.map(a => a.覆診地點).filter(Boolean)));

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

      {/* 搜索和篩選 */}
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
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-input lg:w-40"
                title="按覆診日期篩選"
              />
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`btn-secondary flex items-center space-x-2 ${showAdvancedFilters ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>進階篩選</span>
              </button>
              
              {(searchTerm || filterStatus || filterLocation || dateFilter) && (
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
          
          {/* 進階篩選面板 */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">狀態</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="form-input"
                  >
                    <option value="">所有狀態</option>
                    <option value="尚未安排">尚未安排</option>
                    <option value="已安排">已安排</option>
                    <option value="已完成">已完成</option>
                    <option value="改期">改期</option>
                    <option value="取消">取消</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">覆診地點</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="form-input"
                  >
                    <option value="">所有地點</option>
                    {uniqueLocations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* 搜索結果統計 */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>顯示 {sortedAppointments.length} / {followUpAppointments.length} 筆覆診安排</span>
            {(searchTerm || filterStatus || filterLocation || dateFilter) && (
              <span className="text-blue-600">已套用篩選條件</span>
            )}
          </div>
        </div>
      </div>

      {/* 選擇控制 */}
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
            </div>
            <div className="text-sm text-gray-600">
              已選擇 {selectedRows.size} / {sortedAppointments.length} 筆記錄
            </div>
          </div>
        </div>
      )}

      {/* 覆診安排表格 */}
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
                              出發: {appointment.出發時間}
                            </div>
                          )}
                          {appointment.覆診時間 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <CalendarCheck className="h-3 w-3 mr-1" />
                              覆診: {appointment.覆診時間}
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-1 text-gray-400" />
                          {appointment.交通安排 || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <UserCheck className="h-4 w-4 mr-1 text-gray-400" />
                          {appointment.陪診人員 || '-'}
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
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(appointment.覆診id)}
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
            <CalendarCheck className="h-24 w-24 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus || filterLocation || dateFilter ? '找不到符合條件的覆診安排' : '暫無覆診安排'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus || filterLocation || dateFilter ? '請嘗試調整搜索條件' : '開始新增院友的覆診安排'}
            </p>
            {!searchTerm && !filterStatus && !filterLocation && !dateFilter ? (
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

      {/* 模態框 */}
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