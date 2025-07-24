import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/database';

export interface Patient {
  院友id: number;
  床號: string;
  中文姓名: string;
  英文姓名?: string;
  性別: '男' | '女';
  身份證號碼?: string;
  出生日期?: string;
  院友相片?: string;
  藥物敏感?: string[];
  不良藥物反應?: string[];
  感染控制?: any;
  入住日期?: string;
  退住日期?: string;
  護理等級?: '全護理' | '半護理' | '自理';
  入住類型?: '私位' | '買位' | '院舍卷' | '暫住';
  社會福利?: {
    主要類型?: '綜合社會保障援助' | '公共福利金計劃';
    子類型?: '長者生活津貼' | '普通傷殘津貼' | '高額傷殘津貼';
  };
  在住狀態?: '在住' | '已退住';
}

export interface HealthRecord {
  記錄id?: number;
  院友id: number;
  記錄日期: string;
  記錄時間: string;
  記錄類型: '生命表徵' | '血糖控制' | '體重控制';
  血壓收縮壓?: number;
  血壓舒張壓?: number;
  脈搏?: number;
  體溫?: number;
  血含氧量?: number;
  呼吸頻率?: number;
  血糖值?: number;
  體重?: number;
  備註?: string;
  記錄人員?: string;
}

export interface Prescription {
  處方id?: number;
  院友id: number;
  藥物來源: string;
  處方日期: string;
  藥物名稱: string;
  劑型?: string;
  服用途徑?: string;
  服用份量?: string;
  服用次數?: string;
  服用日數?: string;
  需要時?: boolean;
  服用時間?: string[];
}

export interface FollowUpAppointment {
  覆診id?: string;
  院友id: number;
  覆診日期: string;
  出發時間?: string;
  覆診時間?: string;
  覆診地點?: string;
  覆診專科?: string;
  交通安排?: string;
  陪診人員?: string;
  備註?: string;
  狀態?: '尚未安排' | '已安排' | '已完成' | '改期' | '取消';
  創建時間?: string;
  更新時間?: string;
}

export interface PatientHealthTask {
  id?: string;
  patient_id: number;
  health_record_type: '生命表徵' | '血糖控制' | '體重控制' | '約束物品同意書' | '年度體檢';
  frequency_unit: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  frequency_value: number;
  specific_times?: string[];
  specific_days_of_week?: number[];
  specific_days_of_month?: number[];
  last_completed_at?: string;
  next_due_at: string;
  created_at?: string;
  updated_at?: string;
  notes?: '注射前' | '服藥前' | '定期' | '特別關顧' | '社康';
}

interface PatientContextType {
  patients: Patient[];
  healthRecords: HealthRecord[];
  prescriptions: Prescription[];
  followUpAppointments: FollowUpAppointment[];
  patientHealthTasks: PatientHealthTask[];
  loading: boolean;
  addPatient: (patient: Omit<Patient, '院友id'>) => Promise<void>;
  updatePatient: (patient: Patient) => Promise<void>;
  deletePatient: (id: number) => Promise<void>;
  addHealthRecord: (record: Omit<HealthRecord, '記錄id'>) => Promise<void>;
  updateHealthRecord: (record: HealthRecord) => Promise<void>;
  deleteHealthRecord: (id: number) => Promise<void>;
  addPrescription: (prescription: Omit<Prescription, '處方id'>) => Promise<void>;
  updatePrescription: (prescription: Prescription) => Promise<void>;
  deletePrescription: (id: number) => Promise<void>;
  addFollowUpAppointment: (appointment: Omit<FollowUpAppointment, '覆診id'>) => Promise<void>;
  updateFollowUpAppointment: (appointment: FollowUpAppointment) => Promise<void>;
  deleteFollowUpAppointment: (id: string) => Promise<void>;
  addPatientHealthTask: (task: Omit<PatientHealthTask, 'id'>) => Promise<void>;
  updatePatientHealthTask: (task: PatientHealthTask) => Promise<void>;
  deletePatientHealthTask: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  dischargePatient: (patientId: number, dischargeDate: string) => Promise<void>;
  cancelDischarge: (patientId: number) => Promise<void>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [followUpAppointments, setFollowUpAppointments] = useState<FollowUpAppointment[]>([]);
  const [patientHealthTasks, setPatientHealthTasks] = useState<PatientHealthTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('院友主表')
        .select('*')
        .order('院友id', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchHealthRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('健康記錄主表')
        .select('*')
        .order('記錄日期', { ascending: false });

      if (error) throw error;
      setHealthRecords(data || []);
    } catch (error) {
      console.error('Error fetching health records:', error);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('處方主表')
        .select('*')
        .order('處方日期', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const fetchFollowUpAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('覆診安排主表')
        .select('*')
        .order('覆診日期', { ascending: false });

      if (error) throw error;
      setFollowUpAppointments(data || []);
    } catch (error) {
      console.error('Error fetching follow-up appointments:', error);
    }
  };

