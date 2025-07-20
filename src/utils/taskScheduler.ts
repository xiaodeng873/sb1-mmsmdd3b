import type { PatientHealthTask, FrequencyUnit } from '../lib/database'; 

// 計算下一個到期時間
export function calculateNextDueDate(task: PatientHealthTask, fromDate?: Date): Date {
  const baseDate = fromDate || (task.last_completed_at ? new Date(task.last_completed_at) : new Date());
  const nextDue = new Date(baseDate);

  switch (task.frequency_unit) {
    case 'hourly':
      nextDue.setHours(nextDue.getHours() + task.frequency_value);
      break;

    case 'daily':
      if (task.specific_times.length > 0) {
        // 如果有指定時間，找到下一個時間點
        const today = new Date(baseDate);
        today.setHours(0, 0, 0, 0);
        
        let foundNextTime = false;
        for (const timeStr of task.specific_times.sort()) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const timeToday = new Date(today);
          timeToday.setHours(hours, minutes, 0, 0);
          
          if (timeToday > baseDate) {
            nextDue.setTime(timeToday.getTime());
            foundNextTime = true;
            break;
          }
        }
        
        if (!foundNextTime) {
          // 如果今天沒有更多時間，移到明天的第一個時間
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + task.frequency_value);
          const [hours, minutes] = task.specific_times[0].split(':').map(Number);
          tomorrow.setHours(hours, minutes, 0, 0);
          nextDue.setTime(tomorrow.getTime());
        }
      } else {
        nextDue.setDate(nextDue.getDate() + task.frequency_value);
      }
      break;

    case 'weekly':
      if (task.specific_days_of_week.length > 0) {
        // 找到下一個指定的星期幾
        const currentDay = nextDue.getDay(); // 0 = 週日, 1 = 週一, ..., 6 = 週六
        const targetDays = task.specific_days_of_week.sort();
        
        let foundNextDay = false;
        for (const targetDay of targetDays) {
          const adjustedTargetDay = targetDay === 7 ? 0 : targetDay; // 轉換為 JS 的星期格式
          if (adjustedTargetDay > currentDay) {
            const daysToAdd = adjustedTargetDay - currentDay;
            nextDue.setDate(nextDue.getDate() + daysToAdd);
            foundNextDay = true;
            break;
          }
        }
        
        if (!foundNextDay) {
          // 如果這週沒有更多指定日期，移到下週的第一個指定日期
          const firstTargetDay = targetDays[0] === 7 ? 0 : targetDays[0];
          const daysToAdd = (7 - currentDay + firstTargetDay) % 7;
          nextDue.setDate(nextDue.getDate() + daysToAdd + (task.frequency_value - 1) * 7);
        }
      } else {
        nextDue.setDate(nextDue.getDate() + task.frequency_value * 7);
      }
      break;

    case 'monthly':
      if (task.specific_days_of_month.length > 0) {
        // 找到下一個指定的月份日期
        const currentDate = nextDue.getDate();
        const targetDates = task.specific_days_of_month.sort((a, b) => a - b);
        
        let foundNextDate = false;
        for (const targetDate of targetDates) {
          if (targetDate > currentDate) {
            nextDue.setDate(targetDate);
            foundNextDate = true;
            break;
          }
        }
        
        if (!foundNextDate) {
          // 如果這個月沒有更多指定日期，移到下個月的第一個指定日期
          nextDue.setMonth(nextDue.getMonth() + task.frequency_value);
          nextDue.setDate(targetDates[0]);
        }
      } else {
        nextDue.setMonth(nextDue.getMonth() + task.frequency_value);
      }
      break;
  }

  return nextDue;
}

// 檢查任務是否逾期
export function isTaskOverdue(task: PatientHealthTask): boolean {
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  return dueDate < now;
}

// 檢查任務是否即將到期（24小時內）
export function isTaskDueSoon(task: PatientHealthTask): boolean {
  const now = new Date();
  const dueDate = new Date(task.next_due_at);
  const timeDiff = dueDate.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  return hoursDiff <= 24 && hoursDiff > 0;
}

// 獲取任務狀態
export function getTaskStatus(task: PatientHealthTask): 'overdue' | 'due_soon' | 'upcoming' {
  if (isTaskOverdue(task)) {
    return 'overdue';
  } else if (isTaskDueSoon(task)) {
    return 'due_soon';
  } else {
    return 'upcoming';
  }
}

// 格式化頻率描述
export function formatFrequencyDescription(task: PatientHealthTask): string {
  const { frequency_unit, frequency_value, specific_times, specific_days_of_week, specific_days_of_month } = task;

  switch (frequency_unit) {
    case 'hourly':
      return `每 ${frequency_value} 小時`;

    case 'daily':
      if (specific_times.length > 0) {
        return `每日 ${specific_times.join(', ')}`;
      }
      return frequency_value === 1 ? '每日' : `每 ${frequency_value} 天`;

    case 'weekly':
      if (specific_days_of_week.length > 0) {
        const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const days = specific_days_of_week.map(day => dayNames[day === 7 ? 0 : day]).join(', ');
        return frequency_value === 1 ? `每週 ${days}` : `每 ${frequency_value} 週 ${days}`;
      }
      return frequency_value === 1 ? '每週' : `每 ${frequency_value} 週`;

    case 'monthly':
      if (specific_days_of_month.length > 0) {
        const dates = specific_days_of_month.join(', ');
        return frequency_value === 1 ? `每月 ${dates} 號` : `每 ${frequency_value} 個月 ${dates} 號`;
      }
      return frequency_value === 1 ? '每月' : `每 ${frequency_value} 個月`;

    default:
      return '未知頻率';
  }
}

// 建立預設任務
export function createDefaultTasks(patientId: number): Omit<PatientHealthTask, 'id' | 'created_at' | 'updated_at'>[] {
  const now = new Date();
  
}