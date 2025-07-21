import type { PatientHealthTask, FrequencyUnit } from '../lib/database'; 

// 判斷是否為文件任務
export function isDocumentTask(taskType: string): boolean {
  return taskType === '約束物品同意書' || taskType === '年度體檢';
}

// 判斷是否為監測任務
export function isMonitoringTask(taskType: string): boolean {
  return taskType === '生命表徵' || taskType === '血糖控制' || taskType === '體重控制';
}

export function calculateNextDueDate(task: PatientHealthTask, fromDate?: Date): Date {
  let baseDate: Date;
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：使用 last_completed_at 作為基準日期，如果沒有則使用當前日期
    baseDate = fromDate || (task.last_completed_at ? new Date(task.last_completed_at) : new Date());
  } else {
    // 監測任務：使用 next_due_at 或當前日期
    baseDate = fromDate || new Date(task.next_due_at || (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    })());
  }
  
  const nextDue = new Date(baseDate);

  // Default time to 08:00 if no specific times are provided
  const defaultHours = 8;
  const defaultMinutes = 0;
  let hasSpecificTime = false;

  // 文件任務不使用特定時間，只使用預設時間
  if (isDocumentTask(task.health_record_type)) {
    nextDue.setHours(defaultHours, defaultMinutes, 0, 0);
    hasSpecificTime = true;
  }

  switch (task.frequency_unit) {
    case 'daily':
      // Add frequency_value days
      nextDue.setDate(nextDue.getDate() + task.frequency_value);
      
      // Set specific time if available
      if (task.specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        const [hours, minutes] = task.specific_times[0].split(':').map(Number);
        nextDue.setHours(hours, minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'weekly':
      // Add weeks interval
      nextDue.setDate(nextDue.getDate() + task.frequency_value * 7);
      
      // Adjust to specific day of week if provided
      if (task.specific_days_of_week.length > 0 && !isDocumentTask(task.health_record_type)) {
        const targetDay = task.specific_days_of_week[0];
        const adjustedTargetDay = targetDay === 7 ? 0 : targetDay;
        const currentDay = nextDue.getDay();
        const dayDiff = adjustedTargetDay - currentDay;
        nextDue.setDate(nextDue.getDate() + (dayDiff >= 0 ? dayDiff : dayDiff + 7));
      }
      
      // Set specific time if available
      if (task.specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        const [hours, minutes] = task.specific_times[0].split(':').map(Number);
        nextDue.setHours(hours, minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'monthly':
      // Add months interval
      nextDue.setMonth(nextDue.getMonth() + task.frequency_value);
      
      // Set specific day of month if provided
      if (task.specific_days_of_month.length > 0 && !isDocumentTask(task.health_record_type)) {
        const targetDay = Math.min(task.specific_days_of_month[0], new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate());
        nextDue.setDate(targetDay);
      }
      
      // Set specific time if available
      if (task.specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        const [hours, minutes] = task.specific_times[0].split(':').map(Number);
        nextDue.setHours(hours, minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    default:
      throw new Error('未知的頻率單位');
  }

  // Apply default time of 08:00 if no specific time was set
  if (!hasSpecificTime) {
    nextDue.setHours(defaultHours, defaultMinutes, 0, 0);
  }

  return nextDue;
}

// 檢查任務是否逾期
export function isTaskOverdue(task: PatientHealthTask): boolean {
  // 文件任務：檢查是否已完成且在到期日之前
  if (isDocumentTask(task.health_record_type)) {
    if (task.last_completed_at) {
      const completedDate = new Date(task.last_completed_at);
      const dueDate = new Date(task.next_due_at);
      return completedDate < dueDate && new Date() > dueDate;
    }
    return new Date() > new Date(task.next_due_at);
  }
  
  // 監測任務：如果已完成則不算逾期
  if (task.last_completed_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  
  return dueDate < todayMidnight;
}

// 檢查任務是否為未完成
export function isTaskPendingToday(task: PatientHealthTask): boolean {
  // 文件任務：檢查是否需要在今天完成
  if (isDocumentTask(task.health_record_type)) {
    const now = new Date();
    const dueDate = new Date(task.next_due_at);
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    return dueDate >= todayStart && dueDate <= todayEnd && !task.last_completed_at;
  }
  
  // 監測任務：如果已完成則不算未完成
  if (task.last_completed_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  return dueDate >= todayStart && dueDate <= todayEnd;
}

// 檢查任務是否即將到期（未來24小時內，不包括今日）
export function isTaskDueSoon(task: PatientHealthTask): boolean {
  // 文件任務：檢查是否即將到期
  if (isDocumentTask(task.health_record_type)) {
    const now = new Date();
    const dueDate = new Date(task.next_due_at);
    
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrowStart = new Date(now);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
    dayAfterTomorrowStart.setHours(0, 0, 0, 0);
    
    return dueDate >= tomorrowStart && dueDate < dayAfterTomorrowStart && !task.last_completed_at;
  }
  
  // 監測任務：如果已完成則不算即將到期
  if (task.last_completed_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  
  const dayAfterTomorrowStart = new Date(now);
  dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
  dayAfterTomorrowStart.setHours(0, 0, 0, 0);
  
  return dueDate >= tomorrowStart && dueDate < dayAfterTomorrowStart;
}

// 檢查任務是否為排程中（已完成或未來的任務）
export function isTaskScheduled(task: PatientHealthTask): boolean {
  // 文件任務：檢查是否已完成或為未來任務
  if (isDocumentTask(task.health_record_type)) {
    if (task.last_completed_at) {
      const completedDate = new Date(task.last_completed_at);
      const dueDate = new Date(task.next_due_at);
      return completedDate >= dueDate; // 已在到期日或之後完成
    }
    
    const now = new Date();
    const dueDate = new Date(task.next_due_at);
    
    const dayAfterTomorrowStart = new Date(now);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
    dayAfterTomorrowStart.setHours(0, 0, 0, 0);
    
    return dueDate >= dayAfterTomorrowStart;
  }
  
  // 監測任務：如果已完成則為排程中
  if (task.last_completed_at) {
    return true;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  const dayAfterTomorrowStart = new Date(now);
  dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
  dayAfterTomorrowStart.setHours(0, 0, 0, 0);
  
  return dueDate >= dayAfterTomorrowStart;
}

// 獲取任務狀態
export function getTaskStatus(task: PatientHealthTask): 'overdue' | 'pending' | 'due_soon' | 'scheduled' {
  if (isTaskOverdue(task)) {
    return 'overdue';
  } else if (isTaskPendingToday(task)) {
    return 'pending';
  } else if (isTaskDueSoon(task)) {
    return 'due_soon';
  } else {
    return 'scheduled';
  }
}

// 格式化頻率描述
export function formatFrequencyDescription(task: PatientHealthTask): string {
  const { frequency_unit, frequency_value, specific_times, specific_days_of_week, specific_days_of_month } = task;

  switch (frequency_unit) {
    case 'daily':
      if (specific_times.length > 0) {
        return `每日 ${specific_times[0]}`;
      }
      return frequency_value === 1 ? '每日' : `每 ${frequency_value} 天`;

    case 'weekly':
      if (specific_days_of_week.length > 0) {
        const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const days = specific_days_of_week.map(day => dayNames[day === 7 ? 0 : day]).join(', ');
        return frequency_value === 1 ? `每週 ${days}${specific_times[0] ? ` ${specific_times[0]}` : ''}` : `每 ${frequency_value} 週 ${days}${specific_times[0] ? ` ${specific_times[0]}` : ''}`;
      }
      return frequency_value === 1 ? '每週' : `每 ${frequency_value} 週`;

    case 'monthly':
      if (specific_days_of_month.length > 0) {
        const dates = specific_days_of_month.join(', ');
        return frequency_value === 1 ? `每月 ${dates} 號${specific_times[0] ? ` ${specific_times[0]}` : ''}` : `每 ${frequency_value} 個月 ${dates} 號${specific_times[0] ? ` ${specific_times[0]}` : ''}`;
      }
      return frequency_value === 1 ? '每月' : `每 ${frequency_value} 個月`;

    default:
      return '未知頻率';
  }
}
