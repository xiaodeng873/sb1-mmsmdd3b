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
    // 清除時間部分
    baseDate.setHours(0, 0, 0, 0);
  } else {
    // 監測任務：使用 next_due_at 或當前日期
    if (fromDate) {
      baseDate = new Date(fromDate);
    } else if (task.last_completed_at) {
      baseDate = new Date(task.last_completed_at);
    } else {
      // 新任務：使用當前時間作為基準
      baseDate = new Date();
    }
  }
  
  const nextDue = new Date(baseDate);

  // Default time to 08:00 for monitoring tasks
  const defaultHours = 8;
  const defaultMinutes = 0;
  let hasSpecificTime = false;

  switch (task.frequency_unit) {
    case 'daily':
      // Add frequency_value days
      nextDue.setDate(nextDue.getDate() + task.frequency_value);
      
      // Set specific time if available
      if (task.specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        const timeStr = task.specific_times[0];
        const time = parseTimeString(timeStr);
        nextDue.setHours(time.hours, time.minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'weekly':
      if (task.specific_days_of_week.length > 0 && !isDocumentTask(task.health_record_type)) {
        const targetDay = task.specific_days_of_week[0];
        const adjustedTargetDay = targetDay === 7 ? 0 : targetDay;
        const currentDay = nextDue.getDay();
        let dayDiff = adjustedTargetDay - currentDay;
        
        // 如果當前日期已是目標星期，且任務未完成，允許當天
        if (dayDiff === 0 && !task.last_completed_at) {
          dayDiff = 0;
        } else {
          // 否則選擇最近的目標星期（可能在當前週或下一週）
          dayDiff = dayDiff >= 0 ? dayDiff : dayDiff + 7;
          // 應用 frequency_value（多週間隔）
          if (task.frequency_value > 1) {
            nextDue.setDate(nextDue.getDate() + (task.frequency_value - 1) * 7);
          }
        }
        nextDue.setDate(nextDue.getDate() + dayDiff);
      } else {
        // 無特定星期，僅加週數
        nextDue.setDate(nextDue.getDate() + task.frequency_value * 7);
      }
      
      // Set specific time if available
      if (task.specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        const timeStr = task.specific_times[0];
        const time = parseTimeString(timeStr);
        nextDue.setHours(time.hours, time.minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'monthly':
      // Add months interval
      nextDue.setMonth(nextDue.getMonth() + task.frequency_value);
      
      // For document tasks, preserve the original day of the month
      if (isDocumentTask(task.health_record_type)) {
        const originalDay = baseDate.getDate();
        const daysInMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
        nextDue.setDate(Math.min(originalDay, daysInMonth));
        // 清除時間部分
        nextDue.setHours(0, 0, 0, 0);
      } else {
        // Set specific day of month if provided
        if (task.specific_days_of_month.length > 0) {
          const targetDay = Math.min(task.specific_days_of_month[0], new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate());
          nextDue.setDate(targetDay);
        }
        
        // Set specific time if available
        if (task.specific_times.length > 0) {
          const timeStr = task.specific_times[0];
          const time = parseTimeString(timeStr);
          nextDue.setHours(time.hours, time.minutes, 0, 0);
          hasSpecificTime = true;
        }
      }
      break;

    default:
      throw new Error('未知的頻率單位');
  }

  // Apply default time of 08:00 for monitoring tasks if no specific time was set
  if (!hasSpecificTime && !isDocumentTask(task.health_record_type)) {
    nextDue.setHours(defaultHours, defaultMinutes, 0, 0);
  }

  return nextDue;
}

// 解析時間字串（支援 HH:MM 和 藥物時間格式如 7A, 12N, 6P）
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  // 先嘗試標準 HH:MM 格式
  const standardMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (standardMatch) {
    return {
      hours: parseInt(standardMatch[1]),
      minutes: parseInt(standardMatch[2])
    };
  }
  
  // 嘗試藥物時間格式 (如 7A, 12N, 6P)
  const medicationMatch = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([APN])$/);
  if (medicationMatch) {
    let hours = parseInt(medicationMatch[1]);
    const minutes = parseInt(medicationMatch[2] || '0');
    const period = medicationMatch[3];
    
    // 轉換為24小時制
    if (period === 'A' && hours === 12) hours = 0; // 12A = 00:xx
    if (period === 'P' && hours !== 12) hours += 12; // xP = (x+12):xx (除了12P)
    if (period === 'N') hours = 12; // 12N = 12:xx
    
    return { hours, minutes };
  }
  
  // 如果都無法解析，返回預設時間 08:00
  console.warn(`無法解析時間格式: ${timeStr}，使用預設時間 08:00`);
  return { hours: 8, minutes: 0 };
}

// 檢查任務是否逾期
export function isTaskOverdue(task: PatientHealthTask): boolean {
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：僅比較日期
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    return dueDateOnly < nowDate && (!task.last_completed_at || new Date(task.last_completed_at) < dueDate);
  }
  
  // 監測任務：檢查是否逾期
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    // 如果最後完成時間晚於或等於到期時間，則不算逾期
    if (lastCompleted >= dueDate) {
      return false;
    }
  }
  
  // 如果到期時間已過，則為逾期
  return dueDate < now;
}

