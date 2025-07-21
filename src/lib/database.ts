import { supabase } from '../context/AuthContext';

// Template metadata interface
export interface TemplateMetadata {
  id: number;
  name: string;
  type: 'waiting-list' | 'prescription' | 'medication-record' | 'consent-form';
  original_name: string;
  storage_path: string;
  upload_date: string;
  file_size: number;
  description: string;
  extracted_format: any;
}

const TEMPLATES_BUCKET = 'templates';

export interface Patient {
  院友id: number;
  床號: string;
  中文姓名: string;
  英文姓名?: string;
  性別: '男' | '女';
  身份證號碼: string;
  藥物敏感?: string[];
  不良藥物反應?: string[];
  感染控制?: string[];
  出生日期: string;
  院友相片?: string;
}

export interface Schedule {
  排程id: number;
  到診日期: string;
}

export interface ScheduleDetail {
  細項id: number;
  排程id: number;
  院友id: number;
  症狀說明?: string;
  備註?: string;
  院友: Patient;
  看診原因: string[];
}

export interface ServiceReason {
  原因id: number;
  原因名稱: string;
}

export interface Prescription {
  處方id: number;
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

export interface HealthRecord {
  記錄id: number;
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

export interface FollowUpAppointment {
  覆診id: string;
  院友id: number;
  覆診日期: string;
  出發時間?: string;
  覆診時間?: string;
  覆診地點?: string;
  覆診專科?: string;
  交通安排?: string;
  陪診人員?: string;
  備註?: string;
  狀態: '尚未安排' | '已安排' | '已完成' | '改期' | '取消';
  狀態: '尚未安排' | '已安排' | '已完成' | '改期' | '取消';
  創建時間: string;
  更新時間: string;
}

export type HealthTaskType = '生命表徵' | '血糖控制' | '體重控制';
export type FrequencyUnit = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface PatientHealthTask {
  id: string;
  patient_id: number;
  health_record_type: HealthTaskType;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  specific_times: string[];
  specific_days_of_week: number[];
  specific_days_of_month: number[];
  last_completed_at?: string;
  next_due_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Patient operations
export async function getPatients(): Promise<Patient[]> {
  try {
    console.log('Fetching patients from database...');
    const { data, error } = await supabase
      .from('院友主表')
      .select('*')
      .order('床號');
    
    if (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
    console.log(`Successfully fetched ${data?.length || 0} patients`);
    return data as Patient[];
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error; // 重新拋出錯誤而不是返回空陣列
  }
}

// Template storage operations
export async function uploadTemplateFile(file: File, path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error(`儲存桶 '${TEMPLATES_BUCKET}' 不存在。請先在 Supabase Dashboard 中建立此儲存桶。`);
      }
      throw error;
    }
    return data.path;
  } catch (error) {
    console.error('Error uploading template file:', error);
    throw error; // Re-throw to let the caller handle it
  }
}

export function getPublicTemplateUrl(path: string): string {
  const { data } = supabase.storage
    .from(TEMPLATES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteTemplateFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(TEMPLATES_BUCKET)
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting template file from storage:', error);
    return false;
  }
}

// Template metadata operations
export async function getTemplatesMetadata(): Promise<TemplateMetadata[]> {
  try {
    const { data, error } = await supabase
      .from('templates_metadata')
      .select('*')
      .order('upload_date', { ascending: false });

    if (error) throw error;
    return data as TemplateMetadata[];
  } catch (error) {
    console.error('Error fetching templates metadata:', error);
    return [];
  }
}

export async function createTemplateMetadata(metadata: Omit<TemplateMetadata, 'id' | 'upload_date'>): Promise<TemplateMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('templates_metadata')
      .insert(metadata)
      .select()
      .single();

    if (error) throw error;
    return data as TemplateMetadata;
  } catch (error) {
    console.error('Error creating template metadata:', error);
    return null;
  }
}

