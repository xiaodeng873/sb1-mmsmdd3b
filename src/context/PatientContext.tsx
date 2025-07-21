import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReactNode } from 'react';
import * as db from '../lib/database';
import { useAuth } from './AuthContext';

// Re-export types from database module
export type { Patient, Schedule, ScheduleDetail, ServiceReason, Prescription, HealthRecord, PatientHealthTask, HealthTaskType, FrequencyUnit, FollowUpAppointment } from '../lib/database';

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
  refreshData: () => Promise<void>;
}

interface PatientProviderProps {
  children: ReactNode;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  // 只有在認證準備好且有用戶時才載入資料
  useEffect(() => {
    if (!authReady) {
      console.log('Auth not ready yet, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user, clearing data...');
      // 清空資料當沒有用戶時
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
      // 即使初始化失敗，也嘗試載入資料
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

      // Load schedule details for each schedule
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
      throw error; // 重新拋出錯誤以便上層處理
    }
  };

  const addPatient = async (patient: Omit<db.Patient, '院友id'>) => {
    try {
      const newPatient = await db.createPatient(patient);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const updatePatient = async (patient: db.Patient) => {
    try {
      await db.updatePatient(patient);
      await refreshData();
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const deletePatient = async (id: number) => {
    try {
      await db.deletePatient(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const addSchedule = async (schedule: Omit<db.Schedule, '排程id'>) => {
    try {
      await db.createSchedule(schedule);
      await refreshData();
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  const updateSchedule = async (schedule: ScheduleWithDetails) => {
    try {
      // Update basic schedule info if needed
      await db.updateSchedule(schedule);
      await refreshData();
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const addPatientToScheduleHandler = async (scheduleId: number, patientId: number, symptoms: string, notes: string, reasons: string[]) => {
    try {
      await db.addPatientToSchedule(scheduleId, patientId, symptoms, notes, reasons);
      await refreshData();
    } catch (error) {
      console.error('Error adding patient to schedule:', error);
    }
  };

  const updateScheduleDetailHandler = async (detail: any) => {
    try {
      await db.updateScheduleDetail(detail);
      await refreshData();
    } catch (error) {
      console.error('Error updating schedule detail:', error);
    }
  };

  const deleteScheduleDetailHandler = async (detailId: number) => {
    try {
      await db.deleteScheduleDetail(detailId);
      await refreshData();
    } catch (error) {
      console.error('Error deleting schedule detail:', error);
    }
  };
  const deleteSchedule = async (id: number) => {
    try {
      await db.deleteSchedule(id);
      await refreshData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const addPrescription = async (prescription: Omit<db.Prescription, '處方id'>) => {
    try {
      console.log('Adding prescription:', prescription);
      await db.createPrescription(prescription);
      console.log('Prescription added successfully, refreshing data...');
      await refreshData();
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error adding prescription:', error);
      // 重新拋出錯誤以便 UI 層處理
      throw error;
    }
  };

  const updatePrescription = async (prescription: db.Prescription) => {
    try {
      console.log('Updating prescription:', prescription);
      await db.updatePrescription(prescription);
      console.log('Prescription updated successfully, refreshing data...');
      await refreshData();
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error adding health record:', error);
      throw error;
    }
  };

  const updateHealthRecord = async (record: db.HealthRecord) => {
    try {
      console.log('Updating health record:', record);
      await db.updateHealthRecord(record);
      console.log('Health record updated successfully, refreshing data...');
      await refreshData();
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error updating health record:', error);
      throw error;
    }
  };

  const deleteHealthRecord = async (id: number) => {
    try {
      console.log('Deleting health record:', id);
      await db.deleteHealthRecord(id);
      console.log('Health record deleted successfully, refreshing data...');
      await refreshData();
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
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
      console.log('Data refreshed successfully');
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
      addPatientToSchedule: addPatientToScheduleHandler,
      updateScheduleDetail: updateScheduleDetailHandler,
      deleteScheduleDetail: deleteScheduleDetailHandler,
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