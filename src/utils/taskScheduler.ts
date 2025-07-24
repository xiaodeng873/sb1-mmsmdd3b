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
  console.log('=== calculateNextDueDate 開始 ===');
  console.log('輸入任務:', task);
  console.log('基準日期:', fromDate);
  
  let baseDate: Date;
  
  if (isDocumentTask(task.health_record_type)) {
    console.log('這是文件任務');
    // 文件任務：使用 last_completed_at 作為基準日期，如果沒有則使用當前日期
    baseDate = fromDate || (task.last_completed_at ? new Date(task.last_completed_at) : new Date());
    // 清除時間部分
    baseDate.setHours(0, 0, 0, 0);
  } else {
    console.log('這是監測任務');
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
  
  console.log('基準日期設定為:', baseDate);
  
  const nextDue = new Date(baseDate);

  // Default time to 08:00 for monitoring tasks
  const defaultHours = 8;
  const defaultMinutes = 0;
  let hasSpecificTime = false;
  
  console.log('頻率單位:', task.frequency_unit, '頻率值:', task.frequency_value);

  switch (task.frequency_unit) {
    case 'daily':
      console.log('處理每日任務');
      // Add frequency_value days
      nextDue.setDate(nextDue.getDate() + task.frequency_value);
      console.log('加上', task.frequency_value, '天後:', nextDue);
      
      // Set specific time if available
      if (task.specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        const timeStr = task.specific_times[0];
        const time = parseTimeString(timeStr);
        nextDue.setHours(time.hours, time.minutes, 0, 0);
        hasSpecificTime = true;
        console.log('設定特定時間:', timeStr, '轉換為:', time);
      }
      break;

    case 'weekly':
      console.log('處理每週任務');
      if (task.specific_days_of_week.length > 0 && !isDocumentTask(task.health_record_type)) {
        const targetDay = task.specific_days_of_week[0];
        const adjustedTargetDay = targetDay === 7 ? 0 : targetDay;
        const currentDay = nextDue.getDay();
        let dayDiff = adjustedTargetDay - currentDay;
        
        console.log('目標星期:', targetDay, '調整後:', adjustedTargetDay);
        console.log('當前星期:', currentDay, '天數差:', dayDiff);
        
        // 如果是同一天，則移到下一週的同一天
        if (dayDiff === 0) {
          dayDiff = 7;
          console.log('同一天，移到下週，天數差改為:', dayDiff);
        } else if (dayDiff < 0) {
          dayDiff = dayDiff + 7;
          console.log('負數天數差，調整為:', dayDiff);
        }
        
        // 應用 frequency_value（多週間隔）
        if (task.frequency_value > 1) {
          nextDue.setDate(nextDue.getDate() + (task.frequency_value - 1) * 7);
          console.log('多週間隔，加上', (task.frequency_value - 1) * 7, '天');
        }
        nextDue.setDate(nextDue.getDate() + dayDiff);
        console.log('最終週任務日期:', nextDue);
      } else {
        // 無特定星期，僅加週數
        nextDue.setDate(nextDue.getDate() + task.frequency_value * 7);
        console.log('無特定星期，加上', task.frequency_value * 7, '天');
      }
      
      // Set specific time if available
      if (task.specific_times.length > 0 && !isDocumentTask(task.health_record_type)) {
        const timeStr = task.specific_times[0];
        const time = parseTimeString(timeStr);
        nextDue.setHours(time.hours, time.minutes, 0, 0);
        hasSpecificTime = true;
        console.log('週任務設定特定時間:', timeStr);
      }
      break;

    case 'monthly':
      console.log('處理每月任務');
      // Add months interval
      nextDue.setMonth(nextDue.getMonth() + task.frequency_value);
      console.log('加上', task.frequency_value, '個月後:', nextDue);
      
      // For document tasks, preserve the original day of the month
      if (isDocumentTask(task.health_record_type)) {
        const originalDay = baseDate.getDate();
        const daysInMonth = new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate();
        nextDue.setDate(Math.min(originalDay, daysInMonth));
        // 清除時間部分
        nextDue.setHours(0, 0, 0, 0);
        console.log('文件任務保持原日期:', originalDay, '最終日期:', nextDue);
      } else {
        // Set specific day of month if provided
        if (task.specific_days_of_month.length > 0) {
          const targetDay = Math.min(task.specific_days_of_month[0], new Date(nextDue.getFullYear(), nextDue.getMonth() + 1, 0).getDate());
          nextDue.setDate(targetDay);
          console.log('監測任務設定特定日期:', targetDay);
        }
        
        // Set specific time if available
        if (task.specific_times.length > 0) {
          const timeStr = task.specific_times[0];
          const time = parseTimeString(timeStr);
          nextDue.setHours(time.hours, time.minutes, 0, 0);
          hasSpecificTime = true;
          console.log('月任務設定特定時間:', timeStr);
        }
      }
      break;
      
    case 'yearly':
      console.log('處理每年任務');
      // Add years interval
      nextDue.setFullYear(nextDue.getFullYear() + task.frequency_value);
      console.log('加上', task.frequency_value, '年後:', nextDue);
      
      // For document tasks, preserve the original date
      if (isDocumentTask(task.health_record_type)) {
        // 清除時間部分
        nextDue.setHours(0, 0, 0, 0);
        console.log('年度文件任務最終日期:', nextDue);
      } else {
        // Set specific time if available
        if (task.specific_times.length > 0) {
          const timeStr = task.specific_times[0];
          const time = parseTimeString(timeStr);
          nextDue.setHours(time.hours, time.minutes, 0, 0);
          hasSpecificTime = true;
          console.log('年度監測任務設定特定時間:', timeStr);
        }
      }
      break;

    default:
      console.error('未知的頻率單位:', task.frequency_unit);
      throw new Error('未知的頻率單位');
  }

  // Apply default time of 08:00 for monitoring tasks if no specific time was set
  if (!hasSpecificTime && !isDocumentTask(task.health_record_type)) {
    nextDue.setHours(defaultHours, defaultMinutes, 0, 0);
    console.log('應用預設時間 08:00');
  }

  console.log('最終計算結果:', nextDue);
  console.log('=== calculateNextDueDate 結束 ===');
  return nextDue;
}