export async function deleteTemplateMetadata(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('templates_metadata')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting template metadata:', error);
    return false;
  }
}

export async function createPatient(patient: Omit<Patient, '院友id'>): Promise<Patient | null> {
  try {
    const { data, error } = await supabase
      .from('院友主表')
      .insert(patient)
      .select()
      .single();
    
    if (error) throw error;
    return data as Patient;
  } catch (error) {
    console.error('Error creating patient:', error);
    return null;
  }
}

export async function updatePatient(patient: Patient): Promise<Patient | null> {
  try {
    const { data, error } = await supabase
      .from('院友主表')
      .update({
        床號: patient.床號,
        中文姓名: patient.中文姓名,
        英文姓名: patient.英文姓名,
        性別: patient.性別,
        身份證號碼: patient.身份證號碼,
        藥物敏感: patient.藥物敏感,
        不良藥物反應: patient.不良藥物反應,
        感染控制: patient.感染控制,
        出生日期: patient.出生日期,
        院友相片: patient.院友相片
      })
      .eq('院友id', patient.院友id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Patient;
  } catch (error) {
    console.error('Error updating patient:', error);
    return null;
  }
}

export async function deletePatient(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('院友主表')
      .delete()
      .eq('院友id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting patient:', error);
    return false;
  }
}

// Schedule operations
export async function getSchedules(): Promise<Schedule[]> {
  try {
    console.log('Fetching schedules from database...');
    const { data, error } = await supabase
      .from('到診排程主表')
      .select('*')
      .order('到診日期', { ascending: false });
    
    if (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }
    console.log(`Successfully fetched ${data?.length || 0} schedules`);
    return data as Schedule[];
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error; // 重新拋出錯誤而不是返回空陣列
  }
}

export async function createSchedule(schedule: Omit<Schedule, '排程id'>): Promise<Schedule | null> {
  try {
    const { data, error } = await supabase
      .from('到診排程主表')
      .insert(schedule)
      .select()
      .single();
    
    if (error) throw error;
    return data as Schedule;
  } catch (error) {
    console.error('Error creating schedule:', error);
    return null;
  }
}

