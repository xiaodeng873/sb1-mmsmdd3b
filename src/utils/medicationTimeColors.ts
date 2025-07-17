// 服用時間顏色映射工具函數

export const getMedicationTimeColorClass = (timeStr: string): string => {
  // 將時間字串轉換為分鐘數以便比較
  const minutes = convertTimeToMinutes(timeStr);
  
  // 7A-10:30A (7:00-10:30) 紅色
  if (minutes >= 420 && minutes <= 630) { // 7:00 到 10:30
    return 'bg-red-500 text-black border-red-500';
  }
  
  // 11A-12:30P (11:00-12:30) 黃色
  if (minutes >= 660 && minutes <= 750) { // 11:00 到 12:30
    return 'bg-yellow-400 text-black border-yellow-400';
  }
  
  // 1P-2:30P (13:00-14:30) 藍色
  if (minutes >= 780 && minutes <= 870) { // 13:00 到 14:30
    return 'bg-blue-500 text-black border-blue-500';
  }
  
  // 3P-5:30P (15:00-17:30) 綠色
  if (minutes >= 900 && minutes <= 1050) { // 15:00 到 17:30
    return 'bg-green-500 text-black border-green-500';
  }
  
  // 6P-10P (18:00-22:00) 白色
  if (minutes >= 1080 && minutes <= 1320) { // 18:00 到 22:00
    return 'bg-white text-black border-gray-400';
  }
  
  // 其他時間保持原樣（藍色）
  return 'bg-blue-100 text-blue-800 border-blue-200';
};

// 將時間字串轉換為分鐘數以便比較
const convertTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([APN])$/);
  if (!match) return 0;
  
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2] || '0');
  const period = match[3];
  
  // 處理特殊情況
  if (period === 'A' && hour === 12) hour = 0; // 12A = 00:xx
  if (period === 'P' && hour !== 12) hour += 12; // xP = (x+12):xx (除了12P)
  if (period === 'N') hour = 12; // 12N = 12:xx
  
  return hour * 60 + minute;
};

// 獲取時間段描述（用於工具提示或說明）
export const getTimeRangeDescription = (timeStr: string): string => {
  const minutes = convertTimeToMinutes(timeStr);
  
  if (minutes >= 420 && minutes <= 630) {
    return '上午早期時段';
  }
  if (minutes >= 660 && minutes <= 750) {
    return '上午至中午時段';
  }
  if (minutes >= 780 && minutes <= 870) {
    return '下午早期時段';
  }
  if (minutes >= 900 && minutes <= 1050) {
    return '下午時段';
  }
  if (minutes >= 1080 && minutes <= 1320) {
    return '傍晚至夜間時段';
  }
  return '其他時段';
};