```typescript
import React, { useState, useEffect } from 'react';
import { X, Heart, Activity, Droplets, Scale, User, Calendar, Clock } from 'lucide-react';
import { usePatients } from '../context/PatientContext';

interface HealthRecordModalProps {
  record?: any;
  onClose: () => void;
  onTaskCompleted?: () => void;
}

const HealthRecordModal: React.FC<HealthRecordModalProps> = ({ record, onClose, onTaskCompleted }) => {
  const { patients, addHealthRecord, updateHealthRecord, healthRecords } = usePatients();
  const [formData, setFormData] = useState({
    院友id: record?.院友id || '',
    記錄日期: record?.記錄日期 || new Date().toISOString().split('T')[0],
    記錄時間: record?.記錄時間 || new Date().toTimeString().slice(0, 5),
    記錄類型: record?.記錄類型 || '生命表徵',
    血壓收縮壓: record?.血壓收縮壓 || '',
    血壓舒張壓: record?.血壓舒張壓 || '',
    脈搏: record?.脈搏 || '',
    體溫: record?.體溫 || '',
    血含氧量: record?.血含氧量 || '',
    呼吸頻率: record?.呼吸頻率 || '',
    血糖值: record?.血糖值 || '',
    體重: record?.體重 || '',
    備註: record?.備註 || '',
    記錄人員: record?.記錄人員 || ''
  });

  const [weightChange, setWeightChange] = useState<string>('');

  useEffect(() => {
    if (formData.體重 && formData.院友id && formData.記錄類型 === '體重控制') {
      calculateWeightChange();
    }
  }, [formData.體重, formData.院友id, formData.記錄類型]);

  const calculateWeightChange = () => {
    if (!formData.體重 || !formData.院友id) {
      setWeightChange('');
      return;
    }

    const currentWeight = parseFloat(formData.體重);
    if (isNaN(currentWeight)) {
      setWeightChange('');
      return;
    }

    const patientWeightRecords = healthRecords
      .filter(r => 
        r.院友id === parseInt(formData.院友id) && 
        r.體重 && 
        (record ? r.記錄id !== record.記錄id : true)
      )
      .sort((a, b) => new Date(`${b.記錄日期} ${b.記錄時間}`).getTime() - new Date(`${a.記錄日期} ${a.記錄時間}`).getTime());
    
    if (patientWeightRecords.length === 0) {
      setWeightChange('首次記錄');
      return;
    }
    
    const lastWeight = parseFloat(patientWeightRecords[0].體重);
    const difference = currentWeight - lastWeight;
    const percentage = (difference / lastWeight) * 100;
    
    if (Math.abs(percentage) < 0.1) {
      setWeightChange('無變化');
      return;
    }
    
    const sign = difference > 0 ? '+' : '';
    setWeightChange(`${sign}${difference.toFixed(1)}kg (${sign}${percentage.toFixed(1)}%)`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 驗證必填欄位
    if (!formData.院友id || !formData.記錄日期 || !formData.記錄時間 || !formData.記錄類型) {
      alert('請填寫所有必填欄位');
      return;
    }

    // 根據記錄類型驗證相關欄位
    if (formData.記錄類型 === '生命表徵') {
      if (!formData.血壓收縮壓 && !formData.血壓舒張壓 && !formData.脈搏 && !formData.體溫 && !formData.血含氧量 && !formData.呼吸頻率) {
        alert('生命表徵記錄至少需要填寫一項數值');
        return;
      }
    } else if (formData.記錄類型 === '血糖控制') {
      if (!formData.血糖值) {
        alert('血糖控制記錄需要填寫血糖值');
        return;
      }
    } else if (formData.記錄類型 === '體重控制') {
      if (!formData.體重) {
        alert('體重控制記錄需要填寫體重');
        return;
      }
    }

    try {
      const recordData = {
        院友id: parseInt(formData.院友id),
        記錄日期: formData.記錄日期,
        記錄時間: formData.記錄時間,
        記錄類型: formData.記錄類型 as '生命表徵' | '血糖控制' | '體重控制',
        血壓收縮壓: formData.血壓收縮壓 ? parseInt(formData.血壓收縮壓) : null,
        血壓舒張壓: formData.血壓舒張壓 ? parseInt(formData.血壓舒張壓) : null,
        脈搏: formData.脈搏 ? parseInt(formData.脈搏) : null,
        體溫: formData.體溫 ? parseFloat(formData.體溫) : null,
        血含氧量: formData.血含氧量 ? parseInt(formData.血含氧量) : null,
        呼吸頻率: formData.呼吸頻率 ? parseInt(formData.呼吸頻率) : null,
        血糖值: formData.血糖值 ? parseFloat(formData.血糖值) : null,
        體重: formData.體重 ? parseFloat(formData.體重) : null,
        備註: formData.備註 || null,
        記錄人員: formData.記錄人員 || null
      };

      if (record && record.記錄id) {
        // 更新記錄，確保記錄id有效
        if (isNaN(parseInt(record.記錄id))) {
          throw new Error('無效的記錄ID');
        }
        await updateHealthRecord({
          ...recordData,
          記錄id: parseInt(record.記錄id)
        });
      } else {
        // 創建新記錄，不包含記錄id
        await addHealthRecord(recordData);
      }
      
      if (onTaskCompleted) onTaskCompleted();
      onClose();
    } catch (error: any) {
      console.error('儲存健康記錄失敗:', error);
      alert(`儲存健康記錄失敗：${error.message || '請重試'}`);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '生命表徵': return <Activity className="h-5 w-5" />;
      case '血糖控制': return <Droplets className="h-5 w-5" />;
      case '體重控制': return <Scale className="h-5 w-5" />;
      default: return <Heart className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case '生命表徵': return 'text-blue-600';
      case '血糖控制': return 'text-red-600';
      case '體重控制': return 'text-green-600';
      default: return 'text-purple-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getTypeColor(formData.記錄類型)} bg-opacity-10`}>
                {getTypeIcon(formData.記錄類型)}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {record ? '編輯健康記錄' : '新增健康記錄'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">
                <User className="h-4 w-4 inline mr-1" />
                院友 *
              </label>
              <select
                name="院友id"
                value={formData.院友id}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="">請選擇院友</option>
                {patients.map(patient => (
                  <option key={patient.院友id} value={patient.院友id}>
                    {patient.床號} - {patient.中文姓名}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                <Calendar className="h-4 w-4 inline mr-1" />
                記錄日期 *
              </label>
              <input
                type="date"
                name="記錄日期"
                value={formData.記錄日期}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">
                <Clock className="h-4 w-4 inline mr-1" />
                記錄時間 *
              </label>
              <input
                type="time"
                name="記錄時間"
                value={formData.記錄時間}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">記錄類型 *</label>
              <select
                name="記錄類型"
                value={formData.記錄類型}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="生命表徵">生命表徵</option>
                <option value="血糖控制">血糖控制</option>
                <option value="體重控制">體重控制</option>
              </select>
            </div>
          </div>

          {formData.記錄類型 === '生命表徵' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-blue-600 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                生命表徵數據
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">血壓 (mmHg)</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        name="血壓收縮壓"
                        value={formData.血壓收縮壓}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="120"
                        min="0"
                        max="300"
                      />
                      <span className="flex items-center text-gray-500">/</span>
                      <input
                        type="number"
                        name="血壓舒張壓"
                        value={formData.血壓舒張壓}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="80"
                        min="0"
                        max="200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">脈搏 (每分鐘)</label>
                    <input
                      type="number"
                      name="脈搏"
                      value={formData.脈搏}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="60-100"
                      min="0"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="form-label">體溫 (°C)</label>
                    <input
                      type="number"
                      name="體溫"
                      value={formData.體溫}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="36.5"
                      min="30"
                      max="45"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">血含氧量 (%)</label>
                    <input
                      type="number"
                      name="血含氧量"
                      value={formData.血含氧量}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="95-100"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="form-label">呼吸頻率 (每分鐘)</label>
                    <input
                      type="number"
                      name="呼吸頻率"
                      value={formData.呼吸頻率}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="12-20"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="form-label">備註</label>
                    <textarea
                      name="備註"
                      value={formData.備註}
                      onChange={handleChange}
                      className="form-input"
                      rows={1}
                      placeholder="其他備註資訊..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {formData.記錄類型 === '血糖控制' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-red-600 flex items-center">
                <Droplets className="h-5 w-5 mr-2" />
                血糖控制數據
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">血糖值 (mmol/L) *</label>
                  <input
                    type="number"
                    name="血糖值"
                    value={formData.血糖值}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="4.0-7.0"
                    min="0"
                    max="50"
                    step="0.1"
                    required={formData.記錄類型 === '血糖控制'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    正常範圍：空腹 4.0-6.1，餐後 4.4-7.8
                  </p>
                </div>
              </div>
            </div>
  );

          {formData.記錄類型 === '體重控制' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-green-600 flex items-center">
                <Scale className="h-5 w-5 mr-2" />
                體重控制數據
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">體重 (kg) *</label>
                  <input
                    type="number"
                    name="體重"
                    value={formData.體重}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="50.0"
                    min="0"
                    max="300"
                    step="0.1"
                    required={formData.記錄類型 === '體重控制'}
                  />
                </div>
                
                {weightChange && (
                  <div>
                    <label className="form-label">與上次比較</label>
                    <div className={`p-3 rounded-lg border ${
                      weightChange.startsWith('+') ? 'bg-red-50 border-red-200 text-red-800' :
                      weightChange.startsWith('-') ? 'bg-green-50 border-green-200 text-green-800' :
                      'bg-gray-50 border-gray-200 text-gray-800'
                    }`}>
                      <div className="font-medium">{weightChange}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {record ? '更新記錄' : '新增記錄'}
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

export default HealthRecordModal;
```

#### PatientProvider.tsx

<xaiArtifact artifact_id="c315a93e-1224-4115-8bb6-fcafd5124abb" artifact_version_id="d5607df0-2e2e-422d-b008-5ee824fa883b" title="PatientProvider.tsx" contentType="text/typescript">
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReactNode } from 'react';
import * as db from '../lib/database';
import { useAuth } from './AuthContext';
import { createDefaultTasks } from '../utils/taskScheduler';

// Re-export types from database module
export type { Patient, Schedule, ScheduleDetail, ServiceReason, Prescription, HealthRecord } from '../lib/database';

// Extended schedule interface for UI
export interface ScheduleWithDetails extends db.Schedule {
  院友列表: db.ScheduleDetail[];
}

interface PatientContextType {
  patients: db.Patient[];
  schedules: ScheduleWithDetails[];
  serviceReasons: db.ServiceReason[];
  prescriptions: db.Prescription[];
  healthRecords: db.HealthRecord[];
  followUpAppointments: db.FollowUpAppointment[];
  patientHealthTasks: db.PatientHealthTask[];
  loading: boolean;
  addPatient: (patient: Omit<db.Patient, '院友id'>) => Promise<void>;
  updatePatient: (patient: db.Patient) => Promise<void>;
  deletePatient: (id: number) => Promise<void>;
  addSchedule: (schedule: Omit<db.Schedule, '排程id'>) => Promise<void>;
  updateSchedule: (schedule: ScheduleWithDetails) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;
  addPatientToSchedule: (scheduleId: number, patientId: number, symptoms: string, notes: string, reasons: string[]) => Promise<void>;
  updateScheduleDetail: (detail: any) => Promise<void>;
  deleteScheduleDetail: (detailId: number) => Promise<void>;
  addPrescription: (prescription: Omit<db.Prescription, '處方id'>) => Promise<void>;
  updatePrescription: (prescription: db.Prescription) => Promise<void>;
  deletePrescription: (id: number) => Promise<void>;
  addHealthRecord: (record: Omit<db.HealthRecord, '記錄id'>) => Promise<void>;
  updateHealthRecord: (record: db.HealthRecord) => Promise<void>;
  deleteHealthRecord: (id: number) => Promise<void>;
  addFollowUpAppointment: (appointment: Omit<db.FollowUpAppointment, '覆診id' | '創建時間' | '更新時間'>) => Promise<void>;
  updateFollowUpAppointment: (appointment: db.FollowUpAppointment) => Promise<void>;
  deleteFollowUpAppointment: (id: string) => Promise<void>;
  addPatientHealthTask: (task: Omit<db.PatientHealthTask, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePatientHealthTask: (task: db.PatientHealthTask) => Promise<void>;
  deletePatientHealthTask: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

interface PatientProviderProps {
  children: ReactNode;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<PatientProviderProps> = ({ children }) => {
  const { user, authReady } = useAuth();
  const [patients, setPatients] = useState<db.Patient[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [prescriptions, setPrescriptions] = useState<db.Prescription[]>([]);
  const [serviceReasons, setServiceReasons] = useState<db.ServiceReason[]>([]);
  const [healthRecords, setHealthRecords] = useState<db.HealthRecord[]>([]);
  const [followUpAppointments, setFollowUpAppointments] = useState<db.FollowUpAppointment[]>([]);
  const [patientHealthTasks, setPatientHealthTasks] = useState<db.PatientHealthTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!authReady) {
      console.log('Auth not ready yet, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user, clearing data...');
      setPatients([]);
      setSchedules([]);
      setPrescriptions([]);
      setServiceReasons([]);
      setHealthRecords([]);
      setFollowUpAppointments([]);
      setPatientHealthTasks([]);
      setLoading(false);
      setDataLoaded(false);
      return;
    }
    
    if (dataLoaded) {
      console.log('Data already loaded, skipping...');
      return;
    }
    
    console.log('Auth ready and user exists, loading data...');
    const loadData = async () => {
      try {
        await initializeAndLoadData();
      } catch (error) {
        console.error('資料載入失敗:', error);
      }
    };
    loadData();
  }, [authReady, user, dataLoaded]);

  const initializeAndLoadData = async () => {
    try {
      console.log('Starting data initialization...');
      setLoading(true);
      await db.initializeDatabase();
      await refreshData();
      setDataLoaded(true);
      console.log('Data initialization completed successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
      try {
        console.log('Attempting to refresh data despite initialization error...');
        await refreshData();
        setDataLoaded(true);
      } catch (refreshError) {
        console.error('Refresh data also failed:', refreshError);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      console.log('Refreshing all data...');
      const [patientsData, schedulesData, prescriptionsData, serviceReasonsData, healthRecordsData, followUpAppointmentsData, patientHealthTasksData] = await Promise.all([
        db.getPatients(),
        db.getSchedules(),
        db.getPrescriptions(),
        db.getServiceReasons(),
        db.getHealthRecords(),
        db.getFollowUpAppointments(),
        db.getPatientHealthTasks()
      ]);

      console.log('Data loaded:', {
        patients: patientsData.length,
        schedules: schedulesData.length,
        prescriptions: prescriptionsData.length,
        serviceReasons: serviceReasonsData.length,
        healthRecords: healthRecordsData.length,
        followUpAppointments: followUpAppointmentsData.length,
        patientHealthTasks: patientHealthTasksData.length
      });
      setPatients(patientsData);
      setPrescriptions(prescriptionsData);
      setServiceReasons(serviceReasonsData);
      setHealthRecords(healthRecordsData);
      setFollowUpAppointments(followUpAppointmentsData);
      setPatientHealthTasks(patientHealthTasksData);

      const schedulesWithDetails: ScheduleWithDetails[] = await Promise.all(
        schedulesData.map(async (schedule) => {
          const details = await db.getScheduleDetails(schedule.排程id);
          return {
            ...schedule,
            院友列表: details
          };
        })
      );

      setSchedules(schedulesWithDetails);
      console.log('All data refresh completed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  };

  const addPatient = async (patient: Omit<db.Patient, '院友id'>) => {
    try {
      const newPatient = await db.createPatient(patient);
      if (newPatient) {
        try {
          const defaultTasks = createDefaultTasks(newPatient.院友id);
          for (const task of defaultTasks) {
            await db.createPatientHealthTask(task);
          }
          console.log(`已為院友 ${newPatient.中文姓名} 建立預設健康任務`);
        } catch (error) {
          console.error('建立預設任務失敗:', error);
        }
      }
      await refreshData();
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  };

  const updatePatient = async (patient: db.Patient) => {
    try {
      await db.updatePatient(patient);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  };

  const deletePatient = async (id: number) => {
    try {
      await db.deletePatient(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  };

  const addSchedule = async (schedule: Omit<db.Schedule, '排程id'>) => {
    try {
      await db.createSchedule(schedule);
      await refreshData();
    } catch (error) {
      console.error('Error adding schedule:', error);
      throw error;
    }
  };

  const updateSchedule = async (schedule: ScheduleWithDetails) => {
    try {
      await db.updateSchedule(schedule);
      await refreshData();
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      await db.deleteSchedule(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  };

  const addPatientToSchedule = async (scheduleId: number, patientId: number, symptoms: string, notes: string, reasons: string[]) => {
    try {
      await db.addPatientToSchedule(scheduleId, patientId, symptoms, notes, reasons);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient to schedule:', error);
      throw error;
    }
  };

  const updateScheduleDetail = async (detail: any) => {
    try {
      await db.updateScheduleDetail(detail);
      await refreshData();
    } catch (error) {
      console.error('Error updating schedule detail:', error);
      throw error;
    }
  };

  const deleteScheduleDetail = async (detailId: number) => {
    try {
      await db.deleteScheduleDetail(detailId);
      await refreshData();
    } catch (error) {
      console.error('Error deleting schedule detail:', error);
      throw error;
    }
  };

  const addPrescription = async (prescription: Omit<db.Prescription, '處方id'>) => {
    try {
      console.log('Adding prescription:', prescription);
      await db.createPrescription(prescription);
      console.log('Prescription added successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error adding prescription:', error);
      throw error;
    }
  };

  const updatePrescription = async (prescription: db.Prescription) => {
    try {
      console.log('Updating prescription:', prescription);
      await db.updatePrescription(prescription);
      console.log('Prescription updated successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error updating prescription:', error);
      throw error;
    }
  };

  const deletePrescription = async (id: number) => {
    try {
      console.log('Deleting prescription:', id);
      await db.deletePrescription(id);
      console.log('Prescription deleted successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      throw error;
    }
  };

  const addHealthRecord = async (record: Omit<db.HealthRecord, '記錄id'>) => {
    try {
      console.log('Adding health record:', record);
      await db.createHealthRecord(record);
      console.log('Health record added successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error adding health record:', error);
      throw error;
    }
  };

  const updateHealthRecord = async (record: db.HealthRecord) => {
    try {
      console.log('Updating health record:', record);
      if (!record.記錄id || isNaN(record.記錄id)) {
        throw new Error('無效的記錄ID');
      }
      await db.updateHealthRecord(record);
      console.log('Health record updated successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error updating health record:', error);
      throw error;
    }
  };

  const deleteHealthRecord = async (id: number) => {
    try {
      console.log('Deleting health record:', id);
      if (isNaN(id)) {
        throw new Error('無效的記錄ID');
      }
      await db.deleteHealthRecord(id);
      console.log('Health record deleted successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error deleting health record:', error);
      throw error;
    }
  };

  const addFollowUpAppointment = async (appointment: Omit<db.FollowUpAppointment, '覆診id' | '創建時間' | '更新時間'>) => {
    try {
      console.log('Adding follow-up appointment:', appointment);
      await db.createFollowUpAppointment(appointment);
      console.log('Follow-up appointment added successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error adding follow-up appointment:', error);
      throw error;
    }
  };

  const updateFollowUpAppointment = async (appointment: db.FollowUpAppointment) => {
    try {
      console.log('Updating follow-up appointment:', appointment);
      await db.updateFollowUpAppointment(appointment);
      console.log('Follow-up appointment updated successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error updating follow-up appointment:', error);
      throw error;
    }
  };

  const deleteFollowUpAppointment = async (id: string) => {
    try {
      console.log('Deleting follow-up appointment:', id);
      await db.deleteFollowUpAppointment(id);
      console.log('Follow-up appointment deleted successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error deleting follow-up appointment:', error);
      throw error;
    }
  };

  const addPatientHealthTask = async (task: Omit<db.PatientHealthTask, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding patient health task:', task);
      await db.createPatientHealthTask(task);
      console.log('Patient health task added successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error adding patient health task:', error);
      throw error;
    }
  };

  const updatePatientHealthTask = async (task: db.PatientHealthTask) => {
    try {
      console.log('Updating patient health task:', task);
      await db.updatePatientHealthTask(task);
      console.log('Patient health task updated successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error updating patient health task:', error);
      throw error;
    }
  };

  const deletePatientHealthTask = async (id: string) => {
    try {
      console.log('Deleting patient health task:', id);
      await db.deletePatientHealthTask(id);
      console.log('Patient health task deleted successfully, refreshing data...');
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient health task:', error);
      throw error;
    }
  };

  return (
    <PatientContext.Provider value={{
      patients,
      schedules,
      serviceReasons,
      prescriptions,
      healthRecords,
      followUpAppointments,
      patientHealthTasks,
      loading,
      addPatient,
      updatePatient,
      deletePatient,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      addPatientToSchedule,
      updateScheduleDetail,
      deleteScheduleDetail,
      addPrescription,
      updatePrescription,
      deletePrescription,
      addHealthRecord,
      updateHealthRecord,
      deleteHealthRecord,
      addFollowUpAppointment,
      updateFollowUpAppointment,
      deleteFollowUpAppointment,
      addPatientHealthTask,
      updatePatientHealthTask,
      deletePatientHealthTask,
      refreshData
    }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};
```

---

### 修正內容

1. **HealthRecordModal.tsx**：
   - 在 `handleSubmit` 中，創建新記錄時明確不包含 `記錄id`，讓資料庫自動生成。
   - 更新記錄時，添加對 `record.記錄id` 的驗證，確保其為有效整數。
   - 改進錯誤處理，提供更具體的錯誤訊息給用戶。

2. **PatientProvider.tsx**：
   - 在 `updateHealthRecord` 中，添加對 `記錄id` 的驗證，確保其為有效整數。
   - 在 `deleteHealthRecord` 中，添加對 `id` 的驗證。
   - 保持 `addHealthRecord` 不變，因為它已經正確處理了 `Omit<db.HealthRecord, '記錄id'>`。
   - 改進錯誤處理，確保所有操作都拋出錯誤以便 UI 層捕獲。

3. **資料庫建議**（未提供 `lib/database.ts`）：
   - 確保 `健康記錄主表` 的 `記錄id` 欄位設置為 `SERIAL` 或 `GENERATED ALWAYS AS IDENTITY`。
   - 在 `db.createHealthRecord` 中，確保插入時不傳送 `記錄id`。
   - 在 `db.updateHealthRecord` 中，確保使用 `記錄id` 進行 WHERE 條件查詢。

---

### 附加建議

1. **檢查資料庫結構**：
   - 在 Supabase 控制台中，檢查 `健康記錄主表` 的結構，確保 `記錄id` 是自增主鍵。例如：
     ```sql
     CREATE TABLE 健康記錄主表 (
       記錄id SERIAL PRIMARY KEY,
       院友id INTEGER NOT NULL,
       記錄日期 DATE NOT NULL,
       記錄時間 TIME NOT NULL,
       記錄類型 TEXT NOT NULL,
       血壓收縮壓 INTEGER,
       血壓舒張壓 INTEGER,
       脈搏 INTEGER,
       體溫 REAL,
       血含氧量 INTEGER,
       呼吸頻率 INTEGER,
       血糖值 REAL,
       體重 REAL,
       備註 TEXT,
       記錄人員 TEXT
     );
     ```

2. **檢查 `lib/database.ts`**：
   - 確保 `createHealthRecord` 函數不包含 `記錄id` 欄位：
     ```typescript
     export async function createHealthRecord(record: Omit<HealthRecord, '記錄id'>) {
       const { data, error } = await supabase
         .from('健康記錄主表')
         .insert([record])
         .select()
         .single();
       if (error) throw error;
       return data;
     }
     ```
   - 確保 `updateHealthRecord` 函數使用有效的 `記錄id`：
     ```typescript
     export async function updateHealthRecord(record: HealthRecord) {
       if (!record.記錄id) throw new Error('缺少記錄ID');
       const { data, error } = await supabase
         .from('健康記錄主表')
         .update(record)
         .eq('記錄id', record.記錄id)
         .select()
         .single();
       if (error) throw error;
       return data;
     }
     ```

3. **父組件檢查**：
   - 確保傳遞到 `HealthRecordModal` 的 `record` 物件包含有效的 `記錄id`（如果是用於編輯）。
   - 例如，在父組件中：
     ```typescript
     <HealthRecordModal
       record={selectedRecord ? { ...selectedRecord, 記錄id: selectedRecord.記錄id } : undefined}
       onClose={() => setShowModal(false)}
       onTaskCompleted={refreshData}
     />
     ```

4. **改進性能**：
   - `PatientProvider` 的 `refreshData` 函數在每次操作後重新載入所有數據，可能導致性能問題。考慮使用增量更新，例如僅更新受影響的數據：
     ```typescript
     const addHealthRecord = async (record: Omit<db.HealthRecord, '記錄id'>) => {
       try {
         const newRecord = await db.createHealthRecord(record);
         setHealthRecords(prev => [...prev, newRecord]);
       } catch (error) {
         console.error('Error adding health record:', error);
         throw error;
       }
     };
     ```

---

### 結論

修正後的代碼通過在 `HealthRecordModal` 和 `PatientProvider` 中添加嚴格的 `記錄id` 驗證，解決了創建和更新健康記錄時的錯誤。同時，建議檢查資料庫結構和 `lib/database.ts` 的實現，確保與前端代碼一致。此外，改進錯誤處理和性能優化可以進一步提升應用程式的穩定性和用戶體驗。