export async function updateSchedule(schedule: Schedule): Promise<Schedule | null> {
  try {
    const { data, error } = await supabase
      .from('到診排程主表')
      .update({
        到診日期: schedule.到診日期
      })
      .eq('排程id', schedule.排程id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Schedule;
  } catch (error) {
    console.error('Error updating schedule:', error);
    return null;
  }
}

export async function deleteSchedule(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('到診排程主表')
      .delete()
      .eq('排程id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return false;
  }
}

// Schedule details operations
export async function getScheduleDetails(scheduleId: number): Promise<ScheduleDetail[]> {
  try {
    // 首先獲取細項資料
    const { data: detailsData, error: detailsError } = await supabase
      .from('看診院友細項')
      .select(`
        細項id, 排程id, 院友id, 症狀說明, 備註,
        院友主表 (院友id, 床號, 中文姓名, 英文姓名, 性別, 身份證號碼, 藥物敏感, 不良藥物反應, 出生日期, 院友相片)
      `)
      .eq('排程id', scheduleId)
      .order('細項id');
    
    if (detailsError) throw detailsError;
    
    // 獲取所有細項的看診原因
    const detailIds = detailsData.map(detail => detail.細項id);
    
    const { data: reasonsData, error: reasonsError } = await supabase
      .from('到診院友_看診原因')
      .select(`
        細項id,
        看診原因選項 (原因名稱)
      `)
      .in('細項id', detailIds);
    
    if (reasonsError) throw reasonsError;
    
    // 組織看診原因資料
    const reasonsByDetailId: Record<number, string[]> = {};
    reasonsData.forEach(item => {
      if (!reasonsByDetailId[item.細項id]) {
        reasonsByDetailId[item.細項id] = [];
      }
      reasonsByDetailId[item.細項id].push(item.看診原因選項.原因名稱);
    });
    
    // 組合最終結果
    return detailsData.map(detail => ({
      細項id: detail.細項id,
      排程id: detail.排程id,
      院友id: detail.院友id,
      症狀說明: detail.症狀說明,
      備註: detail.備註,
      院友: detail.院友主表,
      看診原因: reasonsByDetailId[detail.細項id] || []
    }));
  } catch (error) {
    console.error('Error fetching schedule details:', error);
    return [];
  }
}

export async function addPatientToSchedule(
  scheduleId: number, 
  patientId: number, 
  symptoms: string, 
  notes: string, 
  reasons: string[]
): Promise<boolean> {
  try {
    // Insert schedule detail
    const { data: detailData, error: detailError } = await supabase
      .from('看診院友細項')
      .insert({
        排程id: scheduleId,
        院友id: patientId,
        症狀說明: symptoms,
        備註: notes
      })
      .select()
      .single();
    
    if (detailError) throw detailError;
    
    const detailId = detailData.細項id;
    
    // Insert service reasons
    for (const reason of reasons) {
      const { data: reasonData, error: reasonError } = await supabase
        .from('看診原因選項')
        .select('原因id')
        .eq('原因名稱', reason)
        .single();
      
      if (reasonError) continue;
      
      await supabase
        .from('到診院友_看診原因')
        .insert({
          細項id: detailId,
          原因id: reasonData.原因id
        });
    }
    
    return true;
  } catch (error) {
    console.error('Error adding patient to schedule:', error);
    return false;
  }
}

export async function updateScheduleDetail(detail: any): Promise<boolean> {
  try {
    // Update schedule detail
    const { error: detailError } = await supabase
      .from('看診院友細項')
      .update({
        症狀說明: detail.症狀說明,
        備註: detail.備註
      })
      .eq('細項id', detail.細項id);
    
    if (detailError) throw detailError;
    
    // Delete existing reasons
    await supabase
      .from('到診院友_看診原因')
      .delete()
      .eq('細項id', detail.細項id);
    
    // Insert new reasons
    for (const reason of detail.看診原因) {
      const { data: reasonData, error: reasonError } = await supabase
        .from('看診原因選項')
        .select('原因id')
        .eq('原因名稱', reason)
        .single();
      
      if (reasonError) continue;
      
      await supabase
        .from('到診院友_看診原因')
        .insert({
          細項id: detail.細項id,
          原因id: reasonData.原因id
        });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating schedule detail:', error);
    return false;
  }
}

export async function deleteScheduleDetail(detailId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('看診院友細項')
      .delete()
      .eq('細項id', detailId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting schedule detail:', error);
    return false;
  }
}
// Service reasons
export async function getServiceReasons(): Promise<ServiceReason[]> {
  try {
    console.log('Fetching service reasons from database...');
    const { data, error } = await supabase
      .from('看診原因選項')
      .select('*')
      .order('原因id');
    
    if (error) {
      console.error('Error fetching service reasons:', error);
      throw error;
    }
    console.log(`Successfully fetched ${data?.length || 0} service reasons`);
    return data as ServiceReason[];
  } catch (error) {
    console.error('Error fetching service reasons:', error);
    throw error; // 重新拋出錯誤而不是返回空陣列
  }
}

// Prescription operations
export async function getPrescriptions(): Promise<Prescription[]> {
  try {
    console.log('Fetching prescriptions...');
    const { data, error } = await supabase
      .from('處方主表')
      .select('*')
      .order('處方日期', { ascending: false });
    
    if (error) throw error;
    console.log('Prescriptions fetched:', data.length, 'records');
    return data as Prescription[];
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return [];
  }
}

export async function createPrescription(prescription: Omit<Prescription, '處方id'>): Promise<Prescription | null> {
  try {
    console.log('Creating prescription with data:', prescription);
    
    // 檢查院友是否存在
    const { data: patientData, error: patientError } = await supabase
      .from('院友主表')
      .select('院友id, 中文姓名, 床號')
      .eq('院友id', prescription.院友id)
      .single();
    
    if (patientError || !patientData) {
      throw new Error(`院友ID ${prescription.院友id} 不存在`);
    }
    
    console.log('Patient found:', patientData);
    
    const { data, error } = await supabase
      .from('處方主表')
      .insert(prescription)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('Prescription created successfully:', data);
    return data as Prescription;
  } catch (error) {
    console.error('Error creating prescription:', error);
    throw error; // 重新拋出錯誤以便上層處理
  }
}

export async function updatePrescription(prescription: Prescription): Promise<Prescription | null> {
  try {
    console.log('Updating prescription in database:', prescription);
    
    const { data, error } = await supabase
      .from('處方主表')
      .update({
        院友id: prescription.院友id,
        藥物來源: prescription.藥物來源,
        處方日期: prescription.處方日期,
        藥物名稱: prescription.藥物名稱,
        劑型: prescription.劑型,
        服用途徑: prescription.服用途徑,
        服用份量: prescription.服用份量,
        服用次數: prescription.服用次數,
        服用日數: prescription.服用日數,
        需要時: prescription.需要時,
        服用時間: prescription.服用時間
      })
      .eq('處方id', prescription.處方id)
      .select()
      .single();
    
    if (error) throw error;
    console.log('Prescription updated successfully:', data);
    return data as Prescription;
  } catch (error) {
    console.error('Error updating prescription:', error);
    throw error;
  }
}

export async function deletePrescription(id: number): Promise<boolean> {
  try {
    console.log('Deleting prescription with ID:', id);
    
    const { error } = await supabase
      .from('處方主表')
      .delete()
      .eq('處方id', id);
    
    if (error) throw error;
    
    console.log('Prescription deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting prescription:', error);
    throw error;
  }
}

// Initialize database tables if they don't exist
export async function initializeDatabase(): Promise<void> {
  console.log('使用 Supabase 不需要手動初始化資料庫，已通過遷移檔案設定');
  return;
}

// Health record operations
export async function getHealthRecords(): Promise<HealthRecord[]> {
  try {
    const { data, error } = await supabase
      .from('健康記錄主表')
      .select('*')
      .order('記錄日期', { ascending: false })
      .order('記錄時間', { ascending: false });
    
    if (error) throw error;
    return data as HealthRecord[];
  } catch (error) {
    console.error('Error fetching health records:', error);
    return [];
  }
}

export async function createHealthRecord(record: Omit<HealthRecord, '記錄id'>): Promise<HealthRecord | null> {
  try {
    const { data, error } = await supabase
      .from('健康記錄主表')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    return data as HealthRecord;
  } catch (error) {
    console.error('Error creating health record:', error);
    return null;
  }
}

export async function updateHealthRecord(record: HealthRecord): Promise<HealthRecord | null> {
  try {
    const { data, error } = await supabase
      .from('健康記錄主表')
      .update({
        院友id: record.院友id,
        記錄日期: record.記錄日期,
        記錄時間: record.記錄時間,
        記錄類型: record.記錄類型,
        血壓收縮壓: record.血壓收縮壓,
        血壓舒張壓: record.血壓舒張壓,
        脈搏: record.脈搏,
        體溫: record.體溫,
        血含氧量: record.血含氧量,
        呼吸頻率: record.呼吸頻率,
        血糖值: record.血糖值,
        體重: record.體重,
        備註: record.備註,
        記錄人員: record.記錄人員
      })
      .eq('記錄id', record.記錄id)
      .select()
      .single();
    
    if (error) throw error;
    return data as HealthRecord;
  } catch (error) {
    console.error('Error updating health record:', error);
    return null;
  }
}

export async function deleteHealthRecord(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('健康記錄主表')
      .delete()
      .eq('記錄id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting health record:', error);
    return false;
  }
}

// Follow-up appointment operations
export async function getFollowUpAppointments(): Promise<FollowUpAppointment[]> {
  try {
    const { data, error } = await supabase
      .from('覆診安排主表')
      .select('*')
      .order('覆診日期', { ascending: true })
      .order('覆診時間', { ascending: true });
    
    if (error) throw error;
    return data as FollowUpAppointment[];
  } catch (error) {
    console.error('Error fetching follow-up appointments:', error);
    return [];
  }
}

export async function createFollowUpAppointment(appointment: Omit<FollowUpAppointment, '覆診id' | '創建時間' | '更新時間'>): Promise<FollowUpAppointment | null> {
  try {
    const { data, error } = await supabase
      .from('覆診安排主表')
      .insert(appointment)
      .select()
      .single();
    
    if (error) throw error;
    return data as FollowUpAppointment;
  } catch (error) {
    console.error('Error creating follow-up appointment:', error);
    return null;
  }
}

export async function updateFollowUpAppointment(appointment: FollowUpAppointment): Promise<FollowUpAppointment | null> {
  try {
    const { data, error } = await supabase
      .from('覆診安排主表')
      .update({
        院友id: appointment.院友id,
        覆診日期: appointment.覆診日期,
        出發時間: appointment.出發時間,
        覆診時間: appointment.覆診時間,
        覆診地點: appointment.覆診地點,
        覆診專科: appointment.覆診專科,
        交通安排: appointment.交通安排,
        陪診人員: appointment.陪診人員,
        備註: appointment.備註,
        狀態: appointment.狀態
      })
      .eq('覆診id', appointment.覆診id)
      .select()
      .single();
    
    if (error) throw error;
    return data as FollowUpAppointment;
  } catch (error) {
    console.error('Error updating follow-up appointment:', error);
    return null;
  }
}

export async function deleteFollowUpAppointment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('覆診安排主表')
      .delete()
      .eq('覆診id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting follow-up appointment:', error);
    return false;
  }
}