// 解析時間字串（支援 HH:MM 和 藥物時間格式如 7A, 12N, 6P）
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  console.log('解析時間字串:', timeStr);
  
  // 先嘗試標準 HH:MM 格式
  const standardMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (standardMatch) {
    const result = {
      hours: parseInt(standardMatch[1]),
      minutes: parseInt(standardMatch[2])
    };
    console.log('標準格式解析結果:', result);
    return result;
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
    
    const result = { hours, minutes };
    console.log('藥物格式解析結果:', result);
    return result;
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
    
    // 如果到期日期早於今天，且沒有完成記錄或完成時間早於到期時間，則為逾期
    if (dueDateOnly < nowDate) {
      if (!task.last_completed_at) {
        return true;
      }
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
  }
  
  // 監測任務：只有過了午夜12時（即不在同一天）才算逾期
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  // 如果到期日期是今天或未來，不算逾期
  if (dueDateDay >= todayStart) {
    return false;
  }
  
  // 監測任務：檢查是否逾期
  if (task.last_completed_at) {
    const lastCompleted = new Date(task.last_completed_at);
    // 如果最後完成時間晚於或等於到期時間，則不算逾期
    if (lastCompleted >= dueDate) {
      return false;
    }
  }
  
  // 只有過了午夜12時（不在同一天）才算逾期
  return true;
}

// 檢查任務是否為未完成
export function isTaskPendingToday(task: PatientHealthTask): boolean {
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  
  if (isDocumentTask(task.health_record_type)) {
    // 文件任務：僅比較日期
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    // 如果到期日期是今天
    if (dueDateOnly.getTime() === todayStart.getTime()) {
      if (!task.last_completed_at) {
        return true;
      }
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
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
    
    if (dueDateOnly >= todayStart && dueDateOnly <= twoWeeksLater) {
      if (!task.last_completed_at) {
        return true;
      }
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate < dueDateOnly;
    }
    return false;
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
    
    // 如果到期日期是未來，則為排程中
    if (dueDateOnly > nowDate) {
      return true;
    }
    
    // 如果已完成且完成日期不早於到期日期，則為排程中
    if (task.last_completed_at) {
      const lastCompleted = new Date(task.last_completed_at);
      const lastCompletedDate = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());
      return lastCompletedDate >= dueDateOnly;
    }
    
    return false;
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