// 檢查任務是否為未完成
export function isTaskPendingToday(task: PatientHealthTask): boolean {
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：僅比較日期
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    return dueDateOnly.getTime() === todayStart.getTime() && 
           (!task.last_completed_at || new Date(task.last_completed_at) < dueDate);
  }
  
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  // 檢查是否在今天到期
  const isDueToday = dueDate >= todayStart && dueDate <= todayEnd;
  
  if (!isDueToday) {
    return false;
  }
  
  // 檢查是否未完成
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    // 如果最後完成時間晚於或等於到期時間，則已完成
    return lastCompleted < dueDate;
  }
  
  return true;
}

// 檢查任務是否即將到期（文件任務：未來14天內；監測任務：未來24小時內，不包括今日）
export function isTaskDueSoon(task: PatientHealthTask): boolean {
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：檢查未來14天內（包括今天）
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoWeeksLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    return dueDateOnly >= todayStart && 
           dueDateOnly <= twoWeeksLater && 
           (!task.last_completed_at || new Date(task.last_completed_at) < dueDate);
  }
  
  // 監測任務：檢查是否即將到期
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    // 如果最後完成時間晚於或等於到期時間，則不算即將到期
    if (lastCompleted >= dueDate) {
      return false;
    }
  }
  
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
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：僅比較日期
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    return dueDateOnly > nowDate || 
           (task.last_completed_at && new Date(task.last_completed_at) >= dueDate);
  }
  
  // 監測任務：如果已完成且完成時間晚於或等於到期時間，則為排程中
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    if (lastCompleted >= dueDate) {
      return true;
    }
  }
  
  // 未來的任務（明天之後）或今天但還沒到時間的任務
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  // 如果是未來的任務，則為排程中
  if (dueDate > todayEnd) {
    return true;
  }
  
  // 如果是今天的任務但還沒到時間，也算排程中
  if (dueDate > now) {
    return true;
  }
  
  return false;
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
      if (specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        return `每日 ${specific_times[0]}`;
      }
      return frequency_value === 1 ? '每日' : `每 ${frequency_value} 天`;

    case 'weekly':
      if (specific_days_of_week.length > 0 && !isDocumentTask(task.health_record_type)) {
        const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const days = specific_days_of_week.map(day => dayNames[day === 7 ? 0 : day]).join(', ');
        return frequency_value === 1 ? `每週 ${days}${specific_times[0] ? ` ${specific_times[0]}` : ''}` : `每 ${frequency_value} 週 ${days}${specific_times[0] ? ` ${specific_times[0]}` : ''}`;
      }
      return frequency_value === 1 ? '每週' : `每 ${frequency_value} 週`;

    case 'monthly':
      if (specific_days_of_month.length > 0 && !isDocumentTask(task.health_record_type)) {
        const dates = specific_days_of_month.join(', ');
        return frequency_value === 1 ? `每月 ${dates} 號${specific_times[0] ? ` ${specific_times[0]}` : ''}` : `每 ${frequency_value} 個月 ${dates} 號${specific_times[0] ? ` ${specific_times[0]}` : ''}`;
      }
      return frequency_value === 1 ? '每月' : `每 ${frequency_value} 個月`;

    default:
      return '未知頻率';
  }
} 
 