  const fetchPatientHealthTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_health_tasks')
        .select('*')
        .order('next_due_at', { ascending: true });

      if (error) throw error;
      setPatientHealthTasks(data || []);
    } catch (error) {
      console.error('Error fetching patient health tasks:', error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPatients(),
      fetchHealthRecords(),
      fetchPrescriptions(),
      fetchFollowUpAppointments(),
      fetchPatientHealthTasks()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addPatient = async (patient: Omit<Patient, '院友id'>) => {
    try {
      const { data, error } = await supabase
        .from('院友主表')
        .insert([patient])
        .select();

      if (error) throw error;
      if (data) {
        setPatients(prev => [...prev, ...data]);
      }
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  };

  const updatePatient = async (patient: Patient) => {
    try {
      const { data, error } = await supabase
        .from('院友主表')
        .update(patient)
        .eq('院友id', patient.院友id)
        .select();

      if (error) throw error;
      if (data) {
        setPatients(prev => prev.map(p => p.院友id === patient.院友id ? data[0] : p));
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  };

  const deletePatient = async (id: number) => {
    try {
      const { error } = await supabase
        .from('院友主表')
        .delete()
        .eq('院友id', id);

      if (error) throw error;
      setPatients(prev => prev.filter(p => p.院友id !== id));
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  };

  const addHealthRecord = async (record: Omit<HealthRecord, '記錄id'>) => {
    try {
      const { data, error } = await supabase
        .from('健康記錄主表')
        .insert([record])
        .select();

      if (error) throw error;
      if (data) {
        setHealthRecords(prev => [data[0], ...prev]);
      }
    } catch (error) {
      console.error('Error adding health record:', error);
      throw error;
    }
  };

  const updateHealthRecord = async (record: HealthRecord) => {
    try {
      const { data, error } = await supabase
        .from('健康記錄主表')
        .update(record)
        .eq('記錄id', record.記錄id)
        .select();

      if (error) throw error;
      if (data) {
        setHealthRecords(prev => prev.map(r => r.記錄id === record.記錄id ? data[0] : r));
      }
    } catch (error) {
      console.error('Error updating health record:', error);
      throw error;
    }
  };

  const deleteHealthRecord = async (id: number) => {
    try {
      const { error } = await supabase
        .from('健康記錄主表')
        .delete()
        .eq('記錄id', id);

      if (error) throw error;
      setHealthRecords(prev => prev.filter(r => r.記錄id !== id));
    } catch (error) {
      console.error('Error deleting health record:', error);
      throw error;
    }
  };

  const addPrescription = async (prescription: Omit<Prescription, '處方id'>) => {
    try {
      const { data, error } = await supabase
        .from('處方主表')
        .insert([prescription])
        .select();

      if (error) throw error;
      if (data) {
        setPrescriptions(prev => [data[0], ...prev]);
      }
    } catch (error) {
      console.error('Error adding prescription:', error);
      throw error;
    }
  };

  const updatePrescription = async (prescription: Prescription) => {
    try {
      const { data, error } = await supabase
        .from('處方主表')
        .update(prescription)
        .eq('處方id', prescription.處方id)
        .select();

      if (error) throw error;
      if (data) {
        setPrescriptions(prev => prev.map(p => p.處方id === prescription.處方id ? data[0] : p));
      }
    } catch (error) {
      console.error('Error updating prescription:', error);
      throw error;
    }
  };

  const deletePrescription = async (id: number) => {
    try {
      const { error } = await supabase
        .from('處方主表')
        .delete()
        .eq('處方id', id);

      if (error) throw error;
      setPrescriptions(prev => prev.filter(p => p.處方id !== id));
    } catch (error) {
      console.error('Error deleting prescription:', error);
      throw error;
    }
  };

  const addFollowUpAppointment = async (appointment: Omit<FollowUpAppointment, '覆診id'>) => {
    try {
      const { data, error } = await supabase
        .from('覆診安排主表')
        .insert([appointment])
        .select();

      if (error) throw error;
      if (data) {
        setFollowUpAppointments(prev => [data[0], ...prev]);
      }
    } catch (error) {
      console.error('Error adding follow-up appointment:', error);
      throw error;
    }
  };

  const updateFollowUpAppointment = async (appointment: FollowUpAppointment) => {
    try {
      const { data, error } = await supabase
        .from('覆診安排主表')
        .update(appointment)
        .eq('覆診id', appointment.覆診id)
        .select();

      if (error) throw error;
      if (data) {
        setFollowUpAppointments(prev => prev.map(a => a.覆診id === appointment.覆診id ? data[0] : a));
      }
    } catch (error) {
      console.error('Error updating follow-up appointment:', error);
      throw error;
    }
  };

  const deleteFollowUpAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('覆診安排主表')
        .delete()
        .eq('覆診id', id);

      if (error) throw error;
      setFollowUpAppointments(prev => prev.filter(a => a.覆診id !== id));
    } catch (error) {
      console.error('Error deleting follow-up appointment:', error);
      throw error;
    }
  };

  const addPatientHealthTask = async (task: Omit<PatientHealthTask, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('patient_health_tasks')
        .insert([task])
        .select();

      if (error) throw error;
      if (data) {
        setPatientHealthTasks(prev => [...prev, data[0]]);
      }
    } catch (error) {
      console.error('Error adding patient health task:', error);
      throw error;
    }
  };

  const updatePatientHealthTask = async (task: PatientHealthTask) => {
    try {
      const { data, error } = await supabase
        .from('patient_health_tasks')
        .update(task)
        .eq('id', task.id)
        .select();

      if (error) throw error;
      if (data) {
        setPatientHealthTasks(prev => prev.map(t => t.id === task.id ? data[0] : t));
      }
    } catch (error) {
      console.error('Error updating patient health task:', error);
      throw error;
    }
  };

  const deletePatientHealthTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patient_health_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPatientHealthTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting patient health task:', error);
      throw error;
    }
  };

  const dischargePatient = async (patientId: number, dischargeDate: string) => {
    try {
      const { data, error } = await supabase
        .from('院友主表')
        .update({ 
          退住日期: dischargeDate,
          在住狀態: '已退住'
        })
        .eq('院友id', patientId)
        .select();

      if (error) throw error;
      if (data) {
        setPatients(prev => prev.map(p => p.院友id === patientId ? data[0] : p));
      }
    } catch (error) {
      console.error('Error discharging patient:', error);
      throw error;
    }
  };

  const cancelDischarge = async (patientId: number) => {
    try {
      const { data, error } = await supabase
        .from('院友主表')
        .update({ 
          退住日期: null,
          在住狀態: '在住'
        })
        .eq('院友id', patientId)
        .select();

      if (error) throw error;
      if (data) {
        setPatients(prev => prev.map(p => p.院友id === patientId ? data[0] : p));
      }
    } catch (error) {
      console.error('Error canceling discharge:', error);
      throw error;
    }
  };

  const value: PatientContextType = {
    patients,
    healthRecords,
    prescriptions,
    followUpAppointments,
    patientHealthTasks,
    loading,
    addPatient,
    updatePatient,
    deletePatient,
    addHealthRecord,
    updateHealthRecord,
    deleteHealthRecord,
    addPrescription,
    updatePrescription,
    deletePrescription,
    addFollowUpAppointment,
    updateFollowUpAppointment,
    deleteFollowUpAppointment,
    addPatientHealthTask,
    updatePatientHealthTask,
    deletePatientHealthTask,
    refreshData,
    dischargePatient,
    cancelDischarge
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};