// Patient Health Tasks operations
export async function getPatientHealthTasks(): Promise<PatientHealthTask[]> {
  try {
    console.log('Fetching patient health tasks...');
    const { data, error } = await supabase
      .from('patient_health_tasks')
      .select('*')
      .order('next_due_at', { ascending: true });
    
    if (error) throw error;
    console.log('Patient health tasks fetched:', data.length, 'records');
    return data as PatientHealthTask[];
  } catch (error) {
    console.error('Error fetching patient health tasks:', error);
    return [];
  }
}

export async function createPatientHealthTask(task: Omit<PatientHealthTask, 'id' | 'created_at' | 'updated_at'>): Promise<PatientHealthTask | null> {
  try {
    console.log('Creating patient health task:', task);
    
    const { data, error } = await supabase
      .from('patient_health_tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) throw error;
    console.log('Patient health task created successfully:', data);
    return data as PatientHealthTask;
  } catch (error) {
    console.error('Error creating patient health task:', error);
    return null;
  }
}

export async function updatePatientHealthTask(task: PatientHealthTask): Promise<PatientHealthTask | null> {
  try {
    console.log('Updating patient health task:', task);
    
    // Exclude automatically managed fields from update payload
    const { id, created_at, updated_at, ...updateData } = task;
    
    const { data, error } = await supabase
      .from('patient_health_tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    console.log('Patient health task updated successfully:', data);
    return data as PatientHealthTask;
  } catch (error) {
    console.error('Error updating patient health task:', error);
    return null;
  }
}

export async function deletePatientHealthTask(id: string): Promise<boolean> {
  try {
    console.log('Deleting patient health task:', id);
    
    const { error } = await supabase
      .from('patient_health_tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    console.log('Patient health task deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting patient health task:', error);
    return false;
  }
}