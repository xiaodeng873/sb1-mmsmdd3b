import React, { useState } from 'react';
import { 
  Users, Plus, Edit3, Trash2, Search, Filter, User, Calendar, Shield, AlertTriangle,
  Grid3X3, List, ChevronUp, ChevronDown, Download, X
} from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import PatientModal from '../components/PatientModal';

type ViewMode = 'cards' | 'table';
type SortField = '床號' | '中文姓名' | '性別' | '出生日期' | '身份證號碼';
type SortDirection = 'asc' | 'desc';

const PatientRecords: React.FC = () => {
  const { patients, deletePatient, loading } = usePatients();
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>('床號');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    床號: '',
    中文姓名: '',
    英文姓名: '',
    性別: '',
    身份證號碼: '',
    出生日期: '',
    藥物敏感: '',
    不良藥物反應: '',
    感染控制: ''
  });

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

  const filteredPatients = patients.filter(patient => {
    let matchesSearch = true;
    if (searchTerm) {
      matchesSearch = patient.中文姓名.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      patient.床號.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (patient.英文姓名?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                      patient.身份證號碼.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      patient.出生日期.includes(searchTerm) ||
                      (patient.藥物敏感 && Array.isArray(patient.藥物敏感) && 
                       patient.藥物敏感.some(allergy => allergy.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                      (patient.不良藥物反應 && Array.isArray(patient.不良藥物反應) && 
                       patient.不良藥物反應.some(reaction => reaction.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                      (patient.感染控制 && Array.isArray(patient.感染控制) && 
                       patient.感染控制.some(control => control.toLowerCase().includes(searchTerm.toLowerCase())));
    }
    
    let matchesAdvanced = true;
    if (showAdvancedSearch) {
      if (advancedFilters.床號 && !patient.床號.toLowerCase().includes(advancedFilters.床號.toLowerCase())) {
        matchesAdvanced = false;
      }
      if (advancedFilters.中文姓名 && !patient.中文姓名.toLowerCase().includes(advancedFilters.中文姓名.toLowerCase())) {
        matchesAdvanced = false;
      }
      if (advancedFilters.英文姓名 && (!patient.英文姓名 || !patient.英文姓名.toLowerCase().includes(advancedFilters.英文姓名.toLowerCase()))) {
        matchesAdvanced = false;
      }
      if (advancedFilters.身份證號碼 && !patient.身份證號碼.toLowerCase().includes(advancedFilters.身份證號碼.toLowerCase())) {
        matchesAdvanced = false;
      }
      if (advancedFilters.出生日期 && !patient.出生日期.includes(advancedFilters.出生日期)) {
        matchesAdvanced = false;
      }
      if (advancedFilters.藥物敏感 && (!patient.藥物敏感 || !Array.isArray(patient.藥物敏感) || 
          !patient.藥物敏感.some(allergy => allergy.toLowerCase().includes(advancedFilters.藥物敏感.toLowerCase())))) {
        matchesAdvanced = false;
      }
      if (advancedFilters.不良藥物反應 && (!patient.不良藥物反應 || !Array.isArray(patient.不良藥物反應) || 
          !patient.不良藥物反應.some(reaction => reaction.toLowerCase().includes(advancedFilters.不良藥物反應.toLowerCase())))) {
        matchesAdvanced = false;
      }
      if (advancedFilters.感染控制 && (!patient.感染控制 || !Array.isArray(patient.感染控制) || 
          !patient.感染控制.some(control => control.toLowerCase().includes(advancedFilters.感染控制.toLowerCase())))) {
        matchesAdvanced = false;
      }
    }
    
    const matchesGender = filterGender === '' || patient.性別 === filterGender;
    return matchesSearch && matchesAdvanced && matchesGender;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let valueA: string | number = '';
    let valueB: string | number = '';
    
    switch (sortField) {
      case '床號':
        valueA = a.床號;
        valueB = b.床號;
        break;
      case '中文姓名':
        valueA = a.中文姓名;
        valueB = b.中文姓名;
        break;
      case '性別':
        valueA = a.性別;
        valueB = b.性別;
        break;
      case '出生日期':
        valueA = new Date(a.出生日期).getTime();
        valueB = new Date(b.出生日期).getTime();
        break;
      case '身份證號碼':
        valueA = a.身份證號碼;
        valueB = b.身份證號碼;
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

  const handleEdit = (patient: any) => {
    setSelectedPatient(patient);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('確定要刪除此院友記錄嗎？')) {
      deletePatient(id);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectRow = (patientId: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === sortedPatients.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedPatients.map(p => p.院友id)));
    }
  };

  const handleInvertSelection = () => {
    const newSelected = new Set<number>();
    sortedPatients.forEach(patient => {
      if (!selectedRows.has(patient.院友id)) {
        newSelected.add(patient.院友id);
      }
    });
    setSelectedRows(newSelected);
  };

  const handleExportSelected = () => {
    const selectedPatients = sortedPatients.filter(p => selectedRows.has(p.院友id));
    
    if (selectedPatients.length === 0) {
      alert('請先選擇要匯出的記錄');
      return;
    }

    const exportData = selectedPatients.map(patient => ({
      床號: patient.床號,
      中文姓名: patient.中文姓名,
      英文姓名: patient.英文姓名 || '',
      性別: patient.性別,
      身份證號碼: patient.身份證號碼,
      出生日期: new Date(patient.出生日期).toLocaleDateString('zh-TW'),
      年齡: calculateAge(patient.出生日期),
      藥物敏感: patient.藥物敏感 || '無',
      不良藥物反應: patient.不良藥物反應 || '無',
      感染控制: patient.感染控制 || '無'
    }));

    const headers = ['床號', '中文姓名', '英文姓名', '性別', '身份證號碼', '出生日期', '年齡', '藥物敏感', '不良藥物反應', '感染控制'];
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `院友記錄_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterGender('');
    setAdvancedFilters({
      床號: '',
      中文姓名: '',
      英文姓名: '',
      性別: '',
      身份證號碼: '',
      出生日期: '',
      藥物敏感: '',
      不良藥物反應: '',
      感染控制: ''
    });
  };

  const hasActiveFilters = () => {
    return searchTerm || filterGender || 
           Object.values(advancedFilters).some(value => value !== '');
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
        <h1 className="text-2xl font-bold text-gray-900">院友記錄</h1>
        <div className="flex items-center space-x-2">
          {viewMode === 'table' && selectedRows.size > 0 && (
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
              setSelectedPatient(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>新增院友</span>
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
                placeholder="搜索院友姓名、床號、身份證號碼、出生日期、藥物敏感、不良藥物反應、感染控制..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={`btn-secondary flex items-center space-x-2 ${showAdvancedSearch ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <Filter className="h-4 w-4" />
                <span>進階篩選</span>
              </button>
              
              {hasActiveFilters() && (
                <button
                  onClick={clearAllFilters}
                  className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  <span>清除</span>
                </button>
              )}
            </div>
          </div>
          
          {showAdvancedSearch && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">進階篩選</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">床號</label>
                  <input
                    type="text"
                    value={advancedFilters.床號}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 床號: e.target.value }))}
                    className="form-input"
                    placeholder="搜索床號..."
                  />
                </div>
                
                <div>
                  <label className="form-label">中文姓名</label>
                  <input
                    type="text"
                    value={advancedFilters.中文姓名}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 中文姓名: e.target.value }))}
                    className="form-input"
                    placeholder="搜索中文姓名..."
                  />
                </div>
                
                <div>
                  <label className="form-label">英文姓名</label>
                  <input
                    type="text"
                    value={advancedFilters.英文姓名}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 英文姓名: e.target.value }))}
                    className="form-input"
                    placeholder="搜索英文姓名..."
                  />
                </div>
                
                <div>
                  <label className="form-label">身份證號碼</label>
                  <input
                    type="text"
                    value={advancedFilters.身份證號碼}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 身份證號碼: e.target.value }))}
                    className="form-input"
                    placeholder="搜索身份證號碼..."
                  />
                </div>
                
                <div>
                  <label className="form-label">出生日期</label>
                  <input
                    type="date"
                    value={advancedFilters.出生日期}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 出生日期: e.target.value }))}
                    className="form-input"
                  />
                </div>
                
                <div>
                  <label className="form-label">性別</label>
                  <select
                    value={advancedFilters.性別}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 性別: e.target.value }))}
                    className="form-input"
                  >
                    <option value="">所有性別</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">藥物敏感</label>
                  <input
                    type="text"
                    value={advancedFilters.藥物敏感}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 藥物敏感: e.target.value }))}
                    className="form-input"
                    placeholder="搜索藥物敏感..."
                  />
                </div>
                
                <div>
                  <label className="form-label">不良藥物反應</label>
                  <input
                    type="text"
                    value={advancedFilters.不良藥物反應}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 不良藥物反應: e.target.value }))}
                    className="form-input"
                    placeholder="搜索不良藥物反應..."
                  />
                </div>
                
                <div>
                  <label className="form-label">感染控制</label>
                  <input
                    type="text"
                    value={advancedFilters.感染控制}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, 感染控制: e.target.value }))}
                    className="form-input"
                    placeholder="搜索感染控制項目"
                  />
                </div>
              </div>
            </div>
          )}
        
          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
            <span>顯示 {filteredPatients.length} / {patients.length} 位院友</span>
            {hasActiveFilters() && (
              <button
                onClick={clearAllFilters}
                className="btn-secondary"
              >
                清除所有篩選
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              <span>卡片</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              <span>表格</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' && sortedPatients.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedRows.size === sortedPatients.length ? '取消全選' : '全選'}
              </button>
              <button
                onClick={handleInvertSelection}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                反選
              </button>
            </div>
            <div className="text-sm text-gray-600">
              已選擇 {selectedRows.size} / {sortedPatients.length} 筆記錄
            </div>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedPatients.length > 0 ? (
            sortedPatients.map(patient => (
              <div key={patient.院友id} className="card hover-scale overflow-hidden">
                <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 bg-white rounded-xl shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0">
                      {patient.院友相片 ? (
                        <img 
                          src={patient.院友相片} 
                          alt={patient.中文姓名} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {patient.床號}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleEdit(patient)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="編輯"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(patient.院友id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="刪除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                        {patient.中文姓名}
                      </h3>
                      
                      {patient.英文姓名 && (
                        <p className="text-sm text-gray-600 truncate mb-2">
                          {patient.英文姓名}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded-full ${
                          patient.性別 === '男' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {patient.性別}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {calculateAge(patient.出生日期)}歲
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 w-20 flex-shrink-0">身份證:</span>
                      <span className="text-gray-900 font-mono">{patient.身份證號碼}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 w-20 flex-shrink-0">出生日期:</span>
                      <span className="text-gray-900">
                        {new Date(patient.出生日期).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-2">
                      {patient.藥物敏感?.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <Shield className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-orange-800 mb-1">藥物敏感</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.藥物敏感.map((allergy, index) => (
                                  <span key={index} className="text-xs text-orange-700 bg-orange-100 px-1 rounded">
                                    {allergy}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {patient.不良藥物反應?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-red-800 mb-1">不良藥物反應</p>
                              <div className="flex flex-wrap gap-1">
                                {patient.不良藥物反應.map((reaction, index) => (
                                  <span key={index} className="text-xs text-red-700 bg-red-100 px-1 rounded">
                                    {reaction}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {(!patient.藥物敏感?.length && !patient.不良藥物反應?.length) && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-green-600" />
                            <p className="text-xs text-green-700">無已知藥物敏感、不良藥物反應</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {patient.感染控制?.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Shield className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-purple-800 mb-1">感染控制</p>
                            <div className="flex flex-wrap gap-1">
                              {patient.感染控制.map((control, index) => (
                                <span key={index} className="text-xs text-purple-700 bg-purple-100 px-1 rounded">
                                  {control}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Users className="h-24 w-24 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasActiveFilters() ? '找不到符合條件的院友' : '暫無院友記錄'}
              </h3>
              <p className="text-gray-600 mb-4">
                {hasActiveFilters() ? '請嘗試調整搜索條件' : '開始新增院友資料'}
              </p>
              {!hasActiveFilters() && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-primary"
                >
                  新增院友
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {sortedPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === sortedPatients.length && sortedPatients.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      照片
                    </th>
                    <SortableHeader field="床號">床號</SortableHeader>
                    <SortableHeader field="中文姓名">中文姓名</SortableHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      英文姓名
                    </th>
                    <SortableHeader field="性別">性別</SortableHeader>
                    <SortableHeader field="身份證號碼">身份證號碼</SortableHeader>
                    <SortableHeader field="出生日期">出生日期</SortableHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      年齡
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      醫療警示
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPatients.map(patient => (
                    <tr 
                      key={patient.院友id} 
                      className={`hover:bg-gray-50 ${selectedRows.has(patient.院友id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(patient.院友id)}
                          onChange={() => handleSelectRow(patient.院友id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
                          {patient.院友相片 ? (
                            <img 
                              src={patient.院友相片} 
                              alt={patient.中文姓名} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {patient.床號}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {patient.中文姓名}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.英文姓名 || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          patient.性別 === '男' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {patient.性別}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {patient.身份證號碼}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(patient.出生日期).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateAge(patient.出生日期)}歲
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          {patient.藥物敏感?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              <Pill className="h-3 w-3 mr-1" />
                              敏感
                            </span>
                          )}
                          {patient.不良藥物反應?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              不良藥物反應
                            </span>
                          )}
                          {(!patient.藥物敏感?.length && !patient.不良藥物反應?.length) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <Pill className="h-3 w-3 mr-1" />
                              無藥物警示
                            </span>
                          )}
                          {patient.感染控制?.length > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              感染控制
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(patient)}
                            className="text-blue-600 hover:text-blue-900"
                            title="編輯"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(patient.院友id)}
                            className="text-red-600 hover:text-red-900"
                            title="刪除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-24 w-24 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasActiveFilters() ? '找不到符合條件的院友' : '暫無院友記錄'}
              </h3>
              <p className="text-gray-600 mb-4">
                {hasActiveFilters() ? '請嘗試調整搜索條件' : '開始新增院友資料'}
              </p>
              {!hasActiveFilters() && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-primary"
                >
                  新增院友
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <PatientModal
          patient={selectedPatient}
          onClose={() => {
            setShowModal(false);
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
};

export default PatientRecords;