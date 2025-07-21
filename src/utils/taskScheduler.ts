import type { PatientHealthTask, FrequencyUnit } from '../lib/database'; 

export function calculateNextDueDate(task: PatientHealthTask, fromDate?: Date): Date {
  const baseDate = fromDate || new Date(task.next_due_at || new Date());
  const nextDue = new Date(baseDate);

  // Default time to 08:00 if no specific times are provided
  const defaultHours = 8;
  const defaultMinutes = 0;
  let hasSpecificTime = false;

  switch (task.frequency_unit) {
    case 'hourly':
      // Add hours interval
      nextDue.setHours(nextDue.getHours() + task.frequency_value);
      
      // Set specific time if available
      if (task.specific_times.length > 0) {
        const [hours, minutes] = task.specific_times[0].split(':').map(Number);
        // Find the next valid time slot on or after the calculated time
        const currentHours = nextDue.getHours();
        const currentMinutes = nextDue.getMinutes();
        if (currentHours > hours || (currentHours === hours && currentMinutes >= minutes)) {
          // If past the specific time, add another interval
          nextDue.setHours(nextDue.getHours() + task.frequency_value);
        }
        nextDue.setHours(hours, minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'daily':
      // Add days interval
      nextDue.setDate(nextDue.getDate() + task.frequency_value);
      
      // Set specific time if available
      if (task.specific_times.length > 0) {
        const [hours, minutes] = task.specific_times[0].split(':').map(Number);
        nextDue.setHours(hours, minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'weekly':
      // Add weeks interval
      nextDue.setDate(nextDue.getDate() + task.frequency_value * 7);
      
      // Adjust to specific day of week if provided
      if (task.specific_days_of_week.length > 0) {
        const targetDay = task.specific_days_of_week[0];
        const adjustedTargetDay = targetDay === 7 ? 0 : targetDay;
        const currentDay = nextDue.getDay();
        const dayDiff = adjustedTargetDay - currentDay;
        nextDue.setDate(nextDue.getDate() + (dayDiff >= 0 ? dayDiff : dayDiff + 7));
      }
      
      // Set specific time if available
      if (task.specific_times.length > 0) {
        const [hours, minutes] = task.specific_times[0].split(':').map(Number);
        nextDue.setHours(hours, minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'monthly':
      // Add months interval
      nextDue.setMonth(nextDue.getMonth() + task.frequency_value);
      
      // Set specific day of month if provided
      if (task.specific_days_of_month.length > 0) {
        const targetDay = Math.min(task.specific_days_of_month[0], new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate());
        nextDue.setDate(targetDay);
      }
      
      // Set specific time if available
      if (task.specific_times.length > 0) {
        const [hours, minutes] = task.specific_times[0].split(':').map(Number);
        nextDue.setHours(hours, minutes, 0, 0);
        hasSpecificTime = true;
      }
      break;

    case 'yearly':
      // Add years interval
      nextDue.setFullYear(nextDue.getFullYear() + task.frequency_value);
      
      // Set specific day of month if provided
      if (task.specific_days_of_month.length > 0) {
        const targetDay = Math.min(task.specific_days_of_month[0], new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate());
        nextDue.setDate(targetDay);
      }
      
      // Set specific time if available
      if (task.specific_times.length > 0) {
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
  // 如果任務已完成，不算逾期
  if (task.last_completed_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  // 獲取今日的午夜時間 (00:00:00)
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  
  // 只有到期日期在今日午夜之前且未完成才算逾期
  // 例如：21/7的任務，需要踏入22/7的00:00且未完成才算逾期
  return dueDate < todayMidnight;
}

// 檢查任務是否為未完成
export function isTaskPendingToday(task: PatientHealthTask): boolean {
  // 如果任務已完成，不算未完成
  if (task.last_completed_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  // 獲取今日的開始和結束時間
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  // 到期日期在今日範圍內且未完成
  return dueDate >= todayStart && dueDate <= todayEnd;
}

// 檢查任務是否即將到期（未來24小時內，不包括今日）
export function isTaskDueSoon(task: PatientHealthTask): boolean {
  // 如果任務已完成，不算即將到期
  if (task.last_completed_at) {
    return false;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  // 獲取明日的開始時間
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  
  // 獲取後天的開始時間
  const dayAfterTomorrowStart = new Date(now);
  dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
  dayAfterTomorrowStart.setHours(0, 0, 0, 0);
  
  // 到期日期在明日範圍內且未完成
  return dueDate >= tomorrowStart && dueDate < dayAfterTomorrowStart;
}

// 檢查任務是否為排程中（已完成或未來的任務）
export function isTaskScheduled(task: PatientHealthTask): boolean {
  // 如果任務已完成，狀態為排程中
  if (task.last_completed_at) {
    return true;
  }
  
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  // 獲取後天的開始時間
  const dayAfterTomorrowStart = new Date(now);
  dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
  dayAfterTomorrowStart.setHours(0, 0, 0, 0);
  
  // 到期日期在後天或更遠的未來
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
    case 'hourly':
      if (specific_times.length > 0) {
        return `每 ${frequency_value} 小時於 ${specific_times[0]}`;
      }
      return `每 ${frequency_value} 小時`;

    case 'daily':
      if (specific_times.length > 0) {
        return `每日 ${specific_times[0]}`;
      }
      return frequency_value === 1 ? '每日' : `每 ${frequency_value} 天`;

    case 'weekly':
      if (specific_days_of_week.length > 0) {
        const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const days = specific_days_of_week.map(day => dayNames[day === 7 ? 0 : day]).join(', ');
        return frequency_value === 1 ? `每週 ${days}${specific_times[0] ? ' ' + specific_times[0] : ''}` : `每 ${frequency_value} 週 ${days}${specific_times[0] ? ' ' + specific_times[0] : ''}`;
      }
      return frequency_value === 1 ? '每週' : `每 ${frequency_value} 週`;

    case 'monthly':
      if (specific_days_of_month.length > 0) {
        const dates = specific_days_of_month.join(', ');
        return frequency_value === 1 ? `每月 ${dates} 號${specific_times[0] ? ' ' + specific_times[0] : ''}` : `每 ${frequency_value} 個月 ${dates} 號${specific_times[0] ? ' ' + specific_times[0] : ''}`;
      }
      return frequency_value === 1 ? '每月' : `每 ${frequency_value} 個月`;

    case 'yearly':
      if (specific_days_of_month.length > 0) {
        const dates = specific_days_of_month.join(', ');
        return frequency_value === 1 ? `每年 ${nextDue.getMonth() + 1} 月 ${dates} 號${specific_times[0] ? ' ' + specific_times[0] : ''}` : `每 ${frequency_value} 年 ${nextDue.getMonth() + 1} 月 ${dates} 號${specific_times[0] ? ' ' + specific_times[0] : ''}`;
      }
      return frequency_value === 1 ? '每年' : `每 ${frequency_value} 年`;

    default:
      return '未知頻率';
  }
}

// 建立預設任務
export function createDefaultTasks(patientId: number): Omit<PatientHealthTask, 'id' | 'created_at' | 'updated_at'>[] {
  const now = new Date();